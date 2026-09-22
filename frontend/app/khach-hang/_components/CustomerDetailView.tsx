import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText, PressableScale } from '../../../lib/components/ui';
import { CustomerLoyalty, OrderHistoryItem } from '../../../lib/store/usePOSStore';
import { formatCurrency } from '../../../lib/utils/format';
import { playTapSound } from '../../../lib/utils/sound';

export type CustomerOrderDetailFilter = 'all' | 'debt' | 'paid';

interface CustomerDetailViewProps {
  customer: CustomerLoyalty;
  orders: OrderHistoryItem[];
  onBack: () => void;
  onEdit: () => void;
  onSettle: (order?: OrderHistoryItem) => void;
  onCallPhone: (phone: string) => void;
  onCreateOrder: (customer: CustomerLoyalty) => void;
  onPreviewBill: (order: OrderHistoryItem) => void;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customer,
  orders,
  onBack,
  onEdit,
  onSettle,
  onCallPhone,
  onCreateOrder,
  onPreviewBill,
}) => {
  const { theme, isDark } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();

  const [orderFilter, setOrderFilter] = useState<CustomerOrderDetailFilter>('all');

  const hasDebt = (customer.debtBalance || 0) > 0;
  const isVIP =
    (customer.rewardPoints || 0) >= 5000 ||
    (customer.totalSpend || 0) >= 5000000 ||
    customer.name.includes('VIP');
  const isRegular =
    !isVIP &&
    ((customer.rewardPoints || 0) >= 2000 || (customer.totalSpend || 0) >= 2000000);

  // Phân loại đơn nợ và đơn đã thanh toán
  const debtOrders = useMemo(
    () => orders.filter((o) => o.paymentMethod === 'ghi_no' && !o.isDebtPaid),
    [orders]
  );
  const paidOrders = useMemo(
    () => orders.filter((o) => o.paymentMethod !== 'ghi_no' || o.isDebtPaid),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'debt') return debtOrders;
    if (orderFilter === 'paid') return paidOrders;
    return orders;
  }, [orderFilter, orders, debtOrders, paidOrders]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.card }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 76 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================================= */}
        {/* 1. KHỐI THÔNG TIN KHÁCH HÀNG (100% PHẲNG DE-BOXED FULL-BLEED)              */}
        {/* ========================================================================= */}
        <View
          style={[
            s.profileSection,
            {
              backgroundColor: theme.surface.card,
              borderBottomColor: theme.border.subtle,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          {/* Hàng 1: Tên Khách + Tier Badge + Nút Sửa/Gọi Nhanh */}
          <View style={s.profileHeaderRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  {customer.name}
                </AppText>
                {/* Text Badge Phân Hạng (Zero Icon) */}
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

              <AppText variant="sm" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                SĐT: {customer.phone || 'Chưa cập nhật'}
              </AppText>
            </View>

            {/* Cụm nút tác vụ nhanh */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onCallPhone(customer.phone)}
                style={[
                  s.profileActionBtn,
                  { backgroundColor: theme.surface.header, borderColor: theme.border.subtle },
                ]}
              >
                <Icon name="phone" size={16} color={theme.text.primary} />
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  Gọi
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={onEdit}
                style={[
                  s.profileActionBtn,
                  { backgroundColor: theme.surface.header, borderColor: theme.border.subtle },
                ]}
              >
                <Icon name="pencil-outline" size={16} color={theme.text.primary} />
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  Sửa
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Ghi chú sở thích/khẩu vị nếu có */}
          {customer.notes ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
              <Icon name="note-text-outline" size={15} color={theme.text.muted} />
              <AppText variant="xs" color={theme.text.muted} style={{ flex: 1 }}>
                {customer.notes}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* ========================================================================= */}
        {/* 2. 3 CON SỐ VÀNG TÀI CHÍNH KHÁCH HÀNG (100% PHẲNG FULL-BLEED RIBBON)      */}
        {/* ========================================================================= */}
        <View
          style={[
            s.statsRibbon,
            {
              backgroundColor: theme.surface.card,
              borderBottomColor: theme.border.subtle,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          {/* Cột 1: Nợ hiện tại */}
          <View style={s.statsCol}>
            <AppText
              variant="xs"
              weight="medium"
              color={hasDebt ? theme.brand.danger : theme.text.muted}
              numberOfLines={1}
            >
              NỢ HIỆN TẠI
            </AppText>
            <AppText
              variant="md"
              weight="bold"
              color={hasDebt ? theme.brand.danger : theme.brand.success}
              tabularNums
              numberOfLines={1}
              style={{ marginTop: 2 }}
            >
              {formatCurrency(customer.debtBalance)} đ
            </AppText>
          </View>

          <View style={[s.statsDivider, { backgroundColor: theme.border.subtle }]} />

          {/* Cột 2: Điểm tích lũy */}
          <View style={s.statsCol}>
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
              {formatCurrency(customer.rewardPoints)} điểm
            </AppText>
          </View>

          <View style={[s.statsDivider, { backgroundColor: theme.border.subtle }]} />

          {/* Cột 3: Tổng chi tiêu */}
          <View style={s.statsCol}>
            <AppText variant="xs" weight="medium" color={theme.text.muted} numberOfLines={1}>
              TỔNG CHI TIÊU
            </AppText>
            <AppText
              variant="md"
              weight="bold"
              color={theme.text.primary}
              tabularNums
              numberOfLines={1}
              style={{ marginTop: 2 }}
            >
              {formatCurrency(customer.totalSpend)} đ
            </AppText>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* 3. DÃI 2: CHIP LỌC ĐƠN HÀNG (CAPSULE PILLS 36PX)                           */}
        {/* ========================================================================= */}
        <View
          style={[
            s.orderFilterBar,
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
            contentContainerStyle={s.filterScroll}
          >
            {(
              [
                { key: 'all' as CustomerOrderDetailFilter, label: `Tất Cả (${orders.length})` },
                { key: 'debt' as CustomerOrderDetailFilter, label: `Chưa Trả (${debtOrders.length})` },
                { key: 'paid' as CustomerOrderDetailFilter, label: `Đã Trả (${paidOrders.length})` },
              ] as const
            ).map((tab) => {
              const isActive = orderFilter === tab.key;
              const isDebtTab = tab.key === 'debt' && debtOrders.length > 0;

              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.75}
                  onPress={() => {
                    playTapSound();
                    setOrderFilter(tab.key);
                  }}
                  style={[
                    s.filterChip,
                    {
                      backgroundColor: isActive
                        ? isDebtTab
                          ? theme.brand.danger
                          : theme.brand.primary
                        : isDark
                        ? theme.surface.header
                        : theme.surface.app,
                      borderColor: isActive
                        ? isDebtTab
                          ? theme.brand.danger
                          : theme.brand.primary
                        : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={isActive ? 'medium' : 'normal'}
                    color={
                      isActive
                        ? theme.text.onBrand
                        : isDebtTab
                        ? theme.brand.danger
                        : theme.text.primary
                    }
                    tabularNums
                  >
                    {tab.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ========================================================================= */}
        {/* 4. DANH SÁCH HÓA ĐƠN DE-BOXED TRÀN VIỀN                                   */}
        {/* ========================================================================= */}
        {filteredOrders.length === 0 ? (
          <View style={s.emptyBox}>
            <Icon name="receipt-text-outline" size={40} color={theme.text.muted} />
            <AppText
              variant="md"
              weight="medium"
              color={theme.text.primary}
              style={{ marginTop: 10 }}
            >
              {orderFilter === 'debt'
                ? 'Không có hóa đơn ghi nợ tồn đọng'
                : 'Chưa có lịch sử đơn hàng'}
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 4 }}>
              Gán khách vào giỏ hàng POS để bắt đầu ghi nhận doanh thu & tích điểm
            </AppText>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            {filteredOrders.map((order) => {
              const isGhiNo = order.paymentMethod === 'ghi_no';
              const isPaidDebt = order.isDebtPaid;
              const debtAmount = order.debtAmount || order.finalTotal;

              return (
                <View
                  key={order.id}
                  style={[
                    s.orderRow,
                    {
                      backgroundColor: theme.surface.card,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border.subtle,
                    },
                  ]}
                >
                  {/* Cột trái: Thông tin đơn & Thời gian */}
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                        {order.orderCode}
                      </AppText>
                      <AppText variant="sm" color={theme.text.muted}>
                        • {order.tableName}
                      </AppText>
                    </View>

                    <AppText
                      variant="xs"
                      color={theme.text.muted}
                      tabularNums
                      style={{ marginTop: 2 }}
                    >
                      {new Date(order.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </AppText>

                    {/* Badge trạng thái thanh toán */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      {isGhiNo ? (
                        isPaidDebt ? (
                          <View
                            style={[
                              s.statusTag,
                              { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                            ]}
                          >
                            <AppText variant="xxs" weight="bold" color={theme.brand.success}>
                              ĐÃ TRẢ HẾT
                            </AppText>
                          </View>
                        ) : (
                          <View
                            style={[
                              s.statusTag,
                              { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                            ]}
                          >
                            <AppText
                              variant="xxs"
                              weight="bold"
                              color={theme.brand.danger}
                              tabularNums
                            >
                              NỢ: {formatCurrency(debtAmount)} đ
                            </AppText>
                          </View>
                        )
                      ) : (
                        <View style={[s.statusTag, { backgroundColor: theme.surface.header }]}>
                          <AppText variant="xxs" weight="medium" color={theme.text.muted}>
                            {order.paymentMethod === 'tien_mat'
                              ? 'Tiền mặt'
                              : order.paymentMethod === 'vietqr'
                              ? 'VietQR'
                              : 'Thẻ'}
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Cột phải: Tổng tiền & Tác vụ Bill */}
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <AppText
                      variant="md"
                      weight="bold"
                      color={isGhiNo && !isPaidDebt ? theme.brand.danger : theme.text.primary}
                      tabularNums
                    >
                      {formatCurrency(order.finalTotal)} đ
                    </AppText>

                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {isGhiNo && !isPaidDebt && (
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => onSettle(order)}
                          style={[
                            s.miniActionBtn,
                            {
                              backgroundColor: `${theme.brand.accent}15`,
                              borderColor: theme.brand.accent,
                            },
                          ]}
                        >
                          <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                            Thu nợ
                          </AppText>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          playTapSound();
                          onPreviewBill(order);
                        }}
                        style={[
                          s.miniActionBtn,
                          {
                            backgroundColor: theme.surface.header,
                            borderColor: theme.border.subtle,
                          },
                        ]}
                      >
                        <AppText variant="xs" weight="medium" color={theme.text.primary}>
                          Xem bill
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* 5. THANH TÁC VỤ CỐ ĐỊNH ĐÁY 48PX (INVARIANT 3.4 BOTTOM DOCK)               */}
      {/* ========================================================================= */}
      <View
        style={[
          s.bottomDock,
          {
            backgroundColor: theme.surface.card,
            borderTopColor: theme.border.subtle,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingBottom:
              (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4,
          },
        ]}
      >
        <View style={s.dockInner}>
          {/* Nút Quay Lại */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              onBack();
            }}
            style={[
              s.dockBackBtn,
              { borderColor: theme.border.subtle, backgroundColor: theme.surface.header },
            ]}
          >
            <Icon name="arrow-left" size={18} color={theme.text.primary} />
            <AppText variant="md" weight="medium" color={theme.text.primary}>
              Quay Lại
            </AppText>
          </TouchableOpacity>

          {/* Nút Cam Apple Action Thread */}
          {hasDebt ? (
            <PressableScale
              activeScale={0.97}
              playSound
              onPress={() => onSettle()}
              style={[s.dockMainBtn, { backgroundColor: theme.brand.accent }]}
            >
              <Icon name="cash-check" size={18} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
                Thu Nợ ({formatCurrency(customer.debtBalance)} đ)
              </AppText>
            </PressableScale>
          ) : (
            <PressableScale
              activeScale={0.97}
              playSound
              onPress={() => onCreateOrder(customer)}
              style={[s.dockMainBtn, { backgroundColor: theme.brand.accent }]}
            >
              <Icon name="cart-plus" size={18} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                Bán Hàng POS
              </AppText>
            </PressableScale>
          )}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  scrollContent: {
    padding: 0,
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  profileActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
  },
  statsRibbon: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statsCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  statsDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  orderFilterBar: {
    paddingVertical: 8,
  },
  filterScroll: {
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
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 68,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  dockInner: {
    flexDirection: 'row',
    gap: 10,
  },
  dockBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dockMainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 8,
  },
});
