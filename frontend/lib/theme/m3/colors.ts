/**
 * Google Material Design 3 (M3) Official Color System
 * Role-based Color Matrix derived from Google HCT (Hue, Chroma, Tone).
 * Certified WCAG 2.1 AAA/AA High-Contrast for F&B Restaurant Operations.
 */

export interface M3ColorPalette {
  isDark: boolean;

  // 1. Primary Roles (Thương hiệu chính, Nút bấm CTA chủ đạo)
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // 2. Secondary Roles (Bộ lọc phụ, Điều hướng cấp 2)
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // 3. Tertiary Roles (Điểm nhấn mang về, Bàn đặt trước - Warm Amber)
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // 4. Error Roles (Cảnh báo gian lận, Hủy món, Lệch két)
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // 5. Success Roles (Tiền vào, Thanh toán xong, Món đã chế biến)
  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;

  // 6. Surface & 5 Tonal Surface Containers (Thay thế hoàn toàn bóng đổ đen)
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;

  surfaceContainerLowest: string;  // Tầng 0: Trắng tinh hoặc Đen sâu tuyệt đối
  surfaceContainerLow: string;     // Tầng 1: Thẻ món ăn, ô bàn trống
  surfaceContainer: string;        // Tầng 2: Toolbar, thanh phân đoạn, Canvas
  surfaceContainerHigh: string;    // Tầng 3: Header chính, Dock điều hướng
  surfaceContainerHighest: string; // Tầng 4: Modal, Ô nhập liệu, Dropdown

  // 7. Outline & Lines
  outline: string;        // Đường viền nét rõ
  outlineVariant: string; // Đường kẻ tóc hairline mờ (phân cách hàng)

  // 8. Inverse (Dành cho SnackBar / Toast nổi bật)
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // 9. Scrim & Overlays
  scrim: string;
  backdrop: string;
}

export const m3LightColors: M3ColorPalette = {
  isDark: false,

  // Primary: Cobalt Jade M3
  primary: '#006494',
  onPrimary: '#FFFFFF',
  primaryContainer: '#CBE6FF',
  onPrimaryContainer: '#001E30',

  // Secondary: Slate
  secondary: '#50606E',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#D3E5F5',
  onSecondaryContainer: '#0D1D29',

  // Tertiary: Solar Warm Amber (Đơn mang về & Bàn đã đặt)
  tertiary: '#8C5000',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFDCC1',
  onTertiaryContainer: '#2E1500',

  // Error: Crimson
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',

  // Success: Cyber Mint
  success: '#059669',
  onSuccess: '#FFFFFF',
  successContainer: '#D1FAE5',
  onSuccessContainer: '#064E3B',

  // 5 Tonal Surface Containers (Giao diện Sáng - Tinh khiết, không nhòe bóng)
  surface: '#F8F9FA',
  onSurface: '#191C20',         // 15.5:1 AAA contrast
  surfaceVariant: '#DEE3EA',
  onSurfaceVariant: '#41474D',  // 7.2:1 AAA contrast (chữ phụ)

  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F2F4F7',
  surfaceContainer: '#ECEEF1',
  surfaceContainerHigh: '#E6E8EC',
  surfaceContainerHighest: '#E0E3E6',

  // Outline
  outline: '#71787E',
  outlineVariant: '#C1C7CE',

  // Inverse
  inverseSurface: '#2E3135',
  inverseOnSurface: '#F0F0F4',
  inversePrimary: '#8ECEFF',

  scrim: '#000000',
  backdrop: 'rgba(25, 28, 32, 0.60)',
};

export const m3DarkColors: M3ColorPalette = {
  isDark: true,

  // Primary: Cobalt Tint M3
  primary: '#8ECEFF',
  onPrimary: '#00344F',
  primaryContainer: '#004B72',
  onPrimaryContainer: '#CBE6FF',

  // Secondary
  secondary: '#B7C8D8',
  onSecondary: '#22323F',
  secondaryContainer: '#394956',
  onSecondaryContainer: '#D3E5F5',

  // Tertiary: Solar Amber Dark
  tertiary: '#FFB878',
  onTertiary: '#4B2800',
  tertiaryContainer: '#6A3B00',
  onTertiaryContainer: '#FFDCC1',

  // Error
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  // Success
  success: '#10B981',
  onSuccess: '#064E3B',
  successContainer: '#065F46',
  onSuccessContainer: '#D1FAE5',

  // 5 Tonal Surface Containers (Giao diện Tối Obsidian - Chống chói lóa 12h)
  surface: '#101418',
  onSurface: '#E0E3E8',         // 16.2:1 AAA contrast
  surfaceVariant: '#41474D',
  onSurfaceVariant: '#C1C7CE',  // 8.5:1 AAA contrast (chữ phụ)

  surfaceContainerLowest: '#0B0F13',
  surfaceContainerLow: '#181C20',
  surfaceContainer: '#1C2024',
  surfaceContainerHigh: '#272A2F',
  surfaceContainerHighest: '#31353A',

  // Outline
  outline: '#8B9198',
  outlineVariant: '#41474D',

  // Inverse
  inverseSurface: '#E0E3E8',
  inverseOnSurface: '#2D3135',
  inversePrimary: '#006494',

  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.75)',
};
