import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform, BackHandler, Linking } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';
import { AppText, AppHeader, useAppToast, Tier1Tabs } from '../../lib/components/ui';
import {
  useCustomers,
  useOrderHistory,
  useStoreSettings,
  usePOSActions,
  CustomerLoyalty,
  OrderHistoryItem,
} from '../../lib/store/usePOSStore';
import { formatCurrency } from '../../lib/utils/format';
import { playTapSound } from '../../lib/utils/sound';
import { removeVietnameseDiacritics } from '../../lib/utils/vietnameseSearch';
import { ReceiptPreviewModal } from '../../lib/components/pos/ReceiptPreviewModal';
import { CustomerListView, FilterTab } from './_components/CustomerListView';
import { CustomerDetailView } from './_components/CustomerDetailView';
import { SettleDebtModal } from './_components/SettleDebtModal';
import { CustomerFormModal } from './_components/CustomerFormModal';

const CUSTOMER_TABS = [
  { id: 'list' as const, label: 'Danh Sách', icon: 'account-group-outline' },
  { id: 'debt_ledger' as const, label: 'Sổ Ghi Nợ', icon: 'book-open-outline' },
  { id: 'loyalty_vip' as const, label: 'Tích Điểm VIP', icon: 'crown-outline' },
];

export default function KhachHangScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { showToast } = useAppToast();

  const customers = useCustomers();
  const orderHistory = useOrderHistory();
  const storeSettings = useStoreSettings();
  const { addCustomer, updateCustomer, settleCustomerDebt } = usePOSActions();

  // Navigation & Search State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<'list' | 'debt_ledger' | 'loyalty_vip'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerLoyalty | null>(null);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleTargetOrder, setSettleTargetOrder] = useState<OrderHistoryItem | null>(null);
  const [previewOrder, setPreviewOrder] = useState<OrderHistoryItem | null>(null);

  // Selected Customer Object
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  // Android hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      if (selectedCustomerId) {
        setSelectedCustomerId(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedCustomerId]);

  // KPI Calculations
  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + (c.debtBalance || 0), 0), [customers]);
  const totalPoints = useMemo(() => customers.reduce((sum, c) => sum + (c.rewardPoints || 0), 0), [customers]);
  const debtCustomerCount = useMemo(() => customers.filter((c) => (c.debtBalance || 0) > 0).length, [customers]);
  const vipCustomerCount = useMemo(
    () => customers.filter((c) => (c.rewardPoints || 0) >= 10000 || c.name.includes('VIP')).length,
    [customers]
  );

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterTab === 'debt' && (c.debtBalance || 0) <= 0) return false;
      if (filterTab === 'vip' && (c.rewardPoints || 0) < 10000 && !c.name.includes('VIP')) return false;
      if (!searchQuery.trim()) return true;

      const cleanSearch = removeVietnameseDiacritics(searchQuery.trim().toLowerCase());
      const cleanName = removeVietnameseDiacritics(c.name.toLowerCase());
      const cleanPhone = c.phone.replace(/[^0-9]/g, '');
      return cleanName.includes(cleanSearch) || cleanPhone.includes(cleanSearch);
    });
  }, [customers, filterTab, searchQuery]);

  // Selected customer purchase & debt history
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orderHistory.filter((order) => {
      const orderPhone = order.paymentDetails?.customerPhone?.replace(/[^0-9]/g, '');
      const custPhone = selectedCustomer.phone.replace(/[^0-9]/g, '');
      return orderPhone && orderPhone === custPhone;
    });
  }, [orderHistory, selectedCustomer]);

  // 1-Chạm Quay Số
  const handleCallPhone = useCallback(
    (phone: string) => {
      playTapSound();
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch {}
      }
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      if (!cleanPhone) {
        showToast({ title: 'Thiếu SĐT', message: 'Khách hàng chưa có SĐT', type: 'danger' });
        return;
      }
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        showToast({ title: 'Không Thể Gọi', message: `Không thể quay số ${cleanPhone}`, type: 'warning' });
      });
    },
    [showToast]
  );

  // 1-Chạm Mở POS Cho Khách
  const handleCreateOrderForCustomer = useCallback(
    (customer: CustomerLoyalty) => {
      playTapSound();
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      showToast({
        title: 'Bán Hàng POS',
        message: `Mở POS cho ${customer.name}`,
        type: 'success',
      });
      router.push('/');
    },
    [router, showToast]
  );

  // Mở modal thu nợ
  const handleOpenSettle = useCallback(
    (cust?: CustomerLoyalty, order?: OrderHistoryItem) => {
      const targetCust = cust || selectedCustomer;
      if (!targetCust) return;
      playTapSound();
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
      }
      if (cust && (!selectedCustomer || selectedCustomer.id !== cust.id)) {
        setSelectedCustomerId(cust.id);
      }
      setSettleTargetOrder(order || null);
      setShowSettleModal(true);
    },
    [selectedCustomer]
  );

  // Xác nhận thu nợ
  const handleConfirmSettle = useCallback(
    (amount: number, method: 'tien_mat' | 'vietqr', note?: string, orderId?: string) => {
      if (!selectedCustomer) return;
      if (amount <= 0) {
        showToast({ title: 'Số Tiền Lỗi', message: 'Nhập số tiền lớn hơn 0', type: 'danger' });
        return;
      }
      playTapSound();
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      settleCustomerDebt(selectedCustomer.id, amount, method, note, orderId);
      setShowSettleModal(false);
      showToast({
        title: 'Đã Thu Nợ',
        message: `Đã thu ${formatCurrency(amount)} đ (${method === 'tien_mat' ? 'Tiền mặt vào sổ quỹ' : 'VietQR'})`,
        type: 'success',
      });
    },
    [selectedCustomer, settleCustomerDebt, showToast]
  );

  // Mở modal thêm/sửa khách
  const handleOpenForm = useCallback((cust?: CustomerLoyalty) => {
    playTapSound();
    setEditingCustomer(cust || null);
    setShowAddModal(true);
  }, []);

  // Lưu khách hàng
  const handleSaveCustomer = useCallback(
    (data: { name: string; phone: string; notes?: string; debtBalance: number }) => {
      const cleanPhone = data.phone.trim().replace(/[^0-9]/g, '');
      const cleanName = data.name.trim();
      if (!cleanName) {
        showToast({ title: 'Thiếu Tên', message: 'Nhập họ tên khách hàng', type: 'danger' });
        return;
      }
      if (!cleanPhone || cleanPhone.length < 9) {
        showToast({ title: 'Thiếu SĐT', message: 'Nhập số điện thoại hợp lệ (>= 9 số)', type: 'danger' });
        return;
      }

      playTapSound();
      if (editingCustomer) {
        updateCustomer(editingCustomer.id, {
          name: cleanName,
          phone: cleanPhone,
          notes: data.notes?.trim() || undefined,
          debtBalance: data.debtBalance,
        });
        showToast({ title: 'Đã Cập Nhật', message: `Thông tin ${cleanName} đã lưu`, type: 'success' });
      } else {
        const existing = customers.find((c) => c.phone === cleanPhone);
        if (existing) {
          showToast({ title: 'Trùng SĐT', message: `SĐT đã thuộc về ${existing.name}`, type: 'danger' });
          return;
        }
        addCustomer({
          name: cleanName,
          phone: cleanPhone,
          rewardPoints: 0,
          totalSpend: 0,
          debtBalance: data.debtBalance,
          notes: data.notes?.trim() || undefined,
        });
        showToast({ title: 'Đã Thêm Mới', message: `Đã thêm ${cleanName}`, type: 'success' });
      }
      setShowAddModal(false);
    },
    [editingCustomer, customers, addCustomer, updateCustomer, showToast]
  );

  return (
    <View style={[s.container, { backgroundColor: theme.surface.card }]}>
      {/* 1. Header Chuẩn 100% */}
      <AppHeader
        showBack={Boolean(selectedCustomerId)}
        onBack={() => {
          playTapSound();
          setSelectedCustomerId(null);
        }}
        title={selectedCustomer ? 'Hồ Sơ Khách Hàng' : 'Khách Hàng'}
        subtitle={
          selectedCustomer
            ? selectedCustomer.name
            : `${customers.length} khách · ${formatCurrency(totalDebt)} đ nợ`
        }
        rightCustom={
          selectedCustomer ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleOpenForm(selectedCustomer)}
              style={[
                s.headerEditBtn,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.subtle,
                  borderWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Icon name="pencil-outline" size={15} color={theme.text.primary} />
              <AppText variant="sm" weight="medium" color={theme.text.primary}>
                Sửa
              </AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleOpenForm()}
              style={[s.headerAddBtn, { backgroundColor: theme.brand.primary }]}
            >
              <Icon name="account-plus" size={16} color={theme.text.onBrand} />
              <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                + Khách
              </AppText>
            </TouchableOpacity>
          )
        }
      />

      {/* 2. Điều phối giao diện (Direct Inline Sub-Screen Render, Zero Modal) */}
      {selectedCustomer ? (
        <CustomerDetailView
          customer={selectedCustomer}
          orders={customerOrders}
          onBack={() => setSelectedCustomerId(null)}
          onEdit={() => handleOpenForm(selectedCustomer)}
          onSettle={(order) => handleOpenSettle(selectedCustomer, order)}
          onCallPhone={handleCallPhone}
          onCreateOrder={handleCreateOrderForCustomer}
          onPreviewBill={setPreviewOrder}
        />
      ) : (
        <>
          {/* 🌟 DÃY 1: TAB CẤP 1 (Underline Tabs - Chiều cao 46px chuẩn Invariant 3.13) */}
          <Tier1Tabs
            tabs={[
              { id: 'list' as const, label: 'Danh Sách', icon: 'account-group-outline', badge: customers.length },
              { id: 'debt_ledger' as const, label: 'Sổ Ghi Nợ', icon: 'book-open-outline', badge: debtCustomerCount > 0 ? debtCustomerCount : undefined },
              { id: 'loyalty_vip' as const, label: 'Tích Điểm VIP', icon: 'crown-outline', badge: vipCustomerCount > 0 ? vipCustomerCount : undefined },
            ]}
            activeTab={mainTab}
            onTabChange={(tabId) => setMainTab(tabId as any)}
            backgroundColor={theme.status.warningBg}
          />

          {/* Main Content */}
          <CustomerListView
            mainTab={mainTab}
            customers={customers}
            filteredCustomers={filteredCustomers}
            orderHistory={orderHistory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterTab={filterTab}
            onFilterChange={setFilterTab}
            totalDebt={totalDebt}
            totalPoints={totalPoints}
            debtCustomerCount={debtCustomerCount}
            vipCustomerCount={vipCustomerCount}
            onSelectCustomer={setSelectedCustomerId}
            onOpenAddModal={() => handleOpenForm()}
            onSettle={handleOpenSettle}
            onCallPhone={handleCallPhone}
            onCreateOrder={handleCreateOrderForCustomer}
            onPreviewBill={setPreviewOrder}
          />
        </>
      )}

      {/* 3. Modal Gạch Nợ */}
      <SettleDebtModal
        visible={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        customer={selectedCustomer}
        targetOrder={settleTargetOrder}
        storeSettings={storeSettings}
        onConfirm={handleConfirmSettle}
      />

      {/* 4. Modal Thêm / Sửa Khách */}
      <CustomerFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        editingCustomer={editingCustomer}
        onSave={handleSaveCustomer}
      />

      {/* 5. Preview Hóa Đơn */}
      {previewOrder && (
        <ReceiptPreviewModal
          visible={Boolean(previewOrder)}
          order={previewOrder}
          onClose={() => setPreviewOrder(null)}
          onPrintAgain={() => {
            showToast({ title: 'Đang In Bill', message: `In bill ${previewOrder.orderCode}`, type: 'info' });
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
