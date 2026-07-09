import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { request } from '../../lib/api/client';
import type { Dashboard } from '../../lib/api/client';
import { useSidebar } from '../../lib/context/SidebarContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import StatCard from '../../lib/components/management/StatCard';
import OccupancyProgress from '../../lib/components/management/OccupancyProgress';
import {
  TopProductsList,
  NavigationGrid,
  LowStockList,
  RecentActivitiesList,
  RevenueChart,
} from '../../lib/components/management/DashboardWidgets';

function formatVND(v: number): string {
  return v.toLocaleString('vi-VN') + 'đ';
}

export default function QuanLyDashboard() {
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { width } = useWindowDimensions();
  const isWide = width > 768;

  const load = useCallback(async () => {
    try {
      const d = await request<Dashboard>('/api/v1/quan-ly/dashboard');
      setData(d);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const totalTables =
    (data?.table_stats?.trong ?? 0) +
    (data?.table_stats?.co_khach ?? 0) +
    (data?.table_stats?.da_dat ?? 0);
  const occupancy = totalTables > 0
    ? Math.round(((data?.table_stats?.co_khach ?? 0) / totalTables) * 100)
    : 0;

  const stats = [
    {
      label: 'Doanh thu hôm nay',
      value: formatVND(data?.today_revenue ?? 0),
      icon: 'currency-usd',
      color: '#059669',
      bgColor: '#ECFDF5',
      growth: data?.revenue_growth,
    },
    {
      label: 'Số đơn hàng',
      value: String(data?.total_orders ?? 0),
      icon: 'receipt',
      color: '#4F46E5',
      bgColor: '#EEF2FF',
      growth: data?.orders_growth,
    },
    {
      label: 'Bàn có khách',
      value: String(data?.table_stats?.co_khach ?? 0),
      icon: 'table-furniture',
      color: '#EA580C',
      bgColor: '#FFF7ED',
    },
    {
      label: 'Tỷ lệ lấp đầy',
      value: `${occupancy}%`,
      icon: 'chart-donut',
      color: '#7C3AED',
      bgColor: '#F5F3FF',
    },
  ];

  const renderHeader = () => (
    <ScreenHeader
      title="Quản Lý"
      subtitle="Tổng quan"
      onMenuPress={openSidebar}
      right={
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Icon name="refresh" size={20} color={colors.brand.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/ban-hang')} activeOpacity={0.9}>
            <LinearGradient
              colors={[colors.brand.primary, colors.brand.primaryHover]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pillBtn}
            >
              <Icon name="cash-register" size={14} color="#fff" />
              <Text style={styles.pillText}>Bán hàng</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      }
    />
  );

  const renderStatRow = (isHorizontal: boolean) => {
    if (isHorizontal) {
      // iPad: 4 cards flat, no scroll
      return (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {stats.map((s, i) => (
            <View key={i} style={{ flex: 1 }}>
              <StatCard {...s} loading={loading} hideTrend={!s.growth} compact={false} />
            </View>
          ))}
        </View>
      );
    }
    // iPhone: 2x2 grid
    return (
      <View style={styles.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={{ width: '48%' }}>
            <StatCard {...s} loading={loading} hideTrend={!s.growth} compact />
          </View>
        ))}
      </View>
    );
  };

  if (isWide) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
          contentContainerStyle={{ padding: 8, gap: 12 }}
        >
          {renderStatRow(true)}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Left */}
            <View style={{ flex: 1.5, gap: 12 }}>
              <RevenueChart />
              {!loading && data?.table_stats && (
                <View style={styles.cardBox}>
                  <OccupancyProgress
                    trong={data.table_stats.trong}
                    coKhach={data.table_stats.co_khach}
                    daDat={data.table_stats.da_dat}
                  />
                </View>
              )}
            </View>
            {/* Right */}
            <View style={{ flex: 1, gap: 12 }}>
              <TopProductsList data={data?.top_products} loading={loading} />
              <LowStockList loading={loading} />
              <RecentActivitiesList loading={loading} />
            </View>
          </View>

          <NavigationGrid compact={false} />
          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Mobile
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 40, gap: 12 }}
      >
        {renderStatRow(false)}

        <View style={styles.cardBox}>
          <OccupancyProgress
            trong={data?.table_stats?.trong ?? 0}
            coKhach={data?.table_stats?.co_khach ?? 0}
            daDat={data?.table_stats?.da_dat ?? 0}
          />
        </View>

        <TopProductsList data={data?.top_products} loading={loading} />
        <LowStockList loading={loading} />
        <RecentActivitiesList loading={loading} />
        <NavigationGrid compact />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },

  pillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: shape.radius.md,
  },
  pillText: { color: colors.text.inverse, ...font.buttonSmall },
  refreshBtn: {
    width: 44, height: 44, borderRadius: shape.radius.md,
    backgroundColor: colors.brand.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 8, gap: 8 },

  cardBox: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});
