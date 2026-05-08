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
import Card  from '../components/Card';
import { Paged, Ticket, api } from '../lib/api';
import { COLORS, STAGES, stageLabel } from '../lib/theme';

const FILTERS = STAGES.map(s => ({ id: s, label: stageLabel(s) }));

export default function TicketsScreen({ navigation }: any) {
  const [items, setItems]     = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('order_received');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<Paged<Ticket>>('/tickets/', { stage: filter });
      setItems(d.results);
    } finally { setLoading(false); }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      {/* ── warm header ── */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Production</Text>
        <Text style={styles.title}>Tickets</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 12 }}
        >
          {FILTERS.map(f => (
            <Pressable
              key={f.id}
              style={[styles.chip, filter === f.id && styles.chipActive]}
              onPress={() => setFilter(f.id)}
            >
              <Text style={[styles.chipText, filter === f.id && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={t => String(t.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={<Text style={styles.empty}>No tickets at this stage.</Text>}
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('TicketDetail', { id: item.id })}>
              <View style={styles.row}>
                <Text style={styles.code}>{item.code}</Text>
                <Badge value={item.priority} kind="priority" small />
              </View>
              <View style={[styles.row, { marginTop: 8 }]}>
                <Badge value={item.stage}  small />
                <Badge value={item.status} small />
              </View>
              {item.assigned_employee_name
                ? <Text style={[styles.meta, { marginTop: 8 }]}>👤 {item.assigned_employee_name}</Text>
                : null}
              {item.deadline
                ? <Text style={styles.meta}>Due {item.deadline}</Text>
                : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.gradMid,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', color: COLORS.darkMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  title:   { fontSize: 32, fontWeight: '900', fontStyle: 'italic', color: COLORS.text, lineHeight: 36, marginTop: 2 },

  chip: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  chipActive:    { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  chipText:      { fontSize: 12, fontWeight: '700', color: COLORS.text },
  chipTextActive: { color: '#fff' },

  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code:  { fontSize: 16, fontWeight: '900', color: COLORS.text, flex: 1 },
  meta:  { color: COLORS.textMuted, fontSize: 13 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});
