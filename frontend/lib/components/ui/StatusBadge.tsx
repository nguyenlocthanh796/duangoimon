import React from 'react';
import { View, Text } from 'react-native';
import { colors, font } from '../../theme';

export type BadgeSeverity = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  severity?: BadgeSeverity;
  size?: 'sm' | 'md';
}

const SEVERITY_MAP: Record<BadgeSeverity, { bg: string; text: string }> = {
  success: { bg: '#E8F5E9', text: '#2E7D32' },
  warning: { bg: '#FFF8E1', text: '#F57F17' },
  danger:  { bg: '#FFEBEE', text: '#C62828' },
  info:    { bg: '#E3F2FD', text: '#1565C0' },
  neutral: { bg: colors.surface.disabled, text: colors.text.muted },
};

export default function StatusBadge({ label, severity = 'neutral', size = 'md' }: StatusBadgeProps) {
  const palette = SEVERITY_MAP[severity];
  const isSmall = size === 'sm';
  return (
    <View
      style={{
        paddingHorizontal: isSmall ? 4 : 6,
        paddingVertical: isSmall ? 2 : 3,
        borderRadius: 4,
        backgroundColor: palette.bg,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          ...(isSmall ? font.micro : font.badge),
          fontWeight: '700',
          color: palette.text,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
