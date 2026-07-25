import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { ExecDashboard } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

type TabKey = 'branch' | 'daily';

export default function ExecDashboardScreen() {
  const { isWide } = useResponsive();
  const [d, setD] = useState<ExecDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('branch');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request<ExecDashboard>('/api/v1/quan-ly/exec-dashboard');
      setD(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
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
      render: (r) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={tab === 'branch' ? 'storefront' : 'calendar-text'} size={14} color={colors.brand.primary} />
          </View>
          <AppText variant="sm" weight="bold" color="#050505" numberOfLines={1}>
            {r.branch || r.date?.slice(5) || r.date || 'Chi nhánh'}
          </AppText>
        </View>
      ),
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      width: 140,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.revenue || 0,
      render: (r) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(r.revenue || 0)}</AppText>,
    },
  ];

  // Safely extract numeric values to prevent "undefined"
  const totalRevenue = d?.total_revenue ?? 0;
  const totalOrders = d?.total_orders ?? 0;
  const activeTables = d?.active_tables ?? 0;
  const tableOccupancy = d?.table_occupancy ?? 0;
  const avgOrder = d?.avg_order ?? 0;

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="view-dashboard" size={20} color={colors.brand.primary} />
        <AppText variant="md" weight="bold" color="#050505">Chỉ số điều hành P&L</AppText>
      </View>
      <View style={{ gap: 12, paddingTop: 4 }}>
        {[
          { label: 'Doanh thu hôm nay', value: formatVND(totalRevenue), icon: 'cash-register', color: colors.status.success },
          { label: 'Tổng số đơn hàng', value: `${totalOrders} đơn`, icon: 'receipt', color: colors.brand.primary },
          { label: 'Bàn đang phục vụ', value: `${activeTables} bàn`, icon: 'table-furniture', color: '#F97316' },
          { label: 'Tỷ lệ lấp đầy (Occupancy)', value: `${tableOccupancy}%`, icon: 'chart-pie', color: '#8B5CF6' },
          { label: 'Trung bình / Đơn hàng', value: formatVND(avgOrder), icon: 'calculator', color: '#0EA5E9' },
        ].map((r, i) => (
          <View key={i} style={styles.pnlRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.miniIconBadge, { backgroundColor: `${r.color}15` }]}>
                <Icon name={r.icon as any} size={14} color={r.color} />
              </View>
              <AppText variant="sm" color={colors.text.secondary}>{r.label}</AppText>
            </View>
            <AppText variant="sm" weight="bold" color="#050505">{r.value}</AppText>
          </View>
        ))}
      </View>
    </View>
  );

  const renderMobileCard = ({ item: r }: { item: any }) => (
    <View style={styles.itemMobile}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
          <Icon name={tab === 'branch' ? 'storefront' : 'calendar-text'} size={20} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>
            {r.branch || r.date || 'Chi nhánh'}
          </AppText>
          <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>
            {tab === 'branch' ? 'Chi nhánh hoạt động' : `Ngày ${r.date}`}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(r.revenue || 0)}</AppText>
          <AppText variant="sm" color="#65676B">Doanh thu</AppText>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Mobile Header */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">Điều hành P&L</AppText>
          <TouchableOpacity onPress={load} style={styles.addBtn}>
            <Icon name="refresh" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Làm mới</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 📊 Native App Style KPI Widget Cards Strip */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="currency-usd" size={20} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(totalRevenue)}</AppText>
            <AppText variant="sm" color="#65676B">Doanh thu</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="receipt" size={20} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{totalOrders} đơn</AppText>
            <AppText variant="sm" color="#65676B">Đơn hàng</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="table-furniture" size={20} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">{activeTables} bàn</AppText>
            <AppText variant="sm" color="#65676B">Đang dùng</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#F3E8FF' }]}>
            <Icon name="chart-pie" size={20} color="#8B5CF6" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#8B5CF6">{tableOccupancy}%</AppText>
            <AppText variant="sm" color="#65676B">Lấp đầy</AppText>
          </View>
        </View>
      </View>

      {/* Tabs filter */}
      <View style={{ marginVertical: 4, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {(['branch', 'daily'] as const).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Icon name={t === 'branch' ? 'storefront' : 'calendar-clock'} size={14} color={active ? colors.brand.primary : '#65676B'} />
                <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                  {t === 'branch' ? 'Theo chi nhánh' : '7 ngày gần đây'}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any>
              columns={columns}
              data={rows}
              getRowId={(r: any) => r?.id || r?.branch || r?.date || String(Math.random())}
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
        <FlatList
          data={rows}
          keyExtractor={(r: any, idx) => r?.id || r?.branch || r?.date || String(idx)}
          renderItem={renderMobileCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="view-dashboard-outline"
                title="Chưa có dữ liệu thống kê"
                subtitle=""
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Facebook Story Highlight Metric Cards Container */
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  fbMetricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fbMetricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justify: 'center',
  },

  /* Filter chips */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: colors.brand.primaryBg,
    borderColor: '#FFEDD5',
  },

  /* 📱 Mobile Full-Width Facebook Feed Card Block */
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justify: 'center',
  },

  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  pnlRow: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  miniIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justify: 'center',
  },
});
