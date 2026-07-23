import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const maxDim = Math.max(width, height);

// iPad scales up 1.25× so font stays readable on larger screens.
const scaleFactor = maxDim >= 1024 ? 1.25 : 1.0;
export const scale = (size: number) => Math.round(size * scaleFactor);
const getLineHeight = (size: number) => Math.round(size * 1.35);

const FONT = 'BeVietnamPro';

/**
 * Typography — 3-size minimalist system for F&B POS.
 *
 * Triết lý: nhấn mạnh bằng MÀU + NỀN. Chỉ xài 3 cỡ text:
 *   sm = 13 → iPad 16  (labels, badges, timestamps, ghi chú)
 *   md = 16 → iPad 20  (body, buttons, product names, cart items)
 *   lg = 24 → iPad 30  (totals, stat numbers, page titles)
 */
export const font = {
  // ── sm: labels / badges / timestamps / caption ──────────────
  sm: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(13),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(13)),
  },
  smBold: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(13),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(13)),
  },

  // ── md: body / buttons / product names / cart items ─────────
  md: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(16),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(16)),
  },
  mdBold: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(16),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(16)),
  },

  // ── lg: totals / stat numbers / page titles / hero ──────────
  lg: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(24),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(24)),
  },
};
