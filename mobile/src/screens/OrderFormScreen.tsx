import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Field         from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import { Customer, Material, Paged, api } from '../lib/api';
import { COLORS, PRIORITY_COLORS } from '../lib/theme';

interface ItemDraft {
  piece_option: string;
  custom_piece: string;
  description:  string;
  quantity:     string;
  unit_price:   string;
  material_id:  number | null;
  measurements: { label: string; value_cm: string }[];
}

const PRIORITIES     = ['low', 'normal', 'high', 'urgent'] as const;
const GARMENT_OPTIONS = ['Dress', 'Shirt', 'Shorts', 'Pants', 'Mask', 'Jacket', 'Other'] as const;

// Rough labour base price per garment type (€). Used purely as an estimate.
const GARMENT_BASE: Record<string, number> = {
  Dress:  80,
  Shirt:  40,
  Shorts: 30,
  Pants:  45,
  Mask:   10,
  Jacket: 120,
  Other:  50,
};

// Material premium multiplier inferred from the material name.
const materialMultiplier = (name: string): number => {
  const n = name.toLowerCase();
  if (n.includes('silk'))      return 1.6;
  if (n.includes('wool'))      return 1.4;
  if (n.includes('linen'))     return 1.3;
  if (n.includes('denim'))     return 1.2;
  if (n.includes('cotton'))    return 1.0;
  if (n.includes('polyester')) return 0.85;
  if (n.includes('lining'))    return 0.7;
  return 1.0;
};

// Approximate material units per garment (so unit_cost from inventory matters).
const garmentUnits = (garment: string): number => {
  switch (garment) {
    case 'Dress':  return 3.0;
    case 'Jacket': return 2.5;
    case 'Pants':
    case 'Shirt':  return 2.0;
    case 'Shorts': return 1.2;
    case 'Mask':   return 0.3;
    default:       return 1.5;
  }
};

const estimatePrice = (garment: string, material: Material): number => {
  const base   = GARMENT_BASE[garment] ?? GARMENT_BASE.Other;
  const mult   = materialMultiplier(material.name);
  const cost   = parseFloat(material.unit_cost) || 0;
  const units  = garmentUnits(garment);
  return Math.max(5, Math.round(base * mult + cost * units));
};

const newItem = (): ItemDraft => ({
  piece_option: '', custom_piece: '', description: '',
  quantity: '1', unit_price: '0', material_id: null, measurements: [],
});

const formatIsoDate = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0,4)}-${d.slice(4)}`;
  return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
};

const garmentType = (draft: ItemDraft) =>
  draft.piece_option === 'Other' ? draft.custom_piece.trim() : draft.piece_option.trim();

export default function OrderFormScreen({ navigation }: any) {
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [materials, setMaterials]   = useState<Material[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [dueDate, setDueDate]       = useState('');
  const [priority, setPriority]     = useState<(typeof PRIORITIES)[number]>('normal');
  const [notes, setNotes]           = useState('');
  const [items, setItems]           = useState<ItemDraft[]>([newItem()]);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    api.get<Paged<Customer>>('/customers/')
      .then(d => setCustomers(d.results)).catch(() => setCustomers([]));
    api.get<Paged<Material>>('/materials/')
      .then(d => setMaterials(d.results)).catch(() => setMaterials([]));
  }, []);

  const updateItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      // Recompute estimated price whenever garment type or material changes
      if (patch.piece_option !== undefined || patch.material_id !== undefined) {
        const mat = materials.find(m => m.id === merged.material_id);
        if (merged.piece_option && mat) {
          merged.unit_price = String(estimatePrice(merged.piece_option, mat));
        }
      }
      return merged;
    }));

  const addMeasurement = (idx: number) =>
    setItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, measurements: [...it.measurements, { label: '', value_cm: '' }] } : it,
    ));

  const updateMeasurement = (iIdx: number, mIdx: number, patch: Partial<{ label: string; value_cm: string }>) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== iIdx) return it;
      return { ...it, measurements: it.measurements.map((m, j) => j === mIdx ? { ...m, ...patch } : m) };
    }));

  const submit = async () => {
    if (!customerId) { Alert.alert('Required', 'Select a customer.'); return; }
    const prepared = items.map(d => ({ d, gt: garmentType(d) })).filter(x => x.gt);
    if (!prepared.length) { Alert.alert('Required', 'Add at least one garment.'); return; }
    if (items.some(d => d.piece_option === 'Other' && !d.custom_piece.trim())) {
      Alert.alert('Required', 'Fill in the custom garment name.'); return;
    }
    if (materials.length > 0 && items.some(d => d.piece_option && d.material_id == null)) {
      Alert.alert('Required', 'Select a material for every garment.'); return;
    }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Format', 'Due date must be YYYY-MM-DD.'); return;
    }

    setSaving(true);
    try {
      const order = await api.post<{ id: number }>('/orders/', {
        customer:   customerId,
        order_date: new Date().toISOString().slice(0, 10),
        due_date:   dueDate || null,
        priority,
        status: 'pending',
        notes:  notes || null,
      });
      for (const { d, gt } of prepared) {
        const mat   = materials.find(m => m.id === d.material_id);
        const tag   = mat ? `[Material: ${mat.name}]` : '';
        const desc  = [tag, d.description].filter(Boolean).join(' ').trim() || null;
        const item = await api.post<{ id: number }>('/order-items/', {
          order:        order.id,
          garment_type: gt,
          description:  desc,
          quantity:     Number(d.quantity || 1),
          unit_price:   Number(d.unit_price || 0).toFixed(2),
        });
        for (const m of d.measurements) {
          if (!m.label) continue;
          await api.post('/measurements/', {
            order_item: item.id,
            label:      m.label,
            value_cm:   Number(m.value_cm || 0).toFixed(2),
          });
        }
      }
      navigation.replace('OrderDetail', { id: order.id });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Create order</Text>
      <Text style={styles.subtitle}>Pick a customer, list the garments, set a due date.</Text>

      <Text style={styles.label}>Customer *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
        {customers.map(c => (
          <Pressable key={c.id} onPress={() => setCustomerId(c.id)}
            style={[styles.chip, customerId === c.id && styles.chipActive]}>
            <Text style={{ color: customerId === c.id ? '#fff' : COLORS.text, fontWeight: '700' }}>
              {c.full_name}
            </Text>
          </Pressable>
        ))}
        {!customers.length && <Text style={{ color: COLORS.textMuted }}>No customers yet — create one first.</Text>}
      </ScrollView>

      <View style={{ height: 8 }} />
      <Field label="Due date (YYYY-MM-DD)" value={dueDate}
        onChangeText={v => setDueDate(formatIsoDate(v))} placeholder="2026-06-15" keyboardType="numeric" />

      <Text style={styles.label}>Priority</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {PRIORITIES.map(p => (
          <Pressable key={p} onPress={() => setPriority(p)}
            style={[styles.chip, priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]}>
            <Text style={{ color: priority === p ? '#fff' : COLORS.text, fontWeight: '700' }}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Internal notes" multiline />

      <Text style={styles.section}>Garments</Text>
      {items.map((it, idx) => (
        <View key={idx} style={styles.itemBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 15 }}>Garment #{idx + 1}</Text>
            {items.length > 1 && (
              <Pressable onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                <Text style={{ color: COLORS.danger, fontWeight: '700' }}>Remove</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.label}>Type *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {GARMENT_OPTIONS.map(opt => (
              <Pressable key={opt} onPress={() => updateItem(idx, { piece_option: opt })}
                style={[styles.chip, it.piece_option === opt && styles.chipActive]}>
                <Text style={{ color: it.piece_option === opt ? '#fff' : COLORS.text, fontWeight: '700' }}>{opt}</Text>
              </Pressable>
            ))}
          </View>
          {it.piece_option === 'Other' && (
            <Field label="Specific name" value={it.custom_piece}
              onChangeText={v => updateItem(idx, { custom_piece: v })} placeholder="e.g. Vest" />
          )}

          <Text style={styles.label}>Material *</Text>
          {materials.length === 0 ? (
            <Text style={styles.hintMuted}>
              No materials yet — add some in the Materials tab.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {materials.map(m => (
                <Pressable key={m.id} onPress={() => updateItem(idx, { material_id: m.id })}
                  style={[styles.chip, it.material_id === m.id && styles.chipActive]}>
                  <Text style={{ color: it.material_id === m.id ? '#fff' : COLORS.text, fontWeight: '700' }}>
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Field label="Description" value={it.description}
            onChangeText={v => updateItem(idx, { description: v })} multiline />
          <Field label="Quantity"    value={it.quantity}
            onChangeText={v => updateItem(idx, { quantity: v })} keyboardType="numeric" />
          <Field label="Price"       value={it.unit_price}
            onChangeText={v => updateItem(idx, { unit_price: v })}
            keyboardType="decimal-pad" prefix="€" placeholder="0.00" />
          {it.piece_option && it.material_id != null && (
            <Text style={styles.estimateHint}>
              Estimated from {it.piece_option}{' '}
              + {materials.find(m => m.id === it.material_id)?.name ?? 'material'} — edit to override.
            </Text>
          )}

          <Text style={styles.label}>Measurements</Text>
          {it.measurements.map((m, mIdx) => (
            <View key={mIdx} style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 2 }}>
                <Field label="Label" value={m.label}
                  onChangeText={v => updateMeasurement(idx, mIdx, { label: v })} placeholder="chest" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="cm" value={m.value_cm}
                  onChangeText={v => updateMeasurement(idx, mIdx, { value_cm: v })} keyboardType="decimal-pad" />
              </View>
            </View>
          ))}
          <Pressable onPress={() => addMeasurement(idx)}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', marginBottom: 8 }}>+ Add measurement</Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={() => setItems(prev => [...prev, newItem()])} style={{ marginBottom: 16 }}>
        <Text style={{ color: COLORS.primary, fontWeight: '700' }}>+ Add another garment</Text>
      </Pressable>

      <PrimaryButton title="Create order" onPress={submit} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title:     { fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: COLORS.text },
  subtitle:  { fontSize: 14, color: COLORS.textMuted, marginTop: 6, lineHeight: 20 },
  label:     { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  section:   { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
  chip: {
    backgroundColor: '#fff', borderColor: COLORS.border, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  itemBox: {
    backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 18, padding: 14, marginBottom: 12,
  },
  hintMuted: {
    color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic',
    marginBottom: 12,
  },
  estimateHint: {
    color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic',
    marginTop: -8, marginBottom: 8,
  },
});
