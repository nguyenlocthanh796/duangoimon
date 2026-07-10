import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../../theme';

export type SeverityKey = 'critical' | 'danger' | 'warning' | 'info' | 'success' | 'muted';

export interface StatusBadgeProps {
  label: string;
  severity: SeverityKey;
}

export default function StatusBadge({ label, severity }: StatusBadgeProps) {
  const color = colors.severity[severity] ?? colors.severity.muted;
  return (
    <View style={[styles.badge, { backgroundColor: color + '1A' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  text: { ...font.caption, fontWeight: '700' },
});
