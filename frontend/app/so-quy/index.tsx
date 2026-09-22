import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  Animated,
  RefreshControl,
  BackHandler,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import {
  AppText,
  Button,
  AppHeader,
  BottomNavBar,
  useAppToast,
  CollapsibleFilterBar,
  useNativeCollapsible,
  AppOmniSearch,
  Tier1Tabs,
  Tier1TabItem,
  AppModal,
  EmptyState,
} from '../../lib/components/ui';
import { useAuthStore, Branch } from '../../lib/store/useAuthStore';
import { playTapSound } from '../../lib/utils/sound';
import { formatCurrency } from '../../lib/utils/format';
import {
  useCashTransactions,
  useOrderHistory,
  usePOSActions,
  CashTransaction,
} from '../../lib/store/usePOSStore';

const METRIC_BAR_HEIGHT = 72;
const CHIP_BAR_HEIGHT = 48;
const TOTAL_BAR_HEIGHT = METRIC_BAR_HEIGHT + CHIP_BAR_HEIGHT; // 120

import {
  QuickCashFormContent,
  quickExpensePresets,
  quickIncomePresets,
  quickAmounts,
} from './_components';

export default function SoQuyScreen() {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useAppToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'user_shift' | 'cashbook'>('user_shift');
  const [omniSearchOpen, setOmniSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState<CashTransaction | null>(null);
  const [selectedSoldItemDetail, setSelectedSoldItemDetail] = useState<{ name: string; unit: string; qty: number; revenue: number; price: number } | null>(null);

  useEffect(() => {
    if (!selectedTxDetail && !selectedSoldItemDetail && !modalVisible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modalVisible) {
        setModalVisible(false);
        return true;
      }
      if (selectedTxDetail) {
        setSelectedTxDetail(null);
        return true;
      }
      if (selectedSoldItemDetail) {
        setSelectedSoldItemDetail(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedTxDetail, selectedSoldItemDetail, modalVisible]);

  const [txType, setTxType] = useState<'thu' | 'chi'>('chi');
  const [selectedPreset, setSelectedPreset] = useState(quickExpensePresets[0].label);
  const [customDescription, setCustomDescription] = useState(quickExpensePresets[0].label);
  const [amountStr, setAmountStr] = useState('20000');
  const [paymentMethod, setPaymentMethod] = useState<'tien_mat' | 'chuyen_khoan'>('tien_mat');
  const [expenseType, setExpenseType] = useState<'hoat_dong' | 'co_dinh'>('hoat_dong');
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReasonText, setVoidReasonText] = useState('Nhập sai số tiền');

  const transactions = useCashTransactions();
  const orderHistory = useOrderHistory();
  const { addCashTransaction, voidCashTransaction } = usePOSActions();

  // Auth & Branch Scoping
  const branches = useAuthStore((s: any) => s.branches);
  const activeBranch = useAuthStore((s: any) => s.getActiveBranch());
  const isOwner = useAuthStore((s: any) => s.isOwner());
  const isManager = useAuthStore((s: any) => s.isManager());
  const currentUser = useAuthStore((s: any) => s.currentUser);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(isOwner ? 'all' : (currentUser?.branchId || activeBranch.id));

  // Branch Chips for Owner / Manager
  const branchChips = useMemo(() => {
    if (!isOwner) {
      const b = (branches as Branch[]).find((item: Branch) => item.id === selectedBranchId) || activeBranch;
      return [{ id: b.id, label: `📍 ${b.name} (Quản Lý)` }];
    }
    return [
      { id: 'all', label: '🏢 Toàn Chuỗi' },
      ...(branches as Branch[]).map((b: Branch) => ({ id: b.id, label: `📍 ${b.name}` })),
    ];
  }, [branches, isOwner, selectedBranchId, activeBranch]);

  // Lọc transactions & orders theo Chi Nhánh
  const branchTransactions = useMemo(() => {
    if (!selectedBranchId || selectedBranchId === 'all') return transactions;
    return transactions.filter((t) => !t.branchId || t.branchId === selectedBranchId);
  }, [transactions, selectedBranchId]);

  const branchOrders = useMemo(() => {
    if (!selectedBranchId || selectedBranchId === 'all') return orderHistory;
    return orderHistory.filter((o) => !o.branchId || o.branchId === selectedBranchId);
  }, [orderHistory, selectedBranchId]);

  // Current logged in cashier & shift (100% Real Dynamic Data)
  const activeShift = usePOSStore((s) => s.activeShift);
  const currentCashier = currentUser?.name || activeShift?.cashierName || 'Thu Ngân';
  const currentShiftCode = activeShift?.shiftName || 'Ca Hiện Tại';
  const shiftStartTime = activeShift?.openedAt ? activeShift.openedAt.split(' ')[1] || '07:00' : '07:00';
  const startingCash = activeShift?.startingCash || 0;

  const userOrders = useMemo(() => {
    if (isOwner || isManager) {
      return branchOrders.filter((o) => o.status !== 'voided');
    }
    return branchOrders.filter((o) => (o.cashierName === currentCashier || !o.cashierName) && o.status !== 'voided');
  }, [branchOrders, currentCashier, isOwner, isManager]);

  const userTotalRevenue = useMemo(() => {
    return userOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  }, [userOrders]);

  const userCashSales = useMemo(() => {
    return userOrders
      .filter((o) => o.paymentMethod === 'tien_mat')
      .reduce((sum, o) => sum + o.finalTotal, 0);
  }, [userOrders]);

  const userVietQRSales = useMemo(() => {
    return userOrders
      .filter((o) => o.paymentMethod === 'vietqr')
      .reduce((sum, o) => sum + o.finalTotal, 0);
  }, [userOrders]);

  const userOtherSales = useMemo(() => {
    return userOrders
      .filter((o) => o.paymentMethod !== 'tien_mat' && o.paymentMethod !== 'vietqr')
      .reduce((sum, o) => sum + o.finalTotal, 0);
  }, [userOrders]);

  const userTotalItemsSold = useMemo(() => {
    return userOrders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.qty, 0), 0);
  }, [userOrders]);

  const soQuyTabs = useMemo<Tier1TabItem<'user_shift' | 'cashbook'>[]>(
    () => [
      { id: 'user_shift', label: 'Ca Của Tôi', icon: 'account-clock', badge: `${userTotalItemsSold} món` },
      { id: 'cashbook', label: 'Sổ Thu Chi', icon: 'book-open-outline', badge: branchTransactions.length },
    ],
    [userTotalItemsSold, branchTransactions.length]
  );

  // Thống kê món bán được của riêng User trong ca hiện tại
  const userItemsAgg = useMemo(() => {
    const map: Record<string, { name: string; unit: string; qty: number; revenue: number; price: number }> = {};
    userOrders.forEach((o) => {
      o.items.forEach((it) => {
        const name = it.item?.name || 'Món ăn';
        const unit = (it.item as any)?.unit || 'phần';
        if (!map[name]) {
          map[name] = { name, unit, qty: 0, revenue: 0, price: it.unitPrice };
        }
        map[name].qty += it.qty;
        map[name].revenue += it.unitPrice * it.qty;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [userOrders]);

  const [filterType, setFilterType] = useState<'all' | 'chi' | 'thu'>('all');
  const chiCount = branchTransactions.filter((t) => t.type === 'chi' && t.status !== 'voided').length;
  const thuCount = branchTransactions.filter((t) => t.type === 'thu' && t.status !== 'voided').length;

  const filteredTransactions = branchTransactions.filter((t) => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  // 1. Tiền mặt trong két (chỉ cộng/trừ giao dịch tiền mặt chưa bị hủy)
  const totalInCash = branchTransactions
    .filter((t) => t.type === 'thu' && t.status !== 'voided' && (t.paymentMethod === 'tien_mat' || !t.paymentMethod))
    .reduce((s, t) => s + t.amount, 0);

  const totalOutCash = branchTransactions
    .filter((t) => t.type === 'chi' && t.status !== 'voided' && (t.paymentMethod === 'tien_mat' || !t.paymentMethod))
    .reduce((s, t) => s + t.amount, 0);

  // 2. Chuyển khoản ngân hàng (giao dịch qua tài khoản, không đổi két)
  const totalInBank = branchTransactions
    .filter((t) => t.type === 'thu' && t.status !== 'voided' && t.paymentMethod === 'chuyen_khoan')
    .reduce((s, t) => s + t.amount, 0);

  const totalOutBank = branchTransactions
    .filter((t) => t.type === 'chi' && t.status !== 'voided' && t.paymentMethod === 'chuyen_khoan')
    .reduce((s, t) => s + t.amount, 0);

  const totalIn = totalInCash + totalInBank;
  const totalOut = totalOutCash + totalOutBank;
  const netBalance = totalIn - totalOut;
  const actualDrawerCash = startingCash + userCashSales + totalInCash - totalOutCash;

  const currentAmount = parseFloat(amountStr) || 0;

  // 2-Tier Collapsible hook: Metric Strip collapses (52px), Filter chips pinned (44px)
  const { scrollY, onScroll } = useNativeCollapsible(METRIC_BAR_HEIGHT);

  // Pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setTimeout(() => {
      setRefreshing(false);
      showToast({
        title: 'Đã Đồng Bộ',
        message: 'Đã cập nhật sổ quỹ!',
        type: 'success',
      });
    }, 500);
  }, [showToast]);

  const isSubmittingTxRef = useRef(false);

  const handleCreateTx = () => {
    if (isSubmittingTxRef.current) return;
    if (currentAmount <= 0) {
      showToast({ title: 'Nhập số tiền', type: 'warning' });
      return;
    }

    isSubmittingTxRef.current = true;
    setTimeout(() => { isSubmittingTxRef.current = false; }, 600);

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    addCashTransaction({
      type: txType,
      category: txType === 'chi'
        ? (expenseType === 'co_dinh' ? 'chi_co_dinh' : 'chi_mua_ngoai')
        : (paymentMethod === 'tien_mat' ? 'thu_nap_quy' : 'thu_khac'),
      amount: currentAmount,
      description: customDescription || selectedPreset,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      performedBy: isOwner ? 'Chủ Quán' : 'Thu Ngân',
      branchId: selectedBranchId !== 'all' ? selectedBranchId : activeBranch.id,
      paymentMethod,
      expenseType: txType === 'chi' ? expenseType : undefined,
      status: 'completed',
    });

    setModalVisible(false);
    setAmountStr('');
    setCustomDescription('');
    showToast({
      title: txType === 'chi' ? 'Đã lưu chi' : 'Đã lưu thu',
      message: `${customDescription || selectedPreset}: ${formatCurrency(currentAmount)} đ`,
      type: 'success',
    });
  };

  const handleVoidTx = (reason: string) => {
    if (!selectedTxDetail || isSubmittingTxRef.current) return;
    isSubmittingTxRef.current = true;
    setTimeout(() => { isSubmittingTxRef.current = false; }, 600);
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    }

    voidCashTransaction(selectedTxDetail.id, reason, 'Chủ Quán');
    setSelectedTxDetail((prev) =>
      prev
        ? {
            ...prev,
            status: 'voided',
            voidReason: reason,
            voidedAt: new Date().toISOString(),
            voidedBy: 'Chủ Quán',
          }
        : null
    );
    setVoidModalOpen(false);
    showToast({
      title: 'Đã Hủy Phiếu',
      message: `Đã hủy phiếu #${selectedTxDetail.id}`,
      type: 'success',
    });
  };

  // 1. Khối Thông Tin Ca Của User Hiện Tại (SaaS Cashier Profile Banner)
  const renderUserShiftProfile = () => (
    <View style={[s.userProfileCard, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle }]}>
      <View style={s.userProfileTop}>
        <View style={[s.userAvatarSquircle, { backgroundColor: theme.brand.primaryBg }]}>
          <Icon name="account-circle" size={26} color={theme.brand.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="md" weight="medium" color={theme.text.primary}>
              {currentCashier}
            </AppText>
            <View style={[s.shiftCodeBadge, { backgroundColor: theme.status.readyBg }]}>
              <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                {currentShiftCode}
              </AppText>
            </View>
          </View>
          <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
            Mở ca: {shiftStartTime} Hôm nay · <AppText variant="xs" color={theme.brand.success}>🟢 Đang Phục Vụ</AppText>
          </AppText>
        </View>
      </View>
    </View>
  );

  // 2. Khối 3 Con Số Vàng Của User Trong Ca
  // 2. Khối 3 Con Số Vàng Của User Trong Ca
  const renderUserKPIMetrics = () => (
    <View
      style={[
        s.userKpiStrip,
        {
          height: METRIC_BAR_HEIGHT,
          backgroundColor: theme.surface.card,
          borderBottomColor: theme.border.subtle,
        },
      ]}
    >
      {/* 1. Doanh số đã thu */}
      <View style={s.userKpiCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Đã thu ({userOrders.length} đơn)
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums numberOfLines={1} style={{ marginVertical: 1 }}>
          {formatCurrency(userTotalRevenue)} đ
        </AppText>
        <AppText variant="xs" color={theme.text.subtle} tabularNums numberOfLines={1}>
          TM: {formatCurrency(userCashSales)} đ
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      {/* 2. Số món xuất bán */}
      <View style={s.userKpiCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Món xuất bán
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums numberOfLines={1} style={{ marginVertical: 1 }}>
          {userTotalItemsSold} món
        </AppText>
        <AppText variant="xs" color={theme.text.subtle} tabularNums numberOfLines={1}>
          {userItemsAgg.length} loại món
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      {/* 3. Tiền mặt trong két */}
      <View style={s.userKpiCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Tiền két thực tế
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums numberOfLines={1} style={{ marginVertical: 1 }}>
          {formatCurrency(actualDrawerCash)} đ
        </AppText>
        <AppText variant="xs" color={theme.text.subtle} tabularNums numberOfLines={1}>
          Két đầu: 1.5M
        </AppText>
      </View>
    </View>
  );

  // 3. Danh Sách Món User Này Đã Xuất Bán
  const renderUserSoldItemsList = () => {
    if (userItemsAgg.length === 0) {
      return (
        <EmptyState
          icon="food-off"
          message="Chưa có món nào được bán trong ca"
          description="Các món do bạn bán và xuất hóa đơn sẽ hiển thị tại đây."
        />
      );
    }

    return (
      <View style={{ width: '100%', paddingVertical: 4 }}>
        <View style={[s.sectionTitleHeader, { backgroundColor: theme.surface.header, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle }]}>
          <AppText variant="sm" weight="bold" color={theme.text.muted}>
            TOP MÓN XUẤT BÁN TRONG CA ({userItemsAgg.length} MÓN)
          </AppText>
          <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
            Tổng {userTotalItemsSold} món
          </AppText>
        </View>

        {userItemsAgg.map((item, index) => {
          return (
            <View
              key={item.name}
              style={{ borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }}
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
                  setSelectedSoldItemDetail(item);
                }}
                style={[
                  s.userItemRow,
                  {
                    backgroundColor: theme.surface.card,
                  },
                ]}
              >
                <View
                  style={[
                    s.rankBadge,
                    {
                      backgroundColor:
                        index === 0
                          ? theme.status.warningBg
                          : index === 1
                          ? theme.brand.primaryBg
                          : index === 2
                          ? theme.status.readyBg
                          : theme.surface.header,
                    },
                  ]}
                >
                  <AppText
                    variant="xs"
                    weight="bold"
                    color={
                      index === 0
                        ? theme.brand.warning
                        : index === 1
                        ? theme.brand.primary
                        : index === 2
                        ? theme.brand.success
                        : theme.text.muted
                    }
                    tabularNums
                  >
                    #{index + 1}
                  </AppText>
                </View>

                <View style={{ flex: 1, paddingRight: 8 }}>
                  <AppText
                    variant="md"
                    weight="medium"
                    color={theme.text.primary}
                    numberOfLines={2}
                    style={{ flexShrink: 1 }}
                  >
                    {item.name}
                  </AppText>
                  <AppText variant="sm" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                    {formatCurrency(item.price)} đ / {item.unit || 'phần'}
                  </AppText>
                </View>

                <View style={{ alignItems: 'flex-end', minWidth: 84 }}>
                  <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                    {item.qty} {item.unit || 'phần'}
                  </AppText>
                  <AppText variant="sm" weight="normal" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                    {formatCurrency(item.revenue)} đ
                  </AppText>
                </View>

                <Icon name="chevron-right" size={16} color={theme.text.muted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  // 4. Metric Strip Sổ Quỹ Thu Chi
  const renderMetricStrip = () => (
    <View
      style={[
        s.metricStrip,
        {
          height: METRIC_BAR_HEIGHT,
          backgroundColor: theme.surface.card,
          borderBottomColor: theme.border.subtle,
        },
      ]}
    >
      {/* 1. Thu ngoài */}
      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Thu ngoài ({thuCount})
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums numberOfLines={1} style={{ marginVertical: 1 }}>
          +{formatCurrency(totalIn)} đ
        </AppText>
        <AppText variant="xs" color={theme.text.subtle} numberOfLines={1}>
          Thu tiền mặt
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      {/* 2. Chi chợ */}
      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Chi chợ ({chiCount})
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums numberOfLines={1} style={{ marginVertical: 1 }}>
          -{formatCurrency(totalOut)} đ
        </AppText>
        <AppText variant="xs" color={theme.text.subtle} numberOfLines={1}>
          Chi tiền mặt
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      {/* 3. Tồn quỹ */}
      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Tồn quỹ
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums numberOfLines={1} style={{ marginVertical: 1 }}>
          {formatCurrency(netBalance)} đ
        </AppText>
        <AppText variant="xs" color={theme.text.subtle} numberOfLines={1}>
          Chênh lệch thu-chi
        </AppText>
      </View>
    </View>
  );



  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {selectedTxDetail ? (
        <View style={{ flex: 1, backgroundColor: theme.surface.app }}>
          <AppHeader
            title={selectedTxDetail.type === 'chi' ? 'Chi Tiết Phiếu Chi' : 'Chi Tiết Phiếu Thu'}
            subtitle={`Mã phiếu #${selectedTxDetail.id} · ${selectedTxDetail.time}`}
            showBack
            onBack={() => {
              playTapSound();
              setSelectedTxDetail(null);
            }}
            rightCustom={
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  showToast({ title: 'Đã In Phiếu', message: `Phiếu #${selectedTxDetail.id} K80`, type: 'success' });
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[s.navBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
              >
                <Icon name="printer-outline" size={18} color={theme.text.primary} />
              </TouchableOpacity>
            }
          />
          <ScrollView
            contentContainerStyle={{ padding: isWide ? 16 : 0, paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          >
            {(() => {
              const isChi = selectedTxDetail.type === 'chi';
              const isVoided = selectedTxDetail.status === 'voided';
              const isCash = selectedTxDetail.paymentMethod === 'tien_mat' || !selectedTxDetail.paymentMethod;

              return (
                <>
                  {/* Banner Cảnh Báo Phiếu Đã Hủy */}
                  {isVoided && (
                    <View
                      style={[
                        s.voidAlertBanner,
                        {
                          backgroundColor: theme.status.dangerBg,
                          borderColor: theme.brand.danger,
                          borderRadius: isWide ? 14 : 0,
                          marginHorizontal: isWide ? 0 : 0,
                          marginBottom: isWide ? 12 : 0,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="close-circle-outline" size={20} color={theme.brand.danger} />
                        <AppText variant="sm" weight="bold" color={theme.brand.danger}>
                          PHIẾU ĐÃ BỊ HỦY (KHÔNG TÍNH VÀO DÒNG TIỀN)
                        </AppText>
                      </View>
                      <View style={{ marginTop: 6, gap: 3 }}>
                        <AppText variant="xs" color={theme.text.muted}>
                          Người hủy: <AppText variant="xs" weight="medium" color={theme.text.primary}>{selectedTxDetail.voidedBy || 'Chủ Quán'}</AppText>
                        </AppText>
                        <AppText variant="xs" color={theme.text.muted}>
                          Lý do: <AppText variant="xs" weight="medium" color={theme.brand.danger}>{selectedTxDetail.voidReason || 'Chủ quán hủy phiếu'}</AppText>
                        </AppText>
                        {selectedTxDetail.voidedAt && (
                          <AppText variant="xs" color={theme.text.muted}>
                            Thời gian: <AppText variant="xs" tabularNums color={theme.text.primary}>{new Date(selectedTxDetail.voidedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {new Date(selectedTxDetail.voidedAt).toLocaleDateString('vi-VN')}</AppText>
                          </AppText>
                        )}
                      </View>
                    </View>
                  )}

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
                        paddingVertical: 16,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <AppText variant="xs" color={theme.text.muted}>
                          SỐ TIỀN {isChi ? 'CHI RA' : 'THU VÀO'} {isVoided ? '(ĐÃ HỦY)' : ''}
                        </AppText>
                        <AppText
                          variant="xl"
                          weight="bold"
                          color={isVoided ? theme.text.muted : (isChi ? theme.brand.danger : theme.brand.success)}
                          tabularNums
                          style={[
                            { marginTop: 4 },
                            isVoided && { textDecorationLine: 'line-through' },
                          ]}
                        >
                          {isChi ? '-' : '+'}{formatCurrency(selectedTxDetail.amount)} đ
                        </AppText>
                      </View>
                      <View
                        style={[
                          s.statusPillLarge,
                          {
                            backgroundColor: isVoided
                              ? (isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.12)')
                              : isChi
                              ? (isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.12)')
                              : (isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)'),
                          },
                        ]}
                      >
                        <Icon
                          name={isVoided ? 'close-circle' : (isChi ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline')}
                          size={14}
                          color={isVoided ? theme.brand.danger : (isChi ? theme.brand.danger : theme.brand.success)}
                        />
                        <AppText
                          variant="xs"
                          weight="medium"
                          color={isVoided ? theme.brand.danger : (isChi ? theme.brand.danger : theme.brand.success)}
                        >
                          {isVoided ? 'Phiếu Đã Hủy' : (isChi ? (isCash ? 'Phiếu Chi Két' : 'Chi Chuyển Khoản') : (isCash ? 'Phiếu Thu Két' : 'Thu Chuyển Khoản'))}
                        </AppText>
                      </View>
                    </View>

                    <View style={[s.metaGridBox, { borderTopColor: theme.border.subtle, marginTop: 16, paddingTop: 14 }]}>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Thời Gian</AppText>
                        <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
                          {selectedTxDetail.time} · Hôm nay
                        </AppText>
                      </View>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Người Lập</AppText>
                        <AppText variant="md" weight="medium" color={theme.brand.primary} style={{ marginTop: 2 }}>
                          {selectedTxDetail.performedBy || 'Chủ Quán'}
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {/* Chi tiết chứng từ */}
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        marginTop: isWide ? 12 : 0,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border.subtle,
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 12 }}>
                      THÔNG TIN CHỨNG TỪ
                    </AppText>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" weight="normal" color={theme.text.muted}>Mã Chứng Từ</AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>#{selectedTxDetail.id}</AppText>
                    </View>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" weight="normal" color={theme.text.muted}>Hạng Mục Sổ Quỹ</AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary}>
                        {selectedTxDetail.category || (isChi ? 'Chi mua hàng' : 'Thu tiền mặt')}
                      </AppText>
                    </View>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" weight="normal" color={theme.text.muted}>Nguồn Tiền</AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary}>
                        {isCash ? '💵 Tiền mặt trong két' : '🏦 Chuyển khoản ngân hàng'}
                      </AppText>
                    </View>
                    {isChi && (
                      <View style={s.financeDetailRow}>
                        <AppText variant="md" weight="normal" color={theme.text.muted}>Phân Loại Chi Phí</AppText>
                        <AppText variant="md" weight="medium" color={theme.text.primary}>
                          {selectedTxDetail.expenseType === 'co_dinh' ? '🏢 Chi phí cố định (Mặt bằng/Điện)' : '🛒 Chi phí hoạt động (Chi chợ/Đá)'}
                        </AppText>
                      </View>
                    )}
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" weight="normal" color={theme.text.muted}>Trạng Thái</AppText>
                      <AppText variant="md" weight="medium" color={isVoided ? theme.brand.danger : theme.brand.success}>
                        {isVoided ? 'Đã Hủy' : 'Hoàn Tất'}
                      </AppText>
                    </View>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" weight="normal" color={theme.text.muted}>Ca Làm Việc</AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                        {currentShiftCode} · {currentCashier}
                      </AppText>
                    </View>
                    <View style={[s.financeDetailRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                      <AppText variant="md" weight="normal" color={theme.text.muted}>Nội Dung Diễn Giải Chi Tiết</AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary} style={{ marginTop: 2 }}>
                        {selectedTxDetail.description}
                      </AppText>
                    </View>
                  </View>
                </>
              );
            })()}
          </ScrollView>

          {/* Bottom Bar */}
          <View
            style={[
              s.fullPageBottomBar,
              {
                backgroundColor: theme.surface.card,
                borderTopColor: theme.border.subtle,
                paddingBottom: Math.max(insets.bottom, 12),
                maxWidth: isWide ? 680 : undefined,
                alignSelf: isWide ? 'center' : undefined,
                gap: 8,
              },
            ]}
          >
            {/* Nút Hủy Phiếu (Chỉ hiện khi chưa hủy) */}
            {selectedTxDetail.status !== 'voided' && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  setVoidModalOpen(true);
                }}
                style={[
                  s.fullPageBtnAction,
                  {
                    backgroundColor: theme.status.dangerBg,
                    borderColor: theme.brand.danger,
                    flex: 1,
                  },
                ]}
              >
                <Icon name="delete-outline" size={18} color={theme.brand.danger} />
                <AppText variant="md" weight="medium" color={theme.brand.danger} numberOfLines={1}>
                  Hủy Phiếu
                </AppText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                showToast({ title: 'Đã In', message: `In phiếu #${selectedTxDetail.id} K80`, type: 'success' });
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.surface.header, borderColor: theme.border.default, flex: 1 }]}
            >
              <Icon name="printer" size={18} color={theme.text.primary} />
              <AppText variant="md" weight="medium" color={theme.text.primary} numberOfLines={1}>
                In K80
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                setSelectedTxDetail(null);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary, flex: 1.2 }]}
            >
              <AppText variant="md" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
                Đóng
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : selectedSoldItemDetail ? (
        <View style={{ flex: 1, backgroundColor: theme.surface.app }}>
          <AppHeader
            title="Chi Tiết Món"
            subtitle={`${selectedSoldItemDetail.name} · Ca ${currentShiftCode}`}
            showBack
            onBack={() => {
              playTapSound();
              setSelectedSoldItemDetail(null);
            }}
          />
          <ScrollView
            contentContainerStyle={{ padding: isWide ? 16 : 0, paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
          >
            {(() => {
              const contrib = userTotalRevenue > 0 ? ((selectedSoldItemDetail.revenue / userTotalRevenue) * 100).toFixed(1) : '0';
              const contribNum = parseFloat(contrib);
              const estCash = userTotalRevenue > 0 ? Math.round(selectedSoldItemDetail.revenue * (userCashSales / userTotalRevenue)) : 0;
              const estQr = selectedSoldItemDetail.revenue - estCash;
              const cashPct = selectedSoldItemDetail.revenue > 0 ? Math.round((estCash / selectedSoldItemDetail.revenue) * 100) : 50;
              const qrPct = 100 - cashPct;

              // Danh sách hóa đơn trong ca có chứa món này
              const itemOrders = userOrders.filter((o) =>
                o.items.some((it) => (it.item?.name || 'Món ăn') === selectedSoldItemDetail.name)
              );

              return (
                <>
                  {/* Card 1: Hero KPI & Tỷ Trọng Doanh Thu Ca */}
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
                        paddingVertical: 16,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <AppText variant="xs" color={theme.text.muted} weight="medium">
                          TỔNG THU MÓN NÀY TRONG CA
                        </AppText>
                        <AppText
                          variant="xl"
                          weight="bold"
                          color={theme.brand.success}
                          tabularNums
                          style={{ marginTop: 4 }}
                        >
                          {formatCurrency(selectedSoldItemDetail.revenue)} đ
                        </AppText>
                      </View>
                      <View
                        style={[
                          s.statusPillLarge,
                          {
                            backgroundColor: theme.brand.primaryBg,
                            borderColor: theme.brand.primary,
                          },
                        ]}
                      >
                        <Icon name="chart-pie" size={14} color={theme.brand.primary} />
                        <AppText variant="sm" weight="bold" color={theme.brand.primary} tabularNums>
                          {contrib}% ca
                        </AppText>
                      </View>
                    </View>

                    {/* Progress Bar Tỷ Trọng Doanh Thu */}
                    <View style={{ marginTop: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <AppText variant="xs" color={theme.text.muted} weight="medium">
                          Tỷ Trọng Doanh Thu Trong Ca
                        </AppText>
                        <AppText variant="xs" weight="bold" color={theme.brand.primary} tabularNums>
                          {contrib}%
                        </AppText>
                      </View>
                      <View style={[s.progressBarBg, { backgroundColor: theme.surface.header }]}>
                        <View style={[s.progressBarFill, { width: `${Math.min(contribNum, 100)}%`, backgroundColor: theme.brand.primary }]} />
                      </View>
                    </View>

                    {/* 3 Cột Chỉ Số Nhanh */}
                    <View style={[s.metaGridBox, { borderTopColor: theme.border.subtle, marginTop: 16, paddingTop: 14 }]}>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Số Lượng Xuất</AppText>
                        <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
                          {selectedSoldItemDetail.qty} {selectedSoldItemDetail.unit || 'phần'}
                        </AppText>
                      </View>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Đơn Giá Niêm Yết</AppText>
                        <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
                          {formatCurrency(selectedSoldItemDetail.price)} đ
                        </AppText>
                      </View>
                      <View style={s.metaGridItem}>
                        <AppText variant="xs" color={theme.text.muted}>Số Lần Gọi Món</AppText>
                        <AppText variant="md" weight="medium" color={theme.brand.accent} tabularNums style={{ marginTop: 2 }}>
                          {itemOrders.length} đơn
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {/* Card 2: Cơ Cấu Phương Thức Thanh Toán (2 Cột Trực Quan) */}
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        marginTop: isWide ? 12 : 8,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border.subtle,
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 12 }}>
                      CƠ CẤU PHƯƠNG THỨC THU TIỀN
                    </AppText>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      {/* Cột 1: Tiền mặt */}
                      <View
                        style={[
                          s.paymentBreakdownCol,
                          {
                            backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : 'rgba(34, 197, 94, 0.08)',
                            borderColor: theme.brand.success,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Icon name="cash-multiple" size={16} color={theme.brand.success} />
                          <AppText variant="xs" weight="medium" color={theme.brand.success}>
                            Tiền Mặt Két ({cashPct}%)
                          </AppText>
                        </View>
                        <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums style={{ marginTop: 4 }}>
                          ~{formatCurrency(estCash)} đ
                        </AppText>
                      </View>

                      {/* Cột 2: VietQR / Chuyển khoản */}
                      <View
                        style={[
                          s.paymentBreakdownCol,
                          {
                            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
                            borderColor: theme.brand.cyan,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Icon name="qrcode-scan" size={16} color={theme.brand.cyan} />
                          <AppText variant="xs" weight="medium" color={theme.brand.cyan}>
                            VietQR / CK ({qrPct}%)
                          </AppText>
                        </View>
                        <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums style={{ marginTop: 4 }}>
                          ~{formatCurrency(estQr)} đ
                        </AppText>
                      </View>
                    </View>

                    {/* Dual-Color Ratio Bar */}
                    <View style={s.dualColorRatioBar}>
                      <View style={{ width: `${cashPct}%`, height: 6, backgroundColor: theme.brand.success }} />
                      <View style={{ width: `${qrPct}%`, height: 6, backgroundColor: theme.brand.cyan }} />
                    </View>
                  </View>

                  {/* Card 3: Thông Số Chi Tiết (Fix Triệt Để Dính Chữ) */}
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        marginTop: isWide ? 12 : 8,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border.subtle,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                      },
                    ]}
                  >
                    <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginBottom: 8 }}>
                      THÔNG SỐ MÓN ĂN
                    </AppText>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" weight="normal" color={theme.text.muted} style={{ width: 130 }}>
                        Tên Món Ăn
                      </AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary} style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>
                        {selectedSoldItemDetail.name}
                      </AppText>
                    </View>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" weight="normal" color={theme.text.muted} style={{ width: 130 }}>
                        Đơn Vị Tính
                      </AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary} style={{ flex: 1, textAlign: 'right' }}>
                        {selectedSoldItemDetail.unit || 'phần'}
                      </AppText>
                    </View>
                    <View style={s.financeDetailRow}>
                      <AppText variant="md" weight="normal" color={theme.text.muted} style={{ width: 130 }}>
                        Tỷ Trọng Doanh Thu
                      </AppText>
                      <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums style={{ flex: 1, textAlign: 'right' }}>
                        {contrib}% toàn ca
                      </AppText>
                    </View>
                    <View style={[s.financeDetailRow, { borderBottomWidth: 0 }]}>
                      <AppText variant="md" weight="normal" color={theme.text.muted} style={{ width: 130 }}>
                        Ca Bán Hàng
                      </AppText>
                      <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums style={{ flex: 1, textAlign: 'right' }}>
                        {currentShiftCode} · {currentCashier}
                      </AppText>
                    </View>
                  </View>

                  {/* Card 4: Danh Sách Hóa Đơn Xuất Món Này Trong Ca (Lấp Đầy Khoảng Trống) */}
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        marginTop: isWide ? 12 : 8,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border.subtle,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <AppText variant="xs" weight="medium" color={theme.text.muted}>
                        HÓA ĐƠN XUẤT MÓN ({itemOrders.length} ĐƠN)
                      </AppText>
                      <AppText variant="xs" color={theme.text.muted}>
                        Gần nhất lên đầu
                      </AppText>
                    </View>

                    {itemOrders.length === 0 ? (
                      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                        <AppText variant="sm" color={theme.text.muted}>
                          Chưa có đơn hàng nào ghi nhận món này
                        </AppText>
                      </View>
                    ) : (
                      itemOrders.slice(0, 6).map((ord) => {
                        const matchedItem = ord.items.find(
                          (it) => (it.item?.name || 'Món ăn') === selectedSoldItemDetail.name
                        );
                        const qty = matchedItem?.qty || 1;
                        const itemSubtotal = qty * selectedSoldItemDetail.price;
                        const isCash = ord.paymentMethod === 'tien_mat';

                        return (
                          <View
                            key={ord.id}
                            style={[
                              s.itemOrderHistoryRow,
                              {
                                borderBottomColor: theme.border.subtle,
                                borderBottomWidth: StyleSheet.hairlineWidth,
                              },
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                                  #{ord.id.slice(-5)}
                                </AppText>
                                <View style={[s.tableBadgeMini, { backgroundColor: theme.surface.header }]}>
                                  <AppText variant="xs" weight="medium" color={theme.text.primary}>
                                    {ord.tableName || 'Mang về'}
                                  </AppText>
                                </View>
                              </View>
                              <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                                {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong'} · {isCash ? '💵 Tiền mặt' : '📱 VietQR'}
                              </AppText>
                            </View>

                            <View style={{ alignItems: 'flex-end' }}>
                              <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                                x{qty} {selectedSoldItemDetail.unit || 'ly'}
                              </AppText>
                              <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                                {formatCurrency(itemSubtotal)} đ
                              </AppText>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Card 5: Nhận Định Vị Chủ Quán (Insight Card) */}
                  <View
                    style={[
                      s.detailCard,
                      {
                        backgroundColor: isDark ? 'rgba(13, 148, 136, 0.14)' : 'rgba(13, 148, 136, 0.08)',
                        borderColor: theme.brand.primary,
                        marginTop: isWide ? 12 : 8,
                        borderRadius: isWide ? 14 : 0,
                        borderWidth: isWide ? 1 : 0,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.brand.primary,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        marginBottom: 16,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Icon name="lightbulb-on-outline" size={18} color={theme.brand.primary} />
                      <AppText variant="sm" weight="bold" color={theme.brand.primary}>
                        NHẬN ĐỊNH VỊ CHỦ QUÁN
                      </AppText>
                    </View>
                    <AppText variant="sm" color={theme.text.primary}>
                      {contribNum >= 20
                        ? `🔥 Món chủ lực tạo doanh thu cao nhất ca (${contrib}% ca). Cần luôn chuẩn bị nguyên liệu đầy đủ trong kho.`
                        : contribNum >= 10
                        ? `✨ Món bán đều đặn, đóng góp ổn định (${contrib}% ca). Có thể gợi ý tư vấn thêm topping.`
                        : `💡 Món phụ kèm / ăn nhẹ (${contrib}% ca). Đề xuất nhân viên giới thiệu kèm khi khách gọi đồ uống.`}
                    </AppText>
                  </View>
                </>
              );
            })()}
          </ScrollView>

          {/* Bottom Bar */}
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
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                setSelectedSoldItemDetail(null);
                router.push('/bao-cao-loi-nhuan' as any);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}
            >
              <Icon name="chart-box-outline" size={18} color={theme.brand.primary} />
              <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                Xem Báo Cáo
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                setSelectedSoldItemDetail(null);
              }}
              style={[s.fullPageBtnAction, { backgroundColor: theme.brand.primary, borderColor: theme.brand.primary, flex: 1.2 }]}
            >
              <AppText variant="md" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
                Đóng
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : modalVisible && !isWide ? (
        <View style={{ flex: 1, backgroundColor: theme.surface.card }}>
          <AppHeader
            showBack
            onBack={() => {
              playTapSound();
              setModalVisible(false);
            }}
            title={txType === 'chi' ? 'Lập Phiếu Chi' : 'Lập Phiếu Thu'}
            subtitle="Sổ quỹ tiền mặt tức thì"
            rightCustom={
              <View
                style={[
                  s.headerBadge,
                  {
                    backgroundColor: txType === 'chi' ? theme.status.dangerBg : theme.status.readyBg,
                    borderColor: txType === 'chi' ? theme.brand.danger : theme.brand.success,
                  },
                ]}
              >
                <AppText
                  variant="sm"
                  weight="bold"
                  color={txType === 'chi' ? theme.brand.danger : theme.brand.success}
                  tabularNums
                >
                  {txType === 'chi' ? '-' : '+'}{formatCurrency(currentAmount)} đ
                </AppText>
              </View>
            }
          />

          {/* 🌟 TAB CẤP 1 (TIER 1 UNDERLINE TAB BAR 46PX): CHI TIỀN (-) & THU TIỀN (+) DÍNH DƯỚI HEADER LIỀN MẠCH */}
          <View
            style={[
              s.primaryTabBar,
              {
                backgroundColor: theme.status.warningBg,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
              {/* Tab 1: Chi Tiền */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                  }
                  setTxType('chi');
                  setSelectedPreset(quickExpensePresets[0].label);
                  setCustomDescription(quickExpensePresets[0].label);
                  setAmountStr((quickExpensePresets[0].defaultAmount || 20000).toString());
                }}
                style={[
                  s.primaryTabItem,
                  { flex: 1 },
                  txType === 'chi' && {
                    borderBottomColor: theme.brand.accent,
                    borderBottomWidth: 3,
                  },
                ]}
              >
                <AppText
                  variant="md"
                  weight={txType === 'chi' ? 'bold' : 'normal'}
                  color={txType === 'chi' ? theme.brand.accent : theme.text.primary}
                >
                  Chi Tiền (-)
                </AppText>
              </TouchableOpacity>

              {/* Tab 2: Thu Tiền */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                  }
                  setTxType('thu');
                  setSelectedPreset(quickIncomePresets[0].label);
                  setCustomDescription(quickIncomePresets[0].label);
                  setAmountStr((quickIncomePresets[0].defaultAmount || 1000000).toString());
                }}
                style={[
                  s.primaryTabItem,
                  { flex: 1 },
                  txType === 'thu' && {
                    borderBottomColor: theme.brand.accent,
                    borderBottomWidth: 3,
                  },
                ]}
              >
                <AppText
                  variant="md"
                  weight={txType === 'thu' ? 'bold' : 'normal'}
                  color={txType === 'thu' ? theme.brand.accent : theme.text.primary}
                >
                  Thu Tiền (+)
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{
              paddingVertical: 0,
              paddingBottom: 110,
              backgroundColor: theme.surface.card,
            }}
            showsVerticalScrollIndicator={false}
          >
            <QuickCashFormContent
              txType={txType}
              setTxType={setTxType}
              selectedPreset={selectedPreset}
              setSelectedPreset={setSelectedPreset}
              customDescription={customDescription}
              setCustomDescription={setCustomDescription}
              amountStr={amountStr}
              setAmountStr={setAmountStr}
              onSubmit={handleCreateTx}
              onCancel={() => setModalVisible(false)}
              currentDrawerCash={actualDrawerCash}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              expenseType={expenseType}
              setExpenseType={setExpenseType}
              hideActionButtons
            />
          </ScrollView>

          {/* FIXED BOTTOM ACTION DOCK (CHUẨN CÔNG THÁI HỌC F&B) */}
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
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                setModalVisible(false);
              }}
              style={[
                s.fullPageBtnAction,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                  flex: 0.7,
                },
              ]}
            >
              <AppText variant="md" weight="medium" color={theme.text.primary}>
                Hủy
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                handleCreateTx();
              }}
              style={[
                s.fullPageBtnAction,
                {
                  backgroundColor: theme.brand.primary,
                  borderColor: theme.brand.primary,
                  flex: 1.3,
                },
              ]}
            >
              <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums numberOfLines={1}>
                Lưu Phiếu ({txType === 'chi' ? '-' : '+'}{formatCurrency(currentAmount)} đ)
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* 🌟 UNIFIED APP HEADER VỚI NÚT + LẬP PHIẾU GÓC PHẢI */}
          <AppHeader
            showBack
            hideBackOnWide
            title="Sổ Quỹ"
            subtitle={`${selectedBranchId === 'all' ? 'Toàn Chuỗi' : ((branches as Branch[]).find((b: Branch) => b.id === selectedBranchId)?.code || activeBranch.code)} · Két ${formatCurrency(actualDrawerCash)} đ`}
            rightCustom={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    setTxType('chi');
                    setSelectedPreset(quickExpensePresets[0].label);
                    setCustomDescription(quickExpensePresets[0].label);
                    setAmountStr((quickExpensePresets[0].defaultAmount || 20000).toString());
                    setModalVisible(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Lập phiếu thu chi"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    s.addHeaderBtn,
                    {
                      backgroundColor: theme.brand.primary,
                    },
                  ]}
                >
                  <Icon name="plus" size={16} color={theme.text.onBrand} />
                  <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                    Lập Phiếu
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setOmniSearchOpen(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    s.navBtn,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.subtle,
                    },
                  ]}
                >
                  <Icon name="magnify" size={18} color={theme.text.primary} />
                </TouchableOpacity>
              </View>
            }
          />

          {/* 🌟 DÃY 1: PRIMARY UNDERLINE TAB BAR (Cấp 1 - Màu chân Jade rộng rãi, thoáng đãng - Trượt Ngang) */}
          {/* 🌟 DÃY 1: PRIMARY UNDERLINE TAB BAR (Cấp 1 - Underline Tabs 46px) */}
          <Tier1Tabs
            tabs={soQuyTabs}
            activeTab={activeMainTab}
            onTabChange={setActiveMainTab}
            backgroundColor={theme.status.warningBg}
          />

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

          {/* 🌟 DÃY 2: SECONDARY JADE CAPSULE FILTER BAR (Cấp 2 - Dạng viên thuốc Jade Capsule chuẩn đẹp) */}
          {activeMainTab === 'cashbook' && (
            <View
              style={[
                s.secondaryFilterBar,
                {
                  backgroundColor: theme.surface.card,
                  borderBottomColor: theme.border.subtle,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsScroll}>
                {[
                  { id: 'all', label: `Tất Cả (${transactions.length})` },
                  { id: 'chi', label: `Khoản Chi (${chiCount})` },
                  { id: 'thu', label: `Khoản Thu (${thuCount})` },
                ].map((chip) => {
                  const isSelected = filterType === chip.id;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      activeOpacity={0.75}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      onPress={() => {
                        playTapSound();
                        setFilterType(chip.id as any);
                      }}
                      style={[
                        s.chipPill,
                        {
                          backgroundColor: isSelected ? theme.brand.primary : theme.surface.card,
                          borderColor: isSelected ? theme.brand.primary : theme.border.subtle,
                        },
                      ]}
                    >
                      <AppText
                        variant="sm"
                        weight={isSelected ? 'bold' : 'medium'}
                        color={isSelected ? theme.text.onBrand : theme.text.primary}
                        tabularNums
                      >
                        {chip.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 🌟 2-COLUMN WORKSPACE ON TABLET/WEB, 1-COLUMN ON MOBILE */}
          <View style={[s.mainWorkspace, isWide ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
            {/* Left Pane (50% on 24-inch, 56% on Tablet/Web): Metric Strip + Transaction History */}
            <View style={[s.leftPane, isWide ? { width: isDesktopLarge ? '50%' : '56%', borderRightWidth: 1, borderRightColor: theme.border.glassBorder } : { flex: 1 }]}>
              {/* Scrollable List with Pull-to-Refresh & Natural Metric Scroll on Mobile */}
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
                  s.listScroll,
                  {
                    paddingTop: isWide ? 12 : 0,
                    paddingBottom: isWide ? 24 : 16,
                  },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {/* Metrics on Top of Scrollable List */}
                {!isWide && (
                  <View style={{ marginBottom: 8 }}>
                    {activeMainTab === 'user_shift' ? renderUserKPIMetrics() : renderMetricStrip()}
                  </View>
                )}

                {activeMainTab === 'user_shift' ? (
                  <View style={{ width: '100%' }}>
                    {renderUserShiftProfile()}
                    {isWide && renderUserKPIMetrics()}
                    {renderUserSoldItemsList()}
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    {isWide && renderMetricStrip()}
                    {/* Empty State */}
                    {filteredTransactions.length === 0 ? (
                      <EmptyState
                        icon="cash-remove"
                        message="Chưa có phiếu thu chi nào"
                        description="Bấm Lập Phiếu để ghi nhận chi chợ hoặc thu ngoài."
                      />
                    ) : (
                  /* Flat Seamless Transaction Rows (68px) */
                  filteredTransactions.map((tx) => {
                    const isChi = tx.type === 'chi';
                    const isVoided = tx.status === 'voided';
                    const isCash = tx.paymentMethod === 'tien_mat' || !tx.paymentMethod;

                    return (
                      <View
                        key={tx.id}
                        style={{ borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }}
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
                            setSelectedTxDetail(tx);
                          }}
                          style={[
                            s.txRow,
                            {
                              backgroundColor: theme.surface.card,
                              opacity: isVoided ? 0.65 : 1,
                            },
                          ]}
                        >
                          {/* Dòng 1: Nội dung chi/thu (Trái) — Số tiền (Phải) */}
                          <View style={s.rowTopLine}>
                            <View style={s.rowLeftMeta}>
                              <View
                                style={[
                                  s.typeIndicatorDot,
                                  {
                                    backgroundColor: isVoided
                                      ? theme.text.muted
                                      : isChi
                                      ? theme.brand.danger
                                      : theme.brand.success,
                                  },
                                ]}
                              />
                              <AppText
                                variant="md"
                                weight="normal"
                                color={isVoided ? theme.text.muted : theme.text.primary}
                                numberOfLines={1}
                                style={[
                                  { flex: 1 },
                                  isVoided && { textDecorationLine: 'line-through' },
                                ]}
                              >
                                {tx.description}
                              </AppText>
                            </View>

                            <AppText
                              variant="md"
                              weight="medium"
                              color={isVoided ? theme.text.muted : (isChi ? theme.brand.danger : theme.brand.success)}
                              tabularNums
                              style={isVoided ? { textDecorationLine: 'line-through' } : undefined}
                            >
                              {isChi ? '-' : '+'}{formatCurrency(tx.amount)} đ
                            </AppText>
                          </View>

                          {/* Dòng 2: Giờ + Người lập (Trái) — Phân loại + Nguồn tiền + Chevron (Phải) */}
                          <View style={s.rowBottomLine}>
                            <View style={s.rowBottomLeft}>
                              <AppText variant="xs" color={theme.text.muted} tabularNums>
                                {tx.time} ·
                              </AppText>
                              <AppText variant="xs" color={theme.text.muted}>
                                {tx.performedBy || 'Chủ Quán'}
                              </AppText>
                            </View>

                            <View style={s.rowBottomRight}>
                              {/* Badge Đã Hủy nếu có */}
                              {isVoided ? (
                                <View style={[s.categoryBadge, { backgroundColor: theme.status.dangerBg }]}>
                                  <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                                    Đã Hủy
                                  </AppText>
                                </View>
                              ) : (
                                <>
                                  {/* Badge Nguồn tiền */}
                                  <View style={[s.categoryBadge, { backgroundColor: theme.surface.header }]}>
                                    <AppText variant="xs" color={theme.text.muted}>
                                      {isCash ? '💵 Két' : '🏦 CK'}
                                    </AppText>
                                  </View>

                                  {/* Badge Phân loại */}
                                  <View style={[s.categoryBadge, { backgroundColor: theme.surface.header }]}>
                                    <AppText variant="xs" color={theme.text.muted}>
                                      {isChi ? (tx.expenseType === 'co_dinh' ? 'Định Phí' : 'Chi Chợ') : 'Thu Ngoài'}
                                    </AppText>
                                  </View>
                                </>
                              )}
                              <Icon name="chevron-right" size={16} color={theme.text.muted} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
                  </View>
                )}

                {/* Cross-Cluster Jump Links (Foot of the list) */}
                <View style={[s.quickJumpRow, { marginHorizontal: 16, marginTop: 24 }]}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      playTapSound();
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                      }
                      router.push('/giao-ca' as any);
                    }}
                    style={[
                      s.quickJumpBtn,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                      },
                    ]}
                  >
                    <Icon name="account-cash-outline" size={16} color={theme.brand.primary} />
                    <AppText variant="xs" weight="medium" color={theme.text.primary}>
                      Giao Ca Đếm Két
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      playTapSound();
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                      }
                      router.push('/bao-cao-loi-nhuan' as any);
                    }}
                    style={[
                      s.quickJumpBtn,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                      },
                    ]}
                  >
                    <Icon name="chart-box-outline" size={16} color={theme.brand.primary} />
                    <AppText variant="xs" weight="medium" color={theme.text.primary}>
                      Báo Cáo P&L
                    </AppText>
                  </TouchableOpacity>
                </View>
              </Animated.ScrollView>
            </View>

            {/* Right Pane (50% on 24-inch, 44% on Tablet/Web): Sticky Quick Cash Entry Form + Recent Transactions */}
            {isWide && (
              <View style={[s.rightPane, { flex: 1, backgroundColor: theme.surface.app, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border.subtle }]}>
                <View style={[s.stickyFormHeader, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[s.formIconSquircle, { backgroundColor: theme.brand.primaryBg }]}>
                        <Icon name="book-edit-outline" size={18} color={theme.brand.primary} />
                      </View>
                      <View>
                        <AppText variant="md" weight="medium" color={theme.text.primary}>
                          Ghi Nhanh Sổ Quỹ (3s)
                        </AppText>
                        <AppText variant="xs" color={theme.text.muted}>
                          Chi chợ & thu tiền mặt tức thì
                        </AppText>
                      </View>
                    </View>

                    {/* Quick Shift Summary Pill */}
                    <View style={[s.headerBadge, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
                      <AppText variant="xs" color={theme.text.muted}>
                        Két: <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>{formatCurrency(actualDrawerCash)} đ</AppText>
                      </AppText>
                    </View>
                  </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
                  {/* Card Form Ghi Nhanh */}
                  <View
                    style={[
                      s.formCardContainer,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderRadius: 12,
                        padding: 16,
                      },
                    ]}
                  >
                    <QuickCashFormContent
                      txType={txType}
                      setTxType={setTxType}
                      selectedPreset={selectedPreset}
                      setSelectedPreset={setSelectedPreset}
                      customDescription={customDescription}
                      setCustomDescription={setCustomDescription}
                      amountStr={amountStr}
                      setAmountStr={setAmountStr}
                      onSubmit={handleCreateTx}
                      currentDrawerCash={actualDrawerCash}
                      paymentMethod={paymentMethod}
                      setPaymentMethod={setPaymentMethod}
                      expenseType={expenseType}
                      setExpenseType={setExpenseType}
                      isWide
                    />
                  </View>

                  {/* Card Lịch Sử Thu Chi Gần Đây (Lấp đầy khoảng trống, đồng bộ realtime) */}
                  <View
                    style={[
                      s.recentTxContainer,
                      {
                        backgroundColor: theme.surface.card,
                        borderColor: theme.border.subtle,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderRadius: 12,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.recentTxHeader,
                        {
                          backgroundColor: theme.surface.header,
                          borderBottomColor: theme.border.subtle,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon name="history" size={16} color={theme.brand.primary} />
                        <AppText variant="xs" weight="medium" color={theme.text.primary}>
                          PHIẾU THU CHI VỪA LẬP ({transactions.length})
                        </AppText>
                      </View>
                      {transactions.length > 0 && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => {
                            playTapSound();
                            setActiveMainTab('cashbook');
                          }}
                        >
                          <AppText variant="xs" color={theme.brand.primary}>
                            Xem tất cả ›
                          </AppText>
                        </TouchableOpacity>
                      )}
                    </View>

                    {transactions.length === 0 ? (
                      <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="notebook-outline" size={32} color={theme.text.muted} />
                        <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 8 }}>
                          Chưa có khoản thu chi nào hôm nay
                        </AppText>
                        <AppText variant="xs" color={theme.text.subtle} style={{ marginTop: 2 }}>
                          Chọn mẫu chi chợ phía trên và bấm "Lưu Phiếu" để ghi nhận tức thì.
                        </AppText>
                      </View>
                    ) : (
                      transactions.slice(0, 8).map((tx, idx) => {
                        const isChi = tx.type === 'chi';
                        const isLast = idx === Math.min(transactions.length, 8) - 1;
                        return (
                          <TouchableOpacity
                            key={tx.id}
                            activeOpacity={0.7}
                            onPress={() => {
                              playTapSound();
                              setSelectedTxDetail(tx);
                            }}
                            style={[
                              s.recentTxRow,
                              !isLast && {
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: theme.border.subtle,
                              },
                            ]}
                          >
                            <View
                              style={[
                                s.recentTxDot,
                                {
                                  backgroundColor: isChi ? theme.brand.danger : theme.brand.success,
                                },
                              ]}
                            />
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <AppText variant="sm" weight="medium" color={theme.text.primary} numberOfLines={1}>
                                {tx.description}
                              </AppText>
                              <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                                {tx.time} · {tx.performedBy || 'Chủ Quán'}
                              </AppText>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <AppText
                                variant="sm"
                                weight="medium"
                                color={isChi ? theme.brand.danger : theme.brand.success}
                                tabularNums
                              >
                                {isChi ? '-' : '+'}{formatCurrency(tx.amount)} đ
                              </AppText>
                              <AppText variant="xxs" color={theme.text.subtle} style={{ marginTop: 2 }}>
                                {isChi ? 'Chi chợ' : 'Thu ngoài'}
                              </AppText>
                            </View>
                            <Icon name="chevron-right" size={16} color={theme.text.muted} style={{ marginLeft: 6 }} />
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Spotlight Command Palette (AppOmniSearch) */}
      <AppOmniSearch
        visible={omniSearchOpen}
        onClose={() => setOmniSearchOpen(false)}
        scope="all"
      />

      {/* MODAL XÁC NHẬN HỦY PHIẾU THU / CHI CÓ LƯU VẾT (AUDIT LOG SOFT VOID) */}
      <AppModal
        visible={voidModalOpen}
        title={`Hủy Phiếu #${selectedTxDetail?.id}`}
        subtitle={`Hoàn lại ${formatCurrency(selectedTxDetail?.amount || 0)} đ vào dòng tiền`}
        icon="alert-octagon-outline"
        iconColor={theme.brand.danger}
        iconBg={theme.status.dangerBg}
        onClose={() => setVoidModalOpen(false)}
        presentation="dialog"
        maxWidth={460}
        primaryAction={{
          label: 'Xác Nhận Hủy Phiếu',
          variant: 'danger',
          onPress: () => handleVoidTx(voidReasonText),
        }}
        secondaryAction={{
          label: 'Đóng',
          onPress: () => setVoidModalOpen(false),
        }}
      >
        <View style={{ gap: 10 }}>
          <AppText variant="xs" weight="medium" color={theme.text.muted}>
            CHỌN LÝ DO HỦY NHANH
          </AppText>

          <View style={s.voidPresetsRow}>
            {['Nhập sai số tiền', 'Trùng phiếu chi', 'Giao dịch không thành', 'Khách trả hàng'].map((reason) => {
              const isSel = voidReasonText === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  activeOpacity={0.75}
                  onPress={() => {
                    playTapSound();
                    setVoidReasonText(reason);
                  }}
                  style={[
                    s.voidPresetChip,
                    {
                      backgroundColor: isSel ? theme.status.dangerBg : theme.surface.header,
                      borderColor: isSel ? theme.brand.danger : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="xs"
                    weight={isSel ? 'bold' : 'normal'}
                    color={isSel ? theme.brand.danger : theme.text.primary}
                  >
                    {reason}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ marginTop: 6 }}>
            HOẶC NHẬP LÝ DO CHI TIẾT
          </AppText>
          <TextInput
            value={voidReasonText}
            onChangeText={setVoidReasonText}
            placeholder="Nhập lý do hủy phiếu..."
            placeholderTextColor={theme.text.muted}
            style={[
              s.voidInput,
              {
                color: theme.text.primary,
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
              },
            ]}
          />
        </View>
      </AppModal>

      {/* 🌟 SMART BOTTOM NAVBAR ON MOBILE */}
      {!isWide && !selectedTxDetail && !selectedSoldItemDetail && !modalVisible && (
        <BottomNavBar activeTab="so-quy" />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  userProfileCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userProfileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatarSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftCodeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  userKpiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userKpiCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  sectionTitleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
  },
  primaryTabBar: {
    height: 46,
    justifyContent: 'center',
  },
  primaryTabScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 16,
  },
  primaryTabItem: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
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
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  listScroll: {
    paddingBottom: 40,
  },
  txRow: {
    height: 56,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeftMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    marginRight: 10,
  },
  typeIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  rowBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowBottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  quickJumpRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  quickJumpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
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
  stickyFormHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formIconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCardContainer: {},
  recentTxContainer: {},
  recentTxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recentTxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  recentTxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  fullScreenRoot: {
    flex: 1,
  },
  modalTopBar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  expandedTxDetailBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  txDetailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txDetailCol: {
    flex: 1,
    gap: 2,
  },
  expandedSoldDetailBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  soldDetailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  soldDetailCol: {
    flex: 1,
    gap: 2,
  },
  detailCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  statusPillLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaGridBox: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaGridItem: {
    flex: 1,
  },
  financeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fullPageBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fullPageBtnAction: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  paymentBreakdownCol: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dualColorRatioBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  itemOrderHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  tableBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  voidAlertBanner: {
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  voidModalContent: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  dangerSquircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voidPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  voidPresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  voidInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  voidModalBtn: {
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
