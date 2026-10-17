import type { TextStyle } from 'react-native';

/** AmigoTap Owner App palette — see the Spec page of the design. */
export const C = {
  bg: '#0A0A0A',
  card: '#141414',
  raised: '#1C1C1C',
  border: '#2A2A2A',
  text: '#F5F5F5',
  muted: '#888888',
  /** Disabled outlines and decoration only — never readable text (2.5:1). */
  faint: '#555555',
  accent: '#C8FF00',
  onAccent: '#0A0A0A',
  danger: '#FF6B6B',
  pending: '#FFB547',
  preparing: '#A9B8FF',
  scrim: 'rgba(0,0,0,0.6)',
} as const;

export const F = {
  display: 'BricolageGrotesque_700Bold',
  sans: 'DMSans_400Regular',
  sansSemi: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;

/** 4 pt spacing scale. */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, gutter: 20, sheet: 24, xl: 32 } as const;

export const R = { segment: 10, input: 14, button: 16, card: 20, sheet: 28 } as const;

export const type = {
  display: { fontFamily: F.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, color: C.text },
  title: { fontFamily: F.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.5, color: C.text },
  section: { fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.text },
  row: { fontFamily: F.sansSemi, fontSize: 16, lineHeight: 22, color: C.text },
  body: { fontFamily: F.sans, fontSize: 15, lineHeight: 22, color: C.text },
  caption: { fontFamily: F.sans, fontSize: 13, lineHeight: 19, color: C.muted },
  number: { fontFamily: F.monoBold, fontSize: 26, lineHeight: 32, color: C.text },
  label: { fontFamily: F.mono, fontSize: 11, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase', color: C.muted },
} satisfies Record<string, TextStyle>;

/** Brand colours offered as page theme swatches in Edit profile. */
export const THEME_SWATCHES = ['#B5441B', '#3C6B5E', '#B0216A', '#3550E0', '#3E6E3A', '#2A2A2A'];
