import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { C } from '@/constants/theme';
import { IS_CLIP } from '@/lib/clip';
import { SITE_URL } from '@/lib/config';

/**
 * Table-stand links (/linktree/order/<slug>/<table>) can arrive as universal
 * links or App Clip invocations. Ordering lives on the web, so hand off there.
 */
export default function OrderHandoff() {
  const { rest } = useLocalSearchParams<{ rest: string[] }>();
  useEffect(() => {
    const path = Array.isArray(rest) ? rest.join('/') : rest;
    void WebBrowser.openBrowserAsync(`${SITE_URL}/linktree/order/${path}`).then(() => {
      if (IS_CLIP) return;
      if (router.canGoBack()) router.back();
      else router.replace('/');
    });
  }, [rest]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}>
      <ActivityIndicator color={C.accent} />
    </View>
  );
}
