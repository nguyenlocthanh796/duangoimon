"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import type { ExecDashboard } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import EmptyState from '../../lib/components/ui/EmptyState';

function formatVND(v: number) { return (v || 0).toLocaleString('vi-VN') + 'đ'; }

type TabKey = 'branch' | 'daily';

export default function ExecDashboardScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [d, setD] = useState<ExecDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('branch');

  const load = useCallback(async () => {
    try { setLoading(true); setD(await request<ExecDashboard>('/api/v1/quan-ly/exec-dashboard')); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const StatItem = ({ icon, value, label }: { icon: string; value: string | number; label: string }) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon as any} size={14} color={colors.text.muted} />
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const KpiCard = ({ icon, iconBg, label, value, change }: { icon: string; iconBg: string; label: string; value: string | number; change?: { value: number; label: string } }) => (
    <View style={[s.kpi, { flex: 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <View style={{ backgroundColor: iconBg, borderRadius: shape.radius.md, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon as any} size={16} color={colors.text.primary} />
        </View>
        <Text style={s.kpiLabel}>{label}</Text>
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      {change && (
        <Text style={[s.kpiChange, { color: change.value >= 0 ? '#16A34A' : '#DC2626' }]}>
          {change.value >= 0 ? '↑' : '↓'} {Math.abs(change.value)}% so với kỳ trước
        </Text>
      )}
    </View>
  );

  const renderPanel = () => (
    <View style={s.panelBox}>
      <View style={s.panelHeader}>
        <Icon name="view-dashboard" size={18} color={colors.brand.primary} />
        <Text style={s.panelHeaderText}>Chỉ số</Text>
      </View>
      {d && (
        <View style={{ gap: 10 }}>
          {[
            { label: 'Doanh thu', value: formatVND(d.total_revenue) },
            { label: 'Đơn hàng', value: String(d.total_orders) },
            { label: 'Đang dùng', value: `${d.active_tables} bàn` },
            { label: 'Occupancy', value: `${d.table_occupancy}%` },
          ].map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.panelLabel}>{r.label}</Text>
              <Text style={s.panelValue}>{r.value}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <KpiCard icon="chart-line" iconBg="#E0F2FE" label="TB đơn" value={formatVND(d.avg_order)} />
          </View>
        </View>
      )}
    </View>
  );

  const rows = useMemo(() => {
    if (!d) return [];
    const data = tab === 'branch' ? (d.revenue_by_branch || []) : (d.daily_revenue || []);
    return data;
  }, [d, tab]);

  const TableRow = ({ item }: { item: any }) => (
    <View style={s.tr}>
      <Text style={[s.td, { flex: 1, fontWeight: '600' }]} numberOfLines={1}>{item.branch || item.date?.slice(5) || item.date}</Text>
      <Text style={[s.td, { width: 110, textAlign: 'right', fontWeight: '700', color: colors.brand.primary }]}>{formatVND(item.revenue)}</Text>
    </View>
  );

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    if (!d) return <EmptyState icon="view-dashboard-outline" title="Không có dữ liệu" />;
    return (
      <FlatList data={rows} keyExtractor={(_: any, i: number) => String(i)} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 32 }}
        ListHeaderComponent={
          <>
            {/* KPI cards */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <KpiCard icon="currency-usd" iconBg="#FFF7ED" label="Doanh thu" value={formatVND(d.total_revenue)}
                change={{ value: d.revenue_change, label: 'So kỳ trước' }} />
              <KpiCard icon="receipt" iconBg="#FEF3C7" label="Đơn hàng" value={d.total_orders}
                change={{ value: d.order_change, label: 'So kỳ trước' }} />
            </View>
            {/* Table header */}
            <View style={s.thead}>
              <Text style={[s.thText, { flex: 1 }]}>{tab === 'branch' ? 'Chi nhánh' : 'Ngày'}</Text>
              <Text style={[s.thText, { width: 110, textAlign: 'right' }]}>Doanh thu</Text>
            </View>
          </>
        }
      />
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Exec Dashboard" subtitle="Tổng quan"
        onMenuPress={openSidebar}
        right={<TouchableOpacity onPress={load} style={s.refreshBtn}><Icon name="refresh" size={18} color={colors.icon.default} /></TouchableOpacity>}
      />
      {/* Stats bar */}
      <View style={s.statsBar}>
        <StatItem icon="currency-usd" value={d ? formatVND(d.total_revenue) : '-'} label="Doanh thu" />
        <View style={s.barDivider} />
        <StatItem icon="receipt" value={d?.total_orders || '-'} label="Đơn" />
        <View style={s.barDivider} />
        <StatItem icon="table-furniture" value={d ? `${d.active_tables} bàn` : '-'} label="Đang dùng" />
        <View style={s.barDivider} />
        <StatItem icon="chart-line" value={d ? `${d.table_occupancy}%` : '-'} label="Occupancy" />
      </View>
      {/* Tab filter */}
      <View style={s.filterRow}>
        {(['branch', 'daily'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.chip, tab === t && { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary }]}>
            <Text style={[s.chipText, tab === t && { color: '#fff', fontWeight: '700' }]}>{t === 'branch' ? 'Chi nhánh' : '7 ngày'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 12 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  refreshBtn: { width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },

  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
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
  panelLabel: { ...font.caption, color: colors.text.muted },
  panelValue: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary },

  kpi: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border.light },
  kpiLabel: { ...font.caption, color: colors.text.muted, marginBottom: 2 },
  kpiValue: { ...font.h1, fontWeight: '900', color: colors.text.primary, marginBottom: 2 },
  kpiChange: { ...font.badge, fontWeight: '700' },

  separator: { width: 1, backgroundColor: colors.border.light },
});
