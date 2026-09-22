import React, { useCallback } from 'react';
import { Animated, View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { ProductCard } from './ProductCard';
import { MenuItemWithModifiers, ModifierOption } from './ModifierSheet';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any);

interface ProductGridFlashListProps {
  cartItemCounts?: Record<string, number>;
  outOfStockIds?: string[];
  data: MenuItemWithModifiers[];
  numColumns: number;
  layoutMode?: 'grid' | 'list';
  onProductPress: (item: MenuItemWithModifiers) => void;
  onAddSize?: (item: MenuItemWithModifiers, size: ModifierOption) => void;
  onProductDecrement?: (item: MenuItemWithModifiers) => void;
  onCustomize?: (item: MenuItemWithModifiers) => void;
  onProductLongPress?: (item: MenuItemWithModifiers) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
  totalMenuItemsCount?: number;
  onAddProduct?: () => void;
  onLoadSampleMenu?: () => void;
  onScroll?: any;
  contentContainerStyle?: any;
}

const ProductGridItem = React.memo<{
  item: MenuItemWithModifiers;
  isList: boolean;
  layoutMode: 'grid' | 'list';
  cartQty: number;
  isOutOfStock: boolean;
  onPress: (item: MenuItemWithModifiers) => void;
  onAddSize?: (item: MenuItemWithModifiers, size: ModifierOption) => void;
  onDecrement?: (item: MenuItemWithModifiers) => void;
  onCustomize?: (item: MenuItemWithModifiers) => void;
  onLongPress?: (item: MenuItemWithModifiers) => void;
}>(({ item, isList, layoutMode, cartQty, isOutOfStock, onPress, onAddSize, onDecrement, onCustomize, onLongPress }) => {
  const effectiveSizes = item.sizes && item.sizes.length > 0 ? item.sizes : undefined;
  const canCustomize = Boolean(
    (effectiveSizes && effectiveSizes.length > 1) ||
    (item.toppings && item.toppings.length > 0) ||
    item.station === 'bar'
  );

  const handlePress = useCallback(() => {
    const hasRequired = Boolean((item as any).hasRequiredModifiers);
    if (hasRequired && onCustomize && canCustomize) {
      onCustomize(item);
    } else {
      onPress(item);
    }
  }, [onPress, onCustomize, canCustomize, item]);

  const handleAddSize = useCallback((size: ModifierOption) => {
    if (onAddSize) onAddSize(item, size);
  }, [onAddSize, item]);

  const handleDecrement = useCallback(() => {
    if (onDecrement) onDecrement(item);
  }, [onDecrement, item]);

  const handleCustomize = useCallback(() => {
    if (onCustomize) onCustomize(item);
  }, [onCustomize, item]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) onLongPress(item);
  }, [onLongPress, item]);

  return (
    <View style={isList ? s.listItemWrapper : s.gridItemWrapper}>
      <ProductCard
        name={item.name}
        price={item.price}
        code={item.code}
        category={item.category}
        image={item.image}
        layoutMode={layoutMode}
        cartQty={cartQty}
        isOutOfStock={isOutOfStock}
        sizes={effectiveSizes}
        width="100%"
        onPress={handlePress}
        onAddSize={onAddSize ? handleAddSize : undefined}
        onDecrement={onDecrement ? handleDecrement : undefined}
        onCustomize={canCustomize && onCustomize ? handleCustomize : undefined}
        onLongPress={onLongPress ? handleLongPress : undefined}
      />
    </View>
  );
}, (prev, next) => {
  return (
    prev.cartQty === next.cartQty &&
    prev.isOutOfStock === next.isOutOfStock &&
    prev.isList === next.isList &&
    prev.layoutMode === next.layoutMode &&
    prev.item.id === next.item.id &&
    prev.item.price === next.item.price &&
    prev.item.name === next.item.name &&
    prev.item.image === next.item.image &&
    prev.item.sizes?.length === next.item.sizes?.length &&
    prev.item.toppings?.length === next.item.toppings?.length &&
    prev.item.station === next.item.station &&
    prev.onPress === next.onPress &&
    prev.onAddSize === next.onAddSize &&
    prev.onDecrement === next.onDecrement &&
    prev.onCustomize === next.onCustomize &&
    prev.onLongPress === next.onLongPress
  );
});

export const ProductGridFlashList: React.FC<ProductGridFlashListProps> = React.memo(({
  data,
  numColumns,
  layoutMode = 'list',
  cartItemCounts = {},
  outOfStockIds = [],
  onProductPress,
  onAddSize,
  onProductDecrement,
  onCustomize,
  onProductLongPress,
  searchQuery,
  onClearSearch,
  totalMenuItemsCount = 0,
  onAddProduct,
  onLoadSampleMenu,
  onScroll,
  contentContainerStyle,
}) => {
  const { theme } = useTheme();
  const isList = layoutMode === 'list';
  const effectiveNumColumns = isList ? 1 : numColumns;

  const renderItem = useCallback(({ item }: { item: MenuItemWithModifiers }) => {
    const qty = cartItemCounts[item.id] || (item.code ? cartItemCounts[item.code] : 0) || 0;
    const isOutOfStock = outOfStockIds.includes(item.id) || (item.code ? outOfStockIds.includes(item.code) : false);

    return (
      <ProductGridItem
        item={item}
        isList={isList}
        layoutMode={layoutMode}
        cartQty={qty}
        isOutOfStock={isOutOfStock}
        onPress={onProductPress}
        onAddSize={onAddSize}
        onDecrement={onProductDecrement}
        onCustomize={onCustomize}
        onLongPress={onProductLongPress}
      />
    );
  }, [layoutMode, isList, onProductPress, onAddSize, onProductDecrement, onCustomize, onProductLongPress, cartItemCounts, outOfStockIds]);

  const renderEmpty = useCallback(() => {
    const isStoreCompletelyEmpty = totalMenuItemsCount === 0;

    return (
      <View style={s.emptyContainer}>
        <View
          style={[
            s.emptyCard,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <View style={[s.emptyIconCircle, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon
              name={isStoreCompletelyEmpty ? 'silverware-fork-knife' : 'food-off-outline'}
              size={32}
              color={theme.brand.primary}
            />
          </View>
          <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginTop: 14 }}>
            {searchQuery
              ? `Không tìm thấy món "${searchQuery}"`
              : isStoreCompletelyEmpty
              ? 'Thực đơn của quán chưa có món'
              : 'Chưa có món trong danh mục này'}
          </AppText>
          <AppText variant="xs" color={theme.text.muted} style={[s.emptySubtext, { maxWidth: 360, textAlign: 'center' }]}>
            {searchQuery
              ? 'Thử tìm theo tên viết tắt (vd: "tstc"), hoặc mã SKU món'
              : isStoreCompletelyEmpty
              ? 'Thêm món mới vào thực đơn để bắt đầu bán hàng hoặc nạp nhanh thực đơn mẫu F&B để dùng thử'
              : 'Chọn danh mục khác hoặc thêm món mới'}
          </AppText>
          <View style={[s.emptyActionRow, { gap: 10, marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }]}>
            {searchQuery && onClearSearch ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Xóa từ khóa tìm kiếm"
                activeOpacity={0.7}
                onPress={onClearSearch}
                style={[s.emptyBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
              >
                <Icon name="close" size={14} color={theme.text.primary} />
                <AppText variant="xs" weight="medium" color={theme.text.primary}>
                  Xóa tìm kiếm
                </AppText>
              </TouchableOpacity>
            ) : null}

            {onAddProduct ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Thêm món mới vào thực đơn"
                activeOpacity={0.8}
                onPress={onAddProduct}
                style={[
                  s.emptyBtn,
                  {
                    backgroundColor: theme.brand.primary,
                    borderColor: theme.brand.primary,
                    paddingHorizontal: 16,
                    height: 42,
                    gap: 6,
                  },
                ]}
              >
                <Icon name="plus-circle-outline" size={16} color={theme.text.onBrand} />
                <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                  + Thêm Món
                </AppText>
              </TouchableOpacity>
            ) : null}

            {isStoreCompletelyEmpty && onLoadSampleMenu ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Nạp thực đơn mẫu F&B"
                activeOpacity={0.8}
                onPress={onLoadSampleMenu}
                style={[
                  s.emptyBtn,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.subtle,
                    paddingHorizontal: 16,
                    height: 42,
                    gap: 6,
                  },
                ]}
              >
                <Icon name="lightning-bolt" size={16} color={theme.brand.primary} />
                <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                  Nạp Menu Mẫu
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  }, [searchQuery, onClearSearch, theme, totalMenuItemsCount, onAddProduct, onLoadSampleMenu]);

  const keyExtractor = useCallback((item: MenuItemWithModifiers) => item.id, []);

  return (
    <View style={s.container}>
      <AnimatedFlashList
        key={`${layoutMode}_${effectiveNumColumns}`}
        data={data}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        keyExtractor={keyExtractor}
        numColumns={effectiveNumColumns}
        estimatedItemSize={isList ? 72 : 160}
        drawDistance={Platform.OS === 'android' ? 250 : 350}
        contentContainerStyle={StyleSheet.flatten([
          isList ? s.listContentSeamless : s.listContent,
          contentContainerStyle,
        ]) as any}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        extraData={cartItemCounts}
      />
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  listContent: {
    padding: 8,
    paddingBottom: 16,
  },
  listContentSeamless: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 16,
  },
  gridItemWrapper: {
    flex: 1,
    padding: 5,
    minHeight: 145,
  },
  listItemWrapper: {
    width: '100%',
    minHeight: 64,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    width: '100%',
  },
  emptyCard: {
    maxWidth: 480,
    width: '100%',
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        } as any)
      : { elevation: 3 }),
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySubtext: {
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
