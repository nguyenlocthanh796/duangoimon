import { Dimensions } from 'react-native';

const FONT = 'BeVietnamPro';

/**
 * Typography — Strictly 3-size system for F&B POS.
 *
 * Rules:
 *   sm = 13px  (labels, subtitles, badges, timestamps, tab names, captions)
 *   md = 16px  (body, card titles, button text, item prices, panel headers)
 *   lg = 22px  (main page titles, modal titles, KPI big stat numbers)
 *
 * Triết lý: Không dùng scale biến đổi gây lệch cỡ chữ. Đúng 3 cỡ text 13 / 16 / 22px.
 */
export const scale = (size: number) => size;
const getLineHeight = (size: number) => Math.round(size * 1.35);

export const font = {
  // ── sm: 13px (labels / badges / timestamps / caption / chips) ──
  sm: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: getLineHeight(13),
  },
  smBold: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: getLineHeight(13),
  },

  // ── md: 16px (body / buttons / product names / cart items / prices) ──
  md: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: getLineHeight(16),
  },
  mdBold: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: getLineHeight(16),
  },

  // ── lg: 22px (totals / stat numbers / page titles / modal titles) ──
  lg: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: getLineHeight(22),
  },
};
