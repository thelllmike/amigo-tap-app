import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { OrderToast } from '@/components/order-toast';
import { Splash } from '@/components/splash';
import { C, R } from '@/constants/theme';
import { IS_CLIP } from '@/lib/clip';
import { AuthProvider, useAuth } from '@/providers/auth';
import { BusinessRoot } from '@/providers/business';
import { OrdersProvider } from '@/providers/orders';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.card, primary: C.accent, text: C.text, border: C.border },
};

/** Native form sheet styled like the design's bottom sheet: 28 px radius, grabber. */
const sheet = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetCornerRadius: R.sheet,
  contentStyle: { backgroundColor: C.raised },
} as const;

function RootStack() {
  const { session, ready } = useAuth();
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
  // Keep the branded splash up briefly so it doesn't flash on fast launches.
  const [minTimeDone, setMinTimeDone] = useState(IS_CLIP);
  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  if (!ready || !minTimeDone) return <Splash />;

  const signedIn = !!session && !IS_CLIP;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />

      <Stack.Protected guard={!signedIn && !IS_CLIP}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="businesses" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="switch-business" options={{ ...sheet, sheetAllowedDetents: [0.75, 1] }} />
        <Stack.Screen name="order/[id]" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
        <Stack.Screen name="add-link" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
        <Stack.Screen name="menu-item" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="manage-links" />
        <Stack.Screen name="tap-share" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack.Protected>

      {/* Public — reached from universal links, NFC taps and the App Clip. */}
      <Stack.Screen name="linktree/[slug]" />
      <Stack.Screen name="linktree/order/[...rest]" />
      <Stack.Protected guard={IS_CLIP}>
        <Stack.Screen name="clip" options={{ animation: 'none' }} />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <ThemeProvider value={theme}>
        <AuthProvider>
          <BusinessRoot>
            <OrdersProvider>
              <StatusBar style="light" />
              <RootStack />
              <OrderToast />
            </OrdersProvider>
          </BusinessRoot>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
