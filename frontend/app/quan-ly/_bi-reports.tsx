import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import AppText from '../../lib/components/ui/AppText';

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="chart-line" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{formatVND(revStat?.total_revenue || 0)}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Doanh thu</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="food-apple" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{formatVND(fcStat?.total_food_cost || 0)}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Food cost</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="cart" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{revStat?.total_orders || 0}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Đơn hàng</AppText>
          </View>
        </View>
      </View>

      {/* Tabs and Days filter */}
      <View style={styles.tabRow}>
        {(['revenue', 'foodcost'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Icon name={t === 'revenue' ? 'chart-line' : 'food-apple'} size={14} color={tab === t ? colors.brand.primary : colors.text.secondary} />
            <AppText variant="sm" color={tab === t ? colors.brand.primary : colors.text.secondary} weight={tab === t ? 'bold' : 'normal'}>
              {t === 'revenue' ? 'Doanh thu' : 'Food Cost'}
            </AppText>
          </TouchableOpacity>
        ))}
        <View style={{ flexDirection: 'row', gap: 4, marginLeft: 'auto' }}>
          {[7, 30, 90].map(d => (
            <TouchableOpacity key={d} onPress={() => setDays(d)} style={[styles.daysChip, days === d && styles.daysChipActive]}>
              <AppText variant="sm" color={days === d ? colors.brand.primary : colors.text.secondary} weight={days === d ? 'bold' : 'normal'}>{d}D</AppText>
            </TouchableOpacity>
          ))}
        </View>
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
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
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
  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, marginBottom: 8, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 32, borderRadius: shape.radius.md, backgroundColor: colors.surface.card },
  tabActive: { backgroundColor: colors.brand.primaryBg },
  daysChip: { paddingHorizontal: 10, height: 32, borderRadius: shape.radius.md, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  daysChipActive: { backgroundColor: colors.brand.primaryBg },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
});
