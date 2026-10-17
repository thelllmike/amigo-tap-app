import { router } from 'expo-router';
import { ChevronRight, Pencil, ScanLine, Smartphone } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ShareCodes } from '@/components/share-codes';
import { Avatar } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, R, type } from '@/constants/theme';
import { nfcUrl, pageUrl } from '@/lib/links';
import { useCurrentBusiness } from '@/providers/business';

export default function Profile() {
  const b = useCurrentBusiness();

  return (
    <Screen tabs>
      <T v="title" style={{ fontSize: 34, lineHeight: 40, marginTop: 20 }}>
        QR & NFC
      </T>

      <Pressable style={({ pressed }) => [styles.tap, pressed && { opacity: 0.9 }]} onPress={() => router.push('/tap-share')} accessibilityRole="button">
        <View style={styles.tapIcon}>
          <Smartphone size={28} color={C.accent} />
          <View style={styles.wave} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.tapTitle}>Tap to share</Text>
          <Text style={styles.tapSub}>Hold your phone to theirs and your page opens on it — like an NFC card.</Text>
        </View>
        <ChevronRight size={22} color={C.onAccent} />
      </Pressable>

      <View style={styles.row2}>
        <Pressable style={styles.small} onPress={() => router.push('/scan')} accessibilityRole="button">
          <ScanLine size={22} color={C.text} />
          <Text style={styles.smallText}>Read a card</Text>
        </Pressable>
        <Pressable style={styles.small} onPress={() => router.push('/edit-profile')} accessibilityRole="button">
          <Pencil size={22} color={C.text} />
          <Text style={styles.smallText}>Edit profile</Text>
        </Pressable>
      </View>

      <ShareCodes title={b.name} qrValue={pageUrl(b.slug)} nfcValue={nfcUrl(b.slug)} fileName={b.slug} />

      <View style={styles.preview}>
        <Avatar name={b.name} color={b.theme_color} uri={b.avatar_url} size={44} />
        <Text style={[type.caption, { flex: 1 }]}>Both codes open the same page. The NFC link also shows the “you tapped” welcome popup.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tap: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: R.card + 4, backgroundColor: C.accent },
  tapIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: C.onAccent, alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute', right: 8, top: 8, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.accent, borderLeftColor: 'transparent', borderBottomColor: 'transparent' },
  tapTitle: { fontFamily: F.display, fontSize: 22, color: C.onAccent },
  tapSub: { fontFamily: F.sans, fontSize: 15, lineHeight: 21, color: '#2B3300' },
  row2: { flexDirection: 'row', gap: 12 },
  small: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 60, borderRadius: R.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  smallText: { fontFamily: F.sansSemi, fontSize: 16, color: C.text },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
