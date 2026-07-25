import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import AppText from '../../lib/components/ui/AppText';

export default function ForecastScreen() {
  const { isWide } = useResponsive();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await request(`/api/v1/quan-ly/forecast/demand?days_ahead=${days}`);
      setData(Array.isArray(res) ? res : res?.items || res?.forecast || []);
    }
    catch { setData([]); } finally { setLoading(false); }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.reduce((s, d) => s + (d.forecast || 0), 0);
  const avg = safeData.length ? Math.round(total / safeData.length) : 0;
  const avgConf = safeData.length ? Math.round(safeData.reduce((s, d) => s + (d.confidence || 0), 0) / safeData.length) : 0;

  const renderConfidence = (c: number) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
      <View style={{ width: 40, height: 6, backgroundColor: colors.surface.app, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ width: `${c}%`, height: 6, borderRadius: 3, backgroundColor: c > 70 ? colors.status.success : c > 50 ? colors.status.warning : colors.status.danger }} />
      </View>
      <AppText variant="sm" weight="bold" color={c > 70 ? colors.status.success : c > 50 ? colors.status.warning : colors.status.danger} style={{ width: 35, textAlign: 'right' }}>{Math.round(c)}%</AppText>
    </View>
  );

  const columns: Column<any>[] = [
    {
      key: 'date',
      title: 'Ngày dự báo',
      flex: 1,
      sortable: true,
      sortValue: (r) => r.date || '',
      render: (r) => <AppText variant="sm" weight="bold" color={colors.text.primary}>{r.date}</AppText>,
    },
    {
      key: 'forecast',
      title: 'Số đơn dự kiến',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.forecast || 0,
      render: (r) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{Math.round(r.forecast) || 0} đơn</AppText>,
    },
    {
      key: 'confidence',
      title: 'Độ tin cậy AI',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (r) => r.confidence || 0,
      render: (r) => renderConfidence(r.confidence || 0),
    },
  ];

  const renderPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="chart-timeline-variant" size={18} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê độ tin cậy AI</AppText>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <AppText variant="md" weight="bold" color={colors.text.primary}>{total}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Tổng dự báo</AppText>
        </View>
        <View style={styles.barDivider} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <AppText variant="md" weight="bold" color={colors.brand.primary}>{avg}</AppText>
          <AppText variant="sm" color={colors.text.muted}>TB mỗi ngày</AppText>
        </View>
      </View>
      <View style={styles.panelDivider} />
      <View style={{ alignItems: 'center' }}>
        <AppText variant="lg" weight="bold" color={avgConf > 70 ? colors.status.success : avgConf > 50 ? colors.status.warning : colors.status.danger}>{avgConf}%</AppText>
        <AppText variant="sm" color={colors.text.muted}>Chỉ số tin cậy trung bình</AppText>
      </View>
      <View style={styles.panelDivider} />
      {safeData.slice(0, 7).map((item, i) => {
        const c = item.confidence || 0;
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
            <AppText variant="sm" color={colors.text.primary} style={{ width: 50 }}>{item.date?.slice(5)}</AppText>
            <View style={{ flex: 1, height: 6, backgroundColor: colors.surface.app, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ width: `${c}%`, height: 6, borderRadius: 3, backgroundColor: c > 70 ? colors.status.success : c > 50 ? colors.status.warning : colors.status.danger }} />
            </View>
            <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ width: 35, textAlign: 'right' }}>{Math.round(c)}%</AppText>
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
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Icon name="chart-line" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{total}</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tổng đơn</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="calendar" size={16} color={colors.brand.primary} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{avg}</AppText>
            <AppText variant="sm" color={colors.text.muted}>TB/ngày</AppText>
          </View>
        </View>
        <View style={styles.barDivider} />
        <View style={styles.statItem}>
          <Icon name="shield-check" size={16} color={colors.status.success} />
          <View>
            <AppText variant="sm" weight="bold" color={colors.status.success}>{avgConf}%</AppText>
            <AppText variant="sm" color={colors.text.muted}>Tin cậy</AppText>
          </View>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {[3, 7, 14].map(d => (
          <TouchableOpacity key={d} onPress={() => setDays(d)}
            style={[styles.chip, days === d && styles.chipActive]}>
            <AppText variant="sm" color={days === d ? colors.brand.primary : colors.text.secondary} weight={days === d ? 'bold' : 'normal'}>
              Dự báo {d} ngày tới
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <DataTable<any>
              columns={columns}
              data={safeData}
              getRowId={(r: any) => r?.id || r?.date || String(Math.random())}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onRefresh={load}
              compact
              emptyIcon="chart-timeline-variant"
              emptyTitle="Chưa có dữ liệu dự báo"
              emptySubtitle=""
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <DataTable<any>
            columns={columns}
            data={safeData}
            getRowId={(r: any) => r?.id || r?.date || String(Math.random())}
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSortChange}
            onRefresh={load}
            compact
            emptyIcon="chart-timeline-variant"
            emptyTitle="Chưa có dữ liệu dự báo"
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
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: shape.radius.md, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand.primaryBg },
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
});
