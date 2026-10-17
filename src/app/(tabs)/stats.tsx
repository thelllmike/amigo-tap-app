import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Bars, HBars, LineChart } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Card, Chip, DeltaPill, Segmented, StatTile } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, R, type } from '@/constants/theme';
import { fetchLinkStats, fetchLinks, series } from '@/lib/data';
import { compact, dayKey, dayOf, delta, hourOf } from '@/lib/format';
import { isRestaurant } from '@/lib/links';
import { linkBadge, linkTitle } from '@/lib/platforms';
import type { LinkStat, Order, SocialLink } from '@/lib/types';
import { useCurrentBusiness } from '@/providers/business';
import { useOrders } from '@/providers/orders';

const RANGES = [
  { key: 1, label: 'Today' },
  { key: 7, label: '7 days' },
  { key: 30, label: '30 days' },
] as const;
type Range = (typeof RANGES)[number]['key'];

export default function Stats() {
  const b = useCurrentBusiness();
  const restaurant = isRestaurant(b);
  const [mode, setMode] = useState<'orders' | 'page'>(restaurant ? 'orders' : 'page');
  const [range, setRange] = useState<Range>(7);
  const [stats, setStats] = useState<LinkStat[]>([]);
  const [links, setLinks] = useState<SocialLink[]>([]);

  useFocusEffect(
    useCallback(() => {
      void fetchLinkStats(b.id, 62).then(setStats);
      void fetchLinks(b.id).then(setLinks).catch(() => {});
    }, [b.id]),
  );

  return (
    <Screen tabs>
      <T v="title" style={{ fontSize: 34, lineHeight: 40, marginTop: 20 }}>
        Stats
      </T>
      {restaurant && (
        <Segmented
          options={[
            { key: 'orders', label: 'Orders' },
            { key: 'page', label: 'Page' },
          ]}
          value={mode}
          onChange={setMode}
        />
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
        <View style={{ width: 12 }} />
        {RANGES.map((r) => (
          <Chip key={r.key} label={r.label} active={range === r.key} onPress={() => setRange(r.key)} />
        ))}
      </ScrollView>
      {mode === 'orders' && restaurant ? <OrderStats range={range} /> : <PageStats range={range} stats={stats} links={links} />}
    </Screen>
  );
}

/** Orders inside the last `days` days, offset by `offset` periods back. */
function inPeriod(orders: Order[], days: number, offset: number) {
  const keys = new Set(Array.from({ length: days }, (_, i) => dayKey(i + offset * days)));
  return orders.filter((o) => keys.has(dayOf(o.created_at)));
}

function OrderStats({ range }: { range: Range }) {
  const { orders } = useOrders();
  const s = useMemo(() => {
    const now = inPeriod(orders, range, 0);
    const before = inPeriod(orders, range, 1);
    const revenue = now.reduce((n, o) => n + Number(o.total || 0), 0);
    const revenueBefore = before.reduce((n, o) => n + Number(o.total || 0), 0);
    const avg = now.length ? revenue / now.length : 0;
    const avgBefore = before.length ? revenueBefore / before.length : 0;

    const byTable = new Map<string, number>();
    for (const o of now) byTable.set(o.table_name ?? 'Takeaway', (byTable.get(o.table_name ?? 'Takeaway') ?? 0) + 1);
    const tables = [...byTable.entries()].sort((a, z) => z[1] - a[1]).map(([label, value]) => ({ label, value }));

    const byHour = Array.from({ length: 14 }, (_, i) => ({ key: String(i + 8), value: 0 }));
    for (const o of now) {
      const h = hourOf(o.created_at);
      if (h >= 8 && h < 22) byHour[h - 8].value += 1;
    }
    const peak = byHour.reduce((best, p, i) => (p.value > byHour[best].value ? i : best), 0);

    const items = new Map<string, { qty: number; revenue: number }>();
    for (const o of now)
      for (const i of o.items) {
        const cur = items.get(i.name) ?? { qty: 0, revenue: 0 };
        items.set(i.name, { qty: cur.qty + i.qty, revenue: cur.revenue + i.qty * i.price });
      }
    const top = [...items.entries()].sort((a, z) => z[1].qty - a[1].qty).slice(0, 5);

    const days = Math.max(range, 7);
    const daily = Array.from({ length: days }, (_, i) => {
      const key = dayKey(days - 1 - i);
      return { key, value: orders.filter((o) => dayOf(o.created_at) === key).reduce((n, o) => n + Number(o.total || 0), 0) };
    });

    return { now, before, revenue, revenueBefore, avg, avgBefore, tables, byHour, peak, top, daily, currency: now[0]?.currency ?? 'LKR' };
  }, [orders, range]);

  const period = range === 1 ? 'yesterday' : `last ${range} days`;
  const peakHour = Number(s.byHour[s.peak].key);

  return (
    <>
      <View style={styles.grid}>
        <View style={styles.tile}>
          <Text style={type.label}>Revenue</Text>
          <Text style={[type.number, { fontSize: 22 }]} numberOfLines={1} adjustsFontSizeToFit>
            {s.currency} {compact(s.revenue)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <DeltaPill value={delta(s.revenue, s.revenueBefore)} />
            <Text style={type.caption}>vs {period}</Text>
          </View>
        </View>
        <StatTile label="Orders" value={String(s.now.length)} delta={delta(s.now.length, s.before.length)} />
      </View>
      <View style={styles.grid}>
        <StatTile label="Avg order" unit={s.currency} value={Math.round(s.avg).toLocaleString('en-US')} delta={delta(Math.round(s.avg), Math.round(s.avgBefore))} />
        <StatTile label="Busiest table" value={s.tables[0]?.label ?? '—'} foot={s.tables[0] ? `${s.tables[0].value} orders` : 'No orders yet'} />
      </View>

      <Card style={{ gap: 16 }}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Revenue over time</Text>
          <Text style={[type.label, { textTransform: 'none' }]}>{s.currency} · daily</Text>
        </View>
        <LineChart points={s.daily} fill gridLabels />
      </Card>

      <Card style={{ gap: 16 }}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Orders by hour</Text>
          {s.byHour[s.peak].value > 0 && (
<Text style={styles.peak}>Peak {hourRange(peakHour)}</Text>
          )}
        </View>
        <Bars points={s.byHour} height={100} highlight={s.peak} labels={['8a', '12p', '4p', '9p']} />
      </Card>

      {s.tables.length > 0 && (
        <Card style={{ gap: 16 }}>
          <Text style={styles.cardTitle}>Orders by table</Text>
          <HBars rows={s.tables.slice(0, 6)} />
        </Card>
      )}

      {s.top.length > 0 && (
        <Card style={{ gap: 4 }}>
          <Text style={[styles.cardTitle, { marginBottom: 8 }]}>Top items</Text>
          {s.top.map(([name, v], i) => (
            <View key={name} style={[styles.topRow, i < s.top.length - 1 && styles.divider]}>
              <Text style={styles.rank}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={type.caption}>{v.qty} sold</Text>
              </View>
              <Text style={styles.itemRev}>
                {s.currency} {compact(v.revenue)}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

/** "12–1 pm" for the hour starting at `h` (0–23). */
function hourRange(h: number) {
  const twelve = (x: number) => x % 12 || 12;
  const end = h + 1;
  return `${twelve(h)}–${twelve(end)} ${end >= 12 && end < 24 ? 'pm' : 'am'}`;
}

function PageStats({ range, stats, links }: { range: Range; stats: LinkStat[]; links: SocialLink[] }) {
  const days = Math.max(range, 7);
  const views = series(stats, days, (s) => s.link_id === null);
  const clicks = series(stats, days, (s) => s.link_id !== null);
  const inRange = (p: { key: string }) => views.slice(-range).some((v) => v.key === p.key);
  const totalViews = views.filter(inRange).reduce((n, p) => n + p.value, 0);
  const totalClicks = clicks.filter(inRange).reduce((n, p) => n + p.value, 0);
  const today = dayKey(0);
  const rangeKeys = new Set(Array.from({ length: range }, (_, i) => dayKey(i)));

  const perLink = links
    .map((l) => {
      const mine = stats.filter((s) => s.link_id === l.id);
      return {
        link: l,
        today: mine.filter((s) => s.day === today).reduce((n, s) => n + s.count, 0),
        total: mine.filter((s) => rangeKeys.has(s.day)).reduce((n, s) => n + s.count, 0),
      };
    })
    .sort((a, z) => z.total - a.total);

  return (
    <>
      <Card style={{ gap: 14 }}>
        <Text style={styles.cardTitle}>Views & clicks</Text>
        <View style={{ flexDirection: 'row', gap: 32 }}>
          <Legend label="Page views" value={totalViews} dashed={false} />
          <Legend label="Link clicks" value={totalClicks} dashed />
        </View>
        <LineChart points={views} second={clicks} height={150} />
      </Card>

      <Card style={{ gap: 4 }}>
        <Text style={[styles.cardTitle, { marginBottom: 12 }]}>Per link</Text>
        <View style={[styles.linkRow, styles.divider, { paddingTop: 0 }]}>
          <Text style={[type.label, { flex: 1 }]}>Link</Text>
          <Text style={[type.label, styles.num]}>Today</Text>
          <Text style={[type.label, styles.num]}>Total</Text>
          <Text style={[type.label, styles.num]}>CTR</Text>
        </View>
        {perLink.length === 0 && <Text style={[type.caption, { paddingVertical: 12 }]}>No links yet.</Text>}
        {perLink.map(({ link, today: t, total }, i) => {
          const badge = linkBadge(link.platform, link.label);
          const ctr = totalViews ? Math.round((total / totalViews) * 100) : 0;
          return (
            <View key={link.id} style={[styles.linkRow, i < perLink.length - 1 && styles.divider]}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.code, { backgroundColor: badge.color }]}>
                  <Text style={styles.codeText}>{badge.code}</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>
                  {linkTitle(link.platform, link.label)}
                </Text>
              </View>
              <Text style={[styles.mono, styles.num]}>{t}</Text>
              <Text style={[styles.mono, styles.num, { color: C.muted }]}>{compact(total)}</Text>
              <Text style={[styles.mono, styles.num, i === 0 && ctr > 0 && { color: C.accent }]}>{ctr}%</Text>
            </View>
          );
        })}
      </Card>
    </>
  );
}

function Legend({ label, value, dashed }: { label: string; value: number; dashed: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 16, height: 3, backgroundColor: dashed ? 'transparent' : C.accent, borderTopWidth: dashed ? 2 : 0, borderStyle: 'dashed', borderColor: C.text }} />
        <Text style={type.caption}>{label}</Text>
      </View>
      <Text style={[type.number, { fontSize: 26 }]}>{value.toLocaleString('en-US')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.border, padding: 16, gap: 8, minHeight: 124 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: F.sansSemi, fontSize: 18, color: C.text },
  peak: { fontFamily: F.mono, fontSize: 13, color: C.accent },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rank: { fontFamily: F.mono, fontSize: 13, color: C.muted, width: 22 },
  itemName: { fontFamily: F.sansSemi, fontSize: 16, color: C.text, flexShrink: 1 },
  itemRev: { fontFamily: F.monoBold, fontSize: 15, color: C.text },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  num: { width: 52, textAlign: 'right' },
  mono: { fontFamily: F.mono, fontSize: 15, color: C.text },
  code: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontFamily: F.monoBold, fontSize: 11, color: '#FFFFFF' },
});
