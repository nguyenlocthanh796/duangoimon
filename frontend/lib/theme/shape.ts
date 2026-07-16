import { Platform } from 'react-native';

export const shape = {
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 999, // Pill shape
  },
  table: {
    rowHeight: 44,
    headerHeight: 48,
    cellPadding: 8,
  },
  // Shared control/form tokens – keep touch targets >= 44px on iPad
  control: {
    minTouch: 44,
    fieldHeight: 48,
    inputPaddingH: 12,
    inputPaddingV: 12,
  },
};

