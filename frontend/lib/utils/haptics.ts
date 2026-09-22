import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePOSStore } from '../store/usePOSStore';

function isHapticsEnabled(): boolean {
  try {
    const store = usePOSStore?.getState?.();
    return store?.storeSettings?.enableHaptics !== false;
  } catch {
    return true;
  }
}

/**
 * M3 Expressive Haptic Engine — Ongchu Lean POS
 * 4-Tier Ergonomic Feedback (0ms Non-Blocking)
 */
export const HapticsEngine = {
  /**
   * 1. Selection Tick (5ms subtle pulse)
   * Chạm nhẹ: Chọn món, chuyển tab, chọn bàn
   */
  tick: () => {
    if (Platform.OS === 'web' || !isHapticsEnabled()) return;
    try {
      Haptics.selectionAsync();
    } catch {}
  },

  /**
   * 2. Mechanical Step (Tactile bump)
   * Nấc cơ học: Tăng giảm số lượng, điều chỉnh chiết khấu
   */
  step: () => {
    if (Platform.OS === 'web' || !isHapticsEnabled()) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  },

  /**
   * 3. Celebration / Confirmation (Double positive pulse)
   * Hoàn tất: Thanh toán thành công, in bill, mở ca
   */
  celebrate: () => {
    if (Platform.OS === 'web' || !isHapticsEnabled()) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  },

  /**
   * 4. Warning / High-Risk Guard (Double warning jolt)
   * Cảnh báo: Hủy món sau báo bếp, chiết khấu > 20%, báo hết món 86
   */
  warn: () => {
    if (Platform.OS === 'web' || !isHapticsEnabled()) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
  },
};

export type HapticType = 'tick' | 'step' | 'celebrate' | 'warn' | 'none';
