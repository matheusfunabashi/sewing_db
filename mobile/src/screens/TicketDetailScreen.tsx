import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const load = useCallback(async () => {
    setTicket(await api.get<Ticket>(`/tickets/${id}/`));
  }, [id]);

  useEffect(() => {
    load();
    api.get<Paged<Employee>>('/employees/', { is_active: true })
      .then(d => setEmps(d.results)).catch(() => {});
  }, [load]);

  const pickFrom = async (source: 'camera' | 'library') => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed',
        source === 'camera' ? 'Camera access is required to take a photo.'
                            : 'Photo library access is required.');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true, quality: 0.55, base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true, quality: 0.55, base64: true,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset?.base64) setPendingPhoto(asset.base64);
  };

  const advance = async () => {
    if (!ticket) return;
    const isDeliveryStep = ticket.stage === 'ready_for_delivery';
    const photoToSend    = pendingPhoto ?? null;

    if (isDeliveryStep && !ticket.has_garment_photo && !photoToSend) {
      Alert.alert('Photo required',
        'Capture a garment photo before marking this ticket as delivered.');
      return;
    }

    setBusy(true);
    try {
      await api.post(`/tickets/${id}/advance_stage/`,
        photoToSend ? { garment_photo: photoToSend } : {});
      setPendingPhoto(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not advance stage');
    } finally {
      setBusy(false);
    }
  };

  const savePhoto = async () => {
    if (!pendingPhoto) return;
    setBusy(true);
    try {
      await api.post(`/tickets/${id}/upload_photo/`, { garment_photo: pendingPhoto });
      setPendingPhoto(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save photo');
    } finally {
      setBusy(false);
    }
  };

  const assign = async (empId: number | null) => {
    setBusy(true);
    try { await api.patch(`/tickets/${id}/`, { assigned_employee: empId }); await load(); }
    finally { setBusy(false); }
  };

  if (!ticket) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Loading…</Text></View>;

  const currentIdx     = Math.max(STAGES.indexOf(ticket.stage as any), 0);
  const isLastStage    = currentIdx === STAGES.length - 1;
  const isDeliveryStep = ticket.stage === 'ready_for_delivery';
  const hasPhoto       = !!ticket.has_garment_photo || !!pendingPhoto;

  const photoPreviewUri =
    pendingPhoto       ? `data:image/jpeg;base64,${pendingPhoto}` :
    ticket.garment_photo ? `data:image/jpeg;base64,${ticket.garment_photo}` :
    null;

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

      {/* ── garment photo ── */}
      {(isDeliveryStep || ticket.has_garment_photo) && (
        <>
          <Text style={styles.section}>Garment photo</Text>
          <Card>
            {photoPreviewUri ? (
              <Image source={{ uri: photoPreviewUri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="camera-plus-outline" size={36} color={COLORS.textLight} />
                <Text style={styles.photoHint}>
                  Capture a photo of the finished garment to enable delivery.
                </Text>
              </View>
            )}

            {isDeliveryStep && (
              <View style={styles.photoActions}>
                <Pressable onPress={() => pickFrom('camera')} style={[styles.photoBtn, styles.photoBtnPrimary]}>
                  <MaterialCommunityIcons name="camera-outline" size={18} color="#fff" />
                  <Text style={styles.photoBtnText}>Take photo</Text>
                </Pressable>
                <Pressable onPress={() => pickFrom('library')} style={[styles.photoBtn, styles.photoBtnSecondary]}>
                  <MaterialCommunityIcons name="image-outline" size={18} color={COLORS.text} />
                  <Text style={[styles.photoBtnText, { color: COLORS.text }]}>From library</Text>
                </Pressable>
              </View>
            )}

            {pendingPhoto && (
              <View style={{ marginTop: 12 }}>
                <PrimaryButton title="Save photo" onPress={savePhoto} loading={busy} variant="secondary" />
              </View>
            )}
          </Card>
        </>
      )}

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
          <View>
            <PrimaryButton
              title={isDeliveryStep ? 'Mark as delivered' : 'Advance to next stage'}
              onPress={advance}
              loading={busy}
              disabled={isDeliveryStep && !hasPhoto}
            />
            {isDeliveryStep && !hasPhoto && (
              <Text style={styles.gateHint}>Capture a garment photo first.</Text>
            )}
          </View>
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

  photo: { width: '100%', height: 220, borderRadius: 14, backgroundColor: COLORS.background },
  photoPlaceholder: {
    height: 160, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed',
    borderColor: COLORS.border, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8,
  },
  photoHint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 14, borderWidth: 1,
  },
  photoBtnPrimary:   { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
  photoBtnSecondary: { backgroundColor: '#fff',      borderColor: COLORS.border },
  photoBtnText:      { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },

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
  gateHint: { color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },

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
