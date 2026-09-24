import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { usePOSStore, useStoreSettings, useTableList, useKDSOrders, useOrderHistory, useTodayOrderHistoryCount, CartItem } from '../../store/usePOSStore';
import { useAuthStore, checkRoutePermission } from '../../store/useAuthStore';
import { playTapSound } from '../../utils/sound';

const EMPTY_CART: CartItem[] = [];

export interface BottomNavBarProps {
  activeTab?: string;
  onSelectTab?: (tab: any) => void;
  onOpenCart?: () => void;
  onFastPay?: () => void;
  onSaveOrder?: () => void;
  onOpenTableOps?: () => void;
  onPrintPreBill?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenCart,
  onFastPay,
  onSaveOrder,
  onOpenTableOps,
  onPrintPreBill,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const storeSettings = useStoreSettings();
  const enableKds = storeSettings?.enableKds ?? true;
  const tables = useTableList();
  const occupiedCount = tables.filter((t) => t.status === 'co_khach').length;
  const kdsOrders = useKDSOrders();
  const pendingKdsCount = React.useMemo(
    () => (enableKds ? kdsOrders.filter((o) => o.status === 'pending' || o.status === 'cooking').length : 0),
    [kdsOrders, enableKds]
  );
  const orderHistory = useOrderHistory();
  const todayOrdersCount = useTodayOrderHistoryCount();

  const viewMode = usePOSStore((s) => s.viewMode);
  const setViewMode = usePOSStore((s) => s.setViewMode);
  const selectedTable = usePOSStore((s) => s.selectedTable);
  const startNewOrder = usePOSStore((s) => s.startNewOrder);
  const selectedTableId = selectedTable?.id;
  const cart = usePOSStore((s) => (selectedTableId ? s.tableCarts[selectedTableId] || EMPTY_CART : EMPTY_CART));
  const discount = usePOSStore((s) => (selectedTableId ? s.tableDiscounts[selectedTableId] : undefined));

  // Kiểm tra giỏ hàng của bàn hiện tại (Memoized)
  const totalQty = React.useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const subTotal = React.useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0), [cart]);
  
  const discountAmount = React.useMemo(() => {
    if (!discount) return 0;
    if (discount.type === 'percent') {
      return Math.round(subTotal * (discount.value / 100));
    }
    return Math.min(discount.value, subTotal);
  }, [discount, subTotal]);

  const totalAmount = Math.max(0, subTotal - discountAmount);

  // Điều kiện kích hoạt chế độ Giỏ hàng: Đang ở Thực đơn Bán Hàng & Có món trong giỏ
  const isCartMode = (pathname === '/' || pathname === '' || pathname === '/index') && viewMode === 'pos' && totalQty > 0;

  // Xác định active tab tự động
  let currentTab = activeTab;
  if (!currentTab) {
    if (pathname.includes('kds')) currentTab = 'kds';
    else if (pathname.includes('bao-cao-loi-nhuan') || pathname.includes('bao-cao')) currentTab = 'bao-cao';
    else if (pathname.includes('hoa-don')) currentTab = 'hoa-don';
    else if (pathname.includes('so-quy')) currentTab = 'so-quy';
    else if (pathname.includes('giao-ca')) currentTab = 'giao-ca';
    else if (pathname.includes('cai-dat')) currentTab = 'cai-dat';
    else if (pathname.includes('khach-hang')) currentTab = 'khach-hang';
    else if (pathname.includes('huong-dan')) currentTab = 'huong-dan';
    else if (pathname === '/' || pathname === '') currentTab = viewMode;
    else currentTab = 'tables';
  }

  const handleTabPress = (tab: string) => {
    playTapSound();

    if (onSelectTab) {
      onSelectTab(tab);
      return;
    }

    if (tab === 'tables') {
      setViewMode('tables');
      if (pathname !== '/') router.replace('/');
    } else if (tab === 'pos') {
      // 🌟 Khi bấm Gọi Món từ Sơ Đồ Bàn: Chuẩn quy trình F&B khách vào gọi món trước chọn bàn sau
      // Luôn tạo Đơn Mới ('Chưa Chọn Bàn'), tránh nhớ nhầm bàn cũ của khách trước
      if (currentTab === 'tables') {
        startNewOrder();
      } else {
        setViewMode('pos');
      }
      if (pathname !== '/') router.replace('/');
    } else {
      const routeMap: Record<string, string> = {
        'kds': '/kds',
        'hoa-don': '/hoa-don',
        'bao-cao': '/bao-cao-loi-nhuan',
        'so-quy': '/so-quy',
        'giao-ca': '/giao-ca',
        'cai-dat': '/cai-dat',
        'khach-hang': '/khach-hang',
        'huong-dan': '/huong-dan',
      };
      const targetRoute = routeMap[tab];
      if (targetRoute && pathname !== targetRoute) {
        router.navigate(targetRoute as any);
      }
    }
  };

  const handlePayPress = () => {
    if (onFastPay) onFastPay();
    else router.push('/thanh-toan' as any);
  };

  const handleCartPress = () => {
    if (onOpenCart) onOpenCart();
  };

  const handleSaveOrderPress = () => {
    if (onSaveOrder) {
      onSaveOrder();
    } else {
      setViewMode('tables');
    }
  };

  const currentRole = useAuthStore((s) => s.currentRole);
  const canAccessRoute = (route?: string) => checkRoutePermission(currentRole, route);

  // 🌟 ĐƯỜNG DẪN 5-TAB TỐI ƯU THEO VAI TRÒ & CHẾ ĐỘ BẾP (ZERO TAB KHÓA/XÁM)
  // CHỦ QUÁN / QUẢN LÝ: Xem nhanh 3 số vàng Báo Cáo Lợi Nhuận
  // THU NGÂN / NHÂN VIÊN: Xem Sổ Đơn để in bill & check đơn hàng
  const navItems = React.useMemo(() => {
    const isOwnerOrManager = currentRole === 'owner' || currentRole === 'super_admin' || currentRole === 'manager';

    if (enableKds) {
      // Khi BẬT KDS (Nhà hàng, quán có khu bếp/bar riêng)
      if (isOwnerOrManager) {
        return [
          { key: 'tables', label: 'Bàn Ăn', icon: 'table-chair' as const, route: '/' },
          { key: 'pos', label: 'Gọi Món', icon: 'food-fork-drink' as const, route: '/' },
          { key: 'kds', label: 'Bếp / Bar', icon: 'pot-steam' as const, route: '/kds' },
          { key: 'bao-cao', label: 'Báo Cáo', icon: 'chart-box-outline' as const, route: '/bao-cao-loi-nhuan' },
          currentRole === 'manager'
            ? { key: 'giao-ca', label: 'Giao Ca', icon: 'cash-register' as const, route: '/giao-ca' }
            : { key: 'cai-dat', label: 'Cài Đặt', icon: 'cog-outline' as const, route: '/cai-dat' },
        ];
      }

      // Thu ngân / Nhân viên đứng quầy
      return [
        { key: 'tables', label: 'Bàn Ăn', icon: 'table-chair' as const, route: '/' },
        { key: 'pos', label: 'Gọi Món', icon: 'food-fork-drink' as const, route: '/' },
        { key: 'kds', label: 'Bếp / Bar', icon: 'pot-steam' as const, route: '/kds' },
        { key: 'hoa-don', label: 'Sổ Đơn', icon: 'receipt' as const, route: '/hoa-don' },
        currentRole === 'cashier'
          ? { key: 'giao-ca', label: 'Giao Ca', icon: 'cash-register' as const, route: '/giao-ca' }
          : { key: 'huong-dan', label: 'Trợ Giúp', icon: 'help-circle-outline' as const, route: '/huong-dan' },
      ];
    }

    // Khi TẮT KDS (Trà sữa, cafe nhỏ pha chế tại quầy - Không có khu bếp riêng)
    if (isOwnerOrManager) {
      return [
        { key: 'tables', label: 'Bàn Ăn', icon: 'table-chair' as const, route: '/' },
        { key: 'pos', label: 'Gọi Món', icon: 'food-fork-drink' as const, route: '/' },
        { key: 'so-quy', label: 'Sổ Quỹ', icon: 'book-open-outline' as const, route: '/so-quy' },
        { key: 'bao-cao', label: 'Báo Cáo', icon: 'chart-box-outline' as const, route: '/bao-cao-loi-nhuan' },
        currentRole === 'manager'
          ? { key: 'giao-ca', label: 'Giao Ca', icon: 'cash-register' as const, route: '/giao-ca' }
          : { key: 'cai-dat', label: 'Cài Đặt', icon: 'cog-outline' as const, route: '/cai-dat' },
      ];
    }

    if (currentRole === 'cashier') {
      return [
        { key: 'tables', label: 'Bàn Ăn', icon: 'table-chair' as const, route: '/' },
        { key: 'pos', label: 'Gọi Món', icon: 'food-fork-drink' as const, route: '/' },
        { key: 'hoa-don', label: 'Sổ Đơn', icon: 'receipt' as const, route: '/hoa-don' },
        { key: 'so-quy', label: 'Sổ Quỹ', icon: 'book-open-outline' as const, route: '/so-quy' },
        { key: 'giao-ca', label: 'Giao Ca', icon: 'cash-register' as const, route: '/giao-ca' },
      ];
    }

    // Server (Phục vụ bàn)
    return [
      { key: 'tables', label: 'Bàn Ăn', icon: 'table-chair' as const, route: '/' },
      { key: 'pos', label: 'Gọi Món', icon: 'food-fork-drink' as const, route: '/' },
      { key: 'hoa-don', label: 'Sổ Đơn', icon: 'receipt' as const, route: '/hoa-don' },
      { key: 'cfd', label: 'Màn Khách', icon: 'monitor-dashboard' as const, route: '/cfd' },
      { key: 'huong-dan', label: 'Trợ Giúp', icon: 'help-circle-outline' as const, route: '/huong-dan' },
    ];
  }, [enableKds, currentRole]);

  return (
    <View
      style={[
        s.container,
        {
          backgroundColor: theme.surface.glassDock,
          borderTopColor: theme.border.glassBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4,
          paddingLeft: Math.max(insets.left, 8),
          paddingRight: Math.max(insets.right, 8),
          ...(Platform.OS === 'web'
            ? ({
                boxShadow: isDark
                  ? '0 -4px 20px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : '0 -2px 12px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              } as any)
            : Platform.OS === 'ios'
            ? {
                shadowColor: theme.surface.shadow,
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: isDark ? 0.08 : 0.04,
                shadowRadius: 12,
              }
            : { elevation: 2 }),
        },
      ]}
    >
      {/* 🌟 TRẠNG THÁI 1: THỰC ĐƠN KHI CÓ MÓN: [GIỎ HÀNG] + [IN TẠM TÍNH] + [5 TABS] + [LƯU BẾP] + [TIỀN THANH TOÁN] */}
      {isCartMode ? (
        <View style={s.cartMorphRow}>
          {/* 1. Icon Giỏ Hàng kèm Badge Số Lượng Món */}
          <PressableScale
            activeScale={0.94}
            haptic="tick"
            playSound
            accessibilityRole="button"
            accessibilityLabel={`Giỏ hàng, ${totalQty} món`}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={handleCartPress}
            style={[
              s.cartIconBtn,
              {
                backgroundColor: theme.brand.primaryBg,
                borderColor: theme.brand.primary,
              },
            ]}
          >
            <Icon name="cart-outline" size={22} color={theme.brand.primary} />
            <View style={[s.badge, { backgroundColor: theme.brand.danger }]}>
              <AppText variant="xs" weight="bold" color={theme.text.onBrand} tabularNums>
                {totalQty}
              </AppText>
            </View>
          </PressableScale>



          {/* 3. Nút Lưu Đơn (1-Chạm: Báo bếp / Lưu bàn, trở về danh sách món) */}
          <PressableScale
            activeScale={0.96}
            haptic="celebrate"
            playSound
            accessibilityRole="button"
            accessibilityLabel="Lưu đơn báo bếp"
            onPress={handleSaveOrderPress}
            style={[
              s.saveOrderBtn,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.default,
              },
            ]}
          >
            <Icon name="content-save-check-outline" size={20} color={theme.text.primary} />
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Lưu Đơn
            </AppText>
          </PressableScale>

          {/* 4. Nút Thanh Toán Màu Cam Chuẩn Apple Hiển Thị Số Tiền Trực Tiếp */}
          <PressableScale
            activeScale={0.96}
            haptic="step"
            playSound
            accessibilityRole="button"
            accessibilityLabel={`Thanh toán ${totalAmount.toLocaleString('vi-VN')} đồng`}
            onPress={handlePayPress}
            containerStyle={{ flex: 1.2, height: 48, minHeight: 48 }}
            style={[s.payAmountBtn, { backgroundColor: theme.brand.accent }]}
          >
            <Icon name="cash-check" size={22} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
              {totalAmount.toLocaleString('vi-VN')} đ
            </AppText>
          </PressableScale>
        </View>
      ) : (
        /* 🌟 TRẠNG THÁI 2: STANDARD 5-TAB BOTTOM NAVIGATION BAR */
        <View style={s.tabRow}>
          {navItems.map((item) => {
            const isActive = currentTab === item.key;
            const isAllowed = canAccessRoute(item.route);
            const badgeValue =
              item.key === 'tables' && occupiedCount > 0
                ? occupiedCount
                : item.key === 'pos' && totalQty > 0
                ? totalQty
                : item.key === 'kds' && pendingKdsCount > 0
                ? pendingKdsCount
                : item.key === 'hoa-don' && todayOrdersCount > 0
                ? todayOrdersCount
                : undefined;

            const activeColor = theme.brand.accent;
            const activeBg = isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(180, 83, 9, 0.12)';
            const badgeBg = item.key === 'kds' ? theme.brand.danger : theme.brand.accent;

            const tabAccessibilityLabel = !isAllowed
              ? `${item.label}, đã bị khóa`
              : item.key === 'tables'
              ? occupiedCount > 0
                ? `Bàn ăn, ${occupiedCount} bàn có khách`
                : 'Bàn ăn'
              : item.key === 'pos'
              ? totalQty > 0
                ? `Gọi món, ${totalQty} món trong giỏ`
                : 'Gọi món'
              : item.key === 'kds'
              ? pendingKdsCount > 0
                ? `Bếp bar, ${pendingKdsCount} đơn chờ`
                : 'Bếp bar'
              : item.key === 'hoa-don'
              ? todayOrdersCount > 0
                ? `Sổ đơn, ${todayOrdersCount} đơn hôm nay`
                : 'Sổ đơn'
              : item.key === 'bao-cao'
              ? 'Báo cáo lợi nhuận 3 số vàng'
              : item.key === 'so-quy'
              ? 'Sổ quỹ thu chi'
              : item.key === 'giao-ca'
              ? 'Chốt két giao ca'
              : 'Cài đặt hệ thống';

            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={isAllowed ? 0.7 : 1}
                delayPressIn={0}
                disabled={!isAllowed}
                onPress={() => {
                  if (isAllowed) {
                    handleTabPress(item.key);
                  } else if (Platform.OS !== 'web') {
                    try {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    } catch {}
                  }
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive, disabled: !isAllowed }}
                accessibilityLabel={tabAccessibilityLabel}
                hitSlop={{ top: 6, bottom: 4, left: 0, right: 0 }}
                style={[s.tabBtn, !isAllowed && { opacity: 0.35 }]}
              >
                <View style={[s.iconBox, isActive && { backgroundColor: activeBg }]}>
                  <Icon
                    name={!isAllowed ? 'lock-outline' : item.icon}
                    size={isActive ? 24 : 22}
                    color={!isAllowed ? theme.text.muted : isActive ? activeColor : theme.text.muted}
                  />
                  {isAllowed && badgeValue !== undefined ? (
                    <View style={[s.tabBadge, { backgroundColor: badgeBg }]}>
                      <AppText variant="xxs" weight="bold" color={theme.text.onBrand} tabularNums>
                        {badgeValue > 99 ? '99+' : String(badgeValue)}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText
                  variant="sm"
                  weight={isActive ? 'medium' : 'normal'}
                  color={!isAllowed ? theme.text.muted : isActive ? activeColor : theme.text.muted}
                  style={{ marginTop: 2 }}
                  numberOfLines={1}
                >
                  {item.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    zIndex: 9999,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingTop: 4,
    paddingBottom: 4,
  },
  iconBox: {
    width: 50,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: 2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartMorphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 8,
  },
  cartIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
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
});
