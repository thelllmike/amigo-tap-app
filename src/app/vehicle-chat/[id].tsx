import type React from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MapPin, Send } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/screen';
import { Badge } from '@/components/ui/surface';
import { VehicleThumb } from '@/components/vehicle-thumb';
import { C, F, R, S, type } from '@/constants/theme';
import { fetchChat, sendOwnerReply, updateChat } from '@/lib/data';
import { MESSAGE_MAX, QUICK_REPLIES, REASON_LABEL, chatState, clockTime, vehicleTitle } from '@/lib/park';
import { supabase } from '@/lib/supabase';
import type { Vehicle, VehicleChat, VehicleMessage } from '@/lib/types';
import { useAuth } from '@/providers/auth';
import { usePark } from '@/providers/park';

type Loaded = { chat: VehicleChat; vehicle: Vehicle; messages: VehicleMessage[] };

/** One Park Alert conversation with someone who scanned the sticker. */
export default function VehicleChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { refresh: refreshInbox } = usePark();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Loaded | null | undefined>(undefined);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchChat(id));
    } catch {
      setData((d) => d ?? null);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Live: new messages and status changes for this chat.
  useEffect(() => {
    const channel = supabase
      .channel(`park-chat-${id}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vehicle_messages', filter: `chat_id=eq.${id}` }, () => void load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vehicle_chats', filter: `id=eq.${id}` }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, load]);

  // Opening the chat tells the scanner "seen" and clears the unread dot.
  const lastScanner = data?.messages.filter((m) => m.sender === 'scanner').at(-1)?.created_at;
  const unread = !!data && !!lastScanner && (!data.chat.owner_read_at || lastScanner > data.chat.owner_read_at);
  useEffect(() => {
    if (!unread) return;
    void updateChat(id, { owner_read_at: new Date().toISOString() }).then(() => refreshInbox(), () => {});
  }, [unread, id, refreshInbox]);

  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  }, [data?.messages.length]);

  async function send(body: string) {
    if (!session || !body.trim()) return;
    setSending(true);
    try {
      await sendOwnerReply(session.user.id, id, body);
      setText('');
      await load();
    } catch (e) {
      Alert.alert('Couldn’t send', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSending(false);
    }
  }

  async function setStatus(patch: Partial<Pick<VehicleChat, 'status' | 'blocked'>>) {
    try {
      await updateChat(id, patch);
      await load();
      void refreshInbox();
    } catch (e) {
      Alert.alert('Couldn’t update', e instanceof Error ? e.message : 'Try again');
    }
  }

  if (data === undefined) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
        <View style={styles.pad}>
          <BackHeader title="Message" small />
        </View>
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      </View>
    );
  }
  if (data === null) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
        <View style={styles.pad}>
          <BackHeader title="Message" small />
          <Text style={[type.body, { color: C.muted }]}>This chat isn’t available any more.</Text>
        </View>
      </View>
    );
  }

  const { chat, vehicle, messages } = data;
  const state = chatState(chat);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.pad, { paddingTop: insets.top + 16, gap: 12 }]}>
        <BackHeader
          title={REASON_LABEL[chat.reason]}
          small
          right={<Badge label={state === 'open' ? 'Open' : state === 'moved' ? 'Moved' : chat.blocked ? 'Blocked' : 'Ended'} tone={state === 'open' ? 'ready' : 'done'} />}
        />
        <View style={styles.vehicle}>
          <VehicleThumb v={vehicle} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName} numberOfLines={1}>
              {vehicleTitle(vehicle)}
            </Text>
            <Text style={styles.plate}>{vehicle.plate}</Text>
          </View>
          {chat.lat != null && chat.lng != null && (
            <Pressable
              style={styles.mapBtn}
              onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${chat.lat},${chat.lng}`)}
              accessibilityRole="button"
              accessibilityLabel="Open their location in maps">
              <MapPin size={16} color={C.accent} />
              <Text style={styles.mapText}>Their location</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={[styles.pad, { gap: 8, paddingVertical: 16 }]}>
        {messages.map((m) => {
          const mine = m.sender === 'owner';
          return (
            <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, mine && { color: C.onAccent }]}>{m.body}</Text>
              <Text style={[styles.bubbleTime, mine && { color: 'rgba(10,10,10,0.5)' }]}>{clockTime(m.created_at)}</Text>
            </View>
          );
        })}
        {state !== 'open' && (
          <Text style={[type.caption, { textAlign: 'center', marginTop: 12 }]}>
            {state === 'moved' ? 'You marked this as moved.' : 'This chat has ended.'} Chats close 24 hours after they start.
          </Text>
        )}
      </ScrollView>

      {state === 'open' && (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: S.gutter }}>
            {QUICK_REPLIES.map((q) => (
              <Pressable key={q} disabled={sending} onPress={() => void send(q)} style={styles.quick} accessibilityRole="button">
                <Text style={styles.quickText}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={[styles.inputRow, styles.pad]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Reply…"
              placeholderTextColor={C.faint}
              maxLength={MESSAGE_MAX}
              multiline
              style={styles.input}
              accessibilityLabel="Reply"
            />
            <Pressable
              onPress={() => void send(text)}
              disabled={sending || !text.trim()}
              style={[styles.send, (sending || !text.trim()) && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel="Send">
              <Send size={18} color={C.onAccent} />
            </Pressable>
          </View>
          <View style={[styles.actions, styles.pad]}>
            <Pressable onPress={() => void setStatus({ status: 'moved' })} style={[styles.action, { backgroundColor: C.text }]} accessibilityRole="button">
              <Text style={[styles.actionText, { color: C.onAccent }]}>✓ I’ve moved it</Text>
            </Pressable>
            <Pressable onPress={() => void setStatus({ status: 'closed' })} style={styles.action} accessibilityRole="button">
              <Text style={styles.actionText}>End chat</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert('Block this person?', 'They won’t be able to message this vehicle again from their phone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Block', style: 'destructive', onPress: () => void setStatus({ blocked: true, status: 'closed' }) },
                ])
              }
              style={[styles.action, { borderColor: '#5A2424' }]}
              accessibilityRole="button">
              <Text style={[styles.actionText, { color: C.danger }]}>Block</Text>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  pad: { paddingHorizontal: S.gutter },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  vehicleName: { fontFamily: F.sansSemi, fontSize: 16, color: C.text },
  plate: { fontFamily: F.monoBold, fontSize: 12, color: C.muted, letterSpacing: 1 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: C.raised },
  mapText: { fontFamily: F.sansSemi, fontSize: 13, color: C.accent },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: C.accent, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: C.raised, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 6 },
  bubbleText: { fontFamily: F.sans, fontSize: 16, lineHeight: 22, color: C.text },
  bubbleTime: { fontFamily: F.mono, fontSize: 10, color: C.muted, alignSelf: 'flex-end', marginTop: 2 },
  composer: { gap: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, backgroundColor: C.bg },
  quick: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  quickText: { fontFamily: F.sansSemi, fontSize: 14, color: C.text },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: R.input, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, fontFamily: F.sans, fontSize: 16, color: C.text },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: F.sansSemi, fontSize: 14, color: C.text },
});
