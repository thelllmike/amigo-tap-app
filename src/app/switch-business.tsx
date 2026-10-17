import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BusinessRow } from '@/components/business-list';
import { IconButton } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { T } from '@/components/ui/text';
import { S } from '@/constants/theme';
import { useBusinesses } from '@/providers/business';

export default function SwitchBusiness() {
  const { businesses, current, viewsToday, pendingCounts, select } = useBusinesses();
  const [q, setQ] = useState('');
  const list = businesses.filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <T v="section" style={{ fontSize: 26, lineHeight: 30 }}>
          Switch business
        </T>
        <IconButton icon={X} label="Close" onPress={() => router.back()} />
      </View>
      {businesses.length > 4 && <Field value={q} onChangeText={setQ} placeholder={`Search ${businesses.length} businesses`} autoCorrect={false} />}
      <View style={{ gap: 4 }}>
        {list.map((b) => (
          <BusinessRow
            key={b.id}
            b={b}
            views={viewsToday[b.id]}
            pending={pendingCounts[b.id] ?? 0}
            selected={b.id === current?.id}
            onPress={() => {
              select(b.id);
              router.back();
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: S.sheet, paddingTop: 28, gap: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
