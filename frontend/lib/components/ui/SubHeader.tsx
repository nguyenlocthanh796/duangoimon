import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors } from '../../theme';

interface SubHeaderProps {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export default function SubHeader({ title, subtitle, right }: SubHeaderProps) {
  if (!title && !right) return null;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {title && <AppText variant="md" color={colors.text.primary}>{title}</AppText>}
        {subtitle && <AppText variant="sm" color={colors.text.muted}>{subtitle}</AppText>}
      </View>
      <View style={styles.right}>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface.app,
  },
  left: {
    flexDirection: 'column',
    gap: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
