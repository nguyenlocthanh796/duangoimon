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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api, SalesReport } from '../../lib/api';
import { useSidebar } from '../../lib/context/SidebarContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
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

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Báo cáo"
        subtitle={subtitleText}
        showBack
        onMenuPress={openSidebar}
        onBackPress={() => router.back()}
        right={
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Icon name="refresh" size={20} color="#F97316" />
          </TouchableOpacity>
        }
      />

      {/* Date Filter Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light, flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}
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
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: active ? colors.brand.primary : colors.border.default,
                backgroundColor: active ? colors.brand.primaryBg : colors.surface.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? colors.brand.primary : colors.text.secondary }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Đang tải báo cáo...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
        >
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderTopColor: '#10B981' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="currency-usd" size={18} color="#10B981" />
              </View>
              <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{formatFullVND(totalRevenue)}</Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: '#3B82F6' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="receipt" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.summaryLabel}>Tổng đơn hàng</Text>
              <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>{totalOrders}</Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: '#F97316' }]}>
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
              <Text style={styles.sectionTitle}>📈 Doanh thu theo ngày</Text>
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
    </SafeAreaView>
  );
}

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  refreshBtn: {
    width: 36, height: 36, borderRadius: 4,
    backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { ...font.bodySmall, color: colors.text.secondary },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 14, gap: 8 },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface.card, borderRadius: 4, padding: 12,
    borderTopWidth: 3, ...CARD_SHADOW,
  },
  summaryIcon: {
    width: 32, height: 32, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  summaryLabel: { ...font.micro, color: colors.text.secondary, fontWeight: '500' },
  summaryValue: { ...font.h3, marginTop: 4 },

  section: {
    backgroundColor: colors.surface.card, borderRadius: 4,
    marginHorizontal: 12, marginTop: 14, padding: 16, ...CARD_SHADOW,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { ...font.h3, color: colors.text.primary },
  sectionSub: { ...font.bodySmall, color: colors.text.secondary },

  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { ...font.bodySmall, color: colors.text.secondary },
});

