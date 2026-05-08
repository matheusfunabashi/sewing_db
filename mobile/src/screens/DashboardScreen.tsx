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

// Inline gradient header using nested Views (no expo-linear-gradient dependency)
function WarmHeader() {
  return (
    <View style={hdr.wrap}>
      <Text style={hdr.eyebrow}>Shop overview</Text>
      <Text style={hdr.title}>{"Your\nworkshop"}</Text>
    </View>
  );
}

const hdr = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.gradStart,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.darkMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 38,
    fontStyle: 'italic',
  },
});

// ── stat tile ──────────────────────────────────────────────────────────────
function StatTile({
  label, value, color, wide,
}: { label: string; value: number; color: string; wide?: boolean }) {
  return (
    <View style={[styles.tile, wide && styles.tileWide]}>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

// ── main ───────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const [data, setData]       = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await api.get<Dashboard>('/dashboard/'));
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

  const o = data?.orders;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <WarmHeader />

      <View style={styles.body}>

        {error && (
          <Card style={{ borderColor: COLORS.danger, backgroundColor: '#FFF0F0' }}>
            <Text style={{ color: COLORS.danger, fontWeight: '700' }}>Connection error</Text>
            <Text style={{ color: COLORS.textMuted, marginTop: 4 }}>{error}</Text>
            <Text style={{ color: COLORS.textMuted, marginTop: 6, fontSize: 12 }}>
              Make sure Django is running and apiUrl in app.json points to your LAN IP.
            </Text>
          </Card>
        )}

        {/* ── orders ─────────────────────────────────────────── */}
        <Text style={styles.section}>Orders</Text>
        <View style={styles.tileRow}>
          <StatTile label="Pending"       value={o?.pending       ?? 0} color={COLORS.textMuted} />
          <StatTile label="In production" value={o?.in_production ?? 0} color={COLORS.primary}   />
        </View>
        <View style={[styles.tileRow, { marginTop: 10 }]}>
          <StatTile label="Completed" value={o?.completed ?? 0} color={COLORS.success} />
          <StatTile label="Delivered" value={o?.delivered ?? 0} color={COLORS.delivered} />
        </View>
        {(o?.overdue ?? 0) > 0 && (
          <View style={styles.overdueBar}>
            <Text style={styles.overdueText}>⚠ {o!.overdue} overdue order{o!.overdue > 1 ? 's' : ''}</Text>
          </View>
        )}

        {/* ── tickets by stage ───────────────────────────────── */}
        <Text style={styles.section}>Tickets by stage</Text>
        <Card>
          {data?.tickets_by_stage?.length
            ? data.tickets_by_stage.map(({ stage, total }) => (
                <View key={stage} style={styles.stageRow}>
                  <View style={styles.stageDot} />
                  <Text style={styles.stageLabel}>{stageLabel(stage)}</Text>
                  <View style={styles.stagePill}>
                    <Text style={styles.stagePillText}>{total}</Text>
                  </View>
                </View>
              ))
            : <Text style={{ color: COLORS.textMuted }}>No tickets yet.</Text>}
        </Card>

        {/* ── shop ───────────────────────────────────────────── */}
        <Text style={styles.section}>Shop</Text>
        <View style={styles.tileRow}>
          <StatTile label="Customers"       value={data?.customers        ?? 0} color={COLORS.primary} />
          <StatTile label="Active employees" value={data?.active_employees ?? 0} color={COLORS.primaryDark} />
        </View>

        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  body:      { padding: 16 },

  section: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 6,
  },

  tileRow: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  tileWide:      { flex: 2 },
  tileValue:     { fontSize: 32, fontWeight: '900', lineHeight: 36 },
  tileLabel:     { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: '600', textAlign: 'center' },

  overdueBar: {
    marginTop: 10,
    backgroundColor: '#FFF0EC',
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  overdueText: { color: COLORS.danger, fontWeight: '700', fontSize: 14 },

  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  stageDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  stageLabel:    { flex: 1, color: COLORS.text, fontSize: 14 },
  stagePill: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  stagePillText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
});
