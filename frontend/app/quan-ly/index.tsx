import { useCallback, useEffect, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity,
  RefreshControl, useWindowDimensions, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useSidebar } from '../../lib/context/SidebarContext';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import StatCard from '../../lib/components/management/StatCard';
import OccupancyProgress from '../../lib/components/management/OccupancyProgress';
import AppText from '../../lib/components/ui/AppText';
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
  const insets = useSafeAreaInsets();
  const { openSidebar } = useSidebar();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { width } = useWindowDimensions();
  const isWide = width >= 768;

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

  // Quick Action Buttons - Concise labels, 100% full text display
  const QUICK_ACTIONS = [
    { title: 'Thêm món', icon: 'plus-circle-outline', route: '/quan-ly/products', color: '#4F46E5', bg: '#EEF2FF' },
    { title: 'Nhập kho', icon: 'package-down', route: '/quan-ly/stock', color: '#059669', bg: '#ECFDF5' },
    { title: 'Vào ca', icon: 'clock-outline', route: '/quan-ly/shifts', color: '#F97316', bg: '#FFF7ED' },
    { title: 'Đặt bàn', icon: 'calendar-plus', route: '/quan-ly/booking', color: '#7C3AED', bg: '#F5F3FF' },
  ];

  const renderQuickActions = () => (
    <View style={{ backgroundColor: colors.surface.card, padding: isWide ? 14 : 12, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: colors.border.light, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name="flash-outline" size={18} color={colors.brand.primary} />
        <AppText style={{ ...font.sectionTitle, color: colors.text.primary }}>Thao tác nhanh</AppText>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isWide ? 10 : 8 }}>
        {QUICK_ACTIONS.map((act, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => router.push(act.route as any)}
            delayPressIn={0}
            activeOpacity={0.6}
            style={{
              width: isWide ? '23.8%' : '48.5%',
              height: 48,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingHorizontal: 10,
              backgroundColor: act.bg,
              borderRadius: shape.radius.md,
              borderWidth: 1,
              borderColor: colors.border.light,
            }}
          >
            <Icon name={act.icon as any} size={20} color={act.color} />
            <AppText variant="md" color={act.color} numberOfLines={1}>
              {act.title}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStatGrid = () => {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: isWide ? 10 : 6 }}>
        {stats.map((s, i) => (
          <StatCard
            key={i}
            {...s}
            loading={loading}
            hideTrend={!s.growth}
            style={{ width: isWide ? '23.8%' : '48.5%' }}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Quản Lý"
        subtitle={isWide ? "Trung tâm tổng quan kinh doanh & vận hành" : undefined}
        onMenuPress={openSidebar}
        compact={!isWide}
        right={
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={onRefresh}
              delayPressIn={0}
              activeOpacity={0.7}
              style={{
                width: isWide ? 42 : 38,
                height: isWide ? 42 : 38,
                borderRadius: isWide ? 21 : 19,
                backgroundColor: colors.brand.primaryBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="refresh" size={isWide ? 20 : 18} color={colors.brand.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/ban-hang')}
              delayPressIn={0}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#F97316', '#EA580C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: isWide ? 14 : 10,
                  height: isWide ? 40 : 36,
                  borderRadius: shape.radius.md,
                  shadowColor: '#F97316',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Icon name="point-of-sale" size={isWide ? 18 : 16} color="#FFF" />
                <AppText variant="md" weight="bold" color="#FFF">Bán hàng</AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: isWide ? 10 : 6, paddingBottom: Math.max(40, insets.bottom + 20) }}
      >
        {/* Quick Actions Bar */}
        {renderQuickActions()}

        {/* 4 KPI Stat Cards */}
        {renderStatGrid()}

        {/* Main Content Layout */}
        {isWide ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Left column */}
            <View style={{ flex: 1.4, gap: 12 }}>
              <RevenueChart data={data?.revenue_by_hour} loading={loading} />
              {!loading && data?.table_stats && (
                <View style={{ backgroundColor: colors.surface.card, padding: 14, borderRadius: shape.radius.lg }}>
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
        ) : (
          <View style={{ gap: 8 }}>
            <RevenueChart data={data?.revenue_by_hour} loading={loading} />

            <View style={{ backgroundColor: colors.surface.card, padding: 10, borderRadius: shape.radius.lg }}>
              <OccupancyProgress
                trong={data?.table_stats?.trong ?? 0}
                coKhach={data?.table_stats?.co_khach ?? 0}
                daDat={data?.table_stats?.da_dat ?? 0}
              />
            </View>

            <TopProductsList data={data?.top_products} loading={loading} />
            <LowStockList items={data?.low_stock_items} loading={loading} />
            <RecentActivitiesList activities={data?.recent_activities} loading={loading} />
          </View>
        )}

        <NavigationGrid />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.card },
});
