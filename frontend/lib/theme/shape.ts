import { Platform } from 'react-native';

export const shape = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 999,
  },
  table: {
    rowHeight: 44,
    headerHeight: 48,
    cellPadding: 8,
  },
};

/** Consistent shadow/elevation tokens */
export const elevation = Platform.select({
  web: {
    low: {
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      elevation: 2,
    },
    medium: {
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      elevation: 6,
    },
    high: {
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      elevation: 12,
    },
    header: {
      boxShadow: '0 4px 12px rgba(249,115,22,0.4)',
      elevation: 8,
    },
  },
  default: {
    low: { elevation: 2 },
    medium: { elevation: 6 },
    high: { elevation: 12 },
    header: { elevation: 8 },
  },
}) as {
  low: { elevation?: number; boxShadow?: string };
  medium: { elevation?: number; boxShadow?: string };
  high: { elevation?: number; boxShadow?: string };
  header: { elevation?: number; boxShadow?: string };
};
