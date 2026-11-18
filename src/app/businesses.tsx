import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Car, ChevronRight, Plus } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BusinessCard } from '@/components/business-list';
import { LogoTile } from '@/components/logo';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F } from '@/constants/theme';
import { SITE_URL } from '@/lib/config';
import { greeting } from '@/lib/format';
import { signOut, useAuth } from '@/providers/auth';
import { useBusinesses } from '@/providers/business';
import { usePark } from '@/providers/park';

export default function Businesses() {
  const { session } = useAuth();
  const { businesses, loading, error, viewsToday, pendingCounts, select, refresh } = useBusinesses();
  const park = usePark();
  const email = session?.user.email ?? '';
  const name = (session?.user.user_metadata?.name as string | undefined) ?? email.split('@')[0];
  const first = name.charAt(0).toUpperCase() + name.slice(1).split(/[._\s]/)[0];

  function open(id: string) {
    select(id);
    router.replace('/home');
  }

  // One business: nothing to pick.
  const only = !loading && businesses.length === 1 ? businesses[0].id : null;
  useEffect(() => {
    if (!only) return;
    select(only);
    router.replace('/home');
  }, [only, select]);

  return (
    <Screen
      refreshing={false}
      onRefresh={refresh}
      footer={
        <Pressable style={styles.add} onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/linktree/admin/new`)} accessibilityRole="button">
          <Plus size={22} color={C.text} />
          <Text style={styles.addText}>Add a business</Text>
        </Pressable>
      }>
      <View style={styles.top}>
        <LogoTile size={56} />
        <Pressable
          accessibilityLabel="Account"
          onPress={() => Alert.alert(email, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => void signOut() }])}>
          <Avatar name={name || 'Me'} size={64} round color={C.raised} />
        </Pressable>
      </View>
      <View style={{ gap: 8 }}>
        <T v="display">
          {greeting()}, {first || 'there'}
        </T>
        <T style={{ color: C.muted, fontSize: 17 }}>Pick a business to manage.</T>
      </View>

      <Pressable style={styles.park} onPress={() => router.push('/vehicles')} accessibilityRole="button" accessibilityLabel="Park Alert">
        <View style={styles.parkIcon}>
          <Car size={22} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.parkTitle}>Park Alert</Text>
          <Text style={styles.parkSub}>
            {park.unread > 0
              ? `${park.unread} new message${park.unread === 1 ? '' : 's'}`
              : park.vehicles.length
                ? `${park.vehicles.length} vehicle${park.vehicles.length === 1 ? '' : 's'}`
                : 'Get a QR sticker for your vehicle'}
          </Text>
        </View>
        {park.unread > 0 && <View style={styles.parkDot} />}
        <ChevronRight size={20} color={C.muted} />
      </Pressable>

      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={{ gap: 12 }}>
          <T style={{ color: C.danger }}>{error}</T>
          <Button title="Try again" variant="outline" onPress={refresh} />
        </View>
      ) : businesses.length === 0 ? (
        <View style={{ gap: 12, marginTop: 24 }}>
          <T v="section">No businesses yet</T>
          <T style={{ color: C.muted }}>Create your first page on amigotap.com and it will show up here.</T>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {businesses.map((b) => (
            <BusinessCard key={b.id} b={b} views={viewsToday[b.id]} pending={pendingCounts[b.id] ?? 0} onPress={() => open(b.id)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  add: {
    flex: 1,
    height: 72,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: C.faint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addText: { fontFamily: F.sansSemi, fontSize: 18, color: C.text },
  park: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  parkIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' },
  parkTitle: { fontFamily: F.sansSemi, fontSize: 17, color: C.text },
  parkSub: { fontFamily: F.sans, fontSize: 13, color: C.muted, marginTop: 2 },
  parkDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
});
