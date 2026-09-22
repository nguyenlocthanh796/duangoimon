import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { AppText } from '../../ui/AppText';
import { ModifierOption } from '../ModifierSheet';
import { ProductSizePills } from './ProductSizePills';

export interface ProductListItemActionsProps {
  isOutOfStock: boolean;
  cartQty: number;
  sizes?: ModifierOption[];
  basePrice?: number;
  onPress: () => void;
  onAddSize?: (size: ModifierOption) => void;
  onDecrement?: () => void;
  onCustomize?: () => void;
}

export const ProductListItemActions: React.FC<ProductListItemActionsProps> = ({
  isOutOfStock,
  cartQty,
  sizes,
  basePrice = 0,
  onPress,
  onAddSize,
  onDecrement,
  onCustomize,
}) => {
  const { theme } = useTheme();

  if (isOutOfStock) {
    return (
      <View style={[s.disabledBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
        <Icon name="block-helper" size={16} color={theme.text.muted} />
      </View>
    );
  }

  // 🌟 Case 1: Món có nhiều size -> Hiển thị Inline Size Pills 1-chạm vào giỏ 0ms
  if (sizes && sizes.length > 1) {
    return (
      <View style={s.actionRow}>
        <ProductSizePills
          sizes={sizes}
          basePrice={basePrice}
          onAddSize={onAddSize}
          isOutOfStock={isOutOfStock}
        />
        {onCustomize && (
          <TouchableOpacity
            accessibilityRole={Platform.OS === 'web' ? 'none' : 'button'}
            accessibilityLabel="Tùy chỉnh món"
            activeOpacity={0.7}
            delayPressIn={0}
            onPress={(e) => { e?.stopPropagation?.(); onCustomize(); }}
            style={[s.customizeBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Icon name="tune-variant" size={18} color={theme.text.muted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 🌟 Case 2: Món đã có trong giỏ -> Hiển thị Stepper (+ / -)
  if (cartQty > 0) {
    return (
      <View style={s.actionRow}>
        <View style={[s.stepper, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
          <TouchableOpacity
            accessibilityRole={Platform.OS === 'web' ? 'none' : 'button'}
            accessibilityLabel="Giảm số lượng"
            activeOpacity={0.7}
            delayPressIn={0}
            onPress={(e) => { e?.stopPropagation?.(); if (onDecrement) onDecrement(); }}
            style={s.stepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Icon
              name={cartQty === 1 ? 'trash-can-outline' : 'minus'}
              size={18}
              color={cartQty === 1 ? theme.brand.danger : theme.text.primary}
            />
          </TouchableOpacity>

          <View style={s.qtyBox}>
            <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
              {cartQty}
            </AppText>
          </View>

          <TouchableOpacity
            accessibilityRole={Platform.OS === 'web' ? 'none' : 'button'}
            accessibilityLabel="Tăng số lượng"
            activeOpacity={0.7}
            delayPressIn={0}
            onPress={(e) => { e?.stopPropagation?.(); onPress(); }}
            style={s.stepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Icon name="plus" size={18} color={theme.text.primary} />
          </TouchableOpacity>
        </View>

        {onCustomize && (
          <TouchableOpacity
            accessibilityRole={Platform.OS === 'web' ? 'none' : 'button'}
            accessibilityLabel="Tùy chỉnh món"
            activeOpacity={0.7}
            delayPressIn={0}
            onPress={(e) => { e?.stopPropagation?.(); onCustomize(); }}
            style={[s.customizeBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Icon name="tune-variant" size={18} color={theme.brand.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 🌟 Case 3: Món 1 size chưa có trong giỏ -> Đảo thứ tự: Nút [+] trước, Nút [tune] tùy chỉnh cố định sát mép phải
  return (
    <View style={s.actionRow}>
      <TouchableOpacity
        accessibilityRole={Platform.OS === 'web' ? 'none' : 'button'}
        accessibilityLabel="Thêm món nhanh"
        activeOpacity={0.8}
        delayPressIn={0}
        onPress={(e) => { e?.stopPropagation?.(); onPress(); }}
        style={[
          s.addQuickBtn,
          {
            backgroundColor: theme.isDark ? 'rgba(180, 83, 9, 0.2)' : '#FEF3C7',
            borderColor: theme.isDark ? 'rgba(180, 83, 9, 0.4)' : '#FDE68A',
          },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="plus" size={22} color={theme.brand.accent} />
      </TouchableOpacity>

      {onCustomize && (
        <TouchableOpacity
          accessibilityRole={Platform.OS === 'web' ? 'none' : 'button'}
          accessibilityLabel="Tùy chỉnh món"
          activeOpacity={0.7}
          delayPressIn={0}
          onPress={(e) => { e?.stopPropagation?.(); onCustomize(); }}
          style={[s.customizeBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Icon name="tune-variant" size={20} color={theme.text.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customizeBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  stepBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  qtyBox: { minWidth: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  addQuickBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', opacity: 0.5 },
  qtyPill: { minWidth: 20, height: 20, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
