import { MessageSquare } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/surface';
import { C, F, R, type } from '@/constants/theme';
import { ago, money } from '@/lib/format';
import type { Order } from '@/lib/types';
import { STATUS_FLOW, useOrders } from '@/providers/orders';

/** Short human order number from the uuid, e.g. #A3F1. */
export function orderNo(o: Order) {
  return `#${o.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

export function OrderCard({ order, fresh, onOpen }: { order: Order; fresh: boolean; onOpen: () => void }) {
  const { advance } = useOrders();
  const [busy, setBusy] = useState(false);
  const flow = STATUS_FLOW[order.status];
  const count = order.items.reduce((n, i) => n + i.qty, 0);
  const shown = order.items.slice(0, 3);

  async function next() {
    if (!flow.next) return;
    setBusy(true);
    try {
      await advance(order, flow.next);
    } catch (e) {
      Alert.alert('Couldn’t update the order', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable onPress={onOpen} style={[styles.card, fresh && styles.fresh]} accessibilityRole="button" accessibilityLabel={`Order ${order.table_name ?? 'takeaway'}`}>
      <View style={styles.top}>
        <View style={{ gap: 4, flex: 1 }}>
          <View style={styles.idRow}>
            <Text style={styles.id}>{orderNo(order)}</Text>
            {fresh && <Badge label="New" tone="new" />}
          </View>
          <Text style={styles.table}>{order.table_name ?? 'Takeaway'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.time, fresh && { color: C.accent }]}>{ago(order.created_at)}</Text>
          <Text style={type.caption}>
            {count} {count === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {shown.map((i) => (
          <View key={`${i.id}-${i.name}`} style={styles.line}>
            <Text style={styles.qty}>{i.qty}×</Text>
            <Text style={styles.item} numberOfLines={1}>
              {i.name}
            </Text>
          </View>
        ))}
        {order.items.length > shown.length && <Text style={type.caption}>+ {order.items.length - shown.length} more</Text>}
      </View>

      {(order.note || order.customer_name) && (
        <View style={styles.note}>
          <MessageSquare size={18} color={C.pending} />
          <Text style={styles.noteText} numberOfLines={2}>
            {order.note || `For ${order.customer_name}`}
          </Text>
        </View>
      )}

      <View style={styles.bottom}>
        <View style={{ gap: 2 }}>
          <Text style={type.label}>Total</Text>
          <Text style={[type.number, { fontSize: 22 }]}>{money(order.total, order.currency)}</Text>
        </View>
        {flow.action && <Button title={flow.action} onPress={next} loading={busy} style={{ minWidth: 150 }} variant={order.status === 'pending' ? 'primary' : 'outline'} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.card + 4, borderWidth: 1, borderColor: C.border, padding: 20, gap: 16 },
  fresh: { borderColor: C.accent, borderWidth: 1.5, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  top: { flexDirection: 'row', gap: 12 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  id: { fontFamily: F.monoBold, fontSize: 18, color: C.text },
  table: { fontFamily: F.display, fontSize: 24, color: C.text },
  time: { fontFamily: F.mono, fontSize: 14, color: C.muted },
  line: { flexDirection: 'row', gap: 16 },
  qty: { width: 30, fontFamily: F.mono, fontSize: 16, color: C.accent },
  item: { flex: 1, fontFamily: F.sans, fontSize: 17, color: C.text },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noteText: { flex: 1, fontFamily: F.sans, fontSize: 16, color: C.pending },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 16 },
});
