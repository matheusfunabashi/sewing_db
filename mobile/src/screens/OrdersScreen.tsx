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

import Badge        from '../components/Badge';
import PrimaryButton from '../components/PrimaryButton';
import { Order, Paged, api } from '../lib/api';
import { COLORS } from '../lib/theme';

const FILTERS = [
  { id: 'pending',       label: 'Pending' },
  { id: 'in_production', label: 'In production' },
  { id: 'completed',     label: 'Completed' },
];

// Generate a week of day pills centered on today
function buildDays() {
  const today = new Date();
  const days = [];
  for (let i = -2; i <= 2; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      num: d.getDate(),
      day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
      isToday: i === 0,
    });
  }
  return days;
}
const DAYS = buildDays();

function GradientHeader({ filter, setFilter, navigation }: any) {
  const [activeDay, setActiveDay] = useState(DAYS[2].num);
  const now = new Date();
  const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <View style={hdr.wrap}>
      <Text style={hdr.eyebrow}>{monthYear}</Text>
      <Text style={hdr.title}>{"Your\norders"}</Text>

      {/* date pills */}
      <View style={hdr.pillRow}>
        {DAYS.map(d => (
          <Pressable
            key={d.num}
            style={[hdr.pill, activeDay === d.num && hdr.pillActive]}
            onPress={() => setActiveDay(d.num)}
          >
            <Text style={[hdr.pillDay, activeDay === d.num && hdr.pillTextActive]}>{d.day}</Text>
            <Text style={[hdr.pillNum, activeDay === d.num && hdr.pillTextActive]}>{d.num}</Text>
          </Pressable>
        ))}
      </View>

      {/* filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
        {FILTERS.map(f => (
          <Pressable
            key={f.id}
            style={[hdr.chip, filter === f.id && hdr.chipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[hdr.chipText, filter === f.id && hdr.chipTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const hdr = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.gradStart,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', color: COLORS.darkMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 32, fontWeight: '900', fontStyle: 'italic', color: COLORS.text, lineHeight: 36, marginBottom: 14 },

  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.35)',
    minWidth: 44,
  },
  pillActive:    { backgroundColor: COLORS.dark },
  pillDay:       { fontSize: 10, color: COLORS.darkMuted, fontWeight: '600' },
  pillNum:       { fontSize: 16, fontWeight: '800', color: COLORS.text, lineHeight: 20 },
  pillTextActive: { color: '#fff' },

  chip: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  chipActive:    { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  chipText:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  chipTextActive: { color: '#fff' },
});

// ── order card (pink for urgent/high, peach for rest) ─────────────────────
function OrderCard({ item, onPress }: { item: Order; onPress: () => void }) {
  const isWarm = item.priority === 'urgent' || item.priority === 'high';
  return (
    <Pressable onPress={onPress} style={[styles.orderCard, isWarm ? styles.cardPink : styles.cardPeach]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTag}>
          {item.due_date ? `Due ${item.due_date}` : 'No due date'} · {item.priority}
        </Text>
        <View style={styles.arrowBtn}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>↗</Text>
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>Order #{item.id}{'\n'}{item.customer_name}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Badge value={item.status} small />
        {item.is_overdue && <Badge value="overdue" small />}
      </View>
    </Pressable>
  );
}

// ── main ──────────────────────────────────────────────────────────────────
export default function OrdersScreen({ navigation }: any) {
  const [items, setItems]     = useState<Order[]>([]);
  const [filter, setFilter]   = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (filter === 'completed') {
        const [a, b] = await Promise.all([
          api.get<Paged<Order>>('/orders/', { status: 'completed' }),
          api.get<Paged<Order>>('/orders/', { status: 'delivered' }),
        ]);
        setItems([...a.results, ...b.results].sort((a, b) => b.id - a.id));
      } else {
        const d = await api.get<Paged<Order>>('/orders/', { status: filter });
        setItems(d.results);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <GradientHeader filter={filter} setFilter={setFilter} navigation={navigation} />

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <PrimaryButton title="+ New order" onPress={() => navigation.navigate('OrderForm')} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={o => String(o.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={<Text style={styles.empty}>No orders here.</Text>}
          renderItem={({ item }) => (
            <OrderCard item={item} onPress={() => navigation.navigate('OrderDetail', { id: item.id })} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  orderCard: {
    borderRadius: 22,
    padding: 18,
  },
  cardPink:  { backgroundColor: '#F5AFC8' },
  cardPeach: { backgroundColor: '#FDE8D4', borderWidth: 1, borderColor: COLORS.borderWarm },

  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTag:   { fontSize: 11, fontWeight: '700', color: '#9A4A6A', textTransform: 'uppercase', letterSpacing: 0.4, flex: 1 },
  arrowBtn:  {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.text,
    lineHeight: 24,
  },

  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});
