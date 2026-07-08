"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import FormModal from '../../lib/components/ui/FormModal';
import EmptyState from '../../lib/components/ui/EmptyState';

interface MatrixItem { id: string; name: string; price: number; cost_price: number; margin_pct: number; qty_sold: number; revenue: number; }
interface MatrixData { stars: MatrixItem[]; plowhorses: MatrixItem[]; puzzles: MatrixItem[]; dogs: MatrixItem[]; summary: { total_items: number; avg_qty_sold: number; avg_margin_pct: number; period_days: number }; }
interface TopBottom { top: { name: string; qty: number; revenue: number }[]; bottom: { name: string; qty: number; revenue: number }[]; }
function formatVND(v: number) { return (v || 0).toLocaleString('vi-VN') + 'đ'; }

const QUADRANT_META: Record<string, { label: string; icon: string; color: string; bg: string; suggestion: string }> = {
  stars:     { label: 'Ngôi sao', icon: 'star', color: '#D97706', bg: '#FFFBEB', suggestion: 'Giữ chất lượng, đẩy mạnh quảng bá, tạo combo với món Puzzle để kéo doanh thu' },
  plowhorses: { label: 'Ngựa cày', icon: 'horse', color: '#2563EB', bg: '#EFF6FF', suggestion: 'Tăng giá nhẹ (5-10%) hoặc tìm NCC rẻ hơn, kết hợp upsell topping' },
  puzzles:   { label: 'Câu đố', icon: 'help-circle', color: '#7C3AED', bg: '#F5F3FF', suggestion: 'Đưa lên banner/standee, tạo combo với Star, chạy BOGO để thử' },
  dogs:      { label: 'Chó', icon: 'dog', color: '#DC2626', bg: '#FEF2F2', suggestion: 'Giảm giá xả hàng, 30 ngày không cải thiện → khai tử' },
};

type SortKey = 'qty_sold' | 'revenue' | 'margin_pct' | 'name';

export default function MenuEngScreen() {
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();
  const [tab, setTab] = useState<'matrix'|'top'>('matrix');
  const [days, setDays] = useState(30);
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [tb, setTb] = useState<TopBottom | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ item: any; quadrant: string } | null>(null);
  const [chartQ, setChartQ] = useState('stars');
  const [sortKey, setSortKey] = useState<SortKey>('qty_sold');
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try { setLoading(true); if (tab === 'matrix') setMatrix(await request<MatrixData>(`/api/v1/quan-ly/menu-eng/matrix?days=${days}`)); else setTb(await request<TopBottom>(`/api/v1/quan-ly/menu-eng/top-bottom?days=${days}`)); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, [tab, days]);
  useEffect(() => { load(); }, [load]);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(false); } };

  const allItems = useMemo(() => {
    if (!matrix) return [];
    const result: { item: MatrixItem; quadrant: string }[] = [];
    for (const q of ['stars', 'plowhorses', 'puzzles', 'dogs'] as const) {
      (matrix[q] || []).forEach(m => result.push({ item: m, quadrant: q }));
    }
    const cmp = (a: { item: MatrixItem }, b: { item: MatrixItem }) => {
      if (sortKey === 'name') return sortAsc ? b.item.name.localeCompare(a.item.name) : a.item.name.localeCompare(b.item.name);
      if (sortKey === 'margin_pct') return sortAsc ? a.item.margin_pct - b.item.margin_pct : b.item.margin_pct - a.item.margin_pct;
      if (sortKey === 'revenue') return sortAsc ? a.item.revenue - b.item.revenue : b.item.revenue - a.item.revenue;
      return sortAsc ? a.item.qty_sold - b.item.qty_sold : b.item.qty_sold - a.item.qty_sold;
    };
    return result.sort(cmp);
  }, [matrix, sortKey, sortAsc]);

  const StatItem = ({ icon, value, label }: { icon: string; value: string | number; label: string }) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon as any} size={14} color={colors.text.muted} />
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  // ── Sort header ──
  const SortHeader = ({ label, sortKey: k, w }: { label: string; sortKey: SortKey; w: number }) => (
    <TouchableOpacity onPress={() => toggleSort(k)} style={{ width: w, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Text style={[s.thText, sortKey === k && { color: colors.brand.primary }]}>{label}</Text>
      {sortKey === k ? <Icon name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={colors.brand.primary} /> : null}
    </TouchableOpacity>
  );

  // ── iPad panel ──
  const renderPanel = () => {
    const items = matrix ? (matrix[chartQ as keyof MatrixData] as MatrixItem[] || []) : [];
    const meta = QUADRANT_META[chartQ];
    const maxRev = Math.max(...items.map(i => i.revenue), 1);
    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <Icon name="chart-bar" size={18} color={colors.brand.primary} />
          <Text style={s.panelHeaderText}>Phân tích</Text>
        </View>
        {tab === 'matrix' && matrix ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }} contentContainerStyle={{ gap: 6 }}>
              {(['stars', 'plowhorses', 'puzzles', 'dogs'] as const).map(q => {
                const m = QUADRANT_META[q];
                return (
                  <TouchableOpacity key={q} onPress={() => setChartQ(q)}
                    style={[s.chip, chartQ === q && { backgroundColor: m.color, borderColor: m.color }]}>
                    <Text style={[s.chipText, chartQ === q && { color: '#fff' }]}>{m.icon} {m.label} ({(matrix[q] || []).length})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ gap: 6, marginTop: 8 }}>
              {items.slice(0, 5).map((i: MatrixItem) => (
                <View key={i.id || i.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ width: 70, ...font.caption, color: colors.text.primary }} numberOfLines={1}>{i.name}</Text>
                  <View style={{ flex: 1, height: 14, backgroundColor: colors.surface.disabled, borderRadius: 3 }}>
                    <View style={{ width: `${Math.max(5, (i.revenue / maxRev) * 100)}%`, height: 14, backgroundColor: meta.color, borderRadius: 3 }} />
                  </View>
                  <Text style={{ width: 50, textAlign: 'right', ...font.micro, color: colors.text.muted }}>{formatVND(i.revenue)}</Text>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: meta.bg, padding: 10, borderRadius: shape.radius.md, borderWidth: 1, borderColor: meta.color + '30' }}>
              <Text style={{ ...font.caption, color: meta.color, fontWeight: '600' }}>💡 {meta.suggestion}</Text>
            </View>
          </>
        ) : tb ? (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={s.panelStatValue}>{tb.top.length + tb.bottom.length}</Text>
            <Text style={s.panelStatLabel}>Món phân tích</Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ── Table row ──
  const TableRow = ({ item: row }: { item: { item: MatrixItem; quadrant: string } }) => {
    const { item, quadrant } = row;
    const meta = QUADRANT_META[quadrant];
    return (
      <TouchableOpacity onPress={() => setSelected(row)} style={s.tr} activeOpacity={0.7}>
        <View style={[s.td, { width: 30 }]}><View style={[s.quadrantDot, { backgroundColor: meta.color }]} /></View>
        <Text style={[s.td, { flex: 1, fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[s.td, { width: 60, textAlign: 'right' }]}>{item.qty_sold}</Text>
        <Text style={[s.td, { width: 85, textAlign: 'right' }]}>{formatVND(item.revenue)}</Text>
        <Text style={[s.td, { width: 55, textAlign: 'right', color: item.margin_pct >= 0 ? '#16A34A' : '#DC2626', fontWeight: '700' }]}>{item.margin_pct}%</Text>
      </TouchableOpacity>
    );
  };

  // ── Top/Bottom rows ──
  const renderTopBottom = () => {
    if (!tb) return <EmptyState icon="chart-bubble" title="Không có dữ liệu" />;
    return (
      <View style={{ gap: 8 }}>
        <Text style={s.sectionTitle}>🔥 Top bán chạy</Text>
        {tb.top.map((item, i) => (
          <View key={'t' + i} style={s.tbRow}>
            <View style={[s.rankDot, { backgroundColor: '#DCFCE7' }]}><Text style={{ ...font.micro, fontWeight: '900', color: '#16A34A' }}>{i + 1}</Text></View>
            <Text style={{ flex: 1, ...font.bodySmall, fontWeight: '600', color: colors.text.primary }}>{item.name}</Text>
            <Text style={{ width: 50, textAlign: 'right', ...font.caption, color: colors.text.muted }}>{item.qty} cái</Text>
            <Text style={{ width: 85, textAlign: 'right', ...font.bodySmall, fontWeight: '700', color: colors.text.primary }}>{formatVND(item.revenue)}</Text>
          </View>
        ))}
        <Text style={[s.sectionTitle, { marginTop: 8 }]}>❄️ Bottom bán chậm</Text>
        {tb.bottom.map((item, i) => (
          <View key={'b' + i} style={s.tbRow}>
            <View style={[s.rankDot, { backgroundColor: '#FEE2E2' }]}><Text style={{ ...font.micro, fontWeight: '900', color: '#DC2626' }}>{i + 1}</Text></View>
            <Text style={{ flex: 1, ...font.bodySmall, fontWeight: '600', color: colors.text.primary }}>{item.name}</Text>
            <Text style={{ width: 50, textAlign: 'right', ...font.caption, color: colors.text.muted }}>{item.qty} cái</Text>
            <Text style={{ width: 85, textAlign: 'right', ...font.bodySmall, fontWeight: '700', color: colors.text.primary }}>{formatVND(item.revenue)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderList = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />;
    if (tab === 'top') return <FlatList contentContainerStyle={{ padding: isWide ? 12 : 4, gap: 8, paddingBottom: 100 }} data={[]} keyExtractor={() => 'x'} ListHeaderComponent={renderTopBottom} renderItem={() => null} refreshing={loading} onRefresh={load} />;
    return (
      <FlatList
        data={allItems} keyExtractor={(row, i) => row.item.id || String(i)} renderItem={TableRow}
        contentContainerStyle={{ paddingHorizontal: isWide ? 12 : 4, paddingBottom: 100 }}
        refreshing={loading} onRefresh={load}
        ListEmptyComponent={<EmptyState icon="chart-bubble" title="Chưa có dữ liệu" />}
        ListHeaderComponent={
          <View style={s.thead}>
            <View style={{ width: 30 }} />
            <SortHeader label="Tên món" sortKey="name" w={1} />
            <SortHeader label="SL" sortKey="qty_sold" w={60} />
            <SortHeader label="Doanh thu" sortKey="revenue" w={85} />
            <SortHeader label="Biên" sortKey="margin_pct" w={55} />
          </View>
        }
      />
    );
  };

  const sm = matrix?.summary;
  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Menu Engineering" subtitle={`${days} ngày`} onMenuPress={openSidebar} />
      <View style={s.statsBar}>
        <StatItem icon="food" value={sm?.total_items || '-'} label="Món" />
        <View style={s.barDivider} />
        <StatItem icon="chart-line" value={sm?.avg_qty_sold || '-'} label="SL TB" />
        <View style={s.barDivider} />
        <StatItem icon="percent" value={sm ? `${sm.avg_margin_pct}%` : '-'} label="Biên TB" />
      </View>
      <View style={s.filterRow}>
        {['matrix', 'top'].map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t as any)}
            style={[s.chip, tab === t && { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary }]}>
            <Text style={[s.chipText, tab === t && { color: '#fff', fontWeight: '700' }]}>{t === 'matrix' ? 'BCG Matrix' : 'Top/Bottom'}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {[30, 60, 90].map(d => (
          <TouchableOpacity key={d} onPress={() => setDays(d)}
            style={[s.chip, days === d && { backgroundColor: colors.surface.disabled, borderColor: colors.brand.primary }]}>
            <Text style={[s.chipText, days === d && { color: colors.brand.primary, fontWeight: '700' }]}>{d}d</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>{renderList()}</View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, backgroundColor: colors.surface.app, paddingTop: 12 }}>{renderPanel()}</View>
        </View>
      ) : renderList()}

      <FormModal visible={!!selected} title={selected?.item?.name || ''} onClose={() => setSelected(null)} saveLabel="">
        {selected && (
          <View style={{ gap: 14, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {selected.item.id ? <View style={s.detailChip}><Icon name="barcode" size={12} color={colors.text.muted} /><Text style={s.detailChipText}>ID: {selected.item.id.slice(-8).toUpperCase()}</Text></View> : null}
              <View style={[s.detailChip, { backgroundColor: QUADRANT_META[selected.quadrant]?.bg }]}><Icon name={QUADRANT_META[selected.quadrant]?.icon as any} size={12} color={QUADRANT_META[selected.quadrant]?.color} /><Text style={[s.detailChipText, { color: QUADRANT_META[selected.quadrant]?.color }]}>{QUADRANT_META[selected.quadrant]?.label}</Text></View>
            </View>
            <View style={s.detailRow}>
              <View style={s.detailCell}><Text style={s.detailLabel}>Giá bán</Text><Text style={s.detailValue}>{formatVND(selected.item.price)}</Text></View>
              <View style={s.detailCell}><Text style={s.detailLabel}>Giá vốn</Text><Text style={s.detailValue}>{formatVND(selected.item.cost_price)}</Text></View>
              <View style={s.detailCell}><Text style={s.detailLabel}>Biên</Text><Text style={[s.detailValue, { color: selected.item.margin_pct >= 0 ? '#16A34A' : '#DC2626' }]}>{selected.item.margin_pct}%</Text></View>
            </View>
            <View style={s.detailRow}>
              <View style={s.detailCell}><Text style={s.detailLabel}>Đã bán</Text><Text style={s.detailValue}>{selected.item.qty_sold} cái</Text></View>
              <View style={s.detailCell}><Text style={s.detailLabel}>Doanh thu</Text><Text style={s.detailValue}>{formatVND(selected.item.revenue)}</Text></View>
            </View>
            {QUADRANT_META[selected.quadrant] && (
              <View style={{ backgroundColor: QUADRANT_META[selected.quadrant].bg, padding: 12, borderRadius: shape.radius.md, borderWidth: 1, borderColor: QUADRANT_META[selected.quadrant].color + '30' }}>
                <Text style={{ ...font.caption, color: QUADRANT_META[selected.quadrant].color }}>💡 {QUADRANT_META[selected.quadrant].suggestion}</Text>
              </View>
            )}
          </View>
        )}
      </FormModal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },
  statValue: { ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 },
  statLabel: { ...font.micro, color: colors.text.muted, lineHeight: 12 },

  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled, borderWidth: 1, borderColor: colors.border.default },
  chipText: { ...font.badge, color: colors.text.muted },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 16, marginHorizontal: 12, borderWidth: 1, borderColor: colors.border.light, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary },
  panelStatValue: { ...font.h1, fontWeight: '900', color: colors.text.primary },
  panelStatLabel: { ...font.caption, color: colors.text.muted, marginTop: 2 },

  thead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 2, borderBottomColor: colors.border.default, marginBottom: 4 },
  thText: { ...font.caption, fontWeight: '700', color: colors.text.muted },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  td: { ...font.bodySmall, color: colors.text.primary },
  quadrantDot: { width: 10, height: 10, borderRadius: 5 },

  rankDot: { width: 22, height: 22, borderRadius: shape.radius.sm, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary },
  tbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, borderWidth: 1, borderColor: colors.border.light },

  detailRow: { flexDirection: 'row', gap: 12 },
  detailCell: { flex: 1, backgroundColor: colors.surface.app, borderRadius: shape.radius.md, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border.light },
  detailLabel: { ...font.micro, color: colors.text.muted, marginBottom: 4 },
  detailValue: { ...font.h4, fontWeight: '900', color: colors.text.primary },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled },
  detailChipText: { ...font.micro, color: colors.text.muted },

  separator: { width: 1, backgroundColor: colors.border.light },
});
