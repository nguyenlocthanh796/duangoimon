import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { CartItem } from './types';

interface CartSplitActionsProps {
  cart: CartItem[];
  selectedItems: Set<string>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancelSplit: () => void;
  onConfirmSplit: () => void;
}

export default function CartSplitActions({ cart, selectedItems, onSelectAll, onDeselectAll, onCancelSplit, onConfirmSplit }: CartSplitActionsProps) {
  const hasSelection = selectedItems.size >= 1;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={onSelectAll}
          style={{ flex: 1, height: 44, borderRadius: 6, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.secondary }}>CHỌN HẾT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDeselectAll}
          style={{ flex: 1, height: 44, borderRadius: 6, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.secondary }}>BỎ HẾT</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={onCancelSplit}
          style={{ flex: 1, height: 44, borderRadius: 6, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text.secondary }}>HUỶ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConfirmSplit}
          disabled={!hasSelection}
          style={{ flex: 1.5, height: 44, borderRadius: 6, backgroundColor: hasSelection ? colors.brand.primary : colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: hasSelection ? colors.text.inverse : colors.text.muted }}>TÁCH ({selectedItems.size})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
