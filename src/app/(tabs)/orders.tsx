import { router } from 'expo-router';
import { ReceiptText } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { OrderCard } from '@/components/order-card';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F } from '@/constants/theme';
import { dayKey, dayOf } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';
import { useOrders } from '@/providers/orders';

const TABS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'New' },
  { key: 'confirmed', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Done' },
];

export default function Orders() {
  const { orders, loading, unseen, markSeen, refresh } = useOrders();
  const [tab, setTab] = useState<OrderStatus>('pending');
  const [refreshing, setRefreshing] = useState(false);

  // "Done" only shows today's, so the list doesn't grow forever.
  const today = dayKey(0);
  const visible = orders.filter((o) => o.status !== 'completed' || dayOf(o.created_at) === today);
  const count = (s: OrderStatus) => visible.filter((o) => o.status === s).length;
  const list = visible.filter((o) => o.status === tab).sort((a, z) => (tab === 'completed' ? z.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(z.created_at)));
  // Newest first in New, so a fresh ticket lands on top like the design.
  if (tab === 'pending') list.reverse();

  return (
    <Screen
      tabs
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
      }}>
      <View style={styles.head}>
        <T v="title" style={{ fontSize: 34, lineHeight: 40 }}>
          Orders
        </T>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <Segmented accent options={TABS.map((t) => ({ ...t, count: count(t.key) }))} value={tab} onChange={setTab} />

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : list.length === 0 ? (
        <Empty pending={tab === 'pending'} />
      ) : (
        <View style={{ gap: 16 }}>
          {list.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              fresh={unseen.has(o.id)}
              onOpen={() => {
                markSeen(o.id);
                router.push({ pathname: '/order/[id]', params: { id: o.id } });
              }}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function Empty({ pending }: { pending: boolean }) {
  return (
    <View style={styles.empty}>
      <View style={styles.ring}>
        <View style={styles.iconTile}>
          <ReceiptText size={34} color={C.accent} />
        </View>
      </View>
      <T v="section" style={{ fontSize: 26, lineHeight: 30, textAlign: 'center' }}>
        {pending ? 'No orders yet.' : 'Nothing here.'}
      </T>
      <T style={{ color: C.muted, textAlign: 'center', fontSize: 17, lineHeight: 25 }}>
        {pending ? 'They’ll appear here live, with a sound and a buzz, the moment a table taps to order.' : 'Orders move here as you work through them.'}
      </T>
      {pending && <Button title="Check table QR codes" variant="outline" onPress={() => router.push({ pathname: '/menu', params: { tab: 'tables' } })} style={{ marginTop: 8 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  liveText: { fontFamily: F.mono, fontSize: 15, letterSpacing: 2, color: C.accent },
  empty: { alignItems: 'center', gap: 14, paddingTop: 60, paddingHorizontal: 20 },
  ring: { width: 180, height: 180, borderRadius: 90, borderWidth: 2, borderColor: '#4B5A12', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  iconTile: { width: 92, height: 92, borderRadius: 26, backgroundColor: C.raised, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
