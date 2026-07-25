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
      setRecipes(Array.isArray(r) ? r : []);
      setMaterials(Array.isArray(m) ? m : []);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải công thức');
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
              <AppText variant="sm" weight="bold" color={colors.status.danger}>Xóa</AppText>
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
    const itemsList = selectedRecipe.items || selectedRecipe.ingredients || [];

    return (
      <View style={s.panelBox}>
        <View style={s.panelHeader}>
          <Icon name="flask-outline" size={18} color={colors.brand.primary} />
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ flex: 1 }}>
            {selectedRecipe.recipe_name || selectedRecipe.name}
          </AppText>
          <View style={[s.badge, { backgroundColor: cc.bg }]}>
            <AppText variant="sm" weight="bold" color={cc.text}>{pct}% Cost</AppText>
          </View>
        </View>

        <DetailRow label="Món ăn gắn kèm" value={selectedRecipe.product_name || 'Chưa gắn'} />
        <DetailRow label="Giá bán món" value={formatVND(selectedRecipe.product_price)} />
        <DetailRow label="Tổng chi phí BOM" value={formatVND(selectedRecipe.cost_price)} />
        <DetailRow label="Food Cost %" value={<AppText variant="sm" weight="bold" color={cc.text}>{pct}%</AppText>} />
        {profit !== null && <DetailRow label="Lợi nhuận" value={<AppText variant="sm" weight="bold" color={profit >= 0 ? colors.status.success : colors.status.danger}>{formatVND(profit)}</AppText>} />}

        <View style={s.panelDivider} />

        <View>
          <AppText variant="sm" weight="bold" color={colors.text.primary} style={{ marginBottom: 4 }}>Nguyên liệu thành phần</AppText>
          {itemsList.map((it: any, idx: number) => (
            <View key={idx} style={s.ingRow}>
              <AppText variant="sm" color={colors.text.primary} style={{ flex: 1 }} numberOfLines={1}>{it.raw_material_name || it.raw_material_id?.slice(0, 8)}</AppText>
              <AppText variant="sm" color={colors.text.secondary}>{it.quantity} {it.unit} · {formatVND(it.cost)}</AppText>
            </View>
          ))}
        </View>

        <View style={s.panelDivider} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => handleEdit(selectedRecipe)} style={[s.panelBtn, { backgroundColor: colors.brand.primary, flex: 1 }]}>
            <Icon name="pencil" size={14} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Sửa</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleClone(selectedRecipe)} style={[s.panelBtn, { backgroundColor: colors.surface.app, flex: 1 }]}>
            <Icon name="content-copy" size={14} color={colors.text.primary} />
            <AppText variant="sm" color={colors.text.primary}>Nhân bản</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteRecipe(selectedRecipe.id || selectedRecipe.product_id)} style={[s.panelBtn, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="delete" size={14} color={colors.status.danger} />
            <AppText variant="sm" weight="bold" color={colors.status.danger}>Xoá</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
      {/* Top Action Bar on Mobile */}
      {!isWide && (
        <View style={s.mobileActionRow}>
          <AppText variant="md" weight="bold" color="#050505">{recipes.length} công thức BOM</AppText>
          <TouchableOpacity onPress={openAdd} style={s.addBtn}>
            <Icon name="plus" size={16} color={colors.text.inverse} />
            <AppText variant="sm" weight="bold" color={colors.text.inverse}>Tạo công thức</AppText>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ paddingHorizontal: 12, marginVertical: 6 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Tìm công thức, tên món..." />
      </View>

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', padding: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <FlatList
              data={filtered}
              keyExtractor={item => item.id || item.product_id}
              renderItem={renderCard}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={
                loading ? <TableSkeleton rowCount={5} /> : <EmptyState icon="flask-empty-outline" title="Chưa có công thức" subtitle="Tạo công thức định lượng để kiểm soát Food Cost" />
              }
            />
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id || item.product_id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            loading ? <TableSkeleton rowCount={5} /> : <EmptyState icon="flask-empty-outline" title="Chưa có công thức" subtitle="Tạo công thức định lượng để kiểm soát Food Cost" />
          }
        />
      )}

      <RecipeForm
        visible={showForm}
        materials={materials}
        editRecipe={editRecipe}
        cloneFrom={cloneRecipe}
        onClose={() => { setShowForm(false); setEditRecipe(null); setCloneRecipe(null); }}
        onSaved={() => { setShowForm(false); setEditRecipe(null); setCloneRecipe(null); loadData(); }}
      />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
      <AppText variant="sm" color={colors.text.secondary}>{label}</AppText>
      {typeof value === 'string' ? <AppText variant="sm" weight="bold" color={colors.text.primary}>{value}</AppText> : value}
    </View>
  );
}

const s = StyleSheet.create({
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
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primary,
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
    justify: 'center',
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
    justify: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.brand.primaryBg,
  },
  panelBtnDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center',
    gap: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },

  /* 💻 Wide Screen Inset Card */
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  cardStats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  profitRow: { borderTopWidth: 1, borderTopColor: colors.border.light, paddingTop: 6 },
  actionCapsule: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface.app, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end', gap: 8, marginTop: 4 },
  actionIcon: { padding: 2 },
  actionDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border.default },

  panelBox: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 14, gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  panelDivider: { height: 1, backgroundColor: colors.border.light },
  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.surface.app },
  panelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 999, paddingHorizontal: 10 },
});
