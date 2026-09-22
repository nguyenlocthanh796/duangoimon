import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { playTapSound } from '../../utils/sound';

export interface CartItemRowProps {
  id: string;
  name: string;
  price: number;
  qty: number;
  note?: string;
  modifiers?: string;
  isTakeaway?: boolean;
  sentToKitchen?: boolean;
  sentAt?: string;
  enableKds?: boolean;
  onUpdateQty: (delta: number) => void;
  onRemove: () => void;
  onVoidPress?: () => void;
  onEdit?: () => void;
  onToggleTakeaway?: () => void;
}

const CartItemRowComponent: React.FC<CartItemRowProps> = ({
  id,
  name,
  price,
  qty,
  note,
  modifiers,
  isTakeaway,
  sentToKitchen,
  sentAt,
  enableKds = true,
  onUpdateQty,
  onRemove,
  onVoidPress,
  onEdit,
  onToggleTakeaway,
}) => {
  const { theme, isDark } = useTheme();

  const onUpdateQtyRef = useRef(onUpdateQty);
  onUpdateQtyRef.current = onUpdateQty;
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;
  const onVoidPressRef = useRef(onVoidPress);
  onVoidPressRef.current = onVoidPress;

  const handleQtyChange = (delta: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (qty + delta <= 0) {
      if (enableKds && sentToKitchen && onVoidPressRef.current) {
        onVoidPressRef.current();
      } else {
        onRemoveRef.current();
      }
    } else {
      onUpdateQtyRef.current(delta);
    }
  };

  const itemTotal = price * qty;

  return (
    <View
      style={[
        s.row,
        {
          backgroundColor: theme.surface.card,
          borderColor: theme.border.default,
        },
      ]}
    >
      {/* HÀNG 1: TÊN MÓN + BADGE BẾP + BADGE MANG VỀ ↔ THÀNH TIỀN + NÚT XÓA */}
      <View style={s.row1}>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!onEdit}
          onPress={() => {
            playTapSound();
            onEdit?.();
          }}
          style={s.titleCol}
        >
          <AppText variant="md" weight="normal" color={theme.text.primary} numberOfLines={2} style={s.itemName}>
            {name}
          </AppText>

          {/* Badge trạng thái bếp (Chỉ hiện khi BẬT KDS) */}
          {enableKds && (
            sentToKitchen ? (
              <View style={[s.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', marginTop: 2 }]}>
                <Icon name="check" size={11} color={theme.brand.success} />
                <AppText variant="xs" weight="medium" color={theme.brand.success} style={s.badgeText}>
                  Bếp
                </AppText>
              </View>
            ) : (
              <View style={[s.statusBadge, { backgroundColor: theme.brand.primaryBg, marginTop: 2 }]}>
                <Icon name="clock-outline" size={11} color={theme.brand.primary} />
                <AppText variant="xs" weight="medium" color={theme.brand.primary} style={s.badgeText}>
                  Mới
                </AppText>
              </View>
            )
          )}

          {/* Badge Mang Về */}
          {isTakeaway ? (
            <View style={[s.statusBadge, { backgroundColor: 'rgba(180, 83, 9, 0.12)', borderColor: theme.brand.accent, borderWidth: StyleSheet.hairlineWidth, marginTop: 2 }]}>
              <Icon name="shopping-outline" size={11} color={theme.brand.accent} />
              <AppText variant="xs" weight="medium" color={theme.brand.accent} style={s.badgeText}>
                Mang về
              </AppText>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Cột phải Hàng 1: Thành tiền to rõ + Nút xóa */}
        <View style={s.priceAndDeleteCol}>
          <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums style={s.totalPrice}>
            {itemTotal.toLocaleString('vi-VN')} đ
          </AppText>

          {enableKds && sentToKitchen && onVoidPress ? (
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Hủy món đã gửi bếp"
              onPress={() => {
                playTapSound();
                onVoidPressRef.current?.();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[s.deleteBtn, { backgroundColor: theme.status.dangerBg }]}
            >
              <Icon name="close" size={15} color={theme.brand.danger} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Xóa món khỏi giỏ hàng"
              onPress={() => {
                playTapSound();
                onRemoveRef.current();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[s.deleteBtn, { backgroundColor: theme.status.dangerBg }]}
            >
              <Icon name="trash-can-outline" size={15} color={theme.brand.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* HÀNG 2: TÙY CHỈNH / ĐƠN GIÁ ↔ CỤM STEPPER TĂNG GIẢM */}
      <View style={s.row2}>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!onEdit}
          onPress={() => {
            playTapSound();
            onEdit?.();
          }}
          style={{ flex: 1, paddingRight: 8 }}
        >
          {modifiers ? (
            <AppText variant="xs" color={theme.brand.primary} weight="medium" numberOfLines={1}>
              {modifiers}
            </AppText>
          ) : null}
          <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: modifiers ? 2 : 0 }}>
            {price.toLocaleString('vi-VN')} đ / phần
          </AppText>
        </TouchableOpacity>

        {/* Stepper to rõ ràng */}
        <View style={[s.stepper, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Bớt 1 phần"
            onPress={() => handleQtyChange(-1)}
            style={s.stepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name={qty === 1 ? 'trash-can-outline' : 'minus'}
              size={16}
              color={qty === 1 ? theme.brand.danger : theme.text.primary}
            />
          </TouchableOpacity>

          <View style={s.qtyBox}>
            <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
              {qty}
            </AppText>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Thêm 1 phần"
            onPress={() => handleQtyChange(1)}
            style={s.stepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="plus" size={16} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* HÀNG 3: GHI CHÚ BẾP RIÊNG (NẾU CÓ NOTE) */}
      {note ? (
        <View style={[s.noteRibbon, { backgroundColor: theme.status.warningBg }]}>
          <Icon name="note-text-outline" size={13} color={theme.brand.warning} />
          <AppText variant="xs" color={theme.brand.warning} weight="medium" style={s.noteText} numberOfLines={1}>
            Ghi chú: {note}
          </AppText>
        </View>
      ) : null}
    </View>
  );
};

export const areCartItemRowPropsEqual = (
  prev: Readonly<CartItemRowProps>,
  next: Readonly<CartItemRowProps>
): boolean => {
  return (
    prev.id === next.id &&
    prev.name === next.name &&
    prev.qty === next.qty &&
    prev.price === next.price &&
    prev.note === next.note &&
    prev.modifiers === next.modifiers &&
    prev.sentToKitchen === next.sentToKitchen &&
    prev.sentAt === next.sentAt &&
    prev.enableKds === next.enableKds &&
    Boolean(prev.isTakeaway) === Boolean(next.isTakeaway)
  );
};

export const CartItemRow = React.memo(CartItemRowComponent, areCartItemRowPropsEqual);


const s = StyleSheet.create({
  row: {
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginRight: 6,
  },
  itemName: {
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    flexShrink: 0,
  },
  badgeText: {},
  priceAndDeleteCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  totalPrice: {},
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBox: {
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
  },
});
