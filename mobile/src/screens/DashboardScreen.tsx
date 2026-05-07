import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Card from '../components/Card';
import { Dashboard, api } from '../lib/api';
import { COLORS, stageLabel } from '../lib/theme';

const stat = (label: string, value: number, color: string) => (
  <View style={styles.stat} key={label}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function DashboardScreen() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await api.get<Dashboard>('/dashboard/');
      setData(d);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {error && (
        <Card style={{ borderColor: COLORS.danger, backgroundColor: '#fff1f2' }}>
          <Text style={{ color: COLORS.danger, fontWeight: '700' }}>Connection error</Text>
          <Text style={{ color: COLORS.textMuted, marginTop: 4 }}>{error}</Text>
          <Text style={{ color: COLORS.textMuted, marginTop: 6, fontSize: 12 }}>
            Make sure your Django server is running and `apiUrl` in app.json
            points to its LAN address.
          </Text>
        </Card>
      )}

      <Text style={styles.section}>Orders</Text>
      <Card>
        <View style={styles.row}>
          {stat('Pending',       data?.orders.pending       ?? 0, COLORS.pending)}
          {stat('In production', data?.orders.in_production ?? 0, COLORS.inProduction)}
        </View>
        <View style={[styles.row, { marginTop: 14 }]}>
          {stat('Completed', data?.orders.completed ?? 0, COLORS.completed)}
          {stat('Delivered', data?.orders.delivered ?? 0, COLORS.delivered)}
        </View>
        <View style={[styles.row, { marginTop: 14 }]}>
          {stat('Overdue', data?.orders.overdue ?? 0, COLORS.danger)}
          {stat('Total',   data?.orders.total   ?? 0, COLORS.text)}
        </View>
      </Card>

      <Text style={styles.section}>Tickets by stage</Text>
      <Card>
        {data?.tickets_by_stage?.length
          ? data.tickets_by_stage.map(({ stage, total }) => (
              <View
                key={stage}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 9,
                  borderBottomColor: COLORS.border,
                  borderBottomWidth: 1,
                }}
              >
                <Text style={{ color: COLORS.text }}>{stageLabel(stage)}</Text>
                <Text style={{ fontWeight: '700', color: COLORS.primary }}>{total}</Text>
              </View>
            ))
          : <Text style={{ color: COLORS.textMuted }}>No tickets yet.</Text>}
      </Card>

      <Text style={styles.section}>Shop</Text>
      <Card>
        <View style={styles.row}>
          {stat('Customers',       data?.customers ?? 0, COLORS.primary)}
          {stat('Active employees', data?.active_employees ?? 0, COLORS.primaryDark)}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 30, fontWeight: '900' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.4 },
});
