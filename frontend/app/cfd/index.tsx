import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { AppText } from '../../lib/components/ui/AppText';
import { AppHeader } from '../../lib/components/ui/AppHeader';
import { usePOSStore, useStoreSettings } from '../../lib/store/usePOSStore';
import { formatCurrency } from '../../lib/utils/format';
import { VietQROffline } from '../../lib/components/pos/VietQROffline';
import { generateMBSoundboxDynamicQR } from '../../lib/utils/vietqrParser';
import { getPublicBillUrl } from '../../lib/api/apiClient';

const EMPTY_CART: any[] = [];

// Helper tra cứu BIN ngân hàng chuẩn VietQR
const getBankBin = (codeOrName: string) => {
  const n = (codeOrName || '').toUpperCase();
  if (n.includes('MB') || n === '970422') return '970422';
  if (n.includes('VCB') || n.includes('VIETCOM') || n === '970436') return '970436';
  if (n.includes('CTG') || n.includes('VIETIN') || n === '970415') return '970415';
  if (n.includes('TCB') || n.includes('TECHCOM') || n === '970407') return '970407';
  if (n.includes('BIDV') || n === '970418') return '970418';
  if (n.includes('ACB') || n === '970416') return '970416';
  if (n.includes('VPB') || n.includes('VPBANK') || n === '970432') return '970432';
  if (n.includes('TPB') || n.includes('TPBANK') || n === '970458') return '970458';
  if (n.includes('STB') || n.includes('SACOM') || n === '970403') return '970403';
  if (n.includes('HDB') || n.includes('HDBANK') || n === '970437') return '970437';
  return '970422';
};

// Chuẩn hóa nội dung chuyển khoản Napas247 không dấu tiếng Việt
const formatTransferContent = (tableName: string) => {
  const clean = (tableName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return clean ? `TT ${clean}` : 'TT POS';
};

const CfdClock = React.memo(() => {
  const { theme } = useTheme();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={s.clockRow}>
      <Icon name="clock-outline" size={15} color={theme.brand.accent} />
      <AppText variant="sm" weight="bold" tabularNums color={theme.text.primary} style={{ marginLeft: 4 }}>
        {clock.toLocaleTimeString('vi-VN')}
      </AppText>
    </View>
  );
});

export default function CFDScreen() {
  const { theme, isDark } = useTheme();
  const { isWide, isLandscape, width } = useResponsive();
  const insets = useSafeAreaInsets();
  const storeSettings = useStoreSettings();

  const selectedTable = usePOSStore((st) => st.selectedTable);
  const tableCarts = usePOSStore((st) => st.tableCarts);
  const tableDiscounts = usePOSStore((st) => st.tableDiscounts);

  const [remoteCart, setRemoteCart] = useState<any[] | null>(null);
  const [remoteDiscount, setRemoteDiscount] = useState<any | null>(null);
  const [remoteTableName, setRemoteTableName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [paidSplash, setPaidSplash] = useState<{ visible: boolean; amount: number; orderCode?: string }>({
    visible: false,
    amount: 0,
  });

  const cart = remoteCart !== null ? remoteCart : ((selectedTable && tableCarts[selectedTable.id]) || EMPTY_CART);
  const discount = remoteDiscount !== null ? remoteDiscount : (selectedTable ? tableDiscounts[selectedTable.id] : undefined);
  const activeTableName = remoteTableName || selectedTable?.name || 'Mang Về / Tại Quầy';
  const hasItems = cart.length > 0;

  const { subTotal, discountAmount, total, totalQty } = useMemo(() => {
    const sub = cart.reduce((sum: number, item: any) => sum + (item.unitPrice || item.price || 0) * item.qty, 0);
    const qty = cart.reduce((sum: number, item: any) => sum + item.qty, 0);
    const disc = discount
      ? discount.type === 'percent'
        ? Math.round(sub * (discount.value / 100))
        : Math.min(discount.value, sub)
      : 0;
    return { subTotal: sub, discountAmount: disc, total: Math.max(0, sub - disc), totalQty: qty };
  }, [cart, discount]);

  // Lắng nghe đồng bộ realtime từ WebSocket Hub (/ws/pos)
  useEffect(() => {
    try {
      const { wsClient } = require('../../lib/api/wsClient');
      wsClient.connect();
      const unsubscribe = wsClient.subscribe((event: any) => {
        if (event.type === 'cfd_cart_sync' && event.data) {
          if (Array.isArray(event.data.cart)) setRemoteCart(event.data.cart);
          if (event.data.discount !== undefined) setRemoteDiscount(event.data.discount);
          if (event.data.tableName) setRemoteTableName(event.data.tableName);
        } else if (event.type === 'order_paid') {
          const currentTotal = event.data?.total || total;
          const code = event.data?.order_code || event.data?.orderCode || '';
          setPaidSplash({ visible: true, amount: currentTotal, orderCode: code });
          setTimeout(() => {
            setPaidSplash({ visible: false, amount: 0 });
            setRemoteCart([]);
            setRemoteDiscount(null);
            setRemoteTableName(null);
          }, 5500);
        } else if (event.type === 'connection_status') {
          setIsConnected(event.status === 'connected');
        }
      });
      return () => unsubscribe();
    } catch (_) {}
  }, [total]);

  // Cấu hình thông tin ngân hàng & mã VietQR động
  const bankName = storeSettings.bankName || 'Ngân Hàng';
  const bankBin = useMemo(() => getBankBin(storeSettings.bankCode || bankName), [storeSettings.bankCode, bankName]);
  const accountNo = storeSettings.accountNumber || '';
  const accountName = storeSettings.accountHolder || storeSettings.storeName || '';
  const qrTransferContent = useMemo(() => formatTransferContent(activeTableName), [activeTableName]);

  const isSoundboxActive = Boolean(
    storeSettings.mbSoundboxEnabled && (storeSettings.mbMerchantId || storeSettings.mbSoundboxId)
  );

  const mbSoundboxPayload = useMemo(() => {
    if (!isSoundboxActive) return '';
    return generateMBSoundboxDynamicQR({
      merchantId: storeSettings.mbMerchantId,
      accountNo: accountNo,
      bankBin: bankBin,
      soundboxId: storeSettings.mbSoundboxId,
      refPrefix: storeSettings.mbRefPrefix || 'HD',
      amount: total,
      orderCode: activeTableName,
      isDynamic: true,
    });
  }, [isSoundboxActive, storeSettings.mbMerchantId, accountNo, bankBin, storeSettings.mbSoundboxId, storeSettings.mbRefPrefix, total, activeTableName]);

  const qrUrl = useMemo(
    () =>
      `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${total}&addInfo=${encodeURIComponent(qrTransferContent)}&accountName=${encodeURIComponent(accountName)}`,
    [bankBin, accountNo, accountName, total, qrTransferContent]
  );

  const wifiName = storeSettings.wifiName || storeSettings.storeName || 'ONGCHU POS';
  const wifiPass = storeSettings.wifiPassword || '88888888';
  const isSplitLayout = isWide || isLandscape || width >= 700;
  const bottomSafePadding = insets.bottom > 0 ? insets.bottom : 8;

  // =========================================================================
  // 🌟 STATE 1: MÀN HÌNH THANH TOÁN THÀNH CÔNG (PAID SPLASH)
  // =========================================================================
  if (paidSplash.visible) {
    return (
      <View style={[s.container, { backgroundColor: theme.surface.card }]}>
        <View style={s.splashBody}>
          <Icon name="check-decagram" size={88} color={theme.brand.accent} />
          <AppText variant="display" weight="bold" color={theme.text.primary} style={{ marginTop: 20 }}>
            THANH TOÁN THÀNH CÔNG
          </AppText>
          <AppText variant="md" color={theme.text.muted} style={{ marginTop: 6 }}>
            Cảm ơn Quý Khách đã ủng hộ quán!
          </AppText>

          {paidSplash.amount > 0 && (
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <AppText variant="xs" color={theme.text.muted}>
                TỔNG TIỀN ĐÃ THANH TOÁN
              </AppText>
              <AppText variant="display" weight="bold" color={theme.brand.accent} tabularNums style={{ marginTop: 4 }}>
                {formatCurrency(paidSplash.amount)} đ
              </AppText>
            </View>
          )}

          {/* QR Code Hóa đơn điện tử để khách quét mang về */}
          <View
            style={{
              marginTop: 18,
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border.subtle,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Image
              source={{
                uri: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  getPublicBillUrl(paidSplash.orderCode || 'HD-001')
                )}`,
              }}
              style={{ width: 140, height: 140 }}
              resizeMode="contain"
            />
            <AppText variant="xs" weight="bold" color={theme.text.primary} style={{ marginTop: 6 }}>
              Quét mã để lưu Hóa Đơn Điện Tử
            </AppText>
          </View>

          <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 20 }}>
            Chúc Quý Khách ngon miệng & hẹn gặp lại!
          </AppText>
        </View>
      </View>
    );
  }

  // =========================================================================
  // 🌟 STATE 2: MÀN HÌNH CHỜ (STANDBY / IDLE KIOSK STATE)
  // =========================================================================
  if (!hasItems) {
    return (
      <View style={[s.container, { backgroundColor: theme.surface.card }]}>
        <AppHeader
          title={storeSettings.storeName || 'HỆ THỐNG POS F&B'}
          subtitle={storeSettings.slogan || 'Màn hình khách hàng'}
          showBack={false}
          showHamburger={false}
          rightCustom={<CfdClock />}
        />

        {isSplitLayout ? (
          <View style={s.standbySplit}>
            {/* Cột trái: Lời chào + WiFi */}
            <View style={[s.standbyLeft, { borderRightColor: theme.border.subtle, borderRightWidth: StyleSheet.hairlineWidth }]}>
              <Icon name="storefront-outline" size={56} color={theme.brand.accent} />
              <AppText variant="lg" weight="bold" color={theme.text.primary} style={{ marginTop: 16, textAlign: 'center' }}>
                KÍNH CHÀO QUÝ KHÁCH!
              </AppText>
              <AppText variant="md" color={theme.text.muted} style={{ marginTop: 6, textAlign: 'center', maxWidth: 360 }}>
                {storeSettings.slogan || 'Hân hạnh được phục vụ Quý Khách. Đơn hàng sẽ hiển thị tại đây khi gọi món.'}
              </AppText>

              {/* Khối WiFi Phẳng */}
              <View style={[s.wifiRibbon, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 32 }]}>
                <Icon name="wifi" size={20} color={theme.brand.accent} />
                <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginLeft: 8 }}>
                  WiFi: {wifiName}
                </AppText>
                <AppText variant="sm" color={theme.text.muted} tabularNums style={{ marginLeft: 12 }}>
                  Mật khẩu: <AppText variant="sm" weight="bold" color={theme.brand.accent}>{wifiPass}</AppText>
                </AppText>
              </View>
            </View>

            {/* Cột phải: Mã QR thanh toán quán */}
            <View style={s.standbyRight}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                THANH TOÁN VIETQR NAPAS247
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                Quét mã chuyển khoản nhanh tại quầy
              </AppText>

              {isSoundboxActive ? (
                <View style={{ marginVertical: 14 }}>
                  <VietQROffline
                    bankBin={bankBin}
                    accountNo={accountNo || storeSettings.mbMerchantId || ''}
                    accountHolder={accountName}
                    amount={total}
                    orderCode={storeSettings.mbRefPrefix || 'HD'}
                    customPayload={mbSoundboxPayload}
                    isSoundbox={true}
                    soundboxId={storeSettings.mbSoundboxId}
                    size={220}
                  />
                </View>
              ) : (
                <Image
                  source={{ uri: qrUrl }}
                  style={{ width: 220, height: 220, marginVertical: 14 }}
                  resizeMode="contain"
                />
              )}

              <View style={[s.bankFlatList, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
                {isSoundboxActive && (
                  <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    <AppText variant="sm" color={theme.text.muted}>Loa Báo Có</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="speaker-wireless" size={14} color={theme.brand.accent} />
                      <AppText variant="sm" weight="bold" color={theme.brand.accent}>MB Bank Tự Động</AppText>
                    </View>
                  </View>
                )}
                <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <AppText variant="sm" color={theme.text.muted}>Ngân Hàng</AppText>
                  <AppText variant="md" weight="bold" color={theme.text.primary}>{bankName}</AppText>
                </View>
                <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <AppText variant="sm" color={theme.text.muted}>Số Tài Khoản</AppText>
                  <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>{accountNo}</AppText>
                </View>
                <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <AppText variant="sm" color={theme.text.muted}>Chủ Tài Khoản</AppText>
                  <AppText variant="sm" weight="bold" color={theme.text.primary} style={{ textTransform: 'uppercase' }}>{accountName}</AppText>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.standbyScroll, { paddingBottom: bottomSafePadding + 60 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Icon name="storefront-outline" size={48} color={theme.brand.accent} />
              <AppText variant="lg" weight="bold" color={theme.text.primary} style={{ marginTop: 12, textAlign: 'center' }}>
                KÍNH CHÀO QUÝ KHÁCH!
              </AppText>
              <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 4, textAlign: 'center' }}>
                {storeSettings.slogan || 'Đơn hàng sẽ hiển thị chi tiết tại đây khi gọi món'}
              </AppText>

              {/* WiFi Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
                <Icon name="wifi" size={16} color={theme.brand.accent} />
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  WiFi: {wifiName}
                </AppText>
                <AppText variant="sm" color={theme.text.muted} tabularNums>
                  · MK: <AppText variant="sm" weight="bold" color={theme.brand.accent}>{wifiPass}</AppText>
                </AppText>
              </View>
            </View>

            {/* VietQR Section */}
            <View style={[s.standbyQrMobile, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <AppText variant="md" weight="bold" color={theme.text.primary} style={{ textAlign: 'center' }}>
                QUÉT MÃ THANH TOÁN VIETQR
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', marginTop: 2 }}>
                Mở App Ngân hàng hoặc Ví điện tử bất kỳ
              </AppText>

              {isSoundboxActive ? (
                <View style={{ marginVertical: 12, alignSelf: 'center' }}>
                  <VietQROffline
                    bankBin={bankBin}
                    accountNo={accountNo || storeSettings.mbMerchantId || ''}
                    accountHolder={accountName}
                    amount={total}
                    orderCode={storeSettings.mbRefPrefix || 'HD'}
                    customPayload={mbSoundboxPayload}
                    isSoundbox={true}
                    soundboxId={storeSettings.mbSoundboxId}
                    size={190}
                  />
                </View>
              ) : (
                <Image
                  source={{ uri: qrUrl }}
                  style={{ width: 190, height: 190, alignSelf: 'center', marginVertical: 12 }}
                  resizeMode="contain"
                />
              )}

              <View style={[s.bankFlatList, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
                {isSoundboxActive && (
                  <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    <AppText variant="sm" color={theme.text.muted}>Loa Báo Có</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="speaker-wireless" size={14} color={theme.brand.accent} />
                      <AppText variant="sm" weight="bold" color={theme.brand.accent}>MB Bank Tự Động</AppText>
                    </View>
                  </View>
                )}
                <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <AppText variant="sm" color={theme.text.muted}>Ngân Hàng</AppText>
                  <AppText variant="md" weight="bold" color={theme.text.primary}>{bankName}</AppText>
                </View>
                <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <AppText variant="sm" color={theme.text.muted}>Số Tài Khoản</AppText>
                  <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>{accountNo}</AppText>
                </View>
                <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <AppText variant="sm" color={theme.text.muted}>Chủ Tài Khoản</AppText>
                  <AppText variant="sm" weight="bold" color={theme.text.primary} style={{ textTransform: 'uppercase' }}>{accountName}</AppText>
                </View>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Footer */}
        <View
          style={[
            s.cfdFooter,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              borderTopWidth: StyleSheet.hairlineWidth,
              paddingBottom: bottomSafePadding,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="heart-outline" size={14} color={theme.brand.accent} />
            <AppText variant="xs" color={theme.text.muted} style={{ marginLeft: 4 }}>
              Chúc Quý Khách Ngon Miệng!
            </AppText>
          </View>
          <View style={s.footerItem}>
            <View style={[s.statusDot, { backgroundColor: isConnected ? theme.brand.success : theme.brand.danger, marginRight: 6 }]} />
            <AppText variant="xs" color={theme.text.muted}>{isConnected ? 'Trực Tuyến' : 'Đang Kết Nối'}</AppText>
          </View>
        </View>
      </View>
    );
  }

  // =========================================================================
  // 🌟 STATE 3: MÀN HÌNH ĐANG CÓ ĐƠN HÀNG (ACTIVE CART & PAYMENT STATE)
  // =========================================================================
  return (
    <View style={[s.container, { backgroundColor: theme.surface.card }]}>
      <AppHeader
        title={storeSettings.storeName || 'HỆ THỐNG POS F&B'}
        subtitle={storeSettings.slogan || 'Màn hình khách hàng'}
        showBack={false}
        showHamburger={false}
        rightCustom={<CfdClock />}
      />

      {isSplitLayout ? (
        /* Landscape 2-Column Split (58% / 42%) */
        <View style={s.mainGrid}>
          {/* Cột trái: Đơn hàng & Hero Total */}
          <View style={[s.cartColumn, { borderRightColor: theme.border.subtle, borderRightWidth: StyleSheet.hairlineWidth }]}>
            <View style={[s.cartHeader, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={1}>
                  {activeTableName}
                </AppText>
                <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                  {cart.length} món · {totalQty} phần ăn & uống
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[s.statusDot, { backgroundColor: theme.brand.accent }]} />
                <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                  ĐANG GỌI MÓN
                </AppText>
              </View>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
              {cart.map((it: any, idx: number) => {
                const subDetailParts: string[] = [];
                if (it.selectedSize) subDetailParts.push(`Size ${it.selectedSize}`);
                if (it.sugarLevel && it.sugarLevel !== '100%') subDetailParts.push(`${it.sugarLevel} đường`);
                if (it.iceLevel && it.iceLevel !== '100%') subDetailParts.push(`${it.iceLevel} đá`);
                if (it.selectedToppings?.length) subDetailParts.push(`+${it.selectedToppings.length} topping`);
                if (it.note) subDetailParts.push(`Ghi chú: ${it.note}`);
                const itemTotal = (it.unitPrice || it.price || 0) * it.qty;

                return (
                  <View
                    key={it.cartItemId || `item_${idx}`}
                    style={[
                      s.itemRow,
                      {
                        borderBottomColor: theme.border.subtle,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        paddingVertical: 12,
                        paddingHorizontal: 20,
                      },
                    ]}
                  >
                    <View style={s.qtyWrap}>
                      <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
                        {it.qty}x
                      </AppText>
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={2}>
                        {it.item?.name || it.name}
                      </AppText>
                      {subDetailParts.length > 0 ? (
                        <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }} numberOfLines={2}>
                          {subDetailParts.join(' · ')}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                      {formatCurrency(itemTotal)} đ
                    </AppText>
                  </View>
                );
              })}
            </ScrollView>

            {/* Hero Total Dock */}
            <View style={[s.heroDock, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20 }]}>
              {discountAmount > 0 && (
                <View style={s.subTotalRow}>
                  <AppText variant="sm" color={theme.text.muted} tabularNums>
                    Tạm tính: {formatCurrency(subTotal)} đ
                  </AppText>
                  <AppText variant="sm" weight="bold" color={theme.brand.danger} tabularNums>
                    Ưu đãi: -{formatCurrency(discountAmount)} đ
                  </AppText>
                </View>
              )}
              <View style={s.totalRow}>
                <View>
                  <AppText variant="sm" weight="bold" color={theme.text.muted} style={{ letterSpacing: 0.5 }}>
                    TỔNG THANH TOÁN
                  </AppText>
                  <AppText variant="xxs" color={theme.text.muted} style={{ marginTop: 2 }}>
                    Đã bao gồm thuế & phí
                  </AppText>
                </View>
                <AppText variant="display" weight="bold" color={theme.brand.accent} tabularNums style={s.heroTotalText}>
                  {formatCurrency(total)} đ
                </AppText>
              </View>
            </View>
          </View>

          {/* Cột phải: VietQR Napas247 & Bank Flat Info */}
          <View style={[s.qrColumn, { paddingHorizontal: 24 }]}>
            <View style={s.qrTitleArea}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="qrcode-scan" size={20} color={theme.brand.accent} />
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  QUÉT MÃ VIETQR NAPAS247
                </AppText>
              </View>
              <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2, textAlign: 'center' }}>
                Mở App Ngân hàng hoặc Ví điện tử bất kỳ để quét
              </AppText>
            </View>

            {isSoundboxActive ? (
              <View style={{ marginVertical: 10 }}>
                <VietQROffline
                  bankBin={bankBin}
                  accountNo={accountNo || storeSettings.mbMerchantId || ''}
                  accountHolder={accountName}
                  amount={total}
                  orderCode={storeSettings.mbRefPrefix || 'HD'}
                  customPayload={mbSoundboxPayload}
                  isSoundbox={true}
                  soundboxId={storeSettings.mbSoundboxId}
                  size={220}
                />
              </View>
            ) : (
              <Image
                source={{ uri: qrUrl }}
                style={{ width: 220, height: 220, marginVertical: 10 }}
                resizeMode="contain"
              />
            )}

            <View style={[s.bankFlatList, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
              {isSoundboxActive && (
                <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <AppText variant="sm" color={theme.text.muted}>Loa Báo Có</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="speaker-wireless" size={14} color={theme.brand.accent} />
                    <AppText variant="sm" weight="bold" color={theme.brand.accent}>MB Bank Tự Động</AppText>
                  </View>
                </View>
              )}
              <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="sm" color={theme.text.muted}>Ngân Hàng</AppText>
                <AppText variant="md" weight="bold" color={theme.text.primary}>{bankName}</AppText>
              </View>
              <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="sm" color={theme.text.muted}>Số Tài Khoản</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>{accountNo}</AppText>
              </View>
              <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="sm" color={theme.text.muted}>Chủ Tài Khoản</AppText>
                <AppText variant="sm" weight="bold" color={theme.text.primary} style={{ textTransform: 'uppercase' }}>{accountName}</AppText>
              </View>
              <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="sm" color={theme.text.muted}>Nội dung CK</AppText>
                <AppText variant="sm" weight="bold" color={theme.brand.accent} tabularNums>{qrTransferContent}</AppText>
              </View>
            </View>

            <View style={s.bankSupportRow}>
              <Icon name="shield-check" size={14} color={theme.brand.success} />
              <AppText variant="xs" color={theme.text.muted} style={{ marginLeft: 6 }}>
                Hỗ trợ 40+ ngân hàng Việt Nam, MoMo, ZaloPay & VNPay
              </AppText>
            </View>
          </View>
        </View>
      ) : (
        /* Portrait (Mobile / Vertical Tablet) Flow */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: bottomSafePadding + 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bàn */}
          <View style={[s.cartHeader, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16 }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                {activeTableName}
              </AppText>
              <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                {cart.length} món · {totalQty} phần
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[s.statusDot, { backgroundColor: theme.brand.accent }]} />
              <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                ĐANG GỌI MÓN
              </AppText>
            </View>
          </View>

          {/* Danh sách món */}
          <View style={{ width: '100%' }}>
            {cart.map((it: any, idx: number) => {
              const subDetailParts: string[] = [];
              if (it.selectedSize) subDetailParts.push(`Size ${it.selectedSize}`);
              if (it.sugarLevel && it.sugarLevel !== '100%') subDetailParts.push(`${it.sugarLevel} đường`);
              if (it.iceLevel && it.iceLevel !== '100%') subDetailParts.push(`${it.iceLevel} đá`);
              if (it.selectedToppings?.length) subDetailParts.push(`+${it.selectedToppings.length} topping`);
              if (it.note) subDetailParts.push(`Ghi chú: ${it.note}`);
              const itemTotal = (it.unitPrice || it.price || 0) * it.qty;

              return (
                <View
                  key={it.cartItemId || `item_${idx}`}
                  style={[
                    s.itemRow,
                    {
                      borderBottomColor: theme.border.subtle,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                    },
                  ]}
                >
                  <View style={s.qtyWrap}>
                    <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
                      {it.qty}x
                    </AppText>
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <AppText variant="md" weight="bold" color={theme.text.primary} numberOfLines={2}>
                      {it.item?.name || it.name}
                    </AppText>
                    {subDetailParts.length > 0 ? (
                      <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }} numberOfLines={1}>
                        {subDetailParts.join(' · ')}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                    {formatCurrency(itemTotal)} đ
                  </AppText>
                </View>
              );
            })}
          </View>

          {/* Hero Total Dock */}
          <View style={[s.heroDock, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, backgroundColor: isDark ? theme.surface.header : theme.surface.app }]}>
            {discountAmount > 0 && (
              <View style={s.subTotalRow}>
                <AppText variant="sm" color={theme.text.muted} tabularNums>
                  Tạm tính: {formatCurrency(subTotal)} đ
                </AppText>
                <AppText variant="sm" weight="bold" color={theme.brand.danger} tabularNums>
                  Ưu đãi: -{formatCurrency(discountAmount)} đ
                </AppText>
              </View>
            )}
            <View style={s.totalRow}>
              <View>
                <AppText variant="sm" weight="bold" color={theme.text.muted}>
                  TỔNG THANH TOÁN
                </AppText>
                <AppText variant="xxs" color={theme.text.muted} style={{ marginTop: 2 }}>
                  Đã bao gồm thuế & phí
                </AppText>
              </View>
              <AppText variant="display" weight="bold" color={theme.brand.accent} tabularNums style={s.heroTotalText}>
                {formatCurrency(total)} đ
              </AppText>
            </View>
          </View>

          {/* VietQR & Thông tin ngân hàng */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              QUÉT MÃ VIETQR ĐỂ THANH TOÁN
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
              Mở App Ngân hàng hoặc Ví để quét
            </AppText>

            {isSoundboxActive ? (
              <View style={{ marginVertical: 10, alignSelf: 'center' }}>
                <VietQROffline
                  bankBin={bankBin}
                  accountNo={accountNo || storeSettings.mbMerchantId || ''}
                  accountHolder={accountName}
                  amount={total}
                  orderCode={storeSettings.mbRefPrefix || 'HD'}
                  customPayload={mbSoundboxPayload}
                  isSoundbox={true}
                  soundboxId={storeSettings.mbSoundboxId}
                  size={190}
                />
              </View>
            ) : (
              <Image
                source={{ uri: qrUrl }}
                style={{ width: 190, height: 190, marginVertical: 10 }}
                resizeMode="contain"
              />
            )}

            <View style={[s.bankFlatList, { borderTopColor: theme.border.subtle, borderTopWidth: StyleSheet.hairlineWidth }]}>
              {isSoundboxActive && (
                <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                  <AppText variant="sm" color={theme.text.muted}>Loa Báo Có</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="speaker-wireless" size={14} color={theme.brand.accent} />
                    <AppText variant="sm" weight="bold" color={theme.brand.accent}>MB Bank Tự Động</AppText>
                  </View>
                </View>
              )}
              <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="sm" color={theme.text.muted}>Ngân Hàng</AppText>
                <AppText variant="md" weight="bold" color={theme.text.primary}>{bankName}</AppText>
              </View>
              <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="sm" color={theme.text.muted}>Số Tài Khoản</AppText>
                <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>{accountNo}</AppText>
              </View>
              <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="sm" color={theme.text.muted}>Chủ Tài Khoản</AppText>
                <AppText variant="sm" weight="bold" color={theme.text.primary} style={{ textTransform: 'uppercase' }}>{accountName}</AppText>
              </View>
              <View style={[s.bankFlatRow, { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <AppText variant="sm" color={theme.text.muted}>Nội dung CK</AppText>
                <AppText variant="sm" weight="bold" color={theme.brand.accent} tabularNums>{qrTransferContent}</AppText>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Footer */}
      <View
        style={[
          s.cfdFooter,
          {
            backgroundColor: theme.surface.card,
            borderTopColor: theme.border.subtle,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingBottom: bottomSafePadding,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="wifi" size={14} color={theme.brand.accent} />
          <AppText variant="xs" color={theme.text.muted} numberOfLines={1} style={{ marginLeft: 4 }}>
            WiFi: <AppText variant="xs" weight="medium" color={theme.text.primary}>{wifiName}</AppText>
            {' · '}
            MK: <AppText variant="xs" weight="bold" color={theme.brand.accent}>{wifiPass}</AppText>
          </AppText>
        </View>

        <View style={s.footerItem}>
          <View style={[s.statusDot, { backgroundColor: isConnected ? theme.brand.success : theme.brand.danger, marginRight: 6 }]} />
          <AppText variant="xs" color={theme.text.muted}>{isConnected ? 'Trực Tuyến' : 'Đang Kết Nối'}</AppText>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  mainGrid: {
    flex: 1,
    flexDirection: 'row',
  },
  standbySplit: {
    flex: 1,
    flexDirection: 'row',
  },
  standbyLeft: {
    flex: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  standbyRight: {
    flex: 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  standbyScroll: {
    paddingHorizontal: 16,
  },
  standbyQrMobile: {
    paddingVertical: 16,
    width: '100%',
  },
  wifiRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
  },
  cartColumn: {
    flex: 6,
    flexDirection: 'column',
    height: '100%',
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyWrap: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDock: {
    paddingVertical: 14,
  },
  subTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTotalText: {
    letterSpacing: -0.5,
  },
  qrColumn: {
    flex: 4,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    height: '100%',
  },
  qrTitleArea: {
    alignItems: 'center',
    width: '100%',
  },
  bankFlatList: {
    width: '100%',
  },
  bankFlatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  bankSupportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cfdFooter: {
    minHeight: 44,
    paddingTop: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splashBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
