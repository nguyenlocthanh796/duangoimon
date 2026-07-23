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
    sp10: 40,
    sp12: 48,
    sp14: 56,
    sp16: 64,
  },
  radius: {
    xs: 4,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 999, // Pill shape
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 10,
    },
    top: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
  },
  animation: {
    duration: {
      instant: 0,
      fast: 150,
      normal: 250,
      slow: 350,
      pulse: 1000,
    },
  },
  table: {
    rowHeight: 44,
    headerHeight: 48,
    cellPadding: 8,
  },
  // Shared control/form tokens – keep touch targets >= 44px on iPad
  control: {
    minTouch: 44,
    fieldHeight: 52,
    inputPaddingH: 16,
    inputPaddingV: 12,
  },
};
