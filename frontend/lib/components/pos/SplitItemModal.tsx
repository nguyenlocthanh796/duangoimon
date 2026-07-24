import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font, shape, formatPrice } from '../../theme';
import AppText from '../ui/AppText';
import { CartItem } from './types';

interface SplitItemModalProps {
  visible: boolean;
  cart: CartItem[];
  tableName: string;
  onClose: () => void;
  onConfirmSplit: (selectedItems: { cartItemId: string; splitQty: number }[]) => void;
}

export default function SplitItemModal({
  visible,
  cart,
  tableName,
  onClose,
  onConfirmSplit,
}: SplitItemModalProps) {
  // Map of cartItemId -> qty to split
  const [splitQtyMap, setSplitQtyMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (visible) {
      setSplitQtyMap({});
    }
  }, [visible]);

  const activeItems = cart.filter((i) => !i.cancelReason);

  const handleSetSplitQty = (cartItemId: string, maxQty: number, delta: number) => {
    setSplitQtyMap((prev) => {
      const current = prev[cartItemId] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[cartItemId];
        return copy;
      }
      return { ...prev, [cartItemId]: next };
    });
  };

  const handleToggleSelectAll = () => {
    if (Object.keys(splitQtyMap).length === activeItems.length) {
      setSplitQtyMap({});
    } else {
      const all: Record<string, number> = {};
      activeItems.forEach((item) => {
        all[item.cartItemId] = item.qty;
      });
      setSplitQtyMap(all);
    }
  };

  const selectedCount = Object.values(splitQtyMap).reduce((sum, q) => sum + q, 0);
  const totalSplitPrice = activeItems.reduce((sum, item) => {
    const qty = splitQtyMap[item.cartItemId] || 0;
    return sum + item.unitPrice * qty;
  }, 0);

  const handleConfirm = () => {
    const itemsToSplit = Object.entries(splitQtyMap)
      .filter(([_, qty]) => qty > 0)
      .map(([cartItemId, splitQty]) => ({ cartItemId, splitQty }));

    if (itemsToSplit.length === 0) return;
    onConfirmSplit(itemsToSplit);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 500,
            maxHeight: '85%',
            backgroundColor: colors.surface.card,
            borderRadius: shape.radius.lg,
            overflow: 'hidden',
            elevation: 5,
          }}
        >
          {/* Header */}
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.default,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <AppText variant="lg" weight="bold" color={colors.text.primary}>
                Tách Món Từ {tableName}
              </AppText>
              <AppText variant="xs" color={colors.text.muted}>
                Chọn món và số lượng linh hoạt để tách sang bàn mới
              </AppText>
            </View>

            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Icon name="close" size={24} color={colors.icon.default} />
            </TouchableOpacity>
          </View>

          {/* Quick Toolbar */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: colors.surface.app,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: colors.border.default,
            }}
          >
            <TouchableOpacity onPress={handleToggleSelectAll}>
              <AppText variant="sm" weight="bold" color={colors.brand.primary}>
                {Object.keys(splitQtyMap).length === activeItems.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả món'}
              </AppText>
            </TouchableOpacity>

            <AppText variant="xs" color={colors.text.muted}>
              Đã chọn: <AppText variant="xs" weight="bold" color={colors.brand.primary}>{selectedCount}</AppText> món
            </AppText>
          </View>

          {/* Item List */}
          <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ gap: 12 }}>
            {activeItems.map((item) => {
              const splitQty = splitQtyMap[item.cartItemId] || 0;
              const isSelected = splitQty > 0;
              const mods = [item.selectedSize, ...(item.selectedToppings || [])].filter(Boolean).join(' · ');

              return (
                <View
                  key={item.cartItemId}
                  style={{
                    padding: 12,
                    borderRadius: shape.radius.md,
                    backgroundColor: isSelected ? colors.brand.primaryBg : colors.surface.card,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.border.brand : colors.border.default,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Left: Info */}
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <AppText variant="md" weight="bold" color={colors.text.primary} numberOfLines={1}>
                      {item.name}
                    </AppText>
                    {mods ? (
                      <AppText variant="xs" color={colors.text.muted} numberOfLines={1}>
                        {mods}
                      </AppText>
                    ) : null}
                    <AppText variant="sm" color={colors.brand.primary} style={{ marginTop: 2 }}>
                      {formatPrice(item.unitPrice)}
                    </AppText>
                  </View>

                  {/* Right: Quantity Stepper */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.surface.disabled,
                      borderRadius: shape.radius.md,
                      padding: 2,
                      borderWidth: 1,
                      borderColor: colors.border.default,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleSetSplitQty(item.cartItemId, item.qty, -1)}
                      disabled={splitQty <= 0}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: shape.radius.sm,
                        backgroundColor: splitQty > 0 ? colors.surface.card : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name="minus"
                        size={16}
                        color={splitQty > 0 ? colors.text.primary : colors.text.muted}
                      />
                    </TouchableOpacity>

                    <View style={{ width: 44, alignItems: 'center' }}>
                      <AppText variant="sm" weight="bold" color={isSelected ? colors.brand.primary : colors.text.primary}>
                        {splitQty} / {item.qty}
                      </AppText>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleSetSplitQty(item.cartItemId, item.qty, 1)}
                      disabled={splitQty >= item.qty}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: shape.radius.sm,
                        backgroundColor: splitQty < item.qty ? colors.brand.primaryBg : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name="plus"
                        size={16}
                        color={splitQty < item.qty ? colors.brand.primary : colors.text.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer Summary & Action */}
          <View
            style={{
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border.default,
              backgroundColor: colors.surface.card,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="sm" color={colors.text.secondary}>
                Tổng tiền món được tách:
              </AppText>
              <AppText variant="md" weight="bold" color={colors.brand.primary}>
                {formatPrice(totalSplitPrice)}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: shape.radius.md,
                  backgroundColor: colors.surface.disabled,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="sm" weight="bold" color={colors.text.secondary}>
                  Huỷ
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                disabled={selectedCount === 0}
                style={{
                  flex: 2,
                  height: 44,
                  borderRadius: shape.radius.md,
                  backgroundColor: selectedCount > 0 ? colors.brand.primary : colors.surface.disabled,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText
                  variant="sm"
                  weight="bold"
                  color={selectedCount > 0 ? colors.text.inverse : colors.text.muted}
                >
                  Chọn Bàn Đích ({selectedCount} món)
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
