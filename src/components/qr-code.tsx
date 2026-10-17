import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { MARK_A, MARK_WAVES, qrGeometry } from '@/lib/qr';

export interface QrHandle {
  /** PNG of the code as base64 (no data: prefix). */
  toPngBase64: (px?: number) => Promise<string>;
}

/** The AmigoTap QR design, drawn natively so it can be snapshotted to PNG. */
export const QrCode = forwardRef<QrHandle, { value: string; size: number; logo?: boolean }>(function QrCode({ value, size, logo = true }, ref) {
  const g = useMemo(() => qrGeometry(value, logo), [value, logo]);
  const svg = useRef<Svg>(null);

  useImperativeHandle(ref, () => ({
    toPngBase64: (px = 1000) =>
      new Promise((resolve, reject) => {
        if (!svg.current) return reject(new Error('QR not ready'));
        svg.current.toDataURL((data: string) => resolve(data), { width: px, height: px });
      }),
  }));

  return (
    <Svg ref={svg} width={size} height={size} viewBox={`0 0 ${g.size} ${g.size}`}>
      <Rect width={g.size} height={g.size} fill="#FFFFFF" />
      <G fill="#000000">
        <Path d={g.body} />
        <Path d={g.frames} fillRule="evenodd" />
        {g.balls.map((b) => (
          <Circle key={`${b.cx}-${b.cy}`} cx={b.cx} cy={b.cy} r={b.r} />
        ))}
      </G>
      {g.logo && (
        <>
          <Rect x={g.logo.x} y={g.logo.y} width={g.logo.w} height={g.logo.w} rx={g.logo.rx} fill="#FFFFFF" />
          <G transform={`translate(${g.logo.tx} ${g.logo.ty}) scale(${g.logo.scale})`} fill="#000000">
            {[MARK_A, ...MARK_WAVES].map((d) => (
              <Path key={d.slice(0, 24)} d={d} />
            ))}
          </G>
        </>
      )}
    </Svg>
  );
});
