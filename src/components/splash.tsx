import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Mark } from '@/components/logo';
import { C, F } from '@/constants/theme';

/** Splash: the mark inside two faint rings, with a lime loading bar. */
export function Splash() {
  const [progress] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })).start();
  }, [progress, pulse]);

  return (
    <View style={styles.root} accessibilityLabel="AmigoTap is loading">
      <View style={[styles.ring, { width: 560, height: 560, borderRadius: 280 }]} />
      <View style={[styles.ring, { width: 400, height: 400, borderRadius: 200 }]} />
      <Animated.View
        style={[
          styles.ring,
          {
            width: 400,
            height: 400,
            borderRadius: 200,
            borderColor: C.accent,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          },
        ]}
      />
      <Mark size={128} />
      <Text style={styles.word}>AmigoTap</Text>
      <Text style={styles.sub}>OWNER APP</Text>
      <View style={styles.footer}>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['8%', '100%'] }) }]} />
        </View>
        <Text style={styles.version}>v1.0 · Clever Project</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: 1, borderColor: '#1E1E1E' },
  word: { marginTop: 28, fontFamily: F.display, fontSize: 40, letterSpacing: -1, color: C.text },
  sub: { marginTop: 8, fontFamily: F.mono, fontSize: 13, letterSpacing: 3, color: C.muted },
  footer: { position: 'absolute', bottom: 72, alignItems: 'center', gap: 14 },
  track: { width: 150, height: 3, borderRadius: 2, backgroundColor: C.border, overflow: 'hidden' },
  bar: { height: 3, backgroundColor: C.accent, borderRadius: 2 },
  version: { fontFamily: F.mono, fontSize: 12, color: C.muted },
});
