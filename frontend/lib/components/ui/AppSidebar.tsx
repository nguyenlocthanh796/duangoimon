import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  BackHandler,
  StatusBar as RNStatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useRouter, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText } from './AppText';
import { RoleSwitcher } from './RoleSwitcher';
import { useStoreSettings, usePOSStore } from '../../store/usePOSStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { playTapSound } from '../../utils/sound';
import { getFilteredNavGroups, getSplitNavConfig, NavItemConfig } from './sidebarConfig';

export interface AppSidebarProps {
  visible?: boolean;
  onClose?: () => void;
  storeName?: string;
  cashierName?: string;
}

const SIDEBAR_WIDTH = Math.min(320, Dimensions.get('window').width * 0.82);

const getItemIconTheme = (key: string, theme: any) => {
  switch (key) {
    case 'pos_home':
    case 'quan_ly_ban':
    case 'thuc_don':
    case 'pnl_report':
    case 'login_screen':
      return {
        color: theme.brand.accent,
        bgLight: 'rgba(180, 83, 9, 0.12)',
        bgDark: 'rgba(245, 158, 11, 0.22)',
      };
    case 'kds_screen':
      return {
        color: theme.brand.danger,
        bgLight: 'rgba(220, 38, 38, 0.12)',
        bgDark: 'rgba(239, 68, 68, 0.22)',
      };
    case 'so_quy':
    case 'giao_ca':
    case 'cfd_screen':
      return {
        color: theme.brand.success,
        bgLight: 'rgba(21, 128, 61, 0.12)',
        bgDark: 'rgba(34, 197, 94, 0.22)',
      };
    case 'kho_hang':
    case 'huong_dan':
    case 'tai_app':
      return {
        color: theme.brand.primary,
        bgLight: 'rgba(2, 132, 199, 0.12)',
        bgDark: 'rgba(56, 189, 248, 0.22)',
      };
    case 'nhan_su':
    case 'khach_hang':
      return {
        color: theme.brand.primary,
        bgLight: 'rgba(126, 34, 206, 0.12)',
        bgDark: 'rgba(192, 132, 252, 0.22)',
      };
    case 'cai_dat':
      return {
        color: theme.text.muted,
        bgLight: 'rgba(87, 83, 78, 0.12)',
        bgDark: 'rgba(168, 162, 158, 0.22)',
      };
    case 'lock_screen':
      return {
        color: theme.brand.warning,
        bgLight: 'rgba(217, 119, 6, 0.12)',
        bgDark: 'rgba(245, 158, 11, 0.22)',
      };
    case 'hoa_don':
    case 'saas_admin':
    default:
      return {
        color: theme.brand.primary,
        bgLight: theme.brand.primaryBg,
        bgDark: 'rgba(245, 245, 244, 0.15)',
      };
  }
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  visible: propVisible,
  onClose: propOnClose,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // Zustand UI Store state (fallback to prop if passed)
  const storeIsOpen = useUIStore((s) => s.isSidebarOpen);
  const storeCloseSidebar = useUIStore((s) => s.closeSidebar);

  const isOpen = propVisible !== undefined ? propVisible : storeIsOpen;
  const handleCloseCallback = propOnClose !== undefined ? propOnClose : storeCloseSidebar;

  const currentRole = useAuthStore((s) => s.currentRole);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const branches = useAuthStore((s) => s.branches);
  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];
  const switchBranch = useAuthStore((s) => s.switchBranch);
  const lockScreen = useAuthStore((s) => s.lockScreen);
  const isOwnerUser = useAuthStore((s) => s.isOwner());
  const tenant = useAuthStore((s) => s.tenant);
  const currentUser = useAuthStore((s) => s.currentUser);

  const [isBranchListMode, setIsBranchListMode] = useState(false);

  // Store data with granular primitive selectors
  const storeSettings = useStoreSettings();
  const enableKds = storeSettings?.enableKds ?? true;
  const occupiedCount = usePOSStore((s) => s.tables.filter((t) => t.status === 'co_khach').length);
  const totalTables = usePOSStore((s) => s.tables.length);
  const pendingKdsCount = usePOSStore((s) => (enableKds ? s.kdsOrders.filter((o) => o.status === 'pending' || o.status === 'cooking').length : 0));
  const outOfStockCount = usePOSStore((s) => s.outOfStockProductIds.length);
  const orderHistoryCount = usePOSStore((s) => s.orderHistory.length);
  const lowStockCount = usePOSStore((s) => s.inventoryItems.filter((i) => i.currentStock <= i.minStockAlert).length);

  const [mounted, setMounted] = useState(isOpen);
  const slideAnim = useRef(new Animated.Value(isOpen ? 0 : -SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  // Open/close animation
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          setIsBranchListMode(false);
        }
      });
    }
  }, [isOpen]);

  // Auto-close sidebar on route change
  useEffect(() => {
    if (storeIsOpen) {
      storeCloseSidebar();
    }
  }, [pathname]);

  // Hardware Back button on Android closes sidebar or exits branch list mode
  useEffect(() => {
    if (Platform.OS !== 'android' || !isOpen) return;
    const onBackPress = () => {
      if (isBranchListMode) {
        setIsBranchListMode(false);
        return true;
      }
      handleClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isOpen, isBranchListMode]);

  if (!mounted && !isOpen) {
    return null;
  }

  const handleClose = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    handleCloseCallback();
  };

  const handleNavigate = (item: NavItemConfig) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    handleClose();
    if (item.isAction) {
      lockScreen();
      router.replace('/login' as any);
    } else if (item.route) {
      if (item.route === '/' && pathname !== '/') {
        router.replace('/');
      } else if (pathname !== item.route) {
        router.push(item.route as any);
      }
    }
  };

  const { mainGroups: navGroups, bottomActions } = getSplitNavConfig(currentRole, enableKds);

  const getBadgeData = (item: NavItemConfig) => {
    switch (item.badgeKey) {
      case 'occupied':
        return occupiedCount > 0
          ? { text: `${occupiedCount}/${totalTables}`, isCount: true, color: theme.brand.accent }
          : null;
      case 'pendingKds':
        return pendingKdsCount > 0
          ? { text: `${pendingKdsCount}`, isCount: true, color: theme.brand.danger }
          : null;
      case 'outOfStock':
        return outOfStockCount > 0
          ? { text: `${outOfStockCount}`, isCount: true, color: theme.brand.warning }
          : null;
      case 'lowStock':
        return lowStockCount > 0
          ? { text: `${lowStockCount}`, isCount: true, color: theme.brand.danger }
          : null;
      case 'orderHistory':
        return orderHistoryCount > 0
          ? { text: `${orderHistoryCount}`, isCount: true, color: theme.brand.primary }
          : null;
      default:
        return null; // Bỏ hoàn toàn text phụ tĩnh ở Mobile theo yêu cầu
    }
  };

  const safeTop = Math.max(
    insets.top,
    Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 8 : 0,
    Platform.OS === 'ios' ? 48 : 20
  );
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 28 : 24);

  return (
    <View style={[StyleSheet.absoluteFill, s.overlayRoot]}>
      {/* Semi-transparent Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleClose}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: theme.surface.backdrop,
              opacity: fadeAnim,
            },
          ]}
        />
      </TouchableOpacity>

      {/* Floating Animated Drawer */}
      <Animated.View
        style={[
          s.drawer,
          {
            width: SIDEBAR_WIDTH,
            height: '100%',
            backgroundColor: theme.surface.card,
            borderRightColor: theme.border.default,
            shadowColor: theme.surface.shadow,
            shadowOpacity: isDark ? 0.12 : 0.08,
            elevation: 2,
            transform: [{ translateX: slideAnim }],
            paddingTop: safeTop,
            paddingBottom: safeBottom,
            paddingLeft: Math.max(insets.left, 0),
          },
        ]}
      >
        {isBranchListMode ? (
          <View style={{ flex: 1 }}>
            {/* Subview Header: Back Button, Title, Subtitle, Close */}
            <View style={[s.header, { borderBottomColor: theme.border.default }]}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  setIsBranchListMode(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Quay lại menu chính"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  s.headerActionBtn,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.subtle,
                  },
                ]}
              >
                <Icon name="arrow-left" size={18} color={theme.text.primary} />
              </TouchableOpacity>

              <View style={{ flex: 1, marginLeft: 4 }}>
                <AppText variant="sm" weight="medium" color={theme.text.primary} numberOfLines={1}>
                  Chọn Chi Nhánh
                </AppText>
                <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                  {branches.length} chi nhánh trực thuộc
                </AppText>
              </View>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Đóng thanh điều hướng"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  s.headerActionBtn,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.subtle,
                  },
                ]}
              >
                <Icon name="close" size={18} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Branch List */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollList}>
              <View style={s.groupContainer}>
                <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.groupHeader}>
                  CHI NHÁNH VẬN HÀNH
                </AppText>

                {branches.map((b) => {
                  const isCurrent = b.id === activeBranch.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Chọn chi nhánh ${b.name}, mã ${b.code}`}
                      onPress={() => {
                        playTapSound();
                        if (Platform.OS !== 'web') {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          } catch {}
                        }
                        switchBranch(b.id);
                        setIsBranchListMode(false);
                        handleClose();
                      }}
                      style={[
                        s.branchCard,
                        {
                          backgroundColor: isCurrent ? theme.brand.primaryBg : theme.surface.card,
                          borderColor: isCurrent ? theme.brand.primary : theme.border.subtle,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.iconSquircle,
                          {
                            backgroundColor: isCurrent
                              ? theme.brand.primary
                              : isDark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(15,23,42,0.05)',
                          },
                        ]}
                      >
                        <Icon
                          name="store-marker-outline"
                          size={18}
                          color={
                            isCurrent
                              ? theme.text.onBrand
                              : isDark
                              ? theme.brand.primary
                              : theme.text.primary
                          }
                        />
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText
                            variant="sm"
                            weight={isCurrent ? 'medium' : 'normal'}
                            color={isCurrent ? theme.brand.primary : theme.text.primary}
                            numberOfLines={1}
                            style={{ flexShrink: 1 }}
                          >
                            {b.name}
                          </AppText>
                          <View
                            style={[
                              s.branchCodeBadge,
                              {
                                backgroundColor: isCurrent ? theme.brand.primary : theme.surface.header,
                              },
                            ]}
                          >
                            <AppText
                              variant="xs"
                              weight="medium"
                              color={isCurrent ? theme.text.onBrand : theme.text.muted}
                              tabularNums
                            >
                              {b.code}
                            </AppText>
                          </View>
                        </View>

                        {b.address ? (
                          <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                            {b.address}
                          </AppText>
                        ) : null}
                      </View>

                      {isCurrent && (
                        <Icon name="check-circle" size={20} color={theme.brand.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Subview Footer */}
            <View style={[s.footer, { borderTopColor: theme.border.default }]}>
              <Icon name="shield-crown-outline" size={14} color={theme.brand.primary} />
              <AppText variant="xs" color={theme.text.muted}>
                Quyền Chủ Quán · Đổi chi nhánh vận hành
              </AppText>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Header: Store Avatar & Info + Actions (2 Rows: Thoáng đãng, không chen chúc) */}
            <View style={[s.header, { borderBottomColor: theme.border.default }]}>
              {/* Row 1: Brand & Top Actions */}
              <View style={s.headerRow1}>
                <View style={[s.avatar, { backgroundColor: 'transparent', overflow: 'hidden' }]}>
                  <ExpoImage
                    source={require('../../../assets/brand_app_icon.png')}
                    style={{ width: 40, height: 40, borderRadius: 10 }}
                    contentFit="contain"
                  />
                </View>

                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
                    {tenant?.name || storeSettings.storeName}
                  </AppText>
                  <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                    Hệ thống F&B Vị Chủ Quán
                  </AppText>
                </View>

                {/* Quick Theme Toggle Icon Button */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    playTapSound();
                    if (Platform.OS !== 'web') {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      } catch {}
                    }
                    toggleTheme();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    s.headerActionBtn,
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
                </TouchableOpacity>

                {/* Close Sidebar Button */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng thanh điều hướng"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    s.headerActionBtn,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.subtle,
                    },
                  ]}
                >
                  <Icon name="close" size={18} color={theme.text.primary} />
                </TouchableOpacity>
              </View>

              {/* Row 2: Role & Branch Pills (Rộng rãi, dễ chạm) */}
              <View style={s.headerRow2}>
                <RoleSwitcher compact />

                {/* Branch Pill (Tap to open inline branch list - Multi-branch Owner only) */}
                {branches.length > 1 && (
                  <TouchableOpacity
                    activeOpacity={isOwnerUser ? 0.7 : 1}
                    disabled={!isOwnerUser}
                    accessibilityRole="button"
                    accessibilityLabel={`Chi nhánh đang chọn: ${activeBranch.name}`}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      if (isOwnerUser) {
                        playTapSound();
                        setIsBranchListMode(true);
                      }
                    }}
                    style={[
                      s.branchPill,
                      {
                        backgroundColor: theme.surface.header,
                        borderColor: theme.border.subtle,
                        opacity: isOwnerUser ? 1 : 0.85,
                      },
                    ]}
                  >
                    <Icon name="map-marker-outline" size={14} color={theme.brand.primary} />
                    <AppText variant="xs" weight="medium" color={theme.brand.primary} numberOfLines={1}>
                      CN: {activeBranch.code}
                    </AppText>
                    {isOwnerUser && (
                      <Icon
                        name="chevron-right"
                        size={14}
                        color={theme.text.muted}
                      />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Scrollable Navigation Groups */}
            <ScrollView
              style={{ flex: 1, width: '100%' }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[s.scrollList, { flexGrow: 1 }]}
            >
              {navGroups.map((group) => (
                <View key={group.groupTitle} style={s.groupContainer}>
                  <AppText
                    variant="xs"
                    weight="bold"
                    color={theme.text.subtle}
                    style={s.groupHeader}
                  >
                    {group.groupTitle}
                  </AppText>

                  {group.items.map((item) => {
                    const isSelected = item.route ? pathname === item.route : false;
                    const badgeData = getBadgeData(item);
                    const itemTheme = getItemIconTheme(item.id, theme);
                    const iconBg = isSelected
                      ? (isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(180, 83, 9, 0.14)')
                      : (isDark ? itemTheme.bgDark : itemTheme.bgLight);
                    const iconColor = isSelected ? theme.brand.accent : itemTheme.color;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.title}${badgeData ? `, ${badgeData.text}` : ''}`}
                        onPress={() => handleNavigate(item)}
                        style={[
                          s.navItem,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(180, 83, 9, 0.07)')
                              : 'transparent',
                            borderColor: isSelected
                              ? (isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(180, 83, 9, 0.25)')
                              : 'transparent',
                          },
                        ]}
                      >
                        {/* 30px Squircle icon */}
                        <View
                          style={[
                            s.iconSquircle,
                            {
                              width: 30,
                              height: 30,
                              backgroundColor: iconBg,
                            },
                          ]}
                        >
                          <Icon
                            name={item.icon}
                            size={18}
                            color={iconColor}
                          />
                        </View>

                        {/* Titles - Cỡ chữ md (18px) */}
                        <View style={{ flex: 1 }}>
                          <AppText
                            variant="md"
                            weight={isSelected ? 'medium' : 'normal'}
                            color={isSelected ? theme.brand.accent : theme.text.primary}
                            numberOfLines={1}
                          >
                            {item.title}
                          </AppText>
                        </View>

                        {/* Badge or Metric */}
                        {badgeData && (
                          badgeData.isCount ? (
                            <View style={[s.badge, { backgroundColor: badgeData.color || theme.brand.accent }]}>
                              <AppText variant="xxs" weight="bold" color={theme.text.onBrand} tabularNums>
                                {badgeData.text}
                              </AppText>
                            </View>
                          ) : (
                            <View
                              style={[
                                s.metricPill,
                                {
                                  backgroundColor: isSelected
                                    ? (isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(180, 83, 9, 0.12)')
                                    : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'),
                                },
                              ]}
                            >
                              <AppText
                                variant="xs"
                                weight="medium"
                                color={isSelected ? theme.brand.accent : theme.text.muted}
                                tabularNums
                              >
                                {badgeData.text}
                              </AppText>
                            </View>
                          )
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* 🏷️ THÔNG TIN TÀI KHOẢN & MÃ QUÁN (TENANT ID) ĐỒNG BỘ ĐA THIẾT BỊ */}
            <View
              style={{
                marginHorizontal: 10,
                marginBottom: 6,
                padding: 8,
                borderRadius: 8,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.border.subtle,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                gap: 3,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                  <Icon name="storefront-outline" size={14} color={theme.brand.accent} />
                  <AppText variant="xs" weight="bold" color={theme.text.primary} numberOfLines={1}>
                    {tenant?.name || 'OngChu Lean POS'}
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={[s.onlineDot, { backgroundColor: theme.brand.success }]} />
                  <AppText variant="xxs" color={theme.brand.success} weight="medium">
                    Trực tuyến
                  </AppText>
                </View>
              </View>

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

            {/* Bottom Quick Action Bar: 3 nút ngang tinh gọn (Khóa Máy · Đổi Ca · Hướng Dẫn) */}
            {bottomActions.length > 0 && (
              <View style={[s.bottomActionsRow, { borderTopColor: theme.border.default }]}>
                {bottomActions.map((item) => {
                  const actionTheme = getItemIconTheme(item.id, theme);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={item.title}
                      onPress={() => handleNavigate(item)}
                      hitSlop={{ top: 5, bottom: 5, left: 4, right: 4 }}
                      style={[
                        s.bottomActionBtn,
                        {
                          backgroundColor: theme.surface.header,
                          borderColor: theme.border.subtle,
                        },
                      ]}
                    >
                      <Icon name={item.icon as any} size={16} color={actionTheme.color} />
                      <AppText variant="xxs" weight="medium" color={theme.text.primary} numberOfLines={1}>
                        {item.id === 'lock_screen' ? 'Khóa' : item.id === 'login_screen' ? 'Đổi Ca' : 'HD'}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Footer: Version & Offline-First Reassurance */}
            <View style={[s.footer, { borderTopColor: bottomActions.length > 0 ? 'transparent' : theme.border.default }]}>
              <View style={[s.onlineDot, { backgroundColor: theme.brand.success }]} />
              <AppText variant="xxs" color={theme.text.muted}>
                OngChu POS · Trực tuyến đồng bộ
              </AppText>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  overlayRoot: {
    zIndex: 999999,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 2,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  scrollList: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 8,
    gap: 10,
  },
  groupContainer: {
    gap: 2,
  },
  groupHeader: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    letterSpacing: 0.5,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 9,
    minHeight: 44,
  },
  iconSquircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
  },
  metricPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    minHeight: 52,
  },
  branchCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 34,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
    paddingBottom: 2,
  },
});
