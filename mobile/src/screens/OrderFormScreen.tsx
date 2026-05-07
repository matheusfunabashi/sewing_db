import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Field from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import { Customer, Paged, api } from '../lib/api';
import { COLORS, PRIORITY_COLORS } from '../lib/theme';

interface ItemDraft {
  piece_option: string;
  custom_piece: string;
  description: string;
  quantity: string;
  unit_price: string;
  measurements: { label: string; value_cm: string }[];
}

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const GARMENT_OPTIONS = ['Dress', 'Shirt', 'Shorts', 'Pants', 'Mask', 'Jacket', 'Other'] as const;

const newItem = (): ItemDraft => ({
  piece_option: '',
  custom_piece: '',
  description: '',
  quantity: '1',
  unit_price: '0',
  measurements: [],
});

const formatIsoDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

const garmentTypeFromDraft = (draft: ItemDraft): string => {
  if (draft.piece_option === 'Other') return draft.custom_piece.trim();
  return draft.piece_option.trim();
};

export default function OrderFormScreen({ navigation }: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('normal');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([newItem()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Paged<Customer>>('/customers/')
      .then((d) => setCustomers(d.results))
      .catch(() => setCustomers([]));
  }, []);

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addMeasurement = (idx: number) => {
    setItems(prev => prev.map((it, i) =>
      i === idx ? { ...it, measurements: [...it.measurements, { label: '', value_cm: '' }] } : it,
    ));
  };

  const updateMeasurement = (
    itemIdx: number,
    mIdx: number,
    patch: Partial<{ label: string; value_cm: string }>,
  ) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== itemIdx) return it;
      return { ...it, measurements: it.measurements.map((m, j) => j === mIdx ? { ...m, ...patch } : m) };
    }));
  };

  const submit = async () => {
    if (!customerId) {
      Alert.alert('Validation', 'Please select a customer.');
      return;
    }
    const preparedItems = items
      .map((draft) => ({ draft, garment_type: garmentTypeFromDraft(draft) }))
      .filter((entry) => entry.garment_type);
    if (preparedItems.length === 0) {
      Alert.alert('Validation', 'Add at least one garment.');
      return;
    }
    if (
      items.some((draft) => draft.piece_option === 'Other' && !draft.custom_piece.trim())
    ) {
      Alert.alert('Validation', 'Please fill the custom piece name when "Other" is selected.');
      return;
    }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Validation', 'Due date format must be YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    try {
      const order = await api.post<{ id: number }>('/orders/', {
        customer: customerId,
        order_date: new Date().toISOString().slice(0, 10),
        due_date: dueDate || null,
        priority,
        status: 'pending',
        notes: notes || null,
      });

      for (const { draft, garment_type } of preparedItems) {
        const item = await api.post<{ id: number }>('/order-items/', {
          order: order.id,
          garment_type,
          description: draft.description || null,
          quantity: Number(draft.quantity || 1),
          unit_price: Number(draft.unit_price || 0).toFixed(2),
        });
        for (const m of draft.measurements) {
          if (!m.label) continue;
          await api.post('/measurements/', {
            order_item: item.id,
            label: m.label,
            value_cm: Number(m.value_cm || 0).toFixed(2),
          });
        }
      }

      navigation.replace('OrderDetail', { id: order.id });
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Workflow 1 - Create order</Text>
      <Text style={styles.subtitle}>
        Assign a customer, list the garments and set a due date. After saving you can
        generate work tickets.
      </Text>

      <Text style={styles.label}>Customer *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
        {customers.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCustomerId(c.id)}
            style={[
              styles.chip,
              customerId === c.id && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
            ]}
          >
            <Text style={{ color: customerId === c.id ? '#fff' : COLORS.text, fontWeight: '600' }}>
              {c.full_name}
            </Text>
          </Pressable>
        ))}
        {customers.length === 0 && (
          <Text style={{ color: COLORS.textMuted }}>No customers yet - create one first.</Text>
        )}
      </ScrollView>

      <View style={{ height: 12 }} />

      <Field
        label="Due date (YYYY-MM-DD)"
        value={dueDate}
        onChangeText={(v) => setDueDate(formatIsoDateInput(v))}
        placeholder="2026-06-15"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Priority</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {PRIORITIES.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPriority(p)}
            style={[
              styles.chip,
              priority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] },
            ]}
          >
            <Text style={{ color: priority === p ? '#fff' : COLORS.text, fontWeight: '600' }}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Internal notes" multiline />

      <Text style={styles.section}>Garments</Text>
      {items.map((it, idx) => (
        <View key={idx} style={styles.itemBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', color: COLORS.text }}>Garment #{idx + 1}</Text>
            {items.length > 1 && (
              <Pressable onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                <Text style={{ color: COLORS.danger, fontWeight: '700' }}>Remove</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.label}>Piece *</Text>
          <View style={styles.pieceOptionsRow}>
            {GARMENT_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => updateItem(idx, { piece_option: option })}
                style={[
                  styles.chip,
                  it.piece_option === option && {
                    backgroundColor: COLORS.primary,
                    borderColor: COLORS.primary,
                  },
                ]}
              >
                <Text
                  style={{
                    color: it.piece_option === option ? '#fff' : COLORS.text,
                    fontWeight: '600',
                  }}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>
          {it.piece_option === 'Other' && (
            <Field
              label="Specific piece name"
              value={it.custom_piece}
              onChangeText={(v) => updateItem(idx, { custom_piece: v })}
              placeholder="e.g. Vest"
            />
          )}
          <Field label="Description"   value={it.description}  onChangeText={(v) => updateItem(idx, { description: v })}  multiline />
          <Field label="Quantity"      value={it.quantity}     onChangeText={(v) => updateItem(idx, { quantity: v })}    keyboardType="numeric" />
          <Field label="Unit price"    value={it.unit_price}   onChangeText={(v) => updateItem(idx, { unit_price: v })}  keyboardType="decimal-pad" />

          <Text style={styles.label}>Measurements</Text>
          {it.measurements.map((m, mIdx) => (
            <View key={mIdx} style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 2 }}>
                <Field label="Label" value={m.label}    onChangeText={(v) => updateMeasurement(idx, mIdx, { label: v })} placeholder="chest" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="cm"    value={m.value_cm} onChangeText={(v) => updateMeasurement(idx, mIdx, { value_cm: v })} keyboardType="decimal-pad" />
              </View>
            </View>
          ))}
          <Pressable onPress={() => addMeasurement(idx)}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', marginBottom: 8 }}>
              + Add measurement
            </Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={() => setItems((prev) => [...prev, newItem()])} style={{ marginBottom: 16 }}>
        <Text style={{ color: COLORS.primary, fontWeight: '700' }}>+ Add another garment</Text>
      </Pressable>

      <PrimaryButton title="Create order" onPress={submit} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title:     { fontSize: 21, fontWeight: '900', color: COLORS.text },
  subtitle:  { fontSize: 14, color: COLORS.textMuted, marginTop: 6, lineHeight: 20 },
  label:     { color: COLORS.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  section:   { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  chip: {
    backgroundColor: '#ffffff', borderColor: COLORS.border, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
  },
  itemBox: {
    backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  pieceOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
});
