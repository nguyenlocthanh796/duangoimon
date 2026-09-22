import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import {
  AppText,
  useAppToast,
  AppHeader,
  BottomNavBar,
  CollapsibleFilterBar,
  useNativeCollapsible,
  AppOmniSearch,
  Tier1Tabs,
  EmptyState,
} from '../../lib/components/ui';
import {
  usePOSStore,
  useKDSOrders,
  useStoreSettings,
  usePOSActions,
  KDSOrder,
  KDSItem,
} from '../../lib/store/usePOSStore';
import { playTapSound, playKitchenChime } from '../../lib/utils/sound';
import { KdsTicketCard, resolveKdsItemName } from '../../lib/components/pos/KdsTicketCard';

type StationFilter = 'all' | 'bar' | 'kitchen' | 'snack' | 'served';
type ViewMode = 'tickets' | 'aggregate';

const CHIP_BAR_HEIGHT = 42;

const KdsLiveClock = React.memo(() => {
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppText variant="xs" weight="normal" color={theme.text.muted} numberOfLines={1} tabularNums>
      {currentTime}
    </AppText>
  );
});

export default function KDSScreen() {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();

  const kdsOrders = useKDSOrders();
  const storeSettings = useStoreSettings();
  const enableKds = storeSettings?.enableKds ?? true;
  const { updateKDSItemStatus, updateKDSOrderStatus, markAllKDSItemsDone, autoCleanupKDSOrders } = usePOSActions();

  // ⚡ 3 Chốt An Toàn: Tự động dọn đơn KDS đã thanh toán sau thời gian cài đặt (mặc định 30 phút)
  useEffect(() => {
    // 1. Quét kiểm tra ngay khi mở màn hình KDS
    try {
      const cleanupFn = usePOSStore.getState().autoCleanupKDSOrders;
      if (typeof cleanupFn === 'function') {
        const cleanedInitial = cleanupFn();
        if (cleanedInitial > 0) {
          showToast({
            title: 'Đã dọn đơn cũ',
            message: `${cleanedInitial} đơn đã TT quá ${storeSettings?.kdsAutoCleanupMinutes || 30}p`,
            type: 'info',
          });
        }
      }
    } catch (_) {}

    // 2. Heartbeat interval quét mỗi 30 giây
    const interval = setInterval(() => {
      try {
        const cleanupFn = usePOSStore.getState().autoCleanupKDSOrders;
        if (typeof cleanupFn === 'function') {
          const count = cleanupFn();
          if (count > 0) {
            showToast({
              title: 'Đã dọn đơn cũ',
              message: `${count} đơn đã TT quá ${storeSettings?.kdsAutoCleanupMinutes || 30}p`,
              type: 'info',
            });
          }
        }
      } catch (_) {}
    }, 30000);

    return () => clearInterval(interval);
  }, []); // Run once on mount

  const [activeStation, setActiveStation] = useState<StationFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('tickets');
  const [omniSearchOpen, setOmniSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [undoBanner, setUndoBanner] = useState<{ orderId: string; tableName: string } | null>(null);

  // 🔔 Kitchen Audio Chime when new orders arrive
  const prevCountRef = useRef(kdsOrders.length);
  useEffect(() => {
    if (kdsOrders.length > prevCountRef.current && prevCountRef.current > 0) {
      playKitchenChime();
    }
    prevCountRef.current = kdsOrders.length;
  }, [kdsOrders.length]);

  // Quick-Return Collapsible hook (Native Driver diffClamp GPU)
  const { scrollY, onScroll } = useNativeCollapsible(CHIP_BAR_HEIGHT);

  // Filter orders by station or served status
  const filteredOrders = useMemo(() => {
    if (activeStation === 'served') {
      return kdsOrders.filter((order) => order.status === 'served');
    }
    return kdsOrders.filter((order) => {
      if (order.status === 'served') return false;
      if (activeStation === 'all') return true;
      return (order.items || []).some((item) => item.station === activeStation);
    });
  }, [kdsOrders, activeStation]);

  const servedOrders = useMemo(() => {
    return kdsOrders.filter((o) => o.status === 'served');
  }, [kdsOrders]);

  // Calculate quick stats (Single pass memoized)
  const { pendingCount, cookingCount, readyCount } = useMemo(() => {
    let pending = 0;
    let cooking = 0;
    let ready = 0;
    for (const o of kdsOrders) {
      if (o.status === 'pending') pending++;
      else if (o.status === 'cooking') cooking++;
      else if (o.status === 'ready') ready++;
    }
    return { pendingCount: pending, cookingCount: cooking, readyCount: ready };
  }, [kdsOrders]);

  // Station pending item counts
  const stationCounts = useMemo(() => {
    let bar = 0;
    let kitchen = 0;
    let snack = 0;
    kdsOrders.forEach((order) => {
      if (order.status === 'served') return;
      (order.items || []).forEach((it) => {
        const qty = Number(it.qty) || 1;
        if (it.status !== 'done') {
          if (it.station === 'bar') bar += qty;
          else if (it.station === 'kitchen') kitchen += qty;
          else if (it.station === 'snack') snack += qty;
        }
      });
    });
    return { all: bar + kitchen + snack, bar, kitchen, snack, served: servedOrders.length };
  }, [kdsOrders, servedOrders.length]);

  const loadServerKdsOrders = useCallback(async () => {
    try {
      const { apiClient } = await import('../../lib/api/apiClient');
      const res = await apiClient.getKDSOrders();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const currentKDS = usePOSStore.getState().kdsOrders || [];
        const existingIds = new Set(currentKDS.map((k: any) => k.id || k.orderCode));
        const newFromBackend = res.data
          .filter((o: any) => !existingIds.has(o.id) && !existingIds.has(o.order_code) && !existingIds.has(o.orderCode))
          .map((o: any) => {
            const nowTime = o.created_at
              ? new Date(o.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            return {
              id: o.id,
              orderCode: o.order_code || o.orderCode || `OD-${nowTime.replace(':', '')}`,
              tableId: o.table_id || o.tableId || 'takeaway',
              tableName: o.table_name || o.tableName || (o.table_id ? `Bàn ${o.table_id}` : 'Mang về'),
              guestCount: o.guest_count || o.guestCount || 2,
              createdAt: o.created_at || o.createdAt || new Date().toISOString(),
              orderTime: nowTime,
              elapsedMinutes: 0,
              status: (o.status === 'da_phuc_vu' ? 'served' : o.status === 'da_xong' ? 'ready' : o.status === 'dang_che_bien' ? 'cooking' : 'pending') as any,
              items: (o.items || []).map((it: any, idx: number) => {
                let tops: string[] = [];
                if (Array.isArray(it.selected_toppings)) tops = it.selected_toppings;
                else if (Array.isArray(it.selectedToppings)) tops = it.selectedToppings;
                else if (typeof it.toppings_json === 'string' && it.toppings_json) {
                  try { tops = JSON.parse(it.toppings_json); } catch {}
                }
                return {
                  id: it.id || `kds_i_${Date.now()}_${idx}`,
                  cartItemId: it.cartItemId || it.id || `ci_${Date.now()}_${idx}`,
                  name: it.product_name || it.name || (it.item && it.item.name) || 'Món',
                  qty: Number(it.quantity ?? it.qty) || 1,
                  selectedSize: it.selected_size || it.selectedSize,
                  sugarLevel: it.sugar_level || it.sugarLevel,
                  iceLevel: it.ice_level || it.iceLevel,
                  selectedToppings: tops,
                  note: it.note,
                  station: (it.station || 'kitchen') as any,
                  status: (it.kitchen_status === 'da_xong' ? 'done' : it.kitchen_status === 'dang_che_bien' ? 'cooking' : 'pending') as any,
                };
              }),
            };
          });
        if (newFromBackend.length > 0) {
          usePOSStore.setState({ kdsOrders: [...newFromBackend, ...currentKDS] });
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadServerKdsOrders();
  }, [loadServerKdsOrders]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    playTapSound();
    await loadServerKdsOrders();
    setRefreshing(false);
    showToast({ title: 'Đã cập nhật', type: 'info' });
  }, [loadServerKdsOrders, showToast]);

  const handleItemStatusToggle = useCallback((orderId: string, item: KDSItem) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const nextStatus = item.status === 'pending' ? 'cooking' : item.status === 'cooking' ? 'done' : 'pending';
    updateKDSItemStatus(orderId, item.id, nextStatus);
  }, [updateKDSItemStatus]);

  const handleMarkOrderDone = useCallback((order: KDSOrder) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    if (order.status === 'ready') {
      updateKDSOrderStatus(order.id, 'served');
      setUndoBanner({ orderId: order.id, tableName: order.tableName });
      showToast({
        title: 'Đã Phục Vụ',
        message: `Đã giao ${order.tableName}`,
        type: 'success',
      });
    } else {
      markAllKDSItemsDone(order.id);
      showToast({
        title: 'Bếp Đã Xong',
        message: `${order.tableName} sẵn sàng phục vụ`,
        type: 'info',
      });
    }
  }, [updateKDSOrderStatus, markAllKDSItemsDone, showToast]);

  const handleUndoServe = useCallback(() => {
    if (!undoBanner) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    updateKDSOrderStatus(undoBanner.orderId, 'ready');
    showToast({
      title: 'Đã Khôi Phục',
      message: `Đã đưa ${undoBanner.tableName} lại bếp`,
      type: 'info',
    });
    setUndoBanner(null);
  }, [undoBanner, updateKDSOrderStatus, showToast]);

  useEffect(() => {
    if (undoBanner) {
      const timer = setTimeout(() => setUndoBanner(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [undoBanner]);

  const handleRestoreOrder = useCallback((orderId: string, tableName: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    updateKDSOrderStatus(orderId, 'ready');
    showToast({
      title: 'Đã Khôi Phục',
      message: `Đã đưa ${tableName} lại bếp`,
      type: 'info',
    });
  }, [updateKDSOrderStatus, showToast]);

  // ⌨️ BỘ PHÍM TẮT BẾP / BAR TRÊN MÁY TÍNH WEB
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1-4: Lọc nhanh trạm chế biến
      if (e.key === '1') {
        e.preventDefault();
        playTapSound();
        setActiveStation('all');
      } else if (e.key === '2') {
        e.preventDefault();
        playTapSound();
        setActiveStation('kitchen');
      } else if (e.key === '3') {
        e.preventDefault();
        playTapSound();
        setActiveStation('bar');
      } else if (e.key === '4') {
        e.preventDefault();
        playTapSound();
        setActiveStation('snack');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        playTapSound();
        setViewMode((prev) => (prev === 'tickets' ? 'aggregate' : 'tickets'));
      } else if (e.key === ' ' && filteredOrders.length > 0) {
        // Space: Hoàn tất đơn đầu tiên đang chờ
        e.preventDefault();
        const pendingOrder = filteredOrders.find((o) => o.status !== 'served');
        if (pendingOrder) {
          handleMarkOrderDone(pendingOrder);
        }
      } else if (e.key === 'Escape') {
        if (omniSearchOpen) setOmniSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredOrders, handleMarkOrderDone, omniSearchOpen]);

  // Aggregate items across all active orders with orderId & itemId mapping for 1-tap batch completion
  const aggregatedItems = useMemo(() => {
    const map = new Map<string, {
      name: string;
      qty: number;
      note?: string;
      items: { orderId: string; itemId: string; tableName: string; qty: number }[];
    }>();

    filteredOrders.forEach((order) => {
      if (order.status === 'served') return;
      (order.items || []).forEach((item) => {
        if (item.status !== 'done') {
          const itemName = resolveKdsItemName(item);
          const itemSize = item.selectedSize || (item as any).selected_size || '';
          const qty = Number(item.qty) || 1;
          const key = `${itemName}_${itemSize}`;
          const existing = map.get(key);
          if (existing) {
            existing.qty += qty;
            existing.items.push({ orderId: order.id, itemId: item.id, tableName: order.tableName, qty });
          } else {
            map.set(key, {
              name: `${itemName}${itemSize ? ` (${itemSize})` : ''}`,
              qty,
              note: item.note,
              items: [{ orderId: order.id, itemId: item.id, tableName: order.tableName, qty }],
            });
          }
        }
      });
    });
    return Array.from(map.values());
  }, [filteredOrders]);

  // 1-Tap Batch Complete for aggregate items
  const handleBatchComplete = useCallback(
    (agg: { name: string; qty: number; items: { orderId: string; itemId: string; tableName: string; qty: number }[] }) => {
      playTapSound();
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      agg.items.forEach((it) => {
        updateKDSItemStatus(it.orderId, it.itemId, 'done');
      });
      showToast({
        title: 'Đã Xong Cả Mẻ',
        message: `Hoàn tất ${agg.qty} phần ${agg.name}`,
        type: 'success',
      });
    },
    [updateKDSItemStatus, showToast]
  );

  // 🌟 TRƯỜNG HỢP KDS ĐANG TẮT TRONG CÀI ĐẶT
  if (!enableKds) {
    return (
      <View style={[s.container, { backgroundColor: theme.surface.app }]}>
        <AppHeader
          title="Bếp & Bar"
          subtitle="Tính năng đang tắt"
          showBack
          onBack={() => router.replace('/')}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: theme.surface.card,
              borderWidth: 1,
              borderColor: theme.border.subtle,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Icon name="pot-steam" size={36} color={theme.text.muted} />
          </View>

          <AppText variant="md" weight="medium" color={theme.text.primary} style={{ textAlign: 'center', marginBottom: 6 }}>
            Bếp & Bar Đang Tắt
          </AppText>

          <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', maxWidth: 360, marginBottom: 24 }}>
            Màn hình KDS dành cho nhà hàng/quán có khu vực bếp và quầy pha chế độc lập. Quán nhỏ có thể tắt để giao diện tinh gọn.
          </AppText>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                router.push('/cai-dat' as any);
              }}
              style={{
                backgroundColor: theme.brand.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="cog-outline" size={16} color={theme.text.onBrand} />
              <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                Cài Đặt
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                router.replace('/');
              }}
              style={{
                backgroundColor: theme.surface.card,
                borderWidth: 1,
                borderColor: theme.border.subtle,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="arrow-left" size={16} color={theme.text.primary} />
              <AppText variant="xs" weight="medium" color={theme.text.primary}>
                Bán Hàng
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {!isWide && <BottomNavBar />}
      </View>
    );
  }



  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* 🌟 UNIFIED APP HEADER (Sidebar ẩn trên FOH) */}
      <AppHeader
        title="Bếp & Bar"
        subtitleNode={<KdsLiveClock />}
        showSearch
        onOpenSearch={() => setOmniSearchOpen(true)}
        rightCustom={
          <View
            style={[
              s.headerModeToggle,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.default,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setViewMode('tickets');
              }}
              accessibilityRole="button"
              accessibilityLabel="Chế độ xem theo từng phiếu bàn"
              style={[
                s.headerModeBtn,
                viewMode === 'tickets' && {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderWidth: StyleSheet.hairlineWidth,
                  ...(Platform.OS === 'web'
                    ? ({ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } as any)
                    : { elevation: 1 }),
                },
              ]}
            >
              <Icon
                name="view-grid"
                size={16}
                color={viewMode === 'tickets' ? theme.brand.primary : theme.text.muted}
              />
              <AppText
                variant="sm"
                weight={viewMode === 'tickets' ? 'medium' : 'normal'}
                color={viewMode === 'tickets' ? theme.brand.primary : theme.text.muted}
              >
                {isWide ? 'Theo Bàn' : 'Bàn'}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setViewMode('aggregate');
              }}
              accessibilityRole="button"
              accessibilityLabel="Chế độ xem gom tổng hợp các món"
              style={[
                s.headerModeBtn,
                viewMode === 'aggregate' && {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderWidth: StyleSheet.hairlineWidth,
                  ...(Platform.OS === 'web'
                    ? ({ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } as any)
                    : { elevation: 1 }),
                },
              ]}
            >
              <Icon
                name="format-list-bulleted"
                size={16}
                color={viewMode === 'aggregate' ? theme.brand.primary : theme.text.muted}
              />
              <AppText
                variant="sm"
                weight={viewMode === 'aggregate' ? 'medium' : 'normal'}
                color={viewMode === 'aggregate' ? theme.brand.primary : theme.text.muted}
              >
                {isWide ? 'Gom Món' : 'Gom'}
              </AppText>
            </TouchableOpacity>
          </View>
        }
      />

      {/* 🌟 FIXED TAB CHIP BAR (Cố định dính sát ngay dưới AppHeader, chỉ trượt ngang) */}
      <Tier1Tabs
        tabs={[
          { id: 'all', label: 'Tất Cả', badge: stationCounts.all, icon: 'storefront' },
          { id: 'bar', label: 'Quầy Bar', badge: stationCounts.bar, icon: 'cup-water' },
          { id: 'kitchen', label: 'Bếp Nóng', badge: stationCounts.kitchen, icon: 'pot-steam' },
          { id: 'snack', label: 'Ăn Vặt', badge: stationCounts.snack, icon: 'food-croissant' },
          { id: 'served', label: 'Vừa Xong', badge: stationCounts.served, icon: 'history' },
        ]}
        activeTab={activeStation}
        onTabChange={(id) => setActiveStation(id as StationFilter)}
        backgroundColor={theme.status.warningBg}
      />

      {/* 🌟 MAIN CONTENT AREA */}
      <View style={{ flex: 1 }}>
        {/* Main Content Area */}
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            s.mainScroll,
            {
              paddingTop: isWide ? 16 : 8,
              paddingBottom: isWide ? 24 : 16,
            },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.brand.primary} />}
        >
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon="check-all"
            message="Tất cả các món đã hoàn thành!"
            description="Không có đơn nào đang chờ chế biến."
          />
        ) : activeStation === 'served' ? (
          /* Served View: Recent completed orders with Restore action */
          <View style={[s.ticketsGrid, !isWide && s.ticketsGridMobile]}>
            {servedOrders.length === 0 ? (
              <EmptyState
                icon="history"
                message="Chưa có đơn nào đã phục vụ trong ca"
              />
            ) : (
              servedOrders.map((order) => (
                <View
                  key={order.id}
                  style={[
                    s.ticketCard,
                    !isWide && {
                      minWidth: '100%',
                      maxWidth: '100%',
                      borderRadius: 0,
                      borderLeftWidth: 0,
                      borderRightWidth: 0,
                      borderTopWidth: 0,
                      borderBottomWidth: 6,
                      borderBottomColor: theme.surface.header,
                    },
                    {
                      backgroundColor: theme.surface.card,
                      borderColor: isWide ? theme.border.subtle : 'transparent',
                      borderWidth: isWide ? StyleSheet.hairlineWidth : 0,
                      borderRadius: isWide ? 14 : 0,
                      opacity: 0.9,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.ticketHeader,
                      {
                        backgroundColor: theme.surface.header,
                        borderBottomColor: theme.border.subtle,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                      },
                    ]}
                  >
                    <View>
                      <AppText variant="sm" weight="medium" color={theme.text.primary}>
                        {order.tableName}
                      </AppText>
                      <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 1 }}>
                        {order.orderCode} · {order.orderTime} · {order.autoCleaned ? 'Tự động dọn' : 'Đã bưng'}
                      </AppText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {order.autoCleaned && (
                        <View
                          style={[
                            s.timerBadge,
                            {
                              backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : 'rgba(13, 148, 136, 0.12)',
                              borderColor: theme.brand.primary,
                              borderWidth: StyleSheet.hairlineWidth,
                            },
                          ]}
                        >
                          <Icon name="robot-outline" size={11} color={theme.brand.primary} />
                          <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                            Tự động dọn
                          </AppText>
                        </View>
                      )}
                      <View style={[s.timerBadge, { backgroundColor: theme.status.readyBg }]}>
                        <Icon name="check" size={11} color={theme.status.readyText} />
                        <AppText variant="xs" weight="medium" color={theme.status.readyText}>
                          Đã giao
                        </AppText>
                      </View>
                    </View>
                  </View>

                  <View style={s.ticketItemsList}>
                    {order.items.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          s.itemRow,
                          {
                            borderBottomColor: theme.border.subtle,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                          },
                        ]}
                      >
                        <AppText
                          variant="xs"
                          color={theme.text.muted}
                          style={{ textDecorationLine: 'line-through' }}
                        >
                          {item.qty}x {item.name}
                        </AppText>
                      </View>
                    ))}
                  </View>

                  <View style={[s.ticketFooter, { borderTopColor: theme.border.default, paddingHorizontal: 14, paddingVertical: 8 }]}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleRestoreOrder(order.id, order.tableName)}
                      style={[
                        s.orderActionBtn,
                        {
                          backgroundColor: theme.surface.header,
                          borderColor: theme.border.default,
                          borderWidth: StyleSheet.hairlineWidth,
                          height: 38,
                          borderRadius: 10,
                        },
                      ]}
                    >
                      <Icon name="undo" size={15} color={theme.brand.primary} />
                      <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                        Khôi Phục Đơn
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : viewMode === 'tickets' ? (
          /* Ticket View: Grid of Orders */
          <View style={[s.ticketsGrid, !isWide && s.ticketsGridMobile, isDesktopLarge && { padding: 24, gap: 20 }]}>
            {filteredOrders.map((order) => (
              <KdsTicketCard
                key={order.id}
                order={order}
                activeStation={activeStation}
                onItemStatusToggle={handleItemStatusToggle}
                onMarkOrderDone={handleMarkOrderDone}
              />
            ))}
          </View>
        ) : (
          /* Aggregated Item View: Group by item name (Compact Flat Batch Rows) */
          <View style={[s.aggregateContainer, { paddingHorizontal: isWide ? (isDesktopLarge ? 24 : 16) : 0, paddingTop: isWide ? (isDesktopLarge ? 24 : 16) : 0, gap: isWide ? 12 : 0 }]}>
            <View
              style={[
                s.aggregateHeaderCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderTopWidth: isWide ? StyleSheet.hairlineWidth : 0,
                  borderLeftWidth: isWide ? StyleSheet.hairlineWidth : 0,
                  borderRightWidth: isWide ? StyleSheet.hairlineWidth : 0,
                  borderRadius: isWide ? 12 : 0,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                },
              ]}
            >
              <Icon name="information-outline" size={15} color={theme.brand.primary} />
              <AppText variant="xs" color={theme.text.primary} style={{ flex: 1 }}>
                Tổng hợp món cần chuẩn bị theo đợt trên toàn quán:
              </AppText>
            </View>

            <View style={[s.aggregateGrid, !isWide && { gap: 0 }, isDesktopLarge && { gap: 14 }]}>
              {aggregatedItems.map((agg, idx) => (
                <View
                  key={idx}
                  style={[
                    s.aggregateCard,
                    !isWide && {
                      minWidth: '100%',
                      maxWidth: '100%',
                      borderRadius: 0,
                      borderLeftWidth: 0,
                      borderRightWidth: 0,
                      borderTopWidth: 0,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border.subtle,
                    },
                    {
                      backgroundColor: theme.surface.card,
                      borderColor: isWide ? theme.border.subtle : 'transparent',
                      borderWidth: isWide ? StyleSheet.hairlineWidth : 0,
                      borderRadius: isWide ? 12 : 0,
                      elevation: 0,
                    },
                  ]}
                >
                  <View style={[s.aggRow, { paddingHorizontal: 14, paddingVertical: 10 }]}>
                    {/* Badge số lượng lớn đậm */}
                    <View style={[s.aggQtyBadge, { backgroundColor: theme.brand.primaryBg }]}>
                      <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                        {agg.qty}x
                      </AppText>
                    </View>

                    {/* Tên món + Bàn gọi */}
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
                        {agg.name}
                      </AppText>
                      {agg.note ? (
                        <AppText variant="xs" weight="medium" color={theme.brand.accent} numberOfLines={1} style={{ marginTop: 2 }}>
                          📝 {agg.note}
                        </AppText>
                      ) : null}
                      <View style={s.aggTablePills}>
                        {agg.items.map((it, i) => (
                          <View key={i} style={[s.aggPill, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
                            <AppText variant="xs" color={theme.brand.primary} tabularNums>
                              {it.tableName} ({it.qty})
                            </AppText>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* 1-Tap Batch Complete Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleBatchComplete(agg)}
                      style={[s.batchCompleteBtn, { backgroundColor: theme.brand.accent, height: 42, paddingHorizontal: 14, borderRadius: 10 }]}
                    >
                      <Icon name="check-all" size={16} color={theme.text.onBrand} />
                      <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                        Xong Mẻ
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </Animated.ScrollView>
    </View>

      {/* 🌟 FLOATING UNDO BANNER */}
      {undoBanner && (
        <View
          style={[
            s.undoBanner,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.brand.primary,
              bottom: Math.max(insets.bottom, 16) + (!isWide ? 64 : 12),
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Icon name="check-circle" size={20} color={theme.brand.success} />
            <AppText variant="xs" weight="medium" color={theme.text.primary}>
              Đã giao {undoBanner.tableName}
            </AppText>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleUndoServe}
            style={[s.undoBtn, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}
          >
            <Icon name="undo" size={14} color={theme.brand.primary} />
            <AppText variant="xs" weight="bold" color={theme.brand.primary}>
              Hoàn Tác
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* 🌟 SPOTLIGHT SEARCH DRAWER */}
      <AppOmniSearch visible={omniSearchOpen} onClose={() => setOmniSearchOpen(false)} />

      {/* 🌟 SMART BOTTOM NAVBAR ON MOBILE */}
      {!isWide && <BottomNavBar activeTab="kds" />}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header Mode Toggle (Chuẩn Apple HIG Segmented Control)
  headerModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  headerModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    gap: 6,
  },
  wideFilterBar: {
    paddingVertical: 6,
  },

  // Metric Strip (Slim Compact 36px 1 dòng)
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
  },

  mainScroll: {
    padding: 0,
  },
  ticketsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
  },
  ticketsGridMobile: {
    flexDirection: 'column',
    gap: 0,
    padding: 0,
  },
  aggregateContainer: {
    gap: 10,
    padding: 16,
  },
  aggregateHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  aggregateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  aggregateCard: {
    flex: 1,
    minWidth: 280,
    overflow: 'hidden',
  },
  aggRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aggQtyBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aggTablePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  aggPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  batchCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },

  // Floating Undo Banner
  undoBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 4,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },

  // Served Ticket Styles
  ticketCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ticketItemsList: {
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ticketFooter: {
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  orderActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    gap: 6,
  },
});
