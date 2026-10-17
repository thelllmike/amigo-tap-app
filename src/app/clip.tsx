import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mark } from '@/components/logo';
import { T } from '@/components/ui/text';
import { C, F } from '@/constants/theme';
import { promoteFullApp } from '@/lib/clip';

/**
 * App Clip home. iOS normally launches the clip straight onto a card's page
 * (/linktree/<slug>); this only shows if it's opened without a link.
 */
export default function ClipHome() {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    promoteFullApp();
  }, []);
  return (
    <View style={[styles.root, { paddingTop: insets.top + 80 }]}>
      <Mark size={96} />
      <T v="display" style={{ textAlign: 'center' }}>
        AmigoTap
      </T>
      <T style={{ color: C.muted, textAlign: 'center', fontSize: 17, lineHeight: 25 }}>
        Tap an AmigoTap card, table stand or a friend’s phone to see their page here — no download needed.
      </T>
      <Text style={styles.hint}>Get the full app to make and share your own card.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: 'center', gap: 20, paddingHorizontal: 32 },
  hint: { fontFamily: F.mono, fontSize: 12, color: C.accent, textAlign: 'center', marginTop: 12 },
});
