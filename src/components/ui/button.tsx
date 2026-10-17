import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { C, F, R } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'dark';

const BG: Record<Variant, string> = {
  primary: C.accent,
  secondary: C.text,
  outline: C.raised,
  destructive: 'transparent',
  dark: C.onAccent,
};
const FG: Record<Variant, string> = {
  primary: C.onAccent,
  secondary: C.onAccent,
  outline: C.text,
  destructive: C.danger,
  dark: C.text,
};

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  /** 56 px (default) or 44 px. */
  small?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
  /** Fill the row instead of hugging the label. */
  flex?: boolean;
}

export function Button({ title, onPress, variant = 'primary', small, loading, disabled, icon: Icon, style, flex }: ButtonProps) {
  const off = disabled && !loading;
  const fg = off ? C.muted : FG[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: small ? 44 : 56,
          paddingHorizontal: small ? 16 : 24,
          borderRadius: R.button,
          backgroundColor: off ? C.raised : BG[variant],
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: C.border,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        flex && { flex: 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {Icon && <Icon size={small ? 16 : 20} color={fg} strokeWidth={2.2} />}
          <Text style={[styles.label, { color: fg, fontSize: small ? 15 : 17 }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Round 44 px icon button, e.g. share, close, search. */
export function IconButton({
  icon: Icon,
  onPress,
  label,
  size = 44,
  style,
  children,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  label: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: pressed ? C.border : C.raised },
        style,
      ]}>
      <Icon size={20} color={C.text} strokeWidth={2} />
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: F.sansBold },
  icon: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
});
