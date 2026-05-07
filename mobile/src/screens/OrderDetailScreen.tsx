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

import Badge from '../components/Badge';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { Order, api } from '../lib/api';
import { COLORS } from '../lib/theme';

export default function OrderDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const o = await api.get<Order>(`/orders/${id}/`);
    setOrder(o);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const generateTickets = async () => {
    if (!order) return;
    setBusy(true);
    try {
      for (const item of order.items) {
        if (item.tickets.length > 0) continue;
        const code = `TCK-${order.id}-${item.id}-${Date.now().toString().slice(-4)}`;
        await api.post('/tickets/', {
          order_item: item.id,
          code,
          status: 'open',
          stage: 'order_received',
          priority: order.priority,
          deadline: order.due_date,
        });
      }
      await api.post(`/orders/${order.id}/mark_in_production/`);
      await load();
      Alert.alert('Workflow 2', 'Tickets created. Order moved to "in production".');
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
      Alert.alert('Workflow 3', 'Order marked as delivered.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not deliver');
    } finally { setBusy(false); }
  };

  if (!order) {
    return <View style={styles.center}><Text>Loading...</Text></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} />}
    >
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>Order #{order.id}</Text>
          <Badge value={order.status} />
        </View>
        <Text style={styles.customer}>{order.customer_name}</Text>
        <View style={[styles.rowBetween, { marginTop: 8 }]}>
          <Text style={styles.meta}>Order date: {order.order_date}</Text>
          <Text style={styles.meta}>Due: {order.due_date ?? '-'}</Text>
        </View>
        <View style={[styles.rowBetween, { marginTop: 4 }]}>
          <Badge value={order.priority} kind="priority" small />
          <Text style={styles.meta}>{order.items.length} item(s)</Text>
        </View>
        {order.notes ? <Text style={[styles.meta, { marginTop: 6 }]}>"{order.notes}"</Text> : null}
      </Card>

      <Text style={styles.section}>Items & tickets</Text>
      {order.items.map((it) => (
        <Card key={it.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>{it.garment_type}</Text>
            <Text style={styles.meta}>x{it.quantity}</Text>
          </View>
          {it.description ? <Text style={styles.meta}>{it.description}</Text> : null}

          {it.measurements.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.subsection}>Measurements</Text>
              {it.measurements.map((m) => (
                <Text key={m.id} style={styles.measure}>• {m.label}: {m.value_cm} cm</Text>
              ))}
            </View>
          )}

          <View style={{ marginTop: 8 }}>
            <Text style={styles.subsection}>Tickets</Text>
            {it.tickets.length === 0 && (
              <Text style={styles.meta}>No tickets yet.</Text>
            )}
            {it.tickets.map((t) => (
              <View
                key={t.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                }}
              >
                <Text
                  onPress={() => navigation.navigate('Tickets', { screen: 'TicketDetail', params: { id: t.id } })}
                  style={{ color: COLORS.primary, fontWeight: '700' }}
                >
                  {t.code}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
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
          {order.delivery.delivery_date && (
            <Text style={styles.meta}>Date: {order.delivery.delivery_date}</Text>
          )}
        </Card>
      )}

      <View style={{ height: 8 }} />

      {order.status === 'pending' && (
        <PrimaryButton
          title={busy ? 'Working...' : 'Workflow 2 - Generate tickets & start production'}
          onPress={generateTickets}
          loading={busy}
        />
      )}
      {order.status === 'in_production' && (
        <PrimaryButton
          title="Mark order completed"
          onPress={markCompleted}
          loading={busy}
        />
      )}
      {(order.status === 'completed' || order.status === 'in_production') && (
        <View style={{ marginTop: 8 }}>
          <PrimaryButton
            title="Workflow 3 - Mark delivered"
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
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:    { fontSize: 20, fontWeight: '900', color: COLORS.text },
  customer: { fontSize: 14, color: COLORS.text, marginTop: 4 },
  meta:     { fontSize: 13, color: COLORS.textMuted },
  section:  { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 8 },
  subsection: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  measure:   { color: COLORS.text, fontSize: 14 },
});
