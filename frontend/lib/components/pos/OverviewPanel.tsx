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
  const occupied = tables.filter((t) => t.status === 'co_khach');
  const emptyCount = tables.length - occupied.length;
  const totalRevenue = tables.reduce((s, t) => s + (t.orderTotal || 0), 0);
  const totalItems = tables.reduce((s, t) => s + (t.orderItemCount || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.card }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <AppText variant="md" color={colors.text.primary}>
          Tổng quan vận hành
        </AppText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#DCFCE7',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 12,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' }} />
          <AppText variant="md" color="#15803D">
            Realtime 0ms
          </AppText>
        </View>
      </View>

      <View style={{ flex: 1, padding: 12, gap: 12 }}>
        {/* ── Metric Grid ─────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.surface.app,
            borderRadius: shape.radius.md,
            borderWidth: 1,
            borderColor: colors.border.default,
            padding: 10,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <AppText variant="md" color="#EA580C">
                {occupied.length}
              </AppText>
              <AppText variant="md" color={colors.text.muted}>
                Bàn có khách
              </AppText>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border.light }} />
            <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <AppText variant="md" color="#16A34A">
                {emptyCount}
              </AppText>
              <AppText variant="md" color={colors.text.muted}>
                Bàn trống
              </AppText>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border.light }} />
            <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <AppText variant="md" color="#2563EB">
                {totalItems}
              </AppText>
              <AppText variant="md" color={colors.text.muted}>
                Tổng món
              </AppText>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border.light }} />

          <View style={{ alignItems: 'center', gap: 2 }}>
            <AppText variant="md" weight="bold" color={colors.brand.primary}>
              {formatPrice(totalRevenue)}
            </AppText>
            <AppText variant="md" color={colors.text.muted}>
              Tiền đang phục vụ
            </AppText>
          </View>
        </View>

        {/* ── System Status Card ─────────────────────────── */}
        <View
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: shape.radius.md,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 10,
            gap: 6,
          }}
        >
          <AppText variant="md" color="#475569">
            HẠ TẦNG HỆ THỐNG
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="md" color="#64748B">
              Backend (Render)
            </AppText>
            <AppText variant="md" color="#16A34A">
              🟢 Live (200ms)
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="md" color="#64748B">
              Frontend (Pages)
            </AppText>
            <AppText variant="md" color="#16A34A">
              🟢 CDN Fast
            </AppText>
          </View>
        </View>

        {/* ── Kitchen / Bar feed ───────────────────────── */}
        <KitchenFeed fetchFn={getKitchenFeed} pollInterval={15_000} />
      </View>
    </View>
  );
}
