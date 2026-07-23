import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, palette, font } from '../../theme/index';
import { formatPrice } from '../../utils/format';
import { shape } from '../../theme/shape';
import { MenuItem } from './types';
import AppText from '../ui/AppText';
import { ASSETS } from '../../assets';
import { ImageSourcePropType } from 'react-native';

interface ProductCardProps {
  item: MenuItem;
  cardSize: number;
  isWide: boolean;
  inCartCount: number;
  onPress: () => void;
  onQuickAdd: () => void;
}

export default React.memo(function ProductCard({
  item,
  cardSize,
  isWide,
  inCartCount,
  onPress,
  onQuickAdd,
}: ProductCardProps) {
  const hasModifiers = !!(item.sizes?.length || item.toppings?.length);
  const [imageError, setImageError] = React.useState(false);

  const categoryImage: Record<string, ImageSourcePropType> = {
    'sua-chua': ASSETS.images.categorySuaChua,
    'tra-chanh': ASSETS.images.categoryTraChanh,
    'do-an-vat': ASSETS.images.categoryDoAnVat,
    che: ASSETS.images.categoryChe,
    'tra-sua': ASSETS.images.categoryTraSua,
    soda: ASSETS.images.categorySoda,
    kem: ASSETS.images.categoryKem,
  };

  return (
    <TouchableOpacity
      onPress={onQuickAdd}
      activeOpacity={0.85}
      style={{
        width: cardSize,
        height: cardSize,
        borderRadius: shape.radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surface.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border.default,
        position: 'relative',
      }}
    >
      {/* Background Image Layer */}
      <Image
        source={item.image && !imageError ? item.image : (categoryImage[item.category] || ASSETS.images.foodPlaceholder)}
        style={{ position: 'absolute', width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        onError={() => setImageError(true)}
      />

      {/* Bottom text overlay — chiều cao CỐ ĐỊNH 48pt */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 48,
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          paddingHorizontal: shape.spacing.sm,
          paddingVertical: shape.spacing.xs,
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <AppText
          variant="sm"
          color={colors.text.inverse}
          style={{ textAlign: 'center' }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.name}
        </AppText>
        <AppText
          variant="sm"
          color={palette.orange[300]}
          style={{ textAlign: 'center', marginTop: 2 }}
          numberOfLines={1}
        >
          {formatPrice(item.price)}
        </AppText>
      </View>

      {/* Badge số lượng — 24pt, viền trắng 2pt */}
      {inCartCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            minWidth: 24,
            height: 24,
            borderRadius: shape.radius.full,
            backgroundColor: colors.brand.primary,
            borderWidth: 2,
            borderColor: colors.text.inverse,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            zIndex: 5,
          }}
        >
          <AppText
            variant="sm"
            weight="bold"
            color={colors.text.inverse}
            style={{ textAlign: 'center' }}
          >
            {inCartCount > 99 ? '99+' : inCartCount}
          </AppText>
        </View>
      )}

      {/* Settings/Info button to trigger modifiers */}
      {hasModifiers && (
        <TouchableOpacity
          onPress={onPress}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            padding: 4,
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: 8,
          }}
        >
          <Icon name="tune" size={16} color={colors.text.inverse} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});
