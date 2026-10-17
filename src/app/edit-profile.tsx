import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Check, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BackHeader, Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { Avatar, Badge } from '@/components/ui/surface';
import { C, F, R, THEME_SWATCHES, type } from '@/constants/theme';
import { SITE_URL } from '@/lib/config';
import { slugTaken, updateBusiness, uploadImage } from '@/lib/data';
import { pageUrl } from '@/lib/links';
import type { Business, PageTemplate } from '@/lib/types';
import { useAuth } from '@/providers/auth';
import { useBusinesses, useCurrentBusiness } from '@/providers/business';

const MAX_DESC = 160;
const TEMPLATES: { key: PageTemplate; name: string; bg: string; bar: string; dot: string }[] = [
  { key: 'classic', name: 'Classic', bg: '#F5F5F5', bar: '#333333', dot: 'theme' },
  { key: 'bistro', name: 'Bistro', bg: '#1C1C1C', bar: '#DDDDDD', dot: 'theme' },
  { key: 'chalkboard', name: 'Chalkboard', bg: '#2B3A33', bar: '#F0EDE4', dot: '#F0EDE4' },
  { key: 'coast', name: 'Coast', bg: '#DCEBF2', bar: '#2E5D73', dot: 'theme' },
  { key: 'leaf', name: 'Leaf', bg: '#E8F0E1', bar: '#3E6B3A', dot: 'theme' },
  { key: 'blossom', name: 'Blossom', bg: '#F8E6EC', bar: '#9C3B5E', dot: 'theme' },
  { key: 'arch', name: 'Arch', bg: '#F2E8DA', bar: '#7A5A3A', dot: 'theme' },
  { key: 'campus', name: 'Campus', bg: '#E9ECF5', bar: '#2D3A6B', dot: 'theme' },
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '');

export default function EditProfile() {
  const b = useCurrentBusiness();
  const { patch } = useBusinesses();
  const { session } = useAuth();
  const [name, setName] = useState(b.name);
  const [description, setDescription] = useState(b.description ?? '');
  const [color, setColor] = useState(b.theme_color || THEME_SWATCHES[0]);
  const [hexOpen, setHexOpen] = useState(!THEME_SWATCHES.includes(b.theme_color));
  const [slug, setSlug] = useState(b.slug);
  const [checked, setChecked] = useState<{ slug: string; taken: boolean } | null>(null);
  const [avatar, setAvatar] = useState(b.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [template, setTemplate] = useState<PageTemplate>(b.page_config?.template ?? 'classic');
  const [saving, setSaving] = useState(false);

  // Check the page link as the owner types, like the web editor.
  const slugValid = /^[a-z0-9][a-z0-9-]+$/.test(slug) && !slug.endsWith('-');
  const slugState: 'same' | 'checking' | 'free' | 'taken' | 'invalid' =
    slug === b.slug ? 'same' : !slugValid ? 'invalid' : checked?.slug !== slug ? 'checking' : checked.taken ? 'taken' : 'free';
  useEffect(() => {
    if (slug === b.slug || !slugValid) return;
    let live = true;
    const t = setTimeout(() => {
      void slugTaken(slug, b.id).then((taken) => live && setChecked({ slug, taken }));
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [slug, slugValid, b.slug, b.id]);

  const validHex = /^#[0-9a-f]{6}$/i.test(color);
  const dirty =
    name !== b.name ||
    description !== (b.description ?? '') ||
    color !== b.theme_color ||
    slug !== b.slug ||
    avatar !== b.avatar_url ||
    (b.type === 'linkpage' && template !== (b.page_config?.template ?? 'classic'));

  async function pickLogo() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
    if (res.canceled || !res.assets[0]?.base64 || !session) return;
    setUploading(true);
    try {
      const asset = res.assets[0];
      setAvatar(await uploadImage('avatars', session.user.id, asset.base64!, asset.mimeType ?? 'image/jpeg'));
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : '');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name.trim()) return Alert.alert('Add a business name');
    if (!validHex) return Alert.alert('Theme colour must look like #B5441B');
    if (slugState === 'taken' || slugState === 'invalid' || slugState === 'checking') return Alert.alert('Pick an available page link');
    setSaving(true);
    const next: Partial<Business> = {
      name: name.trim(),
      description: description.trim() || null,
      theme_color: color,
      slug,
      avatar_url: avatar,
    };
    if (b.type === 'linkpage') next.page_config = { ...(b.page_config ?? {}), template };
    try {
      await updateBusiness(b.id, next);
      patch({ ...b, ...next });
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save', e instanceof Error ? e.message : '');
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        footer={
          <>
            <Button title="Preview ↗" variant="outline" onPress={() => WebBrowser.openBrowserAsync(pageUrl(b.slug))} />
            <Button title="Save changes" onPress={save} loading={saving} disabled={!dirty} flex />
          </>
        }>
        <BackHeader title="Edit profile" small center right={dirty ? <Text style={[type.label, { width: 48 }]}>Draft</Text> : <View style={{ width: 48 }} />} />

        <View style={[styles.cover, { backgroundColor: validHex ? color : C.raised }]}>
          <View style={styles.coverWave} />
          <Pressable onPress={pickLogo} style={styles.logo} accessibilityRole="button" accessibilityLabel="Change logo">
            {uploading ? <ActivityIndicator color={C.onAccent} /> : <Avatar name={name || b.name} uri={avatar} color={validHex ? color : C.raised} size={84} />}
            <View style={styles.plus}>
              <Plus size={18} color={C.onAccent} strokeWidth={3} />
            </View>
          </Pressable>
        </View>

        <Field label="Business name" value={name} onChangeText={setName} maxLength={60} />
        <Field
          label="Description"
          labelAccessory={<Text style={type.label}>{`${description.length}/${MAX_DESC}`}</Text>}
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, MAX_DESC))}
          multiline
          placeholder="What you do, hours, where to find you."
        />

        <View style={{ gap: 10 }}>
          <Text style={type.label}>Theme colour</Text>
          <View style={styles.swatches}>
            {THEME_SWATCHES.map((c) => (
              <Pressable key={c} onPress={() => setColor(c)} accessibilityLabel={`Colour ${c}`} accessibilityState={{ selected: c === color }} style={[styles.swatchRing, c === color && { borderColor: C.accent }]}>
                <View style={[styles.swatch, { backgroundColor: c }]} />
              </Pressable>
            ))}
            <Pressable onPress={() => setHexOpen(true)} style={[styles.swatchRing, styles.hex, hexOpen && { borderColor: C.accent, borderStyle: 'solid' }]} accessibilityLabel="Custom hex colour">
              <Text style={styles.hexText}>HEX</Text>
            </Pressable>
          </View>
          {hexOpen && (
            <Field value={color} onChangeText={(t) => setColor(t.startsWith('#') ? t : `#${t}`)} autoCapitalize="none" autoCorrect={false} maxLength={7} mono error={validHex ? null : 'Six hex digits, e.g. #B5441B'} />
          )}
        </View>

        <Field
          label="Page link"
          prefix={`${SITE_URL.replace(/^https?:\/\//, '')}/linktree/`}
          value={slug}
          onChangeText={(t) => setSlug(slugify(t))}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ paddingLeft: 2, fontFamily: F.monoBold, fontSize: 14 }}
          right={slugState === 'free' || slugState === 'same' ? <Check size={20} color={C.accent} style={{ marginRight: 16 }} /> : slugState === 'checking' ? <ActivityIndicator color={C.muted} style={{ marginRight: 16 }} /> : null}
          error={slugState === 'taken' ? 'Taken — try another' : slugState === 'invalid' ? 'Letters, numbers and dashes only' : null}
          hint={slugState === 'free' ? <Text style={{ fontFamily: F.sans, fontSize: 14, color: C.accent }}>Available</Text> : slug !== b.slug ? undefined : 'Changing it breaks links already printed on cards.'}
        />

        {b.type === 'linkpage' && (
          <View style={{ gap: 10 }}>
            <Text style={type.label}>Template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }} style={{ marginRight: -20 }}>
              {TEMPLATES.map((t) => {
                const on = t.key === template;
                const dot = t.dot === 'theme' ? (validHex ? color : '#B5441B') : t.dot;
                return (
                  <Pressable key={t.key} onPress={() => setTemplate(t.key)} style={[styles.tpl, on && styles.tplOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <View style={[styles.tplPreview, { backgroundColor: t.bg }]}>
                      <View style={[styles.tplDot, { backgroundColor: dot }]} />
                      <View style={[styles.tplLine, { backgroundColor: t.bar, width: '60%', height: 5 }]} />
                      <View style={[styles.tplLine, { backgroundColor: t.bar }]} />
                      <View style={[styles.tplLine, { backgroundColor: t.bar, opacity: 0.6 }]} />
                      <View style={[styles.tplLine, { backgroundColor: t.bar, opacity: 0.4 }]} />
                    </View>
                    <Text style={styles.tplName}>{t.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
        {b.type !== 'linkpage' && <Badge label="Card and social tree designs are edited on amigotap.com" />}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  cover: { height: 160, borderRadius: R.card + 4, overflow: 'visible', marginBottom: 36 },
  coverWave: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, borderBottomLeftRadius: R.card + 4, borderBottomRightRadius: R.card + 4, backgroundColor: 'rgba(0,0,0,0.18)' },
  logo: { position: 'absolute', left: 18, bottom: -36, padding: 6, borderRadius: 28, backgroundColor: '#FFFFFF' },
  plus: { position: 'absolute', right: -8, bottom: -8, width: 34, height: 34, borderRadius: 17, backgroundColor: C.accent, borderWidth: 3, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  hex: { borderStyle: 'dashed', borderColor: C.faint, borderWidth: 1.5 },
  hexText: { fontFamily: F.monoBold, fontSize: 12, color: C.text },
  tpl: { width: 130, padding: 8, gap: 8, borderRadius: R.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tplOn: { borderColor: C.accent, borderWidth: 1.5 },
  tplPreview: { height: 150, borderRadius: 14, alignItems: 'center', paddingTop: 14, gap: 8 },
  tplDot: { width: 28, height: 28, borderRadius: 14 },
  tplLine: { width: '82%', height: 16, borderRadius: 8 },
  tplName: { fontFamily: F.sansSemi, fontSize: 15, color: C.text, paddingHorizontal: 4 },
});
