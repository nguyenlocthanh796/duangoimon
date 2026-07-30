import React, { useCallback } from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape } from '../../theme/index';
import { formatPrice } from '../../utils/format';
import { MenuItem } from './types';
import ProductCard from './ProductCard';
import AppText from '../ui/AppText';
import { Breakpoint } from '../../hooks/useResponsive';
import { ASSETS } from '../../assets';

interface ProductGridProps {
  products: MenuItem[];
  loading: boolean;
  isWide: boolean;
  breakpoint: Breakpoint;
  panelWidth: number;
  onProductPress: (item: MenuItem) => void;
  onQuickAdd?: (item: MenuItem) => void;
  onQuickSubtract?: (item: MenuItem) => void;
  getItemCartCount: (itemId: string) => number;
  menuLayoutMode?: 'grid' | 'list'; // Dạng thẻ ảnh (grid) vs dạng danh sách (list)
}

export default function ProductGrid({
  products,
  loading,
  isWide,
  breakpoint,
  panelWidth,
  onProductPress,
  onQuickAdd,
  onQuickSubtract,
  getItemCartCount,
  menuLayoutMode = 'grid',
}: ProductGridProps) {
  const CARD_GAP = isWide ? 12 : 8;
  const hPad = isWide ? 12 : 4;

  const isListMode = menuLayoutMode === 'list';
  const CARD_COLS = isListMode
    ? 1
    : !isWide
    ? 3
    : breakpoint === 'desktop'
    ? 4
    : breakpoint === 'tablet-landscape'
    ? 4
    : 3;

  const SCROLLBAR_SAFETY = 8;
  const cardSize = Math.floor((panelWidth - hPad * 2 - CARD_GAP * (CARD_COLS - 1) - SCROLLBAR_SAFETY) / CARD_COLS);

  const renderItem = useCallback(
    ({ item }: { item: MenuItem }) => {
      const inCart = getItemCartCount(item.id);

      if (isListMode) {
        const hasModifiers = !!(item.sizes?.length || item.toppings?.length);
        // 📋 List Row View Style
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onProductPress(item)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.surface.card,
              padding: 10,
              borderRadius: shape.radius.md,
              borderWidth: inCart > 0 ? 2 : 1,
              borderColor: inCart > 0 ? colors.brand.primary : '#E2E8F0',
              marginBottom: 8,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ position: 'relative' }}>
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: 44, height: 44, borderRadius: 8 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      backgroundColor: colors.brand.primaryBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="food-fork-drink" size={22} color={colors.brand.primary} />
                  </View>
                )}

                {/* Has Modifiers Sleek Indicator Dot */}
                {hasModifiers && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#F97316',
                      borderWidth: 1.5,
                      borderColor: '#FFFFFF',
                    }}
                  />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <AppText variant="md" color={colors.text.primary} numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText variant="xs" color="#64748B" numberOfLines={1}>
                  {(() => {
                    const parts: string[] = [];
                    if (item.sizes?.length) {
                      parts.push(`Size M, ${item.sizes.map((s) => s.name).join(', ')}`);
                    }
                    if (item.toppings?.length) {
                      parts.push(`${item.toppings.length} Topping`);
                    }
                    return parts.length ? parts.join(' · ') : 'Giá cố định';
                  })()}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <AppText variant="md" weight="bold" color={colors.brand.primary}>
                {formatPrice(item.price)}
              </AppText>

              {inCart > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {/* Minus / Trash Button */}
                  <TouchableOpacity
                    onPress={() => onQuickSubtract?.(item)}
                    activeOpacity={0.7}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: inCart === 1 ? '#FEE2E2' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: inCart === 1 ? '#FCA5A5' : '#E2E8F0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={inCart === 1 ? 'trash-can-outline' : 'minus'}
                      size={16}
                      color={inCart === 1 ? '#DC2626' : '#475569'}
                    />
                  </TouchableOpacity>

                  {/* Quantity Badge */}
                  <View
                    style={{
                      backgroundColor: colors.brand.primary,
                      paddingHorizontal: 8,
                      height: 28,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="sm" weight="bold" color={colors.text.inverse}>
                      x{inCart}
                    </AppText>
                  </View>

                  {/* Plus Button */}
                  <TouchableOpacity
                    onPress={() => (onQuickAdd ? onQuickAdd(item) : onProductPress(item))}
                    activeOpacity={0.7}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.brand.primaryBg,
                      borderWidth: 1,
                      borderColor: colors.border.brand,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="plus" size={16} color={colors.brand.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => (onQuickAdd ? onQuickAdd(item) : onProductPress(item))}
                  activeOpacity={0.7}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.brand.primaryBg,
                    borderWidth: 1,
                    borderColor: colors.border.brand,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="plus" size={16} color={colors.brand.primary} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        );
      }

      // 🖼 Grid Card View Style (Default)
      return (
        <ProductCard
          key={item.id}
          item={item}
          cardSize={cardSize}
          isWide={isWide}
          inCartCount={inCart}
          onPress={() => onProductPress(item)}
          onQuickAdd={() => (onQuickAdd ? onQuickAdd(item) : onProductPress(item))}
        />
      );
    },
    [isListMode, cardSize, isWide, onProductPress, onQuickAdd, getItemCartCount]
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 }}>
        <Image
          source={ASSETS.images.loadingFood}
          style={{ width: 120, height: 120 }}
          contentFit="contain"
        />
        <AppText variant="md" color={colors.text.muted}>Đang tải thực đơn...</AppText>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
        <Image
          source={ASSETS.images.searchEmpty}
          style={{ width: 120, height: 120 }}
          contentFit="contain"
        />
        <AppText variant="md" color={colors.text.muted}>Không có món nào</AppText>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      key={`prods-${isListMode ? 'list' : CARD_COLS}`}
      numColumns={CARD_COLS}
      keyExtractor={(item) => item.id}
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={3}
      removeClippedSubviews={true}
      columnWrapperStyle={isListMode ? undefined : { gap: CARD_GAP, justifyContent: 'center' }}
      contentContainerStyle={{
        paddingHorizontal: hPad,
        paddingTop: 4,
        paddingBottom: isWide ? 24 : 120,
        gap: isListMode ? 0 : CARD_GAP,
      }}
      renderItem={renderItem}
    />
  );
}
