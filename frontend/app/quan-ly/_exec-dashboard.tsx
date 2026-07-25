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
            { label: 'Doanh thu hôm nay', value: formatVND(d?.total_revenue ?? 0) },
            { label: 'Tổng số đơn hàng', value: `${d?.total_orders ?? (d as any)?.orders_count ?? 0} đơn` },
            { label: 'Bàn đang phục vụ', value: `${d?.active_tables ?? (d as any)?.active_tables_count ?? 0} bàn` },
            { label: 'Tỷ lệ lấp đầy (Occupancy)', value: `${d?.table_occupancy ?? (d as any)?.occupancy_rate ?? 0}%` },
            { label: 'Trung bình/Đơn', value: formatVND(d?.avg_order ?? 0) },
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

  const renderMobileCard = ({ item: r }: { item: any }) => (
    <View style={styles.itemMobile}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.avatarCircle, { backgroundColor: '#EEF2FF' }]}>
          <Icon name={tab === 'branch' ? 'storefront' : 'calendar-text'} size={20} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>
            {r.branch || r.date || 'Hệ thống'}
          </AppText>
          <AppText variant="sm" color="#65676B" style={{ marginTop: 2 }}>
            {tab === 'branch' ? 'Chi nhánh chính' : `Ngày ${r.date}`}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(r.revenue)}</AppText>
          <AppText variant="sm" color="#65676B">Doanh thu</AppText>
        </View>
      </View>

      <View style={styles.cardActionDivider} />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => {}}>
          <Icon name="chart-bar" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Xem chi tiết</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">Điều hành P&L</AppText>
          <TouchableOpacity onPress={load} style={styles.addBtn}>
            <Icon name="refresh" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Làm mới</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="currency-usd" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{d ? formatVND(d.total_revenue) : '-'}</AppText>
            <AppText variant="sm" color="#65676B">Doanh thu</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="receipt" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{d ? (d.total_orders ?? (d as any)?.orders_count ?? 0) : '-'}</AppText>
            <AppText variant="sm" color="#65676B">Đơn hàng</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="table-furniture" size={18} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">{d ? `${d.active_tables ?? (d as any)?.active_tables_count ?? 0} bàn` : '-'}</AppText>
            <AppText variant="sm" color="#65676B">Đang dùng</AppText>
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
        <FlatList
          data={rows}
          keyExtractor={(r: any, idx) => r?.id || r?.date || String(idx)}
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
    maxWidth: 520,
  },
  fbMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface.card,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  fbMetricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justify: 'center',
  },

  /* Filter chips */
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justify: 'center',
  },
  chipActive: {
    backgroundColor: colors.brand.primaryBg,
    borderWidth: 1,
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
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: 10,
  },
  panelBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
});
