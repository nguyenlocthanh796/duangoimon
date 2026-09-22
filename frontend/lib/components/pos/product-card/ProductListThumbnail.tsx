import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { getCategoryVisuals } from './types';

export interface ProductListThumbnailProps {
  image?: string;
  category?: string;
  cartQty?: number;
  isOutOfStock?: boolean;
}

export const ProductListThumbnail: React.FC<ProductListThumbnailProps> = ({
  image,
  category,
  cartQty = 0,
  isOutOfStock = false,
}) => {
  const { theme, isDark } = useTheme();
  const [hasError, setHasError] = React.useState(false);
  const visuals = getCategoryVisuals(category);
  const showImage = Boolean(image && !hasError);

  return (
    <View style={s.listThumbWrapper}>
      {cartQty > 0 && !isOutOfStock ? (
        <View style={[s.listQtyBadge, { backgroundColor: theme.brand.accent, borderColor: theme.text.onBrand }]}>
          <AppText variant="xs" weight="medium" color={theme.text.onBrand} tabularNums>
            {cartQty}
          </AppText>
        </View>
      ) : null}
      {showImage ? (
        <ExpoImage
          source={{ uri: image }}
          style={[s.listThumbImage, isOutOfStock && { tintColor: theme.text.subtle }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={100}
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={[s.listThumbFallback, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : visuals.bg }]}>
          <Icon name={visuals.icon} size={24} color={visuals.iconColor} />
        </View>
      )}

      {isOutOfStock && (
        <View style={s.listOutOfStockOverlay}>
          <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
            HẾT
          </AppText>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  listThumbWrapper: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  listThumbImage: {
    width: '100%',
    height: '100%',
  },
  listThumbFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listOutOfStockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listQtyBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 40,
    elevation: 4,
  },
});
