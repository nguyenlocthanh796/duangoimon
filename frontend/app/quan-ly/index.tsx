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
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import StatCard from '../../lib/components/management/StatCard';
import OccupancyProgress from '../../lib/components/management/OccupancyProgress';
import TopProductsWidget, { NavigationGrid } from '../../lib/components/management/DashboardWidgets';

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
    },
    {
      label: 'Số đơn hàng',
      value: String(data?.total_orders ?? 0),
      icon: 'receipt',
      color: '#4F46E5',
      bgColor: '#EEF2FF',
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


  if (isWide) {
    return (
      <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Quản Lý"
        subtitle="Tổng quan"
        onMenuPress={openSidebar}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onRefresh} style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="refresh" size={20} color="#F97316" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/ban-hang')} activeOpacity={0.9}>
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.backPillBtn}
              >
                <Icon name="cash-register" size={14} color="#fff" />
                <Text style={styles.backPillText}>Bán hàng</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
          contentContainerStyle={{ flexDirection: 'row', padding: 8, gap: 12 }}
        >
          {/* Left Column (60% width) */}
          <View style={{ flex: 1.5, gap: 12 }}>
            {/* Stats Cards (4 columns) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, flexShrink: 0 }}
              contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
            >
              {stats.map((s, i) => (
                <StatCard key={i} {...s} loading={loading} cardStyle={{ width: 145 }} />
              ))}
            </ScrollView>
            
            {/* Occupancy Indicator */}
            {!loading && data?.table_stats && (
              <View style={styles.sectionWide}>
                <OccupancyProgress
                  trong={data.table_stats.trong}
                  coKhach={data.table_stats.co_khach}
                  daDat={data.table_stats.da_dat}
                />
              </View>
            )}
          </View>

          {/* Right Column (40% width) */}
          <View style={{ flex: 1, gap: 12 }}>
            {/* Top Products */}
            <TopProductsWidget data={data?.top_products} loading={loading} />

            {/* Navigation Grid */}
            <NavigationGrid />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Quản Lý"
        subtitle="Tổng quan"
        onMenuPress={openSidebar}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onRefresh} style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="refresh" size={20} color="#F97316" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/ban-hang')} activeOpacity={0.9}>
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.backPillBtn}
              >
                <Icon name="cash-register" size={14} color="#fff" />
                <Text style={styles.backPillText}>Bán hàng</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />}
      >
        {/* Stat Cards (2x2 Grid) */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <StatCard key={i} {...s} loading={loading} />
          ))}
        </View>

        {/* Occupancy Indicator */}
        {!loading && data?.table_stats && (
          <View style={styles.section}>
            <OccupancyProgress
              trong={data.table_stats.trong}
              coKhach={data.table_stats.co_khach}
              daDat={data.table_stats.da_dat}
            />
          </View>
        )}

        {/* Top Products */}
        <TopProductsWidget data={data?.top_products} loading={loading} />

        <NavigationGrid />
        <View style={{ height: 32 }} />
      </ScrollView>
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
  container: { flex: 1, backgroundColor: colors.surface.app },

  backPillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 4,
  },
  backPillText: { color: colors.text.inverse, ...font.buttonSmall },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 16, gap: 10 },

  section: {
    backgroundColor: colors.surface.card,
    borderRadius: 4,
    marginHorizontal: 12,
    marginTop: 14,
    padding: 16,
    ...CARD_SHADOW,
  },
  sectionWide: {
    backgroundColor: colors.surface.card,
    borderRadius: 4,
    padding: 16,
    ...CARD_SHADOW,
  },
});
