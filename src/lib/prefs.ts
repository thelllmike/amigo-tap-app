import AsyncStorage from '@react-native-async-storage/async-storage';

/** Per-device settings. Nothing here needs to follow the owner to another phone. */
export interface Prefs {
  orderSound: boolean;
  vibrate: boolean;
  lastBusinessId: string | null;
}

const KEY = 'amigotap.prefs.v1';
const DEFAULTS: Prefs = { orderSound: true, vibrate: true, lastBusinessId: null };

export async function loadPrefs(): Promise<Prefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function savePrefs(prefs: Prefs) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Losing a toggle is harmless.
  }
}
