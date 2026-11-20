import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CalendarCheck, ChevronDown, Link as LinkIcon, NotebookText, Pencil, QrCode, Share as ShareIcon, Smartphone, type LucideIcon } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Bars } from '@/components/charts';
import { Screen } from '@/components/screen';
import { IconButton } from '@/components/ui/button';
import { Avatar, Card, StatTile } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, R, type } from '@/constants/theme';
import { bookingEnabled, formatTime, isLive } from '@/lib/booking';
import { clicksOn, fetchAppointments, fetchLinkStats, series, viewsOn } from '@/lib/data';
import { ago, compact, dayKey, dayOf, delta } from '@/lib/format';
import { KIND_LABEL, businessKind, displayUrl, isRestaurant, pageUrl } from '@/lib/links';
import type { Appointment, LinkStat } from '@/lib/types';
import { useCurrentBusiness } from '@/providers/business';
import { useOrders } from '@/providers/orders';

export default function Home() {
  const b = useCurrentBusiness();
  const restaurant = isRestaurant(b);
  const { orders, refresh: refreshOrders } = useOrders();
  const [stats, setStats] = useState<LinkStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const booking = bookingEnabled(b);
  const [appts, setAppts] = useState<Appointment[]>([]);

  const load = useCallback(async () => {
    const [linkStats, bookings] = await Promise.all([
      fetchLinkStats(b.id, 14),
      booking ? fetchAppointments(b.id, dayKey(0)).catch(() => []) : Promise.resolve([]),
    ]);
    setStats(linkStats);
    setAppts(bookings);
  }, [b.id, booking]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const today = dayKey(0);
  const yesterday = dayKey(1);
  const orderStats = useMemo(() => {
    const on = (key: string) => orders.filter((o) => dayOf(o.created_at) === key);
    const t = on(today);
    const y = on(yesterday);
    const sum = (list: typeof orders) => list.reduce((n, o) => n + Number(o.total || 0), 0);
    return { count: t.length, countY: y.length, revenue: sum(t), revenueY: sum(y) };
  }, [orders, today, yesterday]);

  const pending = orders.filter((o) => o.status === 'pending').sort((a, z) => a.created_at.localeCompare(z.created_at));
  const oldest = pending[0];
  const week = series(stats, 7, (s) => s.link_id === null);
  const views = viewsOn(stats, 0);
  const clicks = clicksOn(stats, 0);

  async function refresh() {
    setRefreshing(true);
    await Promise.all([load(), refreshOrders()]);
    setRefreshing(false);
  }

  const url = pageUrl(b.slug);

  return (
    <Screen tabs refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <Pressable style={styles.switcher} onPress={() => router.push('/switch-business')} accessibilityRole="button" accessibilityLabel={`${b.name}. Switch business`}>
          <Avatar name={b.name} color={b.theme_color} uri={b.avatar_url} size={56} />
          <View style={{ flexShrink: 1 }}>
            <Text style={type.label}>{KIND_LABEL[businessKind(b)]}</Text>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {b.name}
              </Text>
              <ChevronDown size={20} color={C.text} />
            </View>
          </View>
        </Pressable>
        <IconButton icon={ShareIcon} label="Share page link" size={56} onPress={() => Share.share({ message: url, url })} />
      </View>

      <Pressable style={styles.live} onPress={() => WebBrowser.openBrowserAsync(url)} accessibilityRole="link">
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>View live page</Text>
        <Text style={styles.liveUrl} numberOfLines={1}>
          {displayUrl(url)} ↗
        </Text>
      </Pressable>

      <View style={{ gap: 12 }}>
        <View style={styles.sectionHead}>
          <T v="section">Today at a glance</T>
          <Text style={[type.label, { textTransform: 'none' }]}>vs yesterday</Text>
        </View>
        <View style={styles.grid}>
          <StatTile label="Page views" value={compact(views)} delta={delta(views, viewsOn(stats, 1))} />
          <StatTile label="Link clicks" value={compact(clicks)} delta={delta(clicks, clicksOn(stats, 1))} />
        </View>
        {restaurant && (
          <View style={styles.grid}>
            <StatTile label="Orders" value={String(orderStats.count)} delta={delta(orderStats.count, orderStats.countY)} />
            <StatTile label="Revenue" unit="LKR" value={compact(orderStats.revenue)} delta={delta(orderStats.revenue, orderStats.revenueY)} />
          </View>
        )}
      </View>

      {restaurant && pending.length > 0 && oldest && (
        <View style={styles.pending}>
          <View style={styles.pendingCount}>
            <Text style={styles.pendingNum}>{pending.length}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingTitle}>Pending orders</Text>
            <Text style={styles.pendingSub}>
              Oldest waiting {ago(oldest.created_at)}{oldest.table_name ? ` · ${oldest.table_name}` : ''}
            </Text>
          </View>
          <Pressable style={styles.pendingBtn} onPress={() => router.navigate('/orders')} accessibilityRole="button">
            <Text style={styles.pendingBtnText}>Go to orders</Text>
          </Pressable>
        </View>
      )}

      {booking && <BookingsToday appts={appts} today={today} />}

      <Card style={{ gap: 18 }}>
        <View style={styles.sectionHead}>
          <Text style={styles.cardTitle}>Page views · 7 days</Text>
          <Text style={[type.number, { fontSize: 15 }]}>{week.reduce((n, p) => n + p.value, 0).toLocaleString('en-US')}</Text>
        </View>
        <Bars points={week} labels="days" />
      </Card>

      <View style={{ gap: 12 }}>
        <T v="section">Quick actions</T>
        <View style={styles.actions}>
          <Action icon={Pencil} label="Edit profile" onPress={() => router.push('/edit-profile')} />
          {restaurant ? (
            <>
              <Action icon={LinkIcon} label="Links" onPress={() => router.push('/manage-links')} />
              <Action icon={NotebookText} label="Menu" onPress={() => router.push('/menu')} />
            </>
          ) : (
            <Action icon={LinkIcon} label="Links" onPress={() => router.navigate('/links')} />
          )}
          <Action icon={QrCode} label="QR & NFC" onPress={() => router.navigate('/profile')} />
          {!restaurant && <Action icon={Smartphone} label="Tap to share" onPress={() => router.push('/tap-share')} />}
        </View>
      </View>
    </Screen>
  );
}

/** Today's bookings at a glance, with the next one up. */
function BookingsToday({ appts, today }: { appts: Appointment[]; today: string }) {
  const todays = appts.filter((a) => a.appt_date === today && isLive(a.status));
  const fresh = appts.filter((a) => a.status === 'pending').length;
  const nowMin = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Colombo' }).format(new Date()).replace(':', ''));
  const next = todays.find((a) => Number(a.start_time.slice(0, 5).replace(':', '')) >= nowMin);
  return (
    <Pressable style={({ pressed }) => [styles.booking, pressed && { backgroundColor: C.raised }]} onPress={() => router.push('/appointments')} accessibilityRole="button">
      <View style={styles.bookingIcon}>
        <CalendarCheck size={26} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>
          {todays.length} booking{todays.length === 1 ? '' : 's'} today
        </Text>
        <Text style={type.caption} numberOfLines={1}>
          {next ? `Next ${formatTime(next.start_time)} · ${next.customer_name}${next.staff_name ? ` with ${next.staff_name}` : ''}` : 'No more bookings today'}
          {fresh > 0 ? ` · ${fresh} new` : ''}
        </Text>
      </View>
      <Text style={styles.bookingGo}>Open</Text>
    </Pressable>
  );
}

function Action({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.action, pressed && { backgroundColor: C.raised }]} onPress={onPress} accessibilityRole="button">
      <Icon size={24} color={C.text} />
      <Text style={styles.actionText} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  switcher: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: F.display, fontSize: 24, color: C.text, flexShrink: 1 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 60, paddingHorizontal: 18, borderRadius: R.input + 2, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CD964' },
  liveText: { fontFamily: F.sansSemi, fontSize: 17, color: C.text },
  liveUrl: { flex: 1, textAlign: 'right', fontFamily: F.mono, fontSize: 13, color: C.muted },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', gap: 12 },
  cardTitle: { fontFamily: F.sansSemi, fontSize: 18, color: C.text },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: R.card + 4, backgroundColor: C.accent },
  pendingCount: { width: 58, height: 58, borderRadius: 14, backgroundColor: C.onAccent, alignItems: 'center', justifyContent: 'center' },
  pendingNum: { fontFamily: F.monoBold, fontSize: 24, color: C.accent },
  pendingTitle: { fontFamily: F.sansBold, fontSize: 19, color: C.onAccent },
  pendingSub: { fontFamily: F.sans, fontSize: 15, color: '#2B3300' },
  pendingBtn: { backgroundColor: C.onAccent, borderRadius: 14, paddingHorizontal: 16, height: 54, justifyContent: 'center' },
  pendingBtnText: { fontFamily: F.sansBold, fontSize: 16, color: C.text },
  actions: { flexDirection: 'row', gap: 10 },
  booking: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: R.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  bookingIcon: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' },
  bookingGo: { fontFamily: F.sansBold, fontSize: 15, color: C.accent },
  action: { flex: 1, height: 92, borderRadius: R.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 6 },
  actionText: { fontFamily: F.sansSemi, fontSize: 14, color: C.text },
});
