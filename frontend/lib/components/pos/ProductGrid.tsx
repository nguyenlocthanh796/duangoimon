import React, { useCallback } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { colors, font } from '../../theme/index';
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
}

export default function ProductGrid({
  products,
  loading,
  isWide,
  breakpoint,
  panelWidth,
  onProductPress,
  onQuickAdd,
  getItemCartCount,
}: ProductGridProps) {
  const CARD_GAP = 12;
  const hPad = isWide ? 12 : 4;

  const CARD_COLS = !isWide
    ? 3
    : breakpoint === 'desktop'
      ? 4
      : breakpoint === 'tablet-landscape'
        ? 4
        : 3;

  const SCROLLBAR_SAFETY = 8;
  const cardSize = Math.floor((panelWidth - hPad * 2 - CARD_GAP * (CARD_COLS - 1) - SCROLLBAR_SAFETY) / CARD_COLS);

  const renderItem = useCallback(
    ({ item }: { item: MenuItem }) => (
      <ProductCard
        key={item.id}
        item={item}
        cardSize={cardSize}
        isWide={isWide}
        inCartCount={getItemCartCount(item.id)}
        onPress={() => onProductPress(item)}
        onQuickAdd={() => onQuickAdd ? onQuickAdd(item) : onProductPress(item)}
      />
    ),
    [cardSize, isWide, onProductPress, onQuickAdd, getItemCartCount],
  );

  if (loading) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 }}
      >
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

  // FlatList with numColumns limits initial render + windowed rendering
  return (
    <FlatList
      data={products}
      key={`prods-${CARD_COLS}`}
      numColumns={CARD_COLS}
      keyExtractor={(item) => item.id}
      initialNumToRender={CARD_COLS * 4}
      maxToRenderPerBatch={CARD_COLS * 2}
      windowSize={3}
      removeClippedSubviews={true}
      columnWrapperStyle={{ gap: CARD_GAP, justifyContent: 'center' }}
      contentContainerStyle={{
        paddingHorizontal: hPad,
        paddingBottom: 24,
        gap: CARD_GAP,
      }}
      renderItem={renderItem}
      getItemLayout={(_, index) => ({
        length: cardSize + CARD_GAP,
        offset: (cardSize + CARD_GAP) * Math.floor(index / CARD_COLS),
        index,
      })}
    />
  );
}
