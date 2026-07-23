import { useCallback, useEffect, useMemo, useState } from 'react';
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

const API = '/api/v1/quan-ly';



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
        style={[s.card, isSelected && { borderColor: '#F97316' }]}
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
            <Text style={{ ...font.sm, fontWeight: '600', color: profit >= 0 ? '#16A34A' : '#DC2626' }}>
              LN: {formatVND(profit)} ({profitPct}%)
            </Text>
          </View>
        )}

        {/* Always-visible action icons */}
        <View style={s.actionCapsule}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={s.actionIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="pencil-outline" size={16} color={'#737373'} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => handleClone(item)} style={s.actionIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="content-copy" size={16} color={'#737373'} />
          </TouchableOpacity>
          <View style={s.actionDot} />
          <TouchableOpacity onPress={() => deleteRecipe(item.id || item.product_id)} style={s.actionIcon} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="delete-outline" size={16} color={'#737373'} />
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
          <Icon name="information-outline" size={18} color={'#F97316'} />
          <Text style={s.panelHeaderText}>{selectedRecipe.recipe_name || selectedRecipe.name}</Text>
        </View>

        <View style={{ gap: 12}}>
          <DetailRow label="Sản phẩm" value={selectedRecipe.product_name || '—'} />
          <DetailRow label="Giá bán" value={selectedRecipe.product_price ? formatVND(selectedRecipe.product_price) : '—'} />
          <DetailRow label="Giá vốn" value={formatVND(selectedRecipe.cost_price)} />
          <DetailRow label="Food cost" value={<Text style={{ ...font.sm, fontWeight: '600', color: cc.text }}>{pct}%</Text>} />
          {profit !== null && <DetailRow label="Lợi nhuận" value={<Text style={{ ...font.sm, fontWeight: '600', color: profit >= 0 ? '#16A34A' : '#DC2626' }}>{formatVND(profit)}</Text>} />}
          <DetailRow label="Số NL" value={`${selectedRecipe.ingredient_count || 0} nguyên liệu`} />
        </View>

        {/* Ingredients */}
        {selectedRecipe.items?.length > 0 && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 8, marginTop: 4 }}>
            <Text style={{ ...font.smBold, color: '#404040', marginBottom: 4 }}>Nguyên liệu</Text>
            {selectedRecipe.items.map((it: any, i: number) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                <Text style={{ ...font.sm, color: '#171717', flex: 1 }} numberOfLines={1}>{it.raw_material_name || it.raw_material_id?.slice(0, 8)}</Text>
                <Text style={{ ...font.sm, color: '#737373' }}>{it.quantity} {it.unit} · {formatVND(it.cost)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          <TouchableOpacity onPress={() => handleEdit(selectedRecipe)} style={[s.panelBtn, { backgroundColor: '#F97316' }]}>
            <Icon name="pencil-outline" size={14} color="#fff" />
            <Text style={{ ...font.sm, color: '#fff', fontWeight: '600' }}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleClone(selectedRecipe)} style={[s.panelBtn, { backgroundColor: '#F5F5F5' }]}>
            <Icon name="content-copy" size={14} color={'#171717'} />
            <Text style={{ ...font.sm, color: '#171717', fontWeight: '600' }}>Nhân bản</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteRecipe(selectedRecipe.id || selectedRecipe.product_id)} style={[s.panelBtn, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete-outline" size={14} color={'#DC2626'} />
            <Text style={{ ...font.sm, color: '#DC2626', fontWeight: '600' }}>Xoá</Text>
          </TouchableOpacity>
        </View>

        {/* Versions */}
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}
          onPress={() => { setVersionsOpen(!versionsOpen); if (!versionsOpen) fetchVersions(selectedRecipe.id || selectedRecipe.product_id); }}>
          <Icon name="history" size={16} color={'#737373'} />
          <Text style={{ ...font.smBold, color: '#404040', flex: 1 }}>Lịch sử</Text>
          <Icon name={versionsOpen ? 'chevron-up' : 'chevron-down'} size={16} color={'#737373'} />
        </TouchableOpacity>
        {versionsOpen && (
          versions.length > 0 ? versions.map((v: any) => (
            <View key={v.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
              <Text style={{ ...font.sm, fontWeight: '600', color: '#171717' }}>v{v.version_number}</Text>
              <Text style={{ ...font.sm, color: '#737373' }}>{formatVND(v.cost_price)}</Text>
              <Text style={{ ...font.sm, color: '#737373' }}>
                {v.created_at ? new Date(v.created_at).toLocaleDateString('vi-VN') : ''}
              </Text>
            </View>
          )) : (
            <Text style={{ ...font.sm, color: '#737373', fontStyle: 'italic' }}>Chưa có lịch sử</Text>
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
        <Icon name="magnify" size={16} color={'#737373'} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Tìm công thức..."
          placeholderTextColor={'#737373'}
          style={{ flex: 1, ...font.sm, color: '#171717', paddingVertical: 0 }} />
        {search !== '' && (
          <TouchableOpacity onPress={() => setSearch('')}><Icon name="close-circle" size={16} color={'#737373'} /></TouchableOpacity>
        )}
      </View>

      {/* Chips row */}
      {!isWide && (
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8}}>
          <Icon name="filter-variant" size={16} color={'#737373'} />
          <Text style={{ ...font.sm, color: '#737373' }}>
            {showFilters ? 'Ẩn filter' : `Filter/Sort`}
          </Text>
        </TouchableOpacity>
      )}
      {(isWide || showFilters) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: isWide ? 4 : 0 }}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f.key} onPress={() => setFilterKey(f.key)}
                style={[s.chip, filterKey === f.key && s.chipActive]}>
                <Text style={[s.chipText, filterKey === f.key && s.chipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ width: 1, backgroundColor: '#F0F0F0', marginHorizontal: 2 }} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {SORTS.map(sort => (
              <TouchableOpacity key={sort.key} onPress={() => setSortKey(sort.key)}
                style={[s.chip, sortKey === sort.key && s.chipActive]}>
                <Text style={[s.chipText, sortKey === sort.key && s.chipTextActive]}>{sort.label}</Text>
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
      contentContainerStyle={{ padding: 4, gap: 16}}
      columnWrapperStyle={numCols > 1 ? { gap: 16, marginBottom: 8 } : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={'#F97316'} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', padding: 40, gap: 12}}>
          <Icon name="food-off" size={48} color={'#737373'} />
          <Text style={{ ...font.md, color: '#737373' }}>Không có công thức</Text>
        </View>
      }
    />
  );

  return (
    <ScreenContainer compact>
      <ScreenHeader
        title="Công thức"
        subtitle={`${recipes.length} công thức · Quản lý giá thành`}
        onMenuPress={openSidebar} compact
        right={
          <View style={{ flexDirection: 'row', gap: 12}}>
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
              <TableSkeleton rowCount={5} />
            ) : renderGrid()}
          </View>
          <View style={s.separator} />
          <View style={{ flex: 0.4, paddingTop: 8, paddingLeft: 8, paddingRight: 12 }}>
            {selectedRecipe ? renderDetailPanel() : (
              <View style={{ alignItems: 'center', padding: 40, gap: 16}}>
                <Icon name="hand-pointing-up" size={36} color={'#737373'} />
                <Text style={{ ...font.md, color: '#737373' }}>Chọn công thức để xem chi tiết</Text>
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
    <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
      <Icon name={icon as any} size={16} color={'#F97316'} />
      <View>
        <Text style={{ ...font.mdBold, fontWeight: '600', color: '#171717', lineHeight: 18 }}>{value}</Text>
        <Text style={{ ...font.sm, color: '#737373', lineHeight: 12 }}>{label}</Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ ...font.sm, color: '#404040' }}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number'
        ? <Text style={{ ...font.sm, fontWeight: '600', color: '#171717' }}>{value}</Text>
        : value}
    </View>
  );
}

// ── Styles ──
const s = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  cardName: { ...font.sm, fontWeight: '600', color: '#171717', flex: 1 },
  cardProduct: { ...font.sm, color: '#737373', marginTop: 1 },
  badge: { paddingHorizontal: 16, paddingVertical: 3, borderRadius: 999},
  badgeText: { ...font.sm, fontWeight: '600' },
  cardStats: { flexDirection: 'row', gap: 32, paddingTop: 6, marginTop: 4 },
  cardStat: { ...font.sm, color: '#737373', fontWeight: '500' },
  profitRow: { marginTop: 2 },

  // Action capsule — always visible
  actionCapsule: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionIcon: { padding: 4 },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#E5E5E5' },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 38, borderRadius: 8, backgroundColor: '#F97316' },
  addBtnText: { ...font.smBold, fontWeight: '600', color: '#fff' },
  headerBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },

  // Stats bar
  statsBar: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  barDivider: { width: 1, backgroundColor: '#F0F0F0', marginVertical: 2 },

  // Filters
  filterBar: { paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FAFAFA', gap: 12},
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 32, height: 36, borderWidth: 1, borderColor: '#F0F0F0' },
  chip: { paddingHorizontal: 32, paddingVertical: 5, borderRadius: 999, backgroundColor: '#F5F5F5' },
  chipActive: { backgroundColor: '#F97316' },
  chipText: { ...font.sm, fontWeight: '600', color: '#737373' },
  chipTextActive: { color: colors.text.inverse },

  // Right panel (iPad)
  panelBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0', gap: 16},
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  panelHeaderText: { ...font.md, fontWeight: '600', color: '#171717', flex: 1 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 8},

  separator: { width: 1, backgroundColor: '#F0F0F0' },
});

