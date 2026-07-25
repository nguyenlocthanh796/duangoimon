import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { ExecDashboard } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import AppText from '../../lib/components/ui/AppText';

type TabKey = 'branch' | 'daily';

export default function ExecDashboardScreen() {
  const { isWide } = useResponsive();
  const [d, setD] = useState<ExecDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('branch');

  const load = useCallback(async () => {
    try { setLoading(true); setD(await request<ExecDashboard>('/api/v1/quan-ly/exec-dashboard')); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    if (!d) return [];
    return tab === 'branch' ? (d.revenue_by_branch || []) : (d.daily_revenue || []);
  }, [d, tab]);

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: tab === 'branch' ? 'Chi nhánh' : 'Ngày',
      flex: 1,
      render: (r) => <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{r.branch || r.date?.slice(5) || r.date}</AppText>,
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      width: 140,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.revenue || 0,
      render: (r) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(r.revenue)}</AppText>,
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="view-dashboard" size={18} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Chỉ số điều hành thực tế</AppText>
      </View>
      {d && (
        <View style={{ gap: 10 }}>
          {[
            { label: 'Doanh thu hôm nay', value: formatVND(d.total_revenue) },
            { label: 'Tổng số đơn hàng', value: `${d.total_orders} đơn` },
            { label: 'Bàn đang phục vụ', value: `${d.active_tables} bàn` },
            { label: 'Tỷ lệ lấp đầy (Occupancy)', value: `${d.table_occupancy}%` },
            { label: 'Trung bình/Đơn', value: formatVND(d.avg_order) },
          ].map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="sm" color={colors.text.muted}>{r.label}</AppText>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>{r.value}</AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="currency-usd" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{d ? formatVND(d.total_revenue) : '-'}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Doanh thu</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="receipt" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{d?.total_orders || '-'}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đơn hàng</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="table-furniture" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{d ? `${d.active_tables} bàn` : '-'}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đang dùng</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="chart-line" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{d ? `${d.table_occupancy}%` : '-'}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Lấp đầy</AppText>
          </View>
        </View>
      </View>

      {/* Tabs filter */}
      <View style={styles.filterRow}>
        {(['branch', 'daily'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.chip, tab === t && styles.chipActive]}>
            <AppText variant="sm" color={tab === t ? colors.brand.primary : colors.text.secondary} weight={tab === t ? 'bold' : 'normal'}>
              {t === 'branch' ? 'Theo chi nhánh' : '7 ngày gần đây'}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any>
              columns={columns}
              data={rows}
              getRowId={(r: any) => r?.id || r?.date || String(Math.random())}
              loading={loading}
              onRefresh={load}
              compact
              emptyIcon="view-dashboard-outline"
              emptyTitle="Chưa có dữ liệu thống kê"
              emptySubtitle=""
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <DataTable<any>
            columns={columns}
            data={rows}
            getRowId={(r: any) => r?.id || r?.date || String(Math.random())}
            loading={loading}
            onRefresh={load}
            compact
            emptyIcon="view-dashboard-outline"
            emptyTitle="Chưa có dữ liệu thống kê"
            emptySubtitle=""
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    marginHorizontal: 8,
    marginVertical: 8,
  },
  statItem: { flex: 1, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: shape.radius.md, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand.primaryBg },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
});
