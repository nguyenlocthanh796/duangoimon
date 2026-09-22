import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import {
  AppText,
  AppHeader,
  useAppToast,
  CollapsibleFilterBar,
  useNativeCollapsible,
  AppOmniSearch,
  Tier1Tabs,
  Tier1TabItem,
  Tier2FilterChips,
} from '../../lib/components/ui';
import { playTapSound } from '../../lib/utils/sound';
import { formatCurrency } from '../../lib/utils/format';
import { usePOSStore, useCashTransactions, useOrderHistory } from '../../lib/store/usePOSStore';
import { computeRealPnLMetrics } from '../../lib/utils/reportCalculations';
import { useAuthStore } from '../../lib/store/useAuthStore';
import {
  DateRangeKey,
  InvoiceRecord,
  SoldProductRecord,
  RangeConfig,
  ReportOverviewTab,
  ReportInvoicesTab,
  ReportSoldItemsTab,
  ReportCustomDateModal,
} from './_components';

const METRIC_STRIP_HEIGHT = 48;
const CHIP_BAR_HEIGHT = 44;
const TOTAL_BAR_HEIGHT = METRIC_STRIP_HEIGHT + CHIP_BAR_HEIGHT; // 92

export default function BaoCaoScreen() {
  const { theme, isDark } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useAppToast();

  // 1. Quản lý khoảng thời gian (Date Range Filter)
  const [selectedRange, setSelectedRange] = useState<DateRangeKey>('today');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState('2026-09-02');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);

  const dateChips = useMemo(() => [
    { id: 'today', label: 'Hôm Nay' },
    { id: 'yesterday', label: 'Hôm Qua' },
    { id: 'week', label: 'Tuần Này' },
    { id: 'month', label: 'Tháng Này' },
    {
      id: 'custom',
      label: selectedRange === 'custom' ? `${customStartDate.slice(5)} → ${customEndDate.slice(5)}` : 'Tùy Chọn 📅',
      icon: 'calendar-range',
    },
  ], [selectedRange, customStartDate, customEndDate]);

  const handleDateChipChange = (id: string) => {
    if (id === 'custom') {
      setShowCustomDateModal(true);
    } else {
      setSelectedRange(id as DateRangeKey);
    }
  };

  // 2. Quản lý 3 Tab Chính: 'overview' | 'invoices' | 'sold_items'
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'sold_items'>('overview');

  // 3. Tab Hóa Đơn: Tìm kiếm, Bộ lọc phương thức, và Modal chi tiết
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoicePayFilter, setInvoicePayFilter] = useState<'all' | 'tien_mat' | 'vietqr'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [selectedSoldProduct, setSelectedSoldProduct] = useState<SoldProductRecord | null>(null);

  useEffect(() => {
    if (!selectedInvoice && !selectedSoldProduct) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedInvoice) {
        setSelectedInvoice(null);
        return true;
      }
      if (selectedSoldProduct) {
        setSelectedSoldProduct(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedInvoice, selectedSoldProduct]);

  // 4. Tab Món Đã Bán: Lọc theo danh mục & sắp xếp
  const [categoryFilter, setCategoryFilter] = useState<string>('Tất Cả');
  const [sortBy, setSortBy] = useState<'qty' | 'revenue'>('qty');

  // 5. Sidebar Drawer & OmniSearch State
  const [omniSearchOpen, setOmniSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auth & Branch Scoping
  const activeBranch = useAuthStore((s) => s.getActiveBranch());
  const branches = useAuthStore((s) => s.branches);
  const currentUser = useAuthStore((s) => s.currentUser);
  const isOwner = useAuthStore((s) => s.isOwner());
  const isManager = useAuthStore((s) => s.isManager());
  const canAccess = isOwner || isManager;
  const [selectedBranchId, setSelectedBranchId] = useState<string>(isOwner ? 'all' : (currentUser?.branchId || activeBranch.id));

  // Branch Chips for Owner / Fixed Badge for Manager
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

  // 2-Tier Collapsible hook: Metric Strip collapses (48px), Tabs + Date chips pinned (44px)
  const { scrollY, onScroll } = useNativeCollapsible(METRIC_STRIP_HEIGHT);

  // 6. Tải dữ liệu đơn hàng từ Backend Server để đồng bộ báo cáo đa thiết bị
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
            branchId: o.branch_id || 'branch_01',
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

  // 7. Số liệu tài chính thực tế từ Sổ Đơn (orderHistory) & Sổ Quỹ (cashTransactions)
  const orderHistory = useOrderHistory();
  const cashTxList = useCashTransactions();
  const activeShift = usePOSStore((s) => s.activeShift);
  const actualStartingCash = activeShift?.startingCash || 0;

  const {
    rangeConfig,
    soldProducts: currentSoldProducts,
    invoiceRecords: realInvoiceRecords,
  } = useMemo(() => {
    return computeRealPnLMetrics(
      orderHistory,
      cashTxList,
      selectedRange,
      customStartDate,
      customEndDate,
      actualStartingCash,
      selectedBranchId
    );
  }, [orderHistory, cashTxList, selectedRange, customStartDate, customEndDate, actualStartingCash, selectedBranchId]);

  const totalSoldQty = rangeConfig.totalSoldQty;
  const topProducts = rangeConfig.topProducts;

  const tabs = useMemo<Tier1TabItem<'overview' | 'invoices' | 'sold_items'>[]>(
    () => [
      { id: 'overview', label: 'Tổng Quan', icon: 'chart-box-outline' },
      { id: 'invoices', label: 'Hóa Đơn', icon: 'receipt', badge: realInvoiceRecords.length },
      { id: 'sold_items', label: 'Món Bán', icon: 'food-fork-drink', badge: totalSoldQty },
    ],
    [realInvoiceRecords.length, totalSoldQty]
  );

  // Pull-to-refresh
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
      message: 'Đã cập nhật P&L!',
      type: 'success',
    });
  }, [loadServerOrders, showToast]);

  // Lọc danh sách hóa đơn thực tế theo từ khóa và phương thức
  const filteredInvoices = useMemo(() => {
    return realInvoiceRecords.filter((inv) => {
      const matchSearch =
        invoiceSearch === '' ||
        inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.tableName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        inv.cashier.toLowerCase().includes(invoiceSearch.toLowerCase());

      const matchPay =
        invoicePayFilter === 'all' || inv.payMethod === invoicePayFilter;

      return matchSearch && matchPay;
    });
  }, [realInvoiceRecords, invoiceSearch, invoicePayFilter]);

  const filteredProducts = useMemo(() => {
    let list = currentSoldProducts;
    if (categoryFilter !== 'Tất Cả') {
      list = list.filter((p) => p.category === categoryFilter);
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'qty') return b.qtySold - a.qtySold;
      return b.revenue - a.revenue;
    });
  }, [currentSoldProducts, categoryFilter, sortBy]);

  const maxSoldQty = Math.max(...currentSoldProducts.map((p) => p.qtySold), 1);

  const handleReprintReceipt = (inv: InvoiceRecord) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    showToast({
      title: `Đã in lại bill ${inv.id}`,
      type: 'success',
    });
  };

  // 1. Metric Strip (48px 1 dòng - Chuẩn typography xs/md bold)
  const renderMetricStrip = () => (
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
          Doanh thu
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums numberOfLines={1}>
          +{formatCurrency(rangeConfig.revenue)} đ
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      {/* 2. Vốn & Chi */}
      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Vốn & Chi
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums numberOfLines={1}>
          -{formatCurrency(rangeConfig.foodCost + rangeConfig.cashExpenses)} đ
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      {/* 3. Lợi nhuận ròng */}
      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Lãi ròng
        </AppText>
        <AppText variant="md" weight="bold" color={rangeConfig.netProfit >= 0 ? theme.brand.success : theme.brand.danger} tabularNums numberOfLines={1}>
          {rangeConfig.netProfit >= 0 ? '+' : ''}{formatCurrency(rangeConfig.netProfit)} đ
        </AppText>
      </View>
    </View>
  );


  // Route Guard: Nếu nhân viên không có quyền truy cập, hiển thị màn hình khóa
  if (!canAccess) {
    return (
      <View style={[s.container, { backgroundColor: theme.surface.app }]}>
        <AppHeader
          title="Báo Cáo P&L"
          subtitle="Giới hạn phân quyền"
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: theme.brand.primaryBg, justifyContent: 'center', alignItems: 'center' }}>
            <Icon name="shield-lock-outline" size={32} color={theme.brand.primary} />
          </View>
          <AppText variant="md" weight="medium" color={theme.text.primary} style={{ textAlign: 'center' }}>
            Khu Vực Hạn Chế Truy Cập
          </AppText>
          <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', maxWidth: 280 }}>
            Báo cáo Lợi Nhuận P&L chỉ dành cho Quản Lý Chi Nhánh và Chủ Doanh Nghiệp.
          </AppText>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              router.replace('/');
            }}
            style={{
              marginTop: 8,
              backgroundColor: theme.brand.primary,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
              Về Bán Hàng
            </AppText>
          </TouchableOpacity>
        </View>
              </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {selectedInvoice ? (
        <View style={{ flex: 1 }}>
          <AppHeader
            title={selectedInvoice.id}
            subtitle={`${selectedInvoice.tableName} · ${selectedInvoice.time} · ${selectedInvoice.cashier}`}
            showBack
            onBack={() => {
              playTapSound();
              setSelectedInvoice(null);
            }}
          />
          <ScrollView contentContainerStyle={{ padding: isWide ? 16 : 0, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
            {/* Hero Financial Card */}
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 14 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                },
              ]}
            >
              <AppText variant="sm" color={theme.text.muted}>
                Tổng tiền hóa đơn:
              </AppText>
              <AppText variant="xl" weight="bold" color={theme.brand.primary} tabularNums style={{ marginVertical: 6 }}>
                {formatCurrency(selectedInvoice.totalAmount)} đ
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    s.statusPillLarge,
                    {
                      backgroundColor:
                        selectedInvoice.payMethod === 'vietqr'
                          ? 'rgba(251, 146, 60, 0.18)'
                          : 'rgba(16, 185, 129, 0.18)',
                    },
                  ]}
                >
                  <AppText
                    variant="xs"
                    weight="medium"
                    color={selectedInvoice.payMethod === 'vietqr' ? theme.brand.accent : theme.brand.success}
                  >
                    {selectedInvoice.payMethod === 'vietqr' ? 'VietQR (Đã thanh toán)' : 'Tiền Mặt (Đã thu vào két)'}
                  </AppText>
                </View>
                <AppText variant="xs" color={theme.text.muted}>
                  · Thu ngân: {selectedInvoice.cashier}
                </AppText>
              </View>
            </View>

            {/* Bảng Chi Tiết Tài Chính */}
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 14 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginTop: isWide ? 12 : 10,
                },
              ]}
            >
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 10 }}>
                Bóc Tách Tài Chính
              </AppText>
              <View style={s.financeDetailRow}>
                <AppText variant="md" color={theme.text.muted}>Tạm tính trước giảm:</AppText>
                <AppText variant="md" color={theme.text.primary} tabularNums>
                  {formatCurrency(selectedInvoice.subTotal)} đ
                </AppText>
              </View>
              {selectedInvoice.discountAmount > 0 && (
                <View style={s.financeDetailRow}>
                  <AppText variant="md" color={theme.brand.danger}>
                    Chiết khấu {selectedInvoice.discountNote ? `(${selectedInvoice.discountNote})` : ''}:
                  </AppText>
                  <AppText variant="md" color={theme.brand.danger} tabularNums>
                    -{formatCurrency(selectedInvoice.discountAmount)} đ
                  </AppText>
                </View>
              )}
              <View style={[s.financeDetailRow, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, paddingTop: 8 }]}>
                <AppText variant="md" weight="bold" color={theme.text.primary}>Thực thu:</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                  {formatCurrency(selectedInvoice.totalAmount)} đ
                </AppText>
              </View>
            </View>

            {/* Danh Sách Món Trong Đơn */}
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 14 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginTop: isWide ? 12 : 10,
                },
              ]}
            >
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 10 }}>
                Danh Sách Món ({selectedInvoice.items.length})
              </AppText>
              {selectedInvoice.items.map((it, itemIdx) => (
                <View
                  key={itemIdx}
                  style={[
                    s.financeDetailRow,
                    itemIdx > 0 && { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.itemQtyBadge, { backgroundColor: theme.surface.header }]}>
                      <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
                        {it.qty}x
                      </AppText>
                    </View>
                    <AppText variant="md" color={theme.text.primary} numberOfLines={1}>
                      {it.name}
                    </AppText>
                  </View>
                  <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                    {formatCurrency(it.price * it.qty)} đ
                  </AppText>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Fixed Bottom Bar */}
          <View
            style={[
              s.fullPageBottomBar,
              {
                backgroundColor: theme.surface.card,
                borderTopColor: theme.border.subtle,
                paddingBottom: Math.max(insets.bottom, 12),
                maxWidth: isWide ? 680 : undefined,
                alignSelf: isWide ? 'center' : undefined,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch {}
                }
                showToast({
                  title: 'Đã In Lại',
                  message: `Đã in hóa đơn ${selectedInvoice.id}`,
                  type: 'success',
                });
              }}
              style={[s.fullPageBtnPrimary, { backgroundColor: theme.brand.accent }]}
            >
              <Icon name="printer" size={18} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
                In Bill
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : selectedSoldProduct ? (
        <View style={{ flex: 1 }}>
          <AppHeader
            title={selectedSoldProduct.name}
            subtitle={`Báo Cáo Món Bán · ${selectedSoldProduct.category}`}
            showBack
            onBack={() => {
              playTapSound();
              setSelectedSoldProduct(null);
            }}
          />
          <ScrollView contentContainerStyle={{ padding: isWide ? 16 : 0, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
            {/* Hero Card */}
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 14 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                },
              ]}
            >
              <AppText variant="sm" color={theme.text.muted}>
                Tổng doanh thu món:
              </AppText>
              <AppText variant="xl" weight="bold" color={theme.brand.primary} tabularNums style={{ marginVertical: 6 }}>
                {formatCurrency(selectedSoldProduct.revenue)} đ
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[s.statusPillLarge, { backgroundColor: `${theme.brand.primary}18` }]}>
                  <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
                    Đã bán {selectedSoldProduct.qtySold} phần
                  </AppText>
                </View>
                <AppText variant="xs" color={theme.text.muted}>
                  · Nhóm: {selectedSoldProduct.category}
                </AppText>
              </View>
            </View>

            {/* Chi Tiết Hiệu Suất */}
            <View
              style={[
                s.detailCard,
                {
                  backgroundColor: theme.surface.card,
                  borderColor: theme.border.subtle,
                  borderRadius: isWide ? 14 : 0,
                  borderWidth: isWide ? 1 : 0,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginTop: isWide ? 12 : 10,
                },
              ]}
            >
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 12 }}>
                Chỉ Số Hiệu Suất Món
              </AppText>

              <View style={s.financeDetailRow}>
                <AppText variant="md" color={theme.text.muted}>Đơn giá trung bình:</AppText>
                <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                  {formatCurrency(selectedSoldProduct.qtySold > 0 ? Math.round(selectedSoldProduct.revenue / selectedSoldProduct.qtySold) : 0)} đ
                </AppText>
              </View>

              <View style={s.financeDetailRow}>
                <AppText variant="md" color={theme.text.muted}>Tổng lượng xuất:</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
                  {selectedSoldProduct.qtySold} suất
                </AppText>
              </View>

              <View style={s.financeDetailRow}>
                <AppText variant="md" color={theme.text.muted}>Đóng góp doanh thu:</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                  {rangeConfig.revenue > 0 ? ((selectedSoldProduct.revenue / rangeConfig.revenue) * 100).toFixed(1) : 0}% tổng thu
                </AppText>
              </View>

              <View style={s.financeDetailRow}>
                <AppText variant="md" color={theme.text.muted}>Đánh giá phân nhóm:</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.warning}>
                  Sản Phẩm Chủ Lực
                </AppText>
              </View>
            </View>
          </ScrollView>

          {/* Fixed Bottom Bar */}
          <View
            style={[
              s.fullPageBottomBar,
              {
                backgroundColor: theme.surface.card,
                borderTopColor: theme.border.subtle,
                paddingBottom: Math.max(insets.bottom, 12),
                maxWidth: isWide ? 680 : undefined,
                alignSelf: isWide ? 'center' : undefined,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                playTapSound();
                setSelectedSoldProduct(null);
                router.push('/thuc-don');
              }}
              style={[s.fullPageBtnPrimary, { backgroundColor: theme.brand.accent }]}
            >
              <Icon name="silverware-fork-knife" size={18} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
                Xem Món
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* 🌟 UNIFIED APP HEADER (TỐI GIẢN CHUẨN MOBBIN) */}
          <AppHeader
            title="Báo Cáo P&L"
            subtitle={`${selectedBranchId === 'all' ? 'Toàn Chuỗi' : (branches.find((b) => b.id === selectedBranchId)?.code || activeBranch.code)} · Lãi ${rangeConfig.netProfit >= 0 ? '+' : ''}${formatCurrency(rangeConfig.netProfit)} đ`}
            showSearch
            onOpenSearch={() => setOmniSearchOpen(true)}
          />

          {/* 🌟 DÃY 1: PRIMARY UNDERLINE TAB BAR (Cấp 1 - Màu chân Jade rộng rãi, thoáng đãng - Trượt Ngang) */}
          {/* 🌟 DÃY 1: TAB CẤP 1 (Underline Tabs 46px) */}
          <Tier1Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            backgroundColor={theme.status.warningBg}
          />

          {/* 🌟 DÃY 2: CHIP LỌC CẤP 2 (DATE FILTER PILLS - 1-TAP MOBBIN & APPLE HIG) */}
          <Tier2FilterChips
            chips={dateChips}
            activeChip={selectedRange}
            onChipChange={handleDateChipChange}
            activeColor="primary"
          />

          {/* 🌟 DÃY 3: BỘ LỌC CHI NHÁNH (Chủ quán chọn toàn chuỗi / từng quán, Quản lý khóa cứng quán mình) */}
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

          {/* Metric Strip on Tablet/Web (Fixed under Tab Bar) */}
          {isWide && renderMetricStrip()}

          {/* Main Workspace Container */}
          <View style={{ flex: 1 }}>
            {/* 🌟 NỘI DUNG CUỘN CHÍNH (PULL-TO-REFRESH & NATURAL SCROLL) */}
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
              contentContainerStyle={{
                paddingTop: isWide ? 12 : 4,
                paddingBottom: isWide ? 24 : 140 + insets.bottom,
                gap: isWide ? 12 : 10,
                paddingHorizontal: isWide ? 16 : 0,
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* Metric Strip on Mobile inside Natural Scroll (Chỉ hiện khi xem Hóa Đơn hoặc Món Bán) */}
              {!isWide && activeTab !== 'overview' && renderMetricStrip()}
              {activeTab === 'overview' && (
                <ReportOverviewTab
                  rangeConfig={rangeConfig}
                  selectedRange={selectedRange}
                  onViewAllSoldItems={() => setActiveTab('sold_items')}
                  onSelectProduct={setSelectedSoldProduct}
                />
              )}

              {activeTab === 'invoices' && (
                <ReportInvoicesTab
                  invoiceSearch={invoiceSearch}
                  onSetInvoiceSearch={setInvoiceSearch}
                  invoicePayFilter={invoicePayFilter}
                  onSetInvoicePayFilter={setInvoicePayFilter}
                  filteredInvoices={filteredInvoices}
                  onSelectInvoice={setSelectedInvoice}
                />
              )}

              {activeTab === 'sold_items' && (
                <ReportSoldItemsTab
                  categoryFilter={categoryFilter}
                  onSetCategoryFilter={setCategoryFilter}
                  sortBy={sortBy}
                  onSetSortBy={setSortBy}
                  filteredProducts={filteredProducts}
                  maxSoldQty={maxSoldQty}
                  onSelectProduct={setSelectedSoldProduct}
                />
              )}
            </Animated.ScrollView>
          </View>
        </View>
      )}

      {/* 🌟 MODAL CHỌN NGÀY TÙY CHỈNH */}
      <ReportCustomDateModal
        visible={showCustomDateModal}
        onClose={() => setShowCustomDateModal(false)}
        selectedRange={selectedRange}
        onSelectPreset={(key) => {
          setSelectedRange(key);
        }}
        customStartDate={customStartDate}
        onSetCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        onSetCustomEndDate={setCustomEndDate}
        onApplyCustom={() => {
          setSelectedRange('custom');
          setShowCustomDateModal(false);
        }}
      />

      {/* Spotlight Command Palette (AppOmniSearch) */}
      <AppOmniSearch
        visible={omniSearchOpen}
        onClose={() => setOmniSearchOpen(false)}
        scope="all"
      />

      {/* Floating Overlay Drawer Sidebar */}
          </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  dateHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
  },
  datePillsBar: {
    height: 48,
    justifyContent: 'center',
  },
  datePillsScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  datePill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryFilterBar: {
    minHeight: 54,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  chipsScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  chipPill: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wideFilterBar: {
    paddingVertical: 6,
  },
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  detailCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  statusPillLarge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  financeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemQtyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fullPageBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  fullPageBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
