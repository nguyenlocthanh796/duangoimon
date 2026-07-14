import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import EmptyState from '../../lib/components/ui/EmptyState';

function formatVND(v: number) { return (v || 0).toLocaleString('vi-VN') + 'đ'; }

type SortKey = 'date' | 'orders' | 'revenue' | 'food_cost' | 'pct';
type TabKey = 'revenue' | 'foodcost';

export default function BIReportsScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [tab, setTab] = useState<TabKey>('revenue');
  const [revenue, setRevenue] = useState<any>(null);
  const [foodCost, setFoodCost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); setRevenue(await request(`/api/v1/quan-ly/reports/bi/revenue?days=${days}`)); setFoodCost(await request(`/api/v1/quan-ly/reports/bi/food-cost?days=${days}`)); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const r = revenue;
  const fc = foodCost;

  const dataRows: any[] = tab === 'revenue' ? (Array.isArray(r?.rows) ? r.rows : []) : (Array.isArray(fc?.rows) ? fc.rows : []);
  const rows = useMemo(() => {
    return [...dataRows].sort((a: any, b: any) => {
      if (sortKey === 'orders') return sortAsc ? (a.orders || 0) - (b.orders || 0) : (b.orders || 0) - (a.orders || 0);
      if (sortKey === 'revenue') return sortAsc ? (a.revenue || 0) - (b.revenue || 0) : (b.revenue || 0) - (a.revenue || 0);
      if (sortKey === 'food_cost') return sortAsc ? (a.food_cost || 0) - (b.food_cost || 0) : (b.food_cost || 0) - (a.food_cost || 0);
      if (sortKey === 'pct') return sortAsc ? (a.pct || 0) - (b.pct || 0) : (b.pct || 0) - (a.pct || 0);
      return sortAsc ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '');
    });
  }, [dataRows, sortKey, sortAsc]);

  const StatItem = ({ icon, value, label }: { icon: string; value: string | number; label: string }) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon as any} size={14} color={colors.text.muted} />
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const SortHeader = ({ label, sort, w }: { label: string; sort: SortKey; w?: number | string }) => (
    <TouchableOpacity onPress={() => toggleSort(sort)} style={{ width: w as any, flexDirection: 'row', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
      <Text style={[s.thText, sortKey === sort && { color: colors.brand.primary }]}>{label}</Text>
      {sortKey === sort ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
    </TouchableOpacity>
  );

  const renderPanel = () => {
    const fcRows: any[] = Array.isArray(fc?.rows) ? fc.rows : [];
    const rRows: any[] = Array.isArray(r?.rows) ? r.rows : [];
    if (tab === 'foodcost' && fcRows.length > 0) {
      const sorted = [...fcRows].sort((a: any, b: any) => (b.pct || 0) - (a.pct || 0));
      const top = sorted.slice(0, 5);
      const maxPct = Math.max(...top.map((t: any) => t.pct || 0), 1);
      return (
        <View style={s.panelBox}>
          <View style={s.panelHeader}><Icon name="food-apple" size={18} color={colors.brand.primary} /><Text style={s.panelHeaderText}>Top Food Cost</Text></View>
          {top.map((item: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ width: 60, ...font.caption, color: colors.text.primary }} numberOfLines={1}>{item.name || item.date}</Text>
              <View style={{ flex: 1, height: 12, backgroundColor: colors.surface.disabled, borderRadius: 3 }}>
                <View style={{ width: `${Math.max(5, ((item.pct || 0) / maxPct) * 100)}%`, height: 12, backgroundColor: (item.pct || 0) > 40 ? '#DC2626' : '#D97706', borderRadius: 3 }} />
              </View>
              <Text style={{ width: 40, textAlign: 'right', ...font.micro, fontWeight: '700', color: (item.pct || 0) > 40 ? '#DC2626' : colors.text.primary }}>{item.pct}%</Text>
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
        <View style={s.panelBox}>
          <View style={s.panelHeader}><Icon name="chart-line" size={18} color={colors.brand.primary} /><Text style={s.panelHeaderText}>Top Doanh thu</Text></View>
          {top.map((item: any, i: number) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ width: 60, ...font.caption, color: colors.text.primary }} numberOfLines={1}>{item.date || item.name}</Text>
              <View style={{ flex: 1, height: 12, backgroundColor: colors.surface.disabled, borderRadius: 3 }}>
                <View style={{ width: `${Math.max(5, ((item.revenue || 0) / maxRev) * 100)}%`, height: 12, backgroundColor: colors.brand.primary, borderRadius: 3 }} />
              </View>
              <Text style={{ width: 65, textAlign: 'right', ...font.micro, fontWeight: '700', color: colors.text.primary }}>{formatVND(item.revenue)}</Text>
            </View>
          ))}
        </View>
      );
    }
    return null;
  };

  const TableRow = ({ item }: { item: any }) => {
    if (tab === 'revenue') {
      return (
        <View style={s.tr}>
          <Text style={[s.td, { flex: 1, fontWeight: '600' }]}>{item.date || '-'}</Text>
          <Text style={[s.td, { width: 55, textAlign: 'right' }]}>{item.orders}</Text>
          <Text style={[s.td, { width: 95, textAlign: 'right', fontWeight: '700', color: colors.brand.primary }]}>{formatVND(item.revenue)}</Text>
        </View>
      );
    }
    const pct = item.pct || 0;
    return (
      <View style={s.tr}>
        <Text style={[s.td, { flex: 1, fontWeight: '600' }]} numberOfLines={1}>{item.name || item.date || '-'}</Text>
        <Text style={[s.td, { width: 90, textAlign: 'right' }]}>{formatVND(item.food_cost)}</Text>
        <Text style={[s.td, { width: 55, textAlign: 'right', fontWeight: '700', color: pct > 40 ? '#DC2626' : '#16A34A' }]}>{pct}%</Text>
      </View>
    );
  };

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={rows} keyExtractor={(_: any, i: number) => String(i)} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 32 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="chart-line" title="Chưa có dữ liệu" subtitle="Không có báo cáo cho kỳ này" />}
        ListHeaderComponent={
          tab === 'revenue' ? (
            <View style={s.thead}>
              <Text style={[s.thText, { flex: 1 }]}>Ngày</Text>
              <SortHeader label="Đơn" sort="orders" w={55} />
              <SortHeader label="Doanh thu" sort="revenue" w={95} />
            </View>
          ) : (
            <View style={s.thead}>
              <Text style={[s.thText, { flex: 1 }]}>Món</Text>
              <SortHeader label="Food Cost" sort="food_cost" w={90} />
              <SortHeader label="%" sort="pct" w={55} />
            </View>
          )
        }
      />
    );
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="BI Reports" subtitle={`${days} ngày`}
        onMenuPress={openSidebar} compact />
      <View style={s.statsBar}>
        <StatItem icon="finance" value={r?.summary ? formatVND(r.summary.total_revenue) : '-'} label="Doanh thu" />
        <View style={s.barDivider} />
        <StatItem icon="counter" value={r?.summary?.total_orders || '-'} label="Đơn hàng" />
        <View style={s.barDivider} />
        <StatItem icon="food-apple" value={fc?.total_food_cost ? formatVND(fc.total_food_cost) : '-'} label="Food cost" />
        <View style={s.barDivider} />
        <StatItem icon="percent" value={fc?.food_cost_pct ? `${fc.food_cost_pct}%` : '-'} label="Tỷ lệ" />
      </View>
      <View style={s.filterRow}>
        {(['revenue', 'foodcost'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.chip, tab === t && { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary }]}>
            <Text style={[s.chipText, tab === t && { color: '#fff', fontWeight: '700' }]}>{t === 'revenue' ? 'Doanh thu' : 'Food Cost'}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {[7, 30, 90].map(d => (
          <TouchableOpacity key={d} onPress={() => setDays(d)}
            style={[s.chip, days === d && { backgroundColor: colors.surface.disabled, borderColor: colors.brand.primary }]}>
            <Text style={[s.chipText, days === d && { color: colors.brand.primary, fontWeight: '700' }]}>{d}d</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '800', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default },
  chipText: { ...font.badge, color: colors.text.muted },

  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },

  separator: { width: 1, backgroundColor: colors.border.light },
});
