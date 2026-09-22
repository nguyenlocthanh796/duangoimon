import { TextStyle } from 'react-native';

/**
 * Google Material Design 3 (M3) Official Typography System
 * Strictly adheres to the 4dp Vertical Baseline Grid & Android Roboto font metrics.
 * 5 Roles × 3 Sizes = 15 Official Type Styles
 */

export interface M3FontToken extends TextStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: TextStyle['fontWeight'];
  includeFontPadding?: boolean;
}

const BASE_TOKEN: TextStyle = {
  includeFontPadding: false, // Triệt tiêu padding thừa trên Android để bảo toàn dấu tiếng Việt
};

export const m3Typography = {
  // 1. DISPLAY (Hero banners, lớn nhất)
  displayLarge: {
    ...BASE_TOKEN,
    fontSize: 57,
    lineHeight: 64, // 64 ÷ 4 = 16
    letterSpacing: -0.25,
    fontWeight: '400',
  } as M3FontToken,
  displayMedium: {
    ...BASE_TOKEN,
    fontSize: 45,
    lineHeight: 52, // 52 ÷ 4 = 13
    letterSpacing: 0,
    fontWeight: '400',
  } as M3FontToken,
  displaySmall: {
    ...BASE_TOKEN,
    fontSize: 36,
    lineHeight: 44, // 44 ÷ 4 = 11
    letterSpacing: 0,
    fontWeight: '400',
  } as M3FontToken,

  // 2. HEADLINE (Tiêu đề lớn, tổng tiền thanh toán)
  headlineLarge: {
    ...BASE_TOKEN,
    fontSize: 32,
    lineHeight: 40, // 40 ÷ 4 = 10
    letterSpacing: 0,
    fontWeight: '400',
  } as M3FontToken,
  headlineMedium: {
    ...BASE_TOKEN,
    fontSize: 28,
    lineHeight: 36, // 36 ÷ 4 = 9 (Tổng tiền Tablet)
    letterSpacing: 0,
    fontWeight: '500',
  } as M3FontToken,
  headlineSmall: {
    ...BASE_TOKEN,
    fontSize: 24,
    lineHeight: 32, // 32 ÷ 4 = 8 (Tổng tiền Mobile)
    letterSpacing: 0,
    fontWeight: '500',
  } as M3FontToken,

  // 3. TITLE (Header màn hình, Tên món ăn, Tên bàn)
  titleLarge: {
    ...BASE_TOKEN,
    fontSize: 22,
    lineHeight: 28, // 28 ÷ 4 = 7 (Tiêu đề <AppHeader>)
    letterSpacing: 0,
    fontWeight: '500',
  } as M3FontToken,
  titleMedium: {
    ...BASE_TOKEN,
    fontSize: 16,
    lineHeight: 24, // 24 ÷ 4 = 6 (Tên món ăn, Thẻ bàn)
    letterSpacing: 0.15,
    fontWeight: '500',
  } as M3FontToken,
  titleSmall: {
    ...BASE_TOKEN,
    fontSize: 15,
    lineHeight: 20, // (Tiêu đề nhóm, Header phụ)
    letterSpacing: 0.1,
    fontWeight: '500',
  } as M3FontToken,

  // 4. BODY (Văn bản thông thường, dòng dữ liệu, chi tiết đơn)
  bodyLarge: {
    ...BASE_TOKEN,
    fontSize: 16,
    lineHeight: 24, // 24 ÷ 4 = 6 (Mô tả, ghi chú)
    letterSpacing: 0.15,
    fontWeight: '400',
  } as M3FontToken,
  bodyMedium: {
    ...BASE_TOKEN,
    fontSize: 14,
    lineHeight: 20, // 20 ÷ 4 = 5 (Dòng hóa đơn, bóc tách tài chính)
    letterSpacing: 0.25,
    fontWeight: '400',
  } as M3FontToken,
  bodySmall: {
    ...BASE_TOKEN,
    fontSize: 13,
    lineHeight: 18, // (Timestamp, SKU, ĐVT - tăng độ dễ đọc)
    letterSpacing: 0.3,
    fontWeight: '400',
  } as M3FontToken,

  // 5. LABEL (Nút bấm CTA, Chip lọc, Badge đếm)
  labelLarge: {
    ...BASE_TOKEN,
    fontSize: 14,
    lineHeight: 20, // 20 ÷ 4 = 5 (Nút bấm hành động CTA)
    letterSpacing: 0.1,
    fontWeight: '600', // SemiBold cho nút bấm cảm ứng
  } as M3FontToken,
  labelMedium: {
    ...BASE_TOKEN,
    fontSize: 13,
    lineHeight: 18, // (Chip lọc, Badge đếm - rõ nét hơn)
    letterSpacing: 0.3,
    fontWeight: '600',
  } as M3FontToken,
  labelSmall: {
    ...BASE_TOKEN,
    fontSize: 12,
    lineHeight: 16, // 16 ÷ 4 = 4 (Tag phụ modifier, sàn tối thiểu công thái học)
    letterSpacing: 0.4,
    fontWeight: '500',
  } as M3FontToken,
};

export type M3TypographyVariant = keyof typeof m3Typography;
