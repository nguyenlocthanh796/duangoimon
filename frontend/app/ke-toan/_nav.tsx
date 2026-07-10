import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';

interface NavBackProps {
  to: string;
  label?: string;
  onPress: () => void;
}

export default function NavBack({ to, label, onPress }: NavBackProps) {
  const { isWide } = useResponsive();

  // On iPad landscape, sidebar replaces back navigation
  if (isWide) return null;

  return (
    <TouchableOpacity onPress={onPress} style={styles.btn} accessibilityLabel={`Về ${label || 'trang chủ'}`}>
      <Icon name="arrow-left" size={20} color={colors.text.inverse} />
      {label && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 10,
    borderRadius: shape.radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  label: {
    ...font.buttonSmall,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
