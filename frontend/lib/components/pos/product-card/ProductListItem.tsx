import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { PressableScale } from '../../ui/PressableScale';
import { ProductCardProps } from './types';
import { ProductListThumbnail } from './ProductListThumbnail';
import { ProductListItemActions } from './ProductListItemActions';

export type ProductListItemProps = ProductCardProps;

const ProductListItemComponent: React.FC<ProductListItemProps> = ({
  name, price, code, category, image, cartQty = 0, isOutOfStock = false, sizes,
  onPress, onAddSize, onDecrement, onCustomize, onLongPress, width,
}) => {
  const { theme, isDark } = useTheme();
  const hasMultiSizes = Boolean(sizes && sizes.length > 1);

  return (
    <View
      style={[
        s.listContainer,
        {
          backgroundColor: isOutOfStock
            ? isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)'
            : 'transparent',
          borderBottomColor: isOutOfStock ? theme.brand.danger : theme.border.subtle,
          borderBottomWidth: StyleSheet.hairlineWidth,
          opacity: isOutOfStock ? 0.72 : 1,
          width: width || '100%',
        },
      ]}
    >
      <PressableScale
        activeScale={isOutOfStock ? 0.99 : 0.97}
        haptic="none"
        playSound={false}
        onPress={onPress}
        onLongPress={onLongPress}
        style={s.pressableInfoArea}
      >
        <ProductListThumbnail image={image} category={category} cartQty={0} isOutOfStock={isOutOfStock} />
        <View style={s.listContentCol}>
          <View style={s.row1}>
            <AppText
              variant="md"
              weight="medium"
              color={isOutOfStock ? theme.text.muted : theme.text.primary}
              style={[s.dishName, isOutOfStock && { textDecorationLine: 'line-through' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {name}
            </AppText>
            {isOutOfStock && (
              <View style={[s.inlineSoldOutBadge, { backgroundColor: theme.status.dangerBg, borderColor: theme.brand.danger }]}>
                <AppText variant="xs" weight="bold" color={theme.brand.danger}>HẾT MÓN (86)</AppText>
              </View>
            )}
          </View>

          <View style={s.row2}>
            <View style={[s.priceCol, { flex: 1, minWidth: 0 }]}>
              <AppText
                variant="md"
                weight="bold"
                color={isOutOfStock ? theme.text.muted : theme.text.primary}
                tabularNums
                numberOfLines={1}
              >
                {hasMultiSizes
                  ? `${(Number.isFinite(price) ? price : 0).toLocaleString('vi-VN')} đ`
                  : `${(Number.isFinite(price) ? price : 0).toLocaleString('vi-VN')} đ`}
              </AppText>
            </View>
          </View>
        </View>
      </PressableScale>

      <View style={s.actionsCol}>
        <ProductListItemActions
          isOutOfStock={isOutOfStock}
          cartQty={cartQty}
          sizes={sizes}
          basePrice={price}
          onPress={onPress}
          onAddSize={onAddSize}
          onDecrement={onDecrement}
          onCustomize={onCustomize}
        />
      </View>
    </View>
  );
};

export const areProductListItemPropsEqual = (prev: Readonly<ProductListItemProps>, next: Readonly<ProductListItemProps>): boolean => (
  prev.name === next.name && prev.price === next.price && prev.code === next.code &&
  prev.category === next.category && prev.image === next.image && prev.cartQty === next.cartQty &&
  prev.isOutOfStock === next.isOutOfStock && prev.width === next.width &&
  prev.sizes?.length === next.sizes?.length &&
  Boolean(prev.onCustomize) === Boolean(next.onCustomize) &&
  Boolean(prev.onAddSize) === Boolean(next.onAddSize) &&
  Boolean(prev.onDecrement) === Boolean(next.onDecrement)
);

export const ProductListItem = React.memo(ProductListItemComponent, areProductListItemPropsEqual);

const s = StyleSheet.create({
  listContainer: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingVertical: 10, paddingHorizontal: 12, position: 'relative' },
  pressableInfoArea: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  listContentCol: { flex: 1, paddingLeft: 12, justifyContent: 'center', gap: 4 },
  row1: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' },
  dishName: { flex: 1 },
  inlineSoldOutBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, flexShrink: 0 },
  row2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 2 },
  priceCol: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  listSkuBadge: { paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 4 },
  actionsCol: { alignItems: 'flex-end', justifyContent: 'center' },
});
