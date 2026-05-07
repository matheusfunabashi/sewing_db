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
import { Paged, Ticket, api } from '../lib/api';
import { COLORS, STAGES, stageLabel } from '../lib/theme';

const FILTERS: { id: string; label: string }[] = [
  ...STAGES.map((s) => ({ id: s, label: stageLabel(s) })),
];

export default function TicketsScreen({ navigation }: any) {
  const [items, setItems]     = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('order_received');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Paged<Ticket>>('/tickets/', { stage: filter });
      setItems(data.results);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, padding: 12 }}
      >
        {FILTERS.map((f) => (
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

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={<Text style={styles.empty}>No tickets here.</Text>}
          renderItem={({ item }) => (
            <Card onPress={() => navigation.navigate('TicketDetail', { id: item.id })}>
              <View style={styles.rowBetween}>
                <Text style={styles.code}>{item.code}</Text>
                <Badge value={item.priority} kind="priority" small />
              </View>
              <View style={[styles.rowBetween, { marginTop: 6 }]}>
                <Badge value={item.stage} small />
                <Badge value={item.status} small />
              </View>
              {item.assigned_employee_name ? (
                <Text style={[styles.meta, { marginTop: 6 }]}>
                  Assigned: {item.assigned_employee_name}
                </Text>
              ) : null}
              {item.deadline ? (
                <Text style={styles.meta}>Deadline: {item.deadline}</Text>
              ) : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  chip: {
    backgroundColor: '#ffffff', borderColor: COLORS.border, borderWidth: 1,
    paddingHorizontal: 15, paddingVertical: 11, borderRadius: 22,
  },
  chipText: { fontWeight: '700', fontSize: 14, lineHeight: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  meta: { color: COLORS.textMuted, fontSize: 13 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});
