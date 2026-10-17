import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { ScanLine, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { C, S } from '@/constants/theme';
import { slugFromUrl } from '@/lib/links';
import { nfcSupported, readLink } from '@/lib/nfc';

/**
 * Reads an AmigoTap card, table stand, or another phone in "Tap to share".
 * AmigoTap links open in the in-app profile view; anything else in the browser.
 */
export default function Scan() {
  const insets = useSafeAreaInsets();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    void nfcSupported().then(setSupported);
  }, []);

  async function scan() {
    setMessage(null);
    setScanning(true);
    const res = await readLink();
    setScanning(false);
    if (!res.ok) {
      if (!res.cancelled) setMessage(res.message);
      return;
    }
    if (!res.value) {
      setMessage('That tag has no link on it.');
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const slug = slugFromUrl(res.value);
    if (slug) router.replace({ pathname: '/linktree/[slug]', params: { slug, src: 'nfc' } });
    else await WebBrowser.openBrowserAsync(res.value);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={{ alignItems: 'flex-end' }}>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>
      <View style={styles.center}>
        <View style={styles.icon}>
          <ScanLine size={64} color={C.accent} />
        </View>
        <T v="title" style={{ textAlign: 'center' }}>
          Read a card
        </T>
        <T style={{ color: C.muted, textAlign: 'center', fontSize: 17, lineHeight: 25 }}>
          {supported === false
            ? 'This phone can’t read NFC. Use the camera to scan the card’s QR code instead.'
            : 'Hold the top of your phone near an AmigoTap card, a table stand, or a phone that’s sharing.'}
        </T>
        {message && <T style={{ color: C.danger, textAlign: 'center' }}>{message}</T>}
      </View>
      <Button title={scanning ? 'Scanning…' : 'Start scanning'} onPress={scan} loading={scanning} disabled={supported === false} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingHorizontal: S.gutter, justifyContent: 'space-between' },
  center: { alignItems: 'center', gap: 18, paddingHorizontal: 8 },
  icon: { width: 148, height: 148, borderRadius: 44, backgroundColor: C.raised, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
});
