import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';

export type BadgeSeverity = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'critical' | 'muted';

export interface StatusBadgeProps {
  label: string;
  severity?: BadgeSeverity;
  size?: 'sm' | 'md';
  /** pill shape (rounded) vs flat — default flat */
  pill?: boolean;
}

const SEVERITY_MAP: Record<BadgeSeverity, { bg: string; text: string }> = {
  success: { bg: colors.badge.success.bg, text: colors.badge.success.text },
  warning: { bg: colors.badge.warning.bg, text: colors.badge.warning.text },
  danger:  { bg: colors.badge.danger.bg, text: colors.badge.danger.text },
  info:    { bg: colors.badge.info.bg, text: colors.badge.info.text },
  neutral: { bg: colors.badge.neutral.bg, text: colors.badge.neutral.text },
  critical: { bg: colors.badge.danger.bg, text: colors.badge.danger.text },
  muted:   { bg: colors.badge.neutral.bg, text: colors.badge.neutral.text },
};

export default function StatusBadge({ label, severity = 'neutral', size = 'md', pill = false }: StatusBadgeProps) {
  const palette = SEVERITY_MAP[severity];
  const isSmall = size === 'sm';
  return (
    <View
      style={{
        paddingHorizontal: isSmall ? shape.spacing.xs : shape.spacing.sm,
        paddingVertical: isSmall ? 2 : 3,
        borderRadius: pill ? shape.radius.full : shape.radius.xs,
        backgroundColor: palette.bg,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          ...(isSmall ? font.sm : font.smBold),
          fontWeight: '600',
          color: palette.text,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
