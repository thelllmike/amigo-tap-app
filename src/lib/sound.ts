import { Platform } from 'react-native';

import { IS_CLIP } from '@/lib/clip';

/**
 * The new-order "ding". expo-audio is left out of the App Clip, which never
 * shows orders, so it's loaded lazily and only in the full app.
 */
type Player = { seekTo: (s: number) => Promise<void>; play: () => void };

let player: Player | null | undefined;

function getPlayer(): Player | null {
  if (player !== undefined) return player;
  if (IS_CLIP || Platform.OS === 'web') return (player = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: absent from the App Clip build
    const audio = require('expo-audio') as typeof import('expo-audio');
    // Owners keep the phone on silent behind the counter; the design promises the ding anyway.
    void audio.setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    player = audio.createAudioPlayer(require('@/assets/sounds/ding.wav'));
  } catch {
    player = null;
  }
  return player;
}

export function playOrderSound() {
  const p = getPlayer();
  if (!p) return;
  void p.seekTo(0).then(() => p.play()).catch(() => {});
}
