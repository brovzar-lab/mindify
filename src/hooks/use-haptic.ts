import { useCallback } from 'react';

type HapticPattern = 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  success: 50,
  error: [100, 50, 100, 50, 100],
  warning: [100, 50, 100],
  light: 10,
  medium: 30,
  heavy: 50,
};

export function useHaptic() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback(
    (pattern: HapticPattern | number | number[]) => {
      if (!isSupported) return false;

      try {
        const vibrationPattern =
          typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;

        return navigator.vibrate(vibrationPattern);
      } catch {
        return false;
      }
    },
    [isSupported]
  );

  const success = useCallback(() => vibrate('success'), [vibrate]);
  const error = useCallback(() => vibrate('error'), [vibrate]);
  const warning = useCallback(() => vibrate('warning'), [vibrate]);
  const light = useCallback(() => vibrate('light'), [vibrate]);
  const medium = useCallback(() => vibrate('medium'), [vibrate]);
  const heavy = useCallback(() => vibrate('heavy'), [vibrate]);

  return {
    isSupported,
    vibrate,
    success,
    error,
    warning,
    light,
    medium,
    heavy,
  };
}
