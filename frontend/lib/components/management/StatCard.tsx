import { View, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import SkeletonBox from '../ui/SkeletonBox';

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

export default function StatCard({ label, value, icon, color, bgColor, loading, growth, cardStyle, hideTrend, compact }: StatCardProps) {
  const s = compact ? stylesCompact : stylesNormal;
  const showTrend = !hideTrend && growth !== undefined;

  return (
    <View style={[s.card, cardStyle]}>
      {/* Trend Badge - positioned absolutely */}
      {showTrend && (
        <View style={s.trendBadge}>
          <Icon name={growth >= 0 ? 'arrow-top-right' : 'arrow-bottom-right'} size={compact ? 10 : 12} color={colors.text.secondary} />
          <Text style={s.trendBadgeText}>
            {growth! >= 0 ? '+' : ''}{growth}%
          </Text>
        </View>
      )}
      
      {/* Row 1: Icon and Value */}
      <View style={s.row1}>
        <View style={[s.iconBg, { backgroundColor: bgColor }]}>
          <Icon name={icon as any} size={compact ? 18 : 20} color={color} />
        </View>
        {loading ? (
          <SkeletonBox w={'60%'} h={compact ? 24 : 32} />
        ) : (
          <Text style={s.value}>{value}</Text>
        )}
      </View>

      {/* Row 2: Label */}
      <Text style={s.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const stylesNormal = {
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: 'center' as const,
  },
  trendBadge: {
    position: 'absolute' as const,
    top: 12, right: 12,
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: shape.radius.sm, backgroundColor: colors.surface.disabled
  },
  trendBadgeText: { ...font.micro, fontWeight: '600' as const, color: colors.text.secondary },
  row1: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  iconBg: { width: 40, height: 40, borderRadius: shape.radius.md, alignItems: 'center' as const, justifyContent: 'center' as const },
  value: { ...font.h1, fontSize: 26, fontWeight: '700' as const, color: colors.text.primary, flex: 1 },
  label: { ...font.body, color: colors.text.secondary, fontWeight: '500' as const, marginTop: 4 },
} as const;

const stylesCompact = {
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: 'center' as const,
  },
  trendBadge: {
    position: 'absolute' as const,
    top: 8, right: 8,
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: shape.radius.sm, backgroundColor: colors.surface.disabled
  },
  trendBadgeText: { ...font.micro, fontWeight: '600' as const, color: colors.text.secondary },
  row1: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  iconBg: { width: 34, height: 34, borderRadius: shape.radius.sm, alignItems: 'center' as const, justifyContent: 'center' as const },
  value: { ...font.h2, fontSize: 20, fontWeight: '700' as const, color: colors.text.primary, flex: 1 },
  label: { ...font.caption, color: colors.text.secondary, fontWeight: '500' as const, marginTop: 2 },
} as const;
