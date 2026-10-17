import { router } from 'expo-router';
import { Bell, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F } from '@/constants/theme';
import { money } from '@/lib/format';
import { useOrders } from '@/providers/orders';

/**
 * Drops from the top with a spring, alongside the order sound and a haptic,
 * and stays until dismissed or viewed (Components → New-order toast).
 */
export function OrderToast() {
  const { toast, dismissToast, markSeen } = useOrders();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-200));

  useEffect(() => {
    Animated.spring(y, { toValue: toast ? 0 : -200, useNativeDriver: true, damping: 16, stiffness: 180, mass: 0.9 }).start();
  }, [toast, y]);

  if (!toast) return null;
  const count = toast.items.reduce((n, i) => n + i.qty, 0);

  return (
    <Animated.View style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY: y }] }]} accessibilityLiveRegion="assertive">
      <View style={styles.bell}>
        <Bell size={22} color={C.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          New order · {toast.table_name ?? 'Takeaway'}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {count} {count === 1 ? 'item' : 'items'} · {money(toast.total, toast.currency)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          markSeen(toast.id);
          router.push({ pathname: '/order/[id]', params: { id: toast.id } });
        }}
        style={styles.view}>
        <Text style={styles.viewText}>View</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={10} onPress={dismissToast}>
        <X size={20} color={C.onAccent} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.accent,
    borderRadius: 20,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  bell: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.onAccent, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.sansBold, fontSize: 17, color: C.onAccent },
  sub: { fontFamily: F.sans, fontSize: 14, color: '#2B3300' },
  view: { backgroundColor: C.onAccent, borderRadius: 14, paddingHorizontal: 18, height: 48, justifyContent: 'center' },
  viewText: { fontFamily: F.sansBold, fontSize: 16, color: C.text },
});
