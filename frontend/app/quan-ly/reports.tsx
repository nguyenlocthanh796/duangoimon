import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, SalesReport } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useResponsive } from '../../lib/hooks/useResponsive';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import BarChart from '../../lib/components/management/BarChart';
import { DailyReportTable, TopProductsTable } from '../../lib/components/management/ReportTables';


function formatVND(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'k';
  return v + 'đ';
}

function formatFullVND(v: number): string {
  return v.toLocaleString('vi-VN') + 'đ';
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return dateStr;
  }
}

export default function ReportsScreen() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
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

  const subtitleText = {
    '7d': '7 ngày gần đây',
    '30d': '30 ngày gần đây',
    'thisMonth': 'Trong tháng này',
    'lastMonth': 'Tháng trước',
  }[dateRange];

  const renderKpiPanel = () => (
    <View style={styles.panelBox}>
      <View style={styles.panelHeader}>
        <Icon name="chart-box-outline" size={18} color={colors.brand.primary} />
        <Text style={styles.panelHeaderText}>KPI</Text>
      </View>
      <View style={{ alignItems: 'center', paddingVertical: 4 }}>
        <Text style={styles.panelStatValue}>{formatFullVND(totalRevenue)}</Text>
        <Text style={styles.panelStatLabel}>Tổng doanh thu</Text>
      </View>
      <View style={styles.panelDivider} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.panelStatValue, { color: '#3B82F6' }]}>{totalOrders}</Text>
          <Text style={styles.panelStatLabel}>Đơn hàng</Text>
        </View>
        <View style={styles.panelDividerV} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.panelStatValue, { color: '#F97316' }]}>{formatVND(avgRevenuePerDay)}</Text>
          <Text style={styles.panelStatLabel}>TB/ngày</Text>
        </View>
      </View>
      <View style={styles.panelDivider} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="calendar" size={16} color={colors.text.muted} />
        <Text style={styles.panelLabel}>{data?.daily?.length ?? 0} ngày dữ liệu</Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer compact>
      <ScreenHeader
        title="Báo cáo"
        subtitle={subtitleText}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
        right={
          <TouchableOpacity onPress={onRefresh} style={[styles.iconBtn, { backgroundColor: colors.brand.primaryBg }]}>
            <Icon name="refresh" size={18} color={colors.brand.primary} />
          </TouchableOpacity>
        }
      />

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
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            <ScrollView showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
            >
              {/* Summary Cards */}
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard]}>
                  <View style={[styles.summaryIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Icon name="currency-usd" size={18} color="#10B981" />
                  </View>
                  <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
                  <Text style={[styles.summaryValue, { color: '#10B981' }]}>{formatFullVND(totalRevenue)}</Text>
                </View>
                <View style={[styles.summaryCard]}>
                  <View style={[styles.summaryIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="receipt" size={18} color="#3B82F6" />
                  </View>
                  <Text style={styles.summaryLabel}>Tổng đơn hàng</Text>
                  <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>{totalOrders}</Text>
                </View>
                <View style={[styles.summaryCard]}>
                  <View style={[styles.summaryIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Icon name="trending-up" size={18} color="#F97316" />
                  </View>
                  <Text style={styles.summaryLabel}>TB mỗi ngày</Text>
                  <Text style={[styles.summaryValue, { color: '#F97316' }]}>{formatVND(avgRevenuePerDay)}</Text>
                </View>
              </View>

              {/* Bar Chart */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="chart-bar" size={18} color={colors.brand.primary} />
                  <Text style={styles.sectionTitle}>Doanh thu theo ngày</Text>
                </View>
                {(data?.daily?.length ?? 0) === 0 ? (
                  <View style={styles.emptyBox}>
                    <Icon name="chart-bar" size={40} color="#CBD5E1" />
                    <Text style={styles.emptyText}>Không có dữ liệu</Text>
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
          </View>
          <View style={styles.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 8 }}>{renderKpiPanel()}</View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        >
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="currency-usd" size={18} color="#10B981" />
              </View>
              <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{formatFullVND(totalRevenue)}</Text>
            </View>
            <View style={[styles.summaryCard]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="receipt" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.summaryLabel}>Tổng đơn hàng</Text>
              <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>{totalOrders}</Text>
            </View>
            <View style={[styles.summaryCard]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#FFF7ED' }]}>
                <Icon name="trending-up" size={18} color="#F97316" />
              </View>
              <Text style={styles.summaryLabel}>TB mỗi ngày</Text>
              <Text style={[styles.summaryValue, { color: '#F97316' }]}>{formatVND(avgRevenuePerDay)}</Text>
            </View>
          </View>

          {/* Bar Chart */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="chart-bar" size={18} color={colors.brand.primary} />
              <Text style={styles.sectionTitle}>Doanh thu theo ngày</Text>
            </View>
            {(data?.daily?.length ?? 0) === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="chart-bar" size={40} color="#CBD5E1" />
                <Text style={styles.emptyText}>Không có dữ liệu</Text>
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
    </ScreenContainer>
  );
}

const CARD_SHADOW = {
  boxShadow: "0px 2px 8px rgba(0,0,0,0.06)",
  elevation: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },

  iconBtn: { width: 36, height: 36, borderRadius: shape.radius.md, alignItems: 'center', justifyContent: 'center' },

  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...font.badge, color: colors.text.muted },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  /* Panel */
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12, boxShadow: "0px 2px 8px rgba(0,0,0,0.06)", elevation: 3 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelStatLabel: { ...font.caption, color: colors.text.muted, marginTop: 2 },
  panelStatValue: { ...font.h2, fontWeight: '800', color: colors.text.primary },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  panelDividerV: { width: 1, backgroundColor: colors.border.light },
  panelLabel: { ...font.caption, color: colors.text.muted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { ...font.bodySmall, color: colors.text.secondary },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 14, gap: 8 },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12,
    borderWidth: 1, borderColor: colors.border.light, ...CARD_SHADOW,
  },
  summaryIcon: {
    width: 32, height: 32, borderRadius: shape.radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  summaryLabel: { ...font.caption, color: colors.text.secondary, fontWeight: '500' },
  summaryValue: { ...font.h3, marginTop: 4 },

  section: {
    backgroundColor: colors.surface.card, borderRadius: shape.radius.lg,
    marginHorizontal: 12, marginTop: 14, padding: 16, ...CARD_SHADOW,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { ...font.h3, color: colors.text.primary },

  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { ...font.bodySmall, color: colors.text.secondary },

  separator: { width: 1, backgroundColor: colors.border.light },
});


