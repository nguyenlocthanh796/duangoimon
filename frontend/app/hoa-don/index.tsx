import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  Animated,
  RefreshControl,
  BackHandler,
  Image,
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
  AppModal,
} from '../../lib/components/ui';
import { ReceiptThermalPaper, CameraAuditTrailView, getOrderRounds, getOrderAuditLogs } from '../../lib/components/pos';
import {
  usePOSStore,
  useOrderHistory,
  usePOSActions,
  useStoreSettings,
  OrderHistoryItem,
} from '../../lib/store/usePOSStore';
import { formatCurrency } from '../../lib/utils/format';
import { playTapSound } from '../../lib/utils/sound';
import { useAuthStore } from '../../lib/store/useAuthStore';
import { ManagerPinModal } from '../../lib/components/pos/ManagerPinModal';
import { getPublicBillUrl } from '../../lib/api/apiClient';

type PaymentFilter = 'all' | 'tien_mat' | 'vietqr' | 'the' | 'voided';
type DateFilterType = 'today' | 'yesterday' | '7days' | 'this_month' | 'all';

const CHIP_BAR_HEIGHT = 46;

export default function OrderHistoryScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();
  const { isWide, isDesktopLarge } = useResponsive();
  const storeSettings = useStoreSettings();

  const { scrollY, onScroll } = useNativeCollapsible(58);

  const orderHistory = useOrderHistory();
  const { voidOrder } = usePOSActions();

  // Auth & Branch Scoping
  const branches = useAuthStore((s) => s.branches);
  const activeBranch = useAuthStore((s) => s.getActiveBranch());
  const isOwner = useAuthStore((s) => s.isOwner());
  const isManager = useAuthStore((s) => s.isManager());
  const currentUser = useAuthStore((s) => s.currentUser);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(isOwner ? 'all' : (currentUser?.branchId || activeBranch.id));

  // Branch Chips for Owner / Manager
  const branchChips = useMemo(() => {
    if (!isOwner) {
      const b = branches.find((item) => item.id === selectedBranchId) || activeBranch;
      return [{ id: b.id, label: `📍 ${b.name} (Quản Lý)` }];
    }
    return [
      { id: 'all', label: '🏢 Toàn Chuỗi' },
      ...branches.map((b) => ({ id: b.id, label: `📍 ${b.name}` })),
    ];
  }, [branches, isOwner, selectedBranchId, activeBranch]);

  // Branch Scoped Order History
  const branchOrders = useMemo(() => {
    if (!selectedBranchId || selectedBranchId === 'all') return orderHistory;
    return orderHistory.filter((o) => !o.branchId || o.branchId === selectedBranchId);
  }, [orderHistory, selectedBranchId]);

  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [tabletDetailTab, setTabletDetailTab] = useState<'receipt' | 'camera'>('receipt');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [omniSearchOpen, setOmniSearchOpen] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<OrderHistoryItem | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderHistoryItem | null>(null);
  const [voidingOrder, setVoidingOrder] = useState<OrderHistoryItem | null>(null);
  const [voidReason, setVoidReason] = useState('Khách đổi ý');
  const [pinAction, setPinAction] = useState<'void_order' | 'reprint_bill' | null>(null);
  const [pendingPrintOrder, setPendingPrintOrder] = useState<OrderHistoryItem | null>(null);
  const [qrBillOrder, setQrBillOrder] = useState<OrderHistoryItem | null>(null);
  const requiresApproval = useAuthStore((s) => s.requiresManagerApproval);

  useEffect(() => {
    if (!selectedOrderDetail) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedOrderDetail(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedOrderDetail]);

  const loadServerOrders = useCallback(async () => {
    try {
      const { apiClient } = await import('../../lib/api/apiClient');
      const res = await apiClient.getOrders();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const currentHistory = usePOSStore.getState().orderHistory || [];
        const existingIds = new Set(currentHistory.map((h: any) => h.id || h.orderCode));
        const newFromBackend = res.data
          .filter((o: any) => !existingIds.has(o.id) && !existingIds.has(o.order_code))
          .map((o: any) => ({
            id: o.id,
            orderCode: o.order_code || o.id,
            tableId: o.table_id || 'takeaway',
            tableName: o.table_name || (o.table_id ? `Bàn ${o.table_id}` : 'Mang về'),
            createdAt: o.created_at || new Date().toISOString(),
            subtotal: o.subtotal || o.total_amount || 0,
            finalTotal: o.final_amount || o.total_amount || 0,
            discountAmount: o.discount_amount || 0,
            paidAmount: o.paid_amount || o.final_amount || o.total_amount || 0,
            changeAmount: o.change_amount || 0,
            guestCount: o.guest_count || 1,
            cashierName: o.cashier_name || 'Thu Ngân',
            paymentMethod: (o.payment_method || 'tien_mat') as any,
            status: o.status === 'voided' ? ('voided' as const) : ('paid' as const),
            items: (o.items || []).map((it: any) => ({
              cartItemId: it.id || `ci_${Date.now()}`,
              item: {
                id: it.product_id,
                name: it.product_name || 'Món',
                price: it.unit_price || 0,
                costPrice: 0,
                unit: 'Phần',
                category: 'Món',
                station: 'bar',
              },
              qty: it.quantity || 1,
              unitPrice: it.unit_price || 0,
              sentToKitchen: true,
            })),
          }));
        if (newFromBackend.length > 0) {
          usePOSStore.setState({
            orderHistory: [...newFromBackend, ...currentHistory],
          });
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadServerOrders();
  }, [loadServerOrders]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    await loadServerOrders();
    setRefreshing(false);
    showToast({
      title: 'Đã Đồng Bộ',
      message: 'Đã cập nhật hóa đơn mới nhất!',
      type: 'success',
    });
  }, [loadServerOrders, showToast]);

  // Lọc theo ngày (Hôm nay, Hôm qua, 7 ngày qua, Tháng này, Tất cả)
  // 🌟 Tự động mở rộng tìm kiếm toàn cục (Auto Global Search) khi gõ từ khóa
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const dateFilteredOrders = useMemo(() => {
    if (searchQuery.trim()) {
      // Khi gõ tìm kiếm -> bỏ qua bộ lọc ngày để tìm trên toàn bộ lịch sử
      return branchOrders;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayDate = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgoStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return branchOrders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      if (dateFilter === 'today') {
        return isSameDay(orderDate, now);
      }
      if (dateFilter === 'yesterday') {
        return isSameDay(orderDate, yesterdayDate);
      }
      if (dateFilter === '7days') {
        return orderDate >= sevenDaysAgoStart;
      }
      if (dateFilter === 'this_month') {
        return orderDate >= thisMonthStart;
      }
      return true; // 'all'
    });
  }, [branchOrders, dateFilter, searchQuery]);

  // Filtered orders list (kết hợp dateFilteredOrders + paymentFilter + searchQuery)
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter((order) => {
      // Payment filter
      if (paymentFilter === 'voided') {
        if (order.status !== 'voided') return false;
      } else if (paymentFilter !== 'all') {
        if (order.paymentMethod !== paymentFilter || order.status === 'voided') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = order.orderCode.toLowerCase().includes(q);
        const matchTable = order.tableName.toLowerCase().includes(q);
        const matchCashier = order.cashierName.toLowerCase().includes(q);
        const matchItem = order.items.some((it) => it.item?.name?.toLowerCase().includes(q));
        if (!matchCode && !matchTable && !matchCashier && !matchItem) return false;
      }

      return true;
    });
  }, [dateFilteredOrders, paymentFilter, searchQuery]);

  // Financial summary calculations (tính chuẩn xác theo khoảng thời gian đang chọn)
  const totalRevenue = useMemo(() => {
    return dateFilteredOrders
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + o.finalTotal, 0);
  }, [dateFilteredOrders]);

  const cashTotal = useMemo(() => {
    return dateFilteredOrders
      .filter((o) => o.status === 'paid' && o.paymentMethod === 'tien_mat')
      .reduce((sum, o) => sum + o.finalTotal, 0);
  }, [dateFilteredOrders]);

  const vietqrTotal = useMemo(() => {
    return dateFilteredOrders
      .filter((o) => o.status === 'paid' && o.paymentMethod === 'vietqr')
      .reduce((sum, o) => sum + o.finalTotal, 0);
  }, [dateFilteredOrders]);

  const counts = useMemo(() => {
    let tienMat = 0;
    let vietqr = 0;
    let the = 0;
    let voided = 0;
    for (const o of dateFilteredOrders) {
      if (o.status === 'voided') {
        voided++;
      } else if (o.paymentMethod === 'tien_mat') {
        tienMat++;
      } else if (o.paymentMethod === 'vietqr') {
        vietqr++;
      } else if (o.paymentMethod === 'the') {
        the++;
      }
    }
    return { all: dateFilteredOrders.length, tien_mat: tienMat, vietqr, the, voided };
  }, [dateFilteredOrders]);

  const executeVoid = () => {
    if (!voidingOrder) return;
    const success = voidOrder(voidingOrder.id, voidReason);
    if (success) {
      showToast({
        title: 'Đã Hủy Đơn',
        message: `Đã hoàn tiền đơn ${voidingOrder.orderCode}`,
        type: 'danger',
      });
    }
    setVoidingOrder(null);
  };

  const handleConfirmVoid = () => {
    if (!voidingOrder) return;
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    }

    if (requiresApproval('void_order')) {
      setPinAction('void_order');
      return;
    }

    executeVoid();
  };

  const executePrintAgain = (order: OrderHistoryItem) => {
    showToast({
      title: 'Đã In Lại',
      message: `Đang in đơn ${order.orderCode}`,
      type: 'success',
    });
    setSelectedReceiptOrder(null);
    setPendingPrintOrder(null);
  };

  const handlePrintAgain = (order: OrderHistoryItem) => {
    playTapSound();
    if (requiresApproval('reprint_bill')) {
      setPendingPrintOrder(order);
      setPinAction('reprint_bill');
      return;
    }

    executePrintAgain(order);
  };

  const activeOrder = selectedReceiptOrder || (isWide && filteredOrders.length > 0 ? filteredOrders[0] : null);

  const renderKpiSection = () => (
    <View
      style={[
        s.metricStrip,
        {
          backgroundColor: theme.surface.card,
          borderBottomColor: theme.border.subtle,
          borderTopColor: theme.border.subtle,
        },
      ]}
    >
      {/* 1. Doanh thu */}
      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Doanh thu ({counts.all})
        </AppText>
        <AppText variant="md" weight="medium" color={theme.brand.primary} tabularNums numberOfLines={1}>
          {formatCurrency(totalRevenue)} đ
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      {/* 2. Tiền mặt */}
      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Tiền mặt ({counts.tien_mat})
        </AppText>
        <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums numberOfLines={1}>
          {formatCurrency(cashTotal)} đ
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      {/* 3. Tiền QR */}
      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          VietQR ({counts.vietqr})
        </AppText>
        <AppText variant="md" weight="medium" color={theme.brand.accent} tabularNums numberOfLines={1}>
          {formatCurrency(vietqrTotal)} đ
        </AppText>
      </View>
    </View>
  );


  // 🌟 NẾU ĐANG CHỌN ĐƠN TRÊN MOBILE: HIỂN THỊ TRANG MỚI TOÀN MÀN HÌNH (ZERO POPUP, ZERO ACCORDION)
  if (selectedOrderDetail && !isWide) {
    const isVoided = selectedOrderDetail.status === 'voided';
    return (
      <View style={[s.container, { backgroundColor: theme.surface.app }]}>
        <AppHeader
          title={`Hóa Đơn ${selectedOrderDetail.orderCode}`}
          subtitle={`${selectedOrderDetail.tableName} · ${new Date(selectedOrderDetail.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
          showBack={true}
          onBack={() => {
            playTapSound();
            setSelectedOrderDetail(null);
          }}
          rightCustom={
            <TouchableOpacity
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => handlePrintAgain(selectedOrderDetail)}
              style={[s.iconHeaderBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
            >
              <Icon name="printer" size={18} color={theme.text.primary} />
            </TouchableOpacity>
          }
        />

        {/* 🌟 DÃY TAB CẤP 1 CHUẨN: Flat Underline Bar dính sát dưới AppHeader */}
        <Tier1Tabs
          tabs={[
            { id: 'receipt', label: 'Chi Tiết Bóc Tách', icon: 'receipt-text-outline' },
            { id: 'camera', label: 'Phiếu In K80', icon: 'printer-eye' },
          ]}
          activeTab={tabletDetailTab}
          onTabChange={(id) => setTabletDetailTab(id as any)}
          backgroundColor={theme.status.warningBg}
        />

        <ScrollView
          contentContainerStyle={{ padding: isWide ? 16 : 0, paddingBottom: insets.bottom + 90, gap: isWide ? 10 : 0 }}
          showsVerticalScrollIndicator={false}
        >
          {tabletDetailTab === 'receipt' ? (
            <>
              {/* 🌟 1. HERO COMPACT CARD (70px): Liền khối, không lãng phí màn hình đầu */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 12 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border.subtle,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    gap: 3,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText
                    variant="xl"
                    weight="medium"
                    color={isVoided ? theme.brand.danger : theme.brand.primary}
                    tabularNums
                    style={isVoided ? s.strikeThrough : undefined}
                  >
                    {formatCurrency(selectedOrderDetail.finalTotal)} đ
                  </AppText>
                  <View
                    style={[
                      s.statusPillLarge,
                      {
                        backgroundColor: isVoided ? theme.status.dangerBg : theme.surface.header,
                        borderColor: isVoided ? theme.brand.danger : theme.border.subtle,
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isVoided ? theme.brand.danger : theme.brand.success,
                        marginRight: 4,
                      }}
                    />
                    <AppText
                      variant="xs"
                      weight="medium"
                      color={isVoided ? theme.brand.danger : theme.text.primary}
                    >
                      {isVoided ? 'Đã hủy' : 'Đã thanh toán'}
                    </AppText>
                  </View>
                </View>

                {/* 1 dòng meta súc tích, tinh gọn */}
                <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
                  {selectedOrderDetail.tableName} · {selectedOrderDetail.paymentMethod === 'vietqr' ? 'VietQR' : selectedOrderDetail.paymentMethod === 'the' ? 'Thẻ POS' : 'Tiền mặt'} · {selectedOrderDetail.cashierName} · {new Date(selectedOrderDetail.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </AppText>

                {isVoided && (
                  <View
                    style={[
                      s.voidReasonBanner,
                      {
                        backgroundColor: theme.status.dangerBg,
                        borderColor: theme.brand.danger,
                        marginTop: 4,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                      Lý do hủy: {selectedOrderDetail.voidReason || 'Khách đổi ý'}
                      {selectedOrderDetail.voidedAt
                        ? ` · ${new Date(selectedOrderDetail.voidedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                        : ''}
                    </AppText>
                  </View>
                )}
              </View>

              {/* 🌟 2. DANH SÁCH MÓN & BÓC TÁCH TÀI CHÍNH HỢP NHẤT LIỀN KHỐI */}
              <View
                style={[
                  s.detailCard,
                  {
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                    borderRadius: isWide ? 12 : 0,
                    borderWidth: isWide ? 1 : 0,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border.subtle,
                    paddingHorizontal: 16,
                    marginTop: isWide ? 0 : 8,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <AppText variant="xs" weight="medium" color={theme.text.muted}>
                    DANH SÁCH MÓN ({selectedOrderDetail.items.reduce((s, it) => s + it.qty, 0)})
                  </AppText>
                  <AppText variant="xxs" color={theme.text.muted}>
                    {selectedOrderDetail.items.length} món
                  </AppText>
                </View>

                {(() => {
                  const detailRounds = getOrderRounds(selectedOrderDetail);
                  const hasDiscountsOrFees =
                    (selectedOrderDetail.discountAmount && selectedOrderDetail.discountAmount > 0) ||
                    (selectedOrderDetail.serviceFeeAmount && selectedOrderDetail.serviceFeeAmount > 0) ||
                    (selectedOrderDetail.vatAmount && selectedOrderDetail.vatAmount > 0);
                  const hasCashChange =
                    !isVoided &&
                    selectedOrderDetail.paymentMethod === 'tien_mat' &&
                    selectedOrderDetail.paidAmount > selectedOrderDetail.finalTotal &&
                    selectedOrderDetail.changeAmount > 0;

                  return (
                    <View style={{ gap: 8 }}>
                      {detailRounds.map((round) => (
                        <View key={round.roundIndex} style={{ gap: 4 }}>
                          {/* Round Header */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 }}>
                            <View style={[s.roundMilestoneBadge, { backgroundColor: theme.brand.primaryBg }]}>
                              <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
                                ĐỢT {round.roundIndex} · {round.orderedAt}
                              </AppText>
                            </View>
                            <AppText variant="xxs" color={theme.text.muted} tabularNums>
                              {round.items.length} món · {round.items.reduce((sum, it) => sum + it.qty, 0)} phần
                            </AppText>
                          </View>

                          {/* Items in Round */}
                          {round.items.map((it, idx) => (
                            <View key={idx} style={[s.fullPageItemRow, { borderBottomColor: theme.border.subtle }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 8 }}>
                                <View style={[s.qtyBadgeSquare, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary, marginTop: 1 }]}>
                                  <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                                    {it.qty}
                                  </AppText>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <AppText variant="md" weight="medium" color={theme.text.primary}>
                                    {it.name}
                                  </AppText>
                                  {it.selectedSize ? (
                                    <AppText variant="xxs" color={theme.text.muted} style={{ marginTop: 1 }}>
                                      • {it.selectedSize.toLowerCase().startsWith('size') ? it.selectedSize : `Size ${it.selectedSize}`}
                                    </AppText>
                                  ) : null}
                                  {it.note ? (
                                    <AppText variant="xxs" color={theme.brand.warning} style={{ marginTop: 1 }}>
                                      * {it.note}
                                    </AppText>
                                  ) : null}
                                </View>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                                  {formatCurrency(it.unitPrice * it.qty)} đ
                                </AppText>
                                {it.qty > 1 && (
                                  <AppText variant="xxs" color={theme.text.muted} tabularNums style={{ marginTop: 1 }}>
                                    {formatCurrency(it.unitPrice)} đ/phần
                                  </AppText>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      ))}

                      {/* Bóc Tách Tài Chính Liền Khối Dưới Đáy Món */}
                      <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle, gap: 4 }}>
                        {hasDiscountsOrFees && (
                          <View style={s.financeDetailRow}>
                            <AppText variant="xs" color={theme.text.muted}>Tạm tính tiền hàng:</AppText>
                            <AppText variant="md" weight="normal" color={theme.text.primary} tabularNums>{formatCurrency(selectedOrderDetail.subtotal)} đ</AppText>
                          </View>
                        )}
                        {selectedOrderDetail.discountAmount > 0 && (
                          <View style={s.financeDetailRow}>
                            <AppText variant="xs" color={theme.brand.danger}>Chiết khấu giảm giá:</AppText>
                            <AppText variant="md" weight="normal" color={theme.brand.danger} tabularNums>-{formatCurrency(selectedOrderDetail.discountAmount)} đ</AppText>
                          </View>
                        )}
                        {Boolean(selectedOrderDetail.serviceFeeAmount && selectedOrderDetail.serviceFeeAmount > 0) && (
                          <View style={s.financeDetailRow}>
                            <AppText variant="xs" color={theme.text.muted}>
                              Phí dịch vụ{selectedOrderDetail.serviceFeeRate ? ` (${selectedOrderDetail.serviceFeeRate}%)` : ''}:
                            </AppText>
                            <AppText variant="md" weight="normal" color={theme.text.primary} tabularNums>+{formatCurrency(selectedOrderDetail.serviceFeeAmount || 0)} đ</AppText>
                          </View>
                        )}
                        {Boolean(selectedOrderDetail.vatAmount && selectedOrderDetail.vatAmount > 0) && (
                          <View style={s.financeDetailRow}>
                            <AppText variant="xs" color={theme.text.muted}>
                              Thuế VAT{selectedOrderDetail.vatRate ? ` (${selectedOrderDetail.vatRate}%)` : ''}:
                            </AppText>
                            <AppText variant="md" weight="normal" color={theme.text.primary} tabularNums>+{formatCurrency(selectedOrderDetail.vatAmount || 0)} đ</AppText>
                          </View>
                        )}
                        <View style={[s.financeDetailRow, Boolean(hasDiscountsOrFees) ? { paddingTop: 4, marginTop: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.subtle } : undefined]}>
                          <AppText variant="xs" weight="medium" color={theme.text.primary}>Tổng thực thu:</AppText>
                          <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                            {formatCurrency(selectedOrderDetail.finalTotal)} đ
                          </AppText>
                        </View>
                        {hasCashChange && (
                          <>
                            <View style={s.financeDetailRow}>
                              <AppText variant="xs" color={theme.text.muted}>Tiền khách đưa:</AppText>
                              <AppText variant="md" color={theme.text.primary} tabularNums>{formatCurrency(selectedOrderDetail.paidAmount)} đ</AppText>
                            </View>
                            <View style={s.financeDetailRow}>
                              <AppText variant="xs" color={theme.text.muted}>Tiền thối lại:</AppText>
                              <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>{formatCurrency(selectedOrderDetail.changeAmount)} đ</AppText>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })()}
              </View>

              {/* 🌟 3. NHẬT KÝ THAO TÁC & AUDIT LOG (Sạch sẽ, chống tràn giờ) */}
              {(() => {
                const auditLogs = getOrderAuditLogs(selectedOrderDetail);
                return (
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderRadius: isWide ? 12 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border.subtle,
                        paddingHorizontal: 16,
                        marginTop: isWide ? 0 : 8,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 8 }}>
                      NHẬT KÝ THAO TÁC & AUDIT LOG
                    </AppText>

                    <View style={{ gap: 0 }}>
                      {auditLogs.map((log, idx) => {
                        const isLast = idx === auditLogs.length - 1;
                        const isVoidLog = log.type === 'warning' || log.action.includes('HỦY');
                        const showActor = log.actor && log.actor !== selectedOrderDetail.cashierName;

                        return (
                          <View key={log.id || idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            {/* Timeline Bullet Node & Line */}
                            <View style={{ alignItems: 'center', width: 14, paddingTop: 6 }}>
                              <View
                                style={[
                                  s.timelineBullet,
                                  {
                                    backgroundColor: isVoidLog
                                      ? theme.brand.danger
                                      : theme.brand.primary,
                                  },
                                ]}
                              />
                              {!isLast && (
                                <View
                                  style={[
                                    s.timelineHairline,
                                    { backgroundColor: theme.border.subtle },
                                  ]}
                                />
                              )}
                            </View>

                            {/* Log Content: Tên thao tác bọc riêng flex 1, giờ độc lập flexShrink 0 */}
                            <View style={{ flex: 1, paddingBottom: isLast ? 0 : 8, paddingLeft: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <AppText
                                    variant="xs"
                                    weight="normal"
                                    color={isVoidLog ? theme.brand.danger : theme.text.primary}
                                  >
                                    {log.action}
                                  </AppText>
                                </View>
                                <AppText variant="xxs" color={theme.text.muted} tabularNums style={{ flexShrink: 0, marginTop: 1 }}>
                                  {log.time}
                                </AppText>
                              </View>
                              {showActor ? (
                                <AppText variant="xxs" color={theme.text.muted} style={{ marginTop: 1 }}>
                                  Thực hiện: {log.actor}
                                </AppText>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}
            </>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <ReceiptThermalPaper order={selectedOrderDetail} storeSettings={storeSettings} isDark={isDark} />
            </View>
          )}
        </ScrollView>

        {/* 🌟 4. THANH TÁC VỤ ĐÁY: NÚT IN CHÍNH (78%) + NÚT HỦY PHỤ AN TOÀN (22%) */}
        <View
          style={[
            s.fullPageBottomBar,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              paddingBottom: Math.max(insets.bottom, 12),
              maxWidth: isWide ? 680 : undefined,
              alignSelf: isWide ? 'center' : undefined,
              alignItems: 'center',
            },
          ]}
        >
          {selectedOrderDetail.status !== 'voided' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                setVoidingOrder(selectedOrderDetail);
              }}
              style={[
                s.secondaryVoidBtn,
                {
                  backgroundColor: theme.status.dangerBg,
                  borderColor: theme.brand.danger,
                },
              ]}
              accessibilityLabel="Hủy hóa đơn"
            >
              <Icon name="trash-can-outline" size={20} color={theme.brand.danger} />
            </TouchableOpacity>
          )}

          {/* Nút xem / chia sẻ QR Bill Online */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setQrBillOrder(selectedOrderDetail);
            }}
            style={[
              s.secondaryQrBtn,
              {
                backgroundColor: theme.status.warningBg,
                borderColor: theme.brand.accent,
              },
            ]}
            accessibilityLabel="Mã QR Hóa Đơn Online"
          >
            <Icon name="qrcode-scan" size={18} color={theme.brand.accent} />
            <AppText variant="sm" weight="bold" color={theme.brand.accent} numberOfLines={1}>
              QR Bill
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              handlePrintAgain(selectedOrderDetail);
            }}
            style={[
              s.primaryPrintBtn,
              {
                backgroundColor: theme.brand.primary,
                borderColor: theme.brand.primary,
              },
            ]}
          >
            <Icon name="printer" size={18} color={theme.text.onBrand} />
            <AppText variant="sm" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
              In Lại K80
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Modal hiển thị mã QR Bill Online cho khách quét */}
        {qrBillOrder && (
          <AppModal
            visible={Boolean(qrBillOrder)}
            onClose={() => setQrBillOrder(null)}
            title={`QR Hóa Đơn ${qrBillOrder.orderCode}`}
            subtitle={`${qrBillOrder.tableName} · ${formatCurrency(qrBillOrder.finalTotal || 0)} đ`}
            icon="qrcode-scan"
            iconColor={theme.brand.accent}
            iconBg={theme.status.warningBg}
            presentation="dialog"
            maxWidth={440}
          >
            <View style={{ alignItems: 'center', paddingVertical: 12, gap: 12 }}>
              <View
                style={{
                  padding: 12,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      getPublicBillUrl(qrBillOrder.orderCode)
                    )}`,
                  }}
                  style={{ width: 180, height: 180 }}
                />
              </View>

              <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', paddingHorizontal: 12, lineHeight: 18 }}>
                Khách dùng camera điện thoại quét mã này để xem chi tiết và lưu hóa đơn điện tử không cần in giấy.
              </AppText>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.brand.primary,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  onPress={async () => {
                    const billUrl = getPublicBillUrl(qrBillOrder.orderCode);
                    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                      try {
                        await navigator.clipboard.writeText(billUrl);
                      } catch (_) {}
                    }
                    showToast({
                      title: 'Đã sao chép liên kết bill!',
                      type: 'success',
                    });
                  }}
                >
                  <Icon name="content-copy" size={16} color={theme.text.onBrand} />
                  <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                    Sao chép link
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.surface.header,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6,
                    borderWidth: 1,
                    borderColor: theme.border.subtle,
                  }}
                  onPress={() => {
                    router.push((`/b/${qrBillOrder.orderCode}`) as any);
                    setQrBillOrder(null);
                  }}
                >
                  <Icon name="open-in-new" size={16} color={theme.text.primary} />
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    Mở xem thử
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </AppModal>
        )}

        {/* Void confirmation modal */}
        {voidingOrder && (
          <AppModal
            visible={!!voidingOrder}
            title="Hủy Hóa Đơn & Hoàn Tiền"
            subtitle={`${voidingOrder.orderCode} · ${voidingOrder.tableName} (${formatCurrency(voidingOrder.finalTotal || 0)} đ)`}
            icon="alert-octagon"
            iconColor={theme.brand.danger}
            iconBg={theme.status.dangerBg}
            onClose={() => setVoidingOrder(null)}
            presentation="dialog"
            maxWidth={440}
            primaryAction={{
              label: 'Xác Nhận Hủy',
              variant: 'danger',
              onPress: handleConfirmVoid,
            }}
            secondaryAction={{
              label: 'Đóng',
              onPress: () => setVoidingOrder(null),
            }}
          >
            <View style={{ gap: 8 }}>
              <AppText variant="xs" color={theme.text.muted}>
                Chọn lý do hủy đơn:
              </AppText>
              <View style={s.reasonPills}>
                {['Khách đổi ý', 'Nhập sai tiền', 'Nhầm bàn', 'Lỗi món', 'Khác'].map((r) => {
                  const isSelected = voidReason === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => {
                        playTapSound();
                        setVoidReason(r);
                      }}
                      style={[
                        s.reasonPill,
                        {
                          backgroundColor: isSelected ? theme.brand.danger : theme.surface.header,
                          borderColor: isSelected ? theme.brand.danger : theme.border.default,
                        },
                      ]}
                    >
                      <AppText
                        variant="xs"
                        weight={isSelected ? 'medium' : 'normal'}
                        color={isSelected ? theme.text.onBrand : theme.text.primary}
                      >
                        {r}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </AppModal>
        )}
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* Top Header: Tiêu đề + Omni-Search Spotlight (Sidebar ẩn trên FOH) */}
      <AppHeader
        title="Sổ Đơn"
        subtitle={`${dateFilter === 'today' ? 'Hôm nay' : dateFilter === 'yesterday' ? 'Hôm qua' : dateFilter === '7days' ? '7 ngày qua' : dateFilter === 'this_month' ? 'Tháng này' : 'Tất cả'} · ${filteredOrders.length} đơn`}
        showSearch
        onOpenSearch={() => setOmniSearchOpen(true)}
      />

      {/* 🌟 FIXED TAB CHIP BAR (Cố định dính sát ngay dưới AppHeader, chỉ trượt ngang) */}
      <Tier1Tabs
        tabs={[
          { id: 'all', label: 'Tất Cả', badge: counts.all, icon: 'receipt' },
          { id: 'tien_mat', label: 'Tiền Mặt', badge: counts.tien_mat, icon: 'cash' },
          { id: 'vietqr', label: 'VietQR', badge: counts.vietqr, icon: 'qrcode-scan' },
          { id: 'the', label: 'Thẻ POS', badge: counts.the, icon: 'credit-card-outline' },
          { id: 'voided', label: 'Đã Hủy', badge: counts.voided, icon: 'cancel' },
        ]}
        activeTab={paymentFilter}
        onTabChange={(id) => setPaymentFilter(id as PaymentFilter)}
        backgroundColor={theme.surface.app}
      />

      {/* 🌟 DÃY 2: BỘ LỌC THỜI GIAN (Mặc định Hôm Nay, mở rộng Hôm qua / 7 ngày / Tháng này) */}
      <View style={{ backgroundColor: theme.surface.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: 'center' }}>
          {[
            { id: 'today', label: '★ Hôm nay' },
            { id: 'yesterday', label: 'Hôm qua' },
            { id: '7days', label: '7 ngày qua' },
            { id: 'this_month', label: 'Tháng này' },
            { id: 'all', label: 'Tất cả' },
          ].map((pill) => {
            const isSel = dateFilter === pill.id;
            return (
              <TouchableOpacity
                key={pill.id}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setDateFilter(pill.id as DateFilterType);
                }}
                style={{
                  height: 30,
                  paddingHorizontal: 12,
                  borderRadius: 15,
                  backgroundColor: isSel ? theme.brand.accent : theme.surface.header,
                  borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                  borderWidth: StyleSheet.hairlineWidth,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText
                  variant="xs"
                  weight={isSel ? 'bold' : 'normal'}
                  color={isSel ? theme.text.onBrand : theme.text.primary}
                >
                  {pill.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 🌟 DÃY 2: BỘ LỌC CHI NHÁNH (Chủ quán chọn toàn chuỗi / từng quán, Quản lý khóa cứng quán mình) */}
      {isOwner && branches.length > 1 && (
        <View style={{ backgroundColor: theme.surface.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: 'center' }}>
            <AppText variant="xs" weight="medium" color={theme.text.muted}>Chi nhánh:</AppText>
            {branchChips.map((chip) => {
              const isSel = selectedBranchId === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  onPress={() => {
                    playTapSound();
                    setSelectedBranchId(chip.id);
                  }}
                  style={{
                    height: 32,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    backgroundColor: isSel ? theme.brand.primary : theme.surface.header,
                    borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                    borderWidth: StyleSheet.hairlineWidth,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText variant="xs" weight={isSel ? 'bold' : 'normal'} color={isSel ? theme.text.onBrand : theme.text.primary}>
                    {chip.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {isManager && (
        <View style={{ backgroundColor: theme.surface.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle, paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="shield-account" size={16} color={theme.brand.purple} />
          <AppText variant="xs" color={theme.text.muted}>Phạm vi:</AppText>
          <AppText variant="xs" weight="bold" color={theme.brand.purple}>
            📍 {activeBranch.name} (Quản Lý Phụ Trách)
          </AppText>
        </View>
      )}

      {/* KPI Section (Tablet/Web: Fixed on Top) */}
      {isWide && renderKpiSection()}

      {/* 🌟 2-COLUMN WORKSPACE ON TABLET/WEB, 1-COLUMN ON MOBILE */}
      <View style={[s.mainWorkspace, isWide ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
        {/* Left Pane: Search, Filter Chips & Orders List (50% on 24-inch, 44% on Tablet/Web) */}
        <View style={[s.leftPane, isWide ? { width: isDesktopLarge ? '50%' : '44%', borderRightWidth: 1, borderRightColor: theme.border.glassBorder } : { flex: 1 }]}>
          {/* Search Bar on Tablet/Web */}
          {isWide && (
            <View style={[s.filterSection, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={[s.searchBar, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12 }]}>
                <Icon name="magnify" size={18} color={theme.text.muted} />
                <TextInput
                  placeholder="Tìm theo mã HD, tên bàn, món ăn..."
                  placeholderTextColor={theme.text.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[s.searchInput, { color: theme.text.primary }]}
                />
                {searchQuery ? (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="close-circle" size={16} color={theme.text.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          {/* Orders List with Pull-to-Refresh & Natural KPI Scroll */}
          <Animated.ScrollView
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.brand.primary]}
                tintColor={theme.brand.primary}
              />
            }
            contentContainerStyle={[
              {
                padding: isWide ? 16 : 0,
                gap: isWide ? 12 : 0,
                paddingTop: isWide ? 16 : 0,
                paddingBottom: isWide ? 24 : 120 + insets.bottom,
                flexGrow: 1,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* KPI on Mobile in Natural Scroll */}
            {!isWide && renderKpiSection()}
            {filteredOrders.length === 0 ? (
              <EmptyState
                icon="receipt"
                message="Không tìm thấy hóa đơn nào"
                description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc thanh toán."
              />
            ) : (
              filteredOrders.map((order) => {
                const isVoided = order.status === 'voided';
                const isSelected = isWide && activeOrder?.id === order.id;
                const orderTime = new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <TouchableOpacity
                    key={order.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      if (isWide) {
                        setSelectedReceiptOrder(order);
                      } else {
                        setSelectedOrderDetail(order);
                      }
                    }}
                    style={[
                      s.invoiceRow,
                      {
                        backgroundColor: isSelected ? theme.brand.primaryBg : theme.surface.card,
                        borderBottomColor: theme.border.subtle,
                      },
                    ]}
                  >
                    {/* Dòng 1: Mã hóa đơn (Trái) — Số tiền (Phải) */}
                    <View style={s.rowTopLine}>
                      <AppText
                        variant="md"
                        weight="medium"
                        color={isVoided ? theme.brand.danger : theme.text.primary}
                        tabularNums
                      >
                        {order.orderCode}
                      </AppText>

                      <AppText
                        variant="md"
                        weight="medium"
                        color={isVoided ? theme.brand.danger : theme.brand.primary}
                        tabularNums
                        style={isVoided ? s.strikeThrough : undefined}
                      >
                        {formatCurrency(order.finalTotal)} đ
                      </AppText>
                    </View>

                    {/* Dòng 2: Tên bàn (Trái) — Phương thức thanh toán & Chevron (Phải) */}
                    <View style={s.rowBottomLine}>
                      <AppText variant="sm" weight="normal" color={theme.text.muted} numberOfLines={1}>
                        {order.tableName}
                      </AppText>

                      <View style={s.rowRightActions}>
                        <View
                          style={[
                            s.miniMethodBadge,
                            {
                              backgroundColor:
                                order.paymentMethod === 'vietqr'
                                  ? theme.status.warningBg
                                  : order.paymentMethod === 'the'
                                  ? theme.brand.primaryBg
                                  : theme.status.readyBg,
                            },
                          ]}
                        >
                          <AppText
                            variant="xs"
                            weight="medium"
                            color={
                              order.paymentMethod === 'vietqr'
                                ? theme.brand.accent
                                : order.paymentMethod === 'the'
                                ? theme.brand.primary
                                : theme.brand.success
                            }
                          >
                            {order.paymentMethod === 'vietqr'
                              ? 'VietQR'
                              : order.paymentMethod === 'the'
                              ? 'Thẻ'
                              : order.paymentMethod === 'ghi_no'
                              ? 'Ghi nợ'
                              : order.paymentMethod === 'hon_hop'
                              ? 'Hỗn hợp'
                              : 'Tiền mặt'}
                          </AppText>
                        </View>
                        <Icon
                          name="chevron-right"
                          size={16}
                          color={theme.text.muted}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </Animated.ScrollView>
        </View>

        {/* Right Pane: Live K80 Thermal Slip (56% on Tablet/Web) */}
        {isWide && (
          <View style={[s.rightPane, { flex: 1, backgroundColor: theme.surface.app }]}>
            {activeOrder ? (
              <View style={{ flex: 1 }}>
                {/* Detail Header Action Bar */}
                <View style={[s.detailHeaderBar, { backgroundColor: theme.surface.glassHeader, borderBottomColor: theme.border.glassBorder }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="md" weight="medium" color={theme.text.primary}>
                        {activeOrder.orderCode}
                      </AppText>
                      <View style={[s.tableBadgeMini, { backgroundColor: theme.brand.primaryBg }]}>
                        <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                          {activeOrder.tableName}
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                      Thu ngân: {activeOrder.cashierName} · {activeOrder.items.length} món
                    </AppText>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {activeOrder.status !== 'voided' && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          playTapSound();
                          setVoidingOrder(activeOrder);
                        }}
                        style={[s.detailActionBtn, { backgroundColor: theme.status.dangerBg, borderColor: theme.brand.danger }]}
                      >
                        <Icon name="cancel" size={16} color={theme.brand.danger} />
                        <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                          Hủy Đơn
                        </AppText>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handlePrintAgain(activeOrder)}
                      style={[s.detailActionBtn, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary }]}
                    >
                      <Icon name="printer" size={16} color={theme.text.onBrand} />
                      <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                        In Lại K80
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Segmented Switcher: K80 vs Camera Audit */}
                <View style={[s.tabletTabSwitcher, { backgroundColor: theme.surface.header, borderBottomColor: theme.border.subtle }]}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setTabletDetailTab('receipt');
                    }}
                    style={[
                      s.tabletTabBtn,
                      tabletDetailTab === 'receipt' && {
                        borderBottomColor: theme.brand.primary,
                        borderBottomWidth: 2,
                      },
                    ]}
                  >
                    <Icon
                      name="receipt"
                      size={14}
                      color={tabletDetailTab === 'receipt' ? theme.brand.primary : theme.text.muted}
                      style={{ marginRight: 6 }}
                    />
                    <AppText
                      variant="xs"
                      weight={tabletDetailTab === 'receipt' ? 'medium' : 'normal'}
                      color={tabletDetailTab === 'receipt' ? theme.brand.primary : theme.text.muted}
                    >
                      Phiếu In Nhiệt K80
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setTabletDetailTab('camera');
                    }}
                    style={[
                      s.tabletTabBtn,
                      tabletDetailTab === 'camera' && {
                        borderBottomColor: theme.brand.primary,
                        borderBottomWidth: 2,
                      },
                    ]}
                  >
                    <Icon
                      name="cctv"
                      size={14}
                      color={tabletDetailTab === 'camera' ? theme.brand.primary : theme.text.muted}
                      style={{ marginRight: 6 }}
                    />
                    <AppText
                      variant="xs"
                      weight={tabletDetailTab === 'camera' ? 'medium' : 'normal'}
                      color={tabletDetailTab === 'camera' ? theme.brand.primary : theme.text.muted}
                    >
                      Đối Chiếu Camera & Lần Gọi
                    </AppText>
                  </TouchableOpacity>
                </View>

                {/* Detail Content Scroll */}
                <ScrollView contentContainerStyle={s.thermalScroll} showsVerticalScrollIndicator={false}>
                  {tabletDetailTab === 'receipt' ? (
                    <ReceiptThermalPaper order={activeOrder} storeSettings={storeSettings} isDark={isDark} />
                  ) : (
                    <CameraAuditTrailView order={activeOrder} />
                  )}
                </ScrollView>
              </View>
            ) : (
              <View style={s.emptyDetailBox}>
                <Icon name="receipt" size={48} color={theme.text.muted} />
                <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 8 }}>
                  Chọn một hóa đơn bên trái để xem phiếu in nhiệt K80
                </AppText>
              </View>
            )}
          </View>
        )}
      </View>


      {/* Void Confirmation Modal */}
      {voidingOrder && (
        <AppModal
          visible={!!voidingOrder}
          title="Hủy Hóa Đơn & Hoàn Tiền"
          subtitle={`${voidingOrder?.orderCode} · ${formatCurrency(voidingOrder?.finalTotal || 0)} đ`}
          icon="alert-octagon"
          iconColor={theme.brand.danger}
          iconBg={theme.status.dangerBg}
          onClose={() => setVoidingOrder(null)}
          presentation="dialog"
          maxWidth={440}
          primaryAction={{
            label: 'Hủy Đơn',
            variant: 'danger',
            onPress: handleConfirmVoid,
          }}
          secondaryAction={{
            label: 'Bỏ qua',
            onPress: () => setVoidingOrder(null),
          }}
        >
          <View style={{ gap: 8 }}>
            <AppText variant="xs" color={theme.text.muted}>
              Chọn lý do hủy đơn:
            </AppText>
            <View style={s.reasonPills}>
              {[
                'Khách đổi ý',
                'Nhập sai tiền',
                'Nhầm bàn',
                'Lỗi món',
                'Khác',
              ].map((r) => {
                const isSelected = voidReason === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => {
                      playTapSound();
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                      }
                      setVoidReason(r);
                    }}
                    style={[
                      s.reasonPill,
                      {
                        backgroundColor: isSelected ? theme.brand.danger : theme.surface.header,
                        borderColor: isSelected ? theme.brand.danger : theme.border.default,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={isSelected ? 'medium' : 'normal'}
                      color={isSelected ? theme.text.onBrand : theme.text.primary}
                    >
                      {r}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </AppModal>
      )}

      <ManagerPinModal
        visible={pinAction !== null}
        title={pinAction === 'void_order' ? 'XÁC THỰC HỦY HÓA ĐƠN' : 'XÁC THỰC IN LẠI BILL'}
        subtitle={
          pinAction === 'void_order'
            ? `Hủy hóa đơn [${voidingOrder?.orderCode || ''}] yêu cầu mã PIN Quản lý`
            : `In lại hóa đơn [${pendingPrintOrder?.orderCode || ''}] yêu cầu mã PIN Quản lý`
        }
        action={pinAction || 'void_order'}
        onSuccess={() => {
          if (pinAction === 'void_order') {
            executeVoid();
          } else if (pinAction === 'reprint_bill' && pendingPrintOrder) {
            executePrintAgain(pendingPrintOrder);
          }
          setPinAction(null);
        }}
        onClose={() => {
          setPinAction(null);
          setPendingPrintOrder(null);
        }}
      />

      {/* Omni-Search Command Palette Spotlight Modal */}
      <AppOmniSearch
        visible={omniSearchOpen}
        scope="hoa-don"
        onClose={() => setOmniSearchOpen(false)}
        onSelectOrder={(order) => {
          setSelectedReceiptOrder(order);
        }}
      />

      {/* 🌟 SMART BOTTOM NAVBAR ON MOBILE */}
      {!isWide && <BottomNavBar activeTab="hoa-don" />}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    gap: 4,
  },
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 26,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  listScroll: {
    paddingBottom: 96,
  },
  invoiceRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  rowRightAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniMethodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roundIndexBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roundMilestoneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  voidReasonBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  timelineBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineHairline: {
    width: 1,
    flex: 1,
    minHeight: 22,
    marginVertical: 2,
  },
  rowBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  rowRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  voidModalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  voidModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  warningIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonPill: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  voidModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalConfirmVoidBtn: {
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  mainWorkspace: {
    flex: 1,
  },
  leftPane: {
    flex: 1,
  },
  rightPane: {
    overflow: 'hidden',
  },
  detailHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableBadgeMini: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  thermalScroll: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDetailBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  tabletTabSwitcher: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabletTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  expandedBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  expandedItemsList: {
    gap: 3,
  },
  expandedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedFinanceBox: {
    padding: 8,
    borderRadius: 8,
    gap: 3,
  },
  expandedFinanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  expandedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    minHeight: 38,
  },
  iconHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileDetailTabs: {
    flexDirection: 'row',
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mobileDetailTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  statusPillLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  metaGridBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaGridItem: {
    width: '48%',
    flexDirection: 'column',
    gap: 1,
  },
  fullPageItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  qtyBadgeSquare: {
    width: 24,
    height: 24,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1,
  },
  segmentedControlWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
    padding: 2,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  segmentedControlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  fullPageBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fullPageBtnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    elevation: 2,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  secondaryVoidBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryQrBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  primaryPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
});

