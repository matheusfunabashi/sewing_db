import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Field         from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import { Material, api } from '../lib/api';
import { COLORS } from '../lib/theme';

const UNIT_OPTIONS = ['m', 'cm', 'roll', 'unit', 'box', 'kg'] as const;

export default function MaterialFormScreen({ route, navigation }: any) {
  const id: number | undefined = route.params?.id;
  const isEdit = typeof id === 'number';

  const [name, setName]         = useState('');
  const [unit, setUnit]         = useState<string>('unit');
  const [stockQty, setStockQty] = useState('0');
  const [unitCost, setUnitCost] = useState('0');
  const [loading, setLoading]   = useState(isEdit);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit material' : 'New material' });
  }, [navigation, isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    api.get<Material>(`/materials/${id}/`)
      .then(m => {
        if (!active) return;
        setName(m.name);
        setUnit(m.unit);
        setStockQty(String(m.stock_qty ?? '0'));
        setUnitCost(String(m.unit_cost ?? '0'));
      })
      .catch(e => Alert.alert('Error', e.message ?? 'Could not load material'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id, isEdit]);

  const submit = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Material name is required.'); return; }
    const qty  = Number(stockQty || 0);
    const cost = Number(unitCost || 0);
    if (!Number.isFinite(qty) || qty < 0)  { Alert.alert('Invalid', 'Stock must be a positive number.'); return; }
    if (!Number.isFinite(cost) || cost < 0) { Alert.alert('Invalid', 'Unit cost must be a positive number.'); return; }

    const payload = {
      name:      name.trim(),
      unit:      unit.trim() || 'unit',
      stock_qty: qty.toFixed(2),
      unit_cost: cost.toFixed(2),
    };

    setSaving(true);
    try {
      if (isEdit) await api.patch(`/materials/${id}/`, payload);
      else        await api.post('/materials/', payload);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save material');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!isEdit) return;
    Alert.alert(
      'Delete material',
      `Remove "${name}" from inventory? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/materials/${id}/`);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not delete');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { padding: 24 }]}>
        <Text style={{ color: COLORS.textMuted }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>{isEdit ? 'Edit material' : 'New material'}</Text>
      <Text style={styles.subtitle}>
        {isEdit ? 'Update inventory information.' : 'Add a new item to the workshop inventory.'}
      </Text>

      <View style={{ height: 12 }} />

      <Field label="Name *" value={name} onChangeText={setName} placeholder="e.g. Cotton fabric" />

      <Text style={styles.label}>Unit</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {UNIT_OPTIONS.map(u => (
          <Pressable key={u} onPress={() => setUnit(u)}
            style={[styles.chip, unit === u && styles.chipActive]}>
            <Text style={{ color: unit === u ? '#fff' : COLORS.text, fontWeight: '700' }}>{u}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Custom unit" value={unit} onChangeText={setUnit}
        placeholder="m, roll, unit…" />

      <Field label="Stock quantity" value={stockQty} onChangeText={setStockQty}
        keyboardType="decimal-pad" placeholder="0" />

      <Field label="Unit cost" value={unitCost} onChangeText={setUnitCost}
        keyboardType="decimal-pad" placeholder="0.00" prefix="€" />

      <View style={{ height: 8 }} />
      <PrimaryButton
        title={isEdit ? 'Save changes' : 'Create material'}
        onPress={submit}
        loading={saving}
      />

      {isEdit && (
        <View style={{ marginTop: 18 }}>
          <PrimaryButton
            title="Delete material"
            variant="danger"
            onPress={remove}
            loading={deleting}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title:     { fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: COLORS.text },
  subtitle:  { fontSize: 14, color: COLORS.textMuted, marginTop: 6, lineHeight: 20 },
  label:     { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 6 },
  chip: {
    backgroundColor: '#fff', borderColor: COLORS.border, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
});
