import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import SkeletonBox from '../ui/SkeletonBox';
import AppText from '../ui/AppText';

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  bgColor: string;
  loading: boolean;
  growth?: number;
  style?: any;
  hideTrend?: boolean;
}

export default function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  loading,
  growth,
  style,
  hideTrend,
}: StatCardProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const showTrend = !hideTrend && growth !== undefined;

  return (
    <View style={[styles.card, { padding: isWide ? 16 : 12 }, style]}>
      {/* Trend Badge */}
      {showTrend && (
        <View style={styles.trendBadge}>
          <Icon
            name={growth! >= 0 ? 'arrow-top-right' : 'arrow-bottom-right'}
            size={12}
            color={growth! >= 0 ? colors.status.success : colors.status.danger}
          />
          <AppText variant="sm" weight="bold" color={growth! >= 0 ? colors.status.success : colors.status.danger}>
            {growth! >= 0 ? '+' : ''}
            {growth}%
          </AppText>
        </View>
      )}

      {/* Row 1: Icon + Value */}
      <View style={styles.row1}>
        <View style={[styles.iconBg, { backgroundColor: bgColor }]}>
          <Icon name={icon as any} size={18} color={color} />
        </View>
        {loading ? (
          <SkeletonBox w={'60%'} h={24} />
        ) : (
          <AppText
            variant="md"
            weight="bold"
            color={colors.text.primary}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={styles.valueText}
          >
            {value}
          </AppText>
        )}
      </View>

      {/* Row 2: Label */}
      <AppText
        variant="sm"
        color={colors.text.secondary}
        numberOfLines={1}
        style={{ marginTop: 4 }}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    justifyContent: 'center',
  },
  trendBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: shape.radius.sm,
    backgroundColor: colors.surface.app,
  },
  row1: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: shape.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    flexShrink: 1,
  },
});
