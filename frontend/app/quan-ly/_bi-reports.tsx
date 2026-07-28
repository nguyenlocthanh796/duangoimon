import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

type TabKey = 'revenue' | 'foodcost';

export default function BIReportsScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const [tab, setTab] = useState<TabKey>('revenue');
  const [revenue, setRevenue] = useState<any>(null);
  const [foodCost, setFoodCost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    try { setLoading(true); setRevenue(await request(`/api/v1/quan-ly/reports/bi/revenue?days=${days}`)); setFoodCost(await request(`/api/v1/quan-ly/reports/bi/food-cost?days=${days}`)); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const dataRows: any[] = tab === 'revenue' ? (Array.isArray(revenue?.rows) ? revenue.rows : []) : (Array.isArray(foodCost?.rows) ? foodCost.rows : []);
  const r = revenue;
  const fc = foodCost;

  const revenueCols: Column<any>[] = [
    {
      key: 'date',
      title: 'Ngày',
      flex: 1,
      sortable: true,
      sortValue: (row: any) => row.date || '',
      render: (row: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.status.success }} />
          </View>
          <AppText variant="sm" weight="bold" color="#050505">{row.date || '-'}</AppText>
        </View>
      ),
    },
    {
      key: 'orders',
      title: 'Số đơn',
      width: 90,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.orders || 0,
      render: (row: any) => <AppText variant="sm" color="#050505">{row.orders} đơn</AppText>,
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      width: 140,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.revenue || 0,
      render: (row: any) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(row.revenue || 0)}</AppText>,
    },
  ];

  const foodCostCols: Column<any>[] = [
    {
      key: 'name',
      title: 'Mặt hàng',
      flex: 1,
      sortable: true,
      sortValue: (row: any) => row.name || row.date || '',
      render: (row: any) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.status.danger }} />
          </View>
          <AppText variant="sm" weight="bold" color="#050505" numberOfLines={1}>{row.name || row.date || '-'}</AppText>
        </View>
      ),
    },
    {
      key: 'food_cost',
      title: 'Food Cost',
      width: 120,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.food_cost || 0,
      render: (row: any) => <AppText variant="sm" color="#050505">{formatVND(row.food_cost || 0)}</AppText>,
    },
    {
      key: 'pct',
      title: 'Tỷ lệ %',
      width: 90,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.pct || 0,
      render: (row: any) => {
        const pct = row.pct || 0;
        return <AppText variant="sm" weight="bold" color={pct > 40 ? colors.status.danger : colors.status.success}>{pct}%</AppText>;
      },
    },
  ];

  const columns = tab === 'revenue' ? revenueCols : foodCostCols;

  const renderPanel = () => {
    const fcRows: any[] = Array.isArray(fc?.rows) ? fc.rows : [];
    const rRows: any[] = Array.isArray(r?.rows) ? r.rows : [];
    if (tab === 'foodcost' && fcRows.length > 0) {
      const sorted = [...fcRows].sort((a: any, b: any) => (b.pct || 0) - (a.pct || 0));
      const top = sorted.slice(0, 5);
      const maxPct = Math.max(...top.map((t: any) => t.pct || 0), 1);
      return (
        <View style={ss.sectionWrap}>
          <View style={ss.sectionHeader}>
            <View style={[ss.iconCircleSm, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="food-variant" size={14} color={colors.status.danger} />
            </View>
            <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1 }}>Top Food Cost cao nhất</AppText>
          </View>
          <View style={{ padding: 10, gap: 8 }}>
            {top.map((item: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                <AppText variant="sm" color="#0F172A" style={{ width: 90 }} numberOfLines={1}>{item.name || item.date}</AppText>
                <View style={{ flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(8, ((item.pct || 0) / maxPct) * 100)}%`, height: 8, backgroundColor: (item.pct || 0) > 40 ? colors.status.danger : colors.brand.primary, borderRadius: 4 }} />
                </View>
                <AppText variant="sm" weight="bold" color={(item.pct || 0) > 40 ? colors.status.danger : "#0F172A"} style={{ width: 45, textAlign: 'right' }}>{item.pct}%</AppText>
              </View>
            ))}
          </View>
        </View>
      );
    }
    if (tab === 'revenue' && rRows.length > 0) {
      const sorted = [...rRows].sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0));
      const top = sorted.slice(0, 5);
      const maxRev = Math.max(...top.map((t: any) => t.revenue || 0), 1);
      return (
        <View style={ss.sectionWrap}>
          <View style={ss.sectionHeader}>
            <View style={[ss.iconCircleSm, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="chart-bar" size={14} color={colors.brand.primary} />
            </View>
            <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1 }}>Top Doanh thu ngày cao nhất</AppText>
          </View>
          <View style={{ padding: 10, gap: 8 }}>
            {top.map((item: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}>
                <AppText variant="sm" color="#0F172A" style={{ width: 90 }} numberOfLines={1}>{item.date || item.name}</AppText>
                <View style={{ flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(8, ((item.revenue || 0) / maxRev) * 100)}%`, height: 8, backgroundColor: colors.brand.primary, borderRadius: 4 }} />
                </View>
                <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ width: 85, textAlign: 'right' }}>{formatVND(item.revenue || 0)}</AppText>
              </View>
            ))}
          </View>
        </View>
      );
    }
    return null;
  };

  const revStat = r?.summary;
  const fcStat = fc?.summary;

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc'); }
  };

function getDayLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
  } catch {
    return '';
  }
}

  const renderMobileBiRow = (row: any, isLast: boolean) => {
    const dayLabel = getDayLabel(row.date);
    const aov = row.orders && row.revenue ? Math.round(row.revenue / row.orders) : 0;

    return (
      <View
        key={row.id || row.date || String(Math.random())}
        style={[
          ss.itemRow,
          { height: 52 },
          isLast && { borderBottomWidth: 0 },
        ]}
      >
        <View style={{ width: 34, height: 28, borderRadius: 6, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
          <AppText variant="sm" weight="bold" color="#334155" style={{ fontSize: 12 }}>
            {dayLabel || 'NG'}
          </AppText>
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <AppText variant="sm" color="#0F172A" numberOfLines={1}>
            {row.name || row.date || 'Chi tiết BI'}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
            {tab === 'revenue' ? (
              <>
                <AppText variant="sm" color="#64748B">Số đơn: {row.orders || 0}</AppText>
                {aov > 0 && (
                  <View style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, paddingHorizontal: 4 }}>
                    <AppText variant="sm" color="#475569" style={{ fontSize: 11 }}>AOV: {formatVND(aov)}</AppText>
                  </View>
                )}
              </>
            ) : (
              <AppText variant="sm" color="#64748B">Chi phí: {formatVND(row.food_cost || 0)}</AppText>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {tab === 'revenue' ? (
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(row.revenue || 0)}</AppText>
          ) : (
            <AppText variant="sm" weight="bold" color={(row.pct || 0) > 40 ? colors.status.danger : colors.status.success}>{row.pct || 0}%</AppText>
          )}
          <AppText variant="sm" color="#64748B">{tab === 'revenue' ? 'Doanh thu' : 'Tỷ lệ FC'}</AppText>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={ss.metricContainer}>
        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
            <AppText variant="sm" weight="bold" color={colors.status.success} style={{ fontSize: 11 }}>đ</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(revStat?.total_revenue || 0)}</AppText>
            <AppText variant="sm" color="#64748B">Doanh thu</AppText>
          </View>
        </View>
        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#FEE2E2' }]}>
            <AppText variant="sm" weight="bold" color={colors.status.danger} style={{ fontSize: 11 }}>FC</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.danger}>{formatVND(fcStat?.total_food_cost || 0)}</AppText>
            <AppText variant="sm" color="#64748B">Food cost</AppText>
          </View>
        </View>
        <View style={ss.metricCard}>
          <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
            <AppText variant="sm" weight="bold" color="#2563EB" style={{ fontSize: 11 }}>đơn</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">{revStat?.total_orders || 0} đơn</AppText>
            <AppText variant="sm" color="#64748B">Đơn hàng</AppText>
          </View>
        </View>
      </View>
      <View style={{ width: '100%', marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: '100%', flexGrow: 0, height: 44 }}
          contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 6 }}
        >
          {(['revenue', 'foodcost'] as const).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={[ss.filterChip, active && ss.filterChipActive]}>
                <AppText variant="sm" weight="bold" color={active ? colors.brand.primary : "#334155"}>
                  {t === 'revenue' ? 'Doanh thu' : 'Food Cost'}
                </AppText>
              </TouchableOpacity>
            );
          })}
          {[7, 30, 90].map(d => {
            const active = days === d;
            return (
              <TouchableOpacity key={d} onPress={() => setDays(d)} style={[ss.filterChip, active && ss.filterChipActive]}>
                <AppText variant="sm" weight="bold" color={active ? colors.brand.primary : "#334155"}>
                  {d}D
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
                data={dataRows}
                getRowId={(row: any) => row?.id || String(Math.random())}
                loading={loading}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortChange={handleSortChange}
                onRefresh={load}
                compact
                emptyIcon="chart-line"
                emptyTitle="Chưa có dữ liệu báo cáo BI"
                emptySubtitle=""
              />
            </View>
            <View style={{ flex: 0.45 }}>{renderPanel()}</View>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          {renderHeader()}
          {renderPanel()}
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}>
              <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                {tab === 'revenue' ? `BÁO CÁO DOANH THU THEO NGÀY (${dataRows.length})` : `BÁO CÁO FOOD COST (${dataRows.length})`}
              </AppText>
            </View>
            <View style={ss.sectionItems}>
              {loading ? (
                <TableSkeleton rowCount={5} />
              ) : dataRows.length === 0 ? (
                <EmptyState icon="chart-line" title="Chưa có dữ liệu báo cáo BI" subtitle="" />
              ) : (
                dataRows.map((row, idx) => renderMobileBiRow(row, idx === dataRows.length - 1))
              )}
            </View>
          </View>
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
    gap: 6,
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
});
