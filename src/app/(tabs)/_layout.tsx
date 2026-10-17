import { Redirect } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/tabs';
import { ChartNoAxesColumn, Ellipsis, House, Link, ReceiptText, User, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F } from '@/constants/theme';
import { isRestaurant } from '@/lib/links';
import { useBusinesses } from '@/providers/business';
import { useOrders } from '@/providers/orders';

const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  home: { icon: House, label: 'Home' },
  orders: { icon: ReceiptText, label: 'Orders' },
  links: { icon: Link, label: 'Links' },
  stats: { icon: ChartNoAxesColumn, label: 'Stats' },
  profile: { icon: User, label: 'Profile' },
  more: { icon: Ellipsis, label: 'More' },
};

function TabBar({ state, emitter, navigateToTab, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { orders } = useOrders();
  const pending = orders.filter((o) => o.status === 'pending').length;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const options = descriptors[route.key]?.options as { hidden?: boolean; href?: unknown } | undefined;
        if (!options || options.hidden || options.href === null) return null;
        const meta = ICONS[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const color = focused ? C.accent : C.muted;
        const Icon = meta.icon;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={route.name === 'orders' && pending ? `Orders, ${pending} pending` : meta.label}
            style={styles.item}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}>
            <View>
              <Icon size={26} color={color} strokeWidth={focused ? 2.3 : 1.8} />
              {route.name === 'orders' && pending > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pending > 9 ? '9+' : pending}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, { color, fontFamily: focused ? F.sansBold : F.sansSemi }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { current } = useBusinesses();
  if (!current) return <Redirect href="/businesses" />;
  const restaurant = isRestaurant(current);

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="orders" options={{ href: restaurant ? undefined : null }} />
      <Tabs.Screen name="links" options={{ href: restaurant ? null : undefined }} />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, paddingTop: 10 },
  item: { flex: 1, alignItems: 'center', gap: 4, minHeight: 48 },
  label: { fontSize: 13 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: F.monoBold, fontSize: 10, color: C.onAccent },
});
