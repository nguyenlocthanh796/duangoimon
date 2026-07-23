import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { ExecDashboard } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';



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

  const rows = useMemo(() => {
    if (!d) return [];
    return tab === 'branch' ? (d.revenue_by_branch || []) : (d.daily_revenue || []);
  }, [d, tab]);

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: tab === 'branch' ? 'Chi nhánh' : 'Ngày',
      flex: 1,
      render: (r) => <Text style={styles.cellPrimary} numberOfLines={1}>{r.branch || r.date?.slice(5) || r.date}</Text>,
    },
    {
      key: 'revenue',
      title: 'Doanh thu',
      width: 130,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.revenue || 0,
      render: (r) => <Text style={styles.cellHighlight}>{formatVND(r.revenue)}</Text>,
    },
  ];

  const KpiCard = ({ icon, iconBg, label, value, change }: { icon: string; iconBg: string; label: string; value: string | number; change?: { value: number; label: string } }) => (
    <View style={[styles.kpi, { flex: 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <View style={{ backgroundColor: iconBg, borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon as any} size={16} color={'#171717'} />
        </View>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      {change && (
        <Text style={[styles.kpiChange, { color: change.value >= 0 ? '#16A34A' : '#DC2626' }]}>
          {change.value >= 0 ? '↑' : '↓'} {Math.abs(change.value)}% so với kỳ trước
        </Text>
      )}
    </View>
  );

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="view-dashboard" size={18} color={'#F97316'} />
        <Text style={styles.panelHeaderText}>Chỉ số</Text>
      </View>
      {d && (
        <View style={{ gap: 12}}>
          {[
            { label: 'Doanh thu', value: formatVND(d.total_revenue) },
            { label: 'Đơn hàng', value: String(d.total_orders) },
            { label: 'Đang dùng', value: `${d.active_tables} bàn` },
            { label: 'Occupancy', value: `${d.table_occupancy}%` },
          ].map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.panelLabel}>{r.label}</Text>
              <Text style={styles.panelValue}>{r.value}</Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            <KpiCard icon="chart-line" iconBg="#E0F2FE" label="TB đơn" value={formatVND(d.avg_order)} />
          </View>
        </View>
      )}
    </View>
  );

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Exec Dashboard" subtitle="Tổng quan"
        onMenuPress={openSidebar} compact
        right={<TouchableOpacity onPress={load} style={styles.refreshBtn}><Icon name="refresh" size={18} color={colors.icon.default} /></TouchableOpacity>}
      />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="currency-usd" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{d ? formatVND(d.total_revenue) : '-'}</Text>
          </View>
          <Text style={styles.statLabel}>Doanh thu</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="receipt" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{d?.total_orders || '-'}</Text>
          </View>
          <Text style={styles.statLabel}>Đơn</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="table-furniture" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{d ? `${d.active_tables} bàn` : '-'}</Text>
          </View>
          <Text style={styles.statLabel}>Đang dùng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="chart-line" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{d ? `${d.table_occupancy}%` : '-'}</Text>
          </View>
          <Text style={styles.statLabel}>Occupancy</Text>
        </View>
      </View>
      <View style={styles.filterRow}>
        {(['branch', 'daily'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[styles.chip, tab === t && styles.chipActive]}>
            <Text style={[styles.chipText, tab === t && styles.chipTextActive]}>{t === 'branch' ? 'Chi nhánh' : '7 ngày'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            <DataTable<any>
              columns={columns}
              data={rows}
              getRowId={(r: any) => r?.id || r?.date || String(Math.random())}
              loading={loading}
              onRefresh={load}
              compact
              emptyIcon="view-dashboard-outline"
              emptyTitle="Không có dữ liệu"
              emptySubtitle=""
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
        <DataTable<any>
          columns={columns}
          data={rows}
          getRowId={(r: any) => r?.id || r?.date || String(Math.random())}
          loading={loading}
          onRefresh={load}
          compact
          emptyIcon="view-dashboard-outline"
          emptyTitle="Không có dữ liệu"
          emptySubtitle=""
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  refreshBtn: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },
  statValue: { ...font.mdBold, fontWeight: '600', color: '#171717', lineHeight: 18 },
  statLabel: { ...font.sm, color: '#737373', lineHeight: 12 },
  filterRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5' },
  chipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  chipText: { ...font.smBold, color: '#737373' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  cellPrimary: { ...font.sm, fontWeight: '600', color: '#171717' },
  cellHighlight: { ...font.sm, fontWeight: '600', color: '#F97316' },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12},
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.md, fontWeight: '600', color: '#171717' },
  panelLabel: { ...font.sm, color: '#737373' },
  panelValue: { ...font.sm, fontWeight: '600', color: '#171717' },
  kpi: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  kpiLabel: { ...font.sm, color: '#737373', marginBottom: 2 },
  kpiValue: { ...font.lg, fontWeight: '600', color: '#171717', marginBottom: 2 },
  kpiChange: { ...font.smBold, fontWeight: '600' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});
