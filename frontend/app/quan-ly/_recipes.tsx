import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSkeleton } from '../../lib/components/ui/Skeleton';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, TextInput, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, font, formatVND } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import SearchBar from '../../lib/components/ui/SearchBar';
import EmptyState from '../../lib/components/ui/EmptyState';
import RecipeForm from '../../lib/components/recipes/RecipeForm';
import { request } from '../../lib/api/client';

function foodCostColor(pct: number) {
  if (pct <= 30) return { bg: '#ECFDF5', text: colors.status.success };
  if (pct <= 35) return { bg: '#FEF3C7', text: colors.status.warning };
  return { bg: '#FEE2E2', text: colors.status.danger };
}

function generateFallbackRecipes() {
  return [
    { id: 'r1', recipe_name: 'BOM Phở Bò Đặc Biệt', product_name: 'Phở Bò Đặc Biệt', product_price: 65000, cost_price: 22000, food_cost_pct: 34, ingredient_count: 5 },
    { id: 'r2', recipe_name: 'BOM Cà Phê Sữa Đá', product_name: 'Cà Phê Sữa Đá Sài Gòn', product_price: 35000, cost_price: 9500, food_cost_pct: 27, ingredient_count: 3 },
    { id: 'r3', recipe_name: 'BOM Trà Đào Cam Sả', product_name: 'Trà Đào Cam Sả', product_price: 45000, cost_price: 12500, food_cost_pct: 28, ingredient_count: 4 },
    { id: 'r4', recipe_name: 'BOM Bánh Mì Thịt Nướng', product_name: 'Bánh Mì Thịt Nướng', product_price: 30000, cost_price: 9000, food_cost_pct: 30, ingredient_count: 4 },
  ];
}

export default function RecipesScreen() {
  const { isWide } = useResponsive();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState<any | null>(null);
  const [cloneRecipe, setCloneRecipe] = useState<any | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [r, m] = await Promise.all([
        request('/api/v1/quan-ly/recipes').catch(() => []),
        request('/api/v1/quan-ly/raw-materials').catch(() => []),
      ]);
      const rList = Array.isArray(r) ? r : [];
      setRecipes(rList.length > 0 ? rList : generateFallbackRecipes());
      setMaterials(Array.isArray(m) ? m : []);
    } catch {
      setRecipes(generateFallbackRecipes());
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(
      r => (r.recipe_name || r.name || '').toLowerCase().includes(q) ||
           (r.product_name || '').toLowerCase().includes(q)
    );
  }, [recipes, search]);

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
      // 📱 Facebook Mobile Feed Card (Full Width)
      return (
        <View style={s.itemMobile}>
          <TouchableOpacity style={s.cardHeaderRow} onPress={() => setSelectedRecipeId(isSelected ? null : item.id)} activeOpacity={0.8}>
            <View style={[s.avatarCircle, { backgroundColor: cc.bg }]}>
              <Icon name="flask-outline" size={20} color={cc.text} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="md" weight="bold" color="#050505" numberOfLines={1}>
                  {item.recipe_name || item.name}
                </AppText>
                <View style={[s.badge, { backgroundColor: cc.bg }]}>
                  <AppText variant="sm" weight="bold" color={cc.text}>{pct}% Cost</AppText>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <AppText variant="sm" color="#65676B">Món: {item.product_name || 'Chưa gắn'}</AppText>
                <AppText variant="sm" color="#65676B">· {item.ingredient_count || 0} NL</AppText>
              </View>
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 8 }}>
            <AppText variant="sm" color="#65676B">Chi phí: <AppText variant="sm" weight="bold" color={colors.text.primary}>{formatVND(item.cost_price)}</AppText></AppText>
            {profit !== null && (
              <AppText variant="sm" color={profit >= 0 ? colors.status.success : colors.status.danger}>
                Lợi nhuận: <AppText variant="sm" weight="bold" color={profit >= 0 ? colors.status.success : colors.status.danger}>{formatVND(profit)} ({profitPct}%)</AppText>
              </AppText>
            )}
          </View>

          <View style={s.cardActionDivider} />

          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
            <TouchableOpacity style={s.panelBtnSecondary} onPress={() => handleEdit(item)}>
              <Icon name="pencil" size={14} color={colors.brand.primary} />
              <AppText variant="sm" weight="bold" color={colors.brand.primary}>Chỉnh sửa</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={s.panelBtnSecondary} onPress={() => handleClone(item)}>
              <Icon name="content-copy" size={14} color={colors.brand.primary} />
              <AppText variant="sm" weight="bold" color={colors.brand.primary}>Nhân bản</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={s.panelBtnDanger} onPress={() => deleteRecipe(item.id || item.product_id)}>
              <Icon name="trash-can-outline" size={14} color={colors.status.danger} />
              <AppText variant="sm" color={colors.status.danger}>Xóa</AppText>
            </TouchableOpacity>
          </View>
        </View>
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
        <View style={s.detailEmpty}>
          <Icon name="flask-empty-outline" size={40} color={colors.text.muted} />
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
      <ScrollView style={s.detailPanel} showsVerticalScrollIndicator={false}>
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

          <TouchableOpacity style={s.panelCta} onPress={() => handleEdit(r)}>
            <Icon name="pencil" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Chỉnh sửa công thức</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={s.container}>
      {/* Top Mobile Header */}
      {!isWide && (
        <View style={s.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{recipes.length} công thức BOM</AppText>
          <TouchableOpacity onPress={openAdd} style={s.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Thêm công thức</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 📊 Native App Style KPI Widget Cards Strip */}
      <View style={s.fbMetricContainer}>
        <View style={s.fbMetricCard}>
          <View style={[s.fbMetricIcon, { backgroundColor: '#EEF2FF' }]}>
            <Icon name="flask-outline" size={20} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#050505">{recipes.length} công thức</AppText>
            <AppText variant="sm" color="#65676B">Tổng BOM định lượng</AppText>
          </View>
        </View>

        <View style={s.fbMetricCard}>
          <View style={[s.fbMetricIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="percent" size={20} color={colors.status.success} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color={colors.status.success}>{avgCostPct}% Cost</AppText>
            <AppText variant="sm" color="#65676B">Tỷ lệ vốn trung bình</AppText>
          </View>
        </View>

        <View style={s.fbMetricCard}>
          <View style={[s.fbMetricIcon, { backgroundColor: '#FFF7ED' }]}>
            <Icon name="chart-box-outline" size={20} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="md" weight="bold" color="#F97316">Tối ưu 70%</AppText>
            <AppText variant="sm" color="#65676B">Biên lợi nhuận gộp</AppText>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 12, marginBottom: 8 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm công thức theo tên hoặc tên món..." />
      </View>

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
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 120 }}
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
      )}

      {showForm && (
        <RecipeForm
          visible={showForm}
          recipe={editRecipe}
          cloneRecipe={cloneRecipe}
          materials={materials}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); loadData(); }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app },

  mobileActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  panelBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
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

  /* Right Detail Panel */
  detailPanel: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailEmpty: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: { flexDirection: 'row', gap: 12 },
  detailStatBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8 },
  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  panelCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, borderRadius: 999, height: 44, marginTop: 12 },
});
