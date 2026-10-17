import { Platform } from 'react-native';
import { displayOverlay, isClip } from 'react-native-app-clip';

/** True when running as the iOS App Clip (opened from an NFC tag, QR or link, no install). */
export const IS_CLIP = Platform.OS === 'ios' && isClip();

/** Shows Apple's "Get the full app" banner. No-op outside the App Clip. */
export function promoteFullApp() {
  if (!IS_CLIP) return;
  try {
    displayOverlay();
  } catch {
    // The overlay is a nicety; never break the page over it.
  }
}
