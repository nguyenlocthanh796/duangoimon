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
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import EmptyState from '../../lib/components/ui/EmptyState';

type SortKey = 'date' | 'forecast' | 'confidence';

export default function ForecastScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); setData(await request<any[]>(`/api/v1/quan-ly/forecast/demand?days_ahead=${days}`)); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const total = data.reduce((s, d) => s + (d.forecast || 0), 0);
  const avg = data.length ? Math.round(total / data.length) : 0;
  const avgConf = data.length ? Math.round(data.reduce((s, d) => s + (d.confidence || 0), 0) / data.length) : 0;

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortKey === 'forecast') return sortAsc ? (a.forecast || 0) - (b.forecast || 0) : (b.forecast || 0) - (a.forecast || 0);
      if (sortKey === 'confidence') return sortAsc ? (a.confidence || 0) - (b.confidence || 0) : (b.confidence || 0) - (a.confidence || 0);
      return sortAsc ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '');
    });
  }, [data, sortKey, sortAsc]);

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
    <TouchableOpacity onPress={() => toggleSort(sort)} style={{ width: w as any, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={[s.thText, sortKey === sort && { color: colors.brand.primary }]}>{label}</Text>
      {sortKey === sort ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
    </TouchableOpacity>
  );

  const renderPanel = () => (
    <View style={s.panelBox}>
      <View style={s.panelHeader}>
        <Icon name="chart-timeline-variant" size={18} color={colors.brand.primary} />
        <Text style={s.panelHeaderText}>Dự báo</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatItem icon="chart-line" value={total} label="Tổng" />
        <View style={s.panelDividerV} />
        <StatItem icon="calendar" value={avg} label="TB/ngày" />
      </View>
      <View style={s.panelDivider} />
      <View style={{ alignItems: 'center' }}>
        <Text style={[s.panelStatValue, { fontSize: 24, color: avgConf > 70 ? '#16A34A' : avgConf > 50 ? '#D97706' : '#DC2626' }]}>{avgConf}%</Text>
        <Text style={s.panelStatLabel}>Độ tin cậy TB</Text>
      </View>
      {/* Mini bar: confidence distribution */}
      <View style={s.panelDivider} />
      {sorted.slice(0, 7).map((item, i) => {
        const c = item.confidence || 0;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ width: 50, ...font.micro, color: colors.text.muted }}>{item.date?.slice(5)}</Text>
            <View style={{ flex: 1, height: 8, backgroundColor: colors.surface.disabled, borderRadius: 4 }}>
              <View style={{ width: `${c}%`, height: 8, borderRadius: 4, backgroundColor: c > 70 ? '#16A34A' : c > 50 ? '#D97706' : '#DC2626' }} />
            </View>
            <Text style={{ width: 25, textAlign: 'right', ...font.micro, color: colors.text.muted }}>{Math.round(c)}%</Text>
          </View>
        );
      })}
    </View>
  );

  const TableRow = ({ item }: { item: any }) => {
    const c = item.confidence || 0;
    return (
      <View style={s.tr}>
        <Text style={[s.td, { flex: 1, fontWeight: '600' }]}>{item.date}</Text>
        <Text style={[s.td, { width: 65, textAlign: 'right', fontWeight: '700', color: colors.brand.primary }]}>{Math.round(item.forecast) || 0}</Text>
        <View style={{ width: 70, flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
          <View style={{ width: 35, height: 6, backgroundColor: colors.surface.disabled, borderRadius: 3 }}>
            <View style={{ width: `${c}%`, height: 6, borderRadius: 3, backgroundColor: c > 70 ? '#16A34A' : c > 50 ? '#D97706' : '#DC2626' }} />
          </View>
          <Text style={{ ...font.micro, fontWeight: '700', color: c > 70 ? '#16A34A' : c > 50 ? '#D97706' : '#DC2626', width: 25, textAlign: 'right' }}>{Math.round(c)}%</Text>
        </View>
      </View>
    );
  };

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    return (
      <FlatList data={sorted} keyExtractor={(_: any, i: number) => String(i)} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 32 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="chart-timeline-variant" title="Chưa có dữ liệu" subtitle="Không có dự báo cho kỳ này" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <SortHeader label="Ngày" sort="date" w={1} />
            <SortHeader label="Dự báo" sort="forecast" w={65} />
            <Text style={[s.thText, { width: 70, textAlign: 'right' }]}>Độ tin cậy</Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Dự báo" subtitle={`${days} ngày`}
        onMenuPress={openSidebar} />
      <View style={s.statsBar}>
        <StatItem icon="chart-line" value={total} label="Tổng dự báo" />
        <View style={s.barDivider} />
        <StatItem icon="calendar" value={avg} label="TB/ngày" />
        <View style={s.barDivider} />
        <StatItem icon="shield-check" value={`${avgConf}%`} label="Tin cậy TB" />
      </View>
      <View style={s.filterRow}>
        {[3, 7, 14].map(d => (
          <TouchableOpacity key={d} onPress={() => setDays(d)}
            style={[s.chip, days === d && { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary }]}>
            <Text style={[s.chipText, days === d && { color: '#fff', fontWeight: '700' }]}>{d} ngày</Text>
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

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelStatLabel: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  panelStatValue: { ...font.h1, fontWeight: '900', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },

  separator: { width: 1, backgroundColor: colors.border.light },
});
