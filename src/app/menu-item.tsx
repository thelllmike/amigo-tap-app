import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { Chip, Toggle } from '@/components/ui/surface';
import { C, F, R, S, type } from '@/constants/theme';
import { deleteMenuItem, fetchMenu, saveMenuItem, uploadImage } from '@/lib/data';
import type { MenuCategory } from '@/lib/types';
import { useAuth } from '@/providers/auth';
import { useCurrentBusiness } from '@/providers/business';

export default function MenuItemSheet() {
  const b = useCurrentBusiness();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { id, categoryId } = useLocalSearchParams<{ id?: string; categoryId?: string }>();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<string | null>(categoryId ?? null);
  const [available, setAvailable] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMenu(b.id)
      .then((m) => {
        setCategories(m.categories);
        const item = id ? m.items.find((i) => i.id === id) : null;
        if (item) {
          setName(item.name);
          setDescription(item.description ?? '');
          setPrice(item.price != null ? String(item.price) : '');
          setCategory(item.category_id);
          setAvailable(item.is_available);
          setImage(item.image_url);
        }
      })
      .finally(() => setLoading(false));
  }, [b.id, id]);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.75, base64: true });
    if (res.canceled || !res.assets[0]?.base64 || !session) return;
    setUploading(true);
    try {
      const a = res.assets[0];
      setImage(await uploadImage('menu', session.user.id, a.base64!, a.mimeType ?? 'image/jpeg'));
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : '');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name.trim()) return setError('Give the item a name');
    const p = price.trim() ? Number(price.replace(/,/g, '')) : null;
    if (p !== null && (Number.isNaN(p) || p < 0)) return setError('Price must be a number');
    setSaving(true);
    setError(null);
    try {
      await saveMenuItem(b.id, id ?? null, { name: name.trim(), description: description.trim() || null, price: p, category_id: category, image_url: image, is_available: available });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save');
      setSaving(false);
    }
  }

  function remove() {
    if (!id) return;
    Alert.alert(`Delete ${name || 'this item'}?`, 'It’s removed from your menu straight away.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMenuItem(id);
            router.back();
          } catch (e) {
            Alert.alert('Couldn’t delete', e instanceof Error ? e.message : '');
          }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator color={C.accent} style={{ marginTop: 60 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>{id ? 'Edit item' : 'New item'}</Text>
          {id ? (
            <Pressable onPress={remove} hitSlop={10} accessibilityLabel="Delete item">
              <Trash2 size={24} color={C.danger} />
            </Pressable>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <Pressable onPress={pickPhoto} style={styles.photo} accessibilityRole="button" accessibilityLabel="Change photo">
          {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <View style={styles.placeholder} />}
          {uploading && <ActivityIndicator color={C.text} />}
          <View style={styles.change}>
            <Text style={styles.changeText}>{image ? 'Change photo' : 'Add photo'}</Text>
          </View>
        </Pressable>

        <Field label="Name" value={name} onChangeText={setName} placeholder="Egg hopper set" />
        <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="Two egg hoppers, lunu miris, seeni sambol" />
        <Field label="Price (LKR)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" mono placeholder="890" />

        {categories.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={type.label}>Category</Text>
            <View style={styles.cats}>
              {categories.map((c) => (
                <Chip key={c.id} label={c.name} light active={c.id === category} onPress={() => setCategory(c.id)} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.toggleRow}>
          <Text style={[type.body, { fontSize: 18 }]}>Available today</Text>
          <Toggle value={available} onChange={setAvailable} label="Available today" />
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={{ paddingHorizontal: S.sheet, paddingBottom: insets.bottom + 16, paddingTop: 8 }}>
        <Button title="Save item" onPress={save} loading={saving} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { padding: S.sheet, paddingTop: 28, gap: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { fontFamily: F.sans, fontSize: 18, color: C.muted },
  title: { fontFamily: F.sansBold, fontSize: 20, color: C.text },
  photo: { height: 210, borderRadius: R.card + 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#B98A4A' },
  placeholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.25)' },
  change: { position: 'absolute', right: 14, bottom: 14, backgroundColor: 'rgba(40,30,15,0.85)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  changeText: { fontFamily: F.sansSemi, fontSize: 15, color: C.text },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  error: { fontFamily: F.sans, fontSize: 15, color: C.danger },
});
