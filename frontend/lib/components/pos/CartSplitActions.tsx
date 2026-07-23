import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { colors, font } from '../../theme';
import { shape } from '../../theme/shape';
import { CartItem } from './types';
import AppText from '../ui/AppText';

interface CartSplitActionsProps {
  cart: CartItem[];
  selectedItems: Set<string>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancelSplit: () => void;
  onConfirmSplit: () => void;
}

export default function CartSplitActions({
  cart,
  selectedItems,
  onSelectAll,
  onDeselectAll,
  onCancelSplit,
  onConfirmSplit,
}: CartSplitActionsProps) {
  const hasSelection = selectedItems.size >= 1;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={onSelectAll}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 8,
            backgroundColor: colors.surface.disabled,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="md" color={colors.text.secondary}>CHỌN HẾT</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDeselectAll}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 8,
            backgroundColor: colors.surface.disabled,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="md" color={colors.text.secondary}>BỎ HẾT</AppText>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={onCancelSplit}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 8,
            backgroundColor: colors.surface.disabled,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText variant="md" color={colors.text.secondary}>HUỶ</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConfirmSplit}
          disabled={!hasSelection}
          style={{
            flex: 1.5,
            height: 48,
            borderRadius: 8,
            backgroundColor: hasSelection ? colors.brand.primary : colors.surface.disabled,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText
            variant="md"
            color={hasSelection ? colors.text.inverse : colors.text.muted}
          >
            TÁCH ({selectedItems.size})
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}
