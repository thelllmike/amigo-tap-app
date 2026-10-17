import { Platform } from 'react-native';

import { IS_CLIP } from '@/lib/clip';

/**
 * Reading and writing physical NFC tags (and other phones acting as tags).
 * react-native-nfc-manager is excluded from the App Clip build to stay under
 * the size limit, so it is required lazily and every call degrades to
 * "not supported" when the native module is missing.
 */
type NfcModule = typeof import('react-native-nfc-manager');

let cached: NfcModule | null | undefined;

function load(): NfcModule | null {
  if (cached !== undefined) return cached;
  if (IS_CLIP || Platform.OS === 'web') return (cached = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: absent from the App Clip build
    cached = require('react-native-nfc-manager') as NfcModule;
  } catch {
    cached = null;
  }
  return cached;
}

let started = false;
let busy = false;

async function ready() {
  const mod = load();
  if (!mod) return null;
  const manager = mod.default;
  if (!started) {
    if (!(await manager.isSupported())) return null;
    await manager.start();
    started = true;
  }
  return mod;
}

export async function nfcSupported() {
  try {
    return (await ready()) !== null;
  } catch {
    return false;
  }
}

export async function nfcEnabled() {
  const mod = await ready().catch(() => null);
  if (!mod) return false;
  return mod.default.isEnabled().catch(() => false);
}

export type NfcResult<T> = { ok: true; value: T } | { ok: false; cancelled: boolean; message: string };

async function session<T>(prompt: string, run: (mod: NfcModule) => Promise<T>): Promise<NfcResult<T>> {
  if (busy) return { ok: false, cancelled: false, message: 'Already scanning' };
  const mod = await ready().catch(() => null);
  if (!mod) return { ok: false, cancelled: false, message: 'This phone can’t use NFC.' };
  busy = true;
  const manager = mod.default;
  let requested = false;
  try {
    requested = true;
    await manager.requestTechnology(mod.NfcTech.Ndef, { alertMessage: prompt });
    const value = await run(mod);
    if (Platform.OS === 'ios') await manager.setAlertMessageIOS('Done').catch(() => {});
    return { ok: true, value };
  } catch (e) {
    const cancelled = e instanceof mod.NfcError.UserCancel || String(e).toLowerCase().includes('cancel');
    return { ok: false, cancelled, message: cancelled ? 'Cancelled' : 'Couldn’t talk to the tag. Hold still and try again.' };
  } finally {
    if (requested) await manager.cancelTechnologyRequest().catch(() => {});
    busy = false;
  }
}

/** Reads the first link (URI record) from a tag or a phone sharing its card. */
export function readLink(): Promise<NfcResult<string | null>> {
  return session('Hold your phone near the AmigoTap card or the other phone', async (mod) => {
    const tag = await mod.default.getTag();
    for (const record of tag?.ndefMessage ?? []) {
      if (mod.Ndef.isType(record, mod.Ndef.TNF_WELL_KNOWN, mod.Ndef.RTD_URI)) {
        return mod.Ndef.uri.decodePayload(new Uint8Array(record.payload as number[]));
      }
    }
    return null;
  });
}

/** Writes `url` to a blank or rewritable NFC tag, card or table stand. */
export function writeLink(url: string): Promise<NfcResult<true>> {
  return session('Hold the top of your phone to the card or stand', async (mod) => {
    const bytes = mod.Ndef.encodeMessage([mod.Ndef.uriRecord(url)]);
    await mod.default.ndefHandler.writeNdefMessage(bytes);
    return true as const;
  });
}
