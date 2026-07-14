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

export default function ForecastScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try { setLoading(true); setData(await request<any[]>(`/api/v1/quan-ly/forecast/demand?days_ahead=${days}`)); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const total = data.reduce((s, d) => s + (d.forecast || 0), 0);
  const avg = data.length ? Math.round(total / data.length) : 0;
  const avgConf = data.length ? Math.round(data.reduce((s, d) => s + (d.confidence || 0), 0) / data.length) : 0;

  const renderConfidence = (c: number) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
      <View style={{ width: 35, height: 6, backgroundColor: '#F5F5F5', borderRadius: 3 }}>
        <View style={{ width: `${c}%`, height: 6, borderRadius: 3, backgroundColor: c > 70 ? '#16A34A' : c > 50 ? '#D97706' : '#DC2626' }} />
      </View>
      <Text style={{ ...font.micro, fontWeight: '600', color: c > 70 ? '#16A34A' : c > 50 ? '#D97706' : '#DC2626', width: 28, textAlign: 'right' }}>{Math.round(c)}%</Text>
    </View>
  );

  const columns: Column<any>[] = [
    {
      key: 'date',
      title: 'Ngày',
      flex: 1,
      sortable: true,
      sortValue: (r) => r.date || '',
      render: (r) => <Text style={styles.cellPrimary}>{r.date}</Text>,
    },
    {
      key: 'forecast',
      title: 'Dự báo',
      width: 80,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.forecast || 0,
      render: (r) => <Text style={styles.cellHighlight}>{Math.round(r.forecast) || 0}</Text>,
    },
    {
      key: 'confidence',
      title: 'Độ tin cậy',
      width: 100,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.confidence || 0,
      render: (r) => renderConfidence(r.confidence || 0),
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="chart-timeline-variant" size={18} color={'#F97316'} />
        <Text style={styles.panelHeaderText}>Dự báo</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12}}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="chart-line" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{total}</Text>
          </View>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="calendar" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{avg}</Text>
          </View>
          <Text style={styles.statLabel}>TB/ngày</Text>
        </View>
      </View>
      <View style={styles.panelDivider} />
      <View style={{ alignItems: 'center' }}>
        <Text style={[styles.panelStatValue, { fontSize: 24, color: avgConf > 70 ? '#16A34A' : avgConf > 50 ? '#D97706' : '#DC2626' }]}>{avgConf}%</Text>
        <Text style={styles.panelStatLabel}>Độ tin cậy TB</Text>
      </View>
      {/* Mini bar: confidence distribution */}
      <View style={styles.panelDivider} />
      {data.slice(0, 7).map((item, i) => {
        const c = item.confidence || 0;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Text style={{ width: 45, ...font.micro, color: '#737373' }}>{item.date?.slice(5)}</Text>
            <View style={{ flex: 1, height: 6, backgroundColor: '#F5F5F5', borderRadius: 3}}>
              <View style={{ width: `${c}%`, height: 6, borderRadius: 3, backgroundColor: c > 70 ? '#16A34A' : c > 50 ? '#D97706' : '#DC2626' }} />
            </View>
            <Text style={{ width: 25, textAlign: 'right', ...font.micro, color: '#737373' }}>{Math.round(c)}%</Text>
          </View>
        );
      })}
    </View>
  );

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <ScreenContainer compact>
      <ScreenHeader title="Dự báo" subtitle={`${days} ngày`}
        onMenuPress={openSidebar} compact />
      <View style={styles.statsBar}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="chart-line" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{total}</Text>
          </View>
          <Text style={styles.statLabel}>Tổng dự báo</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="calendar" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{avg}</Text>
          </View>
          <Text style={styles.statLabel}>TB/ngày</Text>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Icon name="shield-check" size={14} color={'#737373'} />
            <Text style={styles.statValue}>{avgConf}%</Text>
          </View>
          <Text style={styles.statLabel}>Tin cậy TB</Text>
        </View>
      </View>
      <View style={styles.filterRow}>
        {[3, 7, 14].map(d => (
          <TouchableOpacity key={d} onPress={() => setDays(d)}
            style={[styles.chip, days === d && styles.chipActive]}>
            <Text style={[styles.chipText, days === d && styles.chipTextActive]}>{d} ngày</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            <DataTable<any>
              columns={columns}
              data={data}
              getRowId={(r: any) => r?.id || r?.date || String(Math.random())}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRefresh={load}
              compact
              emptyIcon="chart-timeline-variant"
              emptyTitle="Chưa có dữ liệu"
              emptySubtitle="Không có dự báo cho kỳ này"
            />
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: '#FAFAFA', paddingTop: 8 }}>{renderPanel()}</View>
        </View>
      ) : (
        <DataTable<any>
          columns={columns}
          data={data}
          getRowId={(r: any) => r?.id || r?.date || String(Math.random())}
          loading={loading}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          onRefresh={load}
          compact
          emptyIcon="chart-timeline-variant"
          emptyTitle="Chưa có dữ liệu"
          emptySubtitle="Không có dự báo cho kỳ này"
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
  filterRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5' },
  chipActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  chipText: { ...font.badge, color: '#737373' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  cellPrimary: { ...font.bodySmall, fontWeight: '600', color: '#171717' },
  cellHighlight: { ...font.bodySmall, fontWeight: '600', color: '#F97316' },
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: '#F0F0F0', gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.body, fontWeight: '600', color: '#171717' },
  panelStatLabel: { ...font.caption, color: '#737373', marginTop: 2 },
  panelStatValue: { ...font.pageTitle, fontWeight: '600', color: '#171717' },
  panelDivider: { height: 1, backgroundColor: '#F0F0F0' },
  separator: { width: 1, backgroundColor: '#F0F0F0' },
});
