import { router, useFocusEffect } from 'expo-router';
import { Bell, Car, ChevronRight, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackHeader, Screen } from '@/components/screen';
import { VehicleThumb } from '@/components/vehicle-thumb';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, Segmented } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, type } from '@/constants/theme';
import { REASON_LABEL, chatState, isMuted, timeAgo, vehicleDescription, vehicleTitle } from '@/lib/park';
import type { InboxRow } from '@/lib/types';
import { signOut, useAuth } from '@/providers/auth';
import { useBusinesses } from '@/providers/business';
import { usePark } from '@/providers/park';

type Tab = 'inbox' | 'vehicles';

/** Park Alert home: messages from people who scanned a sticker, and the owner's vehicles. */
export default function VehiclesScreen() {
  const { session, isSuperadmin } = useAuth();
  const { businesses } = useBusinesses();
  const { vehicles, inbox, unread, loading, push, refresh, enablePush } = usePark();
  const [tab, setTab] = useState<Tab>('inbox');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      void refresh();
    }, [refresh]),
  );

  // Opened straight after login by someone with no business: no screen to go back to.
  const isRoot = !router.canGoBack();
  const email = session?.user.email ?? '';

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        setNow(Date.now());
        await refresh();
        setRefreshing(false);
      }}
      // Only an AmigoTap admin adds vehicles.
      footer={isSuperadmin ? <Button title="Add a vehicle" icon={Plus} onPress={() => router.push('/vehicle/new')} flex /> : undefined}>
      {isRoot ? (
        <View style={styles.rootHeader}>
          <Text style={type.title}>Park Alert</Text>
          <Pressable accessibilityLabel="Account" onPress={() => router.push('/businesses')} hitSlop={8}>
            <Avatar name={email || 'Me'} size={44} round color={C.raised} />
          </Pressable>
        </View>
      ) : (
        <BackHeader title="Park Alert" />
      )}

      {!loading && vehicles.length > 0 && push !== 'granted' && push !== 'unavailable' && (
        <Card style={{ gap: 12, borderColor: C.pending }}>
          <View style={styles.row}>
            <Bell size={20} color={C.pending} />
            <Text style={[type.row, { flex: 1 }]}>Turn on notifications</Text>
          </View>
          <Text style={[type.body, { color: C.muted }]}>Without them you won’t know when someone needs you to move your vehicle.</Text>
          <Button
            title={push === 'denied' ? 'Open settings' : 'Allow notifications'}
            variant="outline"
            small
            onPress={() => (push === 'denied' ? Linking.openSettings() : void enablePush())}
          />
        </Card>
      )}

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : vehicles.length === 0 ? (
        <Intro />
      ) : (
        <>
          <Segmented
            accent
            options={[
              { key: 'inbox', label: 'Messages', count: unread || undefined },
              { key: 'vehicles', label: 'Vehicles', count: vehicles.length },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'inbox' ? (
            inbox.length === 0 ? (
              <View style={styles.empty}>
                <T style={{ color: C.muted, textAlign: 'center', fontSize: 16, lineHeight: 23 }}>
                  No messages yet. When someone scans your sticker, you’ll get a notification and the chat shows up here.
                </T>
              </View>
            ) : (
              <Card style={{ paddingVertical: 4 }}>
                {inbox.map((r, i) => (
                  <InboxItem key={r.chat.id} r={r} now={now} last={i === inbox.length - 1} />
                ))}
              </Card>
            )
          ) : (
            <View style={{ gap: 12 }}>
              {vehicles.map((v) => (
                <Card key={v.id} onPress={() => router.push(`/vehicle/${v.id}`)} style={styles.vehicleCard}>
                  <VehicleThumb v={v} size={56} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {vehicleTitle(v)}
                    </Text>
                    <Text style={styles.plate}>{v.plate}</Text>
                    {!!vehicleDescription(v) && (
                      <Text style={type.caption} numberOfLines={1}>
                        {vehicleDescription(v)}
                      </Text>
                    )}
                  </View>
                  {!v.is_active ? <Badge label="Off" /> : isMuted(v, now) ? <Badge label="Muted" tone="pending" /> : null}
                  <ChevronRight size={20} color={C.muted} />
                </Card>
              ))}
            </View>
          )}
        </>
      )}

      {isRoot && businesses.length === 0 && (
        <View style={{ gap: 8, marginTop: 8 }}>
          <Pressable onPress={() => router.push('/businesses')}>
            <Text style={[type.caption, { textAlign: 'center' }]}>Have a business page? Manage it here ›</Text>
          </Pressable>
          <Pressable onPress={() => void signOut()}>
            <Text style={[type.caption, { textAlign: 'center' }]}>Log out</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

function InboxItem({ r, now, last }: { r: InboxRow; now: number; last: boolean }) {
  const state = chatState(r.chat, now);
  return (
    <Pressable
      onPress={() => router.push(`/vehicle-chat/${r.chat.id}`)}
      style={({ pressed }) => [styles.inboxRow, !last && styles.divider, pressed && { opacity: 0.7 }]}
      accessibilityRole="button">
      <VehicleThumb v={r.vehicle} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.reason, r.unread && { fontFamily: F.sansBold }]} numberOfLines={1}>
          {REASON_LABEL[r.chat.reason]}
          <Text style={type.caption}> · {vehicleTitle(r.vehicle)}</Text>
        </Text>
        <Text style={[type.caption, r.unread && { color: C.text }]} numberOfLines={1}>
          {r.last ? `${r.last.sender === 'owner' ? 'You: ' : ''}${r.last.body}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={styles.time}>{timeAgo(r.chat.last_message_at, now)}</Text>
        {r.unread ? <View style={styles.dot} /> : state !== 'open' ? <Text style={styles.ended}>{state === 'moved' ? 'MOVED' : 'ENDED'}</Text> : null}
      </View>
    </Pressable>
  );
}

function Intro() {
  const steps = [
    'Get your vehicle’s QR or NFC sticker from AmigoTap and put it on the windscreen.',
    'Put it on the inside of your windscreen.',
    'If you’re blocking someone or left your lights on, they scan it and you get a notification here. No numbers are shared.',
  ];
  return (
    <View style={{ gap: 20, paddingTop: 8 }}>
      <View style={styles.hero}>
        <Car size={40} color={C.accent} />
      </View>
      <T v="section" style={{ textAlign: 'center' }}>
        Never get stuck behind a parked car again
      </T>
      <View style={{ gap: 14 }}>
        {steps.map((s, i) => (
          <View key={s} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={[type.body, { flex: 1, fontSize: 16, lineHeight: 23 }]}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vehicleCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontFamily: F.sansSemi, fontSize: 17, color: C.text },
  plate: { fontFamily: F.monoBold, fontSize: 13, color: C.muted, letterSpacing: 1 },
  inboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  reason: { fontFamily: F.sansSemi, fontSize: 16, color: C.text },
  time: { fontFamily: F.mono, fontSize: 12, color: C.muted },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  ended: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1, color: C.muted },
  empty: { paddingTop: 40, paddingHorizontal: 20 },
  hero: { alignSelf: 'center', width: 92, height: 92, borderRadius: 26, backgroundColor: C.raised, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: F.monoBold, fontSize: 13, color: C.onAccent },
});
