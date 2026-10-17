import { Text, type TextProps } from 'react-native';

import { type } from '@/constants/theme';

export type TextVariant = keyof typeof type;

/** Text in one of the design's type styles. */
export function T({ v = 'body', style, ...rest }: TextProps & { v?: TextVariant }) {
  return <Text {...rest} style={[type[v], style]} />;
}
