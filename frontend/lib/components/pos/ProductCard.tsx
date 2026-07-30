import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/index';
import { formatPrice } from '../../utils/format';
import { MenuItem } from './types';
import AppText from '../ui/AppText';
import { haptic } from '../../haptic';

interface ProductCardProps {
  item: MenuItem;
  cardSize: number;
  isWide: boolean;
  inCartCount: number;
  onPress: () => void;
  onQuickAdd: () => void;
}

const CATEGORY_STYLES: Record<string, { bg: string; icon: string; color: string }> = {
  'sua-chua': { bg: '#EFF6FF', icon: 'cow', color: '#2563EB' },
  'tra-chanh': { bg: '#FEFCE8', icon: 'leaf', color: '#CA8A04' },
  'do-an-vat': { bg: '#FFF7ED', icon: 'food-croissant', color: '#EA580C' },
  che: { bg: '#FDF2F8', icon: 'bowl-mix', color: '#DB2777' },
  'tra-sua': { bg: '#FAF5FF', icon: 'cup', color: '#9333EA' },
  soda: { bg: '#ECFDF5', icon: 'bottle-soda', color: '#059669' },
  kem: { bg: '#FFF1F2', icon: 'ice-cream', color: '#E11D48' },
  cafe: { bg: '#FEF3C7', icon: 'coffee', color: '#B45309' },
  default: { bg: '#FFF7ED', icon: 'food-fork-drink', color: '#F97316' },
};

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

  const catStyle = CATEGORY_STYLES[item.category || ''] || CATEGORY_STYLES.default;
  const showPlaceholder = !item.image || imageError;
  const inCart = inCartCount > 0;

  const handleQuickAdd = () => {
    haptic.impact('light');
    onQuickAdd();
  };

  return (
    <TouchableOpacity
      onPress={handleQuickAdd}
      delayPressIn={0}
      activeOpacity={0.8}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      style={{
        width: cardSize,
        height: cardSize,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: inCart ? 2 : 1,
        borderColor: inCart ? '#F97316' : '#E5E9F0',
        padding: 8,
        justifyContent: 'space-between',
        position: 'relative',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      {/* Top Section: Icon / Image */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {showPlaceholder ? (
          <View
            style={{
              width: cardSize * 0.45,
              height: cardSize * 0.45,
              borderRadius: (cardSize * 0.45) / 2,
              backgroundColor: catStyle.bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={catStyle.icon as any} size={cardSize * 0.24} color={catStyle.color} />
          </View>
        ) : (
          <Image
            source={{ uri: item.image }}
            style={{ width: '100%', height: '100%', borderRadius: 6 }}
            contentFit="cover"
            transition={150}
            onError={() => setImageError(true)}
          />
        )}

        {/* Option / Customizer Icon & Sleek Orange Dot */}
        {hasModifiers && (
          <>
            <TouchableOpacity
              onPress={() => {
                haptic.impact('light');
                onPress();
              }}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 32, // Upgraded to 32px height for better touch target
                height: 32,
                borderRadius: 6,
                backgroundColor: '#F8FAFC',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
            >
              <Icon name="tune" size={14} color="#F97316" />
            </TouchableOpacity>

            <View
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#F97316',
                borderWidth: 1,
                borderColor: '#FFFFFF',
              }}
            />
          </>
        )}
      </View>

      {/* Bottom Section: Product Name & Price */}
      <View style={{ marginTop: 6, alignItems: 'center' }}>
        <AppText
          variant="md"
          color="#0F172A"
          style={{
            textAlign: 'center',
            lineHeight: 18,
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.name}
        </AppText>
        <AppText
          variant="md"
          weight="bold"
          color="#0F172A" // Pricing: sleek #0F172A as per V2 rules
          style={{
            textAlign: 'center',
            marginTop: 2,
          }}
        >
          {formatPrice(item.price)}
        </AppText>
      </View>

      {/* Cart Quantity Badge (Top-Right) */}
      {inCart && (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#F97316',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
            zIndex: 10,
          }}
        >
          <AppText
            variant="xs"
            weight="bold"
            color="#FFFFFF"
          >
            {inCartCount > 99 ? '99+' : inCartCount}
          </AppText>
        </View>
      )}
    </TouchableOpacity>
  );
});

