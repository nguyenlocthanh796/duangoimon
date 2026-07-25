import React, { useCallback, useEffect, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { api, SalesReport } from '../../lib/api';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useResponsive } from '../../lib/hooks/useResponsive';
import BarChart from '../../lib/components/management/BarChart';
import { DailyReportTable, TopProductsTable } from '../../lib/components/management/ReportTables';
import AppText from '../../lib/components/ui/AppText';

export default function ReportsScreen() {
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
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="chart-box-outline" size={18} color={colors.brand.primary} />
        <AppText variant="sm" weight="bold" color={colors.text.primary}>Thống kê tổng quan kỳ này</AppText>
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 4 }}>
        <AppText variant="lg" weight="bold" color={colors.brand.primary}>{formatVND(totalRevenue)}</AppText>
        <AppText variant="sm" color={colors.text.muted}>Tổng doanh thu bán hàng</AppText>
      </View>
      <View style={styles.panelDivider} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText variant="md" weight="bold" color={colors.text.primary}>{totalOrders}</AppText>
          <AppText variant="sm" color={colors.text.muted}>Tổng số đơn</AppText>
        </View>
        <View style={styles.panelDividerV} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(avgRevenuePerDay)}</AppText>
          <AppText variant="sm" color={colors.text.muted}>TB mỗi ngày</AppText>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={styles.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">Báo cáo bán hàng</AppText>
          <TouchableOpacity onPress={load} style={styles.addBtn}>
            <Icon name="refresh" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Làm mới</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Facebook Story Highlight Metric Cards */}
      <View style={styles.fbMetricContainer}>
        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="currency-usd" size={18} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(totalRevenue)}</AppText>
            <AppText variant="sm" color="#65676B">Doanh thu</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="receipt" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{totalOrders}</AppText>
            <AppText variant="sm" color="#65676B">Số đơn</AppText>
          </View>
        </View>

        <View style={styles.fbMetricCard}>
          <View style={[styles.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="chart-line" size={18} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">{formatVND(avgRevenuePerDay)}</AppText>
            <AppText variant="sm" color="#65676B">TB/Ngày</AppText>
          </View>
        </View>
      </View>

      {/* Date Filter Row */}
      <View style={{ marginVertical: 4, marginBottom: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
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
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText variant="sm" color={active ? colors.brand.primary : "#050505"} weight={active ? 'bold' : 'normal'}>
                  {r.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="chart-bar" size={18} color={colors.brand.primary} />
                  <AppText variant="sm" weight="bold" color={colors.text.primary}>Doanh thu theo ngày</AppText>
                </View>
                {(data?.daily?.length ?? 0) === 0 ? (
                  <View style={styles.emptyBox}>
                    <Icon name="chart-bar" size={32} color={colors.icon.muted} />
                    <AppText variant="sm" color={colors.text.muted}>Không có dữ liệu</AppText>
                  </View>
                ) : (
                  <BarChart data={data!.daily} />
                )}
              </View>

              {(data?.daily?.length ?? 0) > 0 && <DailyReportTable data={data!.daily} />}
              <TopProductsTable data={data?.top_products ?? []} />
            </ScrollView>
          </View>
          <View style={{ flex: 0.45 }}>{renderKpiPanel()}</View>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}>
          <View style={styles.sectionMobile}>
            <View style={styles.sectionHeader}>
              <Icon name="chart-bar" size={18} color={colors.brand.primary} />
              <AppText variant="sm" weight="bold" color={colors.text.primary}>Doanh thu theo ngày</AppText>
            </View>
            {(data?.daily?.length ?? 0) === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="chart-bar" size={32} color={colors.icon.muted} />
                <AppText variant="sm" color={colors.text.muted}>Không có dữ liệu</AppText>
              </View>
            ) : (
              <BarChart data={data!.daily} />
            )}
          </View>

          {(data?.daily?.length ?? 0) > 0 && <DailyReportTable data={data!.daily} />}
          <TopProductsTable data={data?.top_products ?? []} />
          <View style={{ height: 40 }} />
        </ScrollView>
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

  chip: { paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand.primaryBg, borderWidth: 1, borderColor: '#FFEDD5' },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },

  section: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 12, marginBottom: 8 },
  sectionMobile: { backgroundColor: colors.surface.card, width: '100%', padding: 12, marginBottom: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border.light },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  emptyBox: { alignItems: 'center', paddingVertical: 18, gap: 6 },
});
