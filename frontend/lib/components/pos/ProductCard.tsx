import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../../theme/index';
import { formatPrice } from '../../utils/format';
import { shape } from '../../theme/shape';
import { MenuItem } from './types';
import { ASSETS } from '../../assets';
import { ImageSourcePropType } from 'react-native';

interface ProductCardProps {
  item: MenuItem;
  cardSize: number;
  isWide: boolean;
  inCartCount: number;
  onPress: () => void;      // Triggers options modal (size/toppings selection)
  onQuickAdd: () => void;   // Triggers quick add (default size M)
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
    'che': ASSETS.images.categoryChe,
    'tra-sua': ASSETS.images.categoryTraSua,
    'soda': ASSETS.images.categorySoda,
    'kem': ASSETS.images.categoryKem,
  };

  return (
    <TouchableOpacity
      onPress={onQuickAdd}
      activeOpacity={0.85}
      style={{
        width: cardSize,
        height: cardSize,
        borderRadius: shape.radius.md,
        overflow: 'hidden',
        backgroundColor: colors.surface.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border.default,
        position: 'relative',
      }}
    >
      {/* Background Image Layer (Set explicit width & height to avoid web native-size zoom bug) */}
      {item.image && !imageError ? (
        <Image
          source={{ uri: item.image }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <Image
          source={categoryImage[item.category] || ASSETS.images.foodPlaceholder}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      )}

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
          borderBottomLeftRadius: shape.radius.md,
          borderBottomRightRadius: shape.radius.md,
        }}
      >
        <Text style={{ ...font.bodySmall, color: '#FFFFFF', textAlign: 'center', marginBottom: 3 }} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={{ ...font.label, color: '#FDBA74', textAlign: 'center' }}>
          {formatPrice(item.price)}
        </Text>
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
          <Text style={{ color: colors.text.inverse, ...font.badge }}>{inCartCount}</Text>
        </View>
      )}

      {/* Options Button (Top Right) - Opens Modifier Modal */}
      {hasModifiers && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation(); // Stop parent onPress (quick add)
            onPress();
          }}
          activeOpacity={0.7}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            zIndex: 10,
          }}
        >
          <Icon name="tune" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
