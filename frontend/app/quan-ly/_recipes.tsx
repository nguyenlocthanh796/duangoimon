import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { colors, formatVND, ss } from '../../lib/theme';
import AppText from '../../lib/components/ui/AppText';
import EmptyState from '../../lib/components/ui/EmptyState';
import RecipeForm from '../../lib/components/recipes/RecipeForm';
import DetailModal from '../../lib/components/ui/DetailModal';
import { request } from '../../lib/api/client';

const API = '/api/v1/quan-ly';

function foodCostColor(pct: number) {
  if (pct <= 30) return { bg: '#ECFDF5', text: colors.status.success };
  if (pct <= 35) return { bg: '#FEF3C7', text: colors.status.warning };
  return { bg: '#FEE2E2', text: colors.status.danger };
}

function fallbackRecipes() {
  return [
    { id: 'r1', recipe_name: 'Phở Bò Đặc Biệt', product_name: 'Phở Bò Đặc Biệt', product_price: 65000, cost_price: 22000, food_cost_pct: 34, ingredient_count: 3 },
    { id: 'r2', recipe_name: 'Cà Phê Sữa Đá', product_name: 'Cà Phê Sữa Đá', product_price: 35000, cost_price: 9500, food_cost_pct: 27, ingredient_count: 2 },
    { id: 'r3', recipe_name: 'Trà Đào Cam Sả', product_name: 'Trà Đào Cam Sả', product_price: 45000, cost_price: 12500, food_cost_pct: 28, ingredient_count: 3 },
    { id: 'r4', recipe_name: 'Bánh Mì Thịt Nướng', product_name: 'Bánh Mì Thịt Nướng', product_price: 30000, cost_price: 9000, food_cost_pct: 30, ingredient_count: 2 },
  ];
}

export default function RecipesScreen(_props?: { isSearchOpen?: boolean }) {
  const { isWide } = useResponsive();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRecipe, setEditRecipe] = useState<any | null>(null);
  const [cloneRecipe, setCloneRecipe] = useState<any | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [costFilter, setCostFilter] = useState<'all' | 'normal' | 'high' | 'missing'>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [r, m, p] = await Promise.all([
        request(`${API}/recipes`).catch(() => []),
        request(`${API}/raw-materials`).catch(() => []),
        request(`${API}/products`).catch(() => []),
      ]);
      const rList = Array.isArray(r) ? r : [];
      const final = rList.length > 0 ? rList : fallbackRecipes();
      setRecipes(final);
      setMaterials(Array.isArray(m) ? m : []);
      setProducts(Array.isArray(p) ? p : []);
      if (isWide && final.length > 0 && !selectedRecipeId) setSelectedRecipeId(final[0].id);
    } catch {
      const fb = fallbackRecipes();
      setRecipes(fb); setMaterials([]); setProducts([]);
      if (isWide && fb.length > 0) setSelectedRecipeId(fb[0].id);
    } finally { setLoading(false); }
  }, [isWide]);

  useEffect(() => { loadData(); }, [loadData]);

  const missingBOMProducts = useMemo(() => {
    if (!products.length) return [];
    const rNames = new Set(recipes.map(r => (r.product_name || r.name || '').toLowerCase()));
    return products.filter(p => p.name && !rNames.has(p.name.toLowerCase()));
  }, [products, recipes]);

  const filtered = useMemo(() => {
    let list = recipes;
    if (costFilter === 'normal') list = list.filter(r => (r.food_cost_pct ?? 0) <= 30);
    if (costFilter === 'high') list = list.filter(r => (r.food_cost_pct ?? 0) > 30);
    if (costFilter === 'missing') {
      const mNames = new Set(missingBOMProducts.map(p => (p.name || '').toLowerCase()));
      list = recipes.filter(r => mNames.has((r.product_name || r.name || '').toLowerCase()));
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(r => (r.recipe_name || r.name || '').toLowerCase().includes(q) || (r.product_name || '').toLowerCase().includes(q));
  }, [recipes, search, costFilter, missingBOMProducts]);

  const selectedRecipe = useMemo(() => recipes.find(r => r.id === selectedRecipeId) || null, [recipes, selectedRecipeId]);

  const deleteRecipe = (id: string) => {
    Alert.alert('Xóa', 'Chắc chắn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await request(`${API}/recipes/${id}`, { method: 'DELETE' }); if (selectedRecipeId === id) setSelectedRecipeId(null); loadData(); }
        catch { Alert.alert('Lỗi', 'Xóa thất bại'); }
      }},
    ]);
  };

  const avgCostPct = useMemo(() => recipes.length ? Math.round(recipes.reduce((s, r) => s + (r.food_cost_pct || 30), 0) / recipes.length) : 0, [recipes]);

  const renderCard = ({ item }: { item: any }) => {
    const pct = item.food_cost_pct ?? 0;
    const cc = foodCostColor(pct);
    const profit = item.product_price ? item.product_price - item.cost_price : null;
    const profitPct = profit && item.product_price ? Math.round((profit / item.product_price) * 100) : null;
    const isSelected = selectedRecipeId === item.id;
    if (!isWide) {
      return (
        <View key={item.id} style={ss.listRow}>
          <View style={[ss.iconCircleSm, { backgroundColor: cc.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cc.text }} />
          </View>
          <View style={{ flex: 1, paddingLeft: 10 }}>
            <AppText variant="md" color="#0F172A" numberOfLines={1}>{item.recipe_name || item.name}</AppText>
            <AppText variant="md" color="#64748B">{item.product_name || 'Chưa gắn'} · {item.ingredient_count || 0} NL</AppText>
          </View>
          <View style={[s.badge, { backgroundColor: cc.bg }]}><AppText variant="md" color={cc.text}>{pct}%</AppText></View>
          <TouchableOpacity style={ss.miniActionBtn} onPress={() => { setEditRecipe(item); setShowForm(true); }}><Icon name="pencil-outline" size={16} color="#64748B" /></TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={() => setSelectedRecipeId(isSelected ? null : item.id)}
        style={[s.card, isSelected && { backgroundColor: colors.brand.primaryBg }]} activeOpacity={0.7}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}><AppText variant="md" color="#050505">{item.recipe_name || item.name}</AppText><AppText variant="md" color={colors.text.secondary}>{item.product_name || '—'}</AppText></View>
          <View style={[s.badge, { backgroundColor: cc.bg }]}><AppText variant="md" color={cc.text}>{pct}%</AppText></View>
        </View>
        <View style={s.cardDivider} />
        <View style={s.cardFooter}>
          <View><AppText variant="md" color={colors.text.muted}>Giá vốn</AppText><AppText variant="md" color={colors.text.primary}>{formatVND(item.cost_price)}</AppText></View>
          {profit !== null && <View style={{ alignItems: 'flex-end' }}><AppText variant="md" color={colors.text.muted}>Lợi nhuận</AppText><AppText variant="md" color={profit >= 0 ? colors.status.success : colors.status.danger}>{formatVND(profit)} ({profitPct}%)</AppText></View>}
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity style={s.actionBtn} onPress={() => { setEditRecipe(item); setShowForm(true); }}><Icon name="pencil" size={14} color={colors.text.secondary} /><AppText variant="md" color={colors.text.secondary}>Sửa</AppText></TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => { setCloneRecipe(item); setEditRecipe(null); setShowForm(true); }}><Icon name="content-copy" size={14} color={colors.text.secondary} /><AppText variant="md" color={colors.text.secondary}>Nhân bản</AppText></TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => deleteRecipe(item.id)}><Icon name="trash-can-outline" size={14} color={colors.status.danger} /><AppText variant="md" color={colors.status.danger}>Xóa</AppText></TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailPanel = () => {
    if (!selectedRecipe) return <View style={ss.detailPanelEmpty}><AppText variant="md" color={colors.text.muted}>Chọn công thức để xem chi tiết</AppText></View>;
    const r = selectedRecipe;
    const pct = r.food_cost_pct ?? 0;
    const cc = foodCostColor(pct);
    return (
      <ScrollView style={ss.detailPanel} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}><AppText variant="md" color="#050505">{r.recipe_name || r.name}</AppText><AppText variant="md" color={colors.text.secondary}>Món: {r.product_name || 'Chưa gắn'}</AppText></View>
            <View style={[s.badge, { backgroundColor: cc.bg }]}><AppText variant="md" color={cc.text}>{pct}%</AppText></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={s.detailStatBox}><AppText variant="md" color={colors.text.muted}>Giá bán</AppText><AppText variant="md" color={colors.brand.primary}>{formatVND(r.product_price)}</AppText></View>
            <View style={s.detailStatBox}><AppText variant="md" color={colors.text.muted}>Giá vốn</AppText><AppText variant="md" color={colors.text.primary}>{formatVND(r.cost_price)}</AppText></View>
          </View>
          <View style={s.cardDivider} />
          <AppText variant="md" color="#050505">Định Lượng (BOM)</AppText>
          {Array.isArray(r.ingredients) && r.ingredients.length > 0 ? r.ingredients.map((ing: any, i: number) => (
            <View key={i} style={s.ingRow}>
              <AppText variant="md" color="#050505" style={{ flex: 1 }}>{ing.material_name || ing.name}</AppText>
              <AppText variant="md" color={colors.text.secondary}>{ing.quantity} {ing.unit}</AppText>
              <AppText variant="md" color={colors.text.primary} style={{ width: 80, textAlign: 'right' }}>{formatVND(ing.cost || 0)}</AppText>
            </View>
          )) : <AppText variant="md" color={colors.text.muted} style={{ fontStyle: 'italic' }}>Chưa thiết lập định lượng</AppText>}
          <TouchableOpacity style={ss.panelCta} onPress={() => { setEditRecipe(r); setShowForm(true); }}><Icon name="pencil" size={16} color={colors.text.inverse} /><AppText variant="md" color={colors.text.inverse}>Sửa công thức</AppText></TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={s.container}>
      <View style={ss.topActionBar}>
        <View style={ss.searchInputWrap}><Icon name="magnify" size={20} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Tìm công thức..." placeholderTextColor="#94A3B8" style={ss.searchTextInput} /></View>
        <TouchableOpacity style={ss.addBtn} onPress={() => { setEditRecipe(null); setCloneRecipe(null); setShowForm(true); }}><Icon name="plus" size={18} color="#FFF" /><AppText variant="md" color="#FFF">Thêm CT</AppText></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, height: 46 }} contentContainerStyle={ss.filterChipsContainer}>
        {['all', 'normal', 'high'].map((k) => (
          <TouchableOpacity key={k} onPress={() => setCostFilter(k as any)} style={[ss.filterChip, costFilter === k && ss.filterChipActive]}>
            <AppText variant="md" color={costFilter === k ? colors.brand.primary : '#334155'}>
              {k === 'all' ? `Tất cả (${recipes.length})` : k === 'normal' ? 'Chuẩn (≤30%)' : 'Cao (>30%)'}
            </AppText>
          </TouchableOpacity>
        ))}
        {missingBOMProducts.length > 0 && (
          <TouchableOpacity onPress={() => setCostFilter('missing')} style={[ss.filterChip, costFilter === 'missing' && ss.filterChipActive]}>
            <AppText variant="md" color={costFilter === 'missing' ? colors.status.danger : '#334155'}>Chưa BOM ({missingBOMProducts.length})</AppText>
          </TouchableOpacity>
        )}
      </ScrollView>

      {isWide && (
        <View style={ss.metricContainer}>
          <View style={ss.metricCard}><View style={[ss.metricIcon, { backgroundColor: '#EEF2FF' }]}><AppText variant="md" color={colors.brand.primary}>BOM</AppText></View><View><AppText variant="md" color="#050505">{recipes.length} CT</AppText><AppText variant="md" color="#65676B">Tổng BOM</AppText></View></View>
          <View style={ss.metricCard}><View style={[ss.metricIcon, { backgroundColor: '#ECFDF5' }]}><AppText variant="md" color={colors.status.success}>%</AppText></View><View><AppText variant="md" color={colors.status.success}>{avgCostPct}%</AppText><AppText variant="md" color="#65676B">Cost TB</AppText></View></View>
        </View>
      )}

      {isWide ? (
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 12 }}>
          <View style={{ flex: 0.55 }}>
            <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderCard}
              contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}
              ListEmptyComponent={loading ? null : <EmptyState icon="flask-empty-outline" title="Chưa có công thức" subtitle="Nhấn + Thêm CT" />} />
          </View>
          <View style={{ flex: 0.45 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}>
          <View style={ss.sectionWrap}>
            <View style={ss.sectionHeader}><AppText variant="md" color="#1E293B" style={{ flex: 1, letterSpacing: 0.5 }}>CÔNG THỨC BOM ({filtered.length})</AppText></View>
            <View style={ss.sectionItems}>{filtered.map(item => (<React.Fragment key={item.id}>{renderCard({ item })}</React.Fragment>))}</View>
          </View>
        </ScrollView>
      )}

      {!isWide && (
        <DetailModal visible={!!selectedRecipe} title={selectedRecipe?.product_name || 'Chi tiết CT'}
          subtitle={selectedRecipe ? `Món: ${selectedRecipe.product_name || 'N/A'}` : undefined}
          onClose={() => setSelectedRecipeId(null)}
          onEdit={selectedRecipe ? () => { setEditRecipe(selectedRecipe); setShowForm(true); } : undefined}
          onDelete={selectedRecipe ? () => deleteRecipe(selectedRecipe.id) : undefined}>
          {renderDetailPanel()}
        </DetailModal>
      )}

      <RecipeForm visible={showForm} editRecipe={editRecipe} cloneFrom={cloneRecipe}
        materials={materials} products={products}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); loadData(); }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface.app, position: 'relative' },
  card: { backgroundColor: colors.surface.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  cardDivider: { height: 1, backgroundColor: colors.border.light, marginVertical: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
  detailStatBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
  ingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
});
