import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Modal,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import {
  useTableList,
  useKDSOrders,
  useOutOfStockProductIds,
  usePOSStore,
  useIsRailCollapsed,
  useOrderHistory,
  useStoreSettings,
} from '../../store/usePOSStore';
import { useAuthStore, checkRoutePermission } from '../../store/useAuthStore';
import { useResponsive } from '../../hooks/useResponsive';
import { playTapSound } from '../../utils/sound';

export interface RailNavItem {
  id: string;
  route: string;
  label: string;
  subtitle?: string;
  metricText?: string;
  icon: keyof typeof Icon.glyphMap;
  badge?: number;
  badgeColor?: string;
}

export interface RailNavCluster {
  id: string;
  title: string;
  items: RailNavItem[];
}

const DRAWER_WIDTH = 340;

export const AppRailNav: React.FC = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const currentRole = useAuthStore((s) => s.currentRole);
  const currentUser = useAuthStore((s) => s.currentUser);
  const tenant = useAuthStore((s) => s.tenant);
  const activeBranch = useAuthStore((s) => s.getActiveBranch());
  const canAccessRoute = (route?: string) => checkRoutePermission(currentRole, route);

  const { isDesktop } = useResponsive();
  const isRailCollapsed = useIsRailCollapsed();
  const toggleRailCollapse = usePOSStore((s) => s.toggleRailCollapse);

  // 🌟 Base RailNav cố định 68px để 100% bảo toàn diện tích bán hàng POS. Mở rộng qua Floating Drawer Overlay!
  const isExpanded = false;
  const currentNavWidth = 68;

  const tables = useTableList();
  const kdsOrders = useKDSOrders();
  const outOfStockIds = useOutOfStockProductIds();
  const orderHistory = useOrderHistory();
  const setViewMode = usePOSStore((s) => s.setViewMode);

  const storeSettings = useStoreSettings();
  const enableKds = storeSettings?.enableKds ?? true;

  const occupiedCount = tables.filter((t) => t.status === 'co_khach').length;
  const pendingKdsCount = enableKds ? kdsOrders.filter((o) => o.status === 'pending' || o.status === 'cooking').length : 0;
  const outOfStockCount = outOfStockIds.length;
  const orderHistoryCount = orderHistory.length;

  // Floating Drawer Overlay State
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNative = Platform.OS !== 'web';
    if (drawerVisible) {
      setDrawerMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: useNative,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: useNative,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 180,
          useNativeDriver: useNative,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: useNative,
        }),
      ]).start(({ finished }) => {
        if (finished) setDrawerMounted(false);
      });
    }
  }, [drawerVisible]);

  const handleCloseDrawer = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    setDrawerVisible(false);
  };

  const handleOpenDrawer = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }
    setDrawerVisible(true);
  };

  // 🌟 4 CỤM NGHIỆP VỤ ĐỒNG BỘ HOÀN TOÀN VỚI SIDEBAR
  const navClusters: RailNavCluster[] = [
    {
      id: 'cluster_service',
      title: 'VẬN HÀNH BÁN HÀNG',
      items: [
        {
          id: 'pos',
          route: '/',
          label: 'Bán Hàng & Gọi Món',
          subtitle: 'Sơ đồ bàn, mang về & thanh toán',
          icon: 'silverware-fork-knife',
          badge: occupiedCount > 0 ? occupiedCount : undefined,
          badgeColor: theme.brand.primary,
        },
        ...(enableKds
          ? [
              {
                id: 'kds',
                route: '/kds',
                label: 'Màn Hình Bếp / Bar',
                subtitle: 'Nhận món, trả món & chống sót đơn',
                icon: 'pot-steam' as const,
                badge: pendingKdsCount > 0 ? pendingKdsCount : undefined,
                badgeColor: theme.brand.danger,
              },
            ]
          : []),
        {
          id: 'hoa-don',
          route: '/hoa-don',
          label: 'Lịch Sử Đơn & Trả Món',
          subtitle: 'Soi đơn hủy, in lại bill & tra cứu',
          icon: 'receipt',
          metricText: 'Sổ đơn',
          badge: orderHistoryCount > 0 ? orderHistoryCount : undefined,
          badgeColor: theme.brand.primary,
        },
      ],
    },
    {
      id: 'cluster_menu',
      title: 'QUẢN LÝ BÀN & THỰC ĐƠN',
      items: [
        {
          id: 'thuc-don',
          route: '/thuc-don',
          label: 'Thực Đơn & Món Ăn',
          subtitle: 'Giá bán, size, topping & hết món',
          icon: 'food-outline',
          badge: outOfStockCount > 0 ? outOfStockCount : undefined,
          badgeColor: theme.brand.warning,
        },
        {
          id: 'kho-hang',
          route: '/kho-hang',
          label: 'Kho & Nguyên Liệu',
          subtitle: 'Nhập hàng, hao hụt & cảnh báo tồn',
          icon: 'package-variant-closed',
          metricText: 'Tồn kho',
        },
        {
          id: 'quan-ly-ban',
          route: '/quan-ly-ban',
          label: 'Sắp Xếp Phòng Bàn',
          subtitle: 'Kê thêm bàn, đổi tên tầng & khu vực',
          icon: 'table-chair',
          metricText: 'Khu vực',
        },
      ],
    },
    {
      id: 'cluster_finance',
      title: 'TÀI CHÍNH & CHỦ QUÁN',
      items: [
        {
          id: 'so-quy',
          route: '/so-quy',
          label: 'Sổ Quỹ Thu - Chi',
          subtitle: 'Chi chợ, đá, rau & phụ phí tức thì',
          icon: 'wallet-outline',
          metricText: 'Chi chợ 3s',
        },
        {
          id: 'giao-ca',
          route: '/giao-ca',
          label: 'Chốt Két Giao Ca',
          subtitle: 'Đếm tiền thực tế & kiểm lệch két',
          icon: 'account-cash-outline',
          metricText: 'Két 30s',
        },
        {
          id: 'bao-cao',
          route: '/bao-cao-loi-nhuan',
          label: 'Báo Cáo Lợi Nhuận',
          subtitle: '3 số vàng: Két, Bank, Lãi ròng',
          icon: 'chart-box-outline',
          metricText: '3 số vàng',
        },
        {
          id: 'khach-hang',
          route: '/khach-hang',
          label: 'Khách Quen & Sổ Nợ',
          subtitle: 'Tích điểm thành viên & công nợ gối đầu',
          icon: 'account-clock-outline',
          metricText: 'Sổ nợ',
        },
        {
          id: 'nhan-su',
          route: '/nhan-su',
          label: 'Nhân Viên & Bảng Ca',
          subtitle: 'Phân quyền vai trò, ca làm & chấm công',
          icon: 'account-group-outline',
          metricText: 'Chấm công',
        },
      ],
    },
    {
      id: 'cluster_system',
      title: 'HỆ THỐNG & THIẾT BỊ',
      items: [
        {
          id: 'cai-dat',
          route: '/cai-dat',
          label: 'Máy In & Thiết Bị',
          subtitle: 'Máy in LAN 9100, két RJ11 & mẫu bill',
          icon: 'cog-outline',
          metricText: 'TCP 9100',
        },
        {
          id: 'huong-dan',
          route: '/huong-dan',
          label: 'Cẩm Nang 1-Chạm',
          subtitle: 'Thao tác nhanh & xử lý sự cố POS',
          icon: 'help-circle-outline',
          metricText: 'Trợ giúp',
        },
      ],
    },
  ];

  const drawerNavClusters: RailNavCluster[] = [
    navClusters[0],
    navClusters[1],
    navClusters[2],
    {
      id: 'cluster_system',
      title: 'HỆ THỐNG & THIẾT BỊ',
      items: [
        {
          id: 'cai-dat',
          route: '/cai-dat',
          label: 'Máy In & Thiết Bị',
          subtitle: 'Máy in LAN 9100, két RJ11 & mẫu bill',
          icon: 'cog-outline',
          metricText: 'TCP 9100',
        },
        {
          id: 'cfd',
          route: '/cfd',
          label: 'Màn Phụ Khách (CFD)',
          subtitle: 'Giỏ hàng cho khách & VietQR động',
          icon: 'monitor-dashboard',
          metricText: 'VietQR',
        },
        {
          id: 'saas-admin',
          route: '/saas-admin',
          label: 'Quản Trị Hệ Thống',
          subtitle: 'Cấu hình tenant, chuỗi & chi nhánh',
          icon: 'cloud-lock-outline',
          metricText: 'Chủ chuỗi',
        },
        {
          id: 'huong-dan',
          route: '/huong-dan',
          label: 'Cẩm Nang 1-Chạm',
          subtitle: 'Thao tác nhanh & xử lý sự cố POS',
          icon: 'help-circle-outline',
          metricText: 'Trợ giúp',
        },
        {
          id: 'login',
          route: '/login',
          label: 'Đổi Ca / Khóa Máy',
          subtitle: 'Chuyển tài khoản thu ngân, mã PIN',
          icon: 'shield-account-outline',
          metricText: 'Mã PIN',
        },
      ],
    },
  ];

  const handleNavigate = (item: RailNavItem) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
    }

    if (drawerVisible) {
      setDrawerVisible(false);
    }

    if (item.route === '/') {
      setViewMode('tables');
      if (pathname !== '/') router.replace('/');
    } else if (pathname !== item.route) {
      router.push(item.route as any);
    }
  };

  const handleToggleTheme = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (_) {}
    }
    toggleTheme();
  };

  const activeColor = theme.brand.accent;
  const activeBg = isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(180, 83, 9, 0.12)';

  return (
    <>
      {/* 🌟 1. CỐT NAVIGATION: DESKTOP SIDEBAR (240PX) HOẶC COMPACT RAIL (68PX) */}
      <View
        style={[
          s.railContainer,
          {
            width: currentNavWidth,
            paddingHorizontal: 8,
            backgroundColor: theme.surface.card,
            borderRightColor: theme.border.subtle,
            borderRightWidth: StyleSheet.hairlineWidth,
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 14),
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 14),
            paddingLeft: Math.max(insets.left, 4),
          },
        ]}
      >
        {/* Header Thương Hiệu: Bấm Logo để mở Floating Drawer 280px */}
        <View style={s.brandBoxCollapsed}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleOpenDrawer}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Mở rộng menu chức năng"
          >
            <View style={[s.brandIconWrapper, { backgroundColor: 'transparent', overflow: 'hidden' }]}>
              <ExpoImage
                source={require('../../../assets/brand_app_icon.png')}
                style={{ width: 36, height: 36, borderRadius: 9 }}
                contentFit="contain"
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[s.divider, { backgroundColor: theme.border.subtle }]} />

        {/* Danh sách các cụm chức năng */}
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={[
            s.scrollContent,
            isExpanded ? { paddingHorizontal: 2 } : { alignItems: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {navClusters.map((cluster, cIdx) => (
            <View key={cluster.id} style={isExpanded ? { marginBottom: 10 } : undefined}>
              {/* Tiêu đề cụm (chỉ hiện khi mở rộng) */}
              {isExpanded ? (
                <AppText
                  variant="xxs"
                  weight="bold"
                  color={theme.text.muted}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}
                >
                  {cluster.title}
                </AppText>
              ) : (
                cIdx > 0 && (
                  <View
                    style={[
                      s.clusterDivider,
                      { backgroundColor: theme.border.subtle },
                    ]}
                  />
                )
              )}

              {/* Danh sách mục chuyển hướng */}
              {cluster.items.map((item) => {
                const isActive =
                  item.route === '/'
                    ? pathname === '/' || pathname === ''
                    : pathname.startsWith(item.route);
                const isAllowed = canAccessRoute(item.route);
                const itemAccessibilityLabel = `${item.label}${
                  isAllowed && item.badge !== undefined && item.badge > 0
                    ? `, ${item.badge > 99 ? '99+' : item.badge}`
                    : ''
                }`;

                const badgeBg = item.id === 'kds' ? theme.brand.danger : theme.brand.accent;

                if (isExpanded) {
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={isAllowed ? 0.7 : 1}
                      disabled={!isAllowed}
                      onPress={() => isAllowed && handleNavigate(item)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={itemAccessibilityLabel}
                      style={[
                        s.navButtonExpanded,
                        isActive && {
                          backgroundColor: activeBg,
                        },
                        !isAllowed && { opacity: 0.35 },
                      ]}
                    >
                      <Icon
                        name={!isAllowed ? 'lock-outline' : item.icon}
                        size={20}
                        color={
                          !isAllowed
                            ? theme.text.muted
                            : isActive
                            ? activeColor
                            : theme.text.muted
                        }
                      />
                      <AppText
                        variant="sm"
                        weight={isActive ? 'medium' : 'normal'}
                        color={isActive ? activeColor : theme.text.primary}
                        style={s.labelTextExpanded}
                        numberOfLines={1}
                      >
                        {item.label}
                      </AppText>
                      {isAllowed && item.badge !== undefined && item.badge > 0 && (
                        <View
                          style={[
                            s.badgePillExpanded,
                            { backgroundColor: badgeBg },
                          ]}
                        >
                          <AppText
                            variant="xxs"
                            weight="bold"
                            color={theme.text.onBrand}
                            tabularNums
                          >
                            {item.badge > 99 ? '99+' : String(item.badge)}
                          </AppText>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }

                // Collapsed 68px mode
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={isAllowed ? 0.7 : 1}
                    disabled={!isAllowed}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={itemAccessibilityLabel}
                    onPress={() => {
                      if (isAllowed) {
                        handleNavigate(item);
                      } else {
                        if (Platform.OS !== 'web') {
                          try {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          } catch {}
                        }
                      }
                    }}
                    style={[
                      s.navButtonCollapsed,
                      isActive && {
                        backgroundColor: activeBg,
                      },
                      !isAllowed && {
                        opacity: 0.35,
                      },
                    ]}
                  >
                    <Icon
                      name={!isAllowed ? 'lock-outline' : item.icon}
                      size={20}
                      color={
                        !isAllowed
                          ? theme.text.muted
                          : isActive
                          ? activeColor
                          : theme.text.muted
                      }
                    />
                    {isAllowed && item.badge !== undefined && item.badge > 0 && (
                      <View
                        style={[
                          s.badgeFloating,
                          { backgroundColor: badgeBg },
                        ]}
                      >
                        <AppText
                          variant="xxs"
                          weight="bold"
                          color={theme.text.onBrand}
                          tabularNums
                        >
                          {item.badge > 99 ? '99+' : String(item.badge)}
                        </AppText>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Chân Trang: Thông tin người dùng & Đổi Theme */}
        {isExpanded ? (
          <View style={[s.bottomBoxExpanded, { borderTopColor: theme.border.glassBorder }]}>
            {/* Thẻ người dùng đăng nhập */}
            <View style={[s.userCardExpanded, { backgroundColor: theme.surface.header }]}>
              <View style={[s.userAvatarCircle, { backgroundColor: theme.brand.primaryBg }]}>
                <Icon name="account-circle-outline" size={22} color={theme.brand.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <AppText variant="xs" weight="bold" color={theme.text.primary} numberOfLines={1}>
                  {currentUser?.name || 'Chủ Quán QUANQUAN'}
                </AppText>
                <AppText variant="xxs" weight="medium" color={theme.brand.primary}>
                  {currentUser?.role === 'owner'
                    ? 'CHỦ QUÁN'
                    : currentUser?.role === 'cashier'
                    ? 'THU NGÂN'
                    : 'NHÂN VIÊN'}
                </AppText>
              </View>
            </View>

            {/* Hàng nút tác vụ nhanh */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleToggleTheme}
                accessibilityRole="button"
                accessibilityLabel={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={[
                  s.themeBtnExpanded,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.default,
                    flex: 1,
                  },
                ]}
              >
                <Icon
                  name={isDark ? 'weather-sunny' : 'weather-night'}
                  size={16}
                  color={isDark ? theme.brand.warning : theme.text.primary}
                />
                <AppText variant="xs" weight="medium" color={theme.text.primary} style={{ marginLeft: 6 }}>
                  {isDark ? 'Sáng' : 'Tối'}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  if (pathname !== '/huong-dan') router.push('/huong-dan' as any);
                }}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                style={[
                  s.themeBtnExpanded,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.default,
                    paddingHorizontal: 12,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Hướng dẫn sử dụng"
              >
                <Icon name="help-circle-outline" size={16} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[s.bottomBox, { borderTopColor: theme.border.subtle, alignItems: 'center', gap: 6 }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenDrawer}
              style={[
                s.themeBtnCollapsed,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Mở rộng menu"
            >
              <Icon name="menu" size={18} color={theme.brand.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (_) {}
                }
                if (pathname !== '/huong-dan') router.push('/huong-dan' as any);
              }}
              style={[
                s.themeBtnCollapsed,
                {
                  backgroundColor: pathname === '/huong-dan' ? theme.brand.primaryBg : theme.surface.header,
                  borderColor: pathname === '/huong-dan' ? theme.brand.primary : theme.border.default,
                },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Hướng dẫn sử dụng"
            >
              <Icon
                name="help-circle-outline"
                size={18}
                color={pathname === '/huong-dan' ? theme.brand.primary : theme.text.muted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleToggleTheme}
              style={[
                s.themeBtnCollapsed,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            >
              <Icon
                name={isDark ? 'weather-sunny' : 'weather-night'}
                size={18}
                color={isDark ? theme.brand.warning : theme.text.primary}
              />
            </TouchableOpacity>

            <View style={s.onlineDotCollapsed}>
              <View style={[s.onlineDot, { backgroundColor: theme.brand.success }]} />
            </View>
          </View>
        )}
      </View>

      {/* 🌟 2. FLOATING OVERLAY DRAWER — NỔI LÊN TRÊN VỚI BACKDROP, HOÀN TOÀN KHÔNG ẢNH HƯỞNG LAYOUT PHÍA DƯỚI */}
      {drawerMounted && (
        <Modal
          visible={drawerMounted}
          transparent
          animationType="none"
          onRequestClose={handleCloseDrawer}
          statusBarTranslucent
        >
          <View style={StyleSheet.absoluteFill}>
            {/* Backdrop làm mờ */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={handleCloseDrawer}
              style={StyleSheet.absoluteFill}
            >
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: theme.surface.backdrop, opacity: fadeAnim },
                ]}
              />
            </TouchableOpacity>

            {/* Panel Floating Drawer trượt ra từ lề trái */}
            <Animated.View
              style={[
                s.floatingDrawer,
                {
                  width: DRAWER_WIDTH,
                  height: Platform.OS === 'web' ? '100vh' : '100%',
                  backgroundColor: theme.surface.card,
                  borderRightColor: theme.border.subtle,
                  transform: [{ translateX: slideAnim }],
                  paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 16),
                  paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 16),
                  paddingLeft: Math.max(insets.left, 14),
                },
              ]}
            >
              {/* Drawer Header */}
              <View style={[s.drawerHeader, { borderBottomColor: theme.border.subtle }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={[s.brandIconWrapper, { backgroundColor: 'transparent', overflow: 'hidden' }]}>
                    <ExpoImage
                      source={require('../../../assets/brand_app_icon.png')}
                      style={{ width: 38, height: 38, borderRadius: 10 }}
                      contentFit="contain"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="md" weight="bold" color={theme.text.primary}>
                      ONGCHU POS
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted}>
                      Hệ thống Vị Chủ Quán
                    </AppText>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleCloseDrawer}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng menu điều hướng"
                  style={[s.closeBtn, { backgroundColor: theme.surface.header }]}
                >
                  <Icon name="close" size={18} color={theme.text.primary} />
                </TouchableOpacity>
              </View>

              {/* Danh sách mục chuyển hướng theo cụm có tiêu đề phân đoạn */}
              <ScrollView
                style={{ flex: 1, width: '100%' }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[s.drawerScrollList, { flexGrow: 1 }]}
              >
                {drawerNavClusters.map((cluster) => {
                  const DRAWER_ICON_THEMES: Record<string, { color: string; bgLight: string; bgDark: string }> = {
                    pos: { color: theme.brand.accent, bgLight: 'rgba(180, 83, 9, 0.12)', bgDark: 'rgba(245, 158, 11, 0.22)' },
                    'quan-ly-ban': { color: theme.brand.accent, bgLight: 'rgba(180, 83, 9, 0.12)', bgDark: 'rgba(245, 158, 11, 0.22)' },
                    kds: { color: theme.brand.danger, bgLight: 'rgba(220, 38, 38, 0.12)', bgDark: 'rgba(239, 68, 68, 0.22)' },
                    'hoa-don': { color: theme.brand.primary, bgLight: 'rgba(28, 25, 23, 0.08)', bgDark: 'rgba(245, 245, 244, 0.15)' },
                    'thuc-don': { color: theme.brand.accent, bgLight: 'rgba(180, 83, 9, 0.12)', bgDark: 'rgba(245, 158, 11, 0.22)' },
                    'kho-hang': { color: theme.brand.primary, bgLight: 'rgba(2, 132, 199, 0.12)', bgDark: 'rgba(56, 189, 248, 0.22)' },
                    'so-quy': { color: theme.brand.success, bgLight: 'rgba(21, 128, 61, 0.12)', bgDark: 'rgba(34, 197, 94, 0.22)' },
                    'giao-ca': { color: theme.brand.success, bgLight: 'rgba(21, 128, 61, 0.12)', bgDark: 'rgba(34, 197, 94, 0.22)' },
                    'bao-cao': { color: theme.brand.accent, bgLight: 'rgba(180, 83, 9, 0.12)', bgDark: 'rgba(245, 158, 11, 0.22)' },
                    'nhan-su': { color: theme.brand.primary, bgLight: 'rgba(126, 34, 206, 0.12)', bgDark: 'rgba(192, 132, 252, 0.22)' },
                    'khach-hang': { color: theme.brand.accent, bgLight: 'rgba(126, 34, 206, 0.12)', bgDark: 'rgba(192, 132, 252, 0.22)' },
                    'cai-dat': { color: theme.text.muted, bgLight: 'rgba(87, 83, 78, 0.12)', bgDark: 'rgba(168, 162, 158, 0.22)' },
                    cfd: { color: theme.brand.success, bgLight: 'rgba(21, 128, 61, 0.12)', bgDark: 'rgba(34, 197, 94, 0.22)' },
                    'saas-admin': { color: theme.text.primary, bgLight: 'rgba(28, 25, 23, 0.08)', bgDark: 'rgba(245, 245, 244, 0.15)' },
                    'tai-app': { color: theme.brand.accent, bgLight: 'rgba(180, 83, 9, 0.12)', bgDark: 'rgba(245, 158, 11, 0.22)' },
                    'huong-dan': { color: theme.brand.primary, bgLight: 'rgba(2, 132, 199, 0.12)', bgDark: 'rgba(56, 189, 248, 0.22)' },
                    login: { color: theme.brand.accent, bgLight: 'rgba(180, 83, 9, 0.12)', bgDark: 'rgba(245, 158, 11, 0.22)' },
                  };

                  return (
                    <View key={cluster.id} style={{ marginBottom: 12 }}>
                      <AppText
                        variant="xs"
                        weight="bold"
                        color={theme.text.subtle}
                        style={s.drawerClusterTitle}
                      >
                        {cluster.title}
                      </AppText>
                      {cluster.items.map((item) => {
                        const isActive =
                          item.route === '/'
                            ? pathname === '/' || pathname === ''
                            : pathname.startsWith(item.route);
                        const isAllowed = canAccessRoute(item.route);
                        const drawerItemLabel = `${item.label}${
                          isAllowed && item.badge !== undefined && item.badge > 0
                            ? `, ${item.badge > 99 ? '99+' : item.badge}`
                            : ''
                        }`;
                        const itemTheme = DRAWER_ICON_THEMES[item.id] || {
                          color: theme.brand.accent,
                          bgLight: 'rgba(255, 107, 0, 0.12)',
                          bgDark: 'rgba(255, 159, 10, 0.22)',
                        };
                        const iconBg = isActive
                          ? (isDark ? 'rgba(255, 107, 0, 0.22)' : 'rgba(255, 107, 0, 0.14)')
                          : (isDark ? itemTheme.bgDark : itemTheme.bgLight);
                        const iconColor = isActive ? theme.brand.accent : itemTheme.color;

                        return (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={isAllowed ? 0.7 : 1}
                            disabled={!isAllowed}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isActive }}
                            accessibilityLabel={drawerItemLabel}
                            onPress={() => {
                              if (isAllowed) {
                                handleNavigate(item);
                              } else {
                                if (Platform.OS !== 'web') {
                                  try {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                  } catch {}
                                }
                              }
                            }}
                            style={[
                              s.navButton,
                              {
                                backgroundColor: isActive
                                  ? (isDark ? 'rgba(255, 107, 0, 0.12)' : 'rgba(255, 107, 0, 0.07)')
                                  : 'transparent',
                                borderColor: isActive
                                  ? (isDark ? 'rgba(255, 107, 0, 0.35)' : 'rgba(255, 107, 0, 0.25)')
                                  : 'transparent',
                              },
                              !isAllowed && {
                                opacity: 0.35,
                              },
                            ]}
                          >
                            <View
                              style={[
                                s.drawerIconSquircle,
                                {
                                  backgroundColor: iconBg,
                                },
                              ]}
                            >
                              <Icon
                                name={!isAllowed ? 'lock-outline' : item.icon}
                                size={17}
                                color={!isAllowed ? theme.text.muted : iconColor}
                              />
                            </View>
                            <View style={{ flex: 1, marginLeft: 10, justifyContent: 'center' }}>
                              <AppText
                                variant="md"
                                weight={isActive ? 'medium' : 'normal'}
                                color={!isAllowed ? theme.text.muted : isActive ? theme.brand.accent : theme.text.primary}
                                numberOfLines={1}
                              >
                                {item.label}
                              </AppText>
                              {item.subtitle ? (
                                <AppText
                                  variant="xs"
                                  color={theme.text.muted}
                                  numberOfLines={1}
                                  style={{ marginTop: 2 }}
                                >
                                  {item.subtitle}
                                </AppText>
                              ) : null}
                            </View>
                            {!isAllowed ? (
                              <View style={[s.lockedBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)' }]}>
                                <Icon name="lock" size={11} color={theme.text.muted} style={{ marginRight: 2 }} />
                                <AppText variant="xs" color={theme.text.muted}>
                                  Khóa
                                </AppText>
                              </View>
                            ) : item.badge !== undefined && item.badge > 0 ? (
                              <View
                                style={[
                                  s.badgePill,
                                  { backgroundColor: item.id === 'kds' ? theme.brand.danger : theme.brand.accent },
                                ]}
                              >
                                <AppText variant="xxs" weight="bold" color={theme.text.onBrand} tabularNums>
                                  {item.badge > 99 ? '99+' : String(item.badge)}
                                </AppText>
                              </View>
                            ) : item.metricText ? (
                              <View
                                style={[
                                  s.metricPill,
                                  {
                                    backgroundColor: isActive
                                      ? (isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(180, 83, 9, 0.12)')
                                      : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'),
                                  },
                                ]}
                              >
                                <AppText
                                  variant="xs"
                                  weight="medium"
                                  color={isActive ? theme.brand.accent : theme.text.muted}
                                  tabularNums
                                >
                                  {item.metricText}
                                </AppText>
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Drawer Bottom Controls */}
              <View style={[s.drawerBottom, { borderTopColor: theme.border.subtle, gap: 8 }]}>
                {/* 🏷️ Thẻ Định Danh Quán & Tài Khoản */}
                <View
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.border.subtle,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                    gap: 3,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="xxs" color={theme.text.muted}>
                      Tài khoản:
                    </AppText>
                    <AppText variant="xxs" weight="medium" color={theme.text.primary}>
                      {currentUser?.name || 'Chủ Quán'} · {currentRole === 'owner' ? 'Quản Trị' : currentRole === 'cashier' ? 'Thu Ngân' : currentRole === 'server' ? 'Phục Vụ' : 'Quản Lý'}
                    </AppText>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AppText variant="xxs" color={theme.text.muted}>
                      Chi nhánh:
                    </AppText>
                    <AppText variant="xxs" color={theme.text.muted}>
                      {activeBranch?.code || 'CN-01'} - {activeBranch?.name || 'Cửa Hàng Chính'}
                    </AppText>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleToggleTheme}
                  accessibilityRole="button"
                  accessibilityLabel={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
                  hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                  style={[
                    s.themeBtn,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.subtle,
                    },
                  ]}
                >
                  <Icon
                    name={isDark ? 'weather-sunny' : 'weather-night'}
                    size={18}
                    color={isDark ? theme.brand.warning : theme.text.primary}
                  />
                  <AppText variant="xs" weight="medium" color={theme.text.primary} style={{ marginLeft: 8 }}>
                    {isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
                  </AppText>
                </TouchableOpacity>

                <View style={s.statusRow}>
                  <View style={[s.onlineDot, { backgroundColor: theme.brand.success }]} />
                  <AppText variant="xxs" color={theme.text.muted}>
                    Trực tuyến đồng bộ · Sẵn sàng
                  </AppText>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </>
  );
};

const s = StyleSheet.create({
  railContainer: {
    borderRightWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
  },
  brandBoxExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  collapseToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonExpanded: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginVertical: 1.5,
    position: 'relative',
  },
  labelTextExpanded: {
    marginLeft: 10,
    flex: 1,
  },
  badgePillExpanded: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBoxExpanded: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    gap: 8,
  },
  userCardExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
  },
  userAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBtnExpanded: {
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  brandBoxCollapsed: {
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  brandIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  scrollContent: {
    paddingVertical: 4,
    gap: 6,
  },
  navButtonCollapsed: {
    width: 48,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  activeIndicatorCollapsed: {
    position: 'absolute',
    left: 2,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
  },
  badgeFloating: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clusterDivider: {
    width: 28,
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  drawerCluster: {
    gap: 4,
    marginBottom: 10,
  },
  drawerClusterTitle: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    letterSpacing: 0.5,
  },
  bottomBox: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    gap: 8,
  },
  themeBtnCollapsed: {
    width: 44,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  onlineDotCollapsed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },

  // 🌟 Styles for Floating Overlay Drawer
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  floatingDrawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    zIndex: 99999,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingRight: 14,
    flexDirection: 'column',
    ...(Platform.OS === 'web'
      ? ({
          height: '100vh',
          boxShadow: '6px 0 28px rgba(0, 0, 0, 0.16)',
        } as any)
      : Platform.OS === 'ios'
      ? {
          shadowColor: 'black',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
        }
      : { elevation: 8 }),
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerScrollList: {
    paddingVertical: 4,
    gap: 6,
  },
  navButton: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  drawerIconSquircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    marginLeft: 10,
    flex: 1,
  },
  badgePill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  drawerBottom: {
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    gap: 8,
  },
  themeBtn: {
    width: '100%',
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 6,
  },
});
