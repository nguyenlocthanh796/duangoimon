import React from 'react';
import {
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { AppHeader } from '../ui/AppHeader';
import { PressableScale } from '../ui/PressableScale';
import { CartItem, useStoreSettings } from '../../store/usePOSStore';
import { useAppToast } from '../ui';
import { CupStickerPreviewModal } from './CupStickerPreviewModal';
import { generateCupStickers, CupStickerData } from '../../utils/labelPrinter';
import { playTapSound } from '../../utils/sound';
import { ModifierSheet, SelectedModifierData, MenuItemWithModifiers } from './ModifierSheet';
import { TableOperationsModal } from './TableOperationsModal';

interface FullScreenCartModalProps {
  visible: boolean;
  tableName: string;
  tableArea?: string;
  cart: CartItem[];
  discount?: { type: 'percent' | 'fixed'; value: number; note?: string };
  onClose: () => void;
  onUpdateQty: (cartItemId: string, delta: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onVoidItem?: (item: CartItem) => void;
  onEditItem?: (item: CartItem) => void;
  onUpdateCartItem?: (cartItemId: string, data: SelectedModifierData) => void;
  onOpenOperations: () => void;
  onSendToKitchen: () => void;
  onCheckout: () => void;
  onPickTable?: () => void;
  onPrintPreBill?: () => void;
  onOpenDiscount?: () => void;
}

// 🌟 THÀNH PHẦN DÒNG MÓN GIỎ HÀNG (ZERO-LAG, ZERO TOUCH CONFLICT TRÊN IOS)
const SwipeableCartItemComponent: React.FC<{
  item: CartItem;
  isLast: boolean;
  theme: any;
  isDark: boolean;
  enableKds?: boolean;
  onEdit: () => void;
  onStepQty: (delta: number) => void;
  onRemove: () => void;
}> = ({ item, isLast, theme, isDark, enableKds = true, onEdit, onStepQty, onRemove }) => {
  const modsList: string[] = [];
  if (item.selectedSize) modsList.push(item.selectedSize);
  if (item.sugarLevel && item.sugarLevel !== '100%') modsList.push(`${item.sugarLevel} Đường`);
  if (item.iceLevel && item.iceLevel !== '100%') modsList.push(`${item.iceLevel} Đá`);
  if (item.selectedToppings && item.selectedToppings.length > 0) {
    modsList.push(`+${item.selectedToppings.join(', ')}`);
  }

  const itemTotal = item.unitPrice * item.qty;
  const isSent = item.sentToKitchen;

  return (
    <View
      style={[
        s.seamlessItemRow,
        {
          backgroundColor: theme.surface.card,
          borderBottomColor: theme.border.default,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {/* HÀNG 1: TÊN MÓN + BADGE BẾP ↔ THÀNH TIỀN (CHẠM ĐỂ SỬA) */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onEdit}
        style={s.row1}
      >
        <View style={s.titleCol}>
          <AppText
            variant="md"
            weight="normal"
            color={theme.text.primary}
            style={s.itemNameText}
            numberOfLines={2}
          >
            {item.item.name}
          </AppText>

          {/* Badge trạng thái bếp (Chỉ hiện khi BẬT KDS) */}
          {enableKds && (
            isSent ? (
              <View style={[s.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Icon name="check" size={11} color={theme.brand.success} />
                <AppText variant="xs" weight="medium" color={theme.brand.success} style={s.badgeText}>
                  Bếp
                </AppText>
              </View>
            ) : (
              <View style={[s.statusBadge, { backgroundColor: theme.brand.primaryBg }]}>
                <Icon name="clock-outline" size={11} color={theme.brand.primary} />
                <AppText variant="xs" weight="medium" color={theme.brand.primary} style={s.badgeText}>
                  Mới
                </AppText>
              </View>
            )
          )}

          {/* Badge Mang Về */}
          {item.isTakeaway ? (
            <View style={[s.statusBadge, { backgroundColor: 'rgba(180, 83, 9, 0.12)', borderColor: theme.brand.accent, borderWidth: StyleSheet.hairlineWidth }]}>
              <Icon name="shopping-outline" size={11} color={theme.brand.accent} />
              <AppText variant="xs" weight="medium" color={theme.brand.accent} style={s.badgeText}>
                Mang về
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Thành tiền to rõ ràng */}
        <AppText
          variant="md"
          weight="medium"
          color={theme.text.primary}
          tabularNums
          style={s.itemTotalAmount}
        >
          {itemTotal.toLocaleString('vi-VN')} đ
        </AppText>
      </TouchableOpacity>

      {/* HÀNG 2: TÙY CHỈNH & ĐƠN GIÁ ↔ CỤM STEPPER TĂNG GIẢM TO BẢN 40PX */}
      <View style={s.row2Compact}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEdit}
          style={{ flex: 1, paddingRight: 10 }}
        >
          {modsList.length > 0 ? (
            <AppText
              variant="xs"
              color={theme.brand.primary}
              weight="medium"
              numberOfLines={2}
              style={s.modsText}
            >
              {modsList.join(' · ')}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: modsList.length > 0 ? 2 : 0, flexWrap: 'wrap' }}>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              {item.unitPrice.toLocaleString('vi-VN')} đ / phần
            </AppText>
            <View
              style={[
                s.takeawayInlineChip,
                {
                  backgroundColor: item.isTakeaway ? 'rgba(180, 83, 9, 0.12)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  borderColor: item.isTakeaway ? theme.brand.accent : theme.border.default,
                },
              ]}
            >
              <Icon
                name={item.isTakeaway ? 'shopping-outline' : 'table-chair'}
                size={11}
                color={item.isTakeaway ? theme.brand.accent : theme.text.muted}
              />
              <AppText
                variant="xxs"
                weight={item.isTakeaway ? 'bold' : 'normal'}
                color={item.isTakeaway ? theme.brand.accent : theme.text.muted}
              >
                {item.isTakeaway ? 'Mang về' : 'Tại chỗ'}
              </AppText>
            </View>
          </View>
        </TouchableOpacity>

        {/* Cụm Stepper [-] QTY [+] to rõ ràng (40px) */}
        <View style={[s.ergonomicStepper, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onStepQty(-1)}
            style={s.stepperBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={item.qty === 1 ? `Xóa món ${item.item.name}` : `Giảm số lượng món ${item.item.name}`}
          >
            <Icon
              name={item.qty === 1 ? 'trash-can-outline' : 'minus'}
              size={18}
              color={item.qty === 1 ? theme.brand.danger : theme.text.primary}
            />
          </TouchableOpacity>

          <View style={s.stepperQtyBox} accessibilityLabel={`Số lượng: ${item.qty}`}>
            <AppText
              variant="md"
              weight="medium"
              color={theme.text.primary}
              tabularNums
            >
              {item.qty}
            </AppText>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onStepQty(1)}
            style={s.stepperBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={`Tăng số lượng món ${item.item.name}`}
          >
            <Icon name="plus" size={18} color={theme.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* HÀNG 3: GHI CHÚ BẾP RIÊNG (CHỈ HIỆN KHI CÓ NOTE) */}
      {item.note ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onEdit}
          style={[s.noteRibbon, { backgroundColor: theme.status.warningBg }]}
        >
          <Icon name="note-text-outline" size={13} color={theme.brand.warning} />
          <AppText variant="xs" color={theme.brand.warning} weight="medium" style={s.noteRibbonText} numberOfLines={1}>
            Ghi chú: {item.note}
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export const areSwipeableCartItemPropsEqual = (
  prev: Readonly<{
    item: CartItem;
    isLast: boolean;
    theme: any;
    isDark: boolean;
    enableKds?: boolean;
    onEdit: () => void;
    onStepQty: (delta: number) => void;
    onRemove: () => void;
  }>,
  next: Readonly<{
    item: CartItem;
    isLast: boolean;
    theme: any;
    isDark: boolean;
    enableKds?: boolean;
    onEdit: () => void;
    onStepQty: (delta: number) => void;
    onRemove: () => void;
  }>
): boolean => {
  const p = prev.item;
  const n = next.item;
  return (
    p.cartItemId === n.cartItemId &&
    p.qty === n.qty &&
    p.unitPrice === n.unitPrice &&
    p.note === n.note &&
    p.sentToKitchen === n.sentToKitchen &&
    p.selectedSize === n.selectedSize &&
    p.sugarLevel === n.sugarLevel &&
    p.iceLevel === n.iceLevel &&
    p.item.name === n.item.name &&
    Boolean(p.isTakeaway) === Boolean(n.isTakeaway) &&
    (p.selectedToppings || []).join(',') === (n.selectedToppings || []).join(',') &&
    prev.isLast === next.isLast &&
    prev.isDark === next.isDark &&
    prev.enableKds === next.enableKds
  );
};

const SwipeableCartItem = React.memo(SwipeableCartItemComponent, areSwipeableCartItemPropsEqual);


import { aggregateCartItems, AggregatedCartItem, getBatchInfo } from '../../utils/cartAlgorithms';

export const FullScreenCartModal: React.FC<FullScreenCartModalProps> = ({
  visible,
  tableName,
  tableArea = 'Tầng Trệt',
  cart,
  discount,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onVoidItem,
  onEditItem,
  onUpdateCartItem,
  onOpenOperations,
  onSendToKitchen,
  onCheckout,
  onPickTable,
  onPrintPreBill,
  onOpenDiscount,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [showCupModal, setShowCupModal] = React.useState(false);
  const [cupStickers, setCupStickers] = React.useState<CupStickerData[]>([]);
  const [showTableOpsModal, setShowTableOpsModal] = React.useState(false);
  const [cartViewMode, setCartViewMode] = React.useState<'batches' | 'aggregated'>('batches');

  const settings = useStoreSettings();
  const enableKds = settings?.enableKds ?? true;
  const { showToast } = useAppToast();

  const aggregatedCart = React.useMemo(() => aggregateCartItems(cart), [cart]);

  const handleOpenCupStickers = () => {
    if (cart.length === 0) return;
    playTapSound();
    const stickers = generateCupStickers(
      tableName === 'Chưa Chọn Bàn' ? 'DON-MOI' : tableName,
      tableName,
      cart,
      settings.storeName || 'ONGCHU POS'
    );
    setCupStickers(stickers);
    setShowCupModal(true);
  };

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const subTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);

  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'percent') {
      discountAmount = Math.round(subTotal * (discount.value / 100));
    } else {
      discountAmount = Math.min(discount.value, subTotal);
    }
  }

  const totalAmount = Math.max(0, subTotal - discountAmount);

  const handleStepQty = (item: CartItem, delta: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (enableKds && item.sentToKitchen && (item.qty + delta <= 0 || delta < 0)) {
      if (onVoidItem) {
        onVoidItem(item);
        return;
      }
    }
    if (item.qty + delta <= 0) {
      onRemoveItem(item.cartItemId);
    } else {
      onUpdateQty(item.cartItemId, delta);
    }
  };

  const handleRemove = (item: CartItem) => {
    playTapSound();
    if (enableKds && item.sentToKitchen && onVoidItem) {
      onVoidItem(item);
    } else {
      onRemoveItem(item.cartItemId);
    }
  };

  const handleAggregatedStepQty = (agg: AggregatedCartItem, delta: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (delta > 0) {
      const targetItem = agg.sourceItems[agg.sourceItems.length - 1];
      onUpdateQty(targetItem.cartItemId, delta);
    } else {
      const unsentItems = agg.sourceItems.filter((it) => !it.sentToKitchen);
      if (unsentItems.length > 0) {
        const targetItem = unsentItems[unsentItems.length - 1];
        if (targetItem.qty <= 1) {
          onRemoveItem(targetItem.cartItemId);
        } else {
          onUpdateQty(targetItem.cartItemId, -1);
        }
      } else {
        const sentItems = agg.sourceItems.filter((it) => it.sentToKitchen);
        if (sentItems.length > 0 && onVoidItem) {
          onVoidItem(sentItems[sentItems.length - 1]);
        }
      }
    }
  };

  const [editingCartItem, setEditingCartItem] = React.useState<SelectedModifierData | null>(null);
  const [modifierItem, setModifierItem] = React.useState<MenuItemWithModifiers | null>(null);
  const [modifierVisible, setModifierVisible] = React.useState(false);

  const handleItemPress = (item: CartItem) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (onUpdateCartItem) {
      setEditingCartItem({
        cartItemId: item.cartItemId,
        item: item.item,
        qty: item.qty,
        selectedSize: item.selectedSize,
        sugarLevel: item.sugarLevel,
        iceLevel: item.iceLevel,
        selectedToppings: item.selectedToppings || [],
        note: item.note || '',
        unitPrice: item.unitPrice,
        isTakeaway: item.isTakeaway,
      });
      setModifierItem(item.item);
      setModifierVisible(true);
    } else if (onEditItem) {
      onEditItem(item);
    }
  };

  if (!visible) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 99999,
          backgroundColor: theme.surface.app,
        },
      ]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <View
        style={[
          s.fullContainer,
          {
            backgroundColor: theme.surface.app,
          },
        ]}
      >
        <AppHeader
          showBack
          onBack={onClose}
          title={tableName === 'Chưa Chọn Bàn' ? 'Đơn Mới' : `Giỏ Hàng · ${tableName}`}
          subtitle={
            tableName === 'Chưa Chọn Bàn'
              ? 'Chưa Gán Bàn · Chạm để gán bàn'
              : `${tableArea ? `${tableArea} · ` : ''}${cart.length} món (${totalQty} phần)`
          }
          onTitlePress={() => {
            playTapSound();
            if (onPickTable) onPickTable();
            else onOpenOperations();
          }}
          titleRightIcon="chevron-down"
          rightCustom={
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={tableName === 'Chưa Chọn Bàn' ? 'Gán bàn cho đơn' : 'Tác vụ bàn'}
              onPress={() => {
                playTapSound();
                if (tableName === 'Chưa Chọn Bàn' && onPickTable) {
                  onPickTable();
                } else {
                  setShowTableOpsModal(true);
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                s.opsHeaderBtn,
                {
                  backgroundColor: theme.status.warningBg,
                  borderColor: theme.brand.accent,
                },
              ]}
            >
              <Icon
                name={tableName === 'Chưa Chọn Bàn' ? 'table-chair' : 'table-cog'}
                size={18}
                color={theme.brand.accent}
              />
              <AppText
                variant="xs"
                weight="medium"
                color={theme.brand.accent}
              >
                {tableName === 'Chưa Chọn Bàn' ? 'Gán Bàn' : 'Tác vụ bàn'}
              </AppText>
            </TouchableOpacity>
          }
        />

        {/* 🌟 THANH CHUYỂN ĐỔI CHẾ ĐỘ XEM: LẦN GỌI ↔ GỘP MÓN TRÙNG (1-CHẠM CHECK NHANH) */}
        {cart.length > 0 && (
          <View style={[s.viewModeSwitcherBar, { backgroundColor: theme.surface.header, borderBottomColor: theme.border.subtle }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                setCartViewMode('batches');
              }}
              style={[
                s.modeSwitchBtn,
                cartViewMode === 'batches' && [
                  s.modeSwitchBtnActive,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : theme.surface.card,
                    borderColor: theme.brand.accent,
                  },
                ],
              ]}
            >
              <Icon
                name="format-list-bulleted"
                size={14}
                color={cartViewMode === 'batches' ? theme.brand.accent : theme.text.muted}
              />
              <AppText
                variant="xs"
                weight={cartViewMode === 'batches' ? 'bold' : 'normal'}
                color={cartViewMode === 'batches' ? theme.text.primary : theme.text.muted}
              >
                Lần Gọi ({cart.length})
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                setCartViewMode('aggregated');
              }}
              style={[
                s.modeSwitchBtn,
                cartViewMode === 'aggregated' && [
                  s.modeSwitchBtnActive,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : theme.surface.card,
                    borderColor: theme.brand.accent,
                  },
                ],
              ]}
            >
              <Icon
                name="layers-outline"
                size={14}
                color={cartViewMode === 'aggregated' ? theme.brand.accent : theme.text.muted}
              />
              <AppText
                variant="xs"
                weight={cartViewMode === 'aggregated' ? 'bold' : 'normal'}
                color={cartViewMode === 'aggregated' ? theme.text.primary : theme.text.muted}
              >
                Gộp Món ({aggregatedCart.length})
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.scrollBody,
            { paddingBottom: (insets.bottom > 0 ? Math.round(insets.bottom * 0.25) : 2) + 96 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {cart.length === 0 ? (
            <View style={s.emptyBox}>
              <Icon name="cart-off" size={56} color={theme.text.muted} />
              <AppText variant="md" weight="normal" color={theme.text.primary} style={{ marginTop: 12 }}>
                Giỏ hàng đang trống
              </AppText>
              <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 4, textAlign: 'center' }}>
                Chạm vào các món trong thực đơn để thêm vào giỏ.
              </AppText>
            </View>
          ) : cartViewMode === 'aggregated' ? (
            /* 🌟 CHẾ ĐỘ XEM GỘP MÓN TRÙNG (TỔNG HỢP NHANH) */
            <View style={[s.seamlessListContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
              {aggregatedCart.map((agg, index) => {
                const isLast = index === aggregatedCart.length - 1;
                const hasSent = agg.sentQty > 0;
                const hasNew = agg.newQty > 0;

                return (
                  <View
                    key={agg.key}
                    style={[
                      s.seamlessItemRow,
                      {
                        borderBottomColor: theme.border.default,
                        borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    {/* HÀNG 1: TÊN MÓN + TAG LẦN GỌI + BADGE BẾP + BADGE MANG VỀ ↔ THÀNH TIỀN TỔNG */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        if (agg.sourceItems.length > 0) {
                          handleItemPress(agg.sourceItems[0]);
                        }
                      }}
                      style={s.row1}
                    >
                      <View style={s.titleCol}>
                        <AppText
                          variant="md"
                          weight="medium"
                          color={theme.text.primary}
                          style={s.itemNameText}
                          numberOfLines={2}
                        >
                          {agg.item.name}
                        </AppText>

                        {agg.sourceItems.length > 1 && (
                          <View style={[s.batchPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                            <AppText variant="xxs" weight="medium" color={theme.brand.accent}>
                              {agg.sourceItems.length} lần gọi
                            </AppText>
                          </View>
                        )}

                        {/* Badge trạng thái bếp */}
                        {hasSent && hasNew ? (
                          <View style={[s.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                            <Icon name="progress-clock" size={11} color={theme.brand.warning} />
                            <AppText variant="xs" weight="medium" color={theme.brand.warning} style={s.badgeText} tabularNums>
                              {agg.sentQty} đã gửi · {agg.newQty} mới
                            </AppText>
                          </View>
                        ) : hasSent ? (
                          <View style={[s.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                            <Icon name="check" size={11} color={theme.brand.success} />
                            <AppText variant="xs" weight="medium" color={theme.brand.success} style={s.badgeText} tabularNums>
                              Đã gửi bếp ({agg.sentQty})
                            </AppText>
                          </View>
                        ) : (
                          <View style={[s.statusBadge, { backgroundColor: theme.brand.primaryBg }]}>
                            <Icon name="clock-outline" size={11} color={theme.brand.primary} />
                            <AppText variant="xs" weight="medium" color={theme.brand.primary} style={s.badgeText} tabularNums>
                              Chưa gửi bếp ({agg.newQty})
                            </AppText>
                          </View>
                        )}

                        {/* Badge Mang Về */}
                        {agg.isTakeaway && (
                          <View style={[s.statusBadge, { backgroundColor: 'rgba(180, 83, 9, 0.12)', borderColor: theme.brand.accent, borderWidth: StyleSheet.hairlineWidth }]}>
                            <Icon name="shopping-outline" size={11} color={theme.brand.accent} />
                            <AppText variant="xs" weight="medium" color={theme.brand.accent} style={s.badgeText}>
                              Mang về
                            </AppText>
                          </View>
                        )}
                      </View>

                      <AppText
                        variant="md"
                        weight="bold"
                        color={theme.text.primary}
                        tabularNums
                        style={s.itemTotalAmount}
                      >
                        {agg.totalAmount.toLocaleString('vi-VN')} đ
                      </AppText>
                    </TouchableOpacity>

                    {/* HÀNG 2: TÙY CHỈNH & ĐƠN GIÁ ↔ STEPPER TỔNG */}
                    <View style={s.row2Compact}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          if (agg.sourceItems.length > 0) {
                            handleItemPress(agg.sourceItems[0]);
                          }
                        }}
                        style={{ flex: 1, paddingRight: 10 }}
                      >
                        {agg.modifiersText ? (
                          <AppText
                            variant="xs"
                            color={theme.brand.primary}
                            weight="medium"
                            numberOfLines={2}
                            style={s.modsText}
                          >
                            {agg.modifiersText}
                          </AppText>
                        ) : null}
                        <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: agg.modifiersText ? 2 : 0 }}>
                          {agg.unitPrice.toLocaleString('vi-VN')} đ / phần
                        </AppText>
                      </TouchableOpacity>

                      <View style={[s.ergonomicStepper, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleAggregatedStepQty(agg, -1)}
                          style={s.stepperBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Giảm số lượng món ${agg.item.name}`}
                        >
                          <Icon
                            name={agg.totalQty === 1 && !hasSent ? 'trash-can-outline' : 'minus'}
                            size={18}
                            color={agg.totalQty === 1 && !hasSent ? theme.brand.danger : theme.text.primary}
                          />
                        </TouchableOpacity>

                        <View style={s.stepperQtyBox} accessibilityLabel={`Số lượng: ${agg.totalQty}`}>
                          <AppText
                            variant="md"
                            weight="bold"
                            color={theme.text.primary}
                            tabularNums
                          >
                            {agg.totalQty}
                          </AppText>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleAggregatedStepQty(agg, 1)}
                          style={s.stepperBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessibilityRole="button"
                          accessibilityLabel={`Tăng số lượng món ${agg.item.name}`}
                        >
                          <Icon name="plus" size={18} color={theme.text.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* HÀNG 3: GHI CHÚ */}
                    {agg.note ? (
                      <View style={[s.noteRibbon, { backgroundColor: theme.status.warningBg }]}>
                        <Icon name="note-text-outline" size={13} color={theme.brand.warning} />
                        <AppText variant="xs" color={theme.brand.warning} weight="medium" style={s.noteRibbonText} numberOfLines={1}>
                          Ghi chú: {agg.note}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            /* CHẾ ĐỘ XEM THEO TỪNG LẦN GỌI (BATCHES - MẶC ĐỊNH) */
            <View style={[s.seamlessListContainer, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
              {cart.map((c, index) => {
                const isLast = index === cart.length - 1;
                const batchInfo = enableKds ? getBatchInfo(cart, index) : null;
                return (
                  <React.Fragment key={c.cartItemId}>
                    {batchInfo ? (
                      <View style={s.batchBadgeRow}>
                        <View
                          style={[
                            s.batchBadgePill,
                            {
                              backgroundColor: batchInfo.isUnsent
                                ? (isDark ? 'rgba(180, 83, 9, 0.18)' : 'rgba(180, 83, 9, 0.08)')
                                : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                              borderColor: batchInfo.isUnsent ? theme.brand.accent : theme.border.default,
                            },
                          ]}
                        >
                          <Icon
                            name={batchInfo.isUnsent ? 'lightning-bolt' : 'clock-outline'}
                            size={12}
                            color={batchInfo.isUnsent ? theme.brand.accent : theme.text.muted}
                          />
                          <AppText
                            variant="xs"
                            weight="medium"
                            color={batchInfo.isUnsent ? theme.brand.accent : theme.text.primary}
                            tabularNums
                          >
                            {batchInfo.label}
                          </AppText>
                        </View>
                      </View>
                    ) : null}
                    <SwipeableCartItem
                      item={c}
                      isLast={isLast}
                      theme={theme}
                      isDark={isDark}
                      enableKds={enableKds}
                      onEdit={() => handleItemPress(c)}
                      onStepQty={(delta) => handleStepQty(c, delta)}
                      onRemove={() => handleRemove(c)}
                    />
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* 🌟 3. THANH DOCK CỐ ĐỊNH Ở ĐÁY (CHUẨN 100% FORM ẢNH 1 KÈM DÒNG BÓC TÁCH TÀI CHÍNH GỌN GÀNG) */}
        <View
          style={[
            s.bottomDock,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.glassBorder,
              paddingBottom: insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4,
              paddingLeft: Math.max(insets.left, 8),
              paddingRight: Math.max(insets.right, 8),
            },
          ]}
        >
          {/* Băng bóc tách tài chính tinh tế: Tạm tính, Chiết khấu & Tổng thanh toán */}
          <View style={[s.financeMicroBar, { borderBottomColor: theme.border.subtle }]}>
            <View style={s.financeLeftGroup}>
              <AppText variant="xxs" color={theme.text.muted}>
                Tạm tính: <AppText variant="xxs" weight="medium" tabularNums color={theme.text.primary}>{subTotal.toLocaleString('vi-VN')} đ</AppText>
              </AppText>
              {discount ? (
                <AppText variant="xxs" weight="medium" tabularNums color={theme.brand.success}>
                  · {discount.note || 'Giảm'}: -{discountAmount.toLocaleString('vi-VN')} đ
                </AppText>
              ) : null}
            </View>
            <View style={s.financeRightGroup}>
              <AppText variant="xxs" color={theme.text.muted}>CẦN THU:</AppText>
              <AppText variant="xs" weight="bold" tabularNums color={theme.brand.primary}>
                {totalAmount.toLocaleString('vi-VN')} đ
              </AppText>
            </View>
          </View>

          <View style={s.cartMorphRow}>
            {/* 1. Nút In Tạm Tính nhanh (48x48 bo tròn 12px) */}
            <PressableScale
              activeScale={0.92}
              haptic="step"
              playSound
              accessibilityRole="button"
              accessibilityLabel="In tạm tính"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => {
                if (onPrintPreBill) onPrintPreBill();
              }}
              style={[
                s.quickActionBtn,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                },
              ]}
            >
              <Icon name="printer-outline" size={19} color={theme.text.primary} />
            </PressableScale>

            {/* 2. Nút Lưu Đơn / Lưu Bàn (48px) */}
            <PressableScale
              activeScale={0.96}
              haptic="celebrate"
              playSound
              accessibilityRole="button"
              accessibilityLabel={enableKds ? `Lưu hóa đơn và gửi bếp ${tableName}` : `Lưu hóa đơn vào ${tableName}`}
              onPress={onSendToKitchen}
              style={[
                s.saveOrderBtn,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                },
              ]}
            >
              <Icon name={enableKds ? 'content-save-check-outline' : 'table-chair'} size={20} color={theme.text.primary} />
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                {enableKds ? 'Lưu Đơn' : tableName !== 'Chưa Chọn Bàn' ? 'Lưu Bàn' : 'Lưu Đơn'}
              </AppText>
            </PressableScale>

            {/* 3. Nút Thanh Toán Đồng Nhất Màu Cam Chuẩn Apple kèm số tiền to rõ 48px */}
            <PressableScale
              activeScale={0.96}
              haptic="step"
              playSound
              accessibilityRole="button"
              accessibilityLabel={`Thanh toán ${totalAmount.toLocaleString('vi-VN')} đồng`}
              onPress={onCheckout}
              containerStyle={{ flex: 1.2, height: 48, minHeight: 48 }}
              style={[s.payAmountBtn, { backgroundColor: theme.brand.accent }]}
            >
              <Icon name="cash-check" size={22} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
                {totalAmount.toLocaleString('vi-VN')} đ
              </AppText>
            </PressableScale>
          </View>
        </View>

        {/* Modal In Tem Dán Ly */}
        <CupStickerPreviewModal
          visible={showCupModal}
          stickers={cupStickers}
          onClose={() => setShowCupModal(false)}
        />

        {/* 🌟 TÙY CHỈNH MÓN TRỰC TIẾP TRONG GIỎ HÀNG (Không đá ra ngoài danh sách món) */}
        <ModifierSheet
          visible={modifierVisible}
          item={modifierItem}
          initialData={editingCartItem}
          onClose={() => {
            setModifierVisible(false);
            setEditingCartItem(null);
          }}
          onConfirm={(data) => {
            if (data.cartItemId && onUpdateCartItem) {
              onUpdateCartItem(data.cartItemId, data);
            }
            setModifierVisible(false);
            setEditingCartItem(null);
          }}
        />

        {/* 🌟 TÁC VỤ BÀN TRỰC TIẾP TỪ GIỎ HÀNG (Đóng lại vẫn ở ngay Giỏ Hàng, không bị văng ra Sơ Đồ Bàn) */}
        <TableOperationsModal
          visible={showTableOpsModal}
          onClose={() => setShowTableOpsModal(false)}
          onOpenDiscount={() => {
            setShowTableOpsModal(false);
            if (onOpenDiscount) onOpenDiscount();
          }}
          onPrintPreBill={() => {
            setShowTableOpsModal(false);
            if (onPrintPreBill) onPrintPreBill();
          }}
        />
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  fullContainer: {
    flex: 1,
  },
  opsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scrollBody: {
    paddingTop: 8,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  seamlessListContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeDeleteBg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeDeleteBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seamlessItemRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  infoTouchableBlock: {
    gap: 4,
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
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  itemNameText: {
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  rowDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row2Compact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  modsText: {},
  noteRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 2,
  },
  noteRibbonText: {
    flex: 1,
  },
  itemTotalAmount: {},
  ergonomicStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQtyBox: {
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  financeMicroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  financeLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  financeRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartMorphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 8,
  },
  quickActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  payAmountBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  utilityBtn: {
    height: 44,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewModeSwitcherBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  modeSwitchBtnActive: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  batchPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  takeawayInlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  batchBadgeRow: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
