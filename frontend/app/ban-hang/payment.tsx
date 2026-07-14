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
          borderColor: '#E5E5E5',
          padding: 16,
          gap: 8,
        }}
      >
        <View style={{ flex: 1, flexDirection: isIPadLandscape ? 'row' : 'column', gap: 8}}>
          <View style={{ flex: 1, gap: 8}}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5E5E5',
              }}
            >
              <Text
                style={{
                  ...font.bodySmall,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: '#737373',
                  marginBottom: 12,
                }}
              >
                Tóm tắt đơn hàng
              </Text>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
              >
                <Text style={{ ...font.body, color: colors.text.body }}>Tên bàn</Text>
                <Text style={{ ...font.body, fontWeight: '600', color: '#171717' }}>
                  {tableName}
                </Text>
              </View>
              <View
                style={{ height: 1, backgroundColor: '#F5F5F5', marginVertical: 8 }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ ...font.body, fontWeight: '600', color: '#171717' }}>
                  Tổng thanh toán
                </Text>
                <Text style={{ ...font.priceLarge, color: '#F97316' }}>
                  {formatPriceFull(total)}
                </Text>
              </View>
            </View>
            <View>
              <Text
                style={{
                  ...font.bodySmall,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: '#737373',
                  marginBottom: 10,
                }}
              >
                Phương thức thanh toán
              </Text>
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
                        borderRadius: 8,
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
                          backgroundColor: sel ? m.color + '20' : '#F5F5F5',
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
                      <Text
                        style={{
                          ...font.bodySmall,
                          color: sel ? m.color : '#737373',
                          textAlign: 'center',
                        }}
                      >
                        {m.label}
                      </Text>
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
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E5E5E5',
            }}
          >
            {pm.method === 'tien_mat' || pm.method === 'card' ? (
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...font.bodySmall,
                    color: '#737373',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Chi tiết món ăn
                </Text>
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
                          borderBottomColor: '#F0F0F0',
                        }}
                      >
                        <Text
                          style={{ ...font.bodySmall, color: '#171717', flex: 1 }}
                          numberOfLines={1}
                        >
                          {item.quantity}x {item.product_name}
                        </Text>
                        <Text style={{ ...font.bodySmall, color: '#404040' }}>
                          {formatPriceFull(item.unit_price * item.quantity)}
                        </Text>
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
                    borderRadius: 8,
                    borderWidth: 1.5,
                    borderColor: '#E5E5E5',
                    backgroundColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                  }}
                >
                  <Icon name="qrcode-scan" size={100} color={'#171717'} />
                </View>
                <Text style={{ ...font.sectionTitle, color: '#171717', textAlign: 'center' }}>
                  Quét mã QR để thanh toán
                </Text>
                <View style={{ gap: 12, width: '100%', marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ ...font.caption, color: '#737373' }}>Ngân hàng</Text>
                    <Text
                      style={{ ...font.caption, fontWeight: '600', color: '#171717' }}
                    >
                      MB Bank
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginVertical: 2,
                    }}
                  >
                    <Text style={{ ...font.caption, color: '#737373' }}>Số tài khoản</Text>
                    <Text
                      style={{ ...font.caption, fontWeight: '600', color: '#171717' }}
                    >
                      0987654321
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ ...font.caption, color: '#737373' }}>Số tiền</Text>
                    <Text
                      style={{ ...font.caption, fontWeight: '600', color: '#F97316' }}
                    >
                      {formatPriceFull(total)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={{ flex: 38, backgroundColor: '#FFFFFF', padding: 16 }}>
        <View style={{ flex: 1 }}>
          {pm.method === 'tien_mat' ? (
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    ...font.bodySmall,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: '#737373',
                    marginBottom: 12,
                  }}
                >
                  Nhập tiền khách đưa
                </Text>
                <View
                  style={{
                    backgroundColor: '#FAFAFA',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                  }}
                >
                  <Text
                    style={{
                      ...font.pageTitle,
                      color: pm.cashInput ? '#171717' : colors.text.placeholder,
                    }}
                  >
                    {pm.cashInput ? formatPriceFull(pm.cash) : '0đ'}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 32,
                    paddingHorizontal: 12,
                    borderRadius: 8,
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
                      color={pm.change >= 0 ? '#16A34A' : '#DC2626'}
                    />
                    <Text
                      style={{
                        ...font.bodySmall,
                        color: pm.change >= 0 ? palette.green[800] : '#DC2626',
                      }}
                    >
                      Tiền thối lại:
                    </Text>
                  </View>
                  <Text
                    style={{
                      ...font.sectionTitle,
                      color: pm.change >= 0 ? '#16A34A' : '#DC2626',
                    }}
                  >
                    {pm.change >= 0
                      ? formatPriceFull(pm.change)
                      : `Thiếu ${formatPriceFull(Math.abs(pm.change))}`}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 14 }}>
                  <TouchableOpacity
                    onPress={() => pm.setCashInput(String(total))}
                    style={{
                      flex: 1.2,
                      minWidth: 100,
                      height: 48,
                      justifyContent: 'center',
                      borderRadius: 8,
                      backgroundColor: '#F97316',
                      borderWidth: 1.5,
                      borderColor: colors.border.brand,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ ...font.caption, color: '#F97316' }}>Đúng tiền</Text>
                    <Text style={{ ...font.badge, fontWeight: '600', color: '#F97316' }}>
                      {formatPriceFull(total)}
                    </Text>
                  </TouchableOpacity>
                  {suggestions.map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      onPress={() => pm.setCashInput(String(amt))}
                      style={{
                        flex: 1,
                        minWidth: 80,
                        height: 48,
                        justifyContent: 'center',
                        borderRadius: 8,
                        backgroundColor: '#FAFAFA',
                        borderWidth: 1,
                        borderColor: '#E5E5E5',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ ...font.caption, color: colors.text.body }}>
                        {formatPriceFull(amt)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                <Text style={{ ...font.caption, color: '#737373', marginTop: 4, letterSpacing: 2 }}>
                  •••• 4242
                </Text>
              </View>
              <Text style={{ ...font.sectionTitle, color: '#171717', textAlign: 'center' }}>
                Đang chờ quẹt thẻ
              </Text>
              <Text style={{ ...font.body, color: '#737373', textAlign: 'center' }}>
                Vui lòng đưa thẻ vào đầu đọc hoặc chạm thẻ lên màn hình.
              </Text>
              <Text style={{ ...font.pageTitle, color: '#F97316' }}>
                {formatPriceFull(total)}
              </Text>
              <ActivityIndicator size="small" color={'#F97316'} />
            </View>
          ) : pm.method === 'qr' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8}}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 12,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: '#E5E5E5',
                }}
              >
                <Icon name="qrcode-scan" size={90} color={'#171717'} />
              </View>
              <Text style={{ ...font.sectionTitle, color: '#171717', textAlign: 'center' }}>
                Quét mã QR để thanh toán
              </Text>
              <Text style={{ ...font.pageTitle, color: '#F97316' }}>
                {formatPriceFull(total)}
              </Text>
              <Text style={{ ...font.bodySmall, color: '#737373', textAlign: 'center' }}>
                Sử dụng app ngân hàng hoặc ví điện tử quét mã trên.
              </Text>
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
              <Text style={{ ...font.sectionTitle, color: '#171717', textAlign: 'center' }}>
                Chuyển khoản ngân hàng
              </Text>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 12,
                  width: '100%',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: '#737373' }}>Ngân hàng</Text>
                  <Text style={{ ...font.caption, fontWeight: '600', color: '#171717' }}>
                    MB Bank
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: '#737373' }}>Số tài khoản</Text>
                  <Text style={{ ...font.caption, fontWeight: '600', color: '#171717' }}>
                    0987654321
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: '#737373' }}>Chủ tài khoản</Text>
                  <Text style={{ ...font.caption, fontWeight: '600', color: '#171717' }}>
                    NGUYEN VAN A
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: '#737373' }}>Số tiền</Text>
                  <Text style={{ ...font.caption, fontWeight: '600', color: '#F97316' }}>
                    {formatPriceFull(total)}
                  </Text>
                </View>
              </View>
              <Text style={{ ...font.sectionTitle, color: '#171717', textAlign: 'center' }}>
                Nội dung chuyển khoản
              </Text>
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
                <Text
                  style={{
                    ...font.body,
                    fontWeight: '600',
                    color: '#F97316',
                    textAlign: 'center',
                  }}
                >
                  TT {tableName} #{orderId?.slice(-6)}
                </Text>
              </View>
            </View>
          )}
          <Numpad method={pm.method} onKey={pm.handleKey} />
        </View>
        <TouchableOpacity
          onPress={() => {
            pm.handlePay();
          }}
          disabled={!pm.canPay || pm.paying}
          style={{
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: !pm.canPay || pm.paying ? disabledBg : '#16A34A',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 16,
            marginTop: 16,
          }}
        >
          {pm.paying ? (
            <ActivityIndicator
              size="small"
              color={pm.canPay ? colors.text.inverse : disabledText}
            />
          ) : (
            <Icon
              name="check-circle"
              size={22}
              color={!pm.canPay || pm.paying ? disabledText : colors.text.inverse}
            />
          )}
          <Text
            style={{
              ...font.sectionTitle,
              color: !pm.canPay || pm.paying ? disabledText : colors.text.inverse,
            }}
          >
            {pm.paying ? 'Đang xử lý...' : 'Hoàn tất thanh toán'}
          </Text>
        </TouchableOpacity>
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
          paddingHorizontal: 4,
          paddingVertical: 8,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0',
          gap: 12,
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
                paddingVertical: 32,
                borderRadius: 8,
                backgroundColor: sel ? '#F97316' : '#F5F5F5',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 12,
              }}
            >
              <Icon
                name={tabIcons[t] as any}
                size={18}
                color={sel ? colors.text.inverse : '#404040'}
              />
              <Text
                style={{
                  ...font.bodyBold,
                  color: sel ? colors.text.inverse : '#404040',
                }}
              >
                {tabLabels[t]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab: Invoice detail */}
      {mobileTab === 'invoice' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 8, gap: 8, flexGrow: 1 }}
        >
          <OrderItemsList items={pm.orderItems} />
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...font.bodySmall, color: '#404040' }}>Tạm tính</Text>
              <Text style={{ ...font.bodySmall, fontWeight: '600', color: '#171717' }}>
                {formatPriceFull(total)}
              </Text>
            </View>
            {pm.vatAmount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ ...font.bodySmall, color: '#404040' }}>
                  Thuế VAT (đã gồm)
                </Text>
                <Text
                  style={{ ...font.bodySmall, fontWeight: '600', color: '#404040' }}
                >
                  {formatPriceFull(pm.vatAmount)}
                </Text>
              </View>
            )}
            <View style={{ height: 1, backgroundColor: '#F0F0F0', marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...font.bodyBold, color: '#171717' }}>Tổng cộng</Text>
              <Text style={{ ...font.priceLarge, color: '#F97316' }}>
                {formatPriceFull(total)}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Tab: Payment */}
      {mobileTab === 'payment' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4, gap: 8, flexGrow: 1 }}
        >
          {/* Payment methods 2x2 grid */}
          <Text
            style={{
              ...font.label,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: '#737373',
            }}
          >
            Phương thức thanh toán
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16}}>
            {PAY_METHODS.map((m) => {
              const sel = pm.method === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => pm.setMethod(m.id)}
                  style={{
                    width: '48%',
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: sel ? m.bg : '#FFFFFF',
                    borderWidth: 2,
                    borderColor: sel ? m.color : '#E5E5E5',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      backgroundColor: sel ? m.color + '20' : '#F5F5F5',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      name={m.icon as any}
                      size={24}
                      color={sel ? m.color : colors.icon.muted}
                    />
                  </View>
                  <Text
                    style={{
                      ...font.bodySmall,
                      fontWeight: '600',
                      color: sel ? m.color : '#737373',
                      textAlign: 'center',
                    }}
                  >
                    {m.label}
                  </Text>
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

          {/* Cash — smartSuggestions replacing Numpad */}
          {pm.method === 'tien_mat' && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E5E5E5',
                gap: 32,
              }}
            >
              <View
                style={{
                  backgroundColor: '#FAFAFA',
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}
              >
                <Text
                  style={{
                    ...font.priceLarge,
                    color: pm.cashInput ? '#171717' : colors.text.placeholder,
                  }}
                >
                  {pm.cashInput ? formatPriceFull(pm.cash) : '0đ'}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: changeBg,
                  borderWidth: 1,
                  borderColor: changeBorder,
                }}
              >
                <Text
                  style={{
                    ...font.bodySmall,
                    fontWeight: '600',
                    color: pm.change >= 0 ? palette.green[800] : '#DC2626',
                  }}
                >
                  Tiền thối:
                </Text>
                <Text
                  style={{
                    ...font.bodyBold,
                    color: pm.change >= 0 ? '#16A34A' : '#DC2626',
                  }}
                >
                  {pm.change >= 0
                    ? formatPriceFull(pm.change)
                    : `Thiếu ${formatPriceFull(Math.abs(pm.change))}`}
                </Text>
              </View>
              <Text style={{ ...font.caption, color: '#737373' }}>
                Chọn số tiền khách đưa:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
                {pm.smartSuggestions.slice(0, 6).map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => pm.setCashInput(String(amt))}
                    style={{
                      flex: 1,
                      minWidth: '30%',
                      height: 44,
                      borderRadius: 8,
                      backgroundColor:
                        pm.cash === amt ? '#F97316' : '#FAFAFA',
                      borderWidth: pm.cash === amt ? 1.5 : 1,
                      borderColor: pm.cash === amt ? '#F97316' : '#E5E5E5',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        ...font.bodySmall,
                        fontWeight: '600',
                        color: pm.cash === amt ? '#F97316' : '#171717',
                      }}
                    >
                      {formatPriceFull(amt)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Card reader */}
          {pm.method === 'card' && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                padding: 20,
                borderWidth: 1,
                borderColor: '#E5E5E5',
                gap: 8,
                alignItems: 'center',
              }}
            >
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
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5E5E5',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: '#E5E5E5',
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                }}
              >
                <Icon name="qrcode-scan" size={100} color={'#171717'} />
              </View>
              <Text style={{ ...font.sectionTitle, color: '#171717' }}>
                Quét mã QR để thanh toán
              </Text>
              <Text style={{ ...font.priceLarge, color: '#F97316' }}>
                {formatPriceFull(total)}
              </Text>
            </View>
          )}

          {/* Bank transfer with QR mockup */}
          {pm.method === 'chuyen_khoan' && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 8,
                padding: 16,
                borderWidth: 1,
                borderColor: '#E5E5E5',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: '#E5E5E5',
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                }}
              >
                <Icon name="qrcode-scan" size={100} color={'#171717'} />
              </View>
              <View style={{ width: '100%', gap: 12}}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: '#737373' }}>Ngân hàng</Text>
                  <Text style={{ ...font.caption, fontWeight: '600', color: '#171717' }}>
                    MB Bank
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: '#737373' }}>Số tài khoản</Text>
                  <Text style={{ ...font.caption, fontWeight: '600', color: '#171717' }}>
                    0987654321
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: '#737373' }}>Số tiền</Text>
                  <Text style={{ ...font.caption, fontWeight: '600', color: '#F97316' }}>
                    {formatPriceFull(total)}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  backgroundColor: '#F97316',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: colors.border.brand,
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    ...font.bodySmall,
                    fontWeight: '600',
                    color: '#F97316',
                    textAlign: 'center',
                  }}
                >
                  TT {tableName} #{orderId?.slice(-6)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Pay button (always visible) */}
      {mobileTab === 'payment' && (
        <View style={{ paddingHorizontal: 4, paddingBottom: 8, paddingTop: 2 }}>
          <TouchableOpacity
            onPress={() => {
              pm.handlePay();
            }}
            disabled={!pm.canPay || pm.paying}
            style={{
              paddingVertical: 12,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: !pm.canPay || pm.paying ? disabledBg : '#16A34A',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            {pm.paying ? (
              <ActivityIndicator
                size="small"
                color={!pm.canPay ? disabledText : colors.text.inverse}
              />
            ) : (
              <Icon
                name="check-circle"
                size={22}
                color={!pm.canPay || pm.paying ? disabledText : colors.text.inverse}
              />
            )}
            <Text
              style={{ ...(isWide ? font.bodyBold : font.buttonSmall), color: '#fff' }}
            >
              {pm.paying ? 'Đang xử lý...' : 'Hoàn tất thanh toán'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const btnSize = isWide ? 40 : 36;

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
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
            <Text
              style={{ ...(isWide ? font.bodyBold : font.buttonSmall), color: '#fff' }}
            >
              {formatPriceFull(total)}
            </Text>
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
              <Text style={{ ...font.body, fontWeight: '600', color: palette.red[800] }}>
                Thiếu ID đơn hàng
              </Text>
              <Text style={{ ...font.bodySmall, color: '#DC2626', marginTop: 2 }}>
                Không thể tiếp tục thanh toán vì chưa tạo được đơn hàng trên hệ thống.
              </Text>
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
              <Text style={{ ...font.caption, color: colors.text.inverse }}>Quay lại</Text>
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
