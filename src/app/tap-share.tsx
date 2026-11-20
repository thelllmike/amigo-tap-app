import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, Nfc, Share as ShareIcon, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Animated, AppState, Easing, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QrCode } from '@/components/qr-code';
import { Button, IconButton } from '@/components/ui/button';
import { Avatar } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, R, S } from '@/constants/theme';
import { nfcUrl } from '@/lib/links';
import { nfcSupported, writeLink } from '@/lib/nfc';
import { useCurrentBusiness } from '@/providers/business';
import { addReadListener, isHceSupported, isNfcEnabled, openNfcSettings, startCardEmulation, stopCardEmulation } from '../../modules/amigo-hce';

type Mode = 'checking' | 'ready' | 'sent' | 'nfc-off' | 'unsupported' | 'error';

/** Dev only: show the Android sharing screen in a simulator, for store screenshots. */
const PREVIEW_HCE = __DEV__ && process.env.EXPO_PUBLIC_PREVIEW_HCE === '1';

/**
 * "Tap to share": the phone becomes an NFC card. Another phone held against it
 * reads the page link and opens it — in the browser with the tap welcome
 * popup, in the AmigoTap App Clip on iPhone, or in this app if installed.
 *
 * Android only: iOS doesn't let apps emulate NFC tags, so iPhones get a
 * full-screen QR (the other phone's camera opens it the same way) plus Share.
 */
export default function TapShare() {
  const b = useCurrentBusiness();
  const insets = useSafeAreaInsets();
  const url = nfcUrl(b.slug);
  const [hce] = useState(() => PREVIEW_HCE || isHceSupported());
  const [mode, setMode] = useState<Mode>(PREVIEW_HCE ? 'ready' : hce ? 'checking' : 'unsupported');
  const [shares, setShares] = useState(0);
  const [canWrite, setCanWrite] = useState(false);
  const [writing, setWriting] = useState(false);

  // Start/stop emulation with the screen, and re-check NFC after Settings.
  useEffect(() => {
    if (PREVIEW_HCE) return;
    if (!hce) {
      void nfcSupported().then(setCanWrite);
      return;
    }
    let active = true;
    const start = async () => {
      if (!isNfcEnabled()) return setMode('nfc-off');
      try {
        await startCardEmulation(url);
        if (active) setMode('ready');
      } catch {
        if (active) setMode('error');
      }
    };
    void start();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void start();
    });
    return () => {
      active = false;
      sub.remove();
      void stopCardEmulation();
    };
  }, [url, hce]);

  useEffect(() => {
    const sub = addReadListener(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShares((n) => n + 1);
      setMode('sent');
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (mode !== 'sent') return;
    const t = setTimeout(() => setMode('ready'), 2500);
    return () => clearTimeout(t);
  }, [mode]);

  async function writeCard() {
    setWriting(true);
    const res = await writeLink(url);
    setWriting(false);
    if (res.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Card written', 'Anyone who taps that card now gets your page.');
    } else if (!res.cancelled) Alert.alert('Couldn’t write the card', res.message);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.top}>
        <View style={styles.who}>
          <Avatar name={b.name} color={b.theme_color} uri={b.avatar_url} size={44} />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.whoLabel}>SHARING</Text>
            <Text style={styles.whoName} numberOfLines={1}>
              {b.name}
            </Text>
          </View>
        </View>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>

      {hce ? <Emulating mode={mode} shares={shares} /> : <QrFallback url={url} />}

      <View style={{ gap: 12 }}>
        {mode === 'nfc-off' && <Button title="Turn on NFC" icon={Nfc} onPress={openNfcSettings} />}
        {!hce && canWrite && <Button title="Write my page to an NFC card" icon={Nfc} variant="outline" onPress={writeCard} loading={writing} />}
        <Button title="Send the link instead" icon={ShareIcon} variant="outline" onPress={() => Share.share({ message: url, url })} />
      </View>
    </View>
  );
}

function Emulating({ mode, shares }: { mode: Mode; shares: number }) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const sent = mode === 'sent';
  const ready = mode === 'ready' || sent;
  const ring = (delay: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, delay, 1], outputRange: [0, 0.5, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6 + delay * 0.3, 1.25] }) }],
  });

  const copy: Record<Mode, { title: string; body: string }> = {
    checking: { title: 'Getting ready…', body: '' },
    ready: { title: 'Hold phones back to back', body: 'Keep this screen open. Their phone needs NFC on — iPhones just need to be unlocked.' },
    sent: { title: 'Sent!', body: 'Your page is opening on their phone.' },
    'nfc-off': { title: 'NFC is off', body: 'Turn on NFC in Settings, then come back here.' },
    error: { title: 'Couldn’t start sharing', body: 'Another NFC app may be using card emulation. Close it, or set AmigoTap as the default in Settings › Connections › NFC.' },
    unsupported: { title: '', body: '' },
  };

  return (
    <View style={styles.center}>
      <View style={styles.rings}>
        {ready && !sent && (
          <>
            <Animated.View style={[styles.ring, ring(0.2)]} />
            <Animated.View style={[styles.ring, ring(0.5)]} />
          </>
        )}
        <View style={[styles.core, sent && { backgroundColor: C.accent }]}>
          {sent ? <Check size={64} color={C.onAccent} strokeWidth={3} /> : <Nfc size={64} color={ready ? C.accent : C.muted} />}
        </View>
      </View>
      <View style={{ gap: 10, alignItems: 'center' }} accessibilityLiveRegion="polite">
        <T v="title" style={{ textAlign: 'center' }}>
          {copy[mode].title}
        </T>
        {!!copy[mode].body && <T style={{ color: C.muted, textAlign: 'center', fontSize: 17, lineHeight: 25 }}>{copy[mode].body}</T>}
        {shares > 0 && <Text style={styles.count}>Shared {shares} {shares === 1 ? 'time' : 'times'}</Text>}
      </View>
    </View>
  );
}

function QrFallback({ url }: { url: string }) {
  return (
    <View style={styles.center}>
      <View style={styles.qr}>
        <QrCode value={url} size={250} />
      </View>
      <View style={{ gap: 10, alignItems: 'center' }}>
        <T v="title" style={{ textAlign: 'center' }}>
          Scan to open my page
        </T>
        <T style={{ color: C.muted, textAlign: 'center', fontSize: 16, lineHeight: 23 }}>
          {Platform.OS === 'ios'
            ? 'iPhone doesn’t let apps act as an NFC card, so point their camera here instead. It opens the same page an AmigoTap card would.'
            : 'This phone can’t act as an NFC card. Point their camera here — it opens the same page an AmigoTap card would.'}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.gutter, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  whoLabel: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1.5, color: C.accent },
  whoName: { fontFamily: F.sansSemi, fontSize: 18, color: C.text },
  center: { alignItems: 'center', gap: 36 },
  rings: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 2, borderColor: C.accent },
  core: { width: 148, height: 148, borderRadius: 44, backgroundColor: C.raised, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: F.mono, fontSize: 13, color: C.accent, marginTop: 4 },
  qr: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: R.sheet },
});
