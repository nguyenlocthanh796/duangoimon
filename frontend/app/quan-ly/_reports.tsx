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
      {/* Date Filter Row */}
      <View style={styles.filterRow}>
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
              <AppText variant="sm" color={active ? colors.brand.primary : colors.text.secondary} weight={active ? 'bold' : 'normal'}>
                {r.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}>
              {/* Bar Chart */}
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

              {/* Daily Table */}
              {(data?.daily?.length ?? 0) > 0 && <DailyReportTable data={data!.daily} />}
              {/* Top Products */}
              <TopProductsTable data={data?.top_products ?? []} />
            </ScrollView>
          </View>
          <View style={{ flex: 0.45 }}>{renderKpiPanel()}</View>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, paddingHorizontal: 8 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}>
          {/* Quick Summary Cards on Mobile */}
          <View style={styles.mobileSummaryRow}>
            <View style={styles.mobileSummaryCard}>
              <AppText variant="sm" color={colors.text.muted}>Tổng doanh thu</AppText>
              <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(totalRevenue)}</AppText>
            </View>
            <View style={styles.mobileSummaryCard}>
              <AppText variant="sm" color={colors.text.muted}>Đơn hàng</AppText>
              <AppText variant="md" weight="bold" color={colors.text.primary}>{totalOrders}</AppText>
            </View>
            <View style={styles.mobileSummaryCard}>
              <AppText variant="sm" color={colors.text.muted}>TB/ngày</AppText>
              <AppText variant="md" weight="bold" color={colors.status.success}>{formatVND(avgRevenuePerDay)}</AppText>
            </View>
          </View>

          {/* Bar Chart */}
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

          {/* Daily Table */}
          {(data?.daily?.length ?? 0) > 0 && <DailyReportTable data={data!.daily} />}
          {/* Top Products */}
          <TopProductsTable data={data?.top_products ?? []} />
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, marginVertical: 8 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: shape.radius.md, backgroundColor: colors.surface.card, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: colors.brand.primaryBg },

  mobileSummaryRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  mobileSummaryCard: { flex: 1, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 8, alignItems: 'center' },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },

  section: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  emptyBox: { alignItems: 'center', paddingVertical: 18, gap: 6 },
});
