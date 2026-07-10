import { colors, font } from './index';

/**
 * Chuẩn typography "nhẹ" — rõ ràng như Sidebar.
 * Nhấn mạnh bằng MÀU + NỀN, KHÔNG dùng bold (max 600 cho giá trị).
 * Chỉ dùng cho dữ liệu bảng / thẻ; tiêu đề trang & modal dùng font.h2/h3.
 */

/** Nhãn cột / group label — y hệt Sidebar group label. */
export const colHeader = {
  ...font.caption,
  color: colors.text.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
  fontWeight: '400' as const,
};

/** Giá trị dữ liệu thường. */
export const dataValue = {
  ...font.bodySmall,
  color: colors.text.primary,
  fontWeight: '400' as const,
};

/** Tiền thu (dương) — xanh. */
export const dataAmountPos = {
  ...font.bodySmall,
  color: colors.status.success,
  fontWeight: '400' as const,
};

/** Tiền chi (âm) — đỏ. */
export const dataAmountNeg = {
  ...font.bodySmall,
  color: colors.status.danger,
  fontWeight: '400' as const,
};

/** Tiêu đề section / thẻ — 400, nhấn bằng nền. */
export const sectionTitle = {
  ...font.body,
  color: colors.text.primary,
  fontWeight: '400' as const,
};

/** Tổng kết — 400, nhấn bằng viền border.brand (set riêng). */
export const totalValue = {
  ...font.body,
  color: colors.text.primary,
  fontWeight: '400' as const,
};

/** Nhãn phụ (caption) — 400 muted. */
export const dataLabel = {
  ...font.caption,
  color: colors.text.muted,
  fontWeight: '400' as const,
};
