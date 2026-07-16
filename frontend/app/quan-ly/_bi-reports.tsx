import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';

function formatVND(v: number) { return (v || 0).toLocaleString('vi-VN') + 'đ'; }

type TabKey = 'revenue' | 'foodcost';

export default function BIReportsScreen() {
  const { openSidebar } = useSidebar();
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
      render: (row: any) => <Text style={styles.cellPrimary}>{row.date || '-'}</Text>,
    },
    {
      key: 'orders',
      title: 'Đơn',
      width: 65,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.orders || 0,
      render: (row: any) => <Text style={styles.cellNumber}>{row.orders}</Text>,
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.revenue || 0,
      render: (row: any) => <Text style={[styles.cellNumber, { color: '#F97316', fontWeight: '600' }]}>{formatVND(row.revenue)}</Text>,
    },
  ];

  const foodCostCols: Column<any>[] = [
    {
      key: 'name',
      title: 'Mặt hàng',
      flex: 1,
      sortable: true,
      sortValue: (row: any) => row.name || row.date || '',
      render: (row: any) => <Text style={styles.cellPrimary} numberOfLines={1}>{row.name || row.date || '-'}</Text>,
    },
    {
      key: 'food_cost',
      title: 'Food Cost',
      width: 100,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.food_cost || 0,
      render: (row: any) => <Text style={styles.cellNumber}>{formatVND(row.food_cost)}</Text>,
    },
    {
      key: 'pct',
      title: '%',
      width: 65,
      align: 'right',
      sortable: true,
      sortValue: (row: any) => row.pct || 0,
      render: (row: any) => {
        const pct = row.pct || 0;
        return <Text style={[styles.cellNumber, { fontWeight: '600', color: pct > 40 ? '#DC2626' : '#16A34A' }]}>{pct}%</Text>;
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
          <View style={styles.panelHeader}><Icon name="food-apple" size={18} color={'#F97316'} /><Text style={styles.panelHeaderText}>Top Food Cost</Text></View>
          {top.map((item: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={{ width: 50, ...font.caption, color: '#171717' }} numberOfLines={1}>{item.name || item.date}</Text>
              <View style={{ flex: 1, height: 10, backgroundColor: '#F5F5F5', borderRadius: 3 }}>
                <View style={{ width: `${Math.max(5, ((item.pct || 0) / maxPct) * 100)}%`, height: 10, backgroundColor: (item.pct || 0) > 40 ? '#DC2626' : '#D97706', borderRadius: 3 }} />
              </View>
              <Text style={{ width: 40, textAlign: 'right', ...font.micro, fontWeight: '600', color: (item.pct || 0) > 40 ? '#DC2626' : '#171717' }}>{item.pct}%</Text>
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
          <View style={styles.panelHeader}><Icon name="chart-line" size={18} color={'#F97316'} /><Text style={styles.panelHeaderText}>Top Doanh thu</Text></View>
          {top.map((item: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Text style={{ width: 50, ...font.caption, color: '#171717' }} numberOfLines={1}>{item.date || item.name}</Text>
              <View style={{ flex: 1, height: 10, backgroundColor: '#F5F5F5', borderRadius: 3 }}>
                <View style={{ width: `${Math.max(5, ((item.revenue || 0) / maxRev) * 100)}%`, height: 10, backgroundColor: '#F97316', borderRadius: 3 }} />
              </View>
              <Text style={{ width: 65, textAlign: 'right', ...font.micro, fontWeight: '600', color: '#171717' }}>{formatVND(item.revenue)}</Text>
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
    <ScreenContainer compact>
      <ScreenHeader title="Báo cáo BI" subtitle={`${days} ngày`}
        onMenuPress={openSidebar} compact
      />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="chart-line" size={14} color={'#737373'} /><Text style={styles.statValue}>{formatVND(revStat?.total_revenue || 0)}</Text>
          </View>
          <Text style={styles.statLabel}>Doanh thu</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="food-apple" size={14} color={'#737373'} /><Text style={styles.statValue}>{formatVND(fcStat?.total_food_cost || 0)}</Text>
          </View>
          <Text style={styles.statLabel}>Food cost</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="cart" size={14} color={'#737373'} /><Text style={styles.statValue}>{revStat?.total_orders || 0}</Text>
          </View>
          <Text style={styles.statLabel}>Đơn hàng</Text>
        </View>
      </View>
      <View style={styles.tabRow}>
        {(['revenue', 'foodcost'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Icon name={t === 'revenue' ? 'chart-line' : 'food-apple'} size={14} color={tab === t ? '#fff' : '#737373'} />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'revenue' ? 'Doanh thu' : 'Food cost'}</Text>
          </TouchableOpacity>
        ))}
        {[7, 30, 90].map(d => (
          <TouchableOpacity key={d} onPress={() => setDays(d)} style={[styles.daysChip, days === d && styles.daysChipActive]}>
            <Text style={[styles.daysChipText, days === d && styles.daysChipTextActive]}>{d}D</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
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
              emptyTitle="Chưa có dữ liệu"
              emptySubtitle="Không có báo cáo cho kỳ này"
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
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
          emptyTitle="Chưa có dữ liệu"
          emptySubtitle="Không có báo cáo cho kỳ này"
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.bodyBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.micro, color: '#737373', lineHeight: 12 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5' },
  tabActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  tabText: { ...font.micro, fontWeight: '600', color: '#737373' },
  tabTextActive: { color: '#fff' },
  daysChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5', marginLeft: 4 },
  daysChipActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  daysChipText: { ...font.micro, fontWeight: '600', color: '#737373' },
  daysChipTextActive: { color: '#fff' },
  cellPrimary: { ...font.bodySmall, fontWeight: '600', color: '#171717' },
  cellNumber: { ...font.bodySmall, color: '#171717', textAlign: 'right' },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.body, fontWeight: '600', color: '#171717' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});
