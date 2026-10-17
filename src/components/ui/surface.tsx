import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { C, F, R, type } from '@/constants/theme';
import { initials } from '@/lib/links';

export function Card({ children, style, onPress, highlight }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; highlight?: boolean }) {
  const s = [styles.card, highlight && styles.cardHighlight, style];
  if (!onPress) return <View style={s}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { backgroundColor: C.raised }]}>
      {children}
    </Pressable>
  );
}

/** Filter chip: "7 days", "Hoppers 6". */
export function Chip({ label, count, active, onPress, light }: { label: string; count?: number; active?: boolean; onPress?: () => void; light?: boolean }) {
  const bg = active ? (light ? C.text : C.accent) : 'transparent';
  const fg = active ? C.onAccent : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg, borderColor: active ? bg : C.border }]}>
      <Text style={[styles.chipText, { color: fg }]}>
        {label}
        {count !== undefined && <Text style={{ fontFamily: F.mono, fontSize: 12, color: active ? C.onAccent : C.muted }}> {count}</Text>}
      </Text>
    </Pressable>
  );
}

type Tone = 'new' | 'pending' | 'preparing' | 'ready' | 'done' | 'outline' | 'owner' | 'danger';
const TONES: Record<Tone, { bg: string; fg: string; border?: string }> = {
  new: { bg: C.accent, fg: C.onAccent },
  pending: { bg: '#3A2E17', fg: C.pending },
  preparing: { bg: '#232945', fg: C.preparing },
  ready: { bg: '#2C3311', fg: C.accent },
  done: { bg: C.raised, fg: C.muted },
  outline: { bg: 'transparent', fg: C.muted, border: C.border },
  owner: { bg: 'transparent', fg: C.accent, border: C.accent },
  danger: { bg: '#3A1C1C', fg: C.danger },
};

/** Mono caps badge: RESTAURANT, NEW, PENDING · 4 MIN, OWNER. */
export function Badge({ label, tone = 'outline', style }: { label: string; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border ?? t.bg }, style]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

/** Up/down change pill on stat tiles. */
export function DeltaPill({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  if (value === null) return <Text style={type.caption}>new</Text>;
  const up = value >= 0;
  return (
    <View style={[styles.delta, { backgroundColor: up ? '#2C3311' : '#3A1C1C' }]}>
      <Text style={[styles.deltaText, { color: up ? C.accent : C.danger }]}>
        {up ? '▲' : '▼'} {Math.abs(value)}%{suffix}
      </Text>
    </View>
  );
}

export function StatTile({ label, value, unit, delta, foot }: { label: string; value: string; unit?: string; delta?: number | null; foot?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={type.label}>{label}</Text>
      <Text style={type.number} numberOfLines={1} adjustsFontSizeToFit>
        {unit && <Text style={{ fontFamily: F.monoBold, fontSize: 15, color: C.muted }}>{unit} </Text>}
        {value}
      </Text>
      {delta !== undefined ? <DeltaPill value={delta} /> : foot ? <Text style={type.caption}>{foot}</Text> : null}
    </View>
  );
}

export function Toggle({ value, onChange, disabled, label }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ true: C.accent, false: C.border }}
      thumbColor={value ? C.onAccent : C.muted}
      ios_backgroundColor={C.border}
    />
  );
}

/** Two- or four-way segmented control: Orders | Page, New 3 | Preparing 1 … */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  accent,
}: {
  options: { key: K; label: string; count?: number }[];
  value: K;
  onChange: (k: K) => void;
  /** Lime selected segment (orders) instead of raised grey. */
  accent?: boolean;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.segmentItem, on && { backgroundColor: accent ? C.accent : C.border }]}>
            <Text numberOfLines={1} style={[styles.segmentText, { color: on ? (accent ? C.onAccent : C.text) : C.muted }]}>
              {o.label}
              {o.count !== undefined ? ` ${o.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Square-ish initials tile in the business's colour, or its logo. */
export function Avatar({ name, color, uri, size = 56, dot, round }: { name: string; color?: string; uri?: string | null; size?: number; dot?: boolean; round?: boolean }) {
  const radius = round ? size / 2 : size * 0.28;
  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: C.raised }} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, { width: size, height: size, borderRadius: radius, backgroundColor: color || C.raised }]}>
          <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
        </View>
      )}
      {dot && <View style={styles.dot} />}
    </View>
  );
}

/** Mono caps label above a group: "TEAM ACCESS · KOPI KADE". */
export function SectionLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={type.label}>{children}</Text>
    </View>
  );
}

/** A tappable row inside a grouped card. */
export function Row({
  title,
  subtitle,
  value,
  right,
  onPress,
  last,
  danger,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  danger?: boolean;
}) {
  const content = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[type.body, { fontSize: 17 }, danger && { color: C.danger }]}>{title}</Text>
        {subtitle && <Text style={type.caption}>{subtitle}</Text>}
      </View>
      {value && <Text style={[type.body, { color: C.muted }]}>{value}</Text>}
      {right}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {content}
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }} />;
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 16 },
  cardHighlight: { borderColor: C.accent, borderWidth: 1.5, shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: F.sansSemi, fontSize: 15 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontFamily: F.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  delta: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  deltaText: { fontFamily: F.monoBold, fontSize: 11 },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 16, gap: 8, minHeight: 124 },
  segment: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R.input, borderWidth: 1, borderColor: C.border, padding: 5, gap: 4 },
  segmentItem: { flex: 1, height: 44, borderRadius: R.segment, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segmentText: { fontFamily: F.sansSemi, fontSize: 15 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: F.sansBold, color: '#FFFFFF' },
  dot: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 5, backgroundColor: C.accent, borderWidth: 2, borderColor: C.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
});
