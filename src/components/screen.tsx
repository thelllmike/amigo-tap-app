import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, S, type } from '@/constants/theme';

/** Scrollable page with the 20 px gutter and safe-area padding. */
export function Screen({
  children,
  footer,
  refreshing,
  onRefresh,
  contentStyle,
  scroll = true,
  tabs,
}: {
  children: ReactNode;
  /** Pinned under the content, e.g. Save changes. */
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  /** Leaves room for the tab bar. */
  tabs?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: insets.top + 16, paddingBottom: (footer ? 16 : tabs ? 24 : insets.bottom + 24) };
  return (
    <View style={styles.root}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, pad, contentStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl tintColor={C.accent} refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, pad, { flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View>}
    </View>
  );
}

/** Back chevron + title (+ optional right side), for pushed screens. */
export function BackHeader({ title, right, center, small }: { title: string; right?: ReactNode; center?: boolean; small?: boolean }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={() => router.back()} style={styles.back}>
        <ChevronLeft size={28} color={C.text} />
      </Pressable>
      <Text style={[small ? styles.smallTitle : type.title, center && { flex: 1, textAlign: 'center' }, !center && { flex: 1 }]} numberOfLines={1}>
        {title}
      </Text>
      {right ?? (center ? <View style={{ width: 36 }} /> : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: S.gutter, gap: S.gutter },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: S.gutter, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  back: { width: 36, height: 44, justifyContent: 'center', marginLeft: -6 },
  smallTitle: { fontFamily: F.sansBold, fontSize: 19, color: C.text },
});
