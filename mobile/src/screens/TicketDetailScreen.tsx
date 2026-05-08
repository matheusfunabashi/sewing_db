import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Badge         from '../components/Badge';
import Card          from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { Employee, Paged, Ticket, api } from '../lib/api';
import { COLORS, STAGES, stageLabel } from '../lib/theme';

export default function TicketDetailScreen({ route }: any) {
  const { id } = route.params;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [employees, setEmps] = useState<Employee[]>([]);
  const [busy, setBusy]      = useState(false);

  const load = useCallback(async () => {
    setTicket(await api.get<Ticket>(`/tickets/${id}/`));
  }, [id]);

  useEffect(() => {
    load();
    api.get<Paged<Employee>>('/employees/', { is_active: true })
      .then(d => setEmps(d.results)).catch(() => {});
  }, [load]);

  const advance = async () => {
    setBusy(true);
    try { await api.post(`/tickets/${id}/advance_stage/`); await load(); }
    finally { setBusy(false); }
  };

  const assign = async (empId: number | null) => {
    setBusy(true);
    try { await api.patch(`/tickets/${id}/`, { assigned_employee: empId }); await load(); }
    finally { setBusy(false); }
  };

  if (!ticket) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Loading…</Text></View>;

  const currentIdx  = Math.max(STAGES.indexOf(ticket.stage as any), 0);
  const isLastStage = currentIdx === STAGES.length - 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
    >
      {/* ── summary ── */}
      <Card style={{ backgroundColor: COLORS.cardWarm, borderColor: COLORS.borderWarm }}>
        <View style={styles.row}>
          <Text style={styles.title}>{ticket.code}</Text>
          <Badge value={ticket.priority} kind="priority" small />
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Badge value={ticket.stage}  />
          <Badge value={ticket.status} />
        </View>
        {ticket.fabric   ? <Text style={[styles.meta, { marginTop: 10 }]}>Fabric: {ticket.fabric}</Text>   : null}
        {ticket.color    ? <Text style={styles.meta}>Colour: {ticket.color}</Text>    : null}
        {ticket.deadline ? <Text style={styles.meta}>Deadline: {ticket.deadline}</Text> : null}
        {ticket.design_notes ? <Text style={[styles.meta, { marginTop: 8, fontStyle: 'italic' }]}>{ticket.design_notes}</Text> : null}
      </Card>

      {/* ── production timeline ── */}
      <Text style={styles.section}>Production stages</Text>
      <Card>
        {STAGES.map((s, idx) => {
          const reached   = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <View key={s} style={styles.stageRow}>
              <View style={styles.rail}>
                <View style={[styles.dot, reached && styles.dotReached, isCurrent && styles.dotCurrent]} />
                {idx < STAGES.length - 1 && (
                  <View style={[styles.line, idx < currentIdx && styles.lineReached]} />
                )}
              </View>
              <View style={styles.stageText}>
                <Text style={[styles.stageLabel, isCurrent && styles.stageLabelCurrent]}>
                  {stageLabel(s)}
                </Text>
                {isCurrent && <Text style={styles.currentTag}>Current</Text>}
              </View>
            </View>
          );
        })}
        <View style={{ height: 12 }} />
        {isLastStage ? (
          <View style={styles.donePill}>
            <Text style={styles.doneText}>All stages complete ✓</Text>
          </View>
        ) : (
          <PrimaryButton title="Advance to next stage" onPress={advance} loading={busy} />
        )}
      </Card>

      {/* ── assign worker ── */}
      <Text style={styles.section}>Assigned tailor</Text>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Pressable
            onPress={() => assign(null)}
            style={[styles.chip, ticket.assigned_employee == null && styles.chipActive]}
          >
            <Text style={{ color: ticket.assigned_employee == null ? '#fff' : COLORS.text, fontWeight: '700' }}>
              Unassigned
            </Text>
          </Pressable>
          {employees.map(e => (
            <Pressable
              key={e.id}
              onPress={() => assign(e.id)}
              style={[styles.chip, ticket.assigned_employee === e.id && styles.chipActive]}
            >
              <Text style={{ color: ticket.assigned_employee === e.id ? '#fff' : COLORS.text, fontWeight: '700' }}>
                {e.full_name}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* ── history ── */}
      <Text style={styles.section}>History</Text>
      <Card>
        {(ticket.history ?? []).length === 0 && <Text style={{ color: COLORS.textMuted }}>No history yet.</Text>}
        {(ticket.history ?? []).map(h => (
          <View key={h.id} style={styles.historyRow}>
            <Text style={styles.historyStage}>
              {h.from_stage ? `${stageLabel(h.from_stage)} → ` : ''}{stageLabel(h.to_stage)}
            </Text>
            <Text style={styles.historyTime}>{new Date(h.changed_at).toLocaleString()}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:     { fontSize: 19, fontWeight: '900', color: COLORS.text, fontStyle: 'italic' },
  meta:      { color: COLORS.textMuted, fontSize: 14 },
  section:   { fontSize: 11, fontWeight: '800', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 12, marginBottom: 8 },

  // stage timeline
  stageRow: { flexDirection: 'row', alignItems: 'flex-start' },
  rail:     { width: 26, alignItems: 'center' },
  dot: {
    width: 13, height: 13, borderRadius: 99,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  dotReached:  { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  dotCurrent:  { width: 15, height: 15, borderColor: COLORS.dark, backgroundColor: COLORS.dark },
  line:        { width: 2, flex: 1, minHeight: 20, backgroundColor: COLORS.border, marginTop: 2 },
  lineReached: { backgroundColor: COLORS.primary },
  stageText:   { flex: 1, paddingBottom: 10 },
  stageLabel:  { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
  stageLabelCurrent: { color: COLORS.text, fontWeight: '800' },
  currentTag:  { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 2 },

  donePill: {
    backgroundColor: '#EAF7EE',
    borderColor: COLORS.success,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneText: { color: '#2D7A50', fontWeight: '800', fontSize: 14 },

  // assign chips
  chip: {
    backgroundColor: '#fff',
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  chipActive: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },

  // history
  historyRow:   { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyStage: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  historyTime:  { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
});
