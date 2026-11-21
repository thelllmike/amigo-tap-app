import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { T } from '@/components/ui/text';
import { C, F, R, S, type } from '@/constants/theme';
import { addLink, deleteLink, fetchLink, updateLink } from '@/lib/data';
import { PLATFORMS, inputFromUrl, linkTitle, platformForLink, type PlatformDef } from '@/lib/platforms';
import type { SocialLink } from '@/lib/types';
import { useCurrentBusiness } from '@/providers/business';

/**
 * Adds a link, or edits one when opened with ?id=.
 * The box and the save button sit above the platform tiles, so the keyboard
 * never covers what you're typing.
 */
export default function AddLink() {
  const b = useCurrentBusiness();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [existing, setExisting] = useState<SocialLink | null>(null);
  const [loading, setLoading] = useState(editing);
  const [def, setDef] = useState<PlatformDef>(PLATFORMS[0]);
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchLink(id)
      .then((link) => {
        if (!link) throw new Error('That link no longer exists.');
        const d = platformForLink(link.platform, link.label);
        setExisting(link);
        setDef(d);
        setValue(inputFromUrl(d, link.url));
        setLabel(d.key === 'custom' || d.key === 'website' ? (link.label ?? '') : '');
      })
      .catch((e) => {
        Alert.alert('Couldn’t open the link', e instanceof Error ? e.message : '');
        router.back();
      })
      .finally(() => setLoading(false));
  }, [id]);

  // A link from a platform without its own tile (Tripadvisor, LinkedIn…) opens
  // under Custom; keep its platform unless the owner picks a different tile.
  const keepsPlatform = existing && def.key === platformForLink(existing.platform, existing.label).key;
  const showLabel = def.key === 'custom' || def.key === 'website';

  async function save() {
    const input = value.trim();
    if (!input) return setError(`Enter the ${def.field.toLowerCase()}`);
    if (def.phone && input.replace(/\D/g, '').length < 9) return setError('That number looks too short');
    if (def.key === 'email' && !/^\S+@\S+\.\S+$/.test(input)) return setError('That doesn’t look like an email address');
    setBusy(true);
    setError(null);
    const link = {
      platform: keepsPlatform ? existing.platform : def.platform,
      url: def.toUrl(input),
      label: (showLabel ? label.trim() : '') || def.label || (keepsPlatform ? existing.label : null) || null,
    };
    try {
      if (existing) await updateLink(existing.id, link);
      else await addLink(b.id, link);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save the link');
      setBusy(false);
    }
  }

  function remove() {
    if (!existing) return;
    Alert.alert(`Remove ${linkTitle(existing.platform, existing.label)}?`, 'It disappears from your page right away.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLink(existing.id);
            router.back();
          } catch (e) {
            Alert.alert('Couldn’t remove the link', e instanceof Error ? e.message : '');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.root, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.head}>
          <T v="section" style={{ fontSize: 28, lineHeight: 32 }}>
            {editing ? 'Edit link' : 'Add a link'}
          </T>
          <IconButton icon={X} label="Close" onPress={() => router.back()} />
        </View>

        <Field
          label={def.field}
          prefix={def.phone ? '+94' : undefined}
          value={value}
          onChangeText={(t) => {
            setValue(t);
            setError(null);
          }}
          placeholder={def.placeholder}
          keyboardType={def.keyboard ?? 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          error={error}
          returnKeyType="done"
          onSubmitEditing={save}
        />
        {showLabel && <Field label="Button text (optional)" value={label} onChangeText={setLabel} placeholder="e.g. Book a shoot" />}
        <Button title={editing ? 'Save changes' : `Add ${def.label ?? def.name}`} onPress={save} loading={busy} />

        <View style={{ gap: 10, marginTop: 8 }}>
          <Text style={type.label}>Platform</Text>
          <T style={{ color: C.muted, marginTop: -4 }}>Choose one. We’ll format the link for you.</T>
        </View>
        <View style={styles.grid}>
          {PLATFORMS.map((p) => {
            const on = p.key === def.key;
            return (
              <Pressable
                key={p.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  if (p.key === def.key) return;
                  setDef(p);
                  setValue('');
                  setError(null);
                }}
                style={[styles.tile, on && styles.tileOn]}>
                <View style={[styles.code, { backgroundColor: p.color }]}>
                  <Text style={styles.codeText}>{p.code}</Text>
                </View>
                <Text style={styles.tileText} numberOfLines={1} adjustsFontSizeToFit>
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {existing && <Button title="Remove link" variant="destructive" onPress={remove} style={{ marginTop: 8 }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { padding: S.sheet, paddingTop: 32, gap: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '23%',
    flexGrow: 1,
    aspectRatio: 0.92,
    borderRadius: R.input + 2,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  tileOn: { borderColor: C.accent, borderWidth: 1.5, backgroundColor: '#20250F' },
  code: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontFamily: F.monoBold, fontSize: 15, color: '#FFFFFF' },
  tileText: { fontFamily: F.sansSemi, fontSize: 14, color: C.text },
});
