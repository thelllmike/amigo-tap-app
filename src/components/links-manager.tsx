import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GripVertical, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { BackHeader, Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, R, type } from '@/constants/theme';
import { deleteLink, fetchLinkStats, fetchLinks, reorderLinks, setLinkActive } from '@/lib/data';
import { compact } from '@/lib/format';
import { KIND_LABEL, businessKind } from '@/lib/links';
import { linkBadge, linkSubtitle, linkTitle } from '@/lib/platforms';
import type { LinkStat, SocialLink } from '@/lib/types';
import { useCurrentBusiness } from '@/providers/business';

const ROW = 88;
const GAP = 12;
const STEP = ROW + GAP;

/** The Links editor: a tab for link pages, a pushed screen for restaurants. */
export function LinksManager({ pushed }: { pushed?: boolean }) {
  const b = useCurrentBusiness();
  const [links, setLinks] = useState<SocialLink[] | null>(null);
  const [stats, setStats] = useState<LinkStat[]>([]);
  const [drag, setDrag] = useState<{ index: number; dy: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, s] = await Promise.all([fetchLinks(b.id), fetchLinkStats(b.id, 365)]);
      setLinks(l);
      setStats(s);
    } catch (e) {
      Alert.alert('Couldn’t load links', e instanceof Error ? e.message : '');
      setLinks([]);
    }
  }, [b.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const clicks = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of stats) if (s.link_id) m[s.link_id] = (m[s.link_id] ?? 0) + s.count;
    return m;
  }, [stats]);

  const target = drag && links ? Math.max(0, Math.min(links.length - 1, drag.index + Math.round(drag.dy / STEP))) : null;

  function offsetFor(i: number) {
    if (!drag || target === null || i === drag.index) return 0;
    if (drag.index < target && i > drag.index && i <= target) return -STEP;
    if (drag.index > target && i < drag.index && i >= target) return STEP;
    return 0;
  }

  async function drop(from: number, dy: number) {
    setDrag(null);
    if (!links) return;
    const to = Math.max(0, Math.min(links.length - 1, from + Math.round(dy / STEP)));
    if (to === from) return;
    const next = [...links];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const before = links;
    setLinks(next);
    void Haptics.selectionAsync();
    try {
      await reorderLinks(next.map((l) => l.id));
    } catch (e) {
      setLinks(before);
      Alert.alert('Couldn’t save the new order', e instanceof Error ? e.message : '');
    }
  }

  async function toggle(link: SocialLink, on: boolean) {
    setLinks((list) => list?.map((l) => (l.id === link.id ? { ...l, is_active: on } : l)) ?? null);
    try {
      await setLinkActive(link.id, on);
    } catch (e) {
      setLinks((list) => list?.map((l) => (l.id === link.id ? { ...l, is_active: !on } : l)) ?? null);
      Alert.alert('Couldn’t update the link', e instanceof Error ? e.message : '');
    }
  }

  function remove(link: SocialLink) {
    Alert.alert(`Remove ${linkTitle(link.platform, link.label)}?`, 'It disappears from your page right away.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLink(link.id);
            setLinks((list) => list?.filter((l) => l.id !== link.id) ?? null);
          } catch (e) {
            Alert.alert('Couldn’t remove the link', e instanceof Error ? e.message : '');
          }
        },
      },
    ]);
  }

  return (
    <Screen tabs={!pushed} onRefresh={load} refreshing={false}>
      {pushed && <BackHeader title="" />}
      <View style={[styles.head, pushed && { marginTop: 0 }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={type.label} numberOfLines={1}>
            {b.name} · {KIND_LABEL[businessKind(b)]}
          </Text>
          <T v="title" style={{ fontSize: 34, lineHeight: 40 }}>
            Links
          </T>
        </View>
        <Button title="Add link" icon={Plus} small onPress={() => router.push('/add-link')} style={{ height: 52 }} />
      </View>
      <T style={{ color: C.muted }}>Drag ⋮⋮ to reorder. Long-press a link to remove it. Changes go live instantly.</T>

      {links === null ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : links.length === 0 ? (
        <View style={{ gap: 12, marginTop: 20 }}>
          <T v="section">No links yet</T>
          <T style={{ color: C.muted }}>Add WhatsApp, Instagram, your menu and more. They show on your page in this order.</T>
        </View>
      ) : (
        <View style={{ height: links.length * STEP - GAP }}>
          {links.map((link, i) => (
            <LinkRow
              key={link.id}
              link={link}
              index={i}
              clicks={clicks[link.id] ?? 0}
              dragging={drag?.index === i}
              dy={drag?.index === i ? drag.dy : offsetFor(i)}
              onDrag={(dy) => setDrag({ index: i, dy })}
              onDrop={(dy) => drop(i, dy)}
              onToggle={(on) => toggle(link, on)}
              onLongPress={() => remove(link)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function LinkRow({
  link,
  index,
  clicks,
  dragging,
  dy,
  onDrag,
  onDrop,
  onToggle,
  onLongPress,
}: {
  link: SocialLink;
  index: number;
  clicks: number;
  dragging: boolean;
  dy: number;
  onDrag: (dy: number) => void;
  onDrop: (dy: number) => void;
  onToggle: (on: boolean) => void;
  onLongPress: () => void;
}) {
  const badge = linkBadge(link.platform, link.label);
  // The parent passes fresh callbacks each render; keep the gesture itself
  // stable so a re-render mid-drag doesn't cancel it.
  const handlers = useRef({ onDrag, onDrop });
  useEffect(() => {
    handlers.current = { onDrag, onDrop };
  });
  /* eslint-disable react-hooks/refs -- handlers.current is read in gesture callbacks, never during render */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handlers.current.onDrag(0);
        })
        .onUpdate((e) => handlers.current.onDrag(e.translationY))
        .onFinalize((e) => handlers.current.onDrop(e.translationY)),
    [],
  );
  /* eslint-enable react-hooks/refs */
  const off = !link.is_active;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[
        styles.row,
        { top: index * STEP, transform: [{ translateY: dy }, { scale: dragging ? 1.03 : 1 }] },
        dragging && styles.rowDragging,
      ]}>
      <GestureDetector gesture={pan}>
        <View style={styles.grip} accessibilityLabel={`Reorder ${linkTitle(link.platform, link.label)}`} accessibilityRole="adjustable">
          <GripVertical size={24} color={C.muted} />
        </View>
      </GestureDetector>
      <View style={[styles.code, { backgroundColor: off ? C.raised : badge.color }]}>
        <Text style={[styles.codeText, off && { color: C.muted }]}>{badge.code}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, off && { color: C.muted }]} numberOfLines={1}>
          {linkTitle(link.platform, link.label)}
        </Text>
        <Text style={[styles.sub, off && { color: C.faint }]} numberOfLines={1}>
          {linkSubtitle(link.url)}
        </Text>
      </View>
      <Text style={[styles.count, off && { color: C.faint }]}>{compact(clicks)}</Text>
      <Toggle value={link.is_active} onChange={onToggle} label={`Show ${linkTitle(link.platform, link.label)}`} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 20 },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 16,
    borderRadius: R.card + 4,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  rowDragging: { zIndex: 10, borderColor: C.accent, borderWidth: 1.5, backgroundColor: C.raised, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  grip: { width: 44, height: ROW, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  code: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontFamily: F.monoBold, fontSize: 15, color: '#FFFFFF' },
  title: { fontFamily: F.sansSemi, fontSize: 19, color: C.text },
  sub: { fontFamily: F.mono, fontSize: 13, color: C.muted },
  count: { fontFamily: F.mono, fontSize: 15, color: C.muted },
});
