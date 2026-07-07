"use client";
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSidebar } from '../../lib/context/SidebarContext';
import { colors, font } from '../../lib/theme';
import { request } from '../../lib/api/client';
import ScreenHeader from '../../lib/components/ui/ScreenHeader';
import RecipeForm from '../../lib/components/recipes/RecipeForm';

const API = '/api/v1/quan-ly';

function formatVND(v: number) {
  return v.toLocaleString('vi-VN') + 'đ';
}

function foodCostColor(pct: number) {
  if (pct < 30) return { bg: '#DCFCE7', text: '#16A34A' };
  if (pct <= 45) return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#FEE2E2', text: '#DC2626' };
}

export default function RecipesScreen() {
  const { openSidebar } = useSidebar();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [r, m] = await Promise.all([
        request<any[]>(API + '/recipes'),
        request<any[]>(API + '/raw-materials'),
      ]);
      setRecipes(r);
      setMaterials(m);
    } catch (e) {
      console.error('Failed to load recipes', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteRecipe = (id: string) => {
    Alert.alert('Xác nhận', 'Xoá công thức này?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: async () => {
        await request(API + `/recipes/${id}`, { method: 'DELETE' });
        load();
      }},
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const pct = item.food_cost_pct ?? 0;
    const cc = foodCostColor(pct);
    return (
      <TouchableOpacity
        onPress={() => setSelectedRecipe(item)}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{item.recipe_name || item.name}</Text>
          <View style={[styles.badge, { backgroundColor: cc.bg }]}>
            <Text style={[styles.badgeText, { color: cc.text }]}>{pct}%</Text>
          </View>
        </View>
        <Text style={styles.cardProduct}>🍽 {item.product_name}</Text>
        <View style={styles.cardStats}>
          <Text style={styles.cardStat}>💰 {formatVND(item.cost_price)}</Text>
          <Text style={styles.cardStat}>📦 {item.ingredient_count} nguyên liệu</Text>
        </View>
        {selectedRecipe?.id === item.id && (
          <TouchableOpacity onPress={() => deleteRecipe(item.id || item.product_id)} style={styles.deleteBtn}>
            <Icon name="delete-outline" size={16} color={colors.status.danger} />
            <Text style={{ color: colors.status.danger, ...font.caption }}>Xoá</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <ScreenHeader
        title="Công thức 🧪"
        subtitle={`${recipes.length} công thức · Quản lý giá thành`}
        onMenuPress={openSidebar}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={load} style={styles.addBtn}>
              <Icon name="refresh" size={20} color={colors.icon.default} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              style={styles.addBtn}
            >
              <Icon name="plus" size={18} color={colors.text.inverse} />
              <Text style={{ color: colors.text.inverse, ...font.tab }}>Thêm</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item, i) => item.product_id || item.id || String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Icon name="food-off" size={48} color={colors.text.muted} />
              <Text style={{ ...font.body, color: colors.text.muted }}>Chưa có công thức nào</Text>
              <TouchableOpacity onPress={() => setShowForm(true)} style={styles.addBtn}>
                <Icon name="plus" size={18} color={colors.text.inverse} />
                <Text style={{ color: colors.text.inverse, ...font.tab }}>Tạo công thức đầu tiên</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <RecipeForm
        visible={showForm}
        materials={materials}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border.default },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { ...font.h3, color: colors.text.primary, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { ...font.badge, fontWeight: '700' },
  cardProduct: { ...font.bodySmall, color: colors.text.secondary, marginBottom: 8 },
  cardStats: { flexDirection: 'row', gap: 16 },
  cardStat: { ...font.caption, color: colors.text.muted },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-end' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.brand.primary },
});
