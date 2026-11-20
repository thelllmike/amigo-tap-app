import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { orderNo } from '@/components/order-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, R, S, type } from '@/constants/theme';
import { ago, clock, money } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';
import { STATUS_FLOW, useOrders } from '@/providers/orders';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Placed via table stand (NFC tap)' },
  { status: 'confirmed', label: 'Accepted' },
  { status: 'ready', label: 'Ready' },
  { status: 'completed', label: 'Completed' },
];

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, advance } = useOrders();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <View style={{ padding: S.sheet, paddingTop: 40 }}>
        <T>This order is no longer here.</T>
      </View>
    );
  }

  const flow = STATUS_FLOW[order.status];
  const reached = STEPS.findIndex((s) => s.status === order.status);

  async function next() {
    if (!order || !flow.next) return;
    setBusy(true);
    try {
      await advance(order, flow.next);
      if (flow.next === 'completed') router.back();
    } catch (e) {
      Alert.alert('Couldn’t update the order', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.root}>
        <View style={styles.head}>
          <View style={{ gap: 6, flex: 1 }}>
            <Text style={styles.meta}>
              {orderNo(order)} · {clock(order.created_at)}
            </Text>
            <T v="title" style={{ fontSize: 34, lineHeight: 40 }}>
              {order.table_name ?? 'Takeaway'}
            </T>
          </View>
          <Badge
            label={order.status === 'pending' ? `Pending · ${ago(order.created_at)}` : flow.label}
            tone={order.status === 'pending' ? 'pending' : order.status === 'confirmed' ? 'preparing' : order.status === 'ready' ? 'ready' : 'done'}
          />
        </View>

        <View>
          {order.items.map((i) => (
            <View key={`${i.id}-${i.name}`} style={styles.line}>
              <Text style={styles.qty}>{i.qty}×</Text>
              <Text style={styles.item}>{i.name}</Text>
              <Text style={styles.price}>{(i.price * i.qty).toLocaleString('en-US')}</Text>
            </View>
          ))}
          <View style={styles.total}>
            <Text style={type.label}>Total</Text>
            <Text style={[type.number, { fontSize: 28 }]}>{money(order.total, order.currency)}</Text>
          </View>
        </View>

        {(order.note || order.customer_name) && (
          <View style={styles.note}>
            <Text style={[type.label, { color: C.pending }]}>{order.note ? 'Note' : 'Customer'}</Text>
            <Text style={[type.body, { fontSize: 17 }]}>{order.note || order.customer_name}</Text>
          </View>
        )}

        <View style={{ gap: 0 }}>
          {STEPS.map((s, i) => {
            const done = i <= reached;
            return (
              <View key={s.status} style={styles.step}>
                <View style={styles.rail}>
                  <View style={[styles.dot, done ? styles.dotOn : styles.dotOff]} />
                  {i < STEPS.length - 1 && <View style={[styles.connector, i < reached && { backgroundColor: C.accent }]} />}
                </View>
                <Text style={[styles.stepText, !done && { color: C.muted }]}>{s.label}</Text>
                {i === 0 && <Text style={styles.stepTime}>{clock(order.created_at)}</Text>}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {flow.action && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button title={order.status === 'pending' ? 'Accept order' : flow.action} onPress={next} loading={busy} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: S.sheet, paddingTop: 32, gap: 24 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  meta: { fontFamily: F.mono, fontSize: 15, color: C.muted },
  line: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  qty: { width: 30, fontFamily: F.mono, fontSize: 17, color: C.accent },
  item: { flex: 1, fontFamily: F.sans, fontSize: 18, color: C.text },
  price: { fontFamily: F.mono, fontSize: 17, color: C.text },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20 },
  note: { gap: 8, padding: 18, borderRadius: R.input + 2, backgroundColor: '#2A2418', borderWidth: 1, borderColor: '#5A4A28' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, minHeight: 52 },
  rail: { width: 20, alignItems: 'center' },
  dot: { width: 18, height: 18, borderRadius: 9, marginTop: 3 },
  dotOn: { backgroundColor: C.accent },
  dotOff: { borderWidth: 2, borderColor: C.faint },
  connector: { width: 2, flex: 1, backgroundColor: C.faint, marginVertical: 2 },
  stepText: { flex: 1, fontFamily: F.sans, fontSize: 17, color: C.text },
  stepTime: { fontFamily: F.mono, fontSize: 14, color: C.muted, marginTop: 2 },
  footer: { paddingHorizontal: S.sheet, paddingTop: 12, backgroundColor: C.raised },
});
