"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';

export default function ForecastScreen() {
  const { openSidebar } = useSidebar();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request<any[]>(`/api/v1/quan-ly/forecast/demand?days_ahead=${days}`);
      setData(res);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <Text style={{ ...font.h1, color: colors.text.primary }}>Dự Báo 📊</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        {[3, 7, 14].map(d => (
          <TouchableOpacity key={d} onPress={() => setDays(d)}
            style={[styles.tab, { backgroundColor: days === d ? colors.brand.primary : colors.surface.disabled }]}>
            <Text style={{ ...font.tab, color: days === d ? colors.text.inverse : colors.text.muted }}>{d} ngày</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, gap: 12 }}
          data={data}
          keyExtractor={(_: any, i: number) => String(i)}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="chart-timeline-variant" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Chưa có dữ liệu dự báo</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...font.h3, color: colors.text.primary }}>{item.date}</Text>
                <Text style={{ ...font.h3, color: colors.brand.primary }}>{Math.round(item.forecast) || 0}</Text>
              </View>
              <Text style={{ ...font.caption, color: colors.text.muted }}>Dự báo đơn hàng</Text>
              {item.confidence != null && (
                <View style={{ marginTop: 6, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0' }}>
                  <View style={{ width: `${Math.min(100, item.confidence)}%`, height: 4, borderRadius: 2, backgroundColor: item.confidence > 70 ? '#16A34A' : '#D97706' }} />
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.default, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  card: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border.default },
});
