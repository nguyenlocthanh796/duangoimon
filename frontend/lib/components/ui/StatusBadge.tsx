import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import AppText from './AppText';
import { colors } from '../../theme';

export type BadgeSeverity = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'critical';

const SEVERITY_MAP: Record<BadgeSeverity, { color: string; bg: string }> = {
  success: { color: colors.status.success, bg: `${colors.status.success}18` },
  warning: { color: colors.status.warning, bg: `${colors.status.warning}18` },
  danger: { color: colors.status.danger, bg: `${colors.status.danger}18` },
  info: { color: colors.status.info, bg: `${colors.status.info}18` },
  neutral: { color: colors.text.secondary, bg: '#F1F5F9' },
  critical: { color: '#7F1D1D', bg: '#FEE2E2' },
};

export interface StatusBadgeProps {
  label: string;
  severity?: BadgeSeverity;
  color?: string;
  bgColor?: string;
  showDot?: boolean;
  style?: ViewStyle;
}

export default function StatusBadge({
  label,
  severity,
  color,
  bgColor,
  showDot = true,
  style,
}: StatusBadgeProps) {
  let badgeColor = color ?? colors.text.primary;
  let bg = bgColor ?? '#F1F5F9';

  if (severity && SEVERITY_MAP[severity]) {
    badgeColor = color ?? SEVERITY_MAP[severity].color;
    bg = bgColor ?? SEVERITY_MAP[severity].bg;
  } else if (color) {
    bg = bgColor ?? `${color}18`;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <AppText variant="sm" color={badgeColor} style={styles.text}>
        {showDot ? `● ${label}` : label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    lineHeight: 14,
  },
});
