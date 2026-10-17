import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge } from '@/components/ui/surface';
import { C, F, R, type } from '@/constants/theme';
import { KIND_LABEL, businessKind } from '@/lib/links';
import type { Business } from '@/lib/types';

/** Big card on the "Pick a business" screen. */
export function BusinessCard({ b, views, pending, onPress }: { b: Business; views?: number; pending: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${b.name}, ${KIND_LABEL[businessKind(b)]}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: C.raised }]}>
      <Avatar name={b.name} color={b.theme_color} uri={b.avatar_url} size={72} dot={pending > 0} />
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={styles.name} numberOfLines={1}>
          {b.name}
        </Text>
        <View style={styles.meta}>
          <Badge label={KIND_LABEL[businessKind(b)]} />
          {pending > 0 && (
            <Text style={styles.pending} numberOfLines={1}>
              {pending} new {pending === 1 ? 'order' : 'orders'}
            </Text>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[type.number, { fontSize: 22 }]}>{views ?? '–'}</Text>
        <Text style={type.caption}>views today</Text>
      </View>
    </Pressable>
  );
}

/** Compact row in the "Switch business" sheet. */
export function BusinessRow({ b, views, pending, selected, onPress }: { b: Business; views?: number; pending: number; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, (selected || pressed) && { backgroundColor: C.border }]}>
      <Avatar name={b.name} color={b.theme_color} uri={b.avatar_url} size={60} dot={pending > 0} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.name} numberOfLines={1}>
          {b.name}
        </Text>
        <Text style={type.caption} numberOfLines={1}>
          {KIND_LABEL[businessKind(b)]} · {views ?? 0} views today
        </Text>
      </View>
      {selected && <Check size={24} color={C.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: R.card + 4, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  name: { fontFamily: F.sansSemi, fontSize: 19, color: C.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pending: { fontFamily: F.sansSemi, fontSize: 15, color: C.accent, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: R.input },
});
