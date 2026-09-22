import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { playTapSound } from '../../../utils/sound';
import { formatK } from '../../../utils/format';
import { ModifierOption } from '../ModifierSheet';

export interface ProductSizePillsProps {
  sizes: ModifierOption[];
  basePrice: number;
  onAddSize?: (size: ModifierOption) => void;
  isOutOfStock?: boolean;
  sizeQtys?: Record<string, number>;
}

const getShortSizeLabel = (name: string): string => {
  if (name.includes('(M)') || name.toLowerCase().includes('size m')) return 'M';
  if (name.includes('(L)') || name.toLowerCase().includes('size l')) return 'L';
  if (name.includes('(S)') || name.toLowerCase().includes('size s')) return 'S';
  return name.replace(/size\s*/i, '').trim().slice(0, 3);
};

export const ProductSizePills: React.FC<ProductSizePillsProps> = ({
  sizes,
  basePrice,
  onAddSize,
  isOutOfStock = false,
  sizeQtys = {},
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={s.row}>
      {sizes.map((size) => {
        const itemPrice = basePrice + (size.priceDelta || 0);
        const label = getShortSizeLabel(size.name);
        const priceStr = formatK(itemPrice);
        const qty = sizeQtys[size.id] || sizeQtys[size.name] || sizeQtys[label] || 0;
        const isSelected = qty > 0;

        return (
          <TouchableOpacity
            key={size.id || size.name}
            accessibilityRole={Platform.OS === 'web' ? 'none' : 'button'}
            accessibilityLabel={`Chọn cỡ ${label}, giá ${priceStr}${qty > 0 ? `, đã chọn ${qty}` : ''}`}
            activeOpacity={0.75}
            disabled={isOutOfStock}
            onPress={(e) => {
              e?.stopPropagation?.();
              if (isOutOfStock) return;
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch (_) {}
              }
              if (onAddSize) onAddSize(size);
            }}
            style={[
              s.pill,
              {
                backgroundColor: isSelected
                  ? theme.brand.primary
                  : isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : theme.surface.header,
                borderColor: isSelected ? theme.brand.primary : theme.border.default,
              },
            ]}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <AppText
              variant="sm"
              weight={isSelected ? 'medium' : 'normal'}
              color={isSelected ? theme.text.onBrand : theme.text.primary}
            >
              {label}
            </AppText>
            {size.priceDelta && size.priceDelta > 0 ? (
              <AppText
                variant="xxs"
                weight="medium"
                color={isSelected ? theme.text.onBrand : theme.text.muted}
                tabularNums
              >
                {`+${formatK(size.priceDelta)}`}
              </AppText>
            ) : null}

            {/* Badge số lượng hiển thị ngay góc trên phải của pill khi đã chọn */}
            {qty > 0 && (
              <View
                style={[
                  s.badgeOnPill,
                  {
                    backgroundColor: theme.brand.primary,
                    borderColor: theme.surface.card,
                  },
                ]}
              >
                <AppText variant="xxs" weight="bold" color={theme.text.onBrand} tabularNums>
                  {qty}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 44,
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  badgeOnPill: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
  },
});
