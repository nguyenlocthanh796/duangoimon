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

  // ── Scale card minimum by breakpoint ──
  // Larger screens → bigger min to keep cards from looking too small
  const minCard = breakpoint === 'desktop' ? 170
    : breakpoint === 'tablet-landscape' ? 155
    : breakpoint === 'tablet-portrait' ? 140
    : 110;
  const CARD_COLS = isWide
    ? Math.max(2, Math.floor((panelWidth - hPad * 2) / minCard))
    : 3;
  const cardSize = Math.floor(
    (panelWidth - hPad * 2 - CARD_GAP * (CARD_COLS - 1)) / CARD_COLS
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 }}>
        <Image source={ASSETS.images.loadingFood} style={{ width: 120, height: 120 }} resizeMode="contain" />
        <Text style={{ color: colors.text.muted, ...font.bodySmall }}>Đang tải thực đơn...</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
        <Image source={ASSETS.images.searchEmpty} style={{ width: 120, height: 120 }} resizeMode="contain" />
        <Text style={{ color: colors.text.muted, ...font.bodySmall }}>Không có món nào</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, paddingHorizontal: isWide ? 12 : 4 }}>
      {products.map(item => (
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
