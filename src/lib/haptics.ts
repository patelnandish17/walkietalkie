/**
 * Haptics helper:
 * Safe for iOS Safari (where navigator.vibrate is unsupported/restricted)
 * Combines native vibration (Android/Chromium) with WebAudio tactile click
 */

import { radioAudio } from './audio';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'double' | 'error';

export function triggerHaptic(style: HapticStyle = 'medium') {
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent || '');

  // 1. Play WebAudio tactile click (especially essential for iOS)
  radioAudio.playTactileClick();

  // 2. If navigator.vibrate is supported (e.g. Android Chrome), trigger hardware vibration
  if (!isIOS && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (style) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(30);
          break;
        case 'heavy':
          navigator.vibrate(55);
          break;
        case 'double':
          navigator.vibrate([20, 40, 20]);
          break;
        case 'error':
          navigator.vibrate([40, 50, 40, 50, 60]);
          break;
      }
    } catch {
      // Ignore vibration errors if blocked by browser policy
    }
  }
}
