import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  RefreshControl,
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
  BottomNavBar,
  AppHeader,
  useAppToast,
  AppOmniSearch,
  Tier1Tabs,
  Tier1TabItem,
  StatusDotBadge,
  EmptyState,
} from '../../lib/components/ui';
import { playTapSound } from '../../lib/utils/sound';
import { formatCurrency } from '../../lib/utils/format';
import {
  useShiftHistory,
  useActiveShift,
  useCashTransactions,
  useOrderHistory,
  usePOSActions,
  ShiftRecord,
} from '../../lib/store/usePOSStore';
import {
  DenomCounterGrid,
  OpenShiftModal,
  ShiftReceiptModal,
  CASH_DENOMINATIONS,
} from './_components';

export default function GiaoCaScreen() {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useAppToast();

  const activeShift = useActiveShift();
  const shiftHistory = useShiftHistory();
  const cashTransactions = useCashTransactions();
  const orderHistory = useOrderHistory();
  const { openShift, closeShift } = usePOSActions();

  // Navigation Tab: 'current' | 'denoms' | 'history'
  const [activeTab, setActiveTab] = useState<'current' | 'denoms' | 'history'>('current');

  const shiftTabs = useMemo<Tier1TabItem<'current' | 'denoms' | 'history'>[]>(
    () =>
      isWide
        ? [
            { id: 'current', label: 'Ca Hiện Tại & Đếm Két', icon: 'cash-register' },
            { id: 'history', label: 'Lịch Sử Ca', icon: 'history', badge: shiftHistory.length },
          ]
        : [
            { id: 'current', label: 'Ca Hiện Tại', icon: 'cash-register' },
            { id: 'denoms', label: 'Bảng Đếm Tờ (9)', icon: 'calculator-variant-outline' },
            { id: 'history', label: 'Lịch Sử Ca', icon: 'history', badge: shiftHistory.length },
          ],
    [isWide, shiftHistory.length]
  );

  const handleTabChange = (tab: 'current' | 'denoms' | 'history') => {
    playTapSound();
    setActiveTab(tab);
    if (tab === 'history' && !selectedReceiptShift && shiftHistory.length > 0) {
      setSelectedReceiptShift(shiftHistory[0]);
    }
  };

  // Kiểm Két State
  const [actualCashStr, setActualCashStr] = useState('');
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({});
  const [note, setNote] = useState('');
  const [cashToKeepStr, setCashToKeepStr] = useState('500000');

  // Modals
  const [openShiftModalVisible, setOpenShiftModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceiptShift, setSelectedReceiptShift] = useState<ShiftRecord | null>(null);
  const [omniSearchOpen, setOmniSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Status ca hiện tại
  const isClosed = activeShift?.status === 'closed';

  // Tính toán số liệu ca hiện tại (100% dữ liệu thật, không mock)
  const shiftMetrics = useMemo(() => {
    const startingCash = activeShift?.startingCash || 0;

    // Tính tổng tiền mặt và VietQR từ các đơn hoàn tất
    let cashSales = 0;
    let vietqrSales = 0;
    let orderCount = 0;

    orderHistory.forEach((ord) => {
      if (ord.status === 'voided') return;
      orderCount++;
      if (ord.paymentMethod === 'tien_mat') {
        cashSales += ord.finalTotal;
      } else if (ord.paymentMethod === 'vietqr') {
        vietqrSales += ord.finalTotal;
      }
    });

    // Thu / Chi ngoài từ Sổ Quỹ (Chỉ tính giao dịch tiền mặt vào két ca)
    let cashIn = 0;
    let cashOut = 0;

    cashTransactions.forEach((tx) => {
      if (tx.status === 'voided') return;
      if (tx.paymentMethod === 'tien_mat') {
        if (tx.type === 'thu') cashIn += tx.amount;
        if (tx.type === 'chi') cashOut += tx.amount;
      }
    });

    const expectedCash = startingCash + cashSales + cashIn - cashOut;

    return {
      startingCash,
      cashSales,
      vietqrSales,
      cashIn,
      cashOut,
      expectedCash,
      orderCount,
    };
  }, [activeShift, orderHistory, cashTransactions]);

  const actualCash = parseFloat(actualCashStr) || 0;
  const diffAmount = actualCash > 0 ? actualCash - shiftMetrics.expectedCash : 0;
  const cashToKeep = parseInt(cashToKeepStr.replace(/\D/g, ''), 10) || 0;
  const cashToRemit = actualCash > 0 ? Math.max(0, actualCash - cashToKeep) : 0;

  // Cập nhật số tờ đếm
  const updateDenomCount = (denom: number, delta: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setDenomCounts((prev) => {
      const cur = prev[denom] || 0;
      const next = Math.max(0, cur + delta);
      const updated = { ...prev, [denom]: next };
      const sum = CASH_DENOMINATIONS.reduce((acc, d) => acc + d * (updated[d] || 0), 0);
      setActualCashStr(sum > 0 ? sum.toString() : '');
      return updated;
    });
  };

  const resetDenomCounter = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setDenomCounts({});
    setActualCashStr('');
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    playTapSound();
    setTimeout(() => {
      setRefreshing(false);
      showToast({ title: 'Đã làm mới', type: 'info' });
    }, 400);
  }, [showToast]);

  const isSubmittingShiftRef = useRef(false);

  // Nghiệp vụ Chốt Ca
  const handleCloseShift = () => {
    if (isSubmittingShiftRef.current) return;
    if (!actualCashStr || actualCash <= 0) {
      showToast({ title: 'Chưa nhập tiền thực tế', type: 'warning' });
      return;
    }

    // 🚨 Chống gian lận: Nếu lệch két >= 50.000đ, bắt buộc nhập ghi chú giải trình lý do
    if (Math.abs(diffAmount) >= 50000 && !note.trim()) {
      showToast({
        title: 'Cần ghi chú giải trình',
        message: `Lệch ${Math.abs(diffAmount).toLocaleString('vi-VN')} đ: vui lòng nhập lý do vào ô Ghi chú`,
        type: 'warning',
      });
      return;
    }

    isSubmittingShiftRef.current = true;
    setTimeout(() => { isSubmittingShiftRef.current = false; }, 600);

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    const closedRecord = closeShift({
      actualEndingCash: actualCash,
      differenceAmount: diffAmount,
      note: note.trim() || undefined,
      denomCounts,
      cashToKeepForNextShift: cashToKeep,
      cashToRemitToOwner: cashToRemit,
      totalCashSales: shiftMetrics.cashSales,
      totalVietQRSales: shiftMetrics.vietqrSales,
      totalCashIn: shiftMetrics.cashIn,
      totalCashOut: shiftMetrics.cashOut,
      expectedEndingCash: shiftMetrics.expectedCash,
      orderCount: shiftMetrics.orderCount,
    });

    setSelectedReceiptShift(closedRecord);
    showToast({ title: 'Đã chốt ca thành công', type: 'success' });
  };

  // Nghiệp vụ Mở Ca Mới
  const handleOpenShiftConfirm = (data: {
    shiftName: string;
    cashierName: string;
    startingCash: number;
    note?: string;
    denomCounts?: Record<number, number>;
  }) => {
    if (isSubmittingShiftRef.current) return;
    isSubmittingShiftRef.current = true;
    setTimeout(() => { isSubmittingShiftRef.current = false; }, 600);

    openShift(data);
    setActualCashStr('');
    setDenomCounts({});
    setNote(data.note || '');
    setCashToKeepStr(data.startingCash.toString());
    showToast({ title: 'Đã mở ca mới', type: 'success' });
  };

  // In phiếu giao ca
  const handlePrintSlip = (rec: ShiftRecord) => {
    playTapSound();
    showToast({ title: 'Đã gửi lệnh in K80', type: 'success' });
    setReceiptModalVisible(false);
  };

  // 1. Metric Strip 3 số vàng (48px)
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
      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Đầu ca
        </AppText>
        <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums numberOfLines={1}>
          {formatCurrency(shiftMetrics.startingCash)} đ
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Tiền mặt bán
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums numberOfLines={1}>
          +{formatCurrency(shiftMetrics.cashSales)} đ
        </AppText>
      </View>

      <View style={[s.metricDivider, { backgroundColor: theme.border.subtle }]} />

      <View style={s.metricCol}>
        <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
          Két lý thuyết
        </AppText>
        <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums numberOfLines={1}>
          {formatCurrency(shiftMetrics.expectedCash)} đ
        </AppText>
      </View>
    </View>
  );

  // 2. Primary Underline Tabs (Chuẩn Tab Cấp 1)
  const renderPrimaryTabs = () => (
    <Tier1Tabs
      tabs={shiftTabs}
      activeTab={isWide && activeTab === 'denoms' ? 'current' : activeTab}
      onTabChange={(id) => handleTabChange(id as any)}
      backgroundColor={theme.status.warningBg}
    />
  );

  // 3. Chi tiết ca đối soát cột phải trên Desktop (Master-Detail)
  const renderWideHistoryShiftDetail = () => {
    if (!selectedReceiptShift) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <EmptyState
            icon="history"
            message="Chưa Chọn Ca Đối Soát"
            description="Bấm vào một ca từ danh sách bên trái để xem bảng kê đối soát két và in lại hóa đơn giao ca K80."
          />
        </View>
      );
    }

    const isMatch = selectedReceiptShift.differenceAmount === 0;
    const isOver = selectedReceiptShift.differenceAmount > 0;
    const diffAbs = Math.abs(selectedReceiptShift.differenceAmount);
    const keepNext = selectedReceiptShift.cashToKeepForNextShift !== undefined
      ? selectedReceiptShift.cashToKeepForNextShift
      : selectedReceiptShift.startingCash;
    const remitOwner = selectedReceiptShift.cashToRemitToOwner !== undefined
      ? selectedReceiptShift.cashToRemitToOwner
      : Math.max(0, selectedReceiptShift.actualEndingCash - keepNext);

    return (
      <View style={{ flex: 1, backgroundColor: theme.surface.app }}>
        {/* Sticky Header */}
        <View style={[s.stickyFormHeader, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle }]}>
          <View style={s.rightHeaderRow}>
            <View style={s.rightHeaderTitleBlock}>
              <View style={[s.formIconSquircle, { backgroundColor: theme.brand.primaryBg }]}>
                <Icon name="printer-pos" size={18} color={theme.brand.accent} />
              </View>
              <View>
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  Chi Tiết Ca: {selectedReceiptShift.shiftName}
                </AppText>
                <AppText variant="xs" color={theme.text.muted}>
                  {selectedReceiptShift.closedAt} · Thu ngân: {selectedReceiptShift.cashierName}
                </AppText>
              </View>
            </View>

            <StatusDotBadge
              status={isMatch ? 'balanced' : isOver ? 'over' : 'short'}
              label={
                isMatch
                  ? 'Khớp két 100%'
                  : isOver
                  ? `Thừa +${formatCurrency(diffAbs)} đ`
                  : `Thiếu -${formatCurrency(diffAbs)} đ`
              }
              size="md"
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
          {/* Card 1: Dòng tiền bóc tách */}
          <View style={[s.wideHistoryCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              BẢNG KÊ DÒNG TIỀN CA
            </AppText>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color={theme.text.muted}>Đầu ca nhận két:</AppText>
                <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums>
                  {formatCurrency(selectedReceiptShift.startingCash)} đ
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color={theme.text.muted}>Doanh thu tiền mặt:</AppText>
                <AppText variant="sm" weight="bold" color={theme.brand.success} tabularNums>
                  +{formatCurrency(selectedReceiptShift.totalCashSales)} đ
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color={theme.text.muted}>Doanh thu VietQR (về TK):</AppText>
                <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                  +{formatCurrency(selectedReceiptShift.totalVietQRSales)} đ
                </AppText>
              </View>

              {(selectedReceiptShift.totalCashIn || 0) > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="sm" color={theme.text.muted}>Thu ngoài sổ quỹ:</AppText>
                  <AppText variant="sm" weight="bold" color={theme.brand.success} tabularNums>
                    +{formatCurrency(selectedReceiptShift.totalCashIn || 0)} đ
                  </AppText>
                </View>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color={theme.text.muted}>Chi chợ / chi ngoài:</AppText>
                <AppText variant="sm" weight="bold" color={theme.brand.danger} tabularNums>
                  -{formatCurrency(selectedReceiptShift.totalCashOut || 0)} đ
                </AppText>
              </View>

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border.subtle, marginVertical: 4 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" weight="bold" color={theme.text.primary}>Két lý thuyết:</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                  {formatCurrency(selectedReceiptShift.expectedEndingCash)} đ
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" weight="bold" color={theme.text.primary}>Thực đếm cuối ca:</AppText>
                <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                  {formatCurrency(selectedReceiptShift.actualEndingCash)} đ
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" weight="bold" color={isMatch ? theme.brand.success : isOver ? theme.brand.warning : theme.brand.danger}>
                  Chênh lệch đối soát:
                </AppText>
                <AppText
                  variant="md"
                  weight="bold"
                  color={isMatch ? theme.brand.success : isOver ? theme.brand.warning : theme.brand.danger}
                  tabularNums
                >
                  {isMatch ? '0 đ (Khớp 100%)' : isOver ? `+${formatCurrency(diffAbs)} đ` : `-${formatCurrency(diffAbs)} đ`}
                </AppText>
              </View>
            </View>
          </View>

          {/* Card 2: Phân bổ tiền két */}
          <View style={[s.wideHistoryCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              PHÂN BỔ TIỀN KÉT
            </AppText>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" color={theme.text.muted}>Để lại ca sau:</AppText>
                <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums>
                  {formatCurrency(keepNext)} đ
                </AppText>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="sm" weight="bold" color={theme.text.primary}>Nộp chủ quán:</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
                  {formatCurrency(remitOwner)} đ
                </AppText>
              </View>
            </View>
          </View>

          {/* Card 3: Ghi chú giải trình (nếu có) */}
          {selectedReceiptShift.note ? (
            <View style={[s.wideHistoryCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="note-text-outline" size={16} color={theme.brand.primary} />
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  Ghi Chú Giải Trình
                </AppText>
              </View>
              <AppText variant="sm" color={theme.text.primary}>
                {selectedReceiptShift.note}
              </AppText>
            </View>
          ) : null}

          {/* Card 4: Bảng kê chi tiết tờ tiền (nếu có) */}
          {selectedReceiptShift.denomCounts && Object.values(selectedReceiptShift.denomCounts).some((c) => c > 0) ? (
            <View style={[s.wideHistoryCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                BẢNG KÊ TIỀN ĐẾM THEO MỆNH GIÁ
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {CASH_DENOMINATIONS.filter((d) => (selectedReceiptShift.denomCounts?.[d] || 0) > 0).map((denom) => {
                  const count = selectedReceiptShift.denomCounts![denom];
                  return (
                    <View
                      key={denom}
                      style={{
                        width: '48.5%',
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: theme.surface.header,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.border.subtle,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View>
                        <AppText variant="xs" color={theme.text.muted}>
                          {formatCurrency(denom)} đ
                        </AppText>
                        <AppText variant="sm" weight="bold" color={theme.brand.primary} tabularNums>
                          {count} tờ
                        </AppText>
                      </View>
                      <AppText variant="sm" weight="medium" color={theme.text.primary} tabularNums>
                        {formatCurrency(denom * count)} đ
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Sticky Footer Actions */}
        <View style={[s.wideStickyFooter, { backgroundColor: theme.surface.card, borderTopColor: theme.border.subtle }]}>
          <Button
            size="lg"
            variant="outline"
            title="Báo Cáo P&L"
            leadingIcon={<Icon name="chart-box-outline" size={18} color={theme.text.primary} />}
            onPress={() => {
              playTapSound();
              router.push('/bao-cao-loi-nhuan' as any);
            }}
            style={{ flex: 1, height: 48, borderRadius: 12 }}
          />
          <Button
            size="lg"
            title="In Phiếu K80"
            leadingIcon={<Icon name="printer" size={18} color={theme.text.onBrand} />}
            onPress={() => handlePrintSlip(selectedReceiptShift)}
            style={{ flex: 1.2, height: 48, borderRadius: 12, backgroundColor: theme.brand.accent }}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* 🌟 UNIFIED APP HEADER */}
      <AppHeader
        title="Giao Ca"
        subtitle={isClosed ? 'Đã kết ca' : `${activeShift?.shiftName || 'Ca Sáng'} · ${activeShift?.cashierName || 'Thu Ngân'}`}
        showSearch
        onOpenSearch={() => setOmniSearchOpen(true)}
        rightCustom={
          isClosed ? (
            <TouchableOpacity
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                playTapSound();
                if (selectedReceiptShift) {
                  setReceiptModalVisible(true);
                } else if (shiftHistory.length > 0) {
                  setSelectedReceiptShift(shiftHistory[0]);
                  setReceiptModalVisible(true);
                }
              }}
              style={[s.headerCtaBtn, { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent }]}
            >
              <Icon name="printer" size={16} color={theme.text.onBrand} />
              <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                In Phiếu
              </AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                playTapSound();
                setOpenShiftModalVisible(true);
              }}
              style={[s.headerCtaBtn, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
            >
              <Icon name="plus" size={16} color={theme.brand.primary} />
              <AppText variant="sm" weight="bold" color={theme.brand.primary}>
                Mở Ca
              </AppText>
            </TouchableOpacity>
          )
        }
      />

      {/* 🌟 TIER 1 FIXED TABS */}
      <View style={s.fixedTabBarWrapper}>
        {renderPrimaryTabs()}
      </View>

      {/* 🌟 WORKSPACE LAYOUT (2 CỘT TABLET/WEB, 1 CỘT MOBILE) */}
      <View style={[s.mainWorkspace, isWide ? { flexDirection: 'row' } : { flexDirection: 'column' }]}>
        {/* CỘT TRÁI: DÒNG TIỀN KÉT & KIỂM KÉT */}
        <View
          style={[
            s.leftPane,
            isWide ? { width: isDesktopLarge ? '50%' : '48%', borderRightWidth: 1, borderRightColor: theme.border.subtle } : { flex: 1 },
          ]}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingTop: 0,
              paddingBottom: isWide ? 24 : 80 + insets.bottom,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.brand.primary} />}
          >
            {/* 3 SỐ VÀNG STRIP */}
            {renderMetricStrip()}

            {/* TAB 1: CA HIỆN TẠI */}
            {(activeTab === 'current' || (isWide && activeTab !== 'history')) && (
              <View style={{ gap: 12, paddingTop: 10 }}>
                {/* 1. BÓC TÁCH DÒNG TIỀN KÉT */}
                <View style={[s.seamlessSection, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[s.sectionTitleRow, { borderBottomColor: theme.border.subtle }]}>
                    <AppText variant="md" weight="bold" color={theme.text.primary}>
                      DÒNG TIỀN KÉT
                    </AppText>
                    <View
                      style={[
                        s.statusPill,
                        {
                          backgroundColor: isClosed
                            ? theme.surface.header
                            : (isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.10)'),
                        },
                      ]}
                    >
                      <AppText variant="xs" color={isClosed ? theme.text.muted : theme.brand.success} weight="bold">
                        {isClosed ? 'Đã Chốt Ca' : 'Đang Mở'}
                      </AppText>
                    </View>
                  </View>

                  <View style={s.seamlessRow}>
                    <AppText variant="md" color={theme.text.muted}>
                      Tiền mặt bán:
                    </AppText>
                    <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
                      +{formatCurrency(shiftMetrics.cashSales)} đ
                    </AppText>
                  </View>

                  <View style={[s.seamlessRow, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <View style={s.rowLabelWithBadge}>
                      <AppText variant="md" color={theme.text.muted}>
                        VietQR ngân hàng:
                      </AppText>
                      <View style={[s.microBadge, { backgroundColor: theme.surface.header }]}>
                        <AppText variant="xs" color={theme.text.muted}>
                          Về TK
                        </AppText>
                      </View>
                    </View>
                    <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                      {formatCurrency(shiftMetrics.vietqrSales)} đ
                    </AppText>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    onPress={() => {
                      playTapSound();
                      router.push('/so-quy' as any);
                    }}
                    style={[s.seamlessRow, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}
                  >
                    <View style={s.rowLabelWithIcon}>
                      <AppText variant="md" color={theme.text.muted}>
                        Chi chợ trong ca:
                      </AppText>
                      <Icon name="arrow-top-right" size={14} color={theme.brand.primary} />
                    </View>
                    <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums>
                      -{formatCurrency(shiftMetrics.cashOut)} đ
                    </AppText>
                  </TouchableOpacity>

                  {shiftMetrics.cashIn > 0 && (
                    <View style={[s.seamlessRow, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
                      <AppText variant="md" color={theme.text.muted}>
                        Thu ngoài ca:
                      </AppText>
                      <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
                        +{formatCurrency(shiftMetrics.cashIn)} đ
                      </AppText>
                    </View>
                  )}
                </View>

                {/* 2. LIÊN KẾT NHANH SỔ QUÝ & P&L */}
                <View style={s.quickLinkRow}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    onPress={() => {
                      playTapSound();
                      router.push('/so-quy' as any);
                    }}
                    style={[s.quickLinkBtn, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
                  >
                    <Icon name="wallet-outline" size={16} color={theme.brand.primary} />
                    <AppText variant="sm" weight="bold" color={theme.text.primary}>
                      Sổ Quỹ Chi Chợ
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    onPress={() => {
                      playTapSound();
                      router.push('/bao-cao-loi-nhuan' as any);
                    }}
                    style={[s.quickLinkBtn, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
                  >
                    <Icon name="chart-box-outline" size={16} color={theme.brand.primary} />
                    <AppText variant="sm" weight="bold" color={theme.text.primary}>
                      Báo Cáo P&L
                    </AppText>
                  </TouchableOpacity>
                </View>

                {/* 3. KIỂM KÉT THỰC TẾ */}
                <View style={[s.seamlessSection, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[s.sectionTitleRow, { borderBottomColor: theme.border.subtle }]}>
                    <AppText variant="md" weight="bold" color={theme.text.primary}>
                      KIỂM KÉT THỰC TẾ
                    </AppText>
                    {!isWide && (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => {
                          playTapSound();
                          setActiveTab('denoms');
                        }}
                        style={[s.countLinkChip, { backgroundColor: theme.brand.primaryBg, borderColor: theme.brand.primary }]}
                      >
                        <Icon name="calculator-variant-outline" size={14} color={theme.brand.primary} />
                        <AppText variant="sm" weight="bold" color={theme.brand.primary}>
                          Đếm Tờ (9)
                        </AppText>
                        <Icon name="chevron-right" size={14} color={theme.brand.primary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Input Tiền Thực Đếm */}
                  <View style={[s.inputRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    <AppText variant="md" weight="medium" color={theme.text.muted} style={s.formRowLabel}>
                      Thực đếm:
                    </AppText>
                    <TextInput
                      value={actualCashStr ? Number(actualCashStr).toLocaleString('vi-VN') : ''}
                      onChangeText={(val) => {
                        const raw = val.replace(/\D/g, '');
                        setActualCashStr(raw);
                      }}
                      keyboardType="numeric"
                      editable={!isClosed}
                      placeholder="Nhập số tiền..."
                      placeholderTextColor={theme.text.muted}
                      style={[s.cashInput, { color: theme.brand.primary }]}
                    />
                  </View>

                  {/* Banner Đối Soát Chênh Lệch Realtime */}
                  {actualCashStr !== '' && (
                    <View
                      style={[
                        s.diffBanner,
                        {
                          backgroundColor:
                            diffAmount === 0
                              ? (isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.10)')
                              : diffAmount > 0
                              ? (isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.10)')
                              : (isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.10)'),
                          borderBottomColor:
                            diffAmount === 0
                              ? theme.brand.success
                              : diffAmount > 0
                              ? theme.brand.warning
                              : theme.brand.danger,
                        },
                      ]}
                    >
                      <Icon
                        name={diffAmount === 0 ? 'check-circle' : diffAmount > 0 ? 'alert' : 'alert-octagon'}
                        size={20}
                        color={diffAmount === 0 ? theme.brand.success : diffAmount > 0 ? theme.brand.warning : theme.brand.danger}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <AppText
                          variant="md"
                          weight="bold"
                          tabularNums
                          color={diffAmount === 0 ? theme.brand.success : diffAmount > 0 ? theme.brand.warning : theme.brand.danger}
                        >
                          {diffAmount === 0
                            ? 'Khớp két 100%'
                            : diffAmount > 0
                            ? `Thừa két: +${formatCurrency(diffAmount)} đ`
                            : `Thiếu két: -${formatCurrency(Math.abs(diffAmount))} đ`}
                        </AppText>
                        <AppText variant="xs" color={theme.text.muted}>
                          {diffAmount === 0
                            ? 'Tiền mặt khớp chính xác với số liệu ca.'
                            : 'Đã ghi nhận chênh lệch vào nhật ký kiểm toán.'}
                        </AppText>
                      </View>
                    </View>
                  )}

                  {/* 4. PHÂN BỔ TIỀN KÉT (Nghiệp Vụ F&B Thực Chiến) */}
                  <View style={[s.seamlessRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    <AppText variant="md" color={theme.text.muted} style={s.formRowLabel}>
                      Để lại ca sau:
                    </AppText>
                    <TextInput
                      value={cashToKeep > 0 ? Number(cashToKeep).toLocaleString('vi-VN') : ''}
                      onChangeText={(val) => setCashToKeepStr(val.replace(/\D/g, ''))}
                      keyboardType="numeric"
                      editable={!isClosed}
                      placeholder="500.000 đ"
                      placeholderTextColor={theme.text.muted}
                      style={[s.subCashInput, { color: theme.text.primary }]}
                    />
                  </View>

                  <View style={[s.seamlessRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    <AppText variant="md" weight="bold" color={theme.text.primary} style={s.formRowLabel}>
                      Nộp chủ quán:
                    </AppText>
                    <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
                      {formatCurrency(cashToRemit)} đ
                    </AppText>
                  </View>

                  {/* Input Ghi Chú */}
                  <View style={s.inputRow}>
                    <AppText variant="md" color={theme.text.muted} style={s.formRowLabel}>
                      Ghi chú:
                    </AppText>
                    <TextInput
                      value={note}
                      onChangeText={setNote}
                      editable={!isClosed}
                      placeholder="Ghi chú bàn giao ca..."
                      placeholderTextColor={theme.text.muted}
                      style={[s.noteInput, { color: theme.text.primary }]}
                    />
                  </View>
                </View>

                {/* NÚT CHỐT CA / HOÀN TẤT */}
                <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
                  {!isClosed ? (
                    <Button
                      size="lg"
                      variant="accent"
                      title="Chốt Ca"
                      style={[s.closeShiftBtn, { backgroundColor: theme.brand.accent }]}
                      leadingIcon={<Icon name="lock-check-outline" size={20} color={theme.text.onBrand} />}
                      onPress={handleCloseShift}
                    />
                  ) : (
                    <View style={{ gap: 10 }}>
                      <View
                        style={[
                          s.closedBanner,
                          {
                            backgroundColor: theme.surface.card,
                            borderColor: theme.border.subtle,
                          },
                        ]}
                      >
                        <Icon name="check-decagram" size={24} color={theme.brand.success} />
                        <View style={{ flex: 1 }}>
                          <AppText variant="md" weight="bold" color={theme.text.primary}>
                            Ca làm việc đã kết thúc
                          </AppText>
                          <AppText variant="xs" color={theme.text.muted} tabularNums>
                            Tiền két đã chốt: {formatCurrency(actualCash)} đ · Nộp chủ: {formatCurrency(cashToRemit)} đ
                          </AppText>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Button
                          size="lg"
                          variant="outline"
                          title="In Phiếu"
                          leadingIcon={<Icon name="printer" size={18} color={theme.text.primary} />}
                          onPress={() => {
                            if (selectedReceiptShift) {
                              setReceiptModalVisible(true);
                            } else if (shiftHistory.length > 0) {
                              setSelectedReceiptShift(shiftHistory[0]);
                              setReceiptModalVisible(true);
                            }
                          }}
                          style={{ flex: 1, height: 50, borderRadius: 14 }}
                        />
                        <Button
                          size="lg"
                          title="Mở Ca"
                          leadingIcon={<Icon name="plus" size={18} color={theme.text.onBrand} />}
                          onPress={() => setOpenShiftModalVisible(true)}
                          style={{ flex: 1, height: 50, borderRadius: 14 }}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* TAB 2: BẢNG ĐẾM TỜ 9 MỆNH GIÁ (Mobile) */}
            {!isWide && activeTab === 'denoms' && (
              <View style={{ paddingTop: 10, gap: 10 }}>
                {/* Header thanh tiền đếm */}
                <View
                  style={[
                    s.denomTotalHeader,
                    {
                      backgroundColor: theme.surface.card,
                      borderBottomColor: theme.border.subtle,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="md" weight="bold" color={theme.text.primary}>
                        TỔNG THỰC ĐẾM
                      </AppText>
                      {actualCash > 0 && (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            backgroundColor:
                              diffAmount === 0
                                ? (isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)')
                                : diffAmount > 0
                                ? (isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(245, 158, 11, 0.12)')
                                : (isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.12)'),
                          }}
                        >
                          <AppText
                            variant="xs"
                            weight="bold"
                            tabularNums
                            color={
                              diffAmount === 0
                                ? theme.brand.success
                                : diffAmount > 0
                                ? theme.brand.warning
                                : theme.brand.danger
                            }
                          >
                            {diffAmount === 0
                              ? 'Khớp két'
                              : diffAmount > 0
                              ? `+${formatCurrency(diffAmount)} đ`
                              : `-${formatCurrency(Math.abs(diffAmount))} đ`}
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText variant="xl" weight="bold" color={theme.brand.primary} tabularNums>
                      {formatCurrency(actualCash)} đ
                    </AppText>
                  </View>

                  <TouchableOpacity
                    onPress={resetDenomCounter}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[s.resetBtn, { backgroundColor: theme.status.dangerBg }]}
                  >
                    <Icon name="refresh" size={16} color={theme.brand.danger} />
                    <AppText variant="sm" weight="bold" color={theme.brand.danger}>
                      Đặt Lại
                    </AppText>
                  </TouchableOpacity>
                </View>

                {/* 9 Mệnh Giá Grid */}
                <DenomCounterGrid
                  denomCounts={denomCounts}
                  onUpdate={updateDenomCount}
                  isClosed={isClosed}
                />

                {/* CTA Action Bar */}
                <View style={{ paddingHorizontal: 16, marginTop: 10, gap: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button
                      size="lg"
                      variant="outline"
                      title="Về Ca"
                      leadingIcon={<Icon name="arrow-left" size={18} color={theme.text.primary} />}
                      onPress={() => {
                        playTapSound();
                        setActiveTab('current');
                      }}
                      style={{ flex: 1, height: 50, borderRadius: 14 }}
                    />
                    {!isClosed ? (
                      <Button
                        size="lg"
                        title="Chốt Ca"
                        leadingIcon={<Icon name="lock-check-outline" size={20} color={theme.text.onBrand} />}
                        disabled={actualCash <= 0}
                        onPress={handleCloseShift}
                        style={{ flex: 1.5, height: 50, borderRadius: 14 }}
                      />
                    ) : (
                      <Button
                        size="lg"
                        title="Đã Kết Ca"
                        leadingIcon={<Icon name="check-decagram" size={20} color={theme.text.onBrand} />}
                        disabled
                        style={{ flex: 1.5, height: 50, borderRadius: 14, opacity: 0.6 }}
                      />
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* TAB 3: LỊCH SỬ CÁC CA ĐÃ ĐÓNG */}
            {activeTab === 'history' && (
              <View style={{ paddingTop: 10 }}>
                <View style={s.historyHeaderRow}>
                  <AppText variant="md" weight="bold" color={theme.text.primary}>
                    LỊCH SỬ CA GẦN ĐÂY ({shiftHistory.length})
                  </AppText>
                  <AppText variant="xs" color={theme.brand.primary}>
                    Đối soát két
                  </AppText>
                </View>

                {shiftHistory.length === 0 ? (
                  <EmptyState
                    icon="history"
                    message="Chưa Có Lịch Sử Ca"
                    description="Các ca làm việc sau khi chốt sẽ được lưu vết đối soát két đầy đủ tại đây."
                  />
                ) : (
                  <View>
                    {shiftHistory.map((item) => {
                      const isMatch = item.differenceAmount === 0;
                      const isOver = item.differenceAmount > 0;
                      const diffAbs = Math.abs(item.differenceAmount);

                      const isSelected = isWide && selectedReceiptShift?.id === item.id;

                      return (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.75}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          onPress={() => {
                            playTapSound();
                            setSelectedReceiptShift(item);
                            if (!isWide) {
                              setReceiptModalVisible(true);
                            }
                          }}
                          style={[
                            s.shiftHistoryItem,
                            {
                              backgroundColor: isSelected
                                ? (isDark ? 'rgba(180, 83, 9, 0.18)' : '#FEF3C7')
                                : theme.surface.card,
                              borderBottomColor: theme.border.subtle,
                              borderBottomWidth: StyleSheet.hairlineWidth,
                              borderLeftWidth: isSelected ? 4 : 0,
                              borderLeftColor: theme.brand.accent,
                            },
                          ]}
                        >
                          <View style={s.historyItemHeader}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <AppText variant="md" weight="bold" color={theme.text.primary}>
                                {item.shiftName}
                              </AppText>
                              <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                                {item.closedAt} · Thu ngân: {item.cashierName}
                              </AppText>
                            </View>
                            <StatusDotBadge
                              status={isMatch ? 'balanced' : isOver ? 'over' : 'short'}
                              label={
                                isMatch
                                  ? 'Khớp két'
                                  : isOver
                                  ? `Thừa +${formatCurrency(diffAbs)} đ`
                                  : `Thiếu -${formatCurrency(diffAbs)} đ`
                              }
                              size="sm"
                            />
                          </View>

                          {/* Dữ liệu tài chính ca */}
                          <View style={[s.historyMetricsRow, { borderTopColor: theme.border.subtle }]}>
                            <View style={s.historyMetricCol}>
                              <AppText variant="xs" color={theme.text.muted}>
                                Tiền mặt bán
                              </AppText>
                              <AppText variant="sm" weight="bold" color={theme.brand.success} tabularNums>
                                +{formatCurrency(item.totalCashSales)} đ
                              </AppText>
                            </View>

                            <View style={s.historyMetricCol}>
                              <AppText variant="xs" color={theme.text.muted}>
                                VietQR
                              </AppText>
                              <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                                {formatCurrency(item.totalVietQRSales)} đ
                              </AppText>
                            </View>

                            <View style={s.historyMetricCol}>
                              <AppText variant="xs" color={theme.text.muted}>
                                Thực đếm
                              </AppText>
                              <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums>
                                {formatCurrency(item.actualEndingCash)} đ
                              </AppText>
                            </View>
                          </View>

                          {item.note && (
                            <View style={[s.historyNoteRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                              <Icon name="note-text-outline" size={14} color={theme.text.muted} />
                              <AppText variant="xs" color={theme.text.muted} style={{ flex: 1 }}>
                                {item.note}
                              </AppText>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>

        {/* CỘT PHẢI (TABLET/WEB): MASTER-DETAIL DYNAMIC WORKSPACE */}
        {isWide && (
          <View style={[s.rightPane, { flex: 1, backgroundColor: theme.surface.app }]}>
            {activeTab === 'history' ? (
              renderWideHistoryShiftDetail()
            ) : (
              <>
                <View style={[s.stickyFormHeader, { backgroundColor: theme.surface.card, borderBottomColor: theme.border.subtle }]}>
                  <View style={s.rightHeaderRow}>
                    <View style={s.rightHeaderTitleBlock}>
                      <View style={[s.formIconSquircle, { backgroundColor: theme.brand.primaryBg }]}>
                        <Icon name="calculator-variant-outline" size={18} color={theme.brand.primary} />
                      </View>
                      <View>
                        <AppText variant="md" weight="bold" color={theme.text.primary}>
                          Đếm Tiền Két (9 Mệnh Giá)
                        </AppText>
                        <AppText variant="xs" color={theme.text.muted} tabularNums>
                          Tổng thực đếm: {formatCurrency(actualCash)} đ
                        </AppText>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={resetDenomCounter}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={[s.resetBtn, { backgroundColor: theme.status.dangerBg }]}
                    >
                      <Icon name="refresh" size={16} color={theme.brand.danger} />
                      <AppText variant="sm" weight="bold" color={theme.brand.danger}>
                        Đặt Lại
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
                  <DenomCounterGrid
                    denomCounts={denomCounts}
                    onUpdate={updateDenomCount}
                    isClosed={isClosed}
                    isWide={isWide}
                    isDesktopLarge={isDesktopLarge}
                  />

                  {/* Nhập nhanh tổng tiền */}
                  <View style={[s.glassInputCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
                    <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
                      Hoặc Nhập Nhanh Tiền Mặt
                    </AppText>
                    <TextInput
                      value={actualCashStr ? Number(actualCashStr).toLocaleString('vi-VN') : ''}
                      onChangeText={(val) => {
                        const raw = val.replace(/\D/g, '');
                        setActualCashStr(raw);
                      }}
                      keyboardType="numeric"
                      editable={!isClosed}
                      placeholder="Nhập số tiền..."
                      placeholderTextColor={theme.text.muted}
                      style={[s.cashInputWide, { color: theme.brand.primary, borderBottomColor: theme.brand.primary }]}
                    />
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        )}
      </View>

      {/* 🌟 SEARCH DRAWER */}
      <AppOmniSearch visible={omniSearchOpen} onClose={() => setOmniSearchOpen(false)} />

      {/* 🌟 BOTTOM NAV BAR ON MOBILE */}
      {!isWide && <BottomNavBar />}

      {/* 🌟 MODAL MỞ CA MỚI */}
      <OpenShiftModal
        visible={openShiftModalVisible}
        onClose={() => setOpenShiftModalVisible(false)}
        onConfirm={handleOpenShiftConfirm}
        defaultStartingCash={cashToKeep || 500000}
      />

      {/* 🌟 MODAL XEM TRƯỚC PHIẾU GIAO CA (K80 THERMAL SLIP) */}
      <ShiftReceiptModal
        visible={receiptModalVisible}
        onClose={() => setReceiptModalVisible(false)}
        shift={selectedReceiptShift}
        onPrint={handlePrintSlip}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  mainWorkspace: { flex: 1 },
  leftPane: { flex: 1 },
  rightPane: { overflow: 'hidden' },

  // Header CTA Button
  headerCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Primary Underline Tab Bar (Tier 1)
  fixedTabBarWrapper: {
    backgroundColor: 'transparent',
  },

  // Metric Strip (48px 1 dòng)
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
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
    height: 24,
  },

  // Flat Seamless Sections & Rows
  seamlessSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'transparent',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countLinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  seamlessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  microBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // Quick Links
  quickLinkRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  quickLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
  },

  // Input Rows
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
  },
  cashInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    padding: 0,
    margin: 0,
  },
  subCashInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    padding: 0,
    margin: 0,
    textAlign: 'right',
  },
  noteInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    margin: 0,
  },

  // Diff Banner
  diffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Bảng Đếm Tờ
  denomTotalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    gap: 6,
  },
  closeShiftBtn: {
    height: 50,
    borderRadius: 14,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Lịch sử ca
  historyHeaderRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftHistoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  diffTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  historyMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  historyMetricCol: {
    flex: 1,
    gap: 2,
  },
  historyNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },

  // Tablet/Web Styles
  stickyFormHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightHeaderTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formIconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassInputCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cashInputWide: {
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formRowLabel: {
    width: 135,
    flexShrink: 0,
  },
  wideHistoryCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  wideStickyFooter: {
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
  },
});
