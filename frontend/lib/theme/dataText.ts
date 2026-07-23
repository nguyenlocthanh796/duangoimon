import { colors } from './colors';
import { font } from './typography';

/**
 * Typography cho dữ liệu bảng / thẻ.
 * 3-size system: sm(13→16), md(16→20), lg(24→30).
 * Nhấn mạnh bằng MÀU + NỀN, weight tối đa 600.
 */

export const colHeader = {
  ...font.smBold,
  color: colors.text.muted,
};

export const dataValue = {
  ...font.sm,
  color: colors.text.primary,
};

export const dataAmountPos = {
  ...font.sm,
  color: colors.status.success,
};

export const dataAmountNeg = {
  ...font.sm,
  color: colors.status.danger,
};

export const sectionTitle = {
  ...font.mdBold,
  color: colors.text.primary,
};

export const totalValue = {
  ...font.md,
  color: colors.text.primary,
};

export const dataLabel = {
  ...font.sm,
  color: colors.text.muted,
};
