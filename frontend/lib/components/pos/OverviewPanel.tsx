import React from 'react';
import { View } from 'react-native';
import { colors } from '../../theme';
import { shape } from '../../theme/shape';
import { formatPrice } from '../../utils/format';
import AppText from '../ui/AppText';
import KitchenFeed from './KitchenFeed';
import { getKitchenFeed } from '../../api/kitchen';
import type { Table } from './TableCard';

interface OverviewPanelProps {
  tables: Table[];
  onTablePress: (table: Table) => void;
}

export default function OverviewPanel({ tables, onTablePress }: OverviewPanelProps) {
  const occupied = tables.filter(t => t.status === 'co_khach');
  const totalRevenue = tables.reduce((s, t) => s + (t.orderTotal || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.card }}>
      {/* Header */}
      <View style={{
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: colors.border.light,
      }}>
        <AppText variant="md" weight="bold" color={colors.text.primary}>
          Tổng quan
        </AppText>
      </View>

      <View style={{ flex: 1, padding: 12, gap: 12 }}>
        {/* ── Compact stat row ─────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.surface.app,
          borderRadius: shape.radius.md,
          borderWidth: 1, borderColor: colors.border.default,
        }}>
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 }}>
            <AppText variant="md" weight="bold" color={colors.text.primary}>
              {tables.length}
            </AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng</AppText>
          </View>
          <View style={{ width: 1, backgroundColor: colors.border.light }} />
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>
              {occupied.length}
            </AppText>
            <AppText variant="sm" color={colors.text.muted}>Đang dùng</AppText>
          </View>
          <View style={{ width: 1, backgroundColor: colors.border.light }} />
          <View style={{ flex: 1.4, alignItems: 'center', paddingVertical: 10, gap: 2 }}>
            <AppText variant="lg" weight="bold" color={colors.brand.primary} numberOfLines={1}>
              {formatPrice(totalRevenue)}
            </AppText>
            <AppText variant="sm" color={colors.text.muted}>Doanh thu</AppText>
          </View>
        </View>

        {/* ── Kitchen / Bar feed ───────────────────────── */}
        <KitchenFeed fetchFn={getKitchenFeed} pollInterval={15_000} />
      </View>
    </View>
  );
}
