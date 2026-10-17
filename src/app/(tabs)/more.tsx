import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { Avatar, Badge, Card, Row, SectionLabel, Toggle } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, type } from '@/constants/theme';
import { SITE_URL } from '@/lib/config';
import { fetchMembers, inviteMember } from '@/lib/data';
import { isRestaurant } from '@/lib/links';
import { supabase } from '@/lib/supabase';
import type { BusinessMember } from '@/lib/types';
import { signOut, useAuth } from '@/providers/auth';
import { useBusinesses, useCurrentBusiness } from '@/providers/business';

export default function More() {
  const b = useCurrentBusiness();
  const { session } = useAuth();
  const { prefs, setPrefs, businesses } = useBusinesses();
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const owner = b.user_id === session?.user.id;
  const me = session?.user.email ?? '';

  useFocusEffect(
    useCallback(() => {
      void fetchMembers(b.id).then(setMembers).catch(() => setMembers([]));
    }, [b.id]),
  );

  async function invite() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setInviteError('Enter their email address');
    setInviting(true);
    setInviteError(null);
    try {
      await inviteMember(b.id, email);
      setEmail('');
      setMembers(await fetchMembers(b.id));
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : 'Couldn’t invite');
    } finally {
      setInviting(false);
    }
  }

  async function resetPassword() {
    const { error } = await supabase.auth.resetPasswordForEmail(me, { redirectTo: `${SITE_URL}/linktree/reset-password` });
    Alert.alert(error ? 'Couldn’t send the email' : 'Check your inbox', error ? error.message : `We sent a password reset link to ${me}.`);
  }

  return (
    <Screen tabs>
      <T v="title" style={{ fontSize: 34, lineHeight: 40, marginTop: 20 }}>
        More
      </T>

      <View style={{ gap: 12 }}>
        <SectionLabel>Team access · {b.name}</SectionLabel>
        <Card style={{ gap: 4, paddingVertical: 20 }}>
          {owner && (
            <View style={{ gap: 12, paddingBottom: 12 }}>
              <Text style={styles.cardTitle}>Invite a manager</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Field value={email} onChangeText={setEmail} placeholder="name@email.com" autoCapitalize="none" keyboardType="email-address" autoCorrect={false} error={inviteError} />
                </View>
                <Button title="Invite" onPress={invite} loading={inviting} style={{ height: 55 }} />
              </View>
              <Text style={type.caption}>Managers see orders and stats. They need an AmigoTap account first.</Text>
            </View>
          )}
          <Person name={owner ? `${me.split('@')[0]} (you)` : b.name} email={owner ? me : 'Owner'} badge={<Badge label="Owner" tone="owner" />} last={members.length === 0} />
          {members.map((m, i) => (
            <Person
              key={m.id}
              name={m.user_id === session?.user.id ? `${(m.email ?? me).split('@')[0]} (you)` : (m.email ?? 'Team member').split('@')[0]}
              email={m.email ?? ''}
              badge={<Badge label={m.role} />}
              last={i === members.length - 1}
            />
          ))}
        </Card>
      </View>

      <View style={{ gap: 12 }}>
        <SectionLabel>Notifications</SectionLabel>
        <Card style={{ paddingVertical: 4 }}>
          <Row
            title="Order sound"
            subtitle="Plays “ding” even in silent mode"
            right={<Toggle value={prefs.orderSound} onChange={(v) => setPrefs({ orderSound: v })} label="Order sound" />}
          />
          <Row title="Vibrate" subtitle="Buzz with each alert" right={<Toggle value={prefs.vibrate} onChange={(v) => setPrefs({ vibrate: v })} label="Vibrate" />} last />
        </Card>
        {isRestaurant(b) && <Text style={type.caption}>Alerts play while AmigoTap is open. Keep it on the counter during service.</Text>}
      </View>

      <View style={{ gap: 12 }}>
        <SectionLabel>Account</SectionLabel>
        <Card style={{ paddingVertical: 4 }}>
          {businesses.length > 1 && <Row title="Switch business" value={`${businesses.length}`} right={<Chevron />} onPress={() => router.push('/switch-business')} />}
          <Row title="Edit page on the web" right={<Chevron />} onPress={() => WebBrowser.openBrowserAsync(`${SITE_URL}/linktree/admin/${b.id}`)} />
          <Row title="Reset password" subtitle={me} right={<Chevron />} onPress={resetPassword} />
          <Row title="Help & support" right={<Chevron />} onPress={() => Linking.openURL('mailto:hello@amigotap.com?subject=AmigoTap%20app')} last />
        </Card>
        <Button
          title="Log out"
          variant="destructive"
          onPress={() =>
            Alert.alert('Log out of AmigoTap?', undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
            ])
          }
        />
      </View>
    </Screen>
  );
}

function Chevron() {
  return <ChevronRight size={20} color={C.muted} />;
}

function Person({ name, email, badge, last }: { name: string; email: string; badge: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.person, !last && styles.divider]}>
      <Avatar name={name} size={48} round color={C.border} />
      <View style={{ flex: 1 }}>
        <Text style={styles.personName} numberOfLines={1}>
          {name}
        </Text>
        {!!email && (
          <Text style={type.caption} numberOfLines={1}>
            {email}
          </Text>
        )}
      </View>
      {badge}
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontFamily: F.sansSemi, fontSize: 18, color: C.text },
  person: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  personName: { fontFamily: F.sansSemi, fontSize: 17, color: C.text },
});
