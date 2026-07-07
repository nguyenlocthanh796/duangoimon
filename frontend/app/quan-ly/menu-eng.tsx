"use client";
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';

interface MatrixItem {
  id: string; name: string; price: number; cost_price: number;
  margin_pct: number; qty_sold: number; revenue: number;
}

interface MatrixData {
  stars: MatrixItem[]; plowhorses: MatrixItem[];
  puzzles: MatrixItem[]; dogs: MatrixItem[];
  summary: { total_items: number; avg_qty_sold: number; avg_margin_pct: number; period_days: number };
}

interface TopBottom { top: { name: string; qty: number; revenue: number }[]; bottom: { name: string; qty: number; revenue: number }[]; }

function formatVND(v: number) { return v.toLocaleString('vi-VN') + 'đ'; }

const QUADRANT_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  stars:     { label: 'Ngôi Sao ⭐', icon: 'star', color: '#D97706', bg: '#FFFBEB' },
  plowhorses: { label: 'Ngựa Cày 🐴', icon: 'horse', color: '#2563EB', bg: '#EFF6FF' },
  puzzles:   { label: 'Câu Đố ❓', icon: 'help-circle', color: '#7C3AED', bg: '#F5F3FF' },
  dogs:      { label: 'Chó 🐕', icon: 'dog', color: '#DC2626', bg: '#FEF2F2' },
};

export default function MenuEngScreen() {
  const { openSidebar } = useSidebar();
  const [tab, setTab] = useState<'matrix'|'top'>('matrix');
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [tb, setTb] = useState<TopBottom | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (tab === 'matrix') {
        const data = await request<MatrixData>('/api/v1/quan-ly/menu-eng/matrix?days=30');
        setMatrix(data);
      } else {
        const data = await request<TopBottom>('/api/v1/quan-ly/menu-eng/top-bottom?days=30');
        setTb(data);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={openSidebar} style={styles.iconBtn}><Icon name="menu" size={22} color={colors.icon.default} /></TouchableOpacity>
          <Text style={{ ...font.h1, color: colors.text.primary }}>Menu Engineering 📊</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <TouchableOpacity onPress={() => setTab('matrix')} style={[styles.tab, { backgroundColor: tab === 'matrix' ? colors.brand.primary : colors.surface.disabled }]}>
          <Text style={{ ...font.tab, color: tab === 'matrix' ? colors.text.inverse : colors.text.muted }}>BCG Matrix</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('top')} style={[styles.tab, { backgroundColor: tab === 'top' ? colors.brand.primary : colors.surface.disabled }]}>
          <Text style={{ ...font.tab, color: tab === 'top' ? colors.text.inverse : colors.text.muted }}>Top/Bottom</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} /> : (
        <FlatList
          contentContainerStyle={{ padding: 16, gap: 20 }}
          data={tab === 'matrix' && matrix ? Object.entries(QUADRANT_META) : []}
          keyExtractor={([k]) => k}
          ListHeaderComponent={
            tab === 'matrix' && matrix ? (
              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                <View style={styles.summaryCard}>
                  <Text style={{ ...font.h3, color: colors.text.primary }}>{matrix.summary.total_items}</Text>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Món</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={{ ...font.h3, color: colors.text.primary }}>{matrix.summary.avg_qty_sold}</Text>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>SL TB</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={{ ...font.h3, color: colors.text.primary }}>{matrix.summary.avg_margin_pct}%</Text>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Biên TB</Text>
                </View>
              </View>
            ) : null
          }
          renderItem={({ item: [key, meta] }) => {
            const items = matrix ? (matrix as any)[key] as MatrixItem[] : [];
            if (!items?.length) return null;
            return (
              <View>
                <View style={[styles.quadrantHeader, { backgroundColor: meta.bg }]}>
                  <Text style={{ ...font.h3, color: meta.color }}>{meta.label} · {items.length}</Text>
                </View>
                {items.map((m: any) => (
                  <View key={m.id || m.name} style={styles.itemRow}>
                    <Text style={{ ...font.body, color: colors.text.primary, flex: 1 }}>{m.name}</Text>
                    <Text style={{ ...font.caption, color: colors.text.muted }}>{m.qty_sold} cái</Text>
                    <Text style={{ ...font.badge, color: m.margin_pct >= 0 ? '#16A34A' : '#DC2626', marginLeft: 8 }}>{m.margin_pct}%</Text>
                  </View>
                ))}
              </View>
            );
          }}
          ListFooterComponent={
            tab === 'top' && tb ? (
              <View style={{ gap: 20 }}>
                <View>
                  <Text style={{ ...font.h2, color: colors.text.primary, marginBottom: 12 }}>🔥 Top bán chạy</Text>
                  {tb.top.map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={{ ...font.body, color: colors.text.primary, flex: 1 }}>{i+1}. {item.name}</Text>
                      <Text style={{ ...font.caption, color: colors.text.muted }}>{item.qty} cái</Text>
                      <Text style={{ ...font.badge, color: colors.text.secondary, marginLeft: 8 }}>{formatVND(item.revenue)}</Text>
                    </View>
                  ))}
                </View>
                <View>
                  <Text style={{ ...font.h2, color: colors.text.primary, marginBottom: 12 }}>❄️ Bottom bán chậm</Text>
                  {tb.bottom.map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={{ ...font.body, color: colors.text.primary, flex: 1 }}>{i+1}. {item.name}</Text>
                      <Text style={{ ...font.caption, color: colors.text.muted }}>{item.qty} cái</Text>
                      <Text style={{ ...font.badge, color: colors.text.secondary, marginLeft: 8 }}>{formatVND(item.revenue)}</Text>
                    </View>
                  ))}
                </View>
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
  summaryCard: { flex: 1, backgroundColor: colors.surface.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border.default },
  quadrantHeader: { padding: 10, borderRadius: 10, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.default },
});
