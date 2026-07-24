import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
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
  cardStyle?: any;
  hideTrend?: boolean;
  compact?: boolean;
}

export default function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
  loading,
  growth,
  cardStyle,
  hideTrend,
}: StatCardProps) {
  const showTrend = !hideTrend && growth !== undefined;

  return (
    <View style={[styles.card, cardStyle]}>
      {/* Trend Badge */}
      {showTrend && (
        <View style={styles.trendBadge}>
          <Icon
            name={growth! >= 0 ? 'arrow-top-right' : 'arrow-bottom-right'}
            size={12}
            color={growth! >= 0 ? colors.status.success : colors.status.danger}
          />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>
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
          <SkeletonBox w={'60%'} h={22} />
        ) : (
          <AppText
            variant="md"
            weight="bold"
            color={colors.text.primary}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            style={{ flex: 1, flexShrink: 1 }}
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

const styles = {
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    padding: 12,
    justifyContent: 'center' as const,
  },
  trendBadge: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: shape.radius.sm,
    backgroundColor: colors.surface.app,
  },
  row1: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: shape.radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
} as const;
