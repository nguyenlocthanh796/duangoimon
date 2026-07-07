"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';

function formatVND(v: number) { return v.toLocaleString('vi-VN') + 'đ'; }

export default function BIReportsScreen() {
  const { openSidebar } = useSidebar();
  const [tab, setTab] = useState<'revenue'|'foodcost'>('revenue');
  const [revenue, setRevenue] = useState<any>(null);
  const [foodCost, setFoodCost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (tab === 'revenue') {
        const data = await request('/api/v1/quan-ly/reports/bi/revenue');
        setRevenue(data);
      } else {
        const data = await request('/api/v1/quan-ly/reports/bi/food-cost');
        setFoodCost(data);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <Text style={{ ...font.h1, color: colors.text.primary }}>BI Reports 📈</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <TouchableOpacity onPress={() => setTab('revenue')} style={[styles.tab, { backgroundColor: tab === 'revenue' ? colors.brand.primary : colors.surface.disabled }]}>
          <Text style={{ ...font.tab, color: tab === 'revenue' ? colors.text.inverse : colors.text.muted }}>Doanh thu</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('foodcost')} style={[styles.tab, { backgroundColor: tab === 'foodcost' ? colors.brand.primary : colors.surface.disabled }]}>
          <Text style={{ ...font.tab, color: tab === 'foodcost' ? colors.text.inverse : colors.text.muted }}>Food Cost</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          contentContainerStyle={{ padding: 16, gap: 12 }}
          data={tab === 'revenue' ? (revenue?.rows || []) : []}
          keyExtractor={(_: any, i: number) => String(i)}
          ListHeaderComponent={
            tab === 'foodcost' && foodCost ? (
              <View style={{ gap: 16 }}>
                <View style={styles.summaryCard}>
                  <Text style={{ ...font.h1, color: colors.text.primary }}>{formatVND(foodCost.total_revenue)}</Text>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Tổng doanh thu</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={{ ...font.h1, color: '#DC2626' }}>{formatVND(foodCost.total_food_cost)}</Text>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Tổng food cost</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={{ ...font.h1, color: '#D97706' }}>{foodCost.food_cost_pct}%</Text>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Tỷ lệ food cost</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={tab === 'revenue' && !loading ? (
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="chart-line" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Chưa có dữ liệu</Text>
            </View>
          ) : null}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.row}>
              <Text style={{ ...font.body, color: colors.text.primary, flex: 1 }}>{item.date}</Text>
              <Text style={{ ...font.caption, color: colors.text.secondary }}>{item.orders} đơn</Text>
              <Text style={{ ...font.badge, color: colors.text.primary, marginLeft: 8 }}>{formatVND(item.revenue)}</Text>
            </View>
          )}
          ListFooterComponent={
            tab === 'revenue' && revenue?.summary ? (
              <View style={[styles.summaryCard, { marginTop: 12 }]}>
                <Text style={{ ...font.h2, color: colors.text.primary }}>Tổng: {formatVND(revenue.summary.total_revenue)}</Text>
                <Text style={{ ...font.caption, color: colors.text.muted }}>{revenue.summary.total_orders} đơn</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.default, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  summaryCard: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border.default },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});
