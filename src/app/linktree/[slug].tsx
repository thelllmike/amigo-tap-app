import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronLeft, ExternalLink, Nfc } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mark } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/surface';
import { T } from '@/components/ui/text';
import { C, F, R, S } from '@/constants/theme';
import { IS_CLIP, promoteFullApp } from '@/lib/clip';
import { TAP_SOURCE } from '@/lib/config';
import { fetchBusinessBySlug } from '@/lib/data';
import { nfcUrl, pageUrl } from '@/lib/links';
import { linkBadge, linkHref, linkTitle } from '@/lib/platforms';
import { supabase } from '@/lib/supabase';
import type { Business, SocialLink } from '@/lib/types';

/**
 * A business's public card, shown when someone taps an AmigoTap card or
 * another phone sharing over NFC: in the iOS App Clip (no install), or in the
 * full app via a universal link. Mirrors the web's tap welcome popup — the
 * page's main links, one tap away — with the full page a button below.
 */
export default function PublicProfile() {
  const { slug, src } = useLocalSearchParams<{ slug: string; src?: string }>();
  const insets = useSafeAreaInsets();
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [links, setLinks] = useState<SocialLink[]>([]);
  const tapped = src === TAP_SOURCE;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b = await fetchBusinessBySlug(slug);
        if (cancelled) return;
        setBusiness(b);
        if (!b) return;
        const { data } = await supabase.from('social_links').select('*').eq('business_id', b.id).eq('is_active', true).order('display_order');
        if (!cancelled) setLinks((data as SocialLink[]) ?? []);
        // Count the visit like the web page does (link_id null = page view).
        void supabase.from('link_events').insert({ business_id: b.id, link_id: null });
      } catch {
        if (!cancelled) setBusiness(null);
      }
    })();
    promoteFullApp();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function open(link: SocialLink) {
    if (business) void supabase.from('link_events').insert({ business_id: business.id, link_id: link.id });
    void Linking.openURL(linkHref(link.platform, link.url));
  }

  if (business === undefined) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  if (business === null) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32 }]}>
        <T v="section">Page not found</T>
        <T style={{ color: C.muted, textAlign: 'center' }}>This AmigoTap link doesn’t point to a page any more.</T>
        {!IS_CLIP && <Button title="Go back" variant="outline" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      </View>
    );
  }

  const person = business.type === 'businesscard' ? business.card_config : null;
  const title = person?.person_name?.trim() || business.name;
  const subtitle = person?.person_title?.trim() || business.description;
  const color = business.theme_color || C.raised;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View style={[styles.cover, { backgroundColor: color, paddingTop: insets.top + 12 }]}>
        {!IS_CLIP && router.canGoBack() && (
          <Pressable onPress={() => router.back()} style={styles.back} accessibilityLabel="Back" hitSlop={10}>
            <ChevronLeft size={26} color="#FFFFFF" />
          </Pressable>
        )}
        {tapped && (
          <View style={styles.tapped}>
            <Nfc size={16} color={C.onAccent} />
            <Text style={styles.tappedText}>You tapped {business.name}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          {business.avatar_url ? (
            <Image source={{ uri: business.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <Avatar name={title} color={color} size={104} />
          )}
        </View>
        <View style={{ gap: 6, alignItems: 'center' }}>
          <T v="title" style={{ textAlign: 'center' }}>
            {title}
          </T>
          {person && business.name !== title && <Text style={styles.company}>{business.name}</Text>}
          {!!subtitle && <T style={{ color: C.muted, textAlign: 'center', fontSize: 16, lineHeight: 23 }}>{subtitle}</T>}
        </View>

        <View style={{ gap: 10, alignSelf: 'stretch' }}>
          {links.map((l) => {
            const badge = linkBadge(l.platform, l.label);
            return (
              <Pressable key={l.id} onPress={() => open(l)} style={({ pressed }) => [styles.link, pressed && { backgroundColor: C.raised }]} accessibilityRole="link">
                <View style={[styles.code, { backgroundColor: badge.color }]}>
                  <Text style={styles.codeText}>{badge.code}</Text>
                </View>
                <Text style={styles.linkText} numberOfLines={1}>
                  {linkTitle(l.platform, l.label)}
                </Text>
                <ExternalLink size={18} color={C.muted} />
              </Pressable>
            );
          })}
        </View>

        <Button
          title="Open full page"
          variant="outline"
          onPress={() => WebBrowser.openBrowserAsync(tapped ? nfcUrl(business.slug) : pageUrl(business.slug))}
          style={{ alignSelf: 'stretch' }}
        />

        <View style={styles.footer}>
          <Mark size={20} />
          <Text style={styles.footerText}>{IS_CLIP ? 'AmigoTap · get the app to make your own card' : 'Made with AmigoTap'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  cover: { height: 200, paddingHorizontal: S.gutter, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  tapped: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 'auto' },
  tappedText: { fontFamily: F.sansSemi, fontSize: 13, color: C.onAccent },
  body: { alignItems: 'center', paddingHorizontal: S.gutter, gap: 22, marginTop: -56 },
  avatarWrap: { padding: 5, borderRadius: 34, backgroundColor: C.bg },
  avatar: { width: 104, height: 104, borderRadius: 30, backgroundColor: C.raised },
  company: { fontFamily: F.sansSemi, fontSize: 16, color: C.text },
  link: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 64, paddingHorizontal: 12, paddingRight: 18, borderRadius: R.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  code: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  codeText: { fontFamily: F.monoBold, fontSize: 13, color: '#FFFFFF' },
  linkText: { flex: 1, fontFamily: F.sansSemi, fontSize: 17, color: C.text },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  footerText: { fontFamily: F.sans, fontSize: 13, color: C.muted },
});
