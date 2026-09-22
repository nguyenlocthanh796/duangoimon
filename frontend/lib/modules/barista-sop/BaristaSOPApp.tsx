import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  BackHandler,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { AppText, EmptyState, useAppToast } from '../../components/ui';
import { playTapSound } from '../../utils/sound';
import { formatCurrency } from '../../utils/format';
import { useBaristaStore } from './store';
import {
  RecipeBookItem,
  RecipeSizeVariant,
  BaristaSubAppTab,
} from './types';
import {
  RecipeDetailView,
  RecipeFocusMode,
  RecipeFormModal,
  BrewingAssistantTab,
  BaristaAppHeader,
  BaristaBottomNav,
  BaristaFocusScreen,
} from './components';

export function BaristaSOPApp() {
  const { theme, isDark } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();

  const {
    recipes,
    selectedCategory,
    searchQuery,
    activeTimers,
    setSelectedCategory,
    setSearchQuery,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,
    calculateVariantCost,
    calculateProfitMargin,
    tickTimers,
  } = useBaristaStore();

  const [activeTab, setActiveTab] = useState<BaristaSubAppTab>('recipes');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeBookItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeBookItem | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusVariant, setFocusVariant] = useState<RecipeSizeVariant | undefined>(undefined);
  const [localSearch, setLocalSearch] = useState('');

  // Ticking timers for multi-timer engine
  useEffect(() => {
    const interval = setInterval(() => {
      tickTimers();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickTimers]);

  // Hardware back button support
  useEffect(() => {
    if (!selectedRecipe && !isFormOpen && !isFocusMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFocusMode) {
        setIsFocusMode(false);
        return true;
      }
      if (isFormOpen) {
        setIsFormOpen(false);
        setEditingRecipe(null);
        return true;
      }
      if (selectedRecipe) {
        setSelectedRecipe(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedRecipe, isFormOpen, isFocusMode]);

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(recipes.map((r) => r.category))).filter(Boolean);
    return ['Tất cả', ...cats];
  }, [recipes]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchCat =
        selectedCategory === 'Tất cả' || r.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = (localSearch || searchQuery).trim().toLowerCase();
      const matchQuery =
        !q ||
        r.productName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.tags && r.tags.some((t) => t.toLowerCase().includes(q))) ||
        (r.variants &&
          r.variants.some((v) =>
            v.ingredients.some((ing) => ing.ingredientName.toLowerCase().includes(q))
          ));
      return matchCat && matchQuery;
    });
  }, [recipes, selectedCategory, localSearch, searchQuery]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalMargin = 0;
    let count = 0;
    recipes.forEach((r) => {
      const v = r.variants?.[0];
      if (v) {
        const cost = calculateVariantCost(v);
        const margin = calculateProfitMargin(r.sellingPrice, cost);
        totalMargin += margin;
        count++;
      }
    });
    const avgMargin = count > 0 ? Math.round(totalMargin / count) : 0;
    return {
      totalRecipes: recipes.length,
      avgMargin,
      fastCount: recipes.filter((r) => r.prepTimeMinutes <= 3).length,
    };
  }, [recipes, calculateVariantCost, calculateProfitMargin]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    playTapSound();
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  }, []);

  const handleSaveRecipe = (data: Omit<RecipeBookItem, 'id'>) => {
    if (editingRecipe) {
      updateRecipe(editingRecipe.id, data);
      showToast({
        title: 'Đã Cập Nhật',
        message: `Đã lưu công thức "${data.productName}"`,
        type: 'success',
      });
      if (selectedRecipe && selectedRecipe.id === editingRecipe.id) {
        setSelectedRecipe({ ...editingRecipe, ...data });
      }
    } else {
      const created = addRecipe(data);
      showToast({
        title: 'Thêm Mới Thành Công',
        message: `Đã thêm công thức "${data.productName}"`,
        type: 'success',
      });
      setSelectedRecipe(created);
    }
    setIsFormOpen(false);
    setEditingRecipe(null);
  };

  const handleDeleteRecipe = (id: string) => {
    const r = recipes.find((item) => item.id === id);
    deleteRecipe(id);
    showToast({
      title: 'Đã Xóa',
      message: `Đã xóa công thức "${r?.productName || ''}"`,
      type: 'info',
    });
    setSelectedRecipe(null);
  };

  const handleDuplicateRecipe = (id: string) => {
    const cloned = duplicateRecipe(id);
    if (cloned) {
      showToast({
        title: 'Nhân Bản Thành Công',
        message: `Đã tạo "${cloned.productName}"`,
        type: 'success',
      });
      setSelectedRecipe(cloned);
    }
  };

  // Branch 1: Focus Mode (Quầy Bar / Bếp Fullscreen)
  if (isFocusMode && selectedRecipe) {
    return (
      <RecipeFocusMode
        recipe={selectedRecipe}
        selectedVariant={focusVariant}
        onExit={() => setIsFocusMode(false)}
        onComplete={() => {
          showToast({
            title: 'Hoàn Tất Pha Chế',
            message: `Đã hoàn thành món "${selectedRecipe.productName}"`,
            type: 'success',
          });
          setIsFocusMode(false);
        }}
      />
    );
  }

  // Branch 2: Create / Edit Form Inline Sub-Screen
  if (isFormOpen) {
    return (
      <RecipeFormModal
        initialRecipe={editingRecipe}
        onSave={handleSaveRecipe}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRecipe(null);
        }}
      />
    );
  }

  // Branch 3: Recipe Detail View Inline Sub-Screen (On Mobile)
  if (selectedRecipe && !isWide) {
    return (
      <RecipeDetailView
        recipe={selectedRecipe}
        onBack={() => setSelectedRecipe(null)}
        onEdit={() => {
          setEditingRecipe(selectedRecipe);
          setIsFormOpen(true);
        }}
        onDelete={() => handleDeleteRecipe(selectedRecipe.id)}
        onDuplicate={() => handleDuplicateRecipe(selectedRecipe.id)}
        onLaunchFocusMode={(variant) => {
          setFocusVariant(variant);
          setIsFocusMode(true);
        }}
      />
    );
  }

  const activeTimerCount = activeTimers.filter((t) => t.isRunning || t.remainingSeconds > 0).length;

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* 1. Dedicated Standalone Barista Sub-App Top Header */}
      <BaristaAppHeader
        title="Barista SOP"
        subtitle={`${summaryMetrics.totalRecipes} món chuẩn hóa · Lãi TB ${summaryMetrics.avgMargin}%`}
        activeTimersCount={activeTimerCount}
        onOpenAddModal={() => {
          setEditingRecipe(null);
          setIsFormOpen(true);
        }}
      />

      {/* 2. Sub-App Body Rendering by Active Tab */}
      <View style={{ flex: 1 }}>
        {activeTab === 'brewing' && <BrewingAssistantTab />}

        {activeTab === 'focus' && (
          <BaristaFocusScreen
            onSelectRecipeForFocus={(recipe, variant) => {
              setSelectedRecipe(recipe);
              setFocusVariant(variant);
              setIsFocusMode(true);
            }}
          />
        )}

        {activeTab === 'recipes' && (
          <View style={{ flex: 1, flexDirection: isWide ? 'row' : 'column' }}>
            {/* Left / Main List Pane */}
            <View
              style={{
                flex: 1,
                borderRightWidth: isWide ? StyleSheet.hairlineWidth : 0,
                borderRightColor: theme.border.subtle,
              }}
            >
              {/* Search & Category Filter Header Strip */}
              <View
                style={[
                  s.searchStrip,
                  { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle },
                ]}
              >
                {/* Search Input Bar */}
                <View
                  style={[
                    s.searchBarWrap,
                    { backgroundColor: theme.surface.header, borderColor: theme.border.subtle },
                  ]}
                >
                  <Icon name="magnify" size={20} color={theme.text.muted} />
                  <TextInput
                    value={localSearch}
                    onChangeText={setLocalSearch}
                    placeholder="Tìm tên món, loại trà, nguyên liệu, tag..."
                    placeholderTextColor={theme.text.muted}
                    style={[s.searchInput, { color: theme.text.primary }]}
                  />
                  {localSearch ? (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        playTapSound();
                        setLocalSearch('');
                      }}
                      style={{ padding: 4 }}
                    >
                      <Icon name="close-circle" size={16} color={theme.text.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Category Filter Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.catPillContainer}
                >
                  {categories.map((cat) => {
                    const isSel = selectedCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        activeOpacity={0.8}
                        onPress={() => {
                          playTapSound();
                          setSelectedCategory(cat);
                        }}
                        style={[
                          s.catChip,
                          {
                            backgroundColor: isSel ? theme.brand.primary : theme.surface.header,
                            borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                          },
                        ]}
                      >
                        <AppText
                          variant="xs"
                          weight={isSel ? 'bold' : 'medium'}
                          color={isSel ? theme.text.onBrand : theme.text.primary}
                        >
                          {cat}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Recipes List */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                  isWide ? s.listContainerWide : s.listContainerMobile,
                  {
                    paddingBottom:
                      (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 64,
                  },
                ]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={theme.brand.accent}
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                {filteredRecipes.length === 0 ? (
                  <EmptyState
                    icon="book-open-page-variant-outline"
                    title="Chưa tìm thấy công thức"
                    description="Thử đổi từ khóa tìm kiếm hoặc bấm nút 'Thêm Món' để tạo công thức mới"
                  />
                ) : (
                  filteredRecipes.map((item) => {
                    const isSelected = selectedRecipe?.id === item.id;
                    const v = item.variants?.[0];
                    const cost = v ? calculateVariantCost(v) : 0;
                    const margin = calculateProfitMargin(item.sellingPrice, cost);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          playTapSound();
                          setSelectedRecipe(item);
                        }}
                        style={[
                          isWide ? s.recipeCardWide : s.recipeCardMobile,
                          {
                            backgroundColor: theme.surface.card,
                            borderColor: isWide
                              ? isSelected
                                ? theme.brand.accent
                                : theme.border.subtle
                              : theme.border.subtle,
                            borderWidth: isWide ? (isSelected ? 2 : StyleSheet.hairlineWidth) : 0,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                          },
                        ]}
                      >
                        {/* Card Top: Title, Category, Difficulty */}
                        <View style={s.cardTopRow}>
                          <View style={{ flex: 1 }}>
                            <AppText
                              variant="md"
                              weight="bold"
                              color={theme.text.primary}
                              numberOfLines={1}
                            >
                              {item.productName}
                            </AppText>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                marginTop: 4,
                              }}
                            >
                              <View
                                style={[
                                  s.catTag,
                                  {
                                    backgroundColor: theme.status.warningBg,
                                    borderColor: theme.brand.accent,
                                  },
                                ]}
                              >
                                <AppText variant="xxs" weight="bold" color={theme.brand.accent}>
                                  {item.category}
                                </AppText>
                              </View>

                              <AppText variant="xs" color={theme.text.muted}>
                                ⏱️ {item.prepTimeMinutes}p
                              </AppText>

                              <AppText variant="xs" color={theme.text.muted}>
                                •
                              </AppText>

                              <AppText
                                variant="xs"
                                weight="bold"
                                color={
                                  item.difficulty === 'easy'
                                    ? theme.brand.success
                                    : item.difficulty === 'medium'
                                    ? theme.brand.accent
                                    : theme.brand.danger
                                }
                              >
                                {item.difficulty === 'easy'
                                  ? 'Dễ'
                                  : item.difficulty === 'medium'
                                  ? 'Vừa'
                                  : 'Khó'}
                              </AppText>
                            </View>
                          </View>

                          {/* Margin Badge */}
                          <View
                            style={[
                              s.marginBadge,
                              {
                                backgroundColor:
                                  margin >= 60 ? theme.status.readyBg : theme.status.warningBg,
                              },
                            ]}
                          >
                            <AppText
                              variant="xs"
                              weight="bold"
                              color={margin >= 60 ? theme.brand.success : theme.brand.accent}
                              tabularNums
                            >
                              Lãi {margin}%
                            </AppText>
                          </View>
                        </View>

                        {/* Card Middle: Description */}
                        {item.description ? (
                          <AppText
                            variant="xs"
                            color={theme.text.muted}
                            numberOfLines={2}
                            style={{ marginTop: 8, lineHeight: 18 }}
                          >
                            {item.description}
                          </AppText>
                        ) : null}

                        {/* Card Bottom: Price, Cost, Steps count */}
                        <View
                          style={[
                            s.cardBottomRow,
                            {
                              borderTopColor: theme.border.subtle,
                              backgroundColor: theme.surface.header + '30',
                            },
                          ]}
                        >
                          <View>
                            <AppText variant="xxs" color={theme.text.muted}>
                              GIÁ BÁN / VỐN
                            </AppText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <AppText
                                variant="sm"
                                weight="bold"
                                color={theme.text.primary}
                                tabularNums
                              >
                                {formatCurrency(item.sellingPrice)}
                              </AppText>
                              <AppText variant="xs" color={theme.brand.accent} tabularNums>
                                (Vốn: {formatCurrency(cost)})
                              </AppText>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ alignItems: 'flex-end' }}>
                              <AppText variant="xxs" color={theme.text.muted}>
                                QUY TRÌNH
                              </AppText>
                              <AppText variant="xs" weight="bold" color={theme.text.primary}>
                                {item.steps?.length || 0} Bước SOP
                              </AppText>
                            </View>

                            <Icon name="chevron-right" size={20} color={theme.text.muted} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {/* Right Pane on Tablet / Desktop Large: Detail View */}
            {isWide && (
              <View style={{ flex: 1.3, backgroundColor: theme.surface.app }}>
                {selectedRecipe ? (
                  <RecipeDetailView
                    recipe={selectedRecipe}
                    onBack={() => setSelectedRecipe(null)}
                    onEdit={() => {
                      setEditingRecipe(selectedRecipe);
                      setIsFormOpen(true);
                    }}
                    onDelete={() => handleDeleteRecipe(selectedRecipe.id)}
                    onDuplicate={() => handleDuplicateRecipe(selectedRecipe.id)}
                    onLaunchFocusMode={(variant) => {
                      setFocusVariant(variant);
                      setIsFocusMode(true);
                    }}
                  />
                ) : (
                  <View style={s.emptyDetailPane}>
                    <Icon name="book-open-variant" size={48} color={theme.text.muted} />
                    <AppText
                      variant="md"
                      weight="bold"
                      color={theme.text.primary}
                      style={{ marginTop: 12 }}
                    >
                      Chọn một món để xem công thức chi tiết
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>
                      Bao gồm quy trình pha chế SOP, bảng định lượng BOM, tính giá vốn và mẻ lớn
                    </AppText>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* 3. Dedicated Standalone Barista Sub-App Bottom Navigation */}
      <BaristaBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        recipeCount={recipes.length}
        activeTimersCount={activeTimerCount}
      />
    </View>
  );
}

export default BaristaSOPApp;

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchStrip: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    paddingVertical: 0,
  },
  catPillContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listContainerWide: {
    padding: 16,
    gap: 12,
  },
  listContainerMobile: {
    padding: 0,
    gap: 0,
  },
  recipeCardWide: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  recipeCardMobile: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 8,
  },
  catTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  marginBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  emptyDetailPane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
