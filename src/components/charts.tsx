import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { C, F } from '@/constants/theme';
import { weekdayLetter } from '@/lib/format';

type Point = { key: string; value: number };

/** Weekday letter under each column; the last (today) bold. */
function DayAxis({ points }: { points: Point[] }) {
  const every = Math.ceil(points.length / 7);
  return (
    <View style={styles.axis}>
      {points.map((p, i) => (
        <Text key={p.key} style={[styles.axisText, i === points.length - 1 && { color: C.text, fontFamily: F.monoBold }]}>
          {i % every === 0 || i === points.length - 1 ? weekdayLetter(p.key) : ''}
        </Text>
      ))}
    </View>
  );
}

/** Column chart with the last bar (today, or the peak) in lime. */
export function Bars({ points, height = 112, highlight, labels }: { points: Point[]; height?: number; highlight?: number; labels?: 'days' | string[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const hi = highlight ?? points.length - 1;
  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {points.map((p, i) => (
          <View
            key={p.key}
            accessibilityLabel={`${p.key}: ${p.value}`}
            style={{
              flex: 1,
              height: Math.max(6, (p.value / max) * height),
              borderRadius: points.length > 10 ? 4 : 10,
              backgroundColor: i === hi ? C.accent : C.border,
            }}
          />
        ))}
      </View>
      {labels === 'days' ? (
        <DayAxis points={points} />
      ) : labels ? (
        <View style={[styles.axis, { justifyContent: 'space-between' }]}>
          {labels.map((l) => (
            <Text key={l} style={styles.axisText}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function pathFor(values: number[], w: number, h: number, max: number) {
  if (values.length === 0) return '';
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)} ${(h - (v / max) * h).toFixed(1)}`).join(' ');
}

/** Line chart; `second` draws a dashed white series (link clicks) on the same scale. */
export function LineChart({ points, second, height = 140, fill, gridLabels }: { points: Point[]; second?: Point[]; height?: number; fill?: boolean; gridLabels?: boolean }) {
  const [w, setW] = useState(0);
  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values, ...(second?.map((p) => p.value) ?? [])) * 1.15;
  const main = pathFor(values, w, height, max);
  const last = values.length ? { x: w, y: height - (values[values.length - 1] / max) * height } : null;
  const grid = [0.25, 0.5, 0.75].map((f) => height * f);
  return (
    <View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
        {w > 0 && (
          <Svg width={w} height={height} style={{ overflow: 'visible' }}>
            <Defs>
              <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={C.accent} stopOpacity={0.22} />
                <Stop offset="1" stopColor={C.accent} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {grid.map((y) => (
              <Line key={y} x1={0} x2={w} y1={y} y2={y} stroke={C.border} strokeWidth={1} />
            ))}
            {fill && main && <Path d={`${main} L${w} ${height} L0 ${height} Z`} fill="url(#fill)" />}
            {second && <Path d={pathFor(second.map((p) => p.value), w, height, max)} stroke={C.text} strokeWidth={2} strokeDasharray="6 5" fill="none" />}
            <Path d={main} stroke={C.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            {fill && last && <Circle cx={last.x} cy={last.y} r={5} stroke={C.accent} strokeWidth={2.5} fill={C.card} />}
          </Svg>
        )}
        {gridLabels && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {grid.map((y, i) => (
              <Text key={y} style={[styles.gridLabel, { top: y - 16 }]}>
                {compactAxis(max * (1 - [0.25, 0.5, 0.75][i]))}
              </Text>
            ))}
          </View>
        )}
      </View>
      <DayAxis points={points} />
    </View>
  );
}

function compactAxis(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

/** Horizontal bars with the label on the left and count on the right. */
export function HBars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: 14 }}>
      {rows.map((r, i) => (
        <View key={r.label} style={styles.hrow}>
          <Text style={styles.hlabel} numberOfLines={1}>
            {r.label}
          </Text>
          <View style={styles.htrack}>
            <View style={[styles.hfill, { width: `${(r.value / max) * 100}%`, backgroundColor: i === 0 ? C.accent : C.faint }]} />
          </View>
          <Text style={styles.hvalue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  axis: { flexDirection: 'row', marginTop: 12 },
  axisText: { flex: 1, textAlign: 'center', fontFamily: F.mono, fontSize: 11, color: C.muted },
  gridLabel: { position: 'absolute', left: 0, fontFamily: F.mono, fontSize: 10, color: C.muted },
  hrow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hlabel: { width: 84, fontFamily: F.sans, fontSize: 14, color: C.text },
  htrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: C.border, overflow: 'hidden' },
  hfill: { height: 10, borderRadius: 5 },
  hvalue: { width: 32, textAlign: 'right', fontFamily: F.mono, fontSize: 13, color: C.text },
});
