/**
 * OngChu Lean POS — Design System Tokens
 * Source of truth for Dual-Theme Colors, Typography, and Component Constraints.
 */

import { lightTheme, darkTheme, oledTheme, ThemeType, ThemeColors } from './colors';

export * from './colors';

export const THEME_TOKENS = {
  light: lightTheme,
  dark: darkTheme,
  oled: oledTheme,
} as const;

/**
 * Standard 7-Tier Typography Font Sizes (Apple HIG & Indochine Balance)
 * Standardized across Mobile and iPad/Desktop
 */
export const TYPOGRAPHY_TIERS = {
  xxs: { mobile: 12, tablet: 13, desktop: 13, lineHeight: 16 },
  xs: { mobile: 14, tablet: 14, desktop: 15, lineHeight: 20 },
  sm: { mobile: 16, tablet: 16, desktop: 17, lineHeight: 22 },
  md: { mobile: 18, tablet: 18, desktop: 19, lineHeight: 26 },
  lg: { mobile: 22, tablet: 22, desktop: 24, lineHeight: 28 },
  xl: { mobile: 28, tablet: 30, desktop: 32, lineHeight: 36 },
  display: { mobile: 36, tablet: 40, desktop: 44, lineHeight: 44 },
} as const;

export const TYPOGRAPHY_TIER_NAMES = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'display'] as const;

/**
 * Strict TextInput Font Scale Invariant (Apple HIG >= 16px)
 * Restricted strictly to [16, 18, 22] to eliminate iOS WebKit auto-zoom
 */
export const TEXT_INPUT_FONT_SIZES = [16, 18, 22] as const;
export type TextInputFontSize = (typeof TEXT_INPUT_FONT_SIZES)[number];

/**
 * High-Contrast Static Canvas & QR Constants
 */
export const QR_CANVAS_COLOR = '#FFFFFF';
export const ON_BRAND_TEXT_COLOR = '#FFFFFF';
