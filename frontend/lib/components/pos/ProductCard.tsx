import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme/index';
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
  onPress: () => void; // Triggers options modal (size/toppings selection)
  onQuickAdd: () => void; // Triggers quick add (default size M)
}

export default function ProductCard({
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
        borderRadius: 0, // Flat design
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
        cachePolicy="disk"
        onError={() => setImageError(true)}
      />

      {/* Full-width bottom bar overlay stretching fully across the card width */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.72)', // Dark overlay stretching fully across the card width
          paddingVertical: 10,
          paddingHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 0,
        }}
      >
        <AppText
          variant="base"
          color="#FFFFFF"
          style={{ textAlign: 'center', marginBottom: 3 }}
          numberOfLines={1}
        >
          {item.name}
        </AppText>
        <AppText variant="small" color="#FDBA74" style={{ textAlign: 'center' }}>
          {formatPrice(item.price)}
        </AppText>
      </View>

      {/* In Cart Count Badge (Top Left) */}
      {inCartCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: colors.brand.primary,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
            zIndex: 5,
          }}
        >
          <AppText variant="small" weight="bold" color={colors.text.inverse}>
              {inCartCount}
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
          <Icon name="tune" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
