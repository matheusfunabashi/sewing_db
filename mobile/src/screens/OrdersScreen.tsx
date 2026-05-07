import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Badge from '../components/Badge';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { Order, Paged, api } from '../lib/api';
import { COLORS } from '../lib/theme';

const FILTERS: { id: string; label: string }[] = [
  { id: 'pending',       label: 'Pending' },
  { id: 'in_production', label: 'In production' },
  { id: 'completed',     label: 'Completed' },
];

export default function OrdersScreen({ navigation }: any) {
  const [items, setItems] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (filter === 'completed') {
        const [completed, delivered] = await Promise.all([
          api.get<Paged<Order>>('/orders/', { status: 'completed' }),
          api.get<Paged<Order>>('/orders/', { status: 'delivered' }),
        ]);
        const merged = [...completed.results, ...delivered.results]
          .sort((a, b) => b.id - a.id);
        setItems(merged);
      } else {
        const data = await api.get<Paged<Order>>('/orders/', { status: filter });
        setItems(data.results);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map(f => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[
                styles.chip,
                filter === f.id && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: filter === f.id ? '#fff' : COLORS.text },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 12 }}>
        <PrimaryButton title="+ New order" onPress={() => navigation.navigate('OrderForm')} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No orders match this filter.</Text>
          }
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('OrderDetail', { id: item.id })}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>Order #{item.id}</Text>
                <Badge value={item.status} />
              </View>
              <Text style={styles.customer}>{item.customer_name}</Text>
              <View style={[styles.rowBetween, { marginTop: 8 }]}>
                <Text style={styles.meta}>
                  Due: {item.due_date ?? '-'}
                </Text>
                <Badge value={item.priority} kind="priority" small />
              </View>
              {item.is_overdue && (
                <Text style={styles.overdue}>Overdue!</Text>
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  toolbar:   { paddingHorizontal: 12, paddingTop: 10 },
  chip: {
    backgroundColor: '#ffffff', borderColor: COLORS.border, borderWidth: 1,
    paddingHorizontal: 15, paddingVertical: 11, borderRadius: 22,
  },
  chipText: { fontWeight: '700', fontSize: 14, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:    { fontSize: 17, fontWeight: '900', color: COLORS.text },
  customer: { fontSize: 14, color: COLORS.text, marginTop: 5 },
  meta:     { fontSize: 13, color: COLORS.textMuted },
  overdue:  { color: COLORS.danger, fontWeight: '700', marginTop: 6 },
  empty:    { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});
