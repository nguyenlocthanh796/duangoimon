import { Platform, TextStyle } from 'react-native';

/**
 * 👑 Standard Typography Scale — OngChu Lean POS V4.0 (Harmonic 4dp Grid)
 * Harmonized with Apple HIG (iOS 17/18) & Google Material Design 3 (Android 15/16).
 *
 * 1. xxs = 12px Mobile / 13px Tablet (lh: 16px, ls: +0.15) — In bill K58/K80 preview, modifier tags
 * 2. xs  = 14px Mobile / 14px Tablet (lh: 20px, ls: +0.10) — SKU, ĐVT, Ngày giờ, Subtitle, Badge đếm
 * 3. sm  = 16px Mobile / 16px Tablet (lh: 22px, ls:  0.00) — Capsule Pills Cấp 2, Nhãn dòng bill, CTA <= 3 chữ
 * 4. md  = 18px Mobile / 18px Tablet (lh: 26px, ls: -0.05) — POS BACKBONE 85-90% (Tên món, Giá niêm yết, Form)
 * 5. lg  = 22px Mobile / 22px Tablet (lh: 28px, ls: -0.20) — TIÊU ĐỀ CHÍNH (<AppHeader> title, Hero KPI 3 con số)
 * 6. xl  = 28px Mobile / 30px Tablet (lh: 36px, ls: -0.30) — TỔNG TIỀN THANH TOÁN (Hero Action Amount)
 * 7. display = 36px Mobile / 40px Tablet (lh: 44px, ls: -0.40) — NUMPAD PIN / KÉT TIỀN, CFD, KDS Timer
 */

export interface FontToken extends TextStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing?: number;
  includeFontPadding?: boolean;
}

export const getResponsiveFont = (isMobile: boolean = true, isDesktop: boolean = false) => {
  const isWebDesktop = isDesktop;

  // Thang đo Harmonic Progression: +2 -> +2 -> +2 -> +4 -> +6 -> +8
  const xxs = isMobile ? 12 : 13;
  const xs = isWebDesktop ? 15 : 14;
  const sm = isWebDesktop ? 17 : 16;
  const md = isWebDesktop ? 19 : 18;
  const lg = isWebDesktop ? 24 : 22;
  const xl = isWebDesktop ? 32 : isMobile ? 28 : 30;
  const display = isWebDesktop ? 44 : isMobile ? 36 : 40;

  const boldWeight = '600' as const; // De-bolding trần 600

  const baseToken: TextStyle = {
    includeFontPadding: false, // Prevents Android extra padding cutting Vietnamese diacritics
    fontFamily: Platform.select({
      web: "'Inter', 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      ios: 'System',
      android: undefined,
      default: undefined,
    }),
  };

  return {
    xxs: {
      ...baseToken,
      fontSize: xxs,
      lineHeight: isWebDesktop ? 18 : 16,
      fontWeight: '400' as const,
      letterSpacing: 0.15,
    },
    xxsMedium: {
      ...baseToken,
      fontSize: xxs,
      lineHeight: isWebDesktop ? 18 : 16,
      fontWeight: '500' as const,
      letterSpacing: 0.15,
    },
    xxsBold: {
      ...baseToken,
      fontSize: xxs,
      lineHeight: isWebDesktop ? 18 : 16,
      fontWeight: boldWeight,
      letterSpacing: 0.1,
    },

    xs: {
      ...baseToken,
      fontSize: xs,
      lineHeight: isWebDesktop ? 22 : 20,
      fontWeight: '400' as const,
      letterSpacing: 0.1,
    },
    xsMedium: {
      ...baseToken,
      fontSize: xs,
      lineHeight: isWebDesktop ? 22 : 20,
      fontWeight: '500' as const,
      letterSpacing: 0.1,
    },
    xsBold: {
      ...baseToken,
      fontSize: xs,
      lineHeight: isWebDesktop ? 22 : 20,
      fontWeight: boldWeight,
      letterSpacing: 0.1,
    },

    sm: {
      ...baseToken,
      fontSize: sm,
      lineHeight: isWebDesktop ? 24 : 22,
      fontWeight: '400' as const,
      letterSpacing: 0,
    },
    smMedium: {
      ...baseToken,
      fontSize: sm,
      lineHeight: isWebDesktop ? 24 : 22,
      fontWeight: '500' as const,
      letterSpacing: 0,
    },
    smBold: {
      ...baseToken,
      fontSize: sm,
      lineHeight: isWebDesktop ? 24 : 22,
      fontWeight: boldWeight,
      letterSpacing: 0,
    },

    md: {
      ...baseToken,
      fontSize: md,
      lineHeight: isWebDesktop ? 28 : 26,
      fontWeight: '400' as const,
      letterSpacing: -0.05,
    },
    mdMedium: {
      ...baseToken,
      fontSize: md,
      lineHeight: isWebDesktop ? 28 : 26,
      fontWeight: '500' as const,
      letterSpacing: -0.05,
    },
    mdBold: {
      ...baseToken,
      fontSize: md,
      lineHeight: isWebDesktop ? 28 : 26,
      fontWeight: boldWeight,
      letterSpacing: -0.05,
    },

    lg: {
      ...baseToken,
      fontSize: lg,
      lineHeight: isWebDesktop ? 32 : 28,
      fontWeight: '500' as const,
      letterSpacing: -0.2,
    },
    lgRegular: {
      ...baseToken,
      fontSize: lg,
      lineHeight: isWebDesktop ? 32 : 28,
      fontWeight: '400' as const,
      letterSpacing: -0.15,
    },
    lgMedium: {
      ...baseToken,
      fontSize: lg,
      lineHeight: isWebDesktop ? 32 : 28,
      fontWeight: '500' as const,
      letterSpacing: -0.2,
    },
    lgBold: {
      ...baseToken,
      fontSize: lg,
      lineHeight: isWebDesktop ? 32 : 28,
      fontWeight: boldWeight,
      letterSpacing: -0.2,
    },

    xl: {
      ...baseToken,
      fontSize: xl,
      lineHeight: isWebDesktop ? 40 : 36,
      fontWeight: '500' as const,
      letterSpacing: -0.3,
    },
    xlRegular: {
      ...baseToken,
      fontSize: xl,
      lineHeight: isWebDesktop ? 40 : 36,
      fontWeight: '400' as const,
      letterSpacing: -0.2,
    },
    xlMedium: {
      ...baseToken,
      fontSize: xl,
      lineHeight: isWebDesktop ? 40 : 36,
      fontWeight: '500' as const,
      letterSpacing: -0.25,
    },
    xlBold: {
      ...baseToken,
      fontSize: xl,
      lineHeight: isWebDesktop ? 40 : 36,
      fontWeight: boldWeight,
      letterSpacing: -0.3,
    },

    display: {
      ...baseToken,
      fontSize: display,
      lineHeight: isWebDesktop ? 52 : 44,
      fontWeight: '400' as const,
      letterSpacing: -0.4,
    },
    displayMedium: {
      ...baseToken,
      fontSize: display,
      lineHeight: isWebDesktop ? 52 : 44,
      fontWeight: '500' as const,
      letterSpacing: -0.4,
    },
    displayBold: {
      ...baseToken,
      fontSize: display,
      lineHeight: isWebDesktop ? 52 : 44,
      fontWeight: boldWeight,
      letterSpacing: -0.4,
    },
  };
};
