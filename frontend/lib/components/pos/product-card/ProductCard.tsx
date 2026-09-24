import React, { useRef } from 'react';
import { StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../theme';
import { playTapSound } from '../../../utils/sound';
import { PressableScale } from '../../ui/PressableScale';
import { useAppToast } from '../../ui/AppToast';
import { ProductCardProps, getCategoryVisuals } from './types';
import { areProductCardPropsEqual } from './areProductCardPropsEqual';
import { ProductCardMedia } from './ProductCardMedia';
import { ProductGlassFooter } from './ProductGlassFooter';
import { ProductListItem } from './ProductListItem';

const ProductCardComponent: React.FC<ProductCardProps> = (props) => {
  if (!props) return null;
  const { showToast } = useAppToast();
  const {
    name,
    price,
    code,
    category,
    image,
    layoutMode = 'list',
    cartQty = 0,
    isOutOfStock = false,
    sizes,
    onPress,
    onAddSize,
    onDecrement,
    onCustomize,
    onLongPress,
    width,
  } = props;
  const { theme, isDark } = useTheme();
  const visuals = getCategoryVisuals(category);

  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  const onAddSizeRef = useRef(onAddSize);
  onAddSizeRef.current = onAddSize;
  const onDecrementRef = useRef(onDecrement);
  onDecrementRef.current = onDecrement;
  const onCustomizeRef = useRef(onCustomize);
  onCustomizeRef.current = onCustomize;
  const onLongPressRef = useRef(onLongPress);
  onLongPressRef.current = onLongPress;

  const handleQuickAdd = () => {
    if (isOutOfStock) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (_) {}
      }
      showToast({
        title: 'Món tạm hết (86)',
        message: `"${name}" hiện đang tạm hết, không thể gọi món.`,
        type: 'warning',
      });
      return;
    }
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (onPressRef.current) {
      onPressRef.current();
    }
  };

  const handleDecrement = () => {
    if (isOutOfStock) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (onDecrementRef.current) {
      onDecrementRef.current();
    }
  };

  const handleCustomize = () => {
    if (isOutOfStock) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (_) {}
    }
    if (onCustomizeRef.current) onCustomizeRef.current();
  };

  const handleLongPress = () => {
    if (!onLongPressRef.current) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (_) {}
    }
    onLongPressRef.current();
  };

  if (layoutMode === 'list') {
    return (
      <ProductListItem
        name={name}
        price={price}
        code={code}
        category={category}
        image={image}
        cartQty={cartQty}
        isOutOfStock={isOutOfStock}
        sizes={sizes}
        onPress={handleQuickAdd}
        onAddSize={onAddSizeRef.current}
        onDecrement={onDecrement ? handleDecrement : undefined}
        onCustomize={onCustomize ? handleCustomize : undefined}
        onLongPress={onLongPress ? handleLongPress : undefined}
        width={width}
      />
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Món ${name}`}
      activeScale={isOutOfStock ? 0.98 : 0.96}
      haptic="none"
      playSound={false}
      onPress={handleQuickAdd}
      onLongPress={onLongPress ? handleLongPress : undefined}
      style={[
        s.cardContainer,
        {
          backgroundColor: isDark ? theme.surface.card : visuals.bg,
          borderColor: isOutOfStock ? theme.brand.danger : theme.border.subtle,
          borderWidth: StyleSheet.hairlineWidth,
          opacity: isOutOfStock ? 0.75 : 1,
          width: width || '100%',
          ...(Platform.OS === 'web'
            ? ({
                boxShadow: isDark
                  ? '0 2px 8px rgba(0,0,0,0.2)'
                  : '0 1px 4px rgba(15,23,42,0.04)',
              } as any)
            : { elevation: 0 }),
        },
      ]}
    >
      <ProductCardMedia
        image={image}
        category={category}
        cartQty={cartQty}
        isOutOfStock={isOutOfStock}
        onCustomize={onCustomize ? handleCustomize : undefined}
      />
      <ProductGlassFooter
        name={name}
        price={price}
        isOutOfStock={isOutOfStock}
      />
    </PressableScale>
  );
};

export const ProductCard = React.memo(ProductCardComponent, areProductCardPropsEqual);

const s = StyleSheet.create({
  cardContainer: {
    minHeight: 145,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
});
