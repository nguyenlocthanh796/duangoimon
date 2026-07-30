import React, { useCallback, useEffect, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, SalesReport } from '../../lib/api';
import { colors, font, formatVND, ss } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useResponsive } from '../../lib/hooks/useResponsive';
import BarChart from '../../lib/components/management/BarChart';
import { DailyReportTable, TopProductsTable } from '../../lib/components/management/ReportTables';
import AppText from '../../lib/components/ui/AppText';

export default function ReportsScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'thisMonth' | 'lastMonth'>('7d');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let dateFrom = '';
      let dateTo = '';
      const now = new Date();
      
      if (dateRange === '7d') {
        const d = new Date();
        d.setDate(now.getDate() - 7);
        dateFrom = d.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
      } else if (dateRange === '30d') {
        const d = new Date();
        d.setDate(now.getDate() - 30);
        dateFrom = d.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
      } else if (dateRange === 'thisMonth') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFrom = d.toISOString().split('T')[0];
        dateTo = now.toISOString().split('T')[0];
      } else if (dateRange === 'lastMonth') {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFrom = firstDay.toISOString().split('T')[0];
        dateTo = lastDay.toISOString().split('T')[0];
      }

      const d = await api.getSalesReport(dateFrom, dateTo);
      setData(d);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const totalRevenue = data?.daily?.reduce((s, d) => s + d.revenue, 0) ?? 0;
  const totalOrders = data?.daily?.reduce((s, d) => s + d.orders, 0) ?? 0;
  const avgRevenuePerDay = data?.daily?.length
    ? Math.round(totalRevenue / data.daily.length)
    : 0;

  const renderKpiPanel = () => (
    <View style={ss.sectionWrap}>
      <View style={ss.sectionHeader}>
        <View style={[ss.iconCircleSm, { backgroundColor: '#FFF7ED' }]}>
          <Icon name="chart-arc" size={14} color="#F97316" />
        </View>
        <AppText variant="md" color="#1E293B" style={{ flex: 1 }}>Tổng quan doanh thu kỳ này</AppText>
      </View>
      <View style={{ padding: 12, gap: 10 }}>
        <View style={{ alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFF7ED', borderRadius: 6, borderWidth: 1, borderColor: '#FFEDD5' }}>
          <AppText variant="md" color="#F97316">{formatVND(totalRevenue)}</AppText>
          <AppText variant="md" color="#64748B" style={{ marginTop: 2 }}>Tổng doanh thu bán hàng</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <AppText variant="md" color="#0F172A">{totalOrders}</AppText>
            <AppText variant="md" color="#64748B">Tổng số đơn</AppText>
          </View>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
            <AppText variant="md" color={colors.status.success}>{formatVND(avgRevenuePerDay)}</AppText>
            <AppText variant="md" color="#64748B">TB mỗi ngày</AppText>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}>
        {/* 📊 Native App Style KPI Widget Cards Strip */}
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
              <AppText variant="md" color={colors.status.success}>đ</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color={colors.status.success}>{formatVND(totalRevenue)}</AppText>
              <AppText variant="md" color="#64748B">Doanh thu</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
              <AppText variant="md" color={colors.brand.primary}>đơn</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#0F172A">{totalOrders} đơn</AppText>
              <AppText variant="md" color="#64748B">Số đơn</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FFF7ED' }]}>
              <AppText variant="md" color="#F97316">TB</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" color="#F97316">{formatVND(avgRevenuePerDay)}</AppText>
              <AppText variant="md" color="#64748B">TB/Ngày</AppText>
            </View>
          </View>
        </View>

        {/* Date Filter Row */}
        <View style={{ width: '100%', marginBottom: 6 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ width: '100%', flexGrow: 0, height: 44 }}
            contentContainerStyle={{ alignItems: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 6 }}
          >
            {[
              { id: '7d', label: '7 ngày' },
              { id: '30d', label: '30 ngày' },
              { id: 'thisMonth', label: 'Tháng này' },
              { id: 'lastMonth', label: 'Tháng trước' },
            ].map(r => {
              const active = dateRange === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => setDateRange(r.id as any)}
                  style={[ss.filterChip, active && ss.filterChipActive]}
                >
                  <AppText variant="md" color={active ? colors.brand.primary : "#334155"}>
                    {r.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isWide ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 0.55 }}>
              <View style={ss.sectionWrap}>
                <View style={ss.sectionHeader}>
                  <View style={[ss.iconCircleSm, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="chart-bar" size={14} color={colors.brand.primary} />
                  </View>
                  <AppText variant="md" color="#1E293B" style={{ flex: 1 }}>Doanh thu theo ngày</AppText>
                </View>
                <View style={{ padding: 10 }}>
                  {(data?.daily?.length ?? 0) === 0 ? (
                    <View style={styles.emptyBox}>
                      <AppText variant="md" color={colors.text.muted}>Không có dữ liệu</AppText>
                    </View>
                  ) : (
                    <BarChart data={data!.daily} />
                  )}
                </View>
              </View>

              {(data?.daily?.length ?? 0) > 0 && <DailyReportTable data={data!.daily} />}
              <TopProductsTable data={data?.top_products ?? []} />
            </View>
            <View style={{ flex: 0.45 }}>{renderKpiPanel()}</View>
          </View>
        ) : (
          <>
            <View style={ss.sectionWrap}>
              <View style={ss.sectionHeader}>
                <View style={[ss.iconCircleSm, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="chart-bar" size={14} color={colors.brand.primary} />
                </View>
                <AppText variant="md" color="#1E293B" style={{ flex: 1 }}>Doanh thu theo ngày</AppText>
              </View>
              <View style={{ padding: 10 }}>
                {(data?.daily?.length ?? 0) === 0 ? (
                  <View style={styles.emptyBox}>
                    <AppText variant="md" color={colors.text.muted}>Không có dữ liệu</AppText>
                  </View>
                ) : (
                  <BarChart data={data!.daily} />
                )}
              </View>
            </View>

            {(data?.daily?.length ?? 0) > 0 && <DailyReportTable data={data!.daily} />}
            <TopProductsTable data={data?.top_products ?? []} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Facebook Story Highlight Metric Cards Container */
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  fbMetricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fbMetricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  chipActive: {
    backgroundColor: '#FFF7ED',
    borderColor: colors.brand.primary,
  },

  panelBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  panelDivider: { height: 1, backgroundColor: colors.border.light },

  section: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    padding: 12,
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  emptyBox: { alignItems: 'center', paddingVertical: 18, gap: 6 },

  mobileTopActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: 10,
  },
  mobileAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },
});
