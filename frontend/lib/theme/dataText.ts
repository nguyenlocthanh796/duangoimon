import { colors } from './colors';
import { font } from './typography';

/**
 * Typography cho dữ liệu bảng / thẻ.
 * 3-size system: sm(14), md(16), lg(18).
 * Bold chỉ colHeader (sm). Data values = md.
 * Tổng số (totalValue) = lg.
 */

export const colHeader = {
  ...font.sm,
  color: colors.text.muted,
};

export const dataValue = {
  ...font.md,
  color: colors.text.primary,
};

export const dataAmountPos = {
  ...font.md,
  color: colors.status.success,
};

export const dataAmountNeg = {
  ...font.md,
  color: colors.status.danger,
};

export const sectionTitle = {
  ...font.headerTitle,
  color: colors.text.primary,
};

export const totalValue = {
  ...font.lg,
  color: colors.text.primary,
};

export const dataLabel = {
  ...font.sm,
  color: colors.text.muted,
};
