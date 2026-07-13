import { Platform } from 'react-native';

/**
 * Lightweight haptic feedback utility.
 * Uses expo-haptics if available, no-ops gracefully when not installed.
 */

let HapticsModule: typeof import('expo-haptics') | null = null;
let loaded = false;

async function getHaptics(): Promise<typeof import('expo-haptics') | null> {
  if (loaded) return HapticsModule;
  try {
    HapticsModule = await import('expo-haptics');
  } catch {
    HapticsModule = null;
  }
  loaded = true;
  return HapticsModule;
}

export async function impactAsync(
  level: 'light' | 'medium' | 'heavy' = 'medium'
): Promise<void> {
  if (Platform.OS === 'web') return;
  const h = await getHaptics();
  if (!h) return;
  const styleMap = {
    light: h.ImpactFeedbackStyle.Light,
    medium: h.ImpactFeedbackStyle.Medium,
    heavy: h.ImpactFeedbackStyle.Heavy,
  };
  await h.impactAsync(styleMap[level]).catch(() => {});
}

export async function notificationAsync(
  type: 'success' | 'warning' | 'error' = 'success'
): Promise<void> {
  if (Platform.OS === 'web') return;
  const h = await getHaptics();
  if (!h) return;
  const typeMap = {
    success: h.NotificationFeedbackType.Success,
    warning: h.NotificationFeedbackType.Warning,
    error: h.NotificationFeedbackType.Error,
  };
  await h.notificationAsync(typeMap[type]).catch(() => {});
}

/** Fire-and-forget sync helper */
export const haptic = {
  impact: (level?: 'light' | 'medium' | 'heavy') => {
    impactAsync(level).catch(() => {});
  },
  success: () => notificationAsync('success').catch(() => {}),
  warning: () => notificationAsync('warning').catch(() => {}),
  error: () => notificationAsync('error').catch(() => {}),
};
