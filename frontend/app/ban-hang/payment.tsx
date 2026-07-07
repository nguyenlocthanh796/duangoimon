import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, palette, formatPrice, formatPriceFull } from '../../lib/theme/colors';
import { font } from '../../lib/theme/typography';
import { shape } from '../../lib/theme/shape';
import { useSidebar } from '../../lib/context/SidebarContext';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { usePayment, PAY_METHODS, QUICK_AMOUNTS } from '../../lib/hooks/usePayment';
import Numpad from '../../lib/components/payment/Numpad';
import PaymentSuccessScreen from '../../lib/components/payment/PaymentSuccessScreen';
import { generateReceiptHTML } from '../../lib/components/payment/receipt';
import SplitBillToggle from '../../lib/components/payment/SplitBillToggle';
import OrderItemsList from '../../lib/components/payment/OrderItemsList';

export default function PaymentScreen() {
  const { tableId, tableName, total: totalStr, orderId } = useLocalSearchParams<{
    tableId: string; tableName: string; total: string; orderId: string;
  }>();
  const total = Number(totalStr || '0');
  const { openSidebar } = useSidebar();
  const { isWide } = useResponsive();

  const [splits, setSplits] = useState<{ method: string; amount: number }[]>([]);
  const [showSplitter, setShowSplitter] = useState(false);

  const pm = usePayment({ tableId: tableId || '', tableName: tableName || '', total, orderId: orderId || '' });

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

  const changeBg = pm.change >= 0 ? colors.status.successBg : colors.surface.danger;
  const changeBorder = pm.change >= 0 ? palette.green[350] : colors.border.danger;
  const disabledBg = colors.surface.disabled;
  const disabledText = colors.text.muted;

  // iPad split layout
  const iPadView = (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ flex: 65, borderRightWidth: 1, borderColor: colors.border.default, padding: 16, gap: 16 }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, gap: 16 }}>
            <View style={{ backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 16, borderWidth: 1, borderColor: colors.border.default }}>
              <Text style={{ ...font.tab, textTransform: 'uppercase', letterSpacing: 1, color: colors.text.muted, marginBottom: 12 }}>Tóm tắt đơn hàng</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ ...font.body, color: colors.text.body }}>Tên bàn</Text>
                <Text style={{ ...font.body, fontWeight: '700', color: colors.text.primary }}>{tableName}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: colors.surface.disabled, marginVertical: 8 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...font.body, fontWeight: '700', color: colors.text.primary }}>Tổng thanh toán</Text>
                <Text style={{ ...font.h1, fontSize: 24, color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
              </View>
            </View>
            <View>
              <Text style={{ ...font.tab, textTransform: 'uppercase', letterSpacing: 1, color: colors.text.muted, marginBottom: 10 }}>Phương thức thanh toán</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PAY_METHODS.map(m => {
                  const sel = pm.method === m.id;
                  return (
                    <TouchableOpacity key={m.id} onPress={() => pm.setMethod(m.id)}
                      style={{ width: '47%', paddingVertical: 14, borderRadius: shape.radius.md, backgroundColor: sel ? m.bg : colors.surface.card, borderWidth: 2, borderColor: sel ? m.color : colors.border.default, alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 40, height: 40, borderRadius: shape.radius.md, backgroundColor: sel ? m.color + '20' : colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={m.icon as any} size={22} color={sel ? m.color : colors.icon.muted} />
                      </View>
                      <Text style={{ ...font.tab, color: sel ? m.color : colors.text.muted, textAlign: 'center' }}>{m.label}</Text>
                      {sel && (
                        <View style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 2, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="check" size={12} color={colors.text.inverse} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 16, borderWidth: 1, borderColor: colors.border.default }}>
            {pm.method === 'tien_mat' || pm.method === 'card' ? (
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.tab, color: colors.text.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Chi tiết món ăn</Text>
                {pm.orderItems.length > 0 ? (
                  <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {pm.orderItems.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border.light }}>
                        <Text style={{ ...font.bodySmall, color: colors.text.primary, flex: 1 }} numberOfLines={1}>{item.quantity}x {item.product_name}</Text>
                        <Text style={{ ...font.bodySmall, color: colors.text.secondary }}>{formatPriceFull(item.unit_price * item.quantity)}</Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Icon name="file-document-outline" size={24} color={colors.icon.muted} />
                    <Text style={{ ...font.caption, color: colors.text.muted }}>Không có chi tiết món ăn</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                <View style={{ width: 140, height: 140, borderRadius: shape.radius.md, borderWidth: 1.5, borderColor: colors.border.default, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                  <Icon name="qrcode-scan" size={100} color={colors.text.primary} />
                </View>
                <Text style={{ ...font.h3, color: colors.text.primary, textAlign: 'center' }}>Quét mã QR để thanh toán</Text>
                <View style={{ gap: 6, width: '100%', marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ ...font.caption, color: colors.text.muted }}>Ngân hàng</Text>
                    <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.primary }}>MB Bank</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 }}>
                    <Text style={{ ...font.caption, color: colors.text.muted }}>Số tài khoản</Text>
                    <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.primary }}>0987654321</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ ...font.caption, color: colors.text.muted }}>Số tiền</Text>
                    <Text style={{ ...font.caption, fontWeight: '700', color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={{ flex: 35, backgroundColor: colors.surface.card, padding: 16 }}>
        <View style={{ flex: 1 }}>
          {pm.method === 'tien_mat' ? (
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.tab, textTransform: 'uppercase', letterSpacing: 1, color: colors.text.muted, marginBottom: 12 }}>Nhập tiền khách đưa</Text>
                <View style={{ backgroundColor: colors.surface.app, borderRadius: shape.radius.md, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border.default }}>
                  <Text style={{ ...font.h1, fontSize: 36, color: pm.cashInput ? colors.text.primary : colors.text.placeholder }}>
                    {pm.cashInput ? formatPriceFull(pm.cash) : '0đ'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: shape.radius.md, backgroundColor: changeBg, marginBottom: 14, borderWidth: 1, borderColor: changeBorder }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name={pm.change >= 0 ? 'check-circle' : 'alert-circle'} size={16} color={pm.change >= 0 ? colors.status.success : colors.status.danger} />
                    <Text style={{ ...font.bodySmall, color: pm.change >= 0 ? palette.green[800] : colors.status.danger }}>Tiền thối lại:</Text>
                  </View>
                  <Text style={{ ...font.h2, color: pm.change >= 0 ? colors.status.success : colors.status.danger }}>
                    {pm.change >= 0 ? formatPriceFull(pm.change) : `Thiếu ${formatPriceFull(Math.abs(pm.change))}`}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                  <TouchableOpacity onPress={() => pm.setCashInput(String(total))} style={{ flex: 1.2, height: 44, justifyContent: 'center', borderRadius: shape.radius.md, backgroundColor: colors.brand.primaryBg, borderWidth: 1.5, borderColor: colors.border.brand, alignItems: 'center' }}>
                    <Text style={{ ...font.caption, color: colors.brand.primary }}>Đúng tiền</Text>
                    <Text style={{ ...font.badge, color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
                  </TouchableOpacity>
                  {QUICK_AMOUNTS.map(amt => (
                    <TouchableOpacity key={amt} onPress={() => pm.setCashInput(String(amt))} style={{ flex: 1, height: 44, justifyContent: 'center', borderRadius: shape.radius.md, backgroundColor: colors.surface.app, borderWidth: 1, borderColor: colors.border.default, alignItems: 'center' }}>
                      <Text style={{ ...font.caption, color: colors.text.body }}>{formatPriceFull(amt)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : pm.method === 'card' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <View style={{ width: 100, height: 64, borderRadius: 8, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="credit-card-chip" size={24} color="#FBBF24" />
                <Text style={{ fontSize: 8, color: '#94A3B8', marginTop: 4, letterSpacing: 2 }}>•••• 4242</Text>
              </View>
              <Text style={{ ...font.h2, color: colors.text.primary, textAlign: 'center' }}>Đang chờ quẹt thẻ</Text>
              <Text style={{ ...font.body, color: colors.text.muted, textAlign: 'center' }}>Vui lòng đưa thẻ vào đầu đọc hoặc chạm thẻ lên màn hình.</Text>
              <Text style={{ ...font.h1, color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
              <ActivityIndicator size="small" color={colors.brand.primary} />
            </View>
          ) : pm.method === 'qr' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <View style={{ width: 120, height: 120, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border.default }}>
                <Icon name="qrcode-scan" size={90} color={colors.text.primary} />
              </View>
              <Text style={{ ...font.h2, color: colors.text.primary, textAlign: 'center' }}>Quét mã QR để thanh toán</Text>
              <Text style={{ ...font.h1, color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
              <Text style={{ ...font.bodySmall, color: colors.text.muted, textAlign: 'center' }}>Sử dụng app ngân hàng hoặc ví điện tử quét mã trên.</Text>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bank-transfer" size={40} color="#E11D48" />
              </View>
              <Text style={{ ...font.h2, color: colors.text.primary, textAlign: 'center' }}>Chuyển khoản ngân hàng</Text>
              <View style={{ backgroundColor: colors.surface.card, borderRadius: 8, padding: 12, width: '100%', borderWidth: 1, borderColor: colors.border.default, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Ngân hàng</Text>
                  <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.primary }}>MB Bank</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Số tài khoản</Text>
                  <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.primary }}>0987654321</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Chủ tài khoản</Text>
                  <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.primary }}>NGUYEN VAN A</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ ...font.caption, color: colors.text.muted }}>Số tiền</Text>
                  <Text style={{ ...font.caption, fontWeight: '700', color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
                </View>
              </View>
              <Text style={{ ...font.h3, color: colors.text.primary, textAlign: 'center' }}>Nội dung chuyển khoản</Text>
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: shape.radius.md, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border.brand }}>
                <Text style={{ ...font.body, fontWeight: '700', color: colors.brand.primary, textAlign: 'center' }}>TT {tableName} #{orderId?.slice(-6)}</Text>
              </View>
            </View>
          )}
          <Numpad method={pm.method} onKey={pm.handleKey} />
        </View>
        <TouchableOpacity onPress={() => { pm.handlePay(); }} disabled={!pm.canPay || pm.paying}
          style={{ paddingVertical: 16, borderRadius: shape.radius.md, alignItems: 'center', backgroundColor: !pm.canPay || pm.paying ? disabledBg : colors.status.success, flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {pm.paying ? <ActivityIndicator size="small" color={pm.canPay ? colors.text.inverse : disabledText} /> : <Icon name="check-circle" size={22} color={!pm.canPay || pm.paying ? disabledText : colors.text.inverse} />}
          <Text style={{ ...font.h3, color: !pm.canPay || pm.paying ? disabledText : colors.text.inverse }}>{pm.paying ? 'Đang xử lý...' : 'Hoàn tất thanh toán'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // iPhone compact layout — everything locked
  const iPhoneView = (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, gap: 12, flexGrow: 1 }}>
        <OrderItemsList items={pm.orderItems} />
        <View style={{ flex: 1 }} />
      </ScrollView>
      <View style={{ paddingHorizontal: 4, gap: 8, marginBottom: 2 }}>
        <View>
          <Text style={{ ...font.badge, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.text.muted, marginBottom: 6 }}>Phương thức thanh toán</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {PAY_METHODS.map(m => {
              const sel = pm.method === m.id;
              return (
                <TouchableOpacity key={m.id} onPress={() => pm.setMethod(m.id)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: shape.radius.md, backgroundColor: sel ? colors.brand.primary : colors.surface.card, borderWidth: 1.5, borderColor: sel ? colors.brand.primary : colors.border.default, alignItems: 'center', justifyContent: 'center', gap: shape.spacing.sm }}>
                  <Icon name={m.icon as any} size={18} color={sel ? colors.text.inverse : colors.icon.muted} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: sel ? colors.text.inverse : colors.text.secondary }}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        {pm.method === 'tien_mat' ? (
          <View style={{ gap: 8 }}>
            <View style={{ backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 10, borderWidth: 1, borderColor: colors.border.default, gap: 8 }}>
              <Text style={{ ...font.badge, textTransform: 'uppercase', letterSpacing: 0.5, color: colors.text.muted }}>Nhập tiền khách đưa</Text>
              <View style={{ backgroundColor: colors.surface.app, borderRadius: shape.radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border.default }}>
                <Text style={{ ...font.h2, fontSize: 26, color: pm.cashInput ? colors.text.primary : colors.text.placeholder }}>{pm.cashInput ? formatPriceFull(pm.cash) : '0đ'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: shape.radius.md, backgroundColor: changeBg, borderWidth: 1, borderColor: changeBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name={pm.change >= 0 ? 'check-circle' : 'alert-circle'} size={14} color={pm.change >= 0 ? colors.status.success : colors.status.danger} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: pm.change >= 0 ? palette.green[800] : colors.status.danger }}>Tiền thối:</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: pm.change >= 0 ? colors.status.success : colors.status.danger }}>
                  {pm.change >= 0 ? formatPriceFull(pm.change) : `Thiếu ${formatPriceFull(Math.abs(pm.change))}`}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {pm.smartSuggestions.slice(0, 4).map(amt => (
                <TouchableOpacity key={amt} onPress={() => pm.setCashInput(String(amt))}
                  style={{ flex: 1, height: 38, borderRadius: shape.radius.md, backgroundColor: pm.cash === amt ? colors.brand.primaryBg : colors.surface.card, borderWidth: pm.cash === amt ? 1.5 : 1, borderColor: pm.cash === amt ? colors.brand.primary : colors.border.default, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: pm.cash === amt ? colors.brand.primary : colors.text.primary }}>{formatPriceFull(amt)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : pm.method === 'card' ? (
          <View style={{ backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 10, borderWidth: 1, borderColor: colors.border.default, gap: 8, alignItems: 'center' }}>
            <View style={{ width: 60, height: 40, borderRadius: 6, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="credit-card-chip" size={16} color="#FBBF24" />
            </View>
            <Text style={{ ...font.body, fontWeight: '700', color: colors.text.primary }}>Đang chờ quẹt thẻ</Text>
            <ActivityIndicator size="small" color={colors.brand.primary} />
          </View>
        ) : pm.method === 'qr' ? (
          <View style={{ backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 10, borderWidth: 1, borderColor: colors.border.default, gap: 8, alignItems: 'center' }}>
            <Icon name="qrcode-scan" size={48} color={colors.text.primary} />
            <Text style={{ ...font.body, fontWeight: '700', color: colors.text.primary }}>Quét mã QR để thanh toán</Text>
            <Text style={{ ...font.h2, color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.surface.card, borderRadius: shape.radius.md, padding: 10, borderWidth: 1, borderColor: colors.border.default, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...font.caption, color: colors.text.muted }}>Ngân hàng</Text>
              <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.primary }}>MB Bank</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...font.caption, color: colors.text.muted }}>Số tài khoản</Text>
              <Text style={{ ...font.caption, fontWeight: '700', color: colors.text.primary }}>0987654321</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...font.caption, color: colors.text.muted }}>Số tiền</Text>
              <Text style={{ ...font.caption, fontWeight: '700', color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
            </View>
            <View style={{ backgroundColor: '#FFF7ED', borderRadius: shape.radius.md, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border.brand, marginTop: 4 }}>
              <Text style={{ ...font.caption, fontWeight: '700', color: colors.brand.primary, textAlign: 'center', fontSize: 10 }}>TT {tableName} #{orderId?.slice(-6)}</Text>
            </View>
          </View>
        )}
        <TouchableOpacity onPress={() => { pm.handlePay(); }} disabled={!pm.canPay || pm.paying}
          style={{ paddingVertical: 14, borderRadius: shape.radius.md, alignItems: 'center', backgroundColor: !pm.canPay || pm.paying ? disabledBg : colors.status.success, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {pm.paying ? <ActivityIndicator size="small" color={!pm.canPay ? disabledText : colors.text.inverse} /> : <Icon name="check-circle" size={18} color={!pm.canPay || pm.paying ? disabledText : colors.text.inverse} />}
          <Text style={{ fontSize: 14, fontWeight: '700', color: !pm.canPay || pm.paying ? disabledText : colors.text.inverse }}>{pm.paying ? 'Đang xử lý...' : 'Hoàn tất thanh toán'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>
      <View style={{ paddingHorizontal: 12, paddingVertical: 12, backgroundColor: colors.surface.card, borderBottomWidth: 1, borderBottomColor: colors.border.default, flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 10 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: shape.radius.md, backgroundColor: colors.surface.disabled, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-left" size={18} color={colors.icon.default} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ ...font.h3, color: colors.text.primary }}>Thanh toán · {tableName}</Text>
          <Text style={{ ...font.label, color: colors.text.muted }}>Order #{orderId?.slice(-6) || '—'}</Text>
        </View>
        <View style={{ backgroundColor: colors.brand.primaryBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: shape.radius.md, borderWidth: 1, borderColor: colors.border.brand }}>
          <Text style={{ ...font.body, fontWeight: '900', color: colors.brand.primary }}>{formatPriceFull(total)}</Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {!orderId && (
          <View style={{ margin: 16, backgroundColor: colors.surface.danger, borderColor: palette.red[300], borderWidth: 1.5, borderRadius: 4, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="alert-circle" size={24} color={colors.status.danger} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...font.body, fontWeight: '700', color: palette.red[800] }}>Thiếu ID đơn hàng</Text>
              <Text style={{ ...font.tab, color: colors.status.danger, marginTop: 2 }}>Không thể tiếp tục thanh toán vì chưa tạo được đơn hàng trên hệ thống.</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: colors.status.danger, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 }}>
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
    </SafeAreaView>
  );
}
