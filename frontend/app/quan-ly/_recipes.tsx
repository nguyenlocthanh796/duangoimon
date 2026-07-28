import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import SearchBar from '../../lib/components/ui/SearchBar';
import EmptyState from '../../lib/components/ui/EmptyState';
import RecipeForm from '../../lib/components/recipes/RecipeForm';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import DetailModal from '../../lib/components/ui/DetailModal';
import { request } from '../../lib/api/client';

function foodCostColor(pct: number) {
  if (pct <= 30) return { bg: '#ECFDF5', text: colors.status.success };
  if (pct <= 35) return { bg: '#FEF3C7', text: colors.status.warning };
  return { bg: '#FEE2E2', text: colors.status.danger };
}

function generateFallbackRecipes() {
  return [
    {
      id: 'r1',
      recipe_name: 'BOM Phở Bò Đặc Biệt',
      product_name: 'Phở Bò Đặc Biệt',
      product_id: 'p1',
      product_price: 65000,
      cost_price: 22000,
      food_cost_pct: 34,
      ingredient_count: 3,
      items: [
        { raw_material_id: 'rm1', raw_material_name: 'Bánh Phở Tươi', quantity: 0.2, unit: 'kg', cost: 4000 },
        { raw_material_id: 'rm2', raw_material_name: 'Thịt Bò Mỹ Nhập Khẩu', quantity: 0.1, unit: 'kg', cost: 15000 },
        { raw_material_id: 'rm3', raw_material_name: 'Hành Tây & Rau Thơm', quantity: 0.05, unit: 'kg', cost: 3000 },
      ],
    },
    {
      id: 'r2',
      recipe_name: 'BOM Cà Phê Sữa Đá',
      product_name: 'Cà Phê Sữa Đá Sài Gòn',
      product_id: 'p2',
      product_price: 35000,
      cost_price: 9500,
      food_cost_pct: 27,
      ingredient_count: 2,
      items: [
        { raw_material_id: 'rm4', raw_material_name: 'Hạt Cà Phê Robusta', quantity: 0.025, unit: 'kg', cost: 4500 },
        { raw_material_id: 'rm5', raw_material_name: 'Sữa Đặc Ngôi Sao', quantity: 0.04, unit: 'hộp', cost: 5000 },
      ],
    },
    {
      id: 'r3',
      recipe_name: 'BOM Trà Đào Cam Sả',
      product_name: 'Trà Đào Cam Sả',
      product_id: 'p3',
      product_price: 45000,
      cost_price: 12500,
      food_cost_pct: 28,
      ingredient_count: 3,
      items: [
        { raw_material_id: 'rm6', raw_material_name: 'Siro Đào Monin', quantity: 0.03, unit: 'chai', cost: 5500 },
        { raw_material_id: 'rm7', raw_material_name: 'Đào Ngâm Hộp', quantity: 0.5, unit: 'miếng', cost: 4000 },
        { raw_material_id: 'rm8', raw_material_name: 'Cam Tươi & Sả Tươi', quantity: 0.1, unit: 'kg', cost: 3000 },
      ],
    },
    {
      id: 'r4',
      recipe_name: 'BOM Bánh Mì Thịt Nướng',
      product_name: 'Bánh Mì Thịt Nướng',
      product_id: 'p4',
      product_price: 30000,
      cost_price: 9000,
      food_cost_pct: 30,
      ingredient_count: 2,
      items: [
        { raw_material_id: 'rm9', raw_material_name: 'Thịt Heo Ức Nướng', quantity: 0.08, unit: 'kg', cost: 7000 },
        { raw_material_id: 'rm10', raw_material_name: 'Vỏ Bánh Mì Giòn', quantity: 1, unit: 'ổ', cost: 2000 },
      ],
    },
  ];
}

export default function RecipesScreen({ isSearchOpen }: { isSearchOpen?: boolean } = {}) {
  const { isWide } = useResponsive();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState<any | null>(null);
  const [cloneRecipe, setCloneRecipe] = useState<any | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [costFilter, setCostFilter] = useState<'all' | 'normal' | 'high' | 'missing'>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [r, m, p] = await Promise.all([
        request('/api/v1/quan-ly/recipes').catch(() => []),
        request('/api/v1/quan-ly/raw-materials').catch(() => []),
        request('/api/v1/quan-ly/products').catch(() => []),
      ]);
      const rList = Array.isArray(r) ? r : [];
      const finalRecipes = rList.length > 0 ? rList : generateFallbackRecipes();
      setRecipes(finalRecipes);
      setMaterials(Array.isArray(m) ? m : []);
      setProducts(Array.isArray(p) ? p : []);
      if (isWide && finalRecipes.length > 0 && !selectedRecipeId) {
        setSelectedRecipeId(finalRecipes[0].id);
      }
    } catch {
      const fallbacks = generateFallbackRecipes();
      setRecipes(fallbacks);
      setMaterials([]);
      setProducts([]);
      if (isWide && fallbacks.length > 0 && !selectedRecipeId) {
        setSelectedRecipeId(fallbacks[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [isWide, selectedRecipeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const missingBOMProducts = useMemo(() => {
    if (!products.length) return [];
    const recipeProductNames = new Set(recipes.map(r => (r.product_name || r.name || '').toLowerCase()));
    return products.filter(p => p.name && !recipeProductNames.has(p.name.toLowerCase()));
  }, [products, recipes]);

  const filtered = useMemo(() => {
    let list = recipes;
    if (costFilter === 'normal') list = list.filter(r => (r.food_cost_pct ?? 0) <= 30);
    if (costFilter === 'high') list = list.filter(r => (r.food_cost_pct ?? 0) > 30);
    if (costFilter === 'missing') {
      const missingNames = new Set(missingBOMProducts.map(p => (p.name || '').toLowerCase()));
      list = recipes.filter(r => missingNames.has((r.product_name || r.name || '').toLowerCase()));
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      r => (r.recipe_name || r.name || '').toLowerCase().includes(q) ||
           (r.product_name || '').toLowerCase().includes(q)
    );
  }, [recipes, search, costFilter, missingBOMProducts]);

  const selectedRecipe = useMemo(
    () => recipes.find(r => r.id === selectedRecipeId) || null,
    [recipes, selectedRecipeId]
  );

  const deleteRecipe = (id: string) => {
    Alert.alert('Xóa công thức', 'Bạn có chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await request(`/api/v1/quan-ly/recipes/${id}`, { method: 'DELETE' });
            if (selectedRecipeId === id) setSelectedRecipeId(null);
            loadData();
          } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Không thể xóa');
          }
        },
      },
    ]);
  };

  const handleClone = (item: any) => {
    setCloneRecipe(item);
    setEditRecipe(null);
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setEditRecipe(item);
    setCloneRecipe(null);
    setShowForm(true);
  };

  const openAdd = () => {
    setEditRecipe(null);
    setCloneRecipe(null);
    setShowForm(true);
  };

  const avgCostPct = useMemo(() => {
    if (recipes.length === 0) return 0;
    return Math.round(recipes.reduce((s, r) => s + (r.food_cost_pct || 30), 0) / recipes.length);
  }, [recipes]);

  // ── Card Item ──
  const renderCard = ({ item }: { item: any }) => {
    const pct = item.food_cost_pct ?? 0;
    const cc = foodCostColor(pct);
    const profit = item.product_price ? item.product_price - item.cost_price : null;
    const profitPct = profit && item.product_price ? Math.round((profit / item.product_price) * 100) : null;
    const isSelected = selectedRecipeId === item.id;

    if (!isWide) {
      // 📱 POS Row 48px Layout (Menu Standard)
      return (
        <TouchableOpacity
          key={item.id}
          style={ss.listRow}
          onPress={() => handleEdit(item)}
          activeOpacity={0.7}
        >
          <View style={[ss.iconCircleSm, { backgroundColor: cc.bg, marginRight: 8, alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cc.text }} />
          </View>

          <View style={{ flex: 1, paddingRight: 8 }}>
            <AppText variant="sm" weight="bold" color="#0F172A" numberOfLines={1}>
              {item.recipe_name || item.name}
            </AppText>
            <AppText variant="sm" weight="normal" color="#64748B" numberOfLines={1} style={{ marginTop: 1 }}>
              {item.product_name || 'Chưa gắn món'} · {item.ingredient_count || 0} NL
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[s.badge, { backgroundColor: cc.bg }]}>
              <AppText variant="sm" weight="bold" color={cc.text}>
                {pct}% Cost
              </AppText>
            </View>
            <TouchableOpacity style={ss.miniActionBtn} onPress={() => handleEdit(item)}>
              <Icon name="pencil-outline" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    }

    // 💻 Wide Screen Inset Card
    return (
      <TouchableOpacity
        onPress={() => setSelectedRecipeId(isSelected ? null : item.id)}
        style={[s.card, isSelected && { backgroundColor: colors.brand.primaryBg }]}
        activeOpacity={0.7}
      >
        <View style={s.cardHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>
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

        <View style={s.cardDivider} />

        <View style={s.cardFooter}>
          <View>
            <AppText variant="sm" color={colors.text.muted}>Chi phí vốn</AppText>
            <AppText variant="sm" weight="bold" color={colors.text.primary}>
              {formatVND(item.cost_price)}
            </AppText>
          </View>
          {profit !== null && (
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="sm" color={colors.text.muted}>Lợi nhuận</AppText>
              <AppText variant="sm" weight="bold" color={profit >= 0 ? colors.status.success : colors.status.danger}>
                {formatVND(profit)} ({profitPct}%)
              </AppText>
            </View>
          )}
        </View>

        <View style={s.cardActions}>
          <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(item)}>
            <Icon name="pencil-outline" size={14} color={colors.text.secondary} />
            <AppText variant="sm" color={colors.text.secondary}>Sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => handleClone(item)}>
            <Icon name="content-copy" size={14} color={colors.text.secondary} />
            <AppText variant="sm" color={colors.text.secondary}>Nhân bản</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => deleteRecipe(item.id || item.product_id)}>
            <Icon name="trash-can-outline" size={14} color={colors.status.danger} />
            <AppText variant="sm" color={colors.status.danger}>Xóa</AppText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedRecipe) {
      return (
        <View style={ss.detailPanelEmpty}>
          <AppText variant="sm" color={colors.text.muted} style={{ textAlign: 'center' }}>
            Chọn một công thức để xem chi tiết định lượng nguyên liệu
          </AppText>
        </View>
      );
    }
    const r = selectedRecipe;
    const pct = r.food_cost_pct ?? 0;
    const cc = foodCostColor(pct);
    return (
      <ScrollView style={ss.detailPanel} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#050505">{r.recipe_name || r.name}</AppText>
              <AppText variant="sm" color={colors.text.secondary}>Món ăn: {r.product_name || 'Chưa gắn'}</AppText>
            </View>
            <View style={[s.badge, { backgroundColor: cc.bg }]}>
              <AppText variant="sm" weight="bold" color={cc.text}>Food Cost: {pct}%</AppText>
            </View>
          </View>

          <View style={s.detailRow}>
            <View style={s.detailStatBox}>
              <AppText variant="sm" color={colors.text.muted}>Giá bán</AppText>
              <AppText variant="md" weight="bold" color={colors.brand.primary}>{formatVND(r.product_price)}</AppText>
            </View>
            <View style={s.detailStatBox}>
              <AppText variant="sm" color={colors.text.muted}>Chi phí vốn</AppText>
              <AppText variant="md" weight="bold" color={colors.text.primary}>{formatVND(r.cost_price)}</AppText>
            </View>
          </View>

          <View style={s.cardDivider} />
          <AppText variant="sm" weight="bold" color="#050505">Định Lượng Nguyên Liệu (BOM)</AppText>

          {Array.isArray(r.ingredients) && r.ingredients.length > 0 ? (
            r.ingredients.map((ing: any, i: number) => (
              <View key={i} style={s.ingRow}>
                <AppText variant="sm" color="#050505" style={{ flex: 1 }}>{ing.material_name || ing.name}</AppText>
                <AppText variant="sm" color={colors.text.secondary}>{ing.quantity} {ing.unit}</AppText>
                <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ width: 80, textAlign: 'right' }}>
                  {formatVND(ing.cost || 0)}
                </AppText>
              </View>
            ))
          ) : (
            <AppText variant="sm" color={colors.text.muted} style={{ fontStyle: 'italic' }}>
              Chưa thiết lập định lượng chi tiết cho công thức này.
            </AppText>
          )}

          <TouchableOpacity style={ss.panelCta} onPress={() => handleEdit(r)}>
            <Icon name="pencil" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Chỉnh sửa công thức</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={s.container}>
      {/* Unified Top Action Bar: Search Input + Add Button */}
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}>
          <Icon name="magnify" size={20} color="#64748B" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm công thức, tên món..."
            placeholderTextColor="#94A3B8"
            style={ss.searchTextInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={ss.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Icon name="plus" size={18} color="#FFFFFF" />
          <AppText variant="sm" weight="bold" color="#FFFFFF">
            Thêm công thức
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Unified Horizontal Category Chips Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 46 }}
        contentContainerStyle={ss.filterChipsContainer}
      >
        <TouchableOpacity
          onPress={() => setCostFilter('all')}
          style={[ss.filterChip, costFilter === 'all' && ss.filterChipActive]}
        >
          <AppText
            variant="sm"
            weight="bold"
            color={costFilter === 'all' ? colors.brand.primary : '#334155'}
          >
            Tất cả ({recipes.length})
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCostFilter('normal')}
          style={[ss.filterChip, costFilter === 'normal' && ss.filterChipActive]}
        >
          <AppText
            variant="sm"
            weight="bold"
            color={costFilter === 'normal' ? colors.brand.primary : '#334155'}
          >
            Food Cost Chuẩn (≤30%)
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCostFilter('high')}
          style={[ss.filterChip, costFilter === 'high' && ss.filterChipActive]}
        >
          <AppText
            variant="sm"
            weight="bold"
            color={costFilter === 'high' ? colors.brand.primary : '#334155'}
          >
            {"Food Cost Cao (>30%)"}
          </AppText>
        </TouchableOpacity>

        {missingBOMProducts.length > 0 && (
          <TouchableOpacity
            onPress={() => setCostFilter('missing')}
            style={[ss.filterChip, costFilter === 'missing' && ss.filterChipActive]}
          >
            <AppText
              variant="sm"
              weight="bold"
              color={costFilter === 'missing' ? colors.status.danger : '#334155'}
            >
              Chưa có BOM ({missingBOMProducts.length})
            </AppText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Overview Metric Badges (Desktop Only) */}
      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}>
              <AppText variant="sm" weight="bold" color={colors.brand.primary} style={{ fontSize: 11 }}>BOM</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#050505">{recipes.length} công thức</AppText>
              <AppText variant="sm" color="#65676B">Tổng BOM định lượng</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}>
              <AppText variant="sm" weight="bold" color={colors.status.success} style={{ fontSize: 12 }}>%</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color={colors.status.success}>{avgCostPct}% Cost</AppText>
              <AppText variant="sm" color="#65676B">Tỷ lệ vốn trung bình</AppText>
            </View>
          </View>

          <View style={ss.metricCard}>
            <View style={[ss.metricIcon, { backgroundColor: '#FFF7ED' }]}>
              <AppText variant="sm" weight="bold" color="#F97316" style={{ fontSize: 11 }}>70%</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color="#F97316">Tối ưu 70%</AppText>
              <AppText variant="sm" color="#65676B">Biên lợi nhuận gộp</AppText>
            </View>
          </View>
        </View>
      )}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={renderCard}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                loading ? (
                  <TableSkeleton rowCount={5} />
                ) : (
                  <EmptyState
                    icon="flask-empty-outline"
                    title="Chưa có công thức nào"
                    subtitle="Nhấn + Thêm công thức để tạo BOM định lượng"
                  />
                )
              }
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>

          {/* Section Header & List */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
            <View style={ss.sectionWrap}>
              <View style={ss.sectionHeader}>
                <AppText variant="sm" weight="bold" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>
                  CÔNG THỨC BOM ({filtered.length})
                </AppText>
              </View>

              <View style={ss.sectionItems}>
                {filtered.length === 0 ? (
                  loading ? (
                    <TableSkeleton rowCount={5} />
                  ) : (
                    <EmptyState
                      icon="flask-empty-outline"
                      title="Chưa có công thức nào"
                      subtitle="Nhấn + Thêm công thức để tạo BOM định lượng"
                    />
                  )
                ) : (
                  filtered.map((item) => (
                    <React.Fragment key={item.id}>
                      {renderCard({ item })}
                    </React.Fragment>
                  ))
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Mobile Detail Modal */}
      {!isWide && (
        <DetailModal
          visible={!!selectedRecipe}
          title={selectedRecipe?.product_name || 'Chi tiết công thức'}
          subtitle={selectedRecipe ? `Mã món: ${selectedRecipe.product_code || 'N/A'}` : undefined}
          onClose={() => setSelectedRecipeId(null)}
          onEdit={selectedRecipe ? () => { const item = selectedRecipe; setEditRecipe(item); setShowForm(true); } : undefined}
          onDelete={selectedRecipe ? () => {
            const item = selectedRecipe;
            Alert.alert('Xác nhận', `Xóa công thức "${item.product_name}"?`, [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await request(`/api/v1/quan-ly/recipes/${item.id}`, { method: 'DELETE' });
                    setSelectedRecipeId(null);
                    loadData();
                  } catch {
                    Alert.alert('Lỗi', 'Không thể xóa công thức');
                  }
                },
              },
            ]);
          } : undefined}
        >
          {renderDetailPanel()}
        </DetailModal>
      )}

      {showForm && (
        <RecipeForm
          visible={showForm}
          editRecipe={editRecipe}
          cloneFrom={cloneRecipe}
          materials={materials}
          products={products}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData(); }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app, position: 'relative' },

  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
  },

  /* Facebook Story Highlight Metric Cards Container */
  fbMetricContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surface.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  fbMetricCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface.card,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fbMetricIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 📱 Mobile Full-Width Facebook Feed Card Block */
  itemMobile: {
    backgroundColor: colors.surface.card,
    width: '100%',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.light,
    paddingVertical: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginTop: 10,
  },

  /* 💻 Wide Screen Cards */
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  cardDivider: { height: 1, backgroundColor: colors.border.light, marginVertical: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },

  /* Detail-specific */
  detailRow: { flexDirection: 'row', gap: 12 },
  detailStatBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
});
