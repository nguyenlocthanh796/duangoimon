import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import DataTable, { type Column } from '../../lib/components/ui/DataTable';
import AppText from '../../lib/components/ui/AppText';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import EmptyState from '../../lib/components/ui/EmptyState';

const API = '/api/v1/quan-ly';

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
      const res: any = await request(`${API}/reports/forecast?days=${days}`);
      setData(Array.isArray(res) ? res : (res?.items || []));
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const safeData = useMemo(() => Array.isArray(data) ? data : [], [data]);

  const columns: Column<any>[] = [
    {
      key: 'date',
      title: 'Ngày dự báo',
      flex: 1,
      sortable: true,
      sortValue: (r: any) => r.date || '',
      render: (r: any) => <AppText variant="sm" weight="bold" color={colors.text.primary}>{r.date || '-'}</AppText>,
    },
    {
      key: 'predicted_orders',
      title: 'Dự báo đơn',
      width: 110,
      align: 'right',
      sortable: true,
      sortValue: (r: any) => r.predicted_orders || 0,
      render: (r: any) => <AppText variant="sm" weight="bold" color={colors.brand.primary}>{r.predicted_orders || 0} đơn</AppText>,
    },
    {
      key: 'confidence',
      title: 'Độ tin cậy',
      width: 100,
      align: 'right',
      render: (r: any) => (
        <AppText variant="sm" color={colors.status.success}>{r.confidence || 90}%</AppText>
      ),
    },
  ];

  const renderPanel = () => {
    if (safeData.length === 0) return null;
    const total = safeData.reduce((s, r) => s + (r.predicted_orders || 0), 0);
    const maxVal = Math.max(...safeData.map(r => r.predicted_orders || 0), 1);

    return (
      <View style={styles.panelBox}>
        <View style={styles.panelHeader}>
          <Icon name="brain" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary}>Dự báo AI {days} ngày tới</AppText>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color={colors.text.secondary}>Tổng nhu cầu dự kiến</AppText>
            <AppText variant="sm" weight="bold" color={colors.brand.primary}>{total} đơn</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="sm" color={colors.text.secondary}>Trung bình/ngày</AppText>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>{Math.round(total / days)} đơn/ngày</AppText>
          </View>
        </View>

        <View style={styles.panelDivider} />

        <AppText variant="sm" weight="bold" color={colors.text.primary}>Biểu đồ xu hướng đơn hàng</AppText>
        {safeData.map((item: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
            <AppText variant="sm" color={colors.text.primary} style={{ width: 80 }} numberOfLines={1}>{item.date?.slice(5) || item.date}</AppText>
            <View style={{ flex: 1, height: 8, backgroundColor: colors.surface.app, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ width: `${Math.max(5, ((item.predicted_orders || 0) / maxVal) * 100)}%`, height: 8, backgroundColor: colors.brand.primary, borderRadius: 4 }} />
            </View>
            <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ width: 45, textAlign: 'right' }}>{item.predicted_orders}</AppText>
          </View>
        ))}
      </View>
    );
  };

  const total = safeData.reduce((s, r) => s + (r.predicted_orders || 0), 0);
  const avg = safeData.length ? Math.round(total / safeData.length) : 0;
  const avgConf = safeData.length ? Math.round(safeData.reduce((s, r) => s + (r.confidence || 90), 0) / safeData.length) : 90;

  const renderMobileForecastCard = ({ item: r }: { item: any }) => (
    <View style={styles.itemMobile}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.avatarCircle, { backgroundColor: '#EFF6FF' }]}>
          <Icon name="chart-timeline-variant" size={20} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>
            Dự báo ngày {r.date}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <AppText variant="sm" color="#65676B">Nhu cầu dự kiến: {r.predicted_orders || 0} đơn</AppText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="md" weight="bold" color={colors.status.success}>{r.confidence || 90}%</AppText>
          <AppText variant="sm" color="#65676B">Độ tin cậy</AppText>
        </View>
      </View>

      <View style={styles.cardActionDivider} />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
        <TouchableOpacity style={styles.panelBtnSecondary} onPress={() => {}}>
          <Icon name="brain" size={14} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.brand.primary}>Xem mô phỏng AI</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleSortChange = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">Dự báo AI ({days} ngày)</AppText>
          <TouchableOpacity onPress={load} style={styles.addBtn}>
            <Icon name="refresh" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Chạy AI</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="chart-line" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{total}</AppText>
            <AppText variant="sm" color="#65676B">Tổng đơn</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="calendar" size={18} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">{avg}</AppText>
            <AppText variant="sm" color="#65676B">TB/ngày</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="shield-check" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{avgConf}%</AppText>
            <AppText variant="sm" color="#65676B">Tin cậy</AppText>
          </View>
        </View>
      </View>

      {/* Filter chips */}
      <View style={{ marginVertical: 4, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {[3, 7, 14].map(d => {
            const active = days === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDays(d)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText variant="sm" weight={active ? "bold" : "normal"} color={active ? colors.brand.primary : "#050505"}>
                  Dự báo {d} ngày tới
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
        <FlatList
          data={safeData}
          keyExtractor={(r: any, idx) => r?.id || r?.date || String(idx)}
          renderItem={renderMobileForecastCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? (
              <TableSkeleton rowCount={5} />
            ) : (
              <EmptyState
                icon="chart-timeline-variant"
                title="Chưa có dữ liệu dự báo"
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
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justify: 'center',
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
  panelDivider: { height: 1, backgroundColor: colors.border.light },
});
