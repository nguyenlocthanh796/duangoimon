"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import type { ExecDashboard } from '../../lib/api/client';

function formatVND(v: number) { return (v || 0).toLocaleString('vi-VN') + 'đ'; }

export default function ExecDashboardScreen() {
  const { openSidebar } = useSidebar();
  const [data, setData] = useState<ExecDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request<ExecDashboard>('/api/v1/quan-ly/exec-dashboard');
      setData(res);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}><ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 60 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <Text style={{ ...font.h1, color: colors.text.primary }}>Exec Dashboard 🏛️</Text>
        </View>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16, gap: 16 }}
        data={[]}
        keyExtractor={(_: any, i: number) => String(i)}
        ListHeaderComponent={
          data ? (
            <View style={{ gap: 16 }}>
              {/* KPI cards */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.kpi, { flex: 1 }]}>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Doanh thu</Text>
                  <Text style={{ ...font.h1, color: colors.text.primary }}>{formatVND(data.total_revenue)}</Text>
                  <Text style={{ ...font.badge, color: data.revenue_change >= 0 ? '#16A34A' : '#DC2626' }}>
                    {data.revenue_change >= 0 ? '↑' : '↓'} {Math.abs(data.revenue_change)}%
                  </Text>
                </View>
                <View style={[styles.kpi, { flex: 1 }]}>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Đơn hàng</Text>
                  <Text style={{ ...font.h1, color: colors.text.primary }}>{data.total_orders}</Text>
                  <Text style={{ ...font.badge, color: data.order_change >= 0 ? '#16A34A' : '#DC2626' }}>
                    {data.order_change >= 0 ? '↑' : '↓'} {Math.abs(data.order_change)}%
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.kpi, { flex: 1 }]}>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>TB đơn</Text>
                  <Text style={{ ...font.h2, color: colors.text.primary }}>{formatVND(data.avg_order)}</Text>
                </View>
                <View style={[styles.kpi, { flex: 1 }]}>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Bàn đang dùng</Text>
                  <Text style={{ ...font.h2, color: colors.text.primary }}>{data.active_tables} ({data.table_occupancy}%)</Text>
                </View>
              </View>

              {/* Top branches */}
              {data.revenue_by_branch?.length > 0 && (
                <View>
                  <Text style={{ ...font.h3, color: colors.text.primary, marginBottom: 8 }}>Doanh thu theo CN</Text>
                  {data.revenue_by_branch.map((b: any, i: number) => (
                    <View key={i} style={styles.row}>
                      <Text style={{ ...font.body, color: colors.text.primary, flex: 1 }}>{b.branch}</Text>
                      <Text style={{ ...font.badge, color: colors.text.primary }}>{formatVND(b.revenue)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Daily chart */}
              {data.daily_revenue?.length > 0 && (
                <View>
                  <Text style={{ ...font.h3, color: colors.text.primary, marginBottom: 8 }}>Doanh thu 7 ngày</Text>
                  {data.daily_revenue.map((d: any, i: number) => (
                    <View key={i} style={styles.row}>
                      <Text style={{ ...font.body, color: colors.text.primary, flex: 1 }}>{d.date?.slice(5) || d.date}</Text>
                      <Text style={{ ...font.badge, color: colors.text.primary }}>{formatVND(d.revenue)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="view-dashboard-outline" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Không có dữ liệu</Text>
            </View>
          )
        }
        renderItem={() => null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.default, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },
  kpi: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border.default },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});
