import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, TextInput,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font, formatVND } from '../../lib/theme';
import { shape } from '../../lib/theme/shape';
import { useResponsive, calcGridCols } from '../../lib/hooks/useResponsive';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import ScreenContainer from '../../lib/components/ui/ScreenContainer';
import RecipeForm from '../../lib/components/recipes/RecipeForm';
import AppText from '../../lib/components/ui/AppText';

const API = '/api/v1/quan-ly';

function foodCostColor(pct: number) {
  if (pct < 30) return { bg: colors.brand.primaryBg, text: colors.status.success };
  if (pct <= 45) return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: colors.status.dangerBg, text: colors.status.danger };
}

type SortKey = 'name_asc' | 'name_desc' | 'cost_asc' | 'cost_desc';
type FilterKey = 'all' | 'low' | 'mid' | 'high';

export default function RecipesScreen() {
  const { openSidebar } = useSidebar();
  const { isWide, containerWidth, gutter, hPad } = useResponsive();
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
        request<{ items: any[] }>(API + '/recipes'),
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
        request<{ items: any[] }>(API + '/recipes'),
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
      } },
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
        style={[s.card, isSelected && { backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}
      >
        <View style={s.cardHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary} numberOfLines={1}>
              {item.recipe_name || item.name}
            </AppText>
            <AppText variant="sm" color={colors.text.secondary} numberOfLines={1}>
              {item.product_name || '—'}
            </AppText>
          </View>
          <View style={[s.badge, { backgroundColor: cc.bg }]}>
            <AppText variant="sm" weight="bold" color={cc.text}>{pct}%</AppText>
          </View>
        </View>

        <View style={s.cardStats}>
          <AppText variant="sm" color={colors.text.secondary}>💵 {formatVND(item.cost_price)}</AppText>
          <AppText variant="sm" color={colors.text.secondary}>📦 {item.ingredient_count || 0}</AppText>
          {item.product_price > 0 && (
            <AppText variant="sm" color={colors.text.secondary}>🏷️ {formatVND(item.product_price)}</AppText>
          )}
        </View>

        {profit !== null && (
          <View style={s.profitRow}>
            <AppText variant="sm" color={profit >= 0 ? colors.status.success : colors.status.danger}>
              LN: {formatVND(profit)} ({profitPct}%)
            </AppText>
          </View>
        )}

        {/* Action Capsule */}
        <View style={s.actionCapsule}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={s.actionIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="pencil-outline" size={16} color={colors.icon.muted} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => handleClone(item)} style={s.actionIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="content-copy" size={16} color={colors.icon.muted} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => deleteRecipe(item.id || item.product_id)} style={s.actionIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="delete-outline" size={16} color={colors.status.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Recipe Detail Panel (iPad) ──
  const renderDetailPanel = () => {
    if (!selectedRecipe) return null;
    const pct = selectedRecipe.food_cost_pct ?? 0;
    const cc = foodCostColor(pct);
    const profit = selectedRecipe.product_price ? selectedRecipe.product_price - selectedRecipe.cost_price : null;

    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <Icon name="information-outline" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ flex: 1 }}>
            {selectedRecipe.recipe_name || selectedRecipe.name}
          </AppText>
        </View>

        <View style={{ gap: 10 }}>
          <DetailRow label="Sản phẩm" value={selectedRecipe.product_name || '—'} />
          <DetailRow label="Giá bán" value={selectedRecipe.product_price ? formatVND(selectedRecipe.product_price) : '—'} />
          <DetailRow label="Giá vốn BOM" value={formatVND(selectedRecipe.cost_price)} />
          <DetailRow label="Food Cost %" value={<AppText variant="sm" weight="bold" color={cc.text}>{pct}%</AppText>} />
          {profit !== null && <DetailRow label="Lợi nhuận" value={<AppText variant="sm" weight="bold" color={profit >= 0 ? colors.status.success : colors.status.danger}>{formatVND(profit)}</AppText>} />}
          <DetailRow label="Số nguyên liệu" value={`${selectedRecipe.ingredient_count || 0} nguyên liệu`} />
        </View>

        {/* Ingredients */}
        {selectedRecipe.items?.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 10, marginTop: 4 }}>
            <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 6 }}>Nguyên liệu thành phần</AppText>
            {selectedRecipe.items.map((it: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <AppText variant="sm" color={colors.text.primary} style={{ flex: 1 }} numberOfLines={1}>{it.raw_material_name || it.raw_material_id?.slice(0, 8)}</AppText>
                <AppText variant="sm" color={colors.text.secondary}>{it.quantity} {it.unit} · {formatVND(it.cost)}</AppText>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <TouchableOpacity onPress={() => handleEdit(selectedRecipe)} style={[s.panelBtn, { backgroundColor: colors.brand.primary }]}>
            <Icon name="pencil-outline" size={14} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleClone(selectedRecipe)} style={[s.panelBtn, { backgroundColor: colors.surface.app }]}>
            <Icon name="content-copy" size={14} color={colors.text.primary} />
            <AppText variant="sm" color={colors.text.primary}>Nhân bản</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteRecipe(selectedRecipe.id || selectedRecipe.product_id)} style={[s.panelBtn, { backgroundColor: colors.status.dangerBg }]}>
            <Icon name="delete-outline" size={14} color={colors.status.danger} />
            <AppText variant="sm" weight="bold" color={colors.status.danger}>Xoá</AppText>
          </TouchableOpacity>
        </View>

        {/* Versions */}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}
          onPress={() => { setVersionsOpen(!versionsOpen); if (!versionsOpen) fetchVersions(selectedRecipe.id || selectedRecipe.product_id); }}
        >
          <Icon name="history" size={16} color={colors.icon.muted} />
          <AppText variant="sm" weight="bold" color={colors.text.secondary} style={{ flex: 1 }}>Lịch sử phiên bản</AppText>
          <Icon name={versionsOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.icon.muted} />
        </TouchableOpacity>

        {versionsOpen && (
          versions.length > 0 ? versions.map((v: any) => (
            <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <AppText variant="sm" weight="bold" color={colors.text.primary}>v{v.version_number}</AppText>
              <AppText variant="sm" color={colors.text.secondary}>{formatVND(v.cost_price)}</AppText>
              <AppText variant="sm" color={colors.text.muted}>
                {v.created_at ? new Date(v.created_at).toLocaleDateString('vi-VN') : ''}
              </AppText>
            </View>
          )) : (
            <AppText variant="sm" color={colors.text.muted} style={{ fontStyle: 'italic' }}>Chưa có lịch sử phiên bản</AppText>
          )
        )}
      </View>
    );
  };

  // ── Filters Bar ──
  const renderFilters = () => (
    <View style={s.filterBar}>
      {/* Search */}
      <View style={s.searchBox}>
        <Icon name="magnify" size={16} color={colors.icon.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm công thức BOM theo tên..."
          placeholderTextColor={colors.text.muted}
          style={{ flex: 1, ...font.sm, color: colors.text.primary, paddingVertical: 0 }}
        />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={16} color={colors.icon.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Chips row */}
      {!isWide && (
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
          <Icon name="filter-variant" size={16} color={colors.icon.muted} />
          <AppText variant="sm" color={colors.text.secondary}>
            {showFilters ? 'Ẩn bộ lọc' : 'Lọc & Sắp xếp'}
          </AppText>
        </TouchableOpacity>
      )}

      {(isWide || showFilters) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: isWide ? 4 : 0 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilterKey(f.key)}
                style={[s.chip, filterKey === f.key && s.chipActive]}
              >
                <AppText variant="sm" color={filterKey === f.key ? colors.brand.primary : colors.text.secondary}>
                  {f.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ width: 1, backgroundColor: colors.border.light, marginHorizontal: 2 }} />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {SORTS.map(sort => (
              <TouchableOpacity
                key={sort.key}
                onPress={() => setSortKey(sort.key)}
                style={[s.chip, sortKey === sort.key && s.chipActive]}
              >
                <AppText variant="sm" color={sortKey === sort.key ? colors.brand.primary : colors.text.secondary}>
                  {sort.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderGrid = () => (
    <FlatList
      data={processed}
      keyExtractor={(item, i) => item.id || item.product_id || String(i)}
      key={`cols-${numCols}`}
      numColumns={numCols}
      renderItem={({ item }) => renderCard(item as any)}
      contentContainerStyle={{ padding: 4, gap: 10 }}
      columnWrapperStyle={numCols > 1 ? { gap: 10, marginBottom: 8 } : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
          <Icon name="food-off" size={40} color={colors.icon.muted} />
          <AppText variant="sm" color={colors.text.muted}>Không tìm thấy công thức nào</AppText>
        </View>
      }
    />
  );

  return (
    <ScreenContainer compact>
      <ScreenHeader
        title="Công thức BOM"
        subtitle={`${recipes.length} công thức · Định lượng & Food cost`}
        onMenuPress={openSidebar}
        compact
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={load} style={s.headerBtn}>
              <Icon name="refresh" size={18} color={colors.brand.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAdd} style={s.addBtn}>
              <Icon name="plus" size={18} color={colors.text.inverse} />
              {isWide && <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm công thức</AppText>}
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
              <TableSkeleton rowCount={5} />
            ) : renderGrid()}
          </View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, paddingTop: 8, paddingLeft: 8, paddingRight: 12 }}>
            {selectedRecipe ? renderDetailPanel() : (
              <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
                <Icon name="hand-pointing-up" size={32} color={colors.icon.muted} />
                <AppText variant="sm" color={colors.text.muted}>Chọn một công thức để xem chi tiết</AppText>
              </View>
            )}
          </View>
        </View>
      ) : (
        loading ? (
          <TableSkeleton rowCount={5} />
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
    </ScreenContainer>
  );
}

// ── Sub-components ──
function StatItem({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      <Icon name={icon as any} size={16} color={colors.brand.primary} />
      <View>
        <AppText variant="sm" weight="bold" color={colors.text.primary}>{value}</AppText>
        <AppText variant="sm" color={colors.text.muted}>{label}</AppText>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText variant="sm" color={colors.text.secondary}>{label}</AppText>
      {typeof value === 'string' || typeof value === 'number'
        ? <AppText variant="sm" weight="bold" color={colors.text.primary}>{value}</AppText>
        : value}
    </View>
  );
}

// ── Styles ──
const s = StyleSheet.create({
  card: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: shape.radius.sm },
  cardStats: { flexDirection: 'row', gap: 16, paddingTop: 4, marginTop: 4 },
  profitRow: { marginTop: 4 },

  actionCapsule: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border.light },
  actionIcon: { padding: 4 },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border.light },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.brand.primary },
  headerBtn: { width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.brand.primaryBg, alignItems: 'center', justifyContent: 'center' },

  // Stats bar
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, marginVertical: 8 },
  barDivider: { width: 1, backgroundColor: colors.border.light, marginVertical: 2 },

  // Filters
  filterBar: { paddingHorizontal: 4, paddingVertical: 8, gap: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, paddingHorizontal: 10, height: 38 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: shape.radius.sm, backgroundColor: colors.surface.card },
  chipActive: { backgroundColor: colors.brand.primaryBg },

  // Right panel (iPad)
  panelBox: { backgroundColor: colors.surface.card, borderRadius: shape.radius.lg, padding: 14, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: shape.radius.md },

  separator: { width: 1, backgroundColor: colors.border.light },
});
