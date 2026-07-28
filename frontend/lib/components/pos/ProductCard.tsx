import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, palette, font } from '../../theme/index';
import { formatPrice } from '../../utils/format';
import { shape } from '../../theme/shape';
import { MenuItem } from './types';
import AppText from '../ui/AppText';
import { ASSETS } from '../../assets';

interface ProductCardProps {
  item: MenuItem;
  cardSize: number;
  isWide: boolean;
  inCartCount: number;
  onPress: () => void;
  onQuickAdd: () => void;
}

const CATEGORY_STYLES: Record<string, { colors: [string, string]; icon: string; accent: string }> = {
  'sua-chua': { colors: ['#EFF6FF', '#DBEAFE'], icon: 'cow', accent: '#2563EB' },
  'tra-chanh': { colors: ['#FEFCE8', '#FEF9C3'], icon: 'leaf', accent: '#CA8A04' },
  'do-an-vat': { colors: ['#FFF7ED', '#FFEDD5'], icon: 'food-croissant', accent: '#EA580C' },
  che: { colors: ['#FDF2F8', '#FCE7F3'], icon: 'bowl-mix', accent: '#DB2777' },
  'tra-sua': { colors: ['#FAF5FF', '#F3E8FF'], icon: 'cup', accent: '#9333EA' },
  soda: { colors: ['#ECFDF5', '#D1FAE5'], icon: 'bottle-soda', accent: '#059669' },
  kem: { colors: ['#FFF1F2', '#FFE4E6'], icon: 'ice-cream', accent: '#E11D48' },
  default: { colors: ['#F5F5F7', '#E5E5EA'], icon: 'silverware-fork-knife', accent: '#8E8E93' },
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

  const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.default;
  const showPlaceholder = !item.image || imageError;

  return (
    <TouchableOpacity
      onPress={onQuickAdd}
      delayPressIn={0}
      activeOpacity={0.85}
      style={{
        width: cardSize,
        height: cardSize,
        borderRadius: shape.radius.lg,
        overflow: 'hidden',
        backgroundColor: colors.surface.card,
        borderWidth: 1.5,
        borderColor: showPlaceholder ? catStyle.accent + '25' : colors.border.default,
        position: 'relative',
      }}
    >
      {/* Background Layer: Image or Gradient */}
      {showPlaceholder ? (
        <LinearGradient
          colors={catStyle.colors}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ marginBottom: 28, opacity: 0.15 }}>
            <Icon name={catStyle.icon as any} size={cardSize * 0.32} color={catStyle.accent} />
          </View>
        </LinearGradient>
      ) : (
        <Image
          source={item.image}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onError={() => setImageError(true)}
        />
      )}

      {/* Bottom text overlay - transparent 3-stage LinearGradient transition */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.65)', 'rgba(0, 0, 0, 0.95)']}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 8,
          paddingTop: 32,
          paddingBottom: 8,
          justifyContent: 'flex-end',
        }}
      >
        <AppText
          variant="md"
          weight="bold"
          color={colors.text.inverse}
          style={{ textAlign: 'center' }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.name}
        </AppText>
        <AppText
          variant="md"
          weight="bold"
          color={palette.orange[300]}
          style={{ textAlign: 'center', marginTop: 2 }}
          numberOfLines={1}
        >
          {formatPrice(item.price)}
        </AppText>
      </LinearGradient>

      {/* Option/Modifier button at Top-Left */}
      {hasModifiers && (
        <TouchableOpacity
          onPress={onPress}
          delayPressIn={0}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            width: 26,
            height: 26,
            borderRadius: shape.radius.md,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <Icon name="tune" size={15} color={colors.text.inverse} />
        </TouchableOpacity>
      )}

      {/* Badge số lượng — Top-Right */}
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
    </TouchableOpacity>
  );
});
