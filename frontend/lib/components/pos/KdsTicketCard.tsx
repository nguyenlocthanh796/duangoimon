import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { AppText } from '../ui/AppText';
import { KDSOrder, KDSItem, usePOSStore } from '../../store/usePOSStore';

export interface KdsTicketCardProps {
  order: KDSOrder;
  activeStation: 'all' | 'bar' | 'kitchen' | 'snack';
  onItemStatusToggle: (orderId: string, item: KDSItem) => void;
  onMarkOrderDone: (order: KDSOrder) => void;
}

export const resolveKdsItemName = (it: any): string => {
  if (it.name && it.name !== 'Món') return it.name;
  if (it.product_name && it.product_name !== 'Món') return it.product_name;
  if (it.productName && it.productName !== 'Món') return it.productName;
  if (it.item?.name && it.item.name !== 'Món') return it.item.name;
  if (it.product?.name && it.product.name !== 'Món') return it.product.name;

  try {
    const rawCartId = it.cartItemId || it.id || '';
    const pid = it.productId || it.product_id || (rawCartId.includes('_') ? rawCartId.split('_')[0] : rawCartId);
    if (pid) {
      const menuItems = usePOSStore.getState().menuItems || [];
      const found = menuItems.find(
        (m: any) =>
          m.id === pid ||
          (m.code && m.code.toLowerCase() === pid.toLowerCase()) ||
          (rawCartId && rawCartId.startsWith(m.id + '_'))
      );
      if (found?.name) return found.name;
    }
  } catch {}

  return it.name || it.product_name || 'Món';
};

const calculateElapsedMinutes = (createdAt?: string, fallbackElapsed = 0): number => {
  if (fallbackElapsed > 0) return fallbackElapsed;
  if (!createdAt) return fallbackElapsed;
  const diffMs = Date.now() - new Date(createdAt).getTime();
  if (isNaN(diffMs) || diffMs < 0) return fallbackElapsed;
  const minutes = Math.floor(diffMs / 60000);
  return minutes > 120 && fallbackElapsed > 0 ? fallbackElapsed : minutes;
};

const getTimerBadge = (minutes: number, theme: any) => {
  if (minutes < 5) {
    return { bg: theme.status.readyBg, text: theme.status.readyText, label: `${minutes}p`, level: 'normal' as const };
  }
  if (minutes < 10) {
    return { bg: theme.status.pendingBg, text: theme.status.pendingText, label: `${minutes}p`, level: 'warning' as const };
  }
  return { bg: theme.status.dangerBg, text: theme.status.dangerText, label: `${minutes}p ⚠️`, level: 'danger' as const };
};

const KdsTicketCardComponent: React.FC<KdsTicketCardProps> = ({
  order,
  activeStation,
  onItemStatusToggle,
  onMarkOrderDone,
}) => {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();

  const onItemStatusToggleRef = useRef(onItemStatusToggle);
  onItemStatusToggleRef.current = onItemStatusToggle;
  const onMarkOrderDoneRef = useRef(onMarkOrderDone);
  onMarkOrderDoneRef.current = onMarkOrderDone;

  const elapsed = calculateElapsedMinutes(order.createdAt, order.elapsedMinutes);
  const timer = getTimerBadge(elapsed, theme);
  const isOrderReady = order.status === 'ready';
  const isTakeaway =
    order.tableId.startsWith('mv-') ||
    order.tableName.toLowerCase().includes('mang về');

  const visibleItems = (order.items || []).filter(
    (item) => activeStation === 'all' || item.station === activeStation
  );

  // 🌟 Aging SLA Border Color (Ưu tiên: Ready -> Đỏ >10p -> Vàng 5-10p -> Chuẩn)
  const slaBorderColor = isOrderReady
    ? theme.brand.success
    : timer.level === 'danger'
    ? theme.brand.danger
    : timer.level === 'warning'
    ? theme.brand.warning
    : theme.border.subtle;

  const slaBorderWidth = isWide
    ? (isOrderReady || timer.level === 'danger' ? 2 : timer.level === 'warning' ? 1.5 : StyleSheet.hairlineWidth)
    : 0;

  return (
    <View
      style={[
        s.ticketCard,
        !isWide && s.ticketCardMobile,
        isDesktopLarge && { minWidth: 340, maxWidth: 440 },
        {
          backgroundColor: theme.surface.card,
          borderColor: isWide ? slaBorderColor : 'transparent',
          borderWidth: slaBorderWidth,
          borderBottomWidth: !isWide ? 10 : undefined,
          borderBottomColor: !isWide ? theme.surface.app : undefined,
          elevation: isWide && (isOrderReady || timer.level === 'danger') ? 3 : 0,
        },
      ]}
    >
      {/* Ticket Header (Gọn gàng, tích hợp nút Xong ngay góc phải) */}
      <View
        style={[
          s.ticketHeader,
          {
            borderBottomColor: theme.border.subtle,
            borderBottomWidth: StyleSheet.hairlineWidth,
            backgroundColor: theme.surface.header,
          },
        ]}
      >
        <View style={{ flex: 1, marginRight: 8, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
              {order.tableName}
            </AppText>
            {isTakeaway && !order.tableName.toLowerCase().includes('mang về') && (
              <View
                style={[
                  s.takeawayBadge,
                  {
                    backgroundColor: theme.status.pendingBg,
                    borderColor: theme.status.pendingBorder,
                  },
                ]}
              >
                <AppText variant="xxs" weight="medium" color={theme.status.pendingText}>
                  Mang Về
                </AppText>
              </View>
            )}
            {order.isPaid && (
              <View
                style={[
                  s.takeawayBadge,
                  {
                    backgroundColor: theme.status.readyBg,
                    borderColor: theme.status.readyBorder,
                  },
                ]}
              >
                <AppText variant="xxs" weight="medium" color={theme.status.readyText}>
                  Đã TT
                </AppText>
              </View>
            )}
          </View>
          <AppText variant="xs" color={theme.text.muted} tabularNums numberOfLines={1} style={{ marginTop: 2 }}>
            {order.orderCode} · {order.orderTime} ({order.guestCount || 1}K)
          </AppText>
        </View>

        {/* Right Side: Timer Pill + Quick Done Action Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[s.timerBadge, { backgroundColor: timer.bg }]}>
            <Icon name="clock-outline" size={12} color={timer.text} />
            <AppText variant="xs" weight="medium" color={timer.text} tabularNums>
              {timer.label}
            </AppText>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isOrderReady ? 'Bưng bàn' : 'Hoàn thành tất cả món'}
            activeOpacity={0.8}
            onPress={() => onMarkOrderDoneRef.current(order)}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={[
              s.headerActionBtn,
              {
                backgroundColor: isOrderReady
                  ? theme.brand.primary
                  : theme.status.readyBg,
                borderColor: isOrderReady
                  ? theme.brand.primary
                  : theme.status.readyBorder,
                borderWidth: 1,
              },
            ]}
          >
            <Icon
              name={isOrderReady ? 'tray-arrow-up' : 'check'}
              size={14}
              color={isOrderReady ? theme.text.onBrand : theme.status.readyText}
            />
            <AppText
              variant="xs"
              weight="bold"
              color={isOrderReady ? theme.text.onBrand : theme.status.readyText}
            >
              {isOrderReady ? 'Bưng Bàn' : 'Xong'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Items List (Compact padding) */}
      <View style={s.ticketItemsList}>
        {visibleItems.map((item, idx) => {
          const isDone = item.status === 'done';
          const isCooking = item.status === 'cooking';
          const isLastItem = idx === visibleItems.length - 1;
          const itemName = resolveKdsItemName(item);
          const itemQty = Number((item as any).qty ?? (item as any).quantity) || 1;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => onItemStatusToggleRef.current(order.id, item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDone }}
              accessibilityLabel={`${itemQty} ${itemName}, trạng thái: ${
                isDone ? 'đã xong' : isCooking ? 'đang nấu' : 'chờ làm'
              }`}
              style={[
                s.itemRow,
                {
                  borderBottomWidth: isLastItem ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  backgroundColor: 'transparent',
                },
              ]}
            >
              {/* Apple HIG 44x44 Touch Target cho Checkbox */}
              <View style={s.appleTouchTarget44}>
                <View
                  pointerEvents="none"
                  style={[
                    s.statusCheckboxApple,
                    {
                      borderColor: isDone
                        ? theme.brand.success
                        : isCooking
                        ? theme.brand.warning
                        : theme.border.default,
                      backgroundColor: isDone ? theme.brand.success : 'transparent',
                    },
                  ]}
                >
                  {isDone && <Icon name="check" size={16} color={theme.text.onBrand} />}
                  {isCooking && <Icon name="fire" size={14} color={theme.brand.warning} />}
                </View>
              </View>

              <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={s.itemNameRow}>
                  {/* Badge số lượng cố định 32px: Căn thẳng tắp 1 hàng dọc cho tất cả món */}
                  <View
                    style={[
                      s.qtyBadgeUnified,
                      {
                        backgroundColor: itemQty > 1
                          ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)')
                          : 'transparent',
                        borderColor: itemQty > 1
                          ? theme.border.subtle
                          : 'transparent',
                      },
                    ]}
                  >
                    <AppText
                      variant="sm"
                      weight={itemQty > 1 ? 'bold' : 'normal'}
                      color={isDone ? theme.text.muted : itemQty > 1 ? theme.text.primary : theme.text.muted}
                      tabularNums
                    >
                      {itemQty}x
                    </AppText>
                  </View>

                  <AppText
                    variant="md"
                    weight="medium"
                    color={isDone ? theme.text.muted : theme.text.primary}
                    style={[{ flex: 1 }, isDone ? s.strikeThrough : undefined]}
                    numberOfLines={2}
                  >
                    {itemName}
                  </AppText>
                </View>

                {(item.selectedSize || (item as any).selected_size) ? (
                  <AppText variant="xs" color={theme.text.muted} style={s.itemMeta}>
                    • {item.selectedSize || (item as any).selected_size}{' '}
                    {(item.sugarLevel || (item as any).sugar_level) ? `· ${item.sugarLevel || (item as any).sugar_level} đường` : ''}{' '}
                    {(item.iceLevel || (item as any).ice_level) ? `· ${item.iceLevel || (item as any).ice_level} đá` : ''}
                  </AppText>
                ) : null}
                {(() => {
                  let tops: string[] = [];
                  if (Array.isArray(item.selectedToppings)) {
                    tops = item.selectedToppings;
                  } else if (Array.isArray((item as any).selected_toppings)) {
                    tops = (item as any).selected_toppings;
                  } else if (typeof (item as any).toppings_json === 'string' && (item as any).toppings_json) {
                    try {
                      tops = JSON.parse((item as any).toppings_json);
                    } catch {}
                  }
                  if (tops.length > 0) {
                    return (
                      <AppText variant="xs" color={theme.text.muted} style={s.itemMeta}>
                        + {tops.join(', ')}
                      </AppText>
                    );
                  }
                  return null;
                })()}
                {item.note ? (
                  <View style={s.noteRowClean}>
                    <AppText variant="xs" weight="medium" color={theme.brand.accent}>
                      📝 {item.note}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const areKdsTicketCardPropsEqual = (
  prev: Readonly<KdsTicketCardProps>,
  next: Readonly<KdsTicketCardProps>
): boolean => {
  if (prev.activeStation !== next.activeStation) return false;
  if (prev.order.id !== next.order.id) return false;
  if (prev.order.status !== next.order.status) return false;
  if (prev.order.tableName !== next.order.tableName) return false;
  if (Boolean(prev.order.isPaid) !== Boolean(next.order.isPaid)) return false;
  if (prev.order.orderCode !== next.order.orderCode) return false;
  if (prev.order.orderTime !== next.order.orderTime) return false;
  if (prev.order.elapsedMinutes !== next.order.elapsedMinutes) return false;
  if (prev.order.guestCount !== next.order.guestCount) return false;
  if (prev.order.items.length !== next.order.items.length) return false;

  for (let i = 0; i < prev.order.items.length; i++) {
    const p = prev.order.items[i];
    const n = next.order.items[i];
    if (
      p.id !== n.id ||
      p.status !== n.status ||
      p.qty !== n.qty ||
      p.name !== n.name ||
      p.note !== n.note ||
      p.station !== n.station ||
      p.selectedSize !== n.selectedSize ||
      p.sugarLevel !== n.sugarLevel ||
      p.iceLevel !== n.iceLevel ||
      (p.selectedToppings || []).join(',') !== (n.selectedToppings || []).join(',')
    ) {
      return false;
    }
  }

  return true;
};

export const KdsTicketCard = React.memo(KdsTicketCardComponent, areKdsTicketCardPropsEqual);

const s = StyleSheet.create({
  ticketCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  ticketCardMobile: {
    minWidth: '100%',
    maxWidth: '100%',
    borderRadius: 0,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  takeawayBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    gap: 3,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  ticketItemsList: {
    paddingVertical: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 52,
    gap: 4,
  },
  appleTouchTarget44: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCheckboxApple: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBadgeUnified: {
    minWidth: 32,
    height: 24,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeLarge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeSmall: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMeta: {
    marginTop: 2,
  },
  noteRowClean: {
    marginTop: 2,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  ticketFooter: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  orderActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    gap: 6,
  },
});
