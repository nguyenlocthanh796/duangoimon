/**
 * Cross-Platform Thermal Bill Printing Helper for POS F&B.
 * 
 * Supports:
 * 1. Web / Desktop Browser: Window Popup Print.
 * 2. Native iPad (iOS AirPrint) & Android APK: expo-print Native Thermal Print Engine.
 */

import { Platform, Alert } from 'react-native';

export async function printHtmlBill(htmlContent: string): Promise<boolean> {
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  if (isNative) {
    try {
      const pkgName = 'expo-print';
      const Print = require(pkgName);
      await Print.printAsync({
        html: htmlContent,
      });
      return true;
    } catch (e: any) {
      Alert.alert('Lỗi máy in', e?.message || 'Không thể kết nối máy in Native.');
      return false;
    }
  }

  // Web fallback
  if (typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Alert.alert('Không thể in', 'Vui lòng cho phép mở Popup trên trình duyệt để in hóa đơn.');
      return false;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return true;
  }

  return false;
}
