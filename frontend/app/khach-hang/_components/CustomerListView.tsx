import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText } from '../../../lib/components/ui';
import { CustomerLoyalty, OrderHistoryItem } from '../../../lib/store/usePOSStore';
import { formatCurrency } from '../../../lib/utils/format';
import { playTapSound } from '../../../lib/utils/sound';

export type CustomerMainTab = 'list' | 'debt_ledger' | 'loyalty_vip';
export type FilterTab = 'all' | 'debt' | 'vip';
export type DebtFilterTab = 'all' | 'orders';
export type LoyaltyFilterTab = 'all' | 'vip' | 'regular' | 'new';

interface CustomerListViewProps {
  mainTab: CustomerMainTab;
  customers: CustomerLoyalty[];
  filteredCustomers: CustomerLoyalty[];
  orderHistory: OrderHistoryItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterTab: FilterTab;
  onFilterChange: (tab: FilterTab) => void;
  totalDebt: number;
  totalPoints: number;
  debtCustomerCount: number;
  vipCustomerCount: number;
  onSelectCustomer: (id: string) => void;
  onOpenAddModal: () => void;
  onSettle: (customer: CustomerLoyalty, order?: OrderHistoryItem) => void;
  onCallPhone: (phone: string) => void;
  onCreateOrder: (customer: CustomerLoyalty) => void;
  onPreviewBill: (order: OrderHistoryItem) => void;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  mainTab,
  customers,
  filteredCustomers,
  orderHistory,
  searchQuery,
  onSearchChange,
  filterTab,
  onFilterChange,
  totalDebt,
  totalPoints,
  debtCustomerCount,
  vipCustomerCount,
  onSelectCustomer,
  onOpenAddModal,
  onSettle,
  onCallPhone,
  onCreateOrder,
  onPreviewBill,
}) => {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const insets = useSafeAreaInsets();

  // Tab 2 & Tab 3 Local Filters
  const [debtFilter, setDebtFilter] = useState<DebtFilterTab>('all');
  const [loyaltyFilter, setLoyaltyFilter] = useState<LoyaltyFilterTab>('all');

  // Khách đang nợ
  const debtCustomers = useMemo(
    () => customers.filter((c) => (c.debtBalance || 0) > 0),
    [customers]
  );

  // Danh sách hóa đơn ghi nợ chưa thu
  const debtOrders = useMemo(
    () => orderHistory.filter((o) => o.paymentMethod === 'ghi_no' && !o.isDebtPaid),
    [orderHistory]
  );

  // Top khách hàng theo chi tiêu
  const topSpenders = useMemo(
    () => [...customers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0)),
    [customers]
  );

  // Khách có tích điểm (> 0)
  const activePointsCount = useMemo(
    () => customers.filter((c) => (c.rewardPoints || 0) > 0).length,
    [customers]
  );

  // Phân nhóm khách VIP (Chi tiêu >= 5M hoặc Điểm >= 5.000)
  const vipCustomers = useMemo(
    () =>
      customers.filter(
        (c) =>
          (c.rewardPoints || 0) >= 5000 ||
          (c.totalSpend || 0) >= 5000000 ||
          c.name.includes('VIP')
      ),
    [customers]
  );

  const vipTotalSpend = useMemo(
    () => vipCustomers.reduce((sum, c) => sum + (c.totalSpend || 0), 0),
    [vipCustomers]
  );

  // Phân nhóm khách Thân Thiết (Chi tiêu 2M - 5M hoặc Điểm 2.000 - 5.000)
  const regularCustomers = useMemo(
    () =>
      customers.filter(
        (c) =>
          !vipCustomers.some((v) => v.id === c.id) &&
          ((c.rewardPoints || 0) >= 2000 || (c.totalSpend || 0) >= 2000000)
      ),
    [customers, vipCustomers]
  );

  // Phân nhóm khách Mới
  const newCustomers = useMemo(
    () =>
      customers.filter(
        (c) =>
          !vipCustomers.some((v) => v.id === c.id) &&
          !regularCustomers.some((r) => r.id === c.id)
      ),
    [customers, vipCustomers, regularCustomers]
  );

  // Danh sách loyalty theo filter
  const filteredLoyaltyCustomers = useMemo(() => {
    let list = topSpenders;
    if (loyaltyFilter === 'vip') {
      list = [...vipCustomers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));
    } else if (loyaltyFilter === 'regular') {
      list = [...regularCustomers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));
    } else if (loyaltyFilter === 'new') {
      list = [...newCustomers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));
    }
    return list;
  }, [loyaltyFilter, topSpenders, vipCustomers, regularCustomers, newCustomers]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.card }}>
      {/* ========================================================================= */}
      {/* 🌟 TAB 1: DANH SÁCH KHÁCH HÀNG                                             */}
      {/* ========================================================================= */}
      {mainTab === 'list' && (
        <View style={{ flex: 1 }}>
          {/* 1. DÃY 2: CHIP CẤP 2 (CAPSULE PILLS 36PX) - NẰM NGAY DƯỚI TAB 1 */}
          <View
            style={[
              s.tier2Bar,
              {
                backgroundColor: theme.surface.card,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.tier2Scroll}
            >
              {/* Chip Tìm Kiếm Capsule 36px */}
              <View
                style={[
                  s.searchChip,
                  {
                    backgroundColor: isDark ? theme.surface.header : theme.surface.app,
                    borderColor: searchQuery.trim() ? theme.brand.accent : theme.border.subtle,
                  },
                ]}
              >
                <Icon
                  name="magnify"
                  size={16}
                  color={searchQuery.trim() ? theme.brand.accent : theme.text.muted}
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  placeholder="Tìm khách..."
                  placeholderTextColor={theme.text.muted}
                  style={[s.searchChipInput, { color: theme.text.primary }]}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => onSearchChange('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="close-circle" size={14} color={theme.text.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dải Chip Lọc Danh Mục */}
              {(
                [
                  { key: 'all' as FilterTab, label: `Tất Cả (${customers.length})` },
                  { key: 'debt' as FilterTab, label: `Đang Nợ (${debtCustomerCount})` },
                  { key: 'vip' as FilterTab, label: `VIP (${vipCustomerCount})` },
                ] as const
              ).map((tab) => {
                const isActive = filterTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    activeOpacity={0.75}
                    onPress={() => {
                      playTapSound();
                      onFilterChange(tab.key);
                    }}
                    style={[
                      s.filterChip,
                      {
                        backgroundColor: isActive
                          ? theme.brand.primary
                          : isDark
                          ? theme.surface.header
                          : theme.surface.app,
                        borderColor: isActive ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="sm"
                      weight={isActive ? 'medium' : 'normal'}
                      color={isActive ? theme.text.onBrand : theme.text.primary}
                      tabularNums
                    >
                      {tab.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 2. DÃI 3 CON SỐ VÀNG KPI (100% PHẲNG FULL-BLEED, ZERO CARD BOX) */}
          <View
            style={[
              s.kpiRibbon,
              {
                backgroundColor: theme.surface.card,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={s.kpiCol}>
              <AppText
                variant="xs"
                weight="medium"
                color={totalDebt > 0 ? theme.brand.danger : theme.text.muted}
                numberOfLines={1}
              >
                TỔNG NỢ ({debtCustomerCount})
              </AppText>
              <AppText
                variant="md"
                weight="bold"
                color={totalDebt > 0 ? theme.brand.danger : theme.brand.success}
                tabularNums
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {formatCurrency(totalDebt)} đ
              </AppText>
            </View>

            <View style={[s.kpiDivider, { backgroundColor: theme.border.subtle }]} />

            <View style={s.kpiCol}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} numberOfLines={1}>
                TỔNG KHÁCH
              </AppText>
              <AppText
                variant="md"
                weight="bold"
                color={theme.text.primary}
                tabularNums
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {customers.length} khách
              </AppText>
            </View>

            <View style={[s.kpiDivider, { backgroundColor: theme.border.subtle }]} />

            <View style={s.kpiCol}>
              <AppText variant="xs" weight="medium" color={theme.brand.accent} numberOfLines={1}>
                ĐIỂM TÍCH LŨY
              </AppText>
              <AppText
                variant="md"
                weight="bold"
                color={theme.brand.accent}
                tabularNums
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {formatCurrency(totalPoints)} điểm
              </AppText>
            </View>
          </View>

          {/* 3. DANH SÁCH KHÁCH HÀNG DE-BOXED PHẲNG TRÀN VIỀN */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              s.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {filteredCustomers.length === 0 ? (
              <View style={s.emptyBox}>
                <Icon name="account-search-outline" size={44} color={theme.text.muted} />
                <AppText
                  variant="md"
                  weight="medium"
                  color={theme.text.primary}
                  style={{ marginTop: 10 }}
                >
                  Không tìm thấy khách hàng
                </AppText>
                <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>
                  Thử tìm kiếm với từ khóa khác hoặc bấm + Khách
                </AppText>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                {filteredCustomers.map((cust) => {
                  const hasDebt = cust.debtBalance > 0;
                  const isVIP =
                    (cust.rewardPoints || 0) >= 5000 ||
                    (cust.totalSpend || 0) >= 5000000 ||
                    cust.name.includes('VIP');

                  return (
                    <TouchableOpacity
                      key={cust.id}
                      activeOpacity={0.7}
                      onPress={() => {
                        playTapSound();
                        onSelectCustomer(cust.id);
                      }}
                      style={[
                        s.customerRow,
                        {
                          backgroundColor: theme.surface.card,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.border.subtle,
                        },
                      ]}
                    >
                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <AppText
                            variant="md"
                            weight="bold"
                            color={theme.text.primary}
                            numberOfLines={1}
                          >
                            {cust.name}
                          </AppText>
                          {isVIP && (
                            <View
                              style={[
                                s.tierPill,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(245, 158, 11, 0.2)'
                                    : 'rgba(245, 158, 11, 0.12)',
                                },
                              ]}
                            >
                              <AppText variant="xxs" weight="bold" color={theme.brand.warning}>
                                VIP
                              </AppText>
                            </View>
                          )}
                        </View>
                        <AppText
                          variant="sm"
                          color={theme.text.muted}
                          tabularNums
                          style={{ marginTop: 2 }}
                        >
                          {cust.phone}
                        </AppText>
                        {cust.notes ? (
                          <AppText
                            variant="xs"
                            color={theme.text.muted}
                            numberOfLines={1}
                            style={{ marginTop: 2 }}
                          >
                            {cust.notes}
                          </AppText>
                        ) : null}
                      </View>

                      {/* Right Debt & Points (Zero Chevron) */}
                      <View style={{ alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                        {hasDebt ? (
                          <View
                            style={[
                              s.debtBadgePill,
                              { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                            ]}
                          >
                            <AppText
                              variant="sm"
                              weight="bold"
                              color={theme.brand.danger}
                              tabularNums
                            >
                              Nợ {formatCurrency(cust.debtBalance)} đ
                            </AppText>
                          </View>
                        ) : (
                          <View
                            style={[
                              s.debtBadgePill,
                              { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                            ]}
                          >
                            <AppText variant="xs" weight="medium" color={theme.brand.success}>
                              Hết nợ
                            </AppText>
                          </View>
                        )}
                        <AppText variant="xs" color={theme.text.muted} tabularNums>
                          {formatCurrency(cust.rewardPoints)} điểm
                        </AppText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* List Footer Summary (Phẳng Liền Mạch) */}
            {filteredCustomers.length > 0 && (
              <View
                style={[
                  s.listFooterSummary,
                  {
                    backgroundColor: theme.surface.card,
                    borderTopColor: theme.border.subtle,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <AppText variant="xs" color={theme.text.muted} tabularNums>
                  {filteredCustomers.length} khách · {debtCustomerCount} khách nợ ({formatCurrency(totalDebt)} đ)
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onOpenAddModal}
                  style={[
                    s.footerAddBtn,
                    { borderColor: theme.border.subtle, backgroundColor: theme.surface.header },
                  ]}
                >
                  <Icon name="plus" size={14} color={theme.brand.primary} />
                  <AppText variant="sm" weight="medium" color={theme.brand.primary}>
                    Thêm Khách
                  </AppText>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 🌟 TAB 2: SỔ GHI NỢ F&B CHUYÊN SÂU                                         */}
      {/* ========================================================================= */}
      {mainTab === 'debt_ledger' && (
        <View style={{ flex: 1 }}>
          {/* 1. DÃY 2: CHIP CẤP 2 (CAPSULE PILLS 36PX) - NẰM NGAY DƯỚI TAB 1 */}
          <View
            style={[
              s.tier2Bar,
              {
                backgroundColor: theme.surface.card,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.tier2Scroll}
            >
              {(
                [
                  { key: 'all' as DebtFilterTab, label: `Khách Ghi Nợ (${debtCustomers.length})` },
                  { key: 'orders' as DebtFilterTab, label: `Hóa Đơn Chưa Thu (${debtOrders.length})` },
                ] as const
              ).map((tab) => {
                const isActive = debtFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    activeOpacity={0.75}
                    onPress={() => {
                      playTapSound();
                      setDebtFilter(tab.key);
                    }}
                    style={[
                      s.filterChip,
                      {
                        backgroundColor: isActive
                          ? theme.brand.primary
                          : isDark
                          ? theme.surface.header
                          : theme.surface.app,
                        borderColor: isActive ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="sm"
                      weight={isActive ? 'medium' : 'normal'}
                      color={isActive ? theme.text.onBrand : theme.text.primary}
                      tabularNums
                    >
                      {tab.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 2. DÃI 3 CON SỐ VÀNG KPI GHI NỢ (100% PHẲNG FULL-BLEED) */}
          <View
            style={[
              s.kpiRibbon,
              {
                backgroundColor: theme.surface.card,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={s.kpiCol}>
              <AppText variant="xs" weight="bold" color={theme.brand.danger} numberOfLines={1}>
                TỔNG CÔNG NỢ
              </AppText>
              <AppText
                variant="md"
                weight="bold"
                color={theme.brand.danger}
                tabularNums
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {formatCurrency(totalDebt)} đ
              </AppText>
            </View>

            <View style={[s.kpiDivider, { backgroundColor: theme.border.subtle }]} />

            <View style={s.kpiCol}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} numberOfLines={1}>
                KHÁCH GHI NỢ
              </AppText>
              <AppText
                variant="md"
                weight="bold"
                color={theme.text.primary}
                tabularNums
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {debtCustomers.length} khách
              </AppText>
            </View>

            <View style={[s.kpiDivider, { backgroundColor: theme.border.subtle }]} />

            <View style={s.kpiCol}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} numberOfLines={1}>
                HÓA ĐƠN CHƯA THU
              </AppText>
              <AppText
                variant="md"
                weight="bold"
                color={theme.text.primary}
                tabularNums
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {debtOrders.length} đơn
              </AppText>
            </View>
          </View>

          {/* 3. DANH SÁCH DE-BOXED */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              s.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {debtFilter === 'all' && (
              <>
                {debtCustomers.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Icon name="check-decagram" size={44} color={theme.brand.success} />
                    <AppText
                      variant="md"
                      weight="medium"
                      color={theme.brand.success}
                      style={{ marginTop: 10 }}
                    >
                      Tuyệt vời! Không có khách nào nợ tiền
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>
                      Tất cả hóa đơn đã được thanh toán sòng phẳng
                    </AppText>
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    {debtCustomers.map((cust) => (
                      <View
                        key={cust.id}
                        style={[
                          s.debtRowItem,
                          {
                            backgroundColor: theme.surface.card,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: theme.border.subtle,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText variant="md" weight="bold" color={theme.text.primary}>
                              {cust.name}
                            </AppText>
                            {cust.name.includes('VIP') && (
                              <View style={[s.tierPill, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                <AppText variant="xxs" weight="bold" color={theme.brand.warning}>
                                  VIP
                                </AppText>
                              </View>
                            )}
                          </View>
                          <AppText
                            variant="sm"
                            color={theme.text.muted}
                            tabularNums
                            style={{ marginTop: 2 }}
                          >
                            {cust.phone}
                          </AppText>
                          {cust.notes ? (
                            <AppText
                              variant="xs"
                              color={theme.text.muted}
                              numberOfLines={1}
                              style={{ marginTop: 2 }}
                            >
                              {cust.notes}
                            </AppText>
                          ) : null}
                          <AppText
                            variant="md"
                            weight="bold"
                            color={theme.brand.danger}
                            tabularNums
                            style={{ marginTop: 4 }}
                          >
                            Nợ: {formatCurrency(cust.debtBalance)} đ
                          </AppText>
                        </View>

                        {/* Action buttons: Gọi + Thu nợ */}
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => onCallPhone(cust.phone)}
                            style={[
                              s.miniActionBtn,
                              {
                                backgroundColor: theme.surface.header,
                                borderColor: theme.border.subtle,
                              },
                            ]}
                          >
                            <Icon name="phone" size={16} color={theme.text.primary} />
                            <AppText variant="sm" weight="medium" color={theme.text.primary}>
                              Gọi
                            </AppText>
                          </TouchableOpacity>

                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => onSettle(cust)}
                            style={[s.miniActionBtn, { backgroundColor: theme.brand.accent }]}
                          >
                            <Icon name="cash-check" size={16} color={theme.text.onBrand} />
                            <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                              Thu Nợ
                            </AppText>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {debtFilter === 'orders' && (
              <>
                {debtOrders.length === 0 ? (
                  <View style={s.emptyBox}>
                    <Icon name="check-decagram" size={44} color={theme.brand.success} />
                    <AppText
                      variant="md"
                      weight="medium"
                      color={theme.brand.success}
                      style={{ marginTop: 10 }}
                    >
                      Không có hóa đơn ghi nợ tồn đọng
                    </AppText>
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    {debtOrders.map((order) => (
                      <View
                        key={order.id}
                        style={[
                          s.debtRowItem,
                          {
                            backgroundColor: theme.surface.card,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: theme.border.subtle,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText
                              variant="md"
                              weight="bold"
                              color={theme.text.primary}
                              tabularNums
                            >
                              {order.orderCode}
                            </AppText>
                            <AppText variant="sm" color={theme.text.muted}>
                              • {order.tableName}
                            </AppText>
                          </View>
                          <AppText
                            variant="sm"
                            color={theme.text.muted}
                            tabularNums
                            style={{ marginTop: 2 }}
                          >
                            {order.paymentDetails?.customerName || 'Khách'} (
                            {order.paymentDetails?.customerPhone || 'N/A'})
                          </AppText>
                          <AppText
                            variant="md"
                            color={theme.brand.danger}
                            weight="bold"
                            tabularNums
                            style={{ marginTop: 4 }}
                          >
                            Nợ: {formatCurrency(order.debtAmount || order.finalTotal)} đ
                          </AppText>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => onPreviewBill(order)}
                          style={[
                            s.miniBillBtn,
                            {
                              borderColor: theme.border.subtle,
                              backgroundColor: theme.surface.header,
                            },
                          ]}
                        >
                          <AppText variant="sm" weight="medium" color={theme.text.primary}>
                            Xem bill
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Hướng Dẫn Thu Nợ Phẳng Liền Mạch */}
            <View
              style={[
                s.guideRibbon,
                {
                  backgroundColor: isDark ? theme.surface.header : theme.surface.app,
                  borderTopColor: theme.border.subtle,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  marginTop: 16,
                },
              ]}
            >
              <AppText variant="xs" weight="bold" color={theme.text.primary}>
                QUY TRÌNH THU HỒI NỢ 1-CHẠM:
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>
                • Bấm <AppText variant="xs" weight="bold" color={theme.text.primary}>Gọi</AppText> để tự động mở bàn phím điện thoại nhắc nợ nhanh
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                • Bấm <AppText variant="xs" weight="bold" color={theme.brand.accent}>Thu Nợ</AppText> để tạo mã VietQR động hoặc gạch nợ vào Sổ Quỹ
              </AppText>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 🌟 TAB 3: TÍCH ĐIỂM VIP & KHÁCH THÂN THIẾT                                */}
      {/* ========================================================================= */}
      {mainTab === 'loyalty_vip' && (
        <View style={{ flex: 1 }}>
          {/* 1. DÃY 2: CHIP CẤP 2 (CAPSULE PILLS 36PX) - NẰM NGAY DƯỚI TAB 1 */}
          <View
            style={[
              s.tier2Bar,
              {
                backgroundColor: theme.surface.card,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.tier2Scroll}
            >
              {(
                [
                  { key: 'all' as LoyaltyFilterTab, label: `Tất Cả (${customers.length})` },
                  { key: 'vip' as LoyaltyFilterTab, label: `VIP (${vipCustomers.length})` },
                  { key: 'regular' as LoyaltyFilterTab, label: `Thân Thiết (${regularCustomers.length})` },
                  { key: 'new' as LoyaltyFilterTab, label: `Mới (${newCustomers.length})` },
                ] as const
              ).map((tab) => {
                const isActive = loyaltyFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    activeOpacity={0.75}
                    onPress={() => {
                      playTapSound();
                      setLoyaltyFilter(tab.key);
                    }}
                    style={[
                      s.filterChip,
                      {
                        backgroundColor: isActive
                          ? theme.brand.primary
                          : isDark
                          ? theme.surface.header
                          : theme.surface.app,
                        borderColor: isActive ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="sm"
                      weight={isActive ? 'medium' : 'normal'}
                      color={isActive ? theme.text.onBrand : theme.text.primary}
                      tabularNums
                    >
                      {tab.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 2. DÃI 3 CON SỐ VÀNG KPI TÍCH ĐIỂM (100% PHẲNG FULL-BLEED) */}
          <View
            style={[
              s.kpiRibbon,
              {
                backgroundColor: theme.surface.card,
                borderBottomColor: theme.border.subtle,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={s.kpiCol}>
              <AppText variant="xs" weight="bold" color={theme.brand.accent} numberOfLines={1}>
                ĐIỂM LƯU HÀNH
              </AppText>
              <AppText
                variant="md"
                weight="bold"
                color={theme.brand.accent}
                tabularNums
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {formatCurrency(totalPoints)} điểm
              </AppText>
            </View>

            <View style={[s.kpiDivider, { backgroundColor: theme.border.subtle }]} />

            <View style={s.kpiCol}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} numberOfLines={1}>
                KHÁCH CÓ ĐIỂM
              </AppText>
              <AppText
                variant="md"
                weight="bold"
                color={theme.text.primary}
                tabularNums
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {activePointsCount} khách
              </AppText>
            </View>

            <View style={[s.kpiDivider, { backgroundColor: theme.border.subtle }]} />

            <View style={s.kpiCol}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} numberOfLines={1}>
                DOANH THU VIP
              </AppText>
              <AppText
                variant="md"
                weight="bold"
                color={theme.brand.primary}
                tabularNums
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {formatCurrency(vipTotalSpend)} đ
              </AppText>
            </View>
          </View>

          {/* 3. BẢNG XẾP HẠNG & DANH SÁCH DẠNG LIST ĐỒNG BỘ */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              s.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Thẻ Chính Sách Tích Điểm Phẳng Liền Mạch */}
            <View
              style={[
                s.policyRibbon,
                {
                  backgroundColor: isDark ? theme.surface.header : theme.surface.app,
                  borderBottomColor: theme.border.subtle,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                QUY TẮC:
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ marginLeft: 6, flex: 1 }} numberOfLines={1}>
                Tích lũy 1% hóa đơn (1.000 đ = 1 điểm). Giảm trừ trực tiếp khi thanh toán.
              </AppText>
            </View>

            <View style={{ width: '100%' }}>
              {filteredLoyaltyCustomers.map((cust, idx) => {
                const isRank1 = idx === 0;
                const isRank2 = idx === 1;
                const isRank3 = idx === 2;
                const isTop3 = isRank1 || isRank2 || isRank3;

                const isVIP =
                  (cust.rewardPoints || 0) >= 5000 ||
                  (cust.totalSpend || 0) >= 5000000 ||
                  cust.name.includes('VIP');
                const isRegular =
                  !isVIP &&
                  ((cust.rewardPoints || 0) >= 2000 || (cust.totalSpend || 0) >= 2000000);

                return (
                  <TouchableOpacity
                    key={cust.id}
                    activeOpacity={0.7}
                    onPress={() => onSelectCustomer(cust.id)}
                    style={[
                      s.customerRow,
                      {
                        backgroundColor: theme.surface.card,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border.subtle,
                      },
                    ]}
                  >
                    {/* Rank Badge List Style */}
                    <View
                      style={[
                        s.rankBadge,
                        {
                          backgroundColor: isRank1
                            ? theme.brand.warning
                            : isRank2
                            ? theme.text.muted
                            : isRank3
                            ? theme.brand.accent
                            : theme.surface.header,
                        },
                      ]}
                    >
                      <AppText
                        variant="sm"
                        weight="bold"
                        color={
                          isRank1
                            ? theme.surface.app
                            : isTop3
                            ? theme.text.onBrand
                            : theme.text.muted
                        }
                        tabularNums
                      >
                        #{idx + 1}
                      </AppText>
                    </View>

                    {/* Customer Info */}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText
                          variant="md"
                          weight="bold"
                          color={theme.text.primary}
                          numberOfLines={1}
                        >
                          {cust.name}
                        </AppText>

                        {isVIP ? (
                          <View
                            style={[
                              s.tierPill,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(245, 158, 11, 0.2)'
                                  : 'rgba(245, 158, 11, 0.12)',
                              },
                            ]}
                          >
                            <AppText variant="xxs" weight="bold" color={theme.brand.warning}>
                              VIP
                            </AppText>
                          </View>
                        ) : isRegular ? (
                          <View
                            style={[
                              s.tierPill,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(59, 130, 246, 0.2)'
                                  : 'rgba(59, 130, 246, 0.12)',
                              },
                            ]}
                          >
                            <AppText variant="xxs" weight="bold" color={theme.brand.primary}>
                              Thân Thiết
                            </AppText>
                          </View>
                        ) : (
                          <View style={[s.tierPill, { backgroundColor: theme.surface.header }]}>
                            <AppText variant="xxs" weight="medium" color={theme.text.muted}>
                              Mới
                            </AppText>
                          </View>
                        )}
                      </View>
                      <AppText
                        variant="sm"
                        color={theme.text.muted}
                        tabularNums
                        style={{ marginTop: 2 }}
                      >
                        {cust.phone}
                      </AppText>
                    </View>

                    {/* Right Points & Spend */}
                    <View style={{ alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                      <AppText
                        variant="md"
                        weight="bold"
                        color={theme.brand.accent}
                        tabularNums
                      >
                        {formatCurrency(cust.rewardPoints || 0)} điểm
                      </AppText>
                      <AppText variant="xs" color={theme.text.muted} tabularNums>
                        Chi tiêu: {formatCurrency(cust.totalSpend || 0)} đ
                      </AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  tier2Bar: {
    paddingVertical: 8,
  },
  tier2Scroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchChip: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    width: 170,
  },
  searchChipInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingVertical: 0,
  },
  kpiRibbon: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  kpiDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  scrollContent: {
    padding: 0,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
  },
  debtRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
  },
  debtBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  guideRibbon: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  miniActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  miniBillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listFooterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  footerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});