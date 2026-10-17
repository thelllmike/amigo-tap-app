import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { T } from '@/components/ui/text';
import { C } from '@/constants/theme';

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <T v="section">Nothing here</T>
      <T style={{ color: C.muted, textAlign: 'center' }}>That link doesn’t open anything in the app.</T>
      <Button title="Go home" variant="outline" onPress={() => router.replace('/')} />
    </View>
  );
}
