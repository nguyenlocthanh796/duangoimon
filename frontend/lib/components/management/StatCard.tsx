import { View, Text } from 'react-native';
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
  compact,
}: StatCardProps) {
  const s = compact ? stylesCompact : stylesNormal;
  const showTrend = !hideTrend && growth !== undefined && !compact;
  // Estimated badge width: icon(~13) + gap(2) + padding(4) + text(~8px per char)
  const badgeWidth = compact ? 0 : 82;

  return (
    <View style={[s.card, cardStyle, showTrend && { paddingRight: 16 + badgeWidth }]}>
      {/* Trend Badge - absolute top-right */}
      {showTrend && (
        <View style={s.trendBadge}>
          <Icon
            name={growth! >= 0 ? 'arrow-top-right' : 'arrow-bottom-right'}
            size={compact ? 7 : 12}
            color={growth! >= 0 ? colors.status.success : colors.status.danger}
          />
          <AppText variant="small" weight="bold" color={colors.text.primary}>
            {growth! >= 0 ? '+' : ''}
            {growth}%
          </AppText>
        </View>
      )}

      {/* Row 1: Icon + Value */}
      <View style={s.row1}>
        <View style={[s.iconBg, { backgroundColor: bgColor }]}>
          <Icon name={icon as any} size={compact ? 18 : 20} color={color} />
        </View>
        {loading ? (
          <SkeletonBox w={'60%'} h={compact ? 24 : 32} />
        ) : (
          <AppText
            variant="large"
            weight="bold"
            color={colors.text.primary}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
            style={{ flex: 1, flexShrink: 1, textAlign: compact ? 'center' : 'left' }}
          >
            {value}
          </AppText>
        )}
      </View>

      {/* Row 2: Label */}
      <AppText
        variant={compact ? 'small' : 'base'}
        weight={compact ? 'normal' : 'bold'}
        color={colors.text.secondary}
        numberOfLines={1}
        style={{ marginTop: compact ? 1 : 4, textAlign: compact ? 'center' : 'left' }}
      >
        {label}
      </AppText>
    </View>
  );
}

const stylesNormal = {
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: 'center' as const,
  },
  trendBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: shape.radius.sm,
    backgroundColor: colors.surface.disabled,
    flexShrink: 0,
  },
  trendBadgeText: { ...font.micro, fontWeight: '600' as const },
  row1: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: shape.radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  value: {
    ...font.statNumber,
    color: colors.text.primary,
    flex: 1,
    flexShrink: 1,
  },
  label: { ...font.body, color: colors.text.secondary, fontWeight: '500' as const, marginTop: 4 },
} as const;

const stylesCompact = {
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 0,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  trendBadge: {
    position: 'absolute' as const,
    top: 5,
    right: 5,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 2,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: colors.surface.disabled,
    flexShrink: 0,
  },
  trendBadgeText: { ...font.micro, fontWeight: '600' as const },
  row1: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 6 },
  iconBg: {
    width: 30,
    height: 30,
    borderRadius: shape.radius.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  value: {
    ...font.sectionTitle,
    color: colors.text.primary,
    flexShrink: 1,
    textAlign: 'center' as const,
  },
  label: {
    ...font.caption,
    color: colors.text.secondary,
    fontWeight: '500' as const,
    marginTop: 1,
    textAlign: 'center' as const,
  },
} as const;
