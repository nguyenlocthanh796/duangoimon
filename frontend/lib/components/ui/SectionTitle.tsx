import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import AppText from './AppText';

export function SectionTitle({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        {icon && <Icon name={icon as any} size={18} color={colors.brand.primary} />}
        <View>
          <AppText variant="large" weight="bold">{title}</AppText>
          {subtitle ? <AppText variant="small" style={{ marginTop: 2 }}>{subtitle}</AppText> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

export function StatPill({
  label,
  value,
  color = colors.text.primary,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillLabel}>{label}</Text>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
    marginTop: 6,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: 96,
  },
  pillLabel: { ...font.caption, color: colors.text.muted, fontWeight: '600' },
  pillValue: { ...font.sectionTitle, fontWeight: '600', marginTop: 2 },
});
