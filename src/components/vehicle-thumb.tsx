import { Bike, Car, Truck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/surface';
import { C } from '@/constants/theme';
import { vehicleTitle } from '@/lib/park';
import type { Vehicle, VehicleKind } from '@/lib/types';

export function KindIcon({ kind, size = 22, color = C.accent }: { kind: VehicleKind; size?: number; color?: string }) {
  if (kind === 'bike') return <Bike size={size} color={color} />;
  if (kind === 'van' || kind === 'lorry') return <Truck size={size} color={color} />;
  return <Car size={size} color={color} />;
}

export function VehicleThumb({ v, size = 48 }: { v: Pick<Vehicle, 'kind' | 'photo_url' | 'plate' | 'nickname'>; size?: number }) {
  if (v.photo_url) return <Avatar name={vehicleTitle(v)} uri={v.photo_url} size={size} color={C.raised} />;
  return (
    <View style={[styles.thumb, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <KindIcon kind={v.kind} size={size * 0.48} />
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { backgroundColor: C.raised, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
