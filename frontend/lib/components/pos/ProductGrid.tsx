import React from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { colors, font } from '../../theme/index';
import { MenuItem } from './types';
import ProductCard from './ProductCard';
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
  const CARD_GAP = 8;
  const hPad = isWide ? 12 : 4;

  // Determine number of columns directly for pixel-perfect predictability
  const CARD_COLS = !isWide
    ? 3 // Mobile grid
    : breakpoint === 'desktop'
      ? 4
      : breakpoint === 'tablet-landscape'
        ? 4
        : 3; // tablet-portrait gets 3 columns to look optimized and compact

  // Scrollbar safety buffer: Firefox uses classic scrollbars that take ~17px of content width,
  // while Chrome uses overlay scrollbars that don't. 'scrollbar-width: thin' in global.css reduces
  // Firefox to ~6px, but we add a conservative 8px buffer here for cross-browser safety.
  const SCROLLBAR_SAFETY = 8;

  // Step 1: calculate card size using minimum padding (hPad)
  const cardSize = Math.floor((panelWidth - hPad * 2 - CARD_GAP * (CARD_COLS - 1) - SCROLLBAR_SAFETY) / CARD_COLS);

  // Step 2: calculate actual grid width, then distribute leftover space equally
  // to left and right → perfectly even margins every time
  const gridWidth = cardSize * CARD_COLS + CARD_GAP * (CARD_COLS - 1);
  const remaining = panelWidth - gridWidth - SCROLLBAR_SAFETY;
  const sidePadding = Math.max(hPad, Math.floor(remaining / 2));

  if (loading) {
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 }}
      >
        <Image
          source={ASSETS.images.loadingFood}
          style={{ width: 120, height: 120 }}
          resizeMode="contain"
        />
        <Text style={{ color: colors.text.muted, ...font.bodySmall }}>Đang tải thực đơn...</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
        <Image
          source={ASSETS.images.searchEmpty}
          style={{ width: 120, height: 120 }}
          resizeMode="contain"
        />
        <Text style={{ color: colors.text.muted, ...font.bodySmall }}>Không có món nào</Text>
      </View>
    );
  }

  return (
    <View
      key={`pg-${CARD_COLS}-${cardSize}-${sidePadding}`}
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CARD_GAP,
        paddingHorizontal: sidePadding,
      }}
    >
      {products.map((item) => (
        <ProductCard
          key={item.id}
          item={item}
          cardSize={cardSize}
          isWide={isWide}
          inCartCount={getItemCartCount(item.id)}
          onPress={() => onProductPress(item)}
          onQuickAdd={() => onQuickAdd && onQuickAdd(item)}
        />
      ))}
    </View>
  );
}
