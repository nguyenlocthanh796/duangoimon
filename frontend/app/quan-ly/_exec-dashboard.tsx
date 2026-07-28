import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
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
            <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ fontSize: 10 }}>
              {tab === 'branch' ? 'CN' : 'Ng'}
            </AppText>
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
    <View style={ss.sectionWrap}>
      <View style={ss.sectionHeader}>
        <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
          <Icon name="chart-pie" size={14} color={colors.brand.primary} />
        </View>
        <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1 }}>Chỉ số điều hành P&L</AppText>
      </View>
      <View style={{ padding: 10, gap: 8 }}>
        {[
          { label: 'Doanh thu hôm nay', value: formatVND(totalRevenue), color: colors.status.success },
          { label: 'Tổng số đơn hàng', value: `${totalOrders} đơn`, color: colors.brand.primary },
          { label: 'Bàn đang phục vụ', value: `${activeTables} bàn`, color: '#F97316' },
          { label: 'Tỷ lệ lấp đầy (Occupancy)', value: `${tableOccupancy}%`, color: '#8B5CF6' },
          { label: 'Trung bình / Đơn hàng', value: formatVND(avgOrder), color: '#0EA5E9' },
        ].map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i === 4 ? 0 : 1, borderBottomColor: '#F1F5F9' }}>
            <AppText variant="sm" color="#64748B">{r.label}</AppText>
            <AppText variant="sm" weight="bold" color="#0F172A">{r.value}</AppText>
          </View>
        ))}
      </View>
    </View>
  );

  const renderMobileCard = ({ item: r }: { item: any }) => (
    <TouchableOpacity activeOpacity={0.7} style={ss.listRow} key={r.id || r.branch || r.date}>
      <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
        <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ fontSize: 10 }}>
          {tab === 'branch' ? 'CN' : r.date?.slice(5) || 'Ng'}
        </AppText>
      </View>
      <View style={{ flex: 1, paddingLeft: 8 }}>
        <AppText variant="sm" weight="bold" color="#0F172A" numberOfLines={1}>
          {r.branch || r.date || 'Chi nhánh'}
        </AppText>
        <AppText variant="sm" color="#64748B">
          {tab === 'branch' ? 'Chi nhánh hoạt động' : `Ngày ${r.date}`}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(r.revenue || 0)}</AppText>
        <AppText variant="sm" color="#64748B">Doanh thu</AppText>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* 📊 Native App Style KPI Widget Cards Strip */}
      <View style={ss.metricContainer}>
        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
            <AppText variant="sm" weight="bold" color={colors.status.success} style={{ fontSize: 11 }}>đ</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(totalRevenue)}</AppText>
            <AppText variant="sm" color="#64748B">Doanh thu</AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
            <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ fontSize: 11 }}>đơn</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#0F172A">{totalOrders} đơn</AppText>
            <AppText variant="sm" color="#64748B">Đơn hàng</AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#FFF7ED' }]}>
            <AppText variant="sm" weight="bold" color="#F97316" style={{ fontSize: 11 }}>bàn</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">{activeTables} bàn</AppText>
            <AppText variant="sm" color="#64748B">Đang dùng</AppText>
          </View>
        </View>

        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#F3E8FF' }]}>
            <AppText variant="sm" weight="bold" color="#8B5CF6" style={{ fontSize: 11 }}>%</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#8B5CF6">{tableOccupancy}%</AppText>
            <AppText variant="sm" color="#64748B">Lấp đầy</AppText>
          </View>
        </View>
      </View>

      {/* Tabs filter */}
      <View style={{ width: '100%', marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%', flexGrow: 0, height: 44 }}
          contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}
        >
          {(['branch', 'daily'] as const).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[ss.filterChip, active && ss.filterChipActive]}
              >
                <AppText variant="sm" weight="bold" color={active ? colors.brand.primary : "#334155"}>
                  {t === 'branch' ? 'Theo chi nhánh' : '7 ngày gần đây'}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {isWide ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
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
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          {renderHeader()}

          {/* 📦 Section CardBox bọc Danh sách / EmptyState */}
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <View style={[ss.iconCircleSm, { backgroundColor: '#EEF2FF' }]}>
                <Icon name="view-list-outline" size={14} color={colors.brand.primary} />
              </View>
              <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1 }}>
                {tab === 'branch' ? 'DOANH THU THEO CHI NHÁNH' : 'DOANH THU 7 NGÀY GẦN ĐÂY'} ({rows.length})
              </AppText>
            </View>

            <View style={{ paddingHorizontal: 10, paddingVertical: rows.length ? 4 : 16 }}>
              {loading ? (
                <TableSkeleton rowCount={4} />
              ) : rows.length === 0 ? (
                <EmptyState
                  icon="view-dashboard-outline"
                  title="Chưa có dữ liệu thống kê"
                  subtitle="Vui lòng chọn bộ lọc khác hoặc bổ sung giao dịch"
                />
              ) : (
                rows.map((r: any, idx: number) => renderMobileCard({ item: r }))
              )}
            </View>
          </View>

          {/* 📊 Bổ sung Panel P&L Chỉ số điều hành trên Mobile */}
          {renderPanel()}
        </ScrollView>
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
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Facebook Story Highlight Metric Cards Container */
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
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
    paddingVertical: 6,
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
    justifyContent: 'center',
  },

  /* Filter chips */
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  chipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.brand.primary,
  },

  /* 📱 Mobile Full-Width Facebook Feed Card Block */
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 8,
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
    justifyContent: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  miniIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
