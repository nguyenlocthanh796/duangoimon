import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
const maxDim = Math.max(width, height);

// iPad scales up 1.25x so font stays readable on larger screens.
const scaleFactor = maxDim >= 1024 ? 1.25 : 1.0;
export const scale = (size: number) => Math.round(size * scaleFactor);
const getLineHeight = (size: number) => Math.round(size * 1.35);

const FONT = 'BeVietnamPro';

/**
 * Typography tokens — 6 size tiers × 3 weight tiers (max 600).
 *
 * Triết lý: nhấn mạnh bằng MÀU + NỀN. Bold chỉ dùng SemiBold (600) để tránh
 * chữ nặng trên iPad (scale 1.15x).
 *
 * Quy ước mapping xem implementation_plan.md.
 */
export const font = {
  // ── xs tier (caption / tableHeader / badge / micro) ───────────────
  caption: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(12),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(12)),
  },
  micro: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(12),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(12)),
  },
  badge: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(12),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(12)),
  },
  tableHeader: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(12),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(12)),
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  label: {
    fontFamily: `${FONT}_500Medium`,
    fontSize: scale(12),
    fontWeight: '500' as const,
    lineHeight: getLineHeight(scale(12)),
  },
  statLabel: {
    fontFamily: `${FONT}_500Medium`,
    fontSize: scale(12),
    fontWeight: '500' as const,
    lineHeight: getLineHeight(scale(12)),
    color: '#64748B',
  },

  // ── sm tier (bodySmall / tableCell / buttonSmall / form label) ───
  bodySmall: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(14),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(14)),
  },
  tableCell: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(14),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(14)),
  },
  tableCellBold: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(14),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(14)),
  },
  buttonSmall: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(14),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(14)),
  },
  formLabel: {
    fontFamily: `${FONT}_500Medium`,
    fontSize: scale(14),
    fontWeight: '500' as const,
    lineHeight: getLineHeight(scale(14)),
  },

  // ── md tier (body / button / input) ──────────────────────────────
  body: {
    fontFamily: `${FONT}_400Regular`,
    fontSize: scale(16),
    fontWeight: '400' as const,
    lineHeight: getLineHeight(scale(16)),
  },
  bodyBold: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(16),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(16)),
  },
  button: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(16),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(16)),
  },

  // ── lg tier (section title / card title / sub-page heading) ──────
  sectionTitle: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(20),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(20)),
  },
  price: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(16),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(16)),
  },

  // ── xl tier (page title / stat number / hero) ────────────────────
  pageTitle: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(20),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(20)),
  },
  statNumber: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(20),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(20)),
  },
  priceLarge: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(20),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(20)),
  },

  // ── display tier (hero / banner number) ──────────────────────────
  display: {
    fontFamily: `${FONT}_600SemiBold`,
    fontSize: scale(20),
    fontWeight: '600' as const,
    lineHeight: getLineHeight(scale(20)),
  },

  // ── Legacy aliases (semantic mapping to new tiers) ───────────────
  h1: undefined as any, // assigned below
  h2: undefined as any,
  h3: undefined as any,
  h4: undefined as any,
  tab: undefined as any,
};

// Wire aliases AFTER object literal so all tokens exist
font.h1 = font.pageTitle;
font.h2 = font.sectionTitle;
font.h3 = font.sectionTitle;
font.h4 = font.bodyBold;
font.tab = font.bodySmall;

// Backward-compatible alias used by some legacy files
export const h1 = font.pageTitle;
export const h2 = font.sectionTitle;
export const h3 = font.sectionTitle;
export const h4 = font.bodyBold;
export const tab = font.bodySmall;
