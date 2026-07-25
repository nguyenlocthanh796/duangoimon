import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

type TabKey = 'revenue' | 'foodcost';

export default function BIReportsScreen() {
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
      render: (row: any) => <AppText variant="sm" weight="bold" color={colors.text.primary}>{row.date || '-'}</AppText>,
    },
    {
      key: 'orders',
      title: 'Số đơn',
      width: 75,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.orders || 0,
      render: (row: any) => <AppText variant="sm" color={colors.text.primary}>{row.orders}</AppText>,
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      width: 120,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.revenue || 0,
      render: (row: any) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(row.revenue)}</AppText>,
    },
  ];

  const foodCostCols: Column<any>[] = [
    {
      key: 'name',
      title: 'Mặt hàng',
      flex: 1,
      sortable: true,
      sortValue: (row: any) => row.name || row.date || '',
      render: (row: any) => <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>{row.name || row.date || '-'}</AppText>,
    },
    {
      key: 'food_cost',
      title: 'Food Cost',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.food_cost || 0,
      render: (row: any) => <AppText variant="sm" color={colors.text.primary}>{formatVND(row.food_cost)}</AppText>,
    },
    {
      key: 'pct',
      title: 'Tỷ lệ %',
      width: 75,
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
        <View style={styles.panelBox}>
          <View style={styles.panelHeader}>
            <Icon name="food-apple" size={18} color={colors.brand.primary} />
            <AppText variant="sm" weight="bold" color={colors.text.primary}>Top Food Cost cao nhất</AppText>
          </View>
          {top.map((item: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
              <AppText variant="sm" color={colors.text.primary} style={{ width: 80 }} numberOfLines={1}>{item.name || item.date}</AppText>
              <View style={{ flex: 1, height: 8, backgroundColor: colors.surface.app, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(5, ((item.pct || 0) / maxPct) * 100)}%`, height: 8, backgroundColor: (item.pct || 0) > 40 ? colors.status.danger : colors.brand.primary, borderRadius: 4 }} />
              </View>
              <AppText variant="sm" weight="bold" color={(item.pct || 0) > 40 ? colors.status.danger : colors.text.primary} style={{ width: 45, textAlign: 'right' }}>{item.pct}%</AppText>
            </View>
          ))}
        </View>
      );
    }
    if (tab === 'revenue' && rRows.length > 0) {
      const sorted = [...rRows].sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0));
      const top = sorted.slice(0, 5);
      const maxRev = Math.max(...top.map((t: any) => t.revenue || 0), 1);
      return (
        <View style={styles.panelBox}>
          <View style={styles.panelHeader}>
            <Icon name="chart-line" size={18} color={colors.brand.primary} />
            <AppText variant="sm" weight="bold" color={colors.text.primary}>Top Doanh thu ngày cao nhất</AppText>
          </View>
          {top.map((item: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
              <AppText variant="sm" color={colors.text.primary} style={{ width: 80 }} numberOfLines={1}>{item.date || item.name}</AppText>
              <View style={{ flex: 1, height: 8, backgroundColor: colors.surface.app, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(5, ((item.revenue || 0) / maxRev) * 100)}%`, height: 8, backgroundColor: colors.brand.primary, borderRadius: 4 }} />
              </View>
              <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ width: 75, textAlign: 'right' }}>{formatVND(item.revenue)}</AppText>
            </View>
          ))}
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

  const renderMobileBiCard = ({ item: row }: { item: any }) => (
    <View style={styles.itemMobile}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.avatarCircle, { backgroundColor: tab === 'revenue' ? '#ECFDF5' : '#FEE2E2' }]}>
          <Icon name={tab === 'revenue' ? 'chart-line' : 'food-apple'} size={20} color={tab === 'revenue' ? colors.status.success : colors.status.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>
            {row.name || row.date || 'Chi tiết BI'}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {tab === 'revenue' ? (
              <AppText variant="sm" color="#65676B">Số đơn: {row.orders || 0} đơn</AppText>
            ) : (
              <AppText variant="sm" color="#65676B">Chi phí: {formatVND(row.food_cost || 0)}</AppText>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {tab === 'revenue' ? (
            <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(row.revenue || 0)}</AppText>
          ) : (
            <AppText variant="md" weight="bold" color={(row.pct || 0) > 40 ? colors.status.danger : colors.status.success}>{row.pct || 0}%</AppText>
          )}
          <AppText variant="sm" color="#65676B">{tab === 'revenue' ? 'Doanh thu' : 'Tỷ lệ FC'}</AppText>
        </View>
      </View>

      <View style={styles.cardActionDivider} />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => {}}>
          <Icon name="chart-bar" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Xem phân tích</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">Phân tích BI ({days} ngày)</AppText>
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
            <Icon name="chart-line" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(revStat?.total_revenue || 0)}</AppText>
            <AppText variant="sm" color="#65676B">Doanh thu</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="food-apple" size={18} color={colors.status.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.danger}>{formatVND(fcStat?.total_food_cost || 0)}</AppText>
            <AppText variant="sm" color="#65676B">Food cost</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="cart" size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#2563EB">{revStat?.total_orders || 0}</AppText>
            <AppText variant="sm" color="#65676B">Đơn hàng</AppText>
          </View>
        </View>
      </View>

      {/* Tabs and Days filter */}
      <View style={{ marginVertical: 4, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {(['revenue', 'foodcost'] as const).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Icon name={t === 'revenue' ? 'chart-line' : 'food-apple'} size={14} color={active ? colors.brand.primary : '#65676B'} />
                <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                  {t === 'revenue' ? 'Doanh thu' : 'Food Cost'}
                </AppText>
              </TouchableOpacity>
            );
          })}
          {[7, 30, 90].map(d => {
            const active = days === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDays(d)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                  {d}D
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
      ) : (
        <FlatList
          data={dataRows}
          keyExtractor={(row: any, idx) => row?.id || String(idx)}
          renderItem={renderMobileBiCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="chart-line"
                title="Chưa có dữ liệu báo cáo BI"
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
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
