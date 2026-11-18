import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { IS_CLIP } from '@/lib/clip';
import { supabase } from '@/lib/supabase';

/**
 * Push notifications for Park Alert. expo-notifications is left out of the
 * App Clip, so it is required lazily and everything degrades to "unavailable".
 */
type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

export function notifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (IS_CLIP || Platform.OS === 'web') return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: absent from the App Clip build
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

export const PARK_CHANNEL = 'park-alert';

let configured = false;

/** Shows alerts while the app is open too, and creates the loud Android channel. */
export async function configureNotifications() {
  const N = notifications();
  if (!N || configured) return;
  configured = true;
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(PARK_CHANNEL, {
      name: 'Park Alert messages',
      description: 'When someone scans your vehicle’s sticker',
      importance: N.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
      lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
    }).catch(() => {});
  }
}

export type PushState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function pushPermission(): Promise<PushState> {
  const N = notifications();
  if (!N || !Device.isDevice) return 'unavailable';
  const p = await N.getPermissionsAsync().catch(() => null);
  if (!p) return 'unavailable';
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

let registeredToken: string | null = null;

/**
 * Gets this phone's Expo push token and links it to the signed-in account.
 * `ask` shows the system permission prompt if we haven't asked yet.
 */
export async function registerPush(ask: boolean): Promise<PushState> {
  const N = notifications();
  if (!N || !Device.isDevice) return 'unavailable';
  await configureNotifications();
  let state = await pushPermission();
  if (state === 'undetermined' && ask) {
    const p = await N.requestPermissionsAsync().catch(() => null);
    state = p?.granted ? 'granted' : p?.canAskAgain === false ? 'denied' : 'undetermined';
  }
  if (state !== 'granted') return state;

  const projectId = easProjectId();
  if (!projectId) {
    // Run `eas init` once so the build carries a project id.
    if (__DEV__) console.warn('Push: no EAS projectId in app config, skipping token registration');
    return 'unavailable';
  }
  try {
    const { data: token } = await N.getExpoPushTokenAsync({ projectId });
    if (token !== registeredToken) {
      const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
      if (error) throw error;
      registeredToken = token;
    }
  } catch (e) {
    if (__DEV__) console.warn('Push registration failed', e);
  }
  return 'granted';
}

/** Stops pushes to this phone for the account that's signing out. */
export async function unregisterPush() {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await supabase.rpc('unregister_push_token', { p_token: token }).then(
    () => {},
    () => {},
  );
}
