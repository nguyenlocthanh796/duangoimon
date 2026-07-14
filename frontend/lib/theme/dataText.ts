import { colors } from './colors';
import { font } from './typography';

/**
 * Typography "nhẹ" cho dữ liệu bảng / thẻ.
 * Nhấn mạnh bằng MÀU + NỀN, weight tối đa 600.
 */

export const colHeader = {
  ...font.tableHeader,
  color: colors.text.muted,
};

export const dataValue = {
  ...font.tableCell,
  color: colors.text.primary,
};

export const dataAmountPos = {
  ...font.tableCell,
  color: colors.status.success,
};

export const dataAmountNeg = {
  ...font.tableCell,
  color: colors.status.danger,
};

export const sectionTitle = {
  ...font.sectionTitle,
  color: colors.text.primary,
};

export const totalValue = {
  ...font.body,
  color: colors.text.primary,
};

export const dataLabel = {
  ...font.caption,
  color: colors.text.muted,
};
