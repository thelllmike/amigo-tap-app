import { requireOptionalNativeModule, type EventSubscription, type NativeModule } from 'expo';
import { Platform } from 'react-native';

type Events = { onRead: () => void };

declare class AmigoHceNative extends NativeModule<Events> {
  isSupported(): boolean;
  isNfcEnabled(): boolean;
  start(url: string): Promise<void>;
  stop(): Promise<void>;
  openNfcSettings(): void;
}

// Android only. iOS doesn't let third-party apps emulate NFC tags, so there
// the module is absent and callers fall back to QR and the share sheet.
const native = Platform.OS === 'android' ? requireOptionalNativeModule<AmigoHceNative>('AmigoHce') : null;

/** Whether this phone can act as an NFC card (Android with HCE). */
export function isHceSupported(): boolean {
  return native?.isSupported() ?? false;
}

export function isNfcEnabled(): boolean {
  return native?.isNfcEnabled() ?? false;
}

/** Start acting as an NFC tag that opens `url` on the phone that taps it. */
export async function startCardEmulation(url: string): Promise<void> {
  if (!native) throw new Error('This phone cannot share over NFC');
  await native.start(url);
}

export async function stopCardEmulation(): Promise<void> {
  await native?.stop();
}

export function openNfcSettings(): void {
  native?.openNfcSettings();
}

/** Fires each time a nearby phone finishes reading the link. */
export function addReadListener(listener: () => void): EventSubscription | null {
  return native?.addListener('onRead', listener) ?? null;
}
