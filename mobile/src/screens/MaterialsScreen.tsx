import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import Card from '../components/Card';
import { Material, Paged, api } from '../lib/api';
import { COLORS } from '../lib/theme';

const LOW_STOCK_THRESHOLD = 10;

const formatNumber = (raw: string | number, fractionDigits = 2) => {
  const value = typeof raw === 'number' ? raw : parseFloat(raw);
  if (Number.isNaN(value)) return String(raw);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatStock = (raw: string) => {
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return raw;
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export default function MaterialsScreen({ navigation }: any) {
  const [items, setItems]     = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<Paged<Material>>('/materials/', { search });
      setItems(d.results);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const bumpStock = async (mat: Material, delta: number) => {
    const current = parseFloat(mat.stock_qty);
    const safeCur = Number.isFinite(current) ? current : 0;
    const next    = Math.max(0, safeCur + delta);
    const nextStr = next.toFixed(2);

    setItems(prev => prev.map(x => x.id === mat.id ? { ...x, stock_qty: nextStr } : x));

    try {
      await api.patch(`/materials/${mat.id}/`, { stock_qty: nextStr });
    } catch (e: any) {
      setItems(prev => prev.map(x => x.id === mat.id ? { ...x, stock_qty: mat.stock_qty } : x));
      Alert.alert('Error', e?.message ?? 'Could not update stock.');
    }
  };

  const totals = useMemo(() => {
    const totalValue = items.reduce((acc, m) => {
      const qty = parseFloat(m.stock_qty);
      const cost = parseFloat(m.unit_cost);
      if (Number.isFinite(qty) && Number.isFinite(cost)) return acc + qty * cost;
      return acc;
    }, 0);
    const lowStock = items.filter(m => parseFloat(m.stock_qty) <= LOW_STOCK_THRESHOLD).length;
    return { totalValue, lowStock };
  }, [items]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Inventory</Text>
            <Text style={styles.title}>Materials</Text>
          </View>
          <Pressable
            onPress={() => navigation?.navigate('MaterialForm')}
            style={styles.newButton}
          >
            <MaterialCommunityIcons name="plus" color="#fff" size={18} />
            <Text style={styles.newButtonText}>New</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryLabel}>Low stock</Text>
            <Text style={[styles.summaryValue, totals.lowStock > 0 && { color: COLORS.danger }]}>
              {totals.lowStock}
            </Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryLabel}>Stock value</Text>
            <Text style={styles.summaryValue}>{formatNumber(totals.totalValue)}</Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            returnKeyType="search"
            placeholder="Search material…"
            placeholderTextColor={COLORS.textLight}
            style={styles.search}
          />
        </View>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={<Text style={styles.empty}>No materials in stock yet.</Text>}
          renderItem={({ item }) => {
            const stockValue = parseFloat(item.stock_qty);
            const isLow = Number.isFinite(stockValue) && stockValue <= LOW_STOCK_THRESHOLD;
            const lineValue =
              parseFloat(item.stock_qty) * parseFloat(item.unit_cost);

            return (
              <Card onPress={() => navigation?.navigate('MaterialForm', { id: item.id })}>
                <View style={styles.row}>
                  <View style={styles.avatar}>
                    <MaterialCommunityIcons
                      name="package-variant-closed"
                      size={22}
                      color={COLORS.primary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.metaUnit}>per {item.unit}</Text>
                  </View>

                  {isLow && (
                    <View style={styles.lowBadge}>
                      <Text style={styles.lowBadgeText}>Low</Text>
                    </View>
                  )}
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { flex: 1.4 }]}>
                    <Text style={styles.statLabel}>Stock</Text>
                    <View style={styles.stockControls}>
                      <Pressable
                        onPress={() => bumpStock(item, -1)}
                        disabled={stockValue <= 0}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.stockBtn,
                          stockValue <= 0 && styles.stockBtnDisabled,
                          pressed && !(stockValue <= 0) && styles.stockBtnPressed,
                        ]}
                      >
                        <MaterialCommunityIcons name="minus" size={16} color="#fff" />
                      </Pressable>
                      <Text style={styles.stockValue}>{formatStock(item.stock_qty)}</Text>
                      <Pressable
                        onPress={() => bumpStock(item, +1)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.stockBtn,
                          pressed && styles.stockBtnPressed,
                        ]}
                      >
                        <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                      </Pressable>
                    </View>
                    <Text style={styles.statSub}>{item.unit}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Unit cost</Text>
                    <Text style={styles.statValue}>{formatNumber(item.unit_cost)}</Text>
                    <Text style={styles.statSub}>/{item.unit}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Line value</Text>
                    <Text style={styles.statValue}>
                      {Number.isFinite(lineValue) ? formatNumber(lineValue) : '–'}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.gradEnd,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: COLORS.darkMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  title:   { fontSize: 32, fontWeight: '900', fontStyle: 'italic', color: COLORS.text, lineHeight: 36, marginTop: 2 },

  newButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.dark, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999,
  },
  newButtonText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: { fontSize: 10, color: COLORS.darkMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 18, color: COLORS.text, fontWeight: '900', marginTop: 2 },

  toolbar: { flexDirection: 'row', gap: 10 },
  search:  {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 15,
  },

  row:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1, borderColor: COLORS.borderWarm,
    alignItems: 'center', justifyContent: 'center',
  },
  name:     { fontSize: 16, fontWeight: '800', color: COLORS.text },
  metaUnit: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  lowBadge: {
    backgroundColor: '#FBE4E4',
    borderColor: COLORS.danger,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  lowBadgeText: { color: COLORS.danger, fontWeight: '800', fontSize: 11, letterSpacing: 0.4 },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    backgroundColor: COLORS.cardWarm,
    borderRadius: 12,
    padding: 10,
  },
  statBox:   { flex: 1, alignItems: 'flex-start' },
  statLabel: { fontSize: 10, color: COLORS.darkMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 17, color: COLORS.text, fontWeight: '900', marginTop: 2 },
  statSub:   { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  stockControls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  stockBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  stockBtnPressed:  { backgroundColor: COLORS.primary },
  stockBtnDisabled: { backgroundColor: '#cbd2d9' },
  stockValue:       { fontSize: 17, color: COLORS.text, fontWeight: '900', minWidth: 28, textAlign: 'center' },

  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});
