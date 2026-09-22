import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { CartItemRow } from '../pos/CartItemRow';
import { TableItem } from '../pos/TableCard';
import { CartItem, TableDiscount, useStoreSettings } from '../../store/usePOSStore';
import { useAppToast } from '../ui';
import { CupStickerPreviewModal } from '../pos/CupStickerPreviewModal';
import { generateCupStickers, CupStickerData } from '../../utils/labelPrinter';
import { playTapSound } from '../../utils/sound';

interface TabletCartPaneProps {
  detailWidth: number | string;
  orderChannel: 'dine_in' | 'takeaway';
  selectedTable: TableItem;
  cart: CartItem[];
  totalQty: number;
  subTotal: number;
  discount?: TableDiscount;
  discountAmount: number;
  finalTotal: number;
  viewMode: 'pos' | 'tables';
  onSetViewMode: (mode: 'pos' | 'tables') => void;
  onOpenTableOps: () => void;
  onUpdateCartQty: (cartItemId: string, delta: number) => void;
  onRemoveCartItem: (cartItemId: string) => void;
  onOpenVoid: (item: CartItem) => void;
  onSendKitchen: () => void;
  onPrintPreBill: () => void;
  onOpenDiscount: () => void;
  onCheckout: () => void;
  onQuickVietQR?: () => void;
  onPickTable?: () => void;
  onEditCartItem?: (item: CartItem) => void;
}

import { aggregateCartItems, AggregatedCartItem, getBatchInfo } from '../../utils/cartAlgorithms';

export const TabletCartPane: React.FC<TabletCartPaneProps> = ({
  detailWidth,
  orderChannel,
  selectedTable,
  cart,
  totalQty,
  subTotal,
  discount,
  discountAmount,
  finalTotal,
  viewMode,
  onSetViewMode,
  onOpenTableOps,
  onUpdateCartQty,
  onRemoveCartItem,
  onOpenVoid,
  onSendKitchen,
  onPrintPreBill,
  onOpenDiscount,
  onCheckout,
  onQuickVietQR,
  onPickTable,
  onEditCartItem,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [showCupModal, setShowCupModal] = React.useState(false);
  const [cupStickers, setCupStickers] = React.useState<CupStickerData[]>([]);
  const [cartViewMode, setCartViewMode] = React.useState<'batches' | 'aggregated'>('batches');

  const settings = useStoreSettings();
  const enableKds = settings?.enableKds ?? true;
  const { showToast } = useAppToast();

  const aggregatedCart = React.useMemo(() => aggregateCartItems(cart), [cart]);

  const handleOpenCupStickers = () => {
    if (cart.length === 0) return;
    playTapSound();
    const stickers = generateCupStickers(
      selectedTable.id === 'unassigned' ? 'DON-MOI' : selectedTable.name,
      selectedTable.name,
      cart,
      settings.storeName || 'ONGCHU POS'
    );
    setCupStickers(stickers);
    setShowCupModal(true);
  };

  const tableNameDisplay = selectedTable.name.toLowerCase().startsWith('bàn')
    ? selectedTable.name
    : `Bàn ${selectedTable.name}`;

  const handleAggregatedStepQty = (agg: AggregatedCartItem, delta: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    if (delta > 0) {
      // Tăng số lượng: tăng vào item cuối cùng trong nhóm
      const targetItem = agg.sourceItems[agg.sourceItems.length - 1];
      onUpdateCartQty(targetItem.cartItemId, delta);
    } else {
      if (!enableKds) {
        // Tắt KDS: giảm số lượng trực tiếp không qua modal hủy bếp
        const targetItem = agg.sourceItems[agg.sourceItems.length - 1];
        if (targetItem.qty <= 1) {
          onRemoveCartItem(targetItem.cartItemId);
        } else {
          onUpdateCartQty(targetItem.cartItemId, -1);
        }
      } else {
        // Bật KDS: ưu tiên giảm ở item chưa gửi bếp trước
        const unsentItems = agg.sourceItems.filter((it) => !it.sentToKitchen);
        if (unsentItems.length > 0) {
          const targetItem = unsentItems[unsentItems.length - 1];
          if (targetItem.qty <= 1) {
            onRemoveCartItem(targetItem.cartItemId);
          } else {
            onUpdateCartQty(targetItem.cartItemId, -1);
          }
        } else {
          // Tất cả đã gửi bếp -> mở modal hủy món
          const sentItems = agg.sourceItems.filter((it) => it.sentToKitchen);
          if (sentItems.length > 0) {
            onOpenVoid(sentItems[sentItems.length - 1]);
          }
        }
      }
    }
  };

  return (
    <View
      style={[
        s.cartArea,
        {
          width: detailWidth as any,
          flex: 1,
          height: '100%',
          backgroundColor: theme.surface.card,
          borderLeftColor: theme.border.subtle,
        },
      ]}
    >
      {/* Header Giỏ Hàng Bàn (Toàn bộ chiều dọc, khớp đỉnh với AppHeader) */}
      <View
        style={[
          s.cartHeaderBox,
          {
            backgroundColor: theme.surface.header,
            borderBottomColor: theme.border.subtle,
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={s.cartHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
              {orderChannel === 'takeaway'
                ? 'Đơn Mang Về'
                : selectedTable.id === 'unassigned'
                ? 'Chưa Chọn Bàn'
                : tableNameDisplay}
            </AppText>
          {orderChannel === 'takeaway' ? (
            <View style={{ backgroundColor: theme.brand.accent, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 5 }}>
              <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                MANG VỀ
              </AppText>
            </View>
          ) : selectedTable.id === 'unassigned' ? (
            <View style={{ backgroundColor: theme.status.warningBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.brand.accent }}>
              <AppText variant="xs" weight="medium" color={theme.brand.accent}>
                ĐƠN MỚI
              </AppText>
            </View>
          ) : (
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              · {cart.length > 0 ? `${cart.length} món · ${totalQty} phần` : 'Trống'}
            </AppText>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {selectedTable.id === 'unassigned' && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Gán bàn cho đơn"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => {
                playTapSound();
                if (onPickTable) onPickTable();
                else onOpenTableOps();
              }}
              style={[s.opsTriggerBtn, { backgroundColor: theme.status.warningBg, borderColor: theme.brand.accent }]}
            >
              <Icon name="table-chair" size={14} color={theme.brand.accent} />
              <AppText variant="xs" weight="medium" color={theme.brand.accent}>
                Gán Bàn
              </AppText>
            </TouchableOpacity>
          )}
          {viewMode === 'tables' && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Chuyển sang gọi món"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              onPress={() => onSetViewMode('pos')}
              style={[s.opsTriggerBtn, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}
            >
              <Icon name="food-fork-drink" size={14} color={theme.brand.primary} />
              <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                Gọi Món
              </AppText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Tác vụ bàn"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={onOpenTableOps}
            style={[s.opsTriggerBtn, { backgroundColor: theme.status.warningBg, borderColor: theme.brand.accent }]}
          >
            <Icon name="table-cog" size={15} color={theme.brand.accent} />
            <AppText variant="xs" weight="medium" color={theme.brand.accent}>
              Tác Vụ Bàn
            </AppText>
          </TouchableOpacity>
        </View>
        </View>

        {/* 🌟 THANH CHUYỂN ĐỔI CHẾ ĐỘ XEM: LẦN GỌI ↔ GỘP MÓN TRÙNG (1-CHẠM CHECK NHANH) */}
        {cart.length > 0 && (
          <View style={[s.viewModeSwitcherBar, { backgroundColor: theme.surface.header, borderTopColor: theme.border.subtle }]}>
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
      </View>

      {/* Danh Sách Món Trong Giỏ (Tối đa chiều dọc) */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 8, gap: 6 }}>
        {cart.length === 0 ? (
          <View style={s.emptyCartBox}>
            <View style={[s.emptyCartIconSquircle, { backgroundColor: theme.surface.header }]}>
              <Icon name="silverware-clean" size={28} color={theme.text.muted} />
            </View>
            <AppText variant="sm" color={theme.text.primary} style={{ marginTop: 10 }}>
              {tableNameDisplay} chưa có món
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2, textAlign: 'center', paddingHorizontal: 16 }}>
              {viewMode === 'tables' ? 'Chạm vào bàn để bắt đầu gọi món' : 'Chạm món ở menu bên trái để gọi'}
            </AppText>
            {viewMode === 'tables' && (
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Mở bàn và gọi món"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => onSetViewMode('pos')}
                style={[s.startOrderBtn, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}
              >
                <Icon name="plus" size={15} color={theme.brand.primary} />
                <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                  + Bắt Đầu Gọi
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        ) : cartViewMode === 'aggregated' ? (
          /* 🌟 CHẾ ĐỘ XEM GỘP MÓN TRÙNG (TỔNG HỢP NHANH) */
          aggregatedCart.map((agg) => {
            const hasSent = agg.sentQty > 0;
            const hasNew = agg.newQty > 0;

            return (
              <View
                key={agg.key}
                style={[
                  s.aggRow,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.default,
                  },
                ]}
              >
                {/* Hàng 1: Tên món + Tag gộp ↔ Thành tiền tổng */}
                <View style={s.aggRow1}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      if (onEditCartItem && agg.sourceItems.length > 0) {
                        onEditCartItem(agg.sourceItems[0]);
                      }
                    }}
                    style={{ flex: 1, marginRight: 8 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={2}>
                        {agg.item.name}
                      </AppText>
                      {agg.sourceItems.length > 1 && (
                        <View style={[s.batchPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                          <AppText variant="xxs" weight="medium" color={theme.brand.accent}>
                            {agg.sourceItems.length} lần gọi
                          </AppText>
                        </View>
                      )}
                    </View>

                    {/* Badge trạng thái bếp của món gộp */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                      {hasSent && hasNew ? (
                        <View style={[s.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                          <Icon name="progress-clock" size={11} color={theme.brand.warning} />
                          <AppText variant="xs" weight="medium" color={theme.brand.warning} tabularNums>
                            {agg.sentQty} đã gửi · {agg.newQty} mới
                          </AppText>
                        </View>
                      ) : hasSent ? (
                        <View style={[s.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                          <Icon name="check" size={11} color={theme.brand.success} />
                          <AppText variant="xs" weight="medium" color={theme.brand.success} tabularNums>
                            Đã gửi bếp ({agg.sentQty})
                          </AppText>
                        </View>
                      ) : (
                        <View style={[s.statusBadge, { backgroundColor: theme.brand.primaryBg }]}>
                          <Icon name="clock-outline" size={11} color={theme.brand.primary} />
                          <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
                            Chưa gửi bếp ({agg.newQty})
                          </AppText>
                        </View>
                      )}

                      {/* Badge Mang Về */}
                      {agg.isTakeaway && (
                        <View style={[s.statusBadge, { backgroundColor: 'rgba(180, 83, 9, 0.12)', borderColor: theme.brand.accent, borderWidth: StyleSheet.hairlineWidth }]}>
                          <Icon name="shopping-outline" size={11} color={theme.brand.accent} />
                          <AppText variant="xs" weight="medium" color={theme.brand.accent}>
                            Mang về
                          </AppText>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                    {agg.totalAmount.toLocaleString('vi-VN')} đ
                  </AppText>
                </View>

                {/* Hàng 2: Tùy chỉnh & Đơn giá ↔ Stepper Tổng */}
                <View style={s.aggRow2}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    {agg.modifiersText ? (
                      <AppText variant="xs" color={theme.brand.primary} weight="medium" numberOfLines={1}>
                        {agg.modifiersText}
                      </AppText>
                    ) : null}
                    <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: agg.modifiersText ? 2 : 0 }}>
                      {agg.unitPrice.toLocaleString('vi-VN')} đ / phần
                    </AppText>
                  </View>

                  <View style={[s.stepper, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Bớt 1 phần"
                      onPress={() => handleAggregatedStepQty(agg, -1)}
                      style={s.stepBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon
                        name={agg.totalQty === 1 && !hasSent ? 'trash-can-outline' : 'minus'}
                        size={16}
                        color={agg.totalQty === 1 && !hasSent ? theme.brand.danger : theme.text.primary}
                      />
                    </TouchableOpacity>

                    <View style={s.qtyBox}>
                      <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                        {agg.totalQty}
                      </AppText>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Thêm 1 phần"
                      onPress={() => handleAggregatedStepQty(agg, 1)}
                      style={s.stepBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="plus" size={16} color={theme.text.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ghi chú */}
                {agg.note ? (
                  <View style={[s.noteRibbon, { backgroundColor: theme.status.warningBg }]}>
                    <Icon name="note-text-outline" size={13} color={theme.brand.warning} />
                    <AppText variant="xs" color={theme.brand.warning} weight="medium" numberOfLines={1}>
                      Ghi chú: {agg.note}
                    </AppText>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          /* CHẾ ĐỘ XEM THEO TỪNG LẦN GỌI (BATCHES - MẶC ĐỊNH) */
          cart.map((c, index) => {
            const batchInfo = enableKds ? getBatchInfo(cart, index) : null;
            const modsText = [c.selectedSize, ...(c.selectedToppings || [])].filter(Boolean).join(' · ');
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
                <CartItemRow
                  id={c.cartItemId}
                  name={c.item.name}
                  price={c.unitPrice}
                  qty={c.qty}
                  modifiers={modsText}
                  note={c.note}
                  isTakeaway={c.isTakeaway}
                  sentToKitchen={c.sentToKitchen}
                  sentAt={c.sentAt}
                  enableKds={enableKds}
                  onUpdateQty={(delta) => onUpdateCartQty(c.cartItemId, delta)}
                  onRemove={() => onRemoveCartItem(c.cartItemId)}
                  onVoidPress={() => onOpenVoid(c)}
                  onEdit={() => onEditCartItem?.(c)}
                />
              </React.Fragment>
            );
          })
        )}
      </ScrollView>

      {/* 🌟 Tóm Tắt & Deck Thanh Toán Ghim Đáy */}
      <View
        style={[
          s.cartSummary,
          {
            backgroundColor: theme.surface.header,
            borderTopColor: theme.border.subtle,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {/* Hàng 1: Tóm tắt tiền & Nút Chiết khấu */}
        <View style={s.summaryRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="xs" color={theme.text.muted} tabularNums>
                Tạm tính: {subTotal.toLocaleString('vi-VN')} đ
              </AppText>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={discount ? `Chiết khấu ${discount.type === 'percent' ? discount.value + '%' : discountAmount.toLocaleString('vi-VN') + 'đ'}` : 'Thêm chiết khấu'}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                disabled={cart.length === 0}
                onPress={() => {
                  playTapSound();
                  onOpenDiscount();
                }}
                style={[
                  s.discountChip,
                  {
                    backgroundColor: discount ? theme.status.readyBg : theme.surface.header,
                    borderColor: discount ? theme.brand.success : theme.border.default,
                    opacity: cart.length === 0 ? 0.4 : 1,
                  },
                ]}
              >
                <Icon
                  name="ticket-percent-outline"
                  size={12}
                  color={discount ? theme.brand.success : theme.brand.primary}
                />
                <AppText
                  variant="xxs"
                  weight="medium"
                  color={discount ? theme.brand.success : theme.brand.primary}
                >
                  {discount ? `-${discount.type === 'percent' ? discount.value + '%' : discountAmount.toLocaleString('vi-VN') + 'đ'}` : '% Giảm'}
                </AppText>
              </TouchableOpacity>
            </View>
            {discount && (
              <AppText variant="xs" color={theme.brand.success} weight="medium" tabularNums style={{ marginTop: 2 }}>
                {discount.note || 'Đã giảm'}: -{discountAmount.toLocaleString('vi-VN')} đ
              </AppText>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <AppText variant="xs" color={theme.text.muted}>
              Tổng thanh toán
            </AppText>
            <AppText variant="xl" weight="medium" color={theme.brand.primary} tabularNums style={{ letterSpacing: -0.5 }}>
              {finalTotal.toLocaleString('vi-VN')} đ
            </AppText>
          </View>
        </View>

        {/* Hàng 2: 4 Nút phụ 1-chạm [Lưu Đơn] [Lưu Chờ] [In Tem] [In Tạm] */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={enableKds ? "Lưu đơn gửi bếp" : "Lưu đơn vào bàn"}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            disabled={cart.length === 0}
            onPress={() => {
              playTapSound();
              onSendKitchen();
            }}
            style={[
              s.auxBtn,
              {
                borderColor: theme.border.default,
                backgroundColor: theme.surface.header,
                opacity: cart.length === 0 ? 0.4 : 1,
              },
            ]}
          >
            <Icon name={enableKds ? "content-save-check-outline" : "table-chair"} size={16} color={theme.brand.primary} />
            <AppText variant="xs" weight="medium" color={theme.text.primary} numberOfLines={1}>
              {enableKds ? "Lưu Đơn" : selectedTable.id !== 'unassigned' ? "Lưu Bàn" : "Lưu Đơn"}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="In tem dán ly"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            disabled={cart.length === 0}
            onPress={handleOpenCupStickers}
            style={[
              s.auxBtn,
              {
                borderColor: theme.border.default,
                backgroundColor: theme.surface.header,
                opacity: cart.length === 0 ? 0.4 : 1,
              },
            ]}
          >
            <Icon name="label-outline" size={16} color={theme.brand.primary} />
            <AppText variant="xs" weight="medium" color={theme.text.primary} numberOfLines={1}>
              In Tem
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="In tạm tính hóa đơn"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            disabled={cart.length === 0}
            onPress={() => {
              playTapSound();
              onPrintPreBill();
            }}
            style={[
              s.auxBtn,
              {
                borderColor: theme.border.default,
                backgroundColor: theme.surface.header,
                opacity: cart.length === 0 ? 0.4 : 1,
              },
            ]}
          >
            <Icon name="printer-outline" size={16} color={theme.brand.primary} />
            <AppText variant="xs" weight="medium" color={theme.text.primary} numberOfLines={1}>
              In Tạm
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Hàng 3: Nút Chốt Thanh Toán [Tính Tiền Hero CTA 52px 100% Rộng Rãi] */}
        <View style={{ marginTop: 8 }}>
          <Button
            variant="accent"
            size="lg"
            title="Tính Tiền"
            disabled={cart.length === 0}
            leadingIcon={<Icon name="cash-check" size={24} color={theme.text.onBrand} />}
            style={{ width: '100%', height: 52, borderRadius: 10 }}
            onPress={onCheckout}
          />
        </View>
      </View>

      {/* Modal In Tem Dán Ly */}
      <CupStickerPreviewModal
        visible={showCupModal}
        stickers={cupStickers}
        onClose={() => setShowCupModal(false)}
      />
    </View>
  );
};

const s = StyleSheet.create({
  cartArea: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    flexDirection: 'column',
    flex: 1,
    height: '100%',
  },
  cartHeaderBox: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cartHeaderRow: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  opsTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 44,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyCartBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyCartIconSquircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  cartSummary: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auxBtn: {
    flex: 1,
    height: 44,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  discountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  viewModeSwitcherBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 34,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  modeSwitchBtnActive: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  aggRow: {
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  aggRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aggRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  batchPill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
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
