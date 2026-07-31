import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, palette } from '../../lib/theme/colors';
import { font } from '../../lib/theme/typography';
import { shape } from '../../lib/theme/shape';
import { formatPrice, formatPriceFull } from '../../lib/utils/format';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { usePayment, PAY_METHODS, QUICK_AMOUNTS, getSmartCashSuggestions } from '../../lib/hooks/usePayment';
import { useToast } from '../../lib/context/ToastContext';
import Numpad from '../../lib/components/payment/Numpad';
import PaymentSuccessScreen from '../../lib/components/payment/PaymentSuccessScreen';
import { generateReceiptHTML } from '../../lib/components/payment/receipt';
import SplitBillToggle from '../../lib/components/payment/SplitBillToggle';
import OrderItemsList from '../../lib/components/payment/OrderItemsList';
import UnifiedHeader from '../../lib/components/ui/UnifiedHeader';
import FlatCard from '../../lib/components/ui/FlatCard';
import AppText from '../../lib/components/ui/AppText';
import PillButton from '../../lib/components/ui/PillButton';

export default function PaymentScreen() {
  const {
    tableId,
    tableName,
    total: totalStr,
    orderId,
  } = useLocalSearchParams<{
    tableId: string;
    tableName: string;
    total: string;
    orderId: string;
  }>();
  const total = Number(totalStr || '0');
  const suggestions = getSmartCashSuggestions(total);
  const insets = useSafeAreaInsets();
  const { openSidebar } = useSidebar();
  const { isWide, isLandscape, breakpoint } = useResponsive();
  const isIPadLandscape = isLandscape && (breakpoint === 'tablet-landscape' || breakpoint === 'desktop');

  const [splits, setSplits] = useState<{ method: string; amount: number }[]>([]);
  const [showSplitter, setShowSplitter] = useState(false);
  const [mobileTab, setMobileTab] = useState<'payment' | 'invoice'>('payment');
  const [autoPrint, setAutoPrint] = useState(true);

  const pm = usePayment({
    tableId: tableId || '',
    tableName: tableName || '',
    total,
    orderId: orderId || '',
  });

  const { showToast } = useToast();

  useEffect(() => {
    if (pm.paid) {
      if (autoPrint) {
        pm.handlePrint();
      }
      const methodLabel = pm.method === 'tien_mat' ? 'Tiền mặt' : pm.method === 'qr' ? 'QR Code' : pm.method === 'chuyen_khoan' ? 'Chuyển khoản' : 'Thẻ';
      
      showToast({
        message: `Thanh toán thành công ${tableName || ''}`,
        subMessage: `Tổng: ${formatPrice(total)} đ · ${methodLabel}`,
        type: 'success',
        duration: 2000,
      });

      router.replace({
        pathname: '/ban-hang',
        params: {
          payment_success: 'true',
          tableName: tableName || '',
          total: String(total),
          methodLabel,
        }
      });
    }
  }, [pm.paid, tableName, total, pm.method, autoPrint, showToast]);

  if (pm.paid) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface.app, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const changeBg = pm.change >= 0 ? colors.status.successBg : colors.surface.danger;
  const changeBorder = pm.change >= 0 ? colors.border.success : colors.border.danger;
  
  // iPad split layout
  const iPadView = (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View
        style={{
          flex: 62,
          borderRightWidth: 1,
          borderColor: colors.border.default,
          backgroundColor: colors.surface.app,
          padding: 0,
        }}
      >
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ flex: 1, flexDirection: isIPadLandscape ? 'row' : 'column' }}>
            <View style={{ flex: 1 }}>
              <View style={{ backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
              <AppText
                variant="md"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: colors.text.muted,
                  marginBottom: 12,
                }}
              >
                Tóm tắt đơn hàng
              </AppText>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
              >
                <AppText color={colors.text.body}>Tên bàn</AppText>
                <AppText color={colors.text.primary}>
                  {tableName}
                </AppText>
              </View>
              <View
                style={{ height: 1, backgroundColor: colors.border.default, marginVertical: 8 }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <AppText color={colors.text.primary}>
                  Tổng thanh toán
                </AppText>
                <AppText variant="md" weight="bold" color={colors.brand.primary}>
                  {formatPriceFull(total)}
                </AppText>
              </View>
              </View>
              <View style={{ backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
              <AppText
                variant="md"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: colors.text.muted,
                  marginBottom: 10,
                }}
              >
                Phương thức thanh toán
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16}}>
                {PAY_METHODS.map((m) => {
                  const sel = pm.method === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => pm.setMethod(m.id)}
                      style={{
                        width: '47%',
                        paddingVertical: 12,
                        borderRadius: 0, // Flat
                        backgroundColor: sel ? m.bg : colors.surface.card,
                        borderWidth: 2,
                        borderColor: sel ? m.color : colors.border.default,
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: sel ? m.color + '20' : colors.surface.app,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon
                          name={m.icon as any}
                          size={22}
                          color={sel ? m.color : colors.icon.muted}
                        />
                      </View>
                      <AppText
                        variant="md"
                        color={sel ? m.color : colors.text.muted}
                        style={{ textAlign: 'center' }}
                      >
                        {m.label}
                      </AppText>
                      {sel && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            minWidth: 20,
                            height: 20,
                            borderRadius: shape.radius.full,
                            backgroundColor: m.color,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon name="check" size={12} color={colors.text.inverse} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>
          <View
              style={{
                flex: 1,
                padding: 16,
                backgroundColor: colors.surface.card,
                borderBottomWidth: 1,
                borderBottomColor: colors.border.default,
              }}
            >
            {pm.method === 'tien_mat' || pm.method === 'card' ? (
              <View style={{ flex: 1 }}>
                <AppText
                  variant="md"
                  
                  style={{
                    color: colors.text.muted,
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Chi tiết món ăn
                </AppText>
                {pm.orderItems.length > 0 ? (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {pm.orderItems.map((item, idx) => (
                      <View
                        key={idx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border.default,
                        }}
                      >
                        <AppText
                          color={colors.text.primary}
                          style={{ flex: 1 }}
                          numberOfLines={1}
                        >
                          {item.quantity}x {item.product_name}
                        </AppText>
                        <AppText color={colors.text.muted}>
                          {formatPriceFull(item.unit_price * item.quantity)}
                        </AppText>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16}}>
                    <Icon name="file-document-outline" size={24} color={colors.icon.muted} />
                    <Text style={{ ...font.sm, color: colors.text.muted }}>
                      Không có chi tiết món ăn
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8}}>
                <View
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: colors.border.default,
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 6,
                  }}
                >
                  <Image
                    source={{
                      uri: `https://img.vietqr.io/image/MB-0382348548-compact2.png?amount=${total}&addInfo=${encodeURIComponent(`TT ${tableName || ''} ${orderId ? orderId.slice(0, 6) : ''}`)}&accountName=POS%20QUAN%20AN`,
                    }}
                    style={{ width: 168, height: 168, borderRadius: 8 }}
                    resizeMode="contain"
                  />
                </View>
                <AppText variant="md" color={colors.text.primary} style={{ textAlign: 'center' }}>
                  Quét mã VietQR tự động điền tiền
                </AppText>
                <View style={{ gap: 10, width: '100%', marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText color={colors.text.muted}>Ngân hàng</AppText>
                    <AppText color={colors.text.primary}>
                      MB Bank
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText color={colors.text.muted}>Số tài khoản</AppText>
                    <AppText color={colors.text.primary}>
                      0382348548
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText color={colors.text.muted}>Số tiền</AppText>
                    <AppText weight="bold" color={colors.brand.primary}>
                      {formatPriceFull(total)}
                    </AppText>
                  </View>
                </View>
              </View>
            )}
          </View>
          </View>
        </View>
        </ScrollView>
      </View>

      <View style={{ flex: 38, backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 16 }}>
        <View style={{ flex: 1 }}>
          {pm.method === 'tien_mat' ? (
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
                <AppText
                  variant="md"
                  
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: colors.text.muted,
                    marginBottom: 12,
                  }}
                >
                  Nhập tiền khách đưa
                </AppText>
                <View
                  style={{
                    backgroundColor: colors.surface.app,
                    padding: 16,
                    marginBottom: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border.default,
                  }}
                >
                  <AppText
                    variant="md"
                    color={pm.cashInput ? colors.text.primary : colors.text.placeholder}
                  >
                    {pm.cashInput ? formatPriceFull(pm.cash) : '0đ'}
                  </AppText>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    backgroundColor: changeBg,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: changeBorder,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12}}>
                    <Icon
                      name={pm.change >= 0 ? 'check-circle' : 'alert-circle'}
                      size={16}
                      color={pm.change >= 0 ? colors.status.success : colors.status.danger}
                    />
                    <AppText
                      variant="md"
                      color={pm.change >= 0 ? colors.status.success : colors.status.danger}
                    >
                      Tiền thối lại:
                    </AppText>
                  </View>
                  <AppText
                    variant="md"
                    color={pm.change >= 0 ? colors.status.success : colors.status.danger}
                  >
                    {pm.change >= 0
                      ? formatPriceFull(pm.change)
                      : `Thiếu ${formatPriceFull(Math.abs(pm.change))}`}
                  </AppText>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }} style={{ marginBottom: 14, flexGrow: 0 }}>
                  <TouchableOpacity
                    onPress={() => pm.setCashInput(String(total))}
                    style={{
                      paddingHorizontal: 20,
                      minHeight: 56,
                      paddingVertical: 8,
                      justifyContent: 'center',
                      borderRadius: 8,
                      backgroundColor: colors.brand.primary,
                      borderWidth: 1.5,
                      borderColor: colors.border.brand,
                      alignItems: 'center',
                    }}
                  >
                    <AppText variant="md" color="#FFFFFF" numberOfLines={1}>Đúng tiền</AppText>
                    <AppText variant="md" color="#FFFFFF" numberOfLines={1}>
                      {formatPriceFull(total)}
                    </AppText>
                  </TouchableOpacity>
                  {suggestions.filter(amt => amt !== total).map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => pm.setCashInput(String(amt))}
                      style={{
                        paddingHorizontal: 16,
                        minHeight: 56,
                        paddingVertical: 8,
                        justifyContent: 'center',
                        borderRadius: 8,
                        backgroundColor: colors.surface.app,
                        borderWidth: 1,
                        borderColor: colors.border.default,
                        alignItems: 'center',
                      }}
                    >
                      <AppText variant="md" color={colors.text.body} numberOfLines={1}>
                        {formatPriceFull(amt)}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : pm.method === 'card' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8}}>
              <View
                style={{
                  width: 100,
                  height: 64,
                  borderRadius: 12,
                  backgroundColor: colors.surface.overlay,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="credit-card-chip" size={24} color={colors.status.warning} />
              <AppText variant="md" color={colors.text.muted} style={{ marginTop: 4, letterSpacing: 2 }}>
                  •••• 4242
                </AppText>
              </View>
              <AppText variant="md" color={colors.text.primary} style={{ textAlign: 'center' }}>
                Đang chờ quẹt thẻ
              </AppText>
              <AppText color={colors.text.muted} style={{ textAlign: 'center' }}>
                Vui lòng đưa thẻ vào đầu đọc hoặc chạm thẻ lên màn hình.
              </AppText>
              <AppText variant="md" weight="bold" color={colors.brand.primary}>
                {formatPriceFull(total)}
              </AppText>
              <ActivityIndicator size="small" color={colors.brand.primary} />
            </View>
          ) : pm.method === 'qr' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8}}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  backgroundColor: colors.surface.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: colors.border.default,
                  borderRadius: 0,
                }}
              >
                <Icon name="qrcode-scan" size={90} color={colors.text.primary} />
              </View>
              <AppText variant="md" color={colors.text.primary} style={{ textAlign: 'center' }}>
                Quét mã QR để thanh toán
              </AppText>
              <AppText variant="md" weight="bold" color={colors.brand.primary}>
                {formatPriceFull(total)}
              </AppText>
              <AppText variant="md" color={colors.text.muted} style={{ textAlign: 'center' }}>
                Sử dụng app ngân hàng hoặc ví điện tử quét mã trên.
              </AppText>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8}}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.status.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="bank-transfer" size={40} color="#E11D48" />
              </View>
              <AppText variant="md" color={colors.text.primary} style={{ textAlign: 'center' }}>
                Chuyển khoản ngân hàng
              </AppText>
              <View
                style={{
                  backgroundColor: colors.surface.card,
                  borderRadius: 0,
                  padding: 12,
                  width: '100%',
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="md" color={colors.text.muted}>Ngân hàng</AppText>
                  <AppText variant="md" color={colors.text.primary}>
                    MB Bank
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="md" color={colors.text.muted}>Số tài khoản</AppText>
                  <AppText variant="md" color={colors.text.primary}>
                    0987654321
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="md" color={colors.text.muted}>Chủ tài khoản</AppText>
                  <AppText variant="md" color={colors.text.primary}>
                    NGUYEN VAN A
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="md" color={colors.text.muted}>Số tiền</AppText>
                  <AppText variant="md" weight="bold" color={colors.brand.primary}>
                    {formatPriceFull(total)}
                  </AppText>
                </View>
              </View>
              <AppText variant="md" color={colors.text.primary} style={{ textAlign: 'center' }}>
                Nội dung chuyển khoản
              </AppText>
              <View
                style={{
                  backgroundColor: colors.brand.primary,
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                }}
              >
                <AppText
                  
                  color={colors.text.inverse}
                  style={{ textAlign: 'center' }}
                >
                  TT {tableName} #{orderId?.slice(-6)}
                </AppText>
              </View>
            </View>
          )}
          <Numpad method={pm.method} onKey={pm.handleKey} />
        </View>
        <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => pm.handlePrint()}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 8,
              backgroundColor: colors.surface.disabled,
              borderWidth: 1,
              borderColor: colors.border.default,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <Icon name="printer-eye" size={20} color={colors.text.primary} />
            <AppText variant="md" color={colors.text.primary}>
              In Thử K80
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => pm.handlePay()}
            disabled={!pm.canPay || pm.paying}
            style={{
              flex: 2,
              height: 56,
              borderRadius: 8,
              backgroundColor: pm.canPay ? colors.brand.primary : colors.surface.disabled,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
          >
            {pm.paying ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Icon name="check-circle" size={24} color={pm.canPay ? colors.text.inverse : colors.text.muted} />
            )}
            <AppText variant="md" color={pm.canPay ? colors.text.inverse : colors.text.muted}>
              {pm.paying ? 'Đang xử lý...' : 'Hoàn tất thanh toán'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // iPhone tabbed layout — Flat Skills UI V2 & Layout V2 standard
  const tabs = ['payment' as const, 'invoice' as const];
  const tabLabels = { payment: 'Thanh toán', invoice: 'Chi tiết đơn' };
  const tabIcons = { payment: 'credit-card-outline', invoice: 'file-document-outline' };
  const iPhoneView = (
    <View style={{ flex: 1 }}>
      {/* Summary bar cố định đầu màn (iPhone) */}
      <View
        style={{
          backgroundColor: '#FFF7ED',
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#FDBA74',
        }}
      >
        <AppText variant="sm" color="#64748B">
          {tableName ? `Bàn ${tableName}` : ''} · Tại bàn · {pm.orderItems.length} món
        </AppText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, alignItems: 'center' }}>
          <AppText variant="md" color="#0F172A">Tổng cộng</AppText>
          <AppText variant="md" weight="bold" color="#EA580C">
            {formatPriceFull(total)}
          </AppText>
        </View>
      </View>

      {/* Segmented Tab Bar (iOS style Segmented Control) */}
      <View
        style={{
          paddingHorizontal: 6,
          paddingVertical: 6,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E9F0',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#F1F5F9',
            borderRadius: 8,
            padding: 3,
          }}
        >
          {tabs.map((t) => {
            const sel = mobileTab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setMobileTab(t)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  backgroundColor: sel ? '#FFFFFF' : 'transparent',
                  borderRadius: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  ...(sel ? {
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 1.5,
                    elevation: 1,
                  } : {}),
                }}
              >
                <Icon
                  name={tabIcons[t] as any}
                  size={16}
                  color={sel ? '#0F172A' : '#64748B'}
                />
                <AppText
                  variant="md"
                  weight={sel ? 'bold' : 'normal'}
                  color={sel ? '#0F172A' : '#64748B'}
                >
                  {tabLabels[t]}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tab: Invoice detail */}
      {mobileTab === 'invoice' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 6, // Edge-to-Edge 6px
            paddingTop: 6,
            gap: 8,
            paddingBottom: 100,
          }}
          style={{ backgroundColor: '#F8FAFC' }}
        >
          {/* CardBox 1: Chi tiết các món */}
          <View
            style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E5E9F0',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <View
              style={{
                backgroundColor: '#F8FAFC',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: '#E5E9F0',
              }}
            >
              <AppText variant="md" weight="bold" color="#1E293B">
                Danh sách món ăn
              </AppText>
            </View>
            <OrderItemsList items={pm.orderItems} />
          </View>

          {/* CardBox 2: Tóm tắt thanh toán */}
          <View
            style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E5E9F0',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
              padding: 10,
              gap: 8,
              marginBottom: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="md" color="#64748B">Tạm tính</AppText>
              <AppText variant="md" color="#0F172A">
                {formatPriceFull(total)}
              </AppText>
            </View>
            {pm.vatAmount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="md" color="#64748B">
                  Thuế VAT (đã gồm)
                </AppText>
                <AppText variant="md" color="#0F172A">
                  {formatPriceFull(pm.vatAmount)}
                </AppText>
              </View>
            )}
            <View style={{ height: 1, backgroundColor: '#E5E9F0', marginVertical: 2 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="md" color="#0F172A">Tổng cộng</AppText>
              <AppText variant="md" weight="bold" color="#EA580C">
                {formatPriceFull(total)}
              </AppText>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Tab: Payment */}
      {mobileTab === 'payment' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 6, // Edge-to-Edge 6px
            paddingTop: 6,
            gap: 8,
            paddingBottom: 100,
          }}
          style={{ backgroundColor: '#F8FAFC' }}
        >
          {/* CardBox 1: Phương thức thanh toán */}
          <View
            style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E5E9F0',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <View
              style={{
                backgroundColor: '#F8FAFC',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: '#E5E9F0',
              }}
            >
              <AppText variant="md" weight="bold" color="#1E293B">
                Phương thức thanh toán
              </AppText>
            </View>
            <View style={{ padding: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
              {PAY_METHODS.map((m) => {
                const sel = pm.method === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => pm.setMethod(m.id)}
                    activeOpacity={0.7}
                    style={{
                      width: '48%',
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: sel ? m.bg : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: sel ? m.color : '#E5E9F0',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: sel ? m.color + '20' : '#F1F5F9',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name={m.icon as any}
                        size={20}
                        color={sel ? m.color : '#64748B'}
                      />
                    </View>
                    <AppText
                      variant="md"
                      weight={sel ? 'bold' : 'normal'}
                      color={sel ? m.color : '#475569'}
                      style={{ textAlign: 'center' }}
                    >
                      {m.label}
                    </AppText>
                    {sel && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: m.color,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name="check" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* CardBox 2: Chi tiết tiền mặt */}
          {pm.method === 'tien_mat' && (
            <View
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E9F0',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: '#F8FAFC',
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderColor: '#E5E9F0',
                }}
              >
                <AppText variant="md" weight="bold" color="#1E293B">
                  Nhập tiền khách đưa
                </AppText>
              </View>
              <View style={{ padding: 10, gap: 10 }}>
                <View
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: 8,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E5E9F0',
                  }}
                >
                  <AppText
                    variant="md"
                    weight="bold"
                    color={pm.cashInput ? '#0F172A' : '#94A3B8'}
                  >
                    {pm.cashInput ? formatPriceFull(pm.cash) : '0đ'}
                  </AppText>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    backgroundColor: changeBg,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: changeBorder,
                  }}
                >
                  <AppText
                    variant="md"
                    weight="normal"
                    color={pm.change >= 0 ? colors.status.success : colors.status.danger}
                  >
                    Tiền thối:
                  </AppText>
                  <AppText
                    variant="md"
                    weight="bold"
                    color={pm.change >= 0 ? colors.status.success : colors.status.danger}
                  >
                    {pm.change >= 0
                      ? formatPriceFull(pm.change)
                      : `Thiếu ${formatPriceFull(Math.abs(pm.change))}`}
                  </AppText>
                </View>

                <AppText variant="sm" color="#64748B">
                  Phím chọn tiền nhanh (1-chạm không phím ảo):
                </AppText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {/* Row 1 */}
                  <TouchableOpacity
                    onPress={() => pm.setCashInput(String(total))}
                    activeOpacity={0.7}
                    style={{
                      width: '23.5%',
                      height: 44,
                      borderRadius: 6,
                      backgroundColor: pm.cash === total ? '#FFF7ED' : '#F8FAFC',
                      borderWidth: 1,
                      borderColor: pm.cash === total ? '#F97316' : '#E5E9F0',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="xs" color="#F97316" weight="bold">Đúng tiền</AppText>
                  </TouchableOpacity>

                  {[10000, 20000, 50000].map((denom) => (
                    <TouchableOpacity
                      key={denom}
                      onPress={() => {
                        const current = pm.cashInput ? pm.cash : 0;
                        pm.setCashInput(String(current + denom));
                      }}
                      activeOpacity={0.7}
                      style={{
                        width: '23.5%',
                        height: 44,
                        borderRadius: 6,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#E5E9F0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AppText variant="sm" color="#0F172A" weight="bold">
                        +{denom / 1000}k
                      </AppText>
                    </TouchableOpacity>
                  ))}

                  {/* Row 2 */}
                  {[100000, 200000, 500000].map((denom) => (
                    <TouchableOpacity
                      key={denom}
                      onPress={() => {
                        const current = pm.cashInput ? pm.cash : 0;
                        pm.setCashInput(String(current + denom));
                      }}
                      activeOpacity={0.7}
                      style={{
                        width: '23.5%',
                        height: 44,
                        borderRadius: 6,
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#E5E9F0',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <AppText variant="sm" color="#0F172A" weight="bold">
                        +{denom / 1000}k
                      </AppText>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    onPress={() => pm.setCashInput('')}
                    activeOpacity={0.7}
                    style={{
                      width: '23.5%',
                      height: 44,
                      borderRadius: 6,
                      backgroundColor: '#FEF2F2',
                      borderWidth: 1,
                      borderColor: '#FCA5A5',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="sm" color="#EF4444" weight="bold">Xóa (C)</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* CardBox 3: Quẹt thẻ */}
          {pm.method === 'card' && (
            <View
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E9F0',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                padding: 16,
                gap: 10,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <View style={{ width: 80, height: 52, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E9F0' }}>
                <Icon name="credit-card-chip" size={20} color={colors.status.warning} />
                <AppText variant="xs" color="#64748B" style={{ marginTop: 2, letterSpacing: 2 }}>•••• 4242</AppText>
              </View>
              <AppText variant="md" color="#0F172A">Đang chờ quẹt thẻ</AppText>
              <AppText variant="md" weight="bold" color="#EA580C">{formatPriceFull(total)}</AppText>
              <ActivityIndicator size="small" color="#EA580C" />
            </View>
          )}

          {/* CardBox 4: Dynamic VietQR */}
          {pm.method === 'qr' && (
            <View
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E9F0',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                padding: 16,
                gap: 10,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <View style={{ width: 140, height: 140, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E9F0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                <Icon name="qrcode-scan" size={100} color="#0F172A" />
              </View>
              <AppText variant="md" color="#0F172A">Quét mã QR để thanh toán</AppText>
              <AppText variant="md" weight="bold" color="#EA580C">{formatPriceFull(total)}</AppText>
            </View>
          )}

          {/* CardBox 5: Chuyển khoản */}
          {pm.method === 'chuyen_khoan' && (
            <View
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E9F0',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                padding: 16,
                gap: 12,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <View style={{ width: 140, height: 140, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E9F0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                <Icon name="qrcode-scan" size={100} color="#0F172A" />
              </View>
              <View style={{ width: '100%', gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="md" color="#64748B">Ngân hàng</AppText>
                  <AppText variant="md" color="#0F172A">MB Bank</AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="md" color="#64748B">Số tài khoản</AppText>
                  <AppText variant="md" color="#0F172A">0987654321</AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="md" color="#64748B">Số tiền</AppText>
                  <AppText variant="md" weight="bold" color="#EA580C">{formatPriceFull(total)}</AppText>
                </View>
              </View>
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E9F0', width: '100%', alignItems: 'center' }}>
                <AppText variant="md" color="#475569" style={{ textAlign: 'center' }}>
                  Nội dung: TT {tableName} #{orderId?.slice(-6)}
                </AppText>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Pay button & Split bill toggle (always visible at bottom with 50% bottom inset) */}
      {mobileTab === 'payment' && (
        <View
          style={{
            paddingHorizontal: 12,
            paddingBottom: Platform.OS === 'web' ? 6 : Math.max(Math.floor(insets.bottom * 0.5), 6),
            paddingTop: 8,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            gap: 6,
          }}
        >
          {/* Quick options row: Auto-print K80 & Split bill */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 }}>
            <TouchableOpacity
              onPress={() => setAutoPrint(!autoPrint)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon
                name={autoPrint ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={18}
                color={autoPrint ? '#EA580C' : '#94A3B8'}
              />
              <AppText variant="md" color={autoPrint ? '#0F172A' : '#64748B'}>
                Tự động in K80
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pm.handlePrint()}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon name="printer-eye" size={16} color="#64748B" />
              <AppText variant="md" color="#64748B">In thử</AppText>
            </TouchableOpacity>

            {!showSplitter && (
              <TouchableOpacity
                onPress={() => setShowSplitter(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 4,
                }}
              >
                <Icon name="content-copy" size={14} color="#EA580C" />
                <AppText variant="md" color="#EA580C">Chia HĐ</AppText>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => pm.handlePay()}
            disabled={!pm.canPay || pm.paying}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 8,
              backgroundColor: pm.canPay ? '#F97316' : '#E2E8F0',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              flexDirection: 'row',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {pm.paying ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Icon name="check-circle" size={20} color={pm.canPay ? '#FFFFFF' : '#94A3B8'} />
              )}
              <AppText variant="md" weight="bold" color={pm.canPay ? '#FFFFFF' : '#94A3B8'}>
                {pm.paying ? 'Đang xử lý...' : 'Hoàn tất thanh toán'}
              </AppText>
            </View>

            {pm.canPay && (
              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.22)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <AppText variant="md" weight="bold" color="#FFFFFF">
                  {formatPriceFull(total)}
                </AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const btnSize = isWide ? 40 : 36;

  return (
    <SafeAreaView edges={isWide ? ['top', 'left', 'right', 'bottom'] : []} style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <UnifiedHeader
        icon="receipt"
        title="Thanh toán"
        subtitle={tableName ? `Bàn ${tableName}` : undefined}
        onBackPress={() => router.back()}
        backLabel="Quay lại"
        right={
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: isWide ? 14 : 10,
              height: btnSize,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <AppText
              variant="md"
              
              color={colors.text.inverse}
            >
              {formatPriceFull(total)}
            </AppText>
          </View>
        }
      />
      <View style={{ flex: 1 }}>
        {!orderId && (
          <View
            style={{
              margin: 16,
              backgroundColor: colors.surface.danger,
              borderColor: palette.red[300],
              borderWidth: 1.5,
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 32,
            }}
          >
            <Icon name="alert-circle" size={24} color={colors.status.danger} />
            <View style={{ flex: 1 }}>
              <AppText color={palette.red[800]}>
                Thiếu ID đơn hàng
              </AppText>
              <AppText variant="md" color={colors.status.danger} style={{ marginTop: 2 }}>
                Không thể tiếp tục thanh toán vì chưa tạo được đơn hàng trên hệ thống.
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: colors.status.danger,
                paddingHorizontal: 12,
                paddingVertical: 16,
                borderRadius: 12,
              }}
            >
              <AppText variant="md" color={colors.text.inverse}>Quay lại</AppText>
            </TouchableOpacity>
          </View>
        )}

        {orderId && (isWide ? iPadView : iPhoneView)}

        {(isWide || showSplitter) && (
          <SplitBillToggle
            showSplitter={showSplitter}
            setShowSplitter={setShowSplitter}
            splits={splits}
            setSplits={setSplits}
            handlePay={pm.handlePay}
            paying={pm.paying}
            canPay={pm.canPay}
            total={total}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
