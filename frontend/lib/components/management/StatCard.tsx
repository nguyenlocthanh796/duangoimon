import React from 'react';
import { View, StyleSheet, useWindowDimensions, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import SkeletonBox from '../ui/SkeletonBox';

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
    <View style={[styles.card, { padding: isWide ? 14 : 12 }, style]}>
      {/* Header Row: Icon + Trend Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.iconBg, { backgroundColor: bgColor }]}>
          <Icon name={icon as any} size={18} color={color} />
        </View>

        {showTrend && (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: growth! >= 0 ? '#ECFDF5' : '#FEE2E2',
                borderColor: growth! >= 0 ? '#A7F3D0' : '#FECACA',
              },
            ]}
          >
            <Icon
              name={growth! >= 0 ? 'arrow-top-right' : 'arrow-bottom-right'}
              size={12}
              color={growth! >= 0 ? '#059669' : '#DC2626'}
            />
            <Text
              style={[
                styles.trendText,
                { color: growth! >= 0 ? '#059669' : '#DC2626' },
              ]}
            >
              {growth! >= 0 ? '+' : ''}
              {growth}%
            </Text>
          </View>
        )}
      </View>

      {/* Main Metric Value (Bold 18px) */}
      <View style={styles.valueRow}>
        {loading ? (
          <SkeletonBox w={'70%'} h={24} style={{ marginTop: 8 }} />
        ) : (
          <Text style={styles.valueText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {value}
          </Text>
        )}
      </View>

      {/* Subtitle Label (Regular 13px #64748B) */}
      <Text style={styles.labelText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E9F0',
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  valueRow: {
    marginTop: 8,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 2,
  },
});

