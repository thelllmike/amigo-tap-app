import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BackHeader, Screen } from '@/components/screen';
import { ShareCodes } from '@/components/share-codes';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { Card, Chip, Row, SectionLabel, Toggle } from '@/components/ui/surface';
import { VehicleThumb } from '@/components/vehicle-thumb';
import { C, type } from '@/constants/theme';
import { deleteVehicle, muteVehicle, saveVehicle, uploadImage } from '@/lib/data';
import { VEHICLE_KINDS, clockTime, isMuted, maskPlate, scanUrl, vehicleTitle } from '@/lib/park';
import type { VehicleKind } from '@/lib/types';
import { useAuth } from '@/providers/auth';
import { usePark } from '@/providers/park';

/** Add a vehicle (id "new"), or edit one and get its QR / NFC sticker. */
export default function VehicleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { vehicles, setVehicles, refresh } = usePark();
  const existing = id === 'new' ? null : (vehicles.find((v) => v.id === id) ?? null);

  const [plate, setPlate] = useState(existing?.plate ?? '');
  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [kind, setKind] = useState<VehicleKind>(existing?.kind ?? 'car');
  const [make, setMake] = useState(existing?.make ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [color, setColor] = useState(existing?.color ?? '');
  const [photo, setPhoto] = useState(existing?.photo_url ?? null);
  const [fullPlate, setFullPlate] = useState(existing?.show_full_plate ?? false);
  const [active, setActive] = useState(existing?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  if (id !== 'new' && !existing) {
    return (
      <Screen>
        <BackHeader title="Vehicle" />
        <Text style={[type.body, { color: C.muted }]}>This vehicle isn’t on your account any more.</Text>
      </Screen>
    );
  }

  async function pickPhoto() {
    if (!session) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    const asset = res.assets?.[0];
    if (res.canceled || !asset?.base64) return;
    setUploading(true);
    try {
      setPhoto(await uploadImage('vehicles', session.user.id, asset.base64, asset.mimeType ?? 'image/jpeg'));
    } catch (e) {
      Alert.alert('Couldn’t upload the photo', e instanceof Error ? e.message : 'Try again');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!session) return;
    if (plate.trim().length < 2) {
      setError('Enter the number plate');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const v = await saveVehicle(session.user.id, existing?.id ?? null, {
        plate,
        nickname: nickname.trim() || null,
        kind,
        make: make.trim() || null,
        model: model.trim() || null,
        color: color.trim() || null,
        photo_url: photo,
        show_full_plate: fullPlate,
        is_active: active,
      });
      setVehicles((list) => (existing ? list.map((x) => (x.id === v.id ? v : x)) : [...list, v]));
      if (existing) router.back();
      else router.replace(`/vehicle/${v.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save');
    } finally {
      setSaving(false);
    }
  }

  async function mute(minutes: number | null) {
    if (!existing) return;
    try {
      const until = await muteVehicle(existing.id, minutes);
      setVehicles((list) => list.map((x) => (x.id === existing.id ? { ...x, muted_until: until } : x)));
    } catch (e) {
      Alert.alert('Couldn’t update', e instanceof Error ? e.message : 'Try again');
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert(`Delete ${existing.plate}?`, 'Its sticker stops working and all its messages are deleted. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVehicle(existing.id);
            setVehicles((list) => list.filter((x) => x.id !== existing.id));
            void refresh();
            router.back();
          } catch (e) {
            Alert.alert('Couldn’t delete', e instanceof Error ? e.message : 'Try again');
          }
        },
      },
    ]);
  }

  const shownPlate = plate.trim().toUpperCase();
  const muted = existing && isMuted(existing, now);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={<Button title={existing ? 'Save changes' : 'Add vehicle'} onPress={save} loading={saving} flex />}>
        <BackHeader title={existing ? vehicleTitle(existing) : 'Add a vehicle'} />

        {existing && (
          <View style={{ gap: 12 }}>
            <SectionLabel>Sticker</SectionLabel>
            <ShareCodes title="Scan to message the driver" qrValue={scanUrl(existing.code)} nfcValue={scanUrl(existing.code)} fileName={`park-alert-${existing.plate.replace(/[^A-Z0-9]+/gi, '-').toLowerCase()}`} />
            <Text style={type.caption}>Print the QR, or write the link to an NFC sticker, and put it on the inside of your windscreen. A ready-to-print sticker is on amigotap.com under Park Alert.</Text>
          </View>
        )}

        <View style={{ gap: 16 }}>
          {existing && <SectionLabel>Details</SectionLabel>}
          <View style={styles.photoRow}>
            <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Choose a photo">
              <VehicleThumb v={{ kind, photo_url: photo, plate: shownPlate || 'Car', nickname }} size={76} />
              <View style={styles.camera}>
                <Camera size={14} color={C.onAccent} />
              </View>
            </Pressable>
            <Text style={[type.caption, { flex: 1 }]}>{uploading ? 'Uploading…' : 'A photo helps people check they’re messaging the right vehicle. Optional.'}</Text>
          </View>

          <Field label="Number plate" value={plate} onChangeText={(t) => setPlate(t.toUpperCase())} placeholder="CAB-1234" autoCapitalize="characters" autoCorrect={false} maxLength={16} mono error={error} />
          <Field label="Nickname" value={nickname} onChangeText={setNickname} placeholder="My Prius" maxLength={40} />

          <View style={{ gap: 8 }}>
            <Text style={type.label}>Type</Text>
            <View style={styles.chips}>
              {VEHICLE_KINDS.map((k) => (
                <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
              ))}
            </View>
          </View>

          <View style={styles.two}>
            <View style={{ flex: 1 }}>
              <Field label="Make" value={make} onChangeText={setMake} placeholder="Toyota" maxLength={40} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Model" value={model} onChangeText={setModel} placeholder="Prius" maxLength={40} />
            </View>
          </View>
          <Field label="Colour" value={color} onChangeText={setColor} placeholder="White" maxLength={30} />

          <Card style={{ paddingVertical: 4 }}>
            <Row
              title="Show full plate when scanned"
              subtitle={`Off shows ${shownPlate.length >= 2 ? maskPlate(shownPlate) : 'CAB-••34'}`}
              right={<Toggle value={fullPlate} onChange={setFullPlate} label="Show full plate" />}
              last={!existing}
            />
            {existing && <Row title="Taking messages" subtitle="Switch off if you sell the vehicle" right={<Toggle value={active} onChange={setActive} label="Taking messages" />} last />}
          </Card>
        </View>

        {existing && (
          <View style={{ gap: 12 }}>
            <SectionLabel>Notifications</SectionLabel>
            {muted ? (
              <Card style={styles.mutedCard}>
                <Text style={[type.body, { flex: 1, color: C.pending }]}>Muted until {clockTime(existing.muted_until!)}</Text>
                <Button title="Unmute" variant="outline" small onPress={() => void mute(null)} />
              </Card>
            ) : (
              <View style={styles.two}>
                <Button title="Mute 1 hour" variant="outline" onPress={() => void mute(60)} flex />
                <Button title="Mute 8 hours" variant="outline" onPress={() => void mute(8 * 60)} flex />
              </View>
            )}
            <Text style={type.caption}>Messages still arrive while muted; your phone just stays quiet.</Text>
            <Button title="Delete vehicle" variant="destructive" onPress={confirmDelete} />
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  camera: { position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  two: { flexDirection: 'row', gap: 12 },
  mutedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: C.pending },
});
