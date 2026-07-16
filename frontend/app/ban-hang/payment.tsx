import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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

  const pm = usePayment({
    tableId: tableId || '',
    tableName: tableName || '',
    total,
    orderId: orderId || '',
  });

  if (pm.paid) {
    return (
      <PaymentSuccessScreen
        tableName={tableName || ''}
        total={total}
        method={pm.method}
        cash={pm.cash}
        change={pm.change}
        countdown={pm.countdown}
        onPrint={pm.handlePrint}
        onGoBack={() => router.replace('/ban-hang')}
      />
    );
  }

  const changeBg = pm.change >= 0 ? '#16A34A' : colors.surface.danger;
  const changeBorder = pm.change >= 0 ? palette.green[350] : colors.border.danger;
  const disabledBg = '#F5F5F5';
  const disabledText = '#737373';

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
                variant="medium"
                weight="bold"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: '#737373',
                  marginBottom: 12,
                }}
              >
                Tóm tắt đơn hàng
              </AppText>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
              >
                <AppText color={colors.text.body}>Tên bàn</AppText>
                <AppText weight="bold" color="#171717">
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
                <AppText weight="bold" color="#171717">
                  Tổng thanh toán
                </AppText>
                <AppText variant="large" weight="bold" color="#F97316">
                  {formatPriceFull(total)}
                </AppText>
              </View>
              </View>
              <View style={{ backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
              <AppText
                variant="medium"
                weight="bold"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: '#737373',
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
                        backgroundColor: sel ? m.bg : '#FFFFFF',
                        borderWidth: 2,
                        borderColor: sel ? m.color : '#E5E5E5',
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
                        variant="medium"
                        color={sel ? m.color : '#737373'}
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
                            width: 18,
                            height: 18,
                            borderRadius: 8,
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
                  variant="medium"
                  weight="bold"
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
                    <Text style={{ ...font.caption, color: '#737373' }}>
                      Không có chi tiết món ăn
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8}}>
                <View
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 0,
                    borderWidth: 1.5,
                    borderColor: colors.border.default,
                    backgroundColor: colors.surface.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                  }}
                >
                  <Icon name="qrcode-scan" size={100} color={colors.text.primary} />
                </View>
                <AppText variant="large" weight="bold" color={colors.text.primary} style={{ textAlign: 'center' }}>
                  Quét mã QR để thanh toán
                </AppText>
                <View style={{ gap: 12, width: '100%', marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <AppText color={colors.text.muted}>Ngân hàng</AppText>
                    <AppText weight="bold" color={colors.text.primary}>
                      MB Bank
                    </AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginVertical: 2,
                    }}
                  >
                    <AppText color={colors.text.muted}>Số tài khoản</AppText>
                    <AppText weight="bold" color={colors.text.primary}>
                      0987654321
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
                  variant="medium"
                  weight="bold"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: '#737373',
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
                    variant="large"
                    weight="bold"
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
                      color={pm.change >= 0 ? '#FFFFFF' : '#DC2626'}
                    />
                    <AppText
                      variant="base"
                      weight="bold"
                      color={pm.change >= 0 ? '#FFFFFF' : '#DC2626'}
                    >
                      Tiền thối lại:
                    </AppText>
                  </View>
                  <AppText
                    variant="large"
                    weight="bold"
                    color={pm.change >= 0 ? '#FFFFFF' : '#DC2626'}
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
                      backgroundColor: '#F97316',
                      borderWidth: 1.5,
                      borderColor: colors.border.brand,
                      alignItems: 'center',
                    }}
                  >
                    <AppText variant="medium" color="#FFFFFF" numberOfLines={1}>Đúng tiền</AppText>
                    <AppText variant="medium" weight="bold" color="#FFFFFF" numberOfLines={1}>
                      {formatPriceFull(total)}
                    </AppText>
                  </TouchableOpacity>
                  {suggestions.map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => pm.setCashInput(String(amt))}
                      style={{
                        paddingHorizontal: 16,
                        minHeight: 56,
                        paddingVertical: 8,
                        justifyContent: 'center',
                        borderRadius: 8,
                        backgroundColor: '#FAFAFA',
                        borderWidth: 1,
                        borderColor: '#E5E5E5',
                        alignItems: 'center',
                      }}
                    >
                      <AppText variant="medium" weight="bold" color={colors.text.body} numberOfLines={1}>
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
                  backgroundColor: '#1E293B',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="credit-card-chip" size={24} color="#FBBF24" />
              <AppText variant="small" color={colors.text.muted} style={{ marginTop: 4, letterSpacing: 2 }}>
                  •••• 4242
                </AppText>
              </View>
              <AppText variant="large" weight="bold" color={colors.text.primary} style={{ textAlign: 'center' }}>
                Đang chờ quẹt thẻ
              </AppText>
              <AppText color={colors.text.muted} style={{ textAlign: 'center' }}>
                Vui lòng đưa thẻ vào đầu đọc hoặc chạm thẻ lên màn hình.
              </AppText>
              <AppText variant="large" weight="bold" color={colors.brand.primary}>
                {formatPriceFull(total)}
              </AppText>
              <ActivityIndicator size="small" color={'#F97316'} />
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
              <AppText variant="large" weight="bold" color={colors.text.primary} style={{ textAlign: 'center' }}>
                Quét mã QR để thanh toán
              </AppText>
              <AppText variant="large" weight="bold" color={colors.brand.primary}>
                {formatPriceFull(total)}
              </AppText>
              <AppText variant="small" color={colors.text.muted} style={{ textAlign: 'center' }}>
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
                  backgroundColor: '#DC2626',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="bank-transfer" size={40} color="#E11D48" />
              </View>
              <AppText variant="large" weight="bold" color={colors.text.primary} style={{ textAlign: 'center' }}>
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
                  <AppText variant="small" color={colors.text.muted}>Ngân hàng</AppText>
                  <AppText variant="small" weight="bold" color={colors.text.primary}>
                    MB Bank
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="small" color={colors.text.muted}>Số tài khoản</AppText>
                  <AppText variant="small" weight="bold" color={colors.text.primary}>
                    0987654321
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="small" color={colors.text.muted}>Chủ tài khoản</AppText>
                  <AppText variant="small" weight="bold" color={colors.text.primary}>
                    NGUYEN VAN A
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="small" color={colors.text.muted}>Số tiền</AppText>
                  <AppText variant="small" weight="bold" color={colors.brand.primary}>
                    {formatPriceFull(total)}
                  </AppText>
                </View>
              </View>
              <AppText variant="large" weight="bold" color={colors.text.primary} style={{ textAlign: 'center' }}>
                Nội dung chuyển khoản
              </AppText>
              <View
                style={{
                  backgroundColor: '#F97316',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                }}
              >
                <AppText
                  weight="bold"
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
        <View style={{ marginTop: 16 }}>
          <TouchableOpacity
            onPress={() => pm.handlePay()}
            disabled={!pm.canPay || pm.paying}
            style={{
              width: '100%',
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
            <AppText variant="large" weight="bold" color={pm.canPay ? colors.text.inverse : colors.text.muted}>
              {pm.paying ? 'Đang xử lý...' : 'Hoàn tất thanh toán'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // iPhone tabbed layout — all font tokens standardized, no virtual numpad
  const tabs = ['payment' as const, 'invoice' as const];
  const tabLabels = { payment: 'Thanh toán', invoice: 'Chi tiết đơn' };
  const tabIcons = { payment: 'credit-card-outline', invoice: 'file-document-outline' };
  const iPhoneView = (
    <View style={{ flex: 1 }}>
      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 0,
          backgroundColor: colors.surface.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.default,
        }}
      >
        {tabs.map((t) => {
          const sel = mobileTab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setMobileTab(t)}
              style={{
                flex: 1,
                paddingVertical: 14,
                backgroundColor: sel ? colors.surface.app : colors.surface.card,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 12,
                borderBottomWidth: sel ? 2 : 0,
                borderBottomColor: colors.brand.primary,
              }}
            >
              <Icon
                name={tabIcons[t] as any}
                size={18}
                color={sel ? colors.text.inverse : '#404040'}
              />
              <AppText
                variant="medium"
                weight="bold"
                color={sel ? colors.brand.primary : colors.text.muted}
              >
                {tabLabels[t]}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab: Invoice detail */}
      {mobileTab === 'invoice' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 24, flexGrow: 1 }}
          style={{ backgroundColor: colors.surface.app }}
        >
          <View style={{ backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
            <OrderItemsList items={pm.orderItems} />
          </View>
          <View style={{ backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border.default, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText color={colors.text.muted}>Tạm tính</AppText>
              <AppText weight="bold" color={colors.text.primary}>
                {formatPriceFull(total)}
              </AppText>
            </View>
            {pm.vatAmount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText color={colors.text.muted}>
                  Thuế VAT (đã gồm)
                </AppText>
                <AppText weight="bold" color={colors.text.primary}>
                  {formatPriceFull(pm.vatAmount)}
                </AppText>
              </View>
            )}
            <View style={{ height: 1, backgroundColor: colors.border.default, marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText weight="bold" color={colors.text.primary}>Tổng cộng</AppText>
              <AppText variant="large" weight="bold" color={colors.brand.primary}>
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
          contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 24, flexGrow: 1 }}
          style={{ backgroundColor: colors.surface.app }}
        >
          {/* Payment methods 2x2 grid */}
          <View style={{ backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border.default, gap: 12 }}>
            <AppText
              variant="medium"
              weight="bold"
              style={{
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                color: colors.text.muted,
              }}
            >
              Phương thức thanh toán
            </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
            {PAY_METHODS.map((m) => {
              const sel = pm.method === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => pm.setMethod(m.id)}
                  style={{
                    width: '48%',
                    paddingVertical: 10,
                    borderRadius: 0,
                    backgroundColor: sel ? m.bg : colors.surface.card,
                    borderWidth: 1,
                    borderColor: sel ? m.color : colors.border.default,
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: sel ? m.color + '20' : colors.surface.app,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={m.icon as any}
                      size={20}
                      color={sel ? m.color : colors.icon.muted}
                    />
                  </View>
                  <AppText
                    variant="medium"
                    weight="bold"
                    color={sel ? m.color : '#737373'}
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
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        backgroundColor: m.color,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="check" size={14} color={colors.text.inverse} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          </View>

          {/* Cash — smartSuggestions replacing Numpad */}
          {pm.method === 'tien_mat' && (
            <View style={{ backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border.default, gap: 16 }}>
              <View
                style={{
                  backgroundColor: colors.surface.app,
                  borderRadius: 0,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border.default,
                }}
              >
                <AppText
                  variant="large"
                  weight="bold"
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
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  backgroundColor: changeBg,
                  borderWidth: 1,
                  borderColor: changeBorder,
                }}
              >
                <AppText
                  variant="base"
                  weight="bold"
                  color={pm.change >= 0 ? '#FFFFFF' : '#DC2626'}
                >
                  Tiền thối:
                </AppText>
                <AppText
                  variant="medium"
                  weight="bold"
                  color={pm.change >= 0 ? '#FFFFFF' : '#DC2626'}
                >
                  {pm.change >= 0
                    ? formatPriceFull(pm.change)
                    : `Thiếu ${formatPriceFull(Math.abs(pm.change))}`}
                </AppText>
              </View>
              <AppText variant="base" color={colors.text.muted}>
                Chọn số tiền khách đưa:
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                {pm.smartSuggestions.slice(0, 6).map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => pm.setCashInput(String(amt))}
                    style={{
                      flex: 1,
                      minWidth: '30%',
                      minHeight: 40,
                      paddingVertical: 6,
                      borderRadius: 8, // Rectangular shape for quick amounts
                      backgroundColor:
                        pm.cash === amt ? '#F97316' : '#FAFAFA',
                      borderWidth: pm.cash === amt ? 1.5 : 1,
                      borderColor: pm.cash === amt ? '#F97316' : '#E5E5E5',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText
                      variant="medium"
                      weight="bold"
                      color={pm.cash === amt ? '#FFFFFF' : '#171717'}
                    >
                      {formatPriceFull(amt)}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Card reader */}
          {pm.method === 'card' && (
            <View style={{ backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: colors.border.default, gap: 12, alignItems: 'center' }}>
              <View
                style={{
                  width: 80,
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: '#1E293B',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="credit-card-chip" size={20} color="#FBBF24" />
                <Text style={{ ...font.micro, color: '#737373', marginTop: 2, letterSpacing: 2 }}>
                  •••• 4242
                </Text>
              </View>
              <Text style={{ ...font.sectionTitle, color: '#171717' }}>Đang chờ quẹt thẻ</Text>
              <Text style={{ ...font.priceLarge, color: '#F97316' }}>
                {formatPriceFull(total)}
              </Text>
              <ActivityIndicator size="small" color={'#F97316'} />
            </View>
          )}

          {/* QR code */}
          {pm.method === 'qr' && (
            <View style={{ backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: colors.border.default, gap: 12, alignItems: 'center' }}>
              <View
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 0,
                  borderWidth: 1.5,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                }}
              >
                <Icon name="qrcode-scan" size={100} color={colors.text.primary} />
              </View>
              <AppText variant="large" weight="bold" color={colors.text.primary}>
                Quét mã QR để thanh toán
              </AppText>
              <AppText variant="large" weight="bold" color={colors.brand.primary}>
                {formatPriceFull(total)}
              </AppText>
            </View>
          )}

          {/* Bank transfer with QR mockup */}
          {pm.method === 'chuyen_khoan' && (
            <View style={{ backgroundColor: colors.surface.card, paddingHorizontal: 16, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: colors.border.default, gap: 16, alignItems: 'center' }}>
              <View
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 0,
                  borderWidth: 1.5,
                  borderColor: colors.border.default,
                  backgroundColor: colors.surface.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                }}
              >
                <Icon name="qrcode-scan" size={100} color={colors.text.primary} />
              </View>
              <View style={{ width: '100%', gap: 12}}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText color={colors.text.muted}>Ngân hàng</AppText>
                  <AppText weight="bold" color={colors.text.primary}>
                    MB Bank
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText color={colors.text.muted}>Số tài khoản</AppText>
                  <AppText weight="bold" color={colors.text.primary}>
                    0987654321
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText color={colors.text.muted}>Số tiền</AppText>
                  <AppText weight="bold" color={colors.brand.primary}>
                    {formatPriceFull(total)}
                  </AppText>
                </View>
              </View>
              <View
                style={{
                  backgroundColor: colors.surface.app,
                  borderRadius: 0,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: colors.border.default,
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <AppText
                  variant="small"
                  weight="bold"
                  color={colors.text.muted}
                  style={{ textAlign: 'center' }}
                >
                  TT {tableName} #{orderId?.slice(-6)}
                </AppText>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Pay button (always visible) */}
      {mobileTab === 'payment' && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 + insets.bottom, paddingTop: 8 }}>
          <TouchableOpacity
            onPress={() => pm.handlePay()}
            disabled={!pm.canPay || pm.paying}
            style={{
              width: '100%',
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
            <AppText variant="large" weight="bold" color={pm.canPay ? colors.text.inverse : colors.text.muted}>
              {pm.paying ? 'Đang xử lý...' : 'Hoàn tất thanh toán'}
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const btnSize = isWide ? 40 : 36;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.app }}>
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
              weight="bold"
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
            <Icon name="alert-circle" size={24} color={'#DC2626'} />
            <View style={{ flex: 1 }}>
              <AppText weight="bold" color={palette.red[800]}>
                Thiếu ID đơn hàng
              </AppText>
              <AppText variant="small" color="#DC2626" style={{ marginTop: 2 }}>
                Không thể tiếp tục thanh toán vì chưa tạo được đơn hàng trên hệ thống.
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: '#DC2626',
                paddingHorizontal: 12,
                paddingVertical: 16,
                borderRadius: 12,
              }}
            >
              <AppText variant="small" color={colors.text.inverse}>Quay lại</AppText>
            </TouchableOpacity>
          </View>
        )}

        {orderId && (isWide ? iPadView : iPhoneView)}

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
      </View>
    </View>
  );
}
