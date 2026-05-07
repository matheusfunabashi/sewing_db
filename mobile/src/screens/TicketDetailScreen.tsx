import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { Employee, Paged, Ticket, api } from '../lib/api';
import { COLORS, STAGES, stageLabel } from '../lib/theme';

export default function TicketDetailScreen({ route }: any) {
  const { id } = route.params;
  const [ticket, setTicket]   = useState<Ticket | null>(null);
  const [employees, setEmps]  = useState<Employee[]>([]);
  const [busy, setBusy]       = useState(false);

  const load = useCallback(async () => {
    setTicket(await api.get<Ticket>(`/tickets/${id}/`));
  }, [id]);

  useEffect(() => {
    load();
    api.get<Paged<Employee>>('/employees/', { is_active: true })
      .then((d) => setEmps(d.results))
      .catch(() => {});
  }, [load]);

  const advance = async () => {
    setBusy(true);
    try {
      await api.post(`/tickets/${id}/advance_stage/`);
      await load();
    } finally { setBusy(false); }
  };

  const assign = async (employeeId: number | null) => {
    setBusy(true);
    try {
      await api.patch(`/tickets/${id}/`, { assigned_employee: employeeId });
      await load();
    } finally { setBusy(false); }
  };

  if (!ticket) {
    return <View style={styles.center}><Text>Loading...</Text></View>;
  }
  const currentStageIndex = Math.max(STAGES.indexOf(ticket.stage as any), 0);
  const isAtLastStage = currentStageIndex === STAGES.length - 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
    >
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{ticket.code}</Text>
          <Badge value={ticket.priority} kind="priority" small />
        </View>
        <View style={[styles.rowBetween, { marginTop: 8 }]}>
          <Badge value={ticket.stage}  />
          <Badge value={ticket.status} />
        </View>
        {ticket.fabric ? <Text style={[styles.meta, { marginTop: 8 }]}>Fabric: {ticket.fabric}</Text> : null}
        {ticket.color  ? <Text style={styles.meta}>Color: {ticket.color}</Text> : null}
        {ticket.deadline ? <Text style={styles.meta}>Deadline: {ticket.deadline}</Text> : null}
        {ticket.design_notes ? (
          <Text style={[styles.meta, { marginTop: 8 }]}>Notes: {ticket.design_notes}</Text>
        ) : null}
      </Card>

      <Text style={styles.section}>Production stage</Text>
      <Card>
        <View>
          {STAGES.map((s, idx) => {
            const reached = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <View key={s} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View
                    style={[
                      styles.timelineDot,
                      reached && styles.timelineDotReached,
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  />
                  {idx < STAGES.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        idx < currentStageIndex && styles.timelineLineReached,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.timelineTextWrap}>
                  <Text style={[styles.timelineLabel, isCurrent && styles.timelineLabelCurrent]}>
                    {stageLabel(s)}
                  </Text>
                  {isCurrent && <Text style={styles.currentCaption}>Current stage</Text>}
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 12 }} />
        {isAtLastStage ? (
          <View style={styles.completedPill}>
            <Text style={styles.completedPillText}>Stages completed</Text>
          </View>
        ) : (
          <PrimaryButton title="Advance to next stage" onPress={advance} loading={busy} />
        )}
      </Card>

      <Text style={styles.section}>Assigned worker</Text>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Pressable
            onPress={() => assign(null)}
            style={[
              styles.chip,
              ticket.assigned_employee == null && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
            ]}
          >
            <Text style={{ color: ticket.assigned_employee == null ? '#fff' : COLORS.text, fontWeight: '600' }}>
              Unassigned
            </Text>
          </Pressable>
          {employees.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => assign(e.id)}
              style={[
                styles.chip,
                ticket.assigned_employee === e.id && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
              ]}
            >
              <Text style={{ color: ticket.assigned_employee === e.id ? '#fff' : COLORS.text, fontWeight: '600' }}>
                {e.full_name}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Text style={styles.section}>History</Text>
      <Card>
        {(ticket.history ?? []).length === 0 && (
          <Text style={{ color: COLORS.textMuted }}>No history yet.</Text>
        )}
        {(ticket.history ?? []).map((h) => (
          <View key={h.id} style={{ paddingVertical: 6, borderBottomColor: COLORS.border, borderBottomWidth: 1 }}>
            <Text style={{ color: COLORS.text, fontWeight: '600' }}>
              {h.from_stage ? `${stageLabel(h.from_stage)} -> ` : ''}{stageLabel(h.to_stage)}
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
              {new Date(h.changed_at).toLocaleString()}
            </Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:    { fontSize: 20, fontWeight: '900', color: COLORS.text },
  meta:     { color: COLORS.textMuted, fontSize: 14 },
  section:  { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 8 },
  chip: {
    backgroundColor: '#ffffff', borderColor: COLORS.border, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineRail: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 13,
    height: 13,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#94a3b8',
    backgroundColor: '#fff',
  },
  timelineDotReached: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  timelineDotCurrent: {
    width: 15,
    height: 15,
    borderColor: COLORS.black,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: '#cbd5e1',
    marginTop: 2,
  },
  timelineLineReached: { backgroundColor: COLORS.primary },
  timelineTextWrap: { flex: 1, paddingBottom: 8 },
  timelineLabel: { color: COLORS.textMuted, fontWeight: '600' },
  timelineLabelCurrent: { color: COLORS.black, fontWeight: '800' },
  currentCaption: { fontSize: 12, color: COLORS.primaryDark, marginTop: 2, fontWeight: '700' },
  completedPill: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  completedPillText: {
    color: '#065f46',
    fontWeight: '800',
    fontSize: 14,
  },
});
