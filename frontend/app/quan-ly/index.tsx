import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useSidebar } from '../../lib/context/SidebarContext';
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
import { api } from '../../lib/api';
import type { Dashboard } from '../../lib/api';

function formatVND(v: number): string {
  return (v || 0).toLocaleString('vi-VN') + 'đ';
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
      const d = await api.getDashboard();
      setData(d);
    } catch (e: any) {
      // silent
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
      growth: data?.revenue_growth ?? undefined,
    },
    {
      label: 'Số đơn hàng',
      value: String(data?.total_orders ?? 0),
      icon: 'receipt',
      color: '#4F46E5',
      bgColor: '#EEF2FF',
      growth: data?.orders_growth ?? undefined,
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

  const renderStatRow = (isHorizontal: boolean) => {
    if (isHorizontal) {
      return (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {stats.map((s, i) => (
            <View key={i} style={{ flex: 1 }}>
              <StatCard {...s} loading={loading} hideTrend compact={false} />
            </View>
          ))}
        </View>
      );
    }
    // Mobile: 2x2 grid using explicit rows to avoid overflow
    return (
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <StatCard {...stats[0]} loading={loading} hideTrend={!stats[0].growth} compact />
          </View>
          <View style={{ flex: 1 }}>
            <StatCard {...stats[1]} loading={loading} hideTrend={!stats[1].growth} compact />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <StatCard {...stats[2]} loading={loading} hideTrend compact />
          </View>
          <View style={{ flex: 1 }}>
            <StatCard {...stats[3]} loading={loading} hideTrend compact />
          </View>
        </View>
      </View>
    );
  };

  if (isWide) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Quản Lý"
          subtitle="Trung tâm quản lý vận hành"
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
                  <Icon name="cash-register" size={16} color="#fff" />
                  <Text style={styles.pillText}>Bán hàng</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 40, gap: 12 }}
        >
          {renderStatRow(true)}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Left column */}
            <View style={{ flex: 1.5, gap: 12 }}>
              <RevenueChart data={data?.revenue_by_hour} loading={loading} />
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
            {/* Right column */}
            <View style={{ flex: 1, gap: 12 }}>
              <TopProductsList data={data?.top_products} loading={loading} />
              <LowStockList items={data?.low_stock_items} loading={loading} />
              <RecentActivitiesList activities={data?.recent_activities} loading={loading} />
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
      <ScreenHeader
        title="Quản Lý"
        subtitle="Trung tâm"
        onMenuPress={openSidebar}
        compact
        right={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity onPress={onRefresh} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="refresh" size={16} color={colors.brand.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/ban-hang')} activeOpacity={0.9}>
              <LinearGradient
                colors={[colors.brand.primary, colors.brand.primaryHover]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 }}
              >
                <Icon name="cash-register" size={14} color="#fff" />
                <Text style={{ ...font.caption, color: '#fff', fontWeight: '600' }}>Bán hàng</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 40, gap: 6 }}
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
        <LowStockList items={data?.low_stock_items} loading={loading} />
        <RecentActivitiesList activities={data?.recent_activities} loading={loading} />
        <NavigationGrid compact />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  pillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: shape.radius.md,
  },
  pillText: { color: '#FFFFFF', ...font.buttonSmall },
  refreshBtn: {
    width: 44, height: 44, borderRadius: shape.radius.md,
    backgroundColor: colors.brand.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },

  cardBox: {
    backgroundColor: colors.surface.card,
    borderRadius: shape.radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)",
    elevation: 3,
  },
});
