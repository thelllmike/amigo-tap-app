import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Download, Plus, Search, Share as ShareIcon } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QrCode, type QrHandle } from '@/components/qr-code';
import { BackHeader, Screen } from '@/components/screen';
import { Button, IconButton } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { Badge, Chip, Segmented, Toggle } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, R, type } from '@/constants/theme';
import { fetchMenu, setItemAvailable } from '@/lib/data';
import { tableUrl } from '@/lib/links';
import { shareFile } from '@/lib/share-file';
import type { MenuCategory, MenuItem, RestaurantTable } from '@/lib/types';
import { useCurrentBusiness } from '@/providers/business';
import { useOrders } from '@/providers/orders';

type Menu = { categories: MenuCategory[]; items: MenuItem[]; tables: RestaurantTable[] };

export default function MenuScreen() {
  const b = useCurrentBusiness();
  const params = useLocalSearchParams<{ tab?: string }>();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'items' | 'tables'>(params.tab === 'tables' ? 'tables' : 'items');
  const [menu, setMenu] = useState<Menu | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMenu(b.id)
        .then(setMenu)
        .catch((e) => Alert.alert('Couldn’t load the menu', e instanceof Error ? e.message : ''));
    }, [b.id]),
  );

  const activeCat = category ?? menu?.categories[0]?.id ?? null;
  const items = useMemo(() => {
    if (!menu) return [];
    if (query?.trim()) return menu.items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase()));
    if (!menu.categories.length) return menu.items;
    return menu.items.filter((i) => i.category_id === activeCat);
  }, [menu, activeCat, query]);

  async function toggle(item: MenuItem, on: boolean) {
    setMenu((m) => m && { ...m, items: m.items.map((i) => (i.id === item.id ? { ...i, is_available: on } : i)) });
    try {
      await setItemAvailable(item.id, on);
    } catch (e) {
      setMenu((m) => m && { ...m, items: m.items.map((i) => (i.id === item.id ? { ...i, is_available: !on } : i)) });
      Alert.alert('Couldn’t update the item', e instanceof Error ? e.message : '');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen>
        <BackHeader
          title="Menu"
          right={
            tab === 'items' ? (
              <IconButton icon={Search} label="Search items" onPress={() => setQuery((q) => (q === null ? '' : null))} />
            ) : (
              <Button title="Share all" small variant="outline" onPress={() => shareAllTables(b.slug, menu?.tables ?? [])} />
            )
          }
        />
        <Segmented
          options={[
            { key: 'items', label: `Items · ${menu?.items.length ?? '–'}` },
            { key: 'tables', label: `Tables · ${menu?.tables.length ?? '–'}` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {!menu ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
        ) : tab === 'items' ? (
          <>
            {query !== null && <Field value={query} onChangeText={setQuery} placeholder="Search the menu" autoFocus autoCorrect={false} />}
            {query === null && menu.categories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
                {menu.categories.map((c) => (
                  <Chip key={c.id} light label={c.name} count={menu.items.filter((i) => i.category_id === c.id).length} active={c.id === activeCat} onPress={() => setCategory(c.id)} />
                ))}
              </ScrollView>
            )}
            {items.length === 0 && <T style={{ color: C.muted }}>{menu.items.length ? 'Nothing matches.' : 'No items yet. Add your first dish.'}</T>}
            <View style={{ gap: 12, paddingBottom: 90 }}>
              {items.map((item) => (
                <ItemRow key={item.id} item={item} onToggle={(on) => toggle(item, on)} onPress={() => router.push({ pathname: '/menu-item', params: { id: item.id } })} />
              ))}
            </View>
          </>
        ) : (
          <Tables slug={b.slug} tables={menu.tables} />
        )}
      </Screen>

      {tab === 'items' && menu && (
        <View style={[styles.fab, { bottom: insets.bottom + 20 }]}>
          <Button title="Add item" icon={Plus} onPress={() => router.push({ pathname: '/menu-item', params: activeCat ? { categoryId: activeCat } : {} })} style={{ borderRadius: 28, paddingHorizontal: 28 }} />
        </View>
      )}
    </View>
  );
}

function ItemRow({ item, onToggle, onPress }: { item: MenuItem; onToggle: (on: boolean) => void; onPress: () => void }) {
  const off = !item.is_available;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && { backgroundColor: C.raised }]} accessibilityRole="button">
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={[styles.photo, off && { opacity: 0.5 }]} contentFit="cover" />
      ) : (
        <View style={[styles.photo, { backgroundColor: '#B98A4A', opacity: off ? 0.5 : 1 }]} />
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.itemName, off && { color: C.muted }]} numberOfLines={1}>
          {item.name}
        </Text>
        {!!item.description && (
          <Text style={type.caption} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <Text style={[styles.price, off && { color: C.muted }]}>
            {item.currency} {item.price != null ? Number(item.price).toLocaleString('en-US') : '—'}
          </Text>
          {off && <Badge label="Sold out" tone="danger" />}
        </View>
      </View>
      <Toggle value={item.is_available} onChange={onToggle} label={`${item.name} available`} />
    </Pressable>
  );
}

function Tables({ slug, tables }: { slug: string; tables: RestaurantTable[] }) {
  const { orders } = useOrders();
  const open = (t: RestaurantTable) => orders.filter((o) => o.table_id === t.id && o.status !== 'completed').length;
  if (tables.length === 0) return <T style={{ color: C.muted }}>No tables yet. Add them on amigotap.com under Menu › Tables.</T>;
  return (
    <>
      <T style={{ color: C.muted }}>Each table has its own QR and NFC link, so orders arrive with the table name.</T>
      <View style={styles.tables}>
        {tables.map((t) => (
          <TableCard key={t.id} table={t} url={tableUrl(slug, t.slug)} open={open(t)} />
        ))}
      </View>
    </>
  );
}

function TableCard({ table, url, open }: { table: RestaurantTable; url: string; open: number }) {
  const qr = useRef<QrHandle>(null);
  async function save() {
    try {
      const png = await qr.current?.toPngBase64(1000);
      if (png) await shareFile(`${table.slug}.png`, png, { base64: true, mimeType: 'image/png', uti: 'public.png' });
    } catch (e) {
      Alert.alert('Couldn’t export', e instanceof Error ? e.message : '');
    }
  }
  return (
    <View style={styles.table}>
      <View style={styles.tableQr}>
        <QrCode ref={qr} value={url} size={128} logo={false} />
      </View>
      <View style={styles.tableHead}>
        <Text style={styles.tableName} numberOfLines={1}>
          {table.name}
        </Text>
        <Text style={[styles.tableState, open > 0 && { color: C.accent }]}>{open > 0 ? `${open} open` : 'free'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable style={styles.tableBtn} onPress={save} accessibilityLabel={`Save ${table.name} QR`}>
          <Download size={20} color={C.text} />
        </Pressable>
        <Pressable style={styles.tableBtn} onPress={() => Share.share({ message: url, url })} accessibilityLabel={`Share ${table.name} link`}>
          <ShareIcon size={20} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

function shareAllTables(slug: string, tables: RestaurantTable[]) {
  if (!tables.length) return;
  const text = tables.map((t) => `${t.name}: ${tableUrl(slug, t.slug)}`).join('\n');
  void Share.share({ message: text });
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: R.card + 2, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  photo: { width: 82, height: 82, borderRadius: 16 },
  itemName: { fontFamily: F.sansSemi, fontSize: 18, color: C.text },
  price: { fontFamily: F.monoBold, fontSize: 16, color: C.text },
  fab: { position: 'absolute', right: 20 },
  tables: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  table: { width: '48%', flexGrow: 1, padding: 14, gap: 12, borderRadius: R.card + 2, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tableQr: { backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  tableHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tableName: { fontFamily: F.sansSemi, fontSize: 17, color: C.text, flexShrink: 1 },
  tableState: { fontFamily: F.mono, fontSize: 13, color: C.muted },
  tableBtn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
