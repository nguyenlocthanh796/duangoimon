import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { AppText } from '../../lib/components/ui/AppText';
import { formatCurrency } from '../../lib/utils/format';
import { usePOSStore } from '../../lib/store/usePOSStore';
import { getBaseUrl, getPublicBillUrl } from '../../lib/api/apiClient';

const copyToClipboard = async (text: string): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
  }
  return false;
};

export default function PublicBillScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [billData, setBillData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const localOrders = usePOSStore((s) => s.orderHistory);
  const storeSettings = usePOSStore((s) => s.storeSettings);

  useEffect(() => {
    if (!code) {
      setErrorMsg('Thiếu mã hóa đơn tra cứu');
      setLoading(false);
      return;
    }

    const cleanCode = String(code).trim();

    // 1. Thử tìm trong API Backend
    const fetchBillFromAPI = async () => {
      try {
        const baseUrl = getBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/public/bills/${encodeURIComponent(cleanCode)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setBillData(json.data);
            setLoading(false);
            return;
          }
        }
      } catch (_) {}

      // 2. Fallback tìm trong Local Store nếu API không có hoặc đang chạy offline
      const foundLocal = localOrders.find(
        (o) =>
          o.orderCode?.toLowerCase() === cleanCode.toLowerCase() ||
          o.id?.toLowerCase() === cleanCode.toLowerCase()
      );

      if (foundLocal) {
        setBillData({
          order_code: foundLocal.orderCode,
          store_name: storeSettings.storeName || 'OngChu POS F&B',
          store_address: storeSettings.address || 'Việt Nam',
          store_phone: storeSettings.phone || '1900 6868',
          wifi_name: storeSettings.wifiName || '',
          wifi_password: storeSettings.wifiPassword || '',
          slogan: storeSettings.slogan || 'Cảm ơn Quý khách & Hẹn gặp lại!',
          table_name: foundLocal.tableName || 'Tại quầy / Mang về',
          cashier_name: 'Thu Ngân',
          customer_name: foundLocal.paymentDetails?.customerName || '',
          order_type: 'dine_in',
          status: foundLocal.isDebtPaid ? 'paid' : 'paid',
          status_text: 'Đã thanh toán',
          subtotal: foundLocal.subtotal || foundLocal.finalTotal,
          discount_amount: foundLocal.discountAmount || 0,
          total_amount: foundLocal.finalTotal || 0,
          payment_method: foundLocal.paymentMethod || 'vietqr',
          paid_amount: foundLocal.paidAmount || foundLocal.finalTotal || 0,
          change_amount: foundLocal.changeAmount || 0,
          created_at: new Date(foundLocal.createdAt).toLocaleString('vi-VN'),
          items: (foundLocal.items || []).map((it: any) => ({
            product_name: it.item?.name || it.name || 'Món ăn/đồ uống',
            unit_price: it.unitPrice || it.price || 0,
            quantity: it.qty || 1,
            total_price: (it.unitPrice || it.price || 0) * (it.qty || 1),
            selected_size: it.selectedSize,
            modifier_names: it.note,
            note: it.note,
          })),
        });
        setLoading(false);
      } else {
        setErrorMsg('Không tìm thấy hóa đơn hoặc mã tra cứu không tồn tại.');
        setLoading(false);
      }
    };

    fetchBillFromAPI();
  }, [code, localOrders, storeSettings]);

  const handleCopyWifi = async () => {
    if (billData?.wifi_password) {
      await copyToClipboard(billData.wifi_password);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2000);
    }
  };

  const handleShareLink = async () => {
    const fallbackCode = String(code || '').trim();
    const url = getPublicBillUrl(billData?.order_code || fallbackCode);
    if (Platform.OS === 'web') {
      await copyToClipboard(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      try {
        await Share.share({
          title: `Hóa đơn ${billData?.order_code} - ${billData?.store_name}`,
          message: `Xem hóa đơn điện tử: ${url}`,
          url,
        });
      } catch (_) {}
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <View style={[s.centerContainer, { backgroundColor: theme.surface.app }]}>
        <ActivityIndicator size="large" color={theme.brand.accent} />
        <AppText variant="md" color={theme.text.muted} style={{ marginTop: 12 }}>
          Đang tải hóa đơn điện tử...
        </AppText>
      </View>
    );
  }

  if (errorMsg || !billData) {
    return (
      <View style={[s.centerContainer, { backgroundColor: theme.surface.app, padding: 24 }]}>
        <View style={[s.errorCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
          <Icon name="receipt-text-remove" size={48} color={theme.brand.danger} style={{ alignSelf: 'center', marginBottom: 12 }} />
          <AppText variant="lg" weight="bold" color={theme.brand.danger} style={{ textAlign: 'center', marginBottom: 8 }}>
            Không Tìm Thấy Hóa Đơn
          </AppText>
          <AppText variant="md" color={theme.text.muted} style={{ textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
            {errorMsg || 'Mã hóa đơn tra cứu không tồn tại hoặc đã hết hạn.'}
          </AppText>
          <TouchableOpacity
            style={[s.btnHome, { backgroundColor: theme.brand.primary }]}
            onPress={() => router.push('/')}
          >
            <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
              Về Trang Chủ POS
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isPaid = billData.status === 'da_thanh_toan' || billData.status === 'paid';
  const isVoided = billData.status === 'da_huy' || billData.status === 'voided';

  return (
    <View style={[s.screenWrapper, { backgroundColor: theme.surface.app }]}>
      <ScrollView
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            s.receiptContainer,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          {/* Header */}
          <View style={[s.headerSection, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="lg" weight="bold" color={theme.text.primary} style={s.centerText}>
              {billData.store_name}
            </AppText>
            {billData.store_address ? (
              <AppText variant="xs" color={theme.text.muted} style={[s.centerText, { marginTop: 4 }]}>
                {billData.store_address}
              </AppText>
            ) : null}
            {billData.store_phone ? (
              <AppText variant="xs" color={theme.brand.accent} style={[s.centerText, { marginTop: 2 }]}>
                Hotline: {billData.store_phone}
              </AppText>
            ) : null}

            <AppText variant="sm" weight="bold" color={theme.brand.accent} style={[s.centerText, { marginTop: 12, letterSpacing: 0.5 }]}>
              HÓA ĐƠN THANH TOÁN
            </AppText>

            {/* Stamp badge */}
            <View style={s.stampWrap}>
              <View
                style={[
                  s.stampBadge,
                  {
                    backgroundColor: isVoided
                      ? theme.status.dangerBg
                      : isPaid
                      ? theme.status.readyBg
                      : theme.status.pendingBg,
                    borderColor: isVoided
                      ? theme.brand.danger
                      : isPaid
                      ? theme.brand.success
                      : theme.brand.accent,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  weight="bold"
                  color={
                    isVoided
                      ? theme.brand.danger
                      : isPaid
                      ? theme.brand.success
                      : theme.brand.accent
                  }
                >
                  {isVoided ? '✕ ĐÃ HỦY ĐƠN' : isPaid ? '✓ ĐÃ THANH TOÁN' : '⏳ CHỜ THANH TOÁN'}
                </AppText>
              </View>
            </View>
          </View>

          {/* Meta Info */}
          <View style={[s.metaSection, { borderBottomColor: theme.border.subtle }]}>
            <View style={s.metaRow}>
              <AppText variant="xs" color={theme.text.muted}>Mã Hóa Đơn:</AppText>
              <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>{billData.order_code}</AppText>
            </View>
            <View style={s.metaRow}>
              <AppText variant="xs" color={theme.text.muted}>Thời Gian:</AppText>
              <AppText variant="xs" color={theme.text.primary} tabularNums>{billData.created_at}</AppText>
            </View>
            <View style={s.metaRow}>
              <AppText variant="xs" color={theme.text.muted}>Khu vực / Bàn:</AppText>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>{billData.table_name}</AppText>
            </View>
            <View style={s.metaRow}>
              <AppText variant="xs" color={theme.text.muted}>Thu Ngân:</AppText>
              <AppText variant="xs" color={theme.text.primary}>{billData.cashier_name}</AppText>
            </View>
          </View>

          {/* Items Table */}
          <View style={s.itemsSection}>
            <View style={[s.tableHead, { borderBottomColor: theme.border.subtle }]}>
              <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ flex: 1 }}>MÓN</AppText>
              <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ width: 36, textAlign: 'center' }}>SL</AppText>
              <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ width: 68, textAlign: 'right' }}>ĐƠN GIÁ</AppText>
              <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ width: 78, textAlign: 'right' }}>T.TIỀN</AppText>
            </View>

            {billData.items?.map((it: any, idx: number) => (
              <View key={idx} style={[s.tableRow, { borderBottomColor: theme.border.subtle }]}>
                <View style={{ flex: 1, paddingRight: 4 }}>
                  <AppText variant="sm" weight="medium" color={theme.text.primary} numberOfLines={2}>
                    {it.product_name}
                  </AppText>
                  {it.selected_size ? (
                    <AppText variant="xxs" color={theme.text.muted}>Size {it.selected_size}</AppText>
                  ) : null}
                  {it.modifier_names ? (
                    <AppText variant="xxs" color={theme.text.muted}>{it.modifier_names}</AppText>
                  ) : null}
                  {it.note ? (
                    <AppText variant="xxs" color={theme.brand.accent}>Ghi chú: {it.note}</AppText>
                  ) : null}
                </View>
                <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums style={{ width: 36, textAlign: 'center' }}>
                  {it.quantity}
                </AppText>
                <AppText variant="xs" color={theme.text.muted} tabularNums style={{ width: 68, textAlign: 'right' }}>
                  {formatCurrency(it.unit_price)}
                </AppText>
                <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums style={{ width: 78, textAlign: 'right' }}>
                  {formatCurrency(it.total_price)}
                </AppText>
              </View>
            ))}
          </View>

          {/* Financial Summary */}
          <View style={[s.summarySection, { borderTopColor: theme.border.subtle }]}>
            <View style={s.metaRow}>
              <AppText variant="xs" color={theme.text.muted}>Tổng tiền hàng:</AppText>
              <AppText variant="xs" weight="medium" color={theme.text.primary} tabularNums>{formatCurrency(billData.subtotal)} đ</AppText>
            </View>

            {billData.discount_amount > 0 && (
              <View style={s.metaRow}>
                <AppText variant="xs" color={theme.brand.danger}>Chiết khấu / Giảm giá:</AppText>
                <AppText variant="xs" weight="bold" color={theme.brand.danger} tabularNums>-{formatCurrency(billData.discount_amount)} đ</AppText>
              </View>
            )}

            <View style={[s.totalBar, { borderColor: theme.text.primary }]}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>TỔNG THANH TOÁN</AppText>
              <AppText variant="xl" weight="bold" color={theme.brand.accent} tabularNums>
                {formatCurrency(billData.total_amount)} đ
              </AppText>
            </View>

            <View style={s.metaRow}>
              <AppText variant="xs" color={theme.text.muted}>Phương thức:</AppText>
              <AppText variant="xs" weight="medium" color={theme.text.primary}>
                {billData.payment_method === 'vietqr' || billData.payment_method === 'chuyen_khoan_vietqr'
                  ? 'Chuyển khoản VietQR'
                  : billData.payment_method === 'the'
                  ? 'Thẻ ngân hàng'
                  : billData.payment_method === 'ghi_no'
                  ? 'Ghi nợ'
                  : 'Tiền mặt'}
              </AppText>
            </View>
          </View>

          {/* Wi-Fi Info Box */}
          {(billData.wifi_name || billData.wifi_password) && (
            <View style={[s.wifiCard, { backgroundColor: theme.surface.app, borderColor: theme.border.subtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Icon name="wifi" size={16} color={theme.brand.accent} style={{ marginRight: 6 }} />
                <AppText variant="xs" weight="bold" color={theme.text.primary}>MẠNG WI-FI MIỄN PHÍ</AppText>
              </View>
              {billData.wifi_name ? (
                <AppText variant="xs" color={theme.text.muted}>Tên: <AppText variant="xs" weight="bold" color={theme.text.primary}>{billData.wifi_name}</AppText></AppText>
              ) : null}
              {billData.wifi_password ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <AppText variant="xs" color={theme.text.muted}>Mật khẩu: <AppText variant="xs" weight="bold" color={theme.text.primary}>{billData.wifi_password}</AppText></AppText>
                  <TouchableOpacity
                    style={[s.btnCopy, { borderColor: theme.border.subtle }]}
                    onPress={handleCopyWifi}
                  >
                    <AppText variant="xxs" weight="bold" color={copiedWifi ? theme.brand.success : theme.brand.accent}>
                      {copiedWifi ? '✓ Đã chép' : 'Sao chép'}
                    </AppText>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          {/* Action Buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: theme.brand.primary }]}
              onPress={handlePrint}
            >
              <Icon name="printer" size={18} color={theme.text.onBrand} style={{ marginRight: 6 }} />
              <AppText variant="sm" weight="bold" color={theme.text.onBrand}>In / Lưu PDF</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: theme.status.pendingBg, borderColor: theme.brand.accent, borderWidth: 1 }]}
              onPress={handleShareLink}
            >
              <Icon name="share-variant" size={18} color={theme.brand.accent} style={{ marginRight: 6 }} />
              <AppText variant="sm" weight="bold" color={theme.brand.accent}>
                {copiedLink ? '✓ Đã chép link' : 'Chia sẻ bill'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Slogan & Powered */}
          <View style={s.footerSection}>
            <AppText variant="xs" color={theme.text.muted} style={s.centerText}>
              {billData.slogan || 'Cảm ơn Quý khách & Hẹn gặp lại!'}
            </AppText>
            <AppText variant="xxs" color={theme.text.muted} style={[s.centerText, { marginTop: 6 }]}>
              Hóa đơn điện tử khởi tạo từ <AppText variant="xxs" weight="bold" color={theme.brand.accent}>OngChu Lean POS</AppText>
            </AppText>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptContainer: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  headerSection: {
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  centerText: {
    textAlign: 'center',
  },
  stampWrap: {
    marginTop: 10,
  },
  stampBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  metaSection: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsSection: {
    paddingVertical: 12,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summarySection: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    gap: 8,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    marginVertical: 4,
  },
  wifiCard: {
    marginTop: 14,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
  },
  btnCopy: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  footerSection: {
    marginTop: 18,
    alignItems: 'center',
  },
  errorCard: {
    maxWidth: 380,
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnHome: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
