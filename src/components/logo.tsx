import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { C } from '@/constants/theme';
import { MARK_A, MARK_BOX, MARK_WAVES } from '@/lib/qr';

/** The AmigoTap "A" with lime NFC waves. */
export function Mark({ size = 40, color = C.text, waves = C.accent }: { size?: number; color?: string; waves?: string }) {
  const vb = `${MARK_BOX.x} ${MARK_BOX.y - 20} ${MARK_BOX.w} ${MARK_BOX.h + 20}`;
  return (
    <Svg width={size} height={size} viewBox={vb}>
      <Path d={MARK_A} fill={color} />
      <G fill={waves}>
        {MARK_WAVES.map((d) => (
          <Path key={d.slice(0, 24)} d={d} />
        ))}
      </G>
    </Svg>
  );
}

/** The app-icon tile used on login and the business picker. */
export function LogoTile({ size = 56 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.26,
        backgroundColor: C.raised,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Mark size={size * 0.62} />
    </View>
  );
}
