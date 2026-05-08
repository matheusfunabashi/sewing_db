import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Badge         from '../components/Badge';
import Card          from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { Order, api } from '../lib/api';
import { COLORS } from '../lib/theme';

export default function OrderDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy]   = useState(false);

  const load = useCallback(async () => {
    setOrder(await api.get<Order>(`/orders/${id}/`));
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const generateTickets = async () => {
    if (!order) return;
    setBusy(true);
    try {
      for (const item of order.items) {
        if (item.tickets.length > 0) continue;
        await api.post('/tickets/', {
          order_item: item.id,
          code: `TCK-${order.id}-${item.id}-${Date.now().toString().slice(-4)}`,
          status: 'open',
          stage: 'order_received',
          priority: order.priority,
          deadline: order.due_date,
        });
      }
      await api.post(`/orders/${order.id}/mark_in_production/`);
      await load();
      Alert.alert('Done', 'Tickets created. Order moved to in production.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not create tickets');
    } finally {
      setBusy(false);
    }
  };

  const markCompleted = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await api.post(`/orders/${order.id}/mark_completed/`);
      await load();
    } finally { setBusy(false); }
  };

  const deliver = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await api.post(`/orders/${order.id}/deliver/`, {
        delivery_date: new Date().toISOString().slice(0, 10),
      });
      await load();
      Alert.alert('Delivered', 'Order marked as delivered.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not deliver');
    } finally { setBusy(false); }
  };

  if (!order) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Loading…</Text></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
    >
      {/* ── header card ── */}
      <Card style={{ backgroundColor: COLORS.cardWarm, borderColor: COLORS.borderWarm }}>
        <View style={styles.row}>
          <Text style={styles.title}>Order #{order.id}</Text>
          <Badge value={order.status} />
        </View>
        <Text style={styles.customer}>{order.customer_name}</Text>
        <View style={[styles.row, { marginTop: 10 }]}>
          <Text style={styles.meta}>Ordered {order.order_date}</Text>
          <Text style={styles.meta}>Due {order.due_date ?? '—'}</Text>
        </View>
        <View style={[styles.row, { marginTop: 6 }]}>
          <Badge value={order.priority} kind="priority" small />
          <Text style={styles.meta}>{order.items.length} garment{order.items.length !== 1 ? 's' : ''}</Text>
        </View>
        {order.notes ? <Text style={[styles.meta, { marginTop: 8, fontStyle: 'italic' }]}>"{order.notes}"</Text> : null}
      </Card>

      {/* ── items & tickets ── */}
      <Text style={styles.section}>Garments & tickets</Text>
      {order.items.map(it => (
        <Card key={it.id}>
          <View style={styles.row}>
            <Text style={styles.itemTitle}>{it.garment_type}</Text>
            <Text style={styles.meta}>×{it.quantity}</Text>
          </View>
          {it.description ? <Text style={styles.meta}>{it.description}</Text> : null}

          {it.measurements.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sub}>Measurements</Text>
              {it.measurements.map(m => (
                <Text key={m.id} style={styles.measure}>· {m.label}: {m.value_cm} cm</Text>
              ))}
            </View>
          )}

          <View style={{ marginTop: 10 }}>
            <Text style={styles.sub}>Tickets</Text>
            {it.tickets.length === 0 && <Text style={styles.meta}>None yet.</Text>}
            {it.tickets.map(t => (
              <View key={t.id} style={styles.ticketRow}>
                <Text
                  onPress={() => navigation.navigate('Tickets', { screen: 'TicketDetail', params: { id: t.id } })}
                  style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}
                >
                  {t.code}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Badge value={t.stage}  small />
                  <Badge value={t.status} small />
                </View>
              </View>
            ))}
          </View>
        </Card>
      ))}

      {order.delivery && (
        <Card>
          <Text style={styles.section}>Delivery</Text>
          <Text style={styles.meta}>Delivered: {order.delivery.delivered ? 'Yes' : 'No'}</Text>
          {order.delivery.delivery_date && <Text style={styles.meta}>Date: {order.delivery.delivery_date}</Text>}
        </Card>
      )}

      <View style={{ height: 8 }} />

      {order.status === 'pending' && (
        <PrimaryButton
          title={busy ? 'Working…' : 'Generate tickets & start production'}
          onPress={generateTickets}
          loading={busy}
        />
      )}
      {order.status === 'in_production' && (
        <PrimaryButton title="Mark order completed" onPress={markCompleted} loading={busy} />
      )}
      {(order.status === 'completed' || order.status === 'in_production') && (
        <View style={{ marginTop: 10 }}>
          <PrimaryButton
            title="Mark delivered"
            variant="secondary"
            onPress={deliver}
            loading={busy}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:      { fontSize: 20, fontWeight: '900', color: COLORS.text, fontStyle: 'italic' },
  customer:   { fontSize: 15, color: COLORS.text, marginTop: 4, fontWeight: '600' },
  meta:       { fontSize: 13, color: COLORS.textMuted },
  section:    { fontSize: 11, fontWeight: '800', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 10, marginBottom: 8 },
  sub:        { fontSize: 10, fontWeight: '800', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  itemTitle:  { fontSize: 16, fontWeight: '800', color: COLORS.text },
  measure:    { color: COLORS.text, fontSize: 14, marginTop: 2 },
  ticketRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
});
