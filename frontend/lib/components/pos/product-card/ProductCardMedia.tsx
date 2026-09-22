import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { getCategoryVisuals } from './types';

export interface ProductCardMediaProps {
  image?: string;
  category?: string;
  cartQty?: number;
  isOutOfStock?: boolean;
  onCustomize?: () => void;
}

export const ProductCardMedia: React.FC<ProductCardMediaProps> = ({
  image,
  category,
  cartQty = 0,
  isOutOfStock = false,
  onCustomize,
}) => {
  const { theme, isDark } = useTheme();
  const [hasError, setHasError] = React.useState(false);
  const visuals = getCategoryVisuals(category);
  const showImage = Boolean(image && !hasError);

  return (
    <>
      {/* 🌟 LỚP 1: ẢNH MÓN CROP VUÔNG 1:1 TOÀN BỘ THẺ */}
      {showImage ? (
        <ExpoImage
          source={{ uri: image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={100}
          onError={() => setHasError(true)}
        />
      ) : null}

      {/* Fallback Vector Backdrop nghệ thuật ẩm thực */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, s.fallbackArt, { opacity: showImage ? 0 : 1 }]}
      >
        <View
          style={[
            s.iconWatermark,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)' },
          ]}
        >
          <Icon name={visuals.icon} size={38} color={visuals.iconColor} />
        </View>
      </View>

      {/* 🌟 GÓC TRÊN TRÁI: BADGE ĐẾM SỐ LƯỢNG MÓN HOẶC BADGE HẾT MÓN */}
      {isOutOfStock ? (
        <View style={[s.outOfStockBadge, { backgroundColor: theme.brand.danger, borderColor: theme.text.onBrand }]}>
          <Icon name="alert-circle" size={13} color={theme.text.onBrand} />
          <AppText variant="xs" weight="medium" color={theme.text.onBrand} style={{ marginLeft: 3 }}>
            Hết món
          </AppText>
        </View>
      ) : cartQty > 0 ? (
        <View style={[s.topLeftQtyBadge, { backgroundColor: theme.brand.accent, borderColor: theme.text.onBrand }]}>
          <AppText variant="xs" weight="medium" color={theme.text.onBrand} tabularNums>
            {cartQty}
          </AppText>
        </View>
      ) : null}

      {/* 🌟 LỚP 2: GÓC TRÊN PHẢI NÚT TÙY CHỌN MÓN */}
      {onCustomize && !isOutOfStock ? (
        <TouchableOpacity
          accessibilityRole={Platform.OS === 'web' ? 'none' : 'button'}
          accessibilityLabel="Tùy chỉnh món"
          activeOpacity={0.7}
          delayPressIn={0}
          onPress={(e: any) => {
            if (e?.stopPropagation) e.stopPropagation();
            if (e?.nativeEvent?.stopPropagation) e.nativeEvent.stopPropagation();
            if (e?.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation();
            onCustomize();
          }}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={s.topCustomizeBtn}
        >
          <Icon name="tune-variant" size={16} color={theme.text.onBrand} />
        </TouchableOpacity>
      ) : null}
    </>
  );
};

const s = StyleSheet.create({
  topLeftQtyBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 40,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)' } as any)
      : { elevation: 5 }),
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 40,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 8px rgba(239, 68, 68, 0.45)' } as any)
      : { elevation: 5 }),
  },
  fallbackArt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 36,
  },
  iconWatermark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCustomizeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)', cursor: 'pointer' } as any)
      : { elevation: 4 }),
  },
});
