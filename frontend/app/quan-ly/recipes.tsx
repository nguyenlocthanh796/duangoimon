"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useResponsive, calcGridCols } from '../../lib/hooks/useResponsive';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import RecipeForm from '../../lib/components/recipes/RecipeForm';

const API = '/api/v1/quan-ly';

function formatVND(v: number) { return v.toLocaleString('vi-VN') + 'đ'; }

function foodCostColor(pct: number) {
  if (pct < 30) return { bg: '#F3F4F6', text: '#16A34A' };
  if (pct <= 45) return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#FEE2E2', text: '#DC2626' };
}

type SortKey = 'name_asc' | 'name_desc' | 'cost_asc' | 'cost_desc';
type FilterKey = 'all' | 'low' | 'mid' | 'high';

export default function RecipesScreen() {
  const { openSidebar } = useSidebar();
  const { isWide, width, containerWidth, gutter, hPad } = useResponsive();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [editRecipe, setEditRecipe] = useState<any>(null);
  const [cloneRecipe, setCloneRecipe] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(!isWide);
  const [sortKey, setSortKey] = useState<SortKey>('name_asc');
  const [filterKey, setFilterKey] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [r, m] = await Promise.all([
        request<any[]>(API + '/recipes'),
        request<any[]>(API + '/raw-materials'),
      ]);
      setRecipes(Array.isArray(r) ? r : r?.items || []);
      setMaterials(m);
    } catch (e) { console.error('Failed to load recipes', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [r, m] = await Promise.all([
        request<any[]>(API + '/recipes'),
        request<any[]>(API + '/raw-materials'),
      ]);
      setRecipes(Array.isArray(r) ? r : r?.items || []);
      setMaterials(m);
    } catch { } finally { setRefreshing(false); }
  }, []);

  const fetchVersions = async (recipeId: string) => {
    try {
      const data = await request<any[]>(API + `/recipes/${recipeId}/versions`);
      setVersions(Array.isArray(data) ? data : []);
    } catch { setVersions([]); }
  };

  // Filter, sort, search
  const processed = useMemo(() => {
    let list = [...recipes];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => (r.name || r.recipe_name || '').toLowerCase().includes(q));
    }
    if (filterKey === 'low') list = list.filter(r => (r.food_cost_pct ?? 0) < 30);
    else if (filterKey === 'mid') list = list.filter(r => { const p = r.food_cost_pct ?? 0; return p >= 30 && p <= 45; });
    else if (filterKey === 'high') list = list.filter(r => (r.food_cost_pct ?? 0) > 45);
    list.sort((a, b) => {
      if (sortKey === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      if (sortKey === 'cost_asc') return (a.food_cost_pct ?? 0) - (b.food_cost_pct ?? 0);
      return (b.food_cost_pct ?? 0) - (a.food_cost_pct ?? 0);
    });
    return list;
  }, [recipes, sortKey, filterKey, search]);

  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId) return null;
    return recipes.find(r => r.id === selectedRecipeId || r.product_id === selectedRecipeId);
  }, [recipes, selectedRecipeId]);

  const deleteRecipe = (id: string) => {
    Alert.alert('Xác nhận', 'Xoá công thức này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        await request(API + `/recipes/${id}`, { method: 'DELETE' });
        setSelectedRecipeId(null);
        load();
      }},
    ]);
  };

  const handleClone = (item: any) => { setCloneRecipe(item); setEditRecipe(null); setShowForm(true); };
  const handleEdit = (item: any) => { setEditRecipe(item); setCloneRecipe(null); setShowForm(true); };
  const handleAdd = () => { setEditRecipe(null); setCloneRecipe(null); setShowForm(true); };

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'low', label: '<30%' },
    { key: 'mid', label: '30-45%' },
    { key: 'high', label: '>45%' },
  ];
  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'name_asc', label: 'A-Z' },
    { key: 'name_desc', label: 'Z-A' },
    { key: 'cost_asc', label: 'CP ↑' },
    { key: 'cost_desc', label: 'CP ↓' },
  ];

  const numCols = useMemo(() => {
    if (!isWide) return 1;
    return calcGridCols(containerWidth, 260, hPad, gutter);
  }, [isWide, containerWidth, hPad, gutter]);

  // ── Card ──
  const renderCard = (item: any) => {
    const pct = item.food_cost_pct ?? 0;
    const cc = foodCostColor(pct);
    const profit = item.product_price ? item.product_price - item.cost_price : null;
    const profitPct = profit && item.product_price ? Math.round((profit / item.product_price) * 100) : null;
    const isSelected = selectedRecipeId === item.id;

    return (
      <TouchableOpacity
        onPress={() => setSelectedRecipeId(isSelected ? null : item.id)}
        style={[s.card, isSelected && { borderColor: colors.brand.primary }]}
        activeOpacity={0.7}
      >
        <View style={s.cardHeader}>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={s.cardName} numberOfLines={1}>{item.recipe_name || item.name}</Text>
            <Text style={s.cardProduct} numberOfLines={1}>{item.product_name || '—'}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: cc.bg }]}>
            <Text style={[s.badgeText, { color: cc.text }]}>{pct}%</Text>
          </View>
        </View>

        <View style={s.cardStats}>
          <Text style={s.cardStat}>💵 {formatVND(item.cost_price)}</Text>
          <Text style={s.cardStat}>📦 {item.ingredient_count || 0}</Text>
          {item.product_price > 0 && (
            <Text style={s.cardStat}>🏷️ {formatVND(item.product_price)}</Text>
          )}
        </View>

        {profit !== null && (
          <View style={s.profitRow}>
            <Text style={{ ...font.micro, fontWeight: '600', color: profit >= 0 ? '#16A34A' : colors.status.danger }}>
              LN: {formatVND(profit)} ({profitPct}%)
            </Text>
          </View>
        )}

        {/* Always-visible action icons */}
        <View style={s.actionCapsule}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={s.actionIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="pencil-outline" size={16} color={colors.text.muted} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => handleClone(item)} style={s.actionIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="content-copy" size={16} color={colors.text.muted} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => deleteRecipe(item.id || item.product_id)} style={s.actionIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="delete-outline" size={16} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Recipe Detail panel (iPad) ──
  const renderDetailPanel = () => {
    if (!selectedRecipe) return null;
    const pct = selectedRecipe.food_cost_pct ?? 0;
    const cc = foodCostColor(pct);
    const profit = selectedRecipe.product_price ? selectedRecipe.product_price - selectedRecipe.cost_price : null;

    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <Icon name="information-outline" size={18} color={colors.brand.primary} />
          <Text style={s.panelHeaderText}>{selectedRecipe.recipe_name || selectedRecipe.name}</Text>
        </View>

        <View style={{ gap: 6 }}>
          <DetailRow label="Sản phẩm" value={selectedRecipe.product_name || '—'} />
          <DetailRow label="Giá bán" value={selectedRecipe.product_price ? formatVND(selectedRecipe.product_price) : '—'} />
          <DetailRow label="Giá vốn" value={formatVND(selectedRecipe.cost_price)} />
          <DetailRow label="Food cost" value={<Text style={{ ...font.caption, fontWeight: '700', color: cc.text }}>{pct}%</Text>} />
          {profit !== null && <DetailRow label="Lợi nhuận" value={<Text style={{ ...font.caption, fontWeight: '700', color: profit >= 0 ? '#16A34A' : colors.status.danger }}>{formatVND(profit)}</Text>} />}
          <DetailRow label="Số NL" value={`${selectedRecipe.ingredient_count || 0} nguyên liệu`} />
        </View>

        {/* Ingredients */}
        {selectedRecipe.items?.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 8, marginTop: 4 }}>
            <Text style={{ ...font.label, color: colors.text.secondary, marginBottom: 4 }}>Nguyên liệu</Text>
            {selectedRecipe.items.map((it: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text style={{ ...font.caption, color: colors.text.primary, flex: 1 }} numberOfLines={1}>{it.raw_material_name || it.raw_material_id?.slice(0, 8)}</Text>
                <Text style={{ ...font.caption, color: colors.text.muted }}>{it.quantity} {it.unit} · {formatVND(it.cost)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity onPress={() => handleEdit(selectedRecipe)} style={[s.panelBtn, { backgroundColor: colors.brand.primary }]}>
            <Icon name="pencil-outline" size={14} color="#fff" />
            <Text style={{ ...font.caption, color: '#fff', fontWeight: '700' }}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleClone(selectedRecipe)} style={[s.panelBtn, { backgroundColor: colors.surface.disabled }]}>
            <Icon name="content-copy" size={14} color={colors.text.primary} />
            <Text style={{ ...font.caption, color: colors.text.primary, fontWeight: '600' }}>Nhân bản</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteRecipe(selectedRecipe.id || selectedRecipe.product_id)} style={[s.panelBtn, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete-outline" size={14} color={colors.status.danger} />
            <Text style={{ ...font.caption, color: colors.status.danger, fontWeight: '600' }}>Xoá</Text>
          </TouchableOpacity>
        </View>

        {/* Versions */}
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}
          onPress={() => { setVersionsOpen(!versionsOpen); if (!versionsOpen) fetchVersions(selectedRecipe.id || selectedRecipe.product_id); }}>
          <Icon name="history" size={16} color={colors.text.muted} />
          <Text style={{ ...font.label, color: colors.text.secondary, flex: 1 }}>Lịch sử</Text>
          <Icon name={versionsOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.muted} />
        </TouchableOpacity>
        {versionsOpen && (
          versions.length > 0 ? versions.map((v: any) => (
            <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
              <Text style={{ ...font.caption, fontWeight: '600', color: colors.text.primary }}>v{v.version_number}</Text>
              <Text style={{ ...font.caption, color: colors.text.muted }}>{formatVND(v.cost_price)}</Text>
              <Text style={{ ...font.micro, color: colors.text.muted }}>
                {v.created_at ? new Date(v.created_at).toLocaleDateString('vi-VN') : ''}
              </Text>
            </View>
          )) : (
            <Text style={{ ...font.caption, color: colors.text.muted, fontStyle: 'italic' }}>Chưa có lịch sử</Text>
          )
        )}
      </View>
    );
  };

  // ── Filters bar ──
  const renderFilters = () => (
    <View style={s.filterBar}>
      {/* Search */}
      <View style={s.searchBox}>
        <Icon name="magnify" size={16} color={colors.text.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Tìm công thức..."
          placeholderTextColor={colors.text.muted}
          style={{ flex: 1, ...font.caption, color: colors.text.primary, paddingVertical: 0 }} />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={16} color={colors.text.muted} /></TouchableOpacity>
        )}
      </View>

      {/* Chips row */}
      {!isWide && (
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
          <Icon name="filter-variant" size={16} color={colors.text.muted} />
          <Text style={{ ...font.micro, color: colors.text.muted }}>
            {showFilters ? 'Ẩn filter' : `Filter/Sort`}
          </Text>
        </TouchableOpacity>
      )}
      {(isWide || showFilters) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: isWide ? 4 : 0 }}>
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f.key} onPress={() => setFilterKey(f.key)}
                style={[s.chip, filterKey === f.key && s.chipActive]}>
                <Text style={[s.chipText, filterKey === f.key && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ width: 1, backgroundColor: colors.border.light, marginHorizontal: 2 }} />
          <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
            {SORTS.map(s => (
              <TouchableOpacity key={s.key} onPress={() => setSortKey(s.key)}
                style={[s.chip, sortKey === s.key && s.chipActive]}>
                <Text style={[s.chipText, sortKey === s.key && s.chipTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderGrid = () => (
    <FlatList
      data={processed} keyExtractor={(item, i) => item.id || item.product_id || String(i)}
      key={`cols-${numCols}`}
      numColumns={numCols}
      renderItem={({ item }) => renderCard(item as any)}
      contentContainerStyle={{ padding: 4, gap: 8 }}
      columnWrapperStyle={numCols > 1 ? { gap: 8, marginBottom: 8 } : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
          <Icon name="food-off" size={48} color={colors.text.muted} />
          <Text style={{ ...font.body, color: colors.text.muted }}>Không có công thức</Text>
        </View>
      }
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <ScreenHeader
        title="Công thức"
        subtitle={`${recipes.length} công thức · Quản lý giá thành`}
        onMenuPress={openSidebar}
        right={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity onPress={load} style={s.headerBtn}>
              <Icon name="refresh" size={18} color={colors.icon.default} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAdd} style={s.addBtn}>
              <Icon name="plus" size={18} color={colors.text.inverse} />
              {isWide && <Text style={s.addBtnText}>Thêm</Text>}
            </TouchableOpacity>
          </View>
        }
      />

      {/* Stats bar */}
      <View style={s.statsBar}>
        <StatItem icon="food-variant" label="Công thức" value={recipes.length} />
        <View style={s.barDivider} />
        <StatItem icon="basket-outline" label="Nguyên liệu" value={materials.length} />
        <View style={s.barDivider} />
        <StatItem icon="percent" label="CP TB" value={processed.length ? `${Math.round(processed.reduce((s, r) => s + (r.food_cost_pct || 0), 0) / processed.length)}%` : '—'} />
      </View>

      {renderFilters()}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 0.6 }}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />
            ) : renderGrid()}
          </View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, paddingTop: 8, paddingLeft: 8, paddingRight: 12 }}>
            {selectedRecipe ? renderDetailPanel() : (
              <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
                <Icon name="hand-pointing-up" size={36} color={colors.text.muted} />
                <Text style={{ ...font.body, color: colors.text.muted }}>Chọn công thức để xem chi tiết</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        loading ? (
          <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />
        ) : renderGrid()
      )}

      <RecipeForm
        visible={showForm}
        materials={materials}
        editRecipe={editRecipe}
        cloneFrom={cloneRecipe}
        onClose={() => { setShowForm(false); setEditRecipe(null); setCloneRecipe(null); }}
        onSaved={() => { setShowForm(false); setEditRecipe(null); setCloneRecipe(null); load(); }}
      />
    </SafeAreaView>
  );
}

// ── Sub-components ──
function StatItem({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      <Icon name={icon as any} size={16} color={colors.brand.primary} />
      <View>
        <Text style={{ ...font.h4, fontWeight: '900', color: colors.text.primary, lineHeight: 18 }}>{value}</Text>
        <Text style={{ ...font.micro, color: colors.text.muted, lineHeight: 12 }}>{label}</Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ ...font.caption, color: colors.text.secondary }}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number'
        ? <Text style={{ ...font.caption, fontWeight: '600', color: colors.text.primary }}>{value}</Text>
        : value}
    </View>
  );
}

// ── Styles ──
const s = StyleSheet.create({
  card: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12, borderWidth: 1, borderColor: colors.border.light },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  cardName: { ...font.bodySmall, fontWeight: '700', color: colors.text.primary, flex: 1 },
  cardProduct: { ...font.micro, color: colors.text.muted, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: shape.radius.full },
  badgeText: { ...font.micro, fontWeight: '700' },
  cardStats: { flexDirection: 'row', gap: 10, paddingTop: 6, marginTop: 4 },
  cardStat: { ...font.micro, color: colors.text.muted, fontWeight: '500' },
  profitRow: { marginTop: 2 },

  // Action capsule — always visible
  actionCapsule: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border.light },
  actionIcon: { padding: 4 },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border.default },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  addBtnText: { ...font.buttonSmall, fontWeight: '700', color: '#fff' },
  headerBtn: { width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' },

  // Stats bar
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },

  // Filters
  filterBar: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface.app, gap: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, paddingHorizontal: 10, height: 36, borderWidth: 1, borderColor: colors.border.light },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: shape.radius.full, backgroundColor: colors.surface.disabled },
  chipActive: { backgroundColor: colors.brand.primary },
  chipText: { ...font.micro, fontWeight: '600', color: colors.text.muted },
  chipTextActive: { color: colors.text.inverse },

  // Right panel (iPad)
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border.light, gap: 8 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelHeaderText: { ...font.body, fontWeight: '700', color: colors.text.primary, flex: 1 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: shape.radius.md },

  separator: { width: 1, backgroundColor: colors.border.light },
});
