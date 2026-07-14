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
      color: '#F97316',
      bgColor: '#F97316',
    },
    {
      label: 'Tỷ lệ lấp đầy',
      value: `${occupancy}%`,
      icon: 'chart-donut',
      color: '#7C3AED',
      bgColor: '#F5F3FF',
    },
  ];

  const renderStatRow = () => {
    if (isWide) {
      return (
        <View style={[styles.cardBox, { padding: 0, gap: 0, flexDirection: 'row' }]}>
          {stats.map((s, i) => (
            <View key={i} style={{ flex: 1, padding: 12, borderRightWidth: i < 3 ? 1 : 0, borderRightColor: colors.border.default }}>
              <StatCard {...s} loading={loading} hideTrend={!s.growth} compact={true} cardStyle={{ borderWidth: 0, padding: 0, borderRadius: 0, boxShadow: 'none' }} />
            </View>
          ))}
        </View>
      );
    }
    // Mobile: Unified 2x2 grid edge-to-edge block
    return (
      <View style={[styles.cardBox, { padding: 0, gap: 0 }]}>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
          <View style={{ flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: colors.border.default }}>
            <StatCard {...stats[0]} loading={loading} hideTrend={!stats[0].growth} compact cardStyle={{ borderWidth: 0, padding: 0, borderRadius: 0 }} />
          </View>
          <View style={{ flex: 1, padding: 12 }}>
            <StatCard {...stats[1]} loading={loading} hideTrend={!stats[1].growth} compact cardStyle={{ borderWidth: 0, padding: 0, borderRadius: 0 }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: colors.border.default }}>
            <StatCard {...stats[2]} loading={loading} hideTrend={!stats[2].growth} compact cardStyle={{ borderWidth: 0, padding: 0, borderRadius: 0 }} />
          </View>
          <View style={{ flex: 1, padding: 12 }}>
            <StatCard {...stats[3]} loading={loading} hideTrend={!stats[3].growth} compact cardStyle={{ borderWidth: 0, padding: 0, borderRadius: 0 }} />
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
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <TouchableOpacity onPress={onRefresh} style={[styles.refreshBtn, { borderRadius: 24, width: 48, height: 48, backgroundColor: '#FFF7ED' }]}>
                <Icon name="refresh" size={24} color={'#F97316'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/ban-hang')} activeOpacity={0.9}>
                <LinearGradient
                  colors={['#F97316', '#EA580C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.pillBtn, { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 99 }]}
                >
                  <Icon name="point-of-sale" size={24} color="#FFF" />
                  <Text style={[{ color: '#FFF' }, font.button, isWide && { fontSize: 18 } ]}>Bán hàng</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#F97316'} />}
          contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 40, gap: 8 }}
        >
          {renderStatRow()}

          <View style={{ flexDirection: 'row', gap: 12}}>
            {/* Left column */}
            <View style={{ flex: 1.5, gap: 12}}>
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
            <View style={{ flex: 1, gap: 12}}>
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
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity onPress={onRefresh} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="refresh" size={18} color={'#F97316'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/ban-hang')} activeOpacity={0.9}>
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99}}
              >
                <Icon name="point-of-sale" size={20} color="#FFF" />
                <Text style={[{ color: '#FFF' }, font.button ]}>Bán hàng</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#F97316'} />}
        contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 40, gap: 8}}
      >
        {renderStatRow()}

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
  container: { flex: 1, backgroundColor: colors.surface.app },

  pillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 32,
    borderRadius: 8,
  },
  pillText: { color: '#FFFFFF', ...font.buttonSmall },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: '#F97316',
    alignItems: 'center', justifyContent: 'center',
  },

  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
    boxShadow: 'none',
    elevation: 0,
  },
});
