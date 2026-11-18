import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CalendarCheck, MessageCircle, Phone } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackHeader, Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, Chip, Segmented, Toggle } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, type } from '@/constants/theme';
import { APPT_COLOR, APPT_STATUS, bookingEnabled, formatDay, formatTime, isLive } from '@/lib/booking';
import { SITE_URL } from '@/lib/config';
import { fetchAppointments, fetchStaff, setAppointmentStatus, setStaffActive } from '@/lib/data';
import { dayKey } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentStatus, Staff } from '@/lib/types';
import { useCurrentBusiness } from '@/providers/business';

type Tab = 'today' | 'upcoming' | 'staff';

/** Poll as a safety net in case realtime drops. */
const POLL_MS = 30_000;

export default function AppointmentsScreen() {
  const b = useCurrentBusiness();
  const [tab, setTab] = useState<Tab>('today');
  const [list, setList] = useState<Appointment[] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = dayKey(0);

  const load = useCallback(async () => {
    try {
      const [appts, people] = await Promise.all([fetchAppointments(b.id, today), fetchStaff(b.id)]);
      setList(appts);
      setStaff(people);
    } catch (e) {
      setList((l) => l ?? []);
      Alert.alert('Couldn’t load appointments', e instanceof Error ? e.message : 'Try again');
    }
  }, [b.id, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live: refetch when any booking for this business changes.
  useEffect(() => {
    const channel = supabase
      .channel(`owner-appointments-${b.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `business_id=eq.${b.id}` }, () => void load())
      .subscribe();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [b.id, load]);

  const appts = list ?? [];
  const filtered = staffFilter ? appts.filter((a) => a.staff_id === staffFilter) : appts;
  const todayList = filtered.filter((a) => a.appt_date === today);
  const upcomingList = filtered.filter((a) => a.appt_date > today && isLive(a.status));
  const groups = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of upcomingList) map.set(a.appt_date, [...(map.get(a.appt_date) ?? []), a]);
    return [...map.entries()];
  }, [upcomingList]);

  async function change(a: Appointment, status: AppointmentStatus) {
    const before = a.status;
    setList((l) => l && l.map((x) => (x.id === a.id ? { ...x, status } : x)));
    try {
      await setAppointmentStatus(a, status);
    } catch (e) {
      setList((l) => l && l.map((x) => (x.id === a.id ? { ...x, status: before } : x)));
      Alert.alert('Couldn’t update the booking', e instanceof Error ? e.message : 'Try again');
    }
  }

  function actions(a: Appointment) {
    const options: { label: string; run: () => void; destructive?: boolean }[] = [];
    if (a.status === 'pending') options.push({ label: 'Confirm', run: () => void change(a, 'confirmed') });
    if (isLive(a.status)) {
      options.push({ label: 'Mark done', run: () => void change(a, 'completed') });
      options.push({ label: 'No-show', run: () => void change(a, 'no_show') });
      options.push({
        label: 'Cancel booking',
        destructive: true,
        run: () =>
          Alert.alert(`Cancel ${a.customer_name}’s booking?`, 'The time becomes free for others to book.', [
            { text: 'Keep', style: 'cancel' },
            { text: 'Cancel booking', style: 'destructive', onPress: () => void change(a, 'cancelled') },
          ]),
      });
    } else {
      options.push({ label: 'Undo (back to confirmed)', run: () => void change(a, 'confirmed') });
    }
    const title = `${a.customer_name} · ${formatTime(a.start_time)}`;
    if (Platform.OS === 'ios') {
      const labels = [...options.map((o) => o.label), 'Close'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex: options.findIndex((o) => o.destructive),
          userInterfaceStyle: 'dark',
        },
        (i) => options[i]?.run(),
      );
    } else {
      Alert.alert(title, undefined, [...options.map((o) => ({ text: o.label, onPress: o.run, style: o.destructive ? ('destructive' as const) : undefined })), { text: 'Close', style: 'cancel' }]);
    }
  }

  async function toggleStaff(s: Staff, on: boolean) {
    setStaff((list) => list.map((x) => (x.id === s.id ? { ...x, is_active: on } : x)));
    try {
      await setStaffActive(s.id, on);
    } catch (e) {
      setStaff((list) => list.map((x) => (x.id === s.id ? { ...x, is_active: !on } : x)));
      Alert.alert('Couldn’t update', e instanceof Error ? e.message : 'Try again');
    }
  }

  const liveToday = todayList.filter((a) => isLive(a.status)).length;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}>
      <BackHeader
        title="Appointments"
        right={
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        }
      />

      {!bookingEnabled(b) && (
        <Card style={{ borderColor: C.pending }}>
          <Text style={[type.body, { color: C.pending }]}>Online booking is off, so customers can’t book. Turn it on from the web dashboard.</Text>
        </Card>
      )}

      <Segmented
        accent
        options={[
          { key: 'today', label: 'Today', count: liveToday },
          { key: 'upcoming', label: 'Upcoming', count: upcomingList.length },
          { key: 'staff', label: 'Staff', count: staff.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab !== 'staff' && staff.length > 1 && (
        <View style={styles.chips}>
          <Chip label="All" active={!staffFilter} onPress={() => setStaffFilter(null)} />
          {staff.map((s) => (
            <Chip key={s.id} label={s.name.split(' ')[0]} active={staffFilter === s.id} onPress={() => setStaffFilter(s.id)} />
          ))}
        </View>
      )}

      {list === null ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : tab === 'today' ? (
        todayList.length === 0 ? (
          <Empty text="No bookings today." />
        ) : (
          <View style={{ gap: 12 }}>
            {todayList.map((a) => (
              <ApptCard key={a.id} a={a} staff={staff} onPress={() => actions(a)} />
            ))}
          </View>
        )
      ) : tab === 'upcoming' ? (
        groups.length === 0 ? (
          <Empty text="No upcoming bookings." />
        ) : (
          groups.map(([date, rows]) => (
            <View key={date} style={{ gap: 12 }}>
              <Text style={type.label}>
                {formatDay(date)} · {rows.length}
              </Text>
              {rows.map((a) => (
                <ApptCard key={a.id} a={a} staff={staff} onPress={() => actions(a)} />
              ))}
            </View>
          ))
        )
      ) : (
        <View style={{ gap: 12 }}>
          {staff.length === 0 ? (
            <Empty text="No staff yet. Add them with photos and working hours on the web." />
          ) : (
            <Card style={{ paddingVertical: 4 }}>
              {staff.map((s, i) => (
                <View key={s.id} style={[styles.staffRow, i < staff.length - 1 && styles.divider]}>
                  <Avatar name={s.name} uri={s.photo_url} size={48} round color={C.border} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={type.caption} numberOfLines={1}>
                      {s.is_active ? s.specialization || 'Taking bookings' : 'Hidden · on leave'}
                    </Text>
                  </View>
                  <Toggle value={s.is_active} onChange={(v) => void toggleStaff(s, v)} label={`${s.name} taking bookings`} />
                </View>
              ))}
            </Card>
          )}
          <Text style={type.caption}>Switch someone off to hide them from the booking page, e.g. when they’re on leave.</Text>
          <Button title="Edit staff & hours on the web" variant="outline" onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/linktree/admin/${b.id}/appointments`)} />
        </View>
      )}
    </Screen>
  );
}

function ApptCard({ a, staff, onPress }: { a: Appointment; staff: Staff[]; onPress: () => void }) {
  const person = staff.find((s) => s.id === a.staff_id);
  const meta = APPT_STATUS[a.status];
  const dim = !isLive(a.status);
  const digits = a.customer_phone.replace(/\D/g, '');
  return (
    <Card onPress={onPress} highlight={a.status === 'pending'} style={[{ gap: 12 }, dim && { opacity: 0.55 }]}>
      <View style={styles.cardTop}>
        <View style={[styles.timeBar, { backgroundColor: APPT_COLOR[a.status] }]} />
        <View style={{ width: 82 }}>
          <Text style={styles.time}>{formatTime(a.start_time)}</Text>
          <Text style={type.caption}>to {formatTime(a.end_time)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name} numberOfLines={1}>
            {a.customer_name}
          </Text>
          <Text style={type.caption} numberOfLines={1}>
            with {person?.name ?? a.staff_name ?? 'staff'}
          </Text>
        </View>
        <Badge label={meta.label} tone={meta.tone} />
      </View>
      {!!a.note && <Text style={[type.body, { color: C.muted }]}>{a.note}</Text>}
      <View style={styles.contact}>
        <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${a.customer_phone.replace(/[^\d+]/g, '')}`)} accessibilityRole="button" accessibilityLabel={`Call ${a.customer_name}`}>
          <Phone size={16} color={C.text} />
          <Text style={styles.contactText}>{a.customer_phone}</Text>
        </Pressable>
        <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(`https://wa.me/${digits}`)} accessibilityRole="button" accessibilityLabel={`WhatsApp ${a.customer_name}`}>
          <MessageCircle size={16} color="#25D366" />
          <Text style={styles.contactText}>WhatsApp</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.iconTile}>
        <CalendarCheck size={34} color={C.accent} />
      </View>
      <T style={{ color: C.muted, textAlign: 'center', fontSize: 17, lineHeight: 25 }}>{text}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  live: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  liveText: { fontFamily: F.mono, fontSize: 15, letterSpacing: 2, color: C.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  time: { fontFamily: F.monoBold, fontSize: 17, color: C.text },
  name: { fontFamily: F.sansSemi, fontSize: 17, color: C.text },
  contact: { flexDirection: 'row', gap: 10 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.raised },
  contactText: { fontFamily: F.sansSemi, fontSize: 14, color: C.text },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  empty: { alignItems: 'center', gap: 16, paddingTop: 48, paddingHorizontal: 20 },
  iconTile: { width: 92, height: 92, borderRadius: 26, backgroundColor: C.raised, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
