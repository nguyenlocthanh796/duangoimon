import React from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from '../ui';
import { ProductGridFlashList } from '../pos/ProductGridFlashList';
import { MenuItemWithModifiers, ModifierOption } from '../pos';
import { TableItem } from '../pos/TableCard';
import { useResponsive } from '../../hooks/useResponsive';
import { playTapSound } from '../../utils/sound';

interface ProductCatalogPaneProps {
  isWide: boolean;
  selectedTable: TableItem;
  searchQuery: string;
  onSetSearchQuery: (q: string) => void;
  onOpenScanner: () => void;
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  menuLayout: 'grid' | 'list';
  onToggleLayout: () => void;
  filteredMenu: MenuItemWithModifiers[];
  cartItemCounts: Record<string, number>;
  outOfStockProductIds: string[];
  onQuickAdd: (item: MenuItemWithModifiers) => void;
  onAddSize?: (item: MenuItemWithModifiers, size: ModifierOption) => void;
  onQuickDecrement?: (item: MenuItemWithModifiers) => void;
  onCustomize: (item: MenuItemWithModifiers) => void;
  onToggle86: (item: MenuItemWithModifiers) => void;
  onBackToTables?: () => void;
}

export const ProductCatalogPane: React.FC<ProductCatalogPaneProps> = ({
  searchQuery,
  onSetSearchQuery,
  onOpenScanner,
  categories,
  activeCategory,
  onSelectCategory,
  menuLayout,
  onToggleLayout,
  filteredMenu,
  cartItemCounts,
  outOfStockProductIds,
  onQuickAdd,
  onAddSize,
  onQuickDecrement,
  onCustomize,
  onToggle86,
}) => {
  const { theme, isDark } = useTheme();
  const { productColumns } = useResponsive();
  const [isFocused, setIsFocused] = React.useState(false);
  const isSearching = searchQuery.trim() !== '' || isFocused;

  if (isSearching) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[s.bannerContainer, { backgroundColor: theme.surface.app, borderBottomColor: theme.border.subtle, paddingHorizontal: 12 }]}>
          <View style={[s.searchBoxFull, { backgroundColor: theme.surface.header, borderColor: theme.brand.accent }]}>
            <Icon name="magnify" size={18} color={theme.brand.accent} />
            <TextInput
              value={searchQuery}
              onChangeText={onSetSearchQuery}
              placeholder="Tìm món, SKU..."
              placeholderTextColor={theme.text.muted}
              autoFocus
              onBlur={() => {
                if (searchQuery.trim() === '') {
                  setIsFocused(false);
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="search"
              style={[s.searchInput, { color: theme.text.primary, fontSize: 16 }]}
            />
            {searchQuery.trim() !== '' && (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Xóa tìm kiếm"
                onPress={() => {
                  playTapSound();
                  onSetSearchQuery('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close-circle" size={18} color={theme.text.muted} />
              </TouchableOpacity>
            )}
            {onOpenScanner && (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Quét mã QR món ăn"
                onPress={onOpenScanner}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="qrcode-scan" size={18} color={theme.brand.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Đóng tìm kiếm"
              onPress={() => {
                playTapSound();
                onSetSearchQuery('');
                setIsFocused(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ paddingLeft: 4 }}
            >
              <Icon name="close" size={20} color={theme.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 🌟 FLASH LIST CATALOG MÓN ĂN */}
        <ProductGridFlashList
          data={filteredMenu}
          cartItemCounts={cartItemCounts}
          outOfStockIds={outOfStockProductIds}
          totalMenuItemsCount={filteredMenu.length}
          numColumns={productColumns}
          layoutMode={menuLayout}
          onProductPress={onQuickAdd}
          onAddSize={onAddSize}
          onProductDecrement={onQuickDecrement}
          onCustomize={onCustomize}
          onProductLongPress={onToggle86}
          searchQuery={searchQuery}
          onClearSearch={searchQuery ? () => onSetSearchQuery('') : undefined}
          contentContainerStyle={{ paddingTop: 8 }}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* 🌟 BANNER ĐỒNG BỘ CHUẨN SƠ ĐỒ BÀN: [Icon Tìm Kiếm 44px Kính Mờ] -> [Dải Chip Danh Mục Món] */}
      <View style={[s.bannerContainer, { backgroundColor: theme.surface.app, borderBottomColor: theme.border.subtle }]}>
        <View style={s.bannerRow}>
          {/* 🌟 SCROLLVIEW DẢI CHIP DANH MỤC */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[s.chipsScroll, { paddingLeft: 72, paddingRight: 12 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Chips Danh Mục Món */}
            {categories.map((cat) => {
              const active = cat === activeCategory;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.75}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Danh mục ${cat}`}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch (_) {}
                    }
                    onSelectCategory(cat);
                  }}
                  style={[
                    s.catChip,
                    {
                      backgroundColor: active ? theme.brand.accent : theme.surface.header,
                      borderColor: active ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={active ? 'medium' : 'normal'}
                    color={active ? theme.text.onBrand : theme.text.primary}
                  >
                    {cat}
                  </AppText>
                </TouchableOpacity>
              );
            })}

            {/* Divider hairline giữa Danh Mục và Nút Đổi Bố Cục */}
            <View style={[s.verticalDivider, { backgroundColor: theme.border.subtle }]} />

            {/* Nút Đổi Bố Cục Grid / List */}
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={menuLayout === 'grid' ? 'Chuyển sang dạng danh sách' : 'Chuyển sang dạng lưới'}
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (_) {}
                }
                onToggleLayout();
              }}
              style={[
                s.layoutToggleChip,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.subtle,
                },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Icon
                name={menuLayout === 'grid' ? 'view-list-outline' : 'view-grid-outline'}
                size={18}
                color={theme.text.primary}
              />
            </TouchableOpacity>
          </ScrollView>

          {/* 🌟 NÚT TÌM KIẾM CỐ ĐỊNH VỚI HIỆU ỨNG MỜ DẦN BÊN NGOÀI (GRADIENT FADE EDGE) */}
          <View style={s.pinnedGlassBox} pointerEvents="box-none">
            <View style={[s.solidSearchBox, { backgroundColor: theme.surface.app }]}>
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Mở ô tìm kiếm món"
                onPress={() => {
                  playTapSound();
                  setIsFocused(true);
                }}
                style={[s.searchIconButton, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="magnify" size={20} color={theme.text.primary} />
              </TouchableOpacity>

              <View style={[s.verticalDivider, { backgroundColor: theme.border.subtle }]} />
            </View>

            {/* Dải Gradient Mờ Dần (Fade to Transparent) */}
            <Svg height={54} width={12} style={{ width: 12, height: 54 }}>
              <Defs>
                <SvgGradient id="catalogBannerFade" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={theme.surface.app} stopOpacity="1" />
                  <Stop offset="1" stopColor={theme.surface.app} stopOpacity="0" />
                </SvgGradient>
              </Defs>
              <Rect x="0" y="0" width={12} height={54} fill="url(#catalogBannerFade)" />
            </Svg>
          </View>
        </View>
      </View>

      {/* 🌟 3. FLASH LIST CATALOG MÓN ĂN */}
      <ProductGridFlashList
        data={filteredMenu}
        cartItemCounts={cartItemCounts}
        outOfStockIds={outOfStockProductIds}
        totalMenuItemsCount={filteredMenu.length}
        numColumns={productColumns}
        layoutMode={menuLayout}
        onProductPress={onQuickAdd}
        onAddSize={onAddSize}
        onProductDecrement={onQuickDecrement}
        onCustomize={onCustomize}
        onProductLongPress={onToggle86}
        searchQuery={searchQuery}
        onClearSearch={searchQuery ? () => onSetSearchQuery('') : undefined}
        contentContainerStyle={{ paddingTop: 8 }}
      />
    </View>
  );
};

const s = StyleSheet.create({
  bannerContainer: {
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 54,
    justifyContent: 'center',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 54,
  },
  pinnedGlassBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  solidSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    height: 54,
  },
  searchIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBoxFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    margin: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catChip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layoutToggleChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
});
