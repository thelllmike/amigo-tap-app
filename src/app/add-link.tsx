import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { T } from '@/components/ui/text';
import { C, F, R, S } from '@/constants/theme';
import { addLink } from '@/lib/data';
import { PLATFORMS, type PlatformDef } from '@/lib/platforms';
import { useCurrentBusiness } from '@/providers/business';

export default function AddLink() {
  const b = useCurrentBusiness();
  const insets = useSafeAreaInsets();
  const [def, setDef] = useState<PlatformDef>(PLATFORMS[0]);
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const input = value.trim();
    if (!input) return setError(`Enter the ${def.field.toLowerCase()}`);
    if (def.phone && input.replace(/\D/g, '').length < 9) return setError('That number looks too short');
    if (def.key === 'email' && !/^\S+@\S+\.\S+$/.test(input)) return setError('That doesn’t look like an email address');
    setBusy(true);
    setError(null);
    try {
      await addLink(b.id, { platform: def.platform, url: def.toUrl(input), label: label.trim() || def.label || null });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t add the link');
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <T v="section" style={{ fontSize: 28, lineHeight: 32 }}>
            Add a link
          </T>
          <IconButton icon={X} label="Close" onPress={() => router.back()} />
        </View>
        <T style={{ color: C.muted, marginTop: -8 }}>Choose a platform. We’ll format the link for you.</T>

        <View style={styles.grid}>
          {PLATFORMS.map((p) => {
            const on = p.key === def.key;
            return (
              <Pressable
                key={p.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
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
          autoFocus
        />
        {(def.key === 'custom' || def.key === 'website') && <Field label="Button text (optional)" value={label} onChangeText={setLabel} placeholder="e.g. Book a shoot" />}
      </ScrollView>
      <View style={{ paddingHorizontal: S.sheet, paddingBottom: insets.bottom + 16, paddingTop: 8 }}>
        <Button title={`Add ${def.label ?? def.name}`} onPress={save} loading={busy} />
      </View>
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
