import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useTheme, lightTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import {
  useSelectedTable,
  useTableCart,
  useTableDiscount,
  useStoreSettings,
  usePOSActions,
  useCustomers,
  CustomerLoyalty,
  OrderHistoryItem,
  OrderAuditLog,
  BuyerTaxInfo,
} from '../../lib/store/usePOSStore';
import { calculateSmartPresets } from '../../lib/utils/cashPresets';
import { playTapSound } from '../../lib/utils/sound';
import { AppText } from '../../lib/components/ui/AppText';
import { AppHeader } from '../../lib/components/ui/AppHeader';
import { PressableScale } from '../../lib/components/ui/PressableScale';
import { DiscountModal } from '../../lib/components/pos/DiscountModal';
import { ReceiptPreviewModal } from '../../lib/components/pos/ReceiptPreviewModal';
import { CupStickerPreviewModal } from '../../lib/components/pos/CupStickerPreviewModal';
import { generateCupStickers, CupStickerData } from '../../lib/utils/labelPrinter';
import { VietQROffline } from '../../lib/components/pos/VietQROffline';
import { generateMBSoundboxDynamicQR } from '../../lib/utils/vietqrParser';
import { apiClient, getBaseUrl } from '../../lib/api/apiClient';
import {
  CashPaymentPane,
  VietQRPaymentPane,
  MixedPaymentPane,
  CardPaymentPane,
  PaymentOrderSummary,
  CrmKeypadModal,
  OrderNoteModal,
  EInvoiceModal,
} from './_components';

export type { CustomerLoyalty };

export default function ThanhToanScreen() {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const selectedTable = useSelectedTable();
  const storeSettings = useStoreSettings();
  const customers = useCustomers();
  const selectedTableId = selectedTable?.id;
  const cart = useTableCart(selectedTableId);
  const discount = useTableDiscount(selectedTableId);
  const { checkoutSuccess } = usePOSActions();

  // 1. Tính toán giá trị hóa đơn (Memoized)
  const { totalQty, subTotal, discountAmount } = useMemo(() => {
    const qty = cart.reduce((sum, item) => sum + item.qty, 0);
    const sub = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    let disc = 0;
    if (discount) {
      if (discount.type === 'percent') {
        disc = Math.round(sub * (discount.value / 100));
      } else {
        disc = Math.min(discount.value, sub);
      }
    }
    return { totalQty: qty, subTotal: sub, discountAmount: disc };
  }, [cart, discount]);

  // 1.5 CRM Khách Hàng Thân Thiết & Tích Điểm
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState<CustomerLoyalty | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [showCrmModal, setShowCrmModal] = useState(false);
  const [showCupModal, setShowCupModal] = useState(false);
  const [cupStickers, setCupStickers] = useState<CupStickerData[]>([]);

  const handleOpenCupStickers = () => {
    if (cart.length === 0) return;
    playTapSound();
    const stickers = generateCupStickers(
      selectedTable?.name || 'Mang Ve',
      selectedTable?.name || 'Mang Ve',
      cart,
      storeSettings.storeName || 'ONGCHU POS'
    );
    setCupStickers(stickers);
    setShowCupModal(true);
  };

  const maxRedeemablePoints = customer
    ? Math.min(customer.rewardPoints, Math.max(0, subTotal - discountAmount))
    : 0;
  const pointsDiscount = usePoints ? maxRedeemablePoints : 0;

  const serviceFeeRate = storeSettings.serviceFeeRate ?? 0;
  const flatSurcharge = storeSettings.flatSurcharge ?? 0;
  const vatRate = storeSettings.vatRate ?? 0;

  const { netSales, serviceFeeAmount, vatAmount, totalAmount } = useMemo(() => {
    const net = Math.max(0, subTotal - discountAmount - pointsDiscount);
    const fee = Math.round(net * (serviceFeeRate / 100)) + flatSurcharge;
    const vat = Math.round((net + fee) * (vatRate / 100));
    const total = net + fee + vat;
    return { netSales: net, serviceFeeAmount: fee, vatAmount: vat, totalAmount: total };
  }, [subTotal, discountAmount, pointsDiscount, serviceFeeRate, flatSurcharge, vatRate]);

  // Tra cứu CRM theo SĐT
  const handleCustomerPhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '');
    setCustomerPhone(raw);
    if (raw.length >= 10) {
      const found = customers.find((c) => c.phone === raw);
      if (found) {
        setCustomer(found);
        playTapSound();
        return;
      }
      apiClient.getCustomerByPhone(raw)
        .then((res) => {
          const data = res.data;
          if (data && data.name) {
            setCustomer({
              id: data.id,
              name: data.name,
              phone: data.phone,
              rewardPoints: data.points_balance || data.reward_points || 0,
              totalSpend: data.total_spend || 0,
              debtBalance: data.debt_balance || 0,
            });
            playTapSound();
          }
        })
        .catch(() => {});
    } else if (raw.length === 0) {
      setCustomer(null);
      setUsePoints(false);
    }
  };

  // 2. Phương thức thanh toán: tien_mat | vietqr | the | hon_hop | ghi_no
  const [payMethod, setPayMethod] = useState<'tien_mat' | 'vietqr' | 'the' | 'hon_hop' | 'ghi_no'>('tien_mat');

  // 3. Quản lý tiền khách đưa (100% 1-chạm, zero bàn phím ảo)
  const [cashGivenStr, setCashGivenStr] = useState<string>(totalAmount.toString());
  const cashGiven = parseInt(cashGivenStr.replace(/[^0-9]/g, ''), 10) || 0;
  const changeAmount = cashGiven >= totalAmount ? cashGiven - totalAmount : 0;

  // 4. Thanh toán Hỗn Hợp (Tiền mặt + VietQR)
  const [mixedCashGivenStr, setMixedCashGivenStr] = useState<string>(
    Math.round(totalAmount / 2).toString()
  );
  const mixedCashGiven = parseInt(mixedCashGivenStr.replace(/[^0-9]/g, ''), 10) || 0;
  const mixedVietQRDue = Math.max(0, totalAmount - mixedCashGiven);

  // 5. Tùy chọn In hóa đơn, Modal phụ & Progressive Disclosure
  const [autoPrint, setAutoPrint] = useState<boolean>(true);
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [orderNote, setOrderNote] = useState<string>('');
  const [showQrZoom, setShowQrZoom] = useState<boolean>(false);
  const [showMoreMethods, setShowMoreMethods] = useState<boolean>(false);
  const [expandOrderItems, setExpandOrderItems] = useState<boolean>(true);
  const [expandBankDetails, setExpandBankDetails] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [qrError, setQrError] = useState<boolean>(false);
  const [showEInvoiceModal, setShowEInvoiceModal] = useState<boolean>(false);
  const [buyerTaxInfo, setBuyerTaxInfo] = useState<BuyerTaxInfo | null>(null);

  // 6. Cập nhật cashGivenStr khi totalAmount thay đổi
  React.useEffect(() => {
    setCashGivenStr(totalAmount.toString());
  }, [totalAmount]);

  const handleSelectPreset = (amt: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setCashGivenStr(amt.toString());
  };

  const handleAddCash = (addedAmt: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    const current = parseInt(cashGivenStr.replace(/[^0-9]/g, ''), 10) || 0;
    setCashGivenStr((current + addedAmt).toString());
  };

  const handleCopyText = (text: string, msg: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setCopiedToast(msg);
    setTimeout(() => setCopiedToast(null), 2000);
  };

  const isSubmittingRef = useRef(false);

  const handleConfirmCheckout = () => {
    if (isSubmittingRef.current) return;
    if (cart.length === 0) {
      Alert.alert('Chưa Có Món', 'Bàn chưa có món để thanh toán.');
      return;
    }

    if (payMethod === 'tien_mat' && cashGiven < totalAmount) {
      Alert.alert('Chưa Đủ Tiền', 'Khách đưa chưa đủ tiền thanh toán.');
      return;
    }

    if (payMethod === 'ghi_no') {
      if (!customerPhone && !customer) {
        Alert.alert('Cần Thông Tin Khách', 'Nhập số điện thoại hoặc chọn khách hàng để ghi nợ.');
        return;
      }
    }

    isSubmittingRef.current = true;
    playTapSound();

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    checkoutSuccess(
      payMethod === 'tien_mat' ? cashGiven : payMethod === 'ghi_no' ? 0 : totalAmount,
      payMethod,
      {
        cashAmount: payMethod === 'tien_mat' ? cashGiven : payMethod === 'hon_hop' ? mixedCashGiven : 0,
        vietqrAmount: payMethod === 'vietqr' ? totalAmount : payMethod === 'hon_hop' ? mixedVietQRDue : 0,
        customerPhone: customerPhone || customer?.phone || undefined,
        customerName: customer?.name || (customerPhone ? `Khách ${customerPhone}` : undefined),
        pointsUsed: usePoints ? maxRedeemablePoints : 0,
        pointsEarned: Math.floor(totalAmount / 10000),
        serviceFeeRate: serviceFeeRate > 0 ? serviceFeeRate : undefined,
        serviceFeeAmount: serviceFeeAmount > 0 ? serviceFeeAmount : undefined,
        vatRate: vatRate > 0 ? vatRate : undefined,
        vatAmount: vatAmount > 0 ? vatAmount : undefined,
        surchargeAmount: flatSurcharge > 0 ? flatSurcharge : undefined,
        surchargeNote: flatSurcharge > 0 ? storeSettings.surchargeLabel : undefined,
        buyerTaxInfo: buyerTaxInfo || undefined,
      }
    );

    // Đồng bộ tức thời tới Backend Golang nếu online
    const orderIdToPay = (selectedTable as any)?.activeOrderId || selectedTable?.id;
    if (orderIdToPay) {
      apiClient.payOrder(orderIdToPay, {
        payment_method: payMethod === 'vietqr' ? 'chuyen_khoan_vietqr' : payMethod,
        paid_amount: payMethod === 'tien_mat' ? cashGiven : totalAmount,
        cash_amount: payMethod === 'tien_mat' ? cashGiven : mixedCashGiven,
        bank_amount: payMethod === 'vietqr' ? totalAmount : mixedVietQRDue,
        customer_phone: customerPhone || undefined,
        redeem_points: usePoints ? maxRedeemablePoints : 0,
      }).catch(() => {});
    }

    router.replace('/');
  };

  const handleSendZaloBill = () => {
    playTapSound();
    const phone = (customerPhone || customer?.phone || '').trim().replace(/[^0-9]/g, '');
    const now = new Date();
    const orderCode = `HD-${now.getFullYear().toString().slice(2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${(selectedTable?.id || '001').slice(-3)}`;
    const billUrl = `https://ongchu.cloud/b/${orderCode}`;
    const store = storeSettings.storeName || 'OngChu POS';
    const text = encodeURIComponent(`Cảm ơn bạn đã ghé ${store}!\nHóa đơn điện tử ${orderCode} (${totalAmount.toLocaleString('vi-VN')} đ): ${billUrl}`);

    if (phone.length >= 9) {
      Linking.openURL(`https://zalo.me/${phone}?text=${text}`).catch(() => {
        Alert.alert('Không thể mở Zalo', 'Vui lòng kiểm tra ứng dụng Zalo trên thiết bị.');
      });
    } else {
      Alert.prompt
        ? Alert.prompt(
            'Gửi Hóa Đơn Qua Zalo',
            'Nhập số điện thoại Zalo của khách hàng:',
            [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Mở Zalo',
                onPress: (inputPhone?: string) => {
                  const p = (inputPhone || '').trim().replace(/[^0-9]/g, '');
                  if (p.length >= 9) {
                    Linking.openURL(`https://zalo.me/${p}?text=${text}`).catch(() => {});
                  } else {
                    Linking.openURL(`https://sp.zalo.me/share_inline?link=${encodeURIComponent(billUrl)}&title=${encodeURIComponent(`Hóa đơn ${orderCode} · ${totalAmount.toLocaleString('vi-VN')} đ`)}`).catch(() => {});
                  }
                },
              },
            ],
            'plain-text',
            '',
            'phone-pad'
          )
        : setShowCrmModal(true);
    }
  };

  // Phím tắt thu ngân F1 (Tiền Mặt), F2 (VietQR), F3 (Thẻ), F4 (Ghi Nợ), F9 (Xong & In Bill), ESC (Thoát/Đóng), Enter (Thanh toán) trên Web
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua khi đang gõ vào input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if (e.key === 'F9' || (e.key === 'Enter' && !showDiscountModal && !showNoteModal && !showReceiptModal && !showCrmModal && !showEInvoiceModal && !showCupModal)) {
        e.preventDefault();
        handleConfirmCheckout();
      } else if (e.key === 'F1') {
        e.preventDefault();
        playTapSound();
        setPayMethod('tien_mat');
      } else if (e.key === 'F2') {
        e.preventDefault();
        playTapSound();
        setPayMethod('vietqr');
      } else if (e.key === 'F3') {
        e.preventDefault();
        playTapSound();
        setPayMethod('the');
      } else if (e.key === 'F4') {
        e.preventDefault();
        playTapSound();
        setPayMethod('ghi_no');
      } else if (e.key === 'Escape') {
        if (showDiscountModal) setShowDiscountModal(false);
        else if (showNoteModal) setShowNoteModal(false);
        else if (showReceiptModal) setShowReceiptModal(false);
        else if (showCrmModal) setShowCrmModal(false);
        else if (showEInvoiceModal) setShowEInvoiceModal(false);
        else if (showCupModal) setShowCupModal(false);
        else router.back();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleConfirmCheckout,
    showDiscountModal,
    showNoteModal,
    showReceiptModal,
    showCrmModal,
    showEInvoiceModal,
    showCupModal,
    router,
  ]);

  const handlePrintPreBill = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    Alert.alert(
      'In Phiếu Tạm',
      `Đang in phiếu tạm tính cho [${selectedTable?.name || 'Bàn 01'}].`
    );
  };

  const handleOpenCashDrawer = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    apiClient.openDrawer().catch(() => {});

    handleCopyText('', 'Đã kích mở két tiền RJ11');
  };

  const bankBin = storeSettings.bankCode || '970422';
  const accountNo = storeSettings.accountNumber || '';
  const accountHolderEncoded = encodeURIComponent(storeSettings.accountHolder || storeSettings.storeName || '');

  const qrImageUrl = `https://api.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${totalAmount}&addInfo=TT%20${encodeURIComponent(
    selectedTable?.name || 'Ban01'
  )}&accountName=${accountHolderEncoded}`;

  const mixedQrImageUrl = `https://api.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${mixedVietQRDue}&addInfo=TT%20${encodeURIComponent(
    selectedTable?.name || 'Ban01'
  )}%20HONHOP&accountName=${accountHolderEncoded}`;

  const isSoundboxActive = Boolean(
    storeSettings.mbSoundboxEnabled && (storeSettings.mbMerchantId || storeSettings.mbSoundboxId)
  );

  const mbSoundboxPayload = useMemo(() => {
    if (!isSoundboxActive) return '';
    return generateMBSoundboxDynamicQR({
      merchantId: storeSettings.mbMerchantId,
      accountNo: storeSettings.accountNumber || '',
      bankBin: storeSettings.bankCode || '970422',
      soundboxId: storeSettings.mbSoundboxId,
      refPrefix: storeSettings.mbRefPrefix || 'HD',
      amount: totalAmount,
      orderCode: selectedTable?.name || 'Ban01',
      isDynamic: true,
    });
  }, [isSoundboxActive, storeSettings.mbMerchantId, storeSettings.accountNumber, storeSettings.bankCode, storeSettings.mbSoundboxId, storeSettings.mbRefPrefix, totalAmount, selectedTable?.name]);

  // 🌟 Thuật toán tính toán 6 mệnh giá tiền mặt thông minh theo tổng hóa đơn (100% 1-chạm)
  const smartPresets = useMemo(() => {
    return calculateSmartPresets(totalAmount);
  }, [totalAmount]);

  // 6 Nút Mệnh Giá Tiền Mặt Thông Minh (Fixed 3x2 Grid)
  const fixedPresets = smartPresets;

  // 🌟 Dữ liệu đơn hàng chi tiết & Audit Log bất biến (Khớp camera, rounds, audit logs)
  const currentOrderHistoryItem = useMemo<OrderHistoryItem>(() => {
    const now = new Date();
    const activeMinutes = selectedTable?.createdAt
      ? Math.max(1, Math.round((now.getTime() - new Date(selectedTable.createdAt).getTime()) / 60000))
      : 15;
    const openedTime = new Date(now.getTime() - activeMinutes * 60000);
    const printedTime = new Date(now.getTime() - 2 * 60000);
    const formatTime = (d: Date) =>
      d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const formatShort = (d: Date) =>
      d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Tạo các đợt gọi món (rounds) chi tiết
    const rounds = [
      {
        roundIndex: 1,
        orderedAt: formatShort(openedTime),
        items: cart.slice(0, Math.max(1, Math.ceil(cart.length / 2))).map((ci) => ({
          name: ci.item.name,
          qty: ci.qty,
          unitPrice: ci.unitPrice,
          selectedSize: ci.selectedSize,
          note: ci.note,
        })),
      },
    ];

    if (cart.length > 1) {
      rounds.push({
        roundIndex: 2,
        orderedAt: formatShort(new Date(now.getTime() - Math.max(1, Math.floor(activeMinutes / 2)) * 60000)),
        items: cart.slice(Math.ceil(cart.length / 2)).map((ci) => ({
          name: ci.item.name,
          qty: ci.qty,
          unitPrice: ci.unitPrice,
          selectedSize: ci.selectedSize,
          note: ci.note,
        })),
      });
    }

    // Tạo audit logs bất biến (camera timeline, chống gian lận)
    const auditLogs: OrderAuditLog[] = [
      {
        id: 'log_open',
        time: formatTime(openedTime),
        action: `Mở ${selectedTable?.name || 'Bàn'} (${selectedTable?.guestCount || 2} khách) & gọi Đợt 1`,
        actor: 'Thu Ngân (Ca Sáng)',
        type: 'info',
      },
      {
        id: 'log_kds1',
        time: formatTime(new Date(openedTime.getTime() + 15000)),
        action: `Báo bếp Đợt 1 (${cart[0]?.qty || 1}x ${cart[0]?.item.name || 'Món'})`,
        actor: 'Thu Ngân (Ca Sáng)',
        type: 'kitchen',
      },
    ];

    if (cart.length > 1) {
      const r2Time = new Date(now.getTime() - Math.max(1, Math.floor(activeMinutes / 2)) * 60000);
      auditLogs.push({
        id: 'log_r2',
        time: formatTime(r2Time),
        action: `Gọi thêm Đợt 2 (${cart.slice(Math.ceil(cart.length / 2)).reduce((s, it) => s + it.qty, 0)} món)`,
        actor: 'Thu Ngân (Ca Sáng)',
        type: 'info',
      });
    }

    if (discountAmount > 0) {
      auditLogs.push({
        id: 'log_discount',
        time: formatTime(new Date(now.getTime() - 5 * 60000)),
        action: `Áp dụng giảm giá: -${discountAmount.toLocaleString('vi-VN')} đ (${discount?.type === 'percent' ? `${discount.value}%` : 'Số tiền'})`,
        actor: 'Thu Ngân (Ca Sáng)',
        type: 'warning',
      });
    }

    if (customer) {
      auditLogs.push({
        id: 'log_crm',
        time: formatTime(new Date(now.getTime() - 4 * 60000)),
        action: `Gắn thẻ khách hàng: ${customer.name} (${customer.phone})`,
        actor: 'Thu Ngân (Ca Sáng)',
        type: 'info',
      });
    }

    if (orderNote) {
      auditLogs.push({
        id: 'log_note',
        time: formatTime(new Date(now.getTime() - 3 * 60000)),
        action: `Ghi chú đơn: "${orderNote}"`,
        actor: 'Thu Ngân (Ca Sáng)',
        type: 'info',
      });
    }

    auditLogs.push({
      id: 'log_preprint',
      time: formatTime(printedTime),
      action: `In tạm tính K80 lần 1`,
      actor: 'Thu Ngân (Ca Sáng)',
      type: 'info',
    });

    const orderCode = `HD-${now.getFullYear().toString().slice(2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${(selectedTable?.id || '001').slice(-3)}`;

    return {
      id: `current_order_${selectedTable?.id || 'active'}`,
      orderCode,
      tableId: selectedTable?.id || 't1',
      tableName: selectedTable?.name || 'Bàn 01',
      guestCount: selectedTable?.guestCount || 2,
      items: cart,
      subtotal: subTotal,
      discountAmount,
      discountNote: discount?.note || (discount ? `${discount.value}${discount.type === 'percent' ? '%' : 'đ'}` : undefined),
      serviceFeeRate: serviceFeeRate > 0 ? serviceFeeRate : undefined,
      serviceFeeAmount: serviceFeeAmount > 0 ? serviceFeeAmount : undefined,
      vatRate: vatRate > 0 ? vatRate : undefined,
      vatAmount: vatAmount > 0 ? vatAmount : undefined,
      surchargeAmount: flatSurcharge > 0 ? flatSurcharge : undefined,
      surchargeNote: flatSurcharge > 0 ? storeSettings.surchargeLabel : undefined,
      finalTotal: totalAmount,
      paidAmount: payMethod === 'tien_mat' ? cashGiven : totalAmount,
      changeAmount,
      paymentMethod: payMethod,
      paymentDetails: {
        cashAmount: payMethod === 'tien_mat' ? cashGiven : mixedCashGiven,
        vietqrAmount: payMethod === 'vietqr' ? totalAmount : mixedVietQRDue,
        customerPhone: customer?.phone,
        customerName: customer?.name,
        pointsUsed: pointsDiscount,
        pointsEarned: Math.floor(totalAmount / 10000),
      },
      createdAt: now.toISOString(),
      openedAt: formatTime(openedTime),
      printedAt: formatTime(printedTime),
      rounds,
      auditLogs,
      cashierName: 'Thu Ngân (Ca Sáng)',
      status: 'paid',
    };
  }, [
    selectedTable,
    cart,
    subTotal,
    discountAmount,
    discount,
    serviceFeeRate,
    serviceFeeAmount,
    vatRate,
    vatAmount,
    flatSurcharge,
    storeSettings.surchargeLabel,
    totalAmount,
    cashGiven,
    changeAmount,
    payMethod,
    mixedCashGiven,
    mixedVietQRDue,
    customer,
    pointsDiscount,
    orderNote,
  ]);

  const renderCrmBox = () => (
    <View style={[s.receiptCrmBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
      {!customer ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            playTapSound();
            if (Platform.OS !== 'web') {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
            }
            setShowCrmModal(true);
          }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Icon name="account-star-outline" size={16} color={theme.brand.primary} />
            <AppText variant="xs" color={theme.text.muted} numberOfLines={1}>
              Khách lẻ (Chưa tích điểm)
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <AppText variant="xs" weight="medium" color={theme.brand.primary}>
              + Nhập SĐT
            </AppText>
            <Icon name="chevron-right" size={14} color={theme.brand.primary} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setShowCrmModal(true);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 6 }}
          >
            <Icon name="account-check" size={16} color={theme.brand.primary} />
            <AppText variant="xs" weight="medium" color={theme.text.primary} numberOfLines={1}>
              {customer.name}
            </AppText>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              · {customer.rewardPoints.toLocaleString('vi-VN')} đ
            </AppText>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {customer.rewardPoints > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={usePoints ? 'Hủy dùng điểm tích lũy' : 'Dùng điểm tích lũy'}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => {
                  playTapSound();
                  setUsePoints(!usePoints);
                }}
                style={[
                  s.redeemPointsBtnCompact,
                  {
                    backgroundColor: usePoints ? theme.brand.success : 'rgba(16, 185, 129, 0.12)',
                    borderColor: theme.brand.success,
                  },
                ]}
              >
                <AppText
                  variant="xxs"
                  weight="medium"
                  tabularNums
                  color={usePoints ? theme.text.onBrand : theme.brand.success}
                >
                  {usePoints ? 'Đã trừ' : 'Dùng điểm'}
                </AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Xóa thông tin khách hàng"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                playTapSound();
                setCustomerPhone('');
                setCustomer(null);
                setUsePoints(false);
              }}
            >
              <Icon name="close-circle-outline" size={16} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderMethodTabs = () => (
    <View style={[s.workstationTabsBar, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          playTapSound();
          if (Platform.OS !== 'web') {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          }
          setPayMethod('tien_mat');
        }}
        style={[
          s.workstationTabBtn,
          payMethod === 'tien_mat' && [
            s.workstationTabBtnActive,
            {
              backgroundColor: theme.status.warningBg,
              borderColor: theme.brand.accent,
            },
          ],
        ]}
      >
        <Icon
          name="cash"
          size={19}
          color={payMethod === 'tien_mat' ? theme.brand.accent : theme.text.muted}
        />
        <AppText
          variant="sm"
          weight={payMethod === 'tien_mat' ? 'bold' : 'normal'}
          color={payMethod === 'tien_mat' ? theme.brand.accent : theme.text.muted}
        >
          {isWide ? 'Tiền Mặt (F1)' : 'Tiền Mặt'}
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          playTapSound();
          if (Platform.OS !== 'web') {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          }
          setPayMethod('vietqr');
        }}
        style={[
          s.workstationTabBtn,
          payMethod === 'vietqr' && [
            s.workstationTabBtnActive,
            {
              backgroundColor: theme.status.warningBg,
              borderColor: theme.brand.accent,
            },
          ],
        ]}
      >
        <Icon
          name="qrcode-scan"
          size={19}
          color={payMethod === 'vietqr' ? theme.brand.accent : theme.text.muted}
        />
        <AppText
          variant="sm"
          weight={payMethod === 'vietqr' ? 'bold' : 'normal'}
          color={payMethod === 'vietqr' ? theme.brand.accent : theme.text.muted}
        >
          {isWide ? 'VietQR (F2)' : 'VietQR'}
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          playTapSound();
          if (Platform.OS !== 'web') {
            try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          }
          setShowMoreMethods(true);
        }}
        style={[
          s.workstationTabBtn,
          (payMethod === 'the' || payMethod === 'hon_hop' || payMethod === 'ghi_no') && [
            s.workstationTabBtnActive,
            {
              backgroundColor: theme.status.warningBg,
              borderColor: theme.brand.accent,
            },
          ],
        ]}
      >
        <Icon
          name={
            payMethod === 'the'
              ? 'credit-card-outline'
              : payMethod === 'hon_hop'
              ? 'swap-horizontal-bold'
              : payMethod === 'ghi_no'
              ? 'notebook-outline'
              : 'dots-horizontal'
          }
          size={19}
          color={(payMethod === 'the' || payMethod === 'hon_hop' || payMethod === 'ghi_no') ? theme.brand.accent : theme.text.muted}
        />
        <AppText
          variant="sm"
          weight={(payMethod === 'the' || payMethod === 'hon_hop' || payMethod === 'ghi_no') ? 'bold' : 'normal'}
          color={(payMethod === 'the' || payMethod === 'hon_hop' || payMethod === 'ghi_no') ? theme.brand.accent : theme.text.muted}
        >
          {payMethod === 'the'
            ? 'Thẻ / POS'
            : payMethod === 'hon_hop'
            ? 'Hỗn Hợp'
            : payMethod === 'ghi_no'
            ? 'Ghi Nợ'
            : 'Khác ▾'}
        </AppText>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentMethodContent = (wide: boolean) => (
    <View style={{ width: '100%' }}>
      {payMethod === 'tien_mat' && (
        <CashPaymentPane
          cashGiven={cashGiven}
          changeAmount={changeAmount}
          totalAmount={totalAmount}
          fixedPresets={fixedPresets}
          onSelectPreset={handleSelectPreset}
          onAddCash={handleAddCash}
        />
      )}

      {payMethod === 'vietqr' && (
        <VietQRPaymentPane
          qrImageUrl={qrImageUrl}
          qrError={qrError}
          onSetQrError={setQrError}
          onOpenZoom={() => setShowQrZoom(true)}
          tableName={selectedTable?.name || 'Ban01'}
          expandBankDetails={expandBankDetails}
          onToggleBankDetails={() => {
            playTapSound();
            setExpandBankDetails(!expandBankDetails);
          }}
          onCopyText={handleCopyText}
          isWide={wide}
          amount={totalAmount}
        />
      )}

      {payMethod === 'the' && <CardPaymentPane />}

      {payMethod === 'hon_hop' && (
        <MixedPaymentPane
          mixedCashGivenStr={mixedCashGivenStr}
          onSetMixedCashGivenStr={setMixedCashGivenStr}
          mixedVietQRDue={mixedVietQRDue}
          mixedQrImageUrl={mixedQrImageUrl}
          onCopyText={handleCopyText}
        />
      )}

      {payMethod === 'ghi_no' && (
        <View
          style={[
            s.debtCard,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.default,
            },
          ]}
        >
          <View
            style={[
              s.debtHeaderBanner,
              { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
            ]}
          >
            <Icon name="notebook-outline" size={24} color={theme.brand.danger} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <AppText variant="sm" weight="medium" color={theme.brand.danger}>
                Ghi Nợ Khách Hàng (Sổ Nợ)
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Hóa đơn sẽ lưu vào sổ công nợ, gạch nợ sau khi thu tiền
              </AppText>
            </View>
          </View>

          <View style={[s.debtCustomerBox, { borderColor: theme.border.subtle }]}>
            {customer ? (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="md" weight="medium" color={theme.text.primary}>
                      {customer.name}
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                      SĐT: {customer.phone}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      playTapSound();
                      setShowCrmModal(true);
                    }}
                    style={[s.debtChangeCustBtn, { borderColor: theme.border.subtle }]}
                  >
                    <AppText variant="xs" color={theme.brand.primary}>
                      Đổi khách
                    </AppText>
                  </TouchableOpacity>
                </View>

                {/* Bóc tách công nợ */}
                <View style={[s.debtCalcGrid, { backgroundColor: theme.surface.header }]}>
                  <View style={s.debtCalcCol}>
                    <AppText variant="xs" color={theme.text.muted}>
                      Nợ hiện tại
                    </AppText>
                    <AppText
                      variant="sm"
                      weight="medium"
                      color={customer.debtBalance > 0 ? theme.brand.danger : theme.brand.success}
                      tabularNums
                      style={{ marginTop: 2 }}
                    >
                      {customer.debtBalance.toLocaleString('vi-VN')} đ
                    </AppText>
                  </View>
                  <View style={[s.debtCalcCol, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border.subtle }]}>
                    <AppText variant="xs" color={theme.text.muted}>
                      Nợ đơn này
                    </AppText>
                    <AppText
                      variant="sm"
                      weight="medium"
                      color={theme.brand.danger}
                      tabularNums
                      style={{ marginTop: 2 }}
                    >
                      +{totalAmount.toLocaleString('vi-VN')} đ
                    </AppText>
                  </View>
                  <View style={[s.debtCalcCol, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: theme.border.subtle }]}>
                    <AppText variant="xs" color={theme.text.muted}>
                      Tổng nợ mới
                    </AppText>
                    <AppText
                      variant="sm"
                      weight="medium"
                      color={theme.brand.danger}
                      tabularNums
                      style={{ marginTop: 2 }}
                    >
                      {(customer.debtBalance + totalAmount).toLocaleString('vi-VN')} đ
                    </AppText>
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Icon name="account-search-outline" size={36} color={theme.text.muted} />
                <AppText variant="sm" weight="medium" color={theme.text.primary} style={{ marginTop: 6 }}>
                  Chưa Chọn Khách Hàng
                </AppText>
                <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center', marginTop: 2, marginBottom: 12 }}>
                  Cần số điện thoại khách hàng để theo dõi lịch sử và gạch nợ
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Chọn hoặc nhập thông tin khách hàng"
                  onPress={() => {
                    playTapSound();
                    setShowCrmModal(true);
                  }}
                  style={[s.debtSelectCustBtn, { backgroundColor: theme.brand.primary }]}
                >
                  <Icon name="account-plus-outline" size={16} color={theme.text.onBrand} style={{ marginRight: 6 }} />
                  <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                    Chọn / Nhập Khách Hàng
                  </AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* 🌟 1. HEADER CỐ ĐỊNH */}
      <AppHeader
        showBack
        title="Thanh Toán"
        subtitle={`${selectedTable?.name || 'Bàn 01'} · ${totalQty} món`}
        rightCustom={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="In tem dán ly"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={handleOpenCupStickers}
              style={[
                s.headerBtn,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                },
              ]}
            >
              <Icon name="label-outline" size={20} color={theme.brand.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Mở màn hình phụ CFD"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                router.push('/cfd' as any);
              }}
              style={[
                s.headerBtn,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.default,
                },
              ]}
            >
              <Icon name="monitor-dashboard" size={20} color={theme.brand.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Toast thông báo đã copy */}
      {copiedToast && (
        <View style={[s.toastBar, { backgroundColor: theme.brand.primary }]}>
          <Icon name="check-circle" size={16} color={theme.text.onBrand} />
          <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
            {copiedToast}
          </AppText>
        </View>
      )}

      {/* 🌟 2. GIAO DIỆN THANH TOÁN (2 CỘT LIỀN KHỐI TRÊN DESKTOP / 1 CỘT TRÊN MOBILE) */}
      {cart.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Icon name="cart-off" size={56} color={theme.text.muted} />
          <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginTop: 16 }}>
            Bàn Chưa Có Món Ăn
          </AppText>
          <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 6, textAlign: 'center', maxWidth: 300 }}>
            Vui lòng chọn món trên thực đơn trước khi tiến hành thanh toán hóa đơn.
          </AppText>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              router.replace('/');
            }}
            style={{
              marginTop: 20,
              backgroundColor: theme.brand.primary,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="arrow-left" size={18} color={theme.text.onBrand} />
            <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
              Về Thực Đơn
            </AppText>
          </TouchableOpacity>
        </View>
      ) : isWide ? (
        <View style={[s.wideWorkspace, isDesktopLarge && { maxWidth: 1720, gap: 24, padding: 24 }]}>
          {/* CỘT TRÁI (480px trên 24-inch, 390px trên laptop): HÓA ĐƠN & TÀI CHÍNH LIỀN KHỐI */}
          <View
            style={[
              s.wideReceiptCol,
              isDesktopLarge && { width: 480, maxWidth: 520 },
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            {/* Header Thẻ Hóa Đơn & CRM */}
            <View style={[s.receiptHeader, { borderBottomColor: theme.border.subtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="receipt" size={18} color={theme.brand.primary} />
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    Chi Tiết Hóa Đơn
                  </AppText>
                </View>
                <View style={[s.badgePill, { backgroundColor: theme.brand.primaryBg }]}>
                  <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
                    {totalQty} món
                  </AppText>
                </View>
              </View>

              {/* CRM Khách hàng tích hợp */}
              {renderCrmBox()}
            </View>

            {/* Danh sách món ăn cuộn nội bộ */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              showsVerticalScrollIndicator={true}
            >
              {cart.map((c, idx) => {
                const itemName = c?.item?.name || (c as any)?.name || 'Món ăn';
                const unitPrice = Number(c?.unitPrice || (c as any)?.price || 0);
                const qty = Number(c?.qty || 1);
                const size = typeof c?.selectedSize === 'object' ? (c?.selectedSize as any)?.name : c?.selectedSize;
                const toppings = c?.selectedToppings?.map((t: any) => (typeof t === 'object' ? t?.name : t)).filter(Boolean).join(', ');
                return (
                  <View
                    key={c?.cartItemId || idx}
                    style={[
                      s.receiptItemRow,
                      {
                        borderBottomColor: theme.border.subtle,
                        borderBottomWidth: idx < cart.length - 1 ? StyleSheet.hairlineWidth : 0,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <AppText variant="md" weight="normal" color={theme.text.primary} numberOfLines={1}>
                        {qty}x {itemName}
                      </AppText>
                      {(size || toppings) ? (
                        <AppText variant="xxs" color={theme.text.muted} numberOfLines={1} style={{ marginTop: 2 }}>
                          {[size ? (String(size).toLowerCase().startsWith('size') ? String(size) : `Size ${size}`) : null, toppings].filter(Boolean).join(' · ')}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
                      {(unitPrice * qty).toLocaleString('vi-VN')} đ
                    </AppText>
                  </View>
                );
              })}
            </ScrollView>

            {/* Tiện ích hóa đơn trực tiếp (Giảm giá, Ghi chú, In thử) */}
            <View style={[s.receiptUtilityRow, { borderTopColor: theme.border.subtle, backgroundColor: theme.surface.card }]}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  setShowDiscountModal(true);
                }}
                style={[
                  s.receiptUtilityBtn,
                  {
                    backgroundColor: discount ? theme.brand.primaryBg : theme.surface.header,
                    borderColor: discount ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <Icon
                  name="ticket-percent-outline"
                  size={15}
                  color={discount ? theme.brand.primary : theme.text.primary}
                />
                <AppText
                  variant="xs"
                  weight="medium"
                  color={discount ? theme.brand.primary : theme.text.primary}
                  numberOfLines={1}
                >
                  {discount ? `-${discountAmount > 1000 ? `${Math.round(discountAmount / 1000)}k` : discountAmount}` : 'Giảm giá'}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  setShowNoteModal(true);
                }}
                style={[
                  s.receiptUtilityBtn,
                  {
                    backgroundColor: orderNote ? theme.brand.primaryBg : theme.surface.header,
                    borderColor: orderNote ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <Icon
                  name={orderNote ? 'note-check-outline' : 'note-edit-outline'}
                  size={15}
                  color={orderNote ? theme.brand.primary : theme.text.primary}
                />
                <AppText
                  variant="xs"
                  weight="medium"
                  color={orderNote ? theme.brand.primary : theme.text.primary}
                  numberOfLines={1}
                >
                  {orderNote ? 'Có ghi chú' : 'Ghi chú'}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  setShowReceiptModal(true);
                }}
                style={[
                  s.receiptUtilityBtn,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.subtle,
                  },
                ]}
              >
                <Icon name="printer-outline" size={15} color={theme.text.primary} />
                <AppText variant="xs" weight="medium" color={theme.text.primary} numberOfLines={1}>
                  In Thử
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Bóc tách tài chính & Hero Box Cần Thu */}
            <View style={[s.receiptFinanceBox, { borderTopColor: theme.border.subtle, backgroundColor: theme.surface.card }]}>
              <View style={s.receiptFinanceRow}>
                <AppText variant="xs" color={theme.text.muted}>Tạm tính tiền món:</AppText>
                <AppText variant="md" weight="normal" color={theme.text.primary} tabularNums>
                  {subTotal.toLocaleString('vi-VN')} đ
                </AppText>
              </View>

              {discountAmount > 0 && (
                <View style={s.receiptFinanceRow}>
                  <AppText variant="xs" color={theme.brand.danger}>Chiết khấu giảm giá:</AppText>
                  <AppText variant="md" weight="normal" color={theme.brand.danger} tabularNums>
                    -{discountAmount.toLocaleString('vi-VN')} đ
                  </AppText>
                </View>
              )}

              {pointsDiscount > 0 && (
                <View style={s.receiptFinanceRow}>
                  <AppText variant="xs" color={theme.brand.success}>Điểm tích lũy CRM:</AppText>
                  <AppText variant="md" weight="normal" color={theme.brand.success} tabularNums>
                    -{pointsDiscount.toLocaleString('vi-VN')} đ
                  </AppText>
                </View>
              )}

              {serviceFeeAmount > 0 && (
                <View style={s.receiptFinanceRow}>
                  <AppText variant="xs" color={theme.text.muted}>
                    Phí dịch vụ ({serviceFeeRate}%):
                  </AppText>
                  <AppText variant="md" weight="normal" color={theme.text.primary} tabularNums>
                    +{serviceFeeAmount.toLocaleString('vi-VN')} đ
                  </AppText>
                </View>
              )}

              {vatAmount > 0 && (
                <View style={s.receiptFinanceRow}>
                  <AppText variant="xs" color={theme.text.muted}>
                    Thuế VAT ({vatRate}%):
                  </AppText>
                  <AppText variant="md" weight="normal" color={theme.text.primary} tabularNums>
                    +{vatAmount.toLocaleString('vi-VN')} đ
                  </AppText>
                </View>
              )}

              {/* HERO BOX CẦN THANH TOÁN */}
              <View style={[s.receiptHeroBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
                <AppText variant="xs" weight="bold" color={theme.text.muted}>
                  CẦN THANH TOÁN:
                </AppText>
                <AppText variant="xl" weight="bold" color={theme.brand.primary} tabularNums style={{ letterSpacing: -0.5 }}>
                  {totalAmount.toLocaleString('vi-VN')} đ
                </AppText>
              </View>
            </View>
          </View>

          {/* CỘT PHẢI: TRẠM THANH TOÁN THU NGÂN (WORKSTATION) */}
          <View
            style={[
              s.wideWorkstationCol,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            {/* 1. Bộ 3 Tab Phương Thức Lớn (Hero Payment Tabs 52px) */}
            {renderMethodTabs()}

            {/* 2. Vùng Thao Tác Chuyên Sâu Của Phương Thức (Lấp đầy tự nhiên) */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={s.workstationBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderPaymentMethodContent(true)}
            </ScrollView>

            {/* 3. Cụm Chốt Thanh Toán (Docked Action Đáy Cột Phải) */}
            <View style={[s.workstationBottomDock, { borderTopColor: theme.border.subtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => {
                    playTapSound();
                    setAutoPrint(!autoPrint);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingVertical: 4 }}
                >
                  <Icon
                    name={autoPrint ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={18}
                    color={autoPrint ? theme.brand.primary : theme.text.muted}
                  />
                  <AppText variant="xs" color={theme.text.muted}>
                    Tự động in hóa đơn K80 & mở két
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    playTapSound();
                    setShowEInvoiceModal(true);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: buyerTaxInfo?.taxCode ? theme.brand.primaryBg : 'transparent',
                    borderWidth: buyerTaxInfo?.taxCode ? StyleSheet.hairlineWidth : 0,
                    borderColor: theme.brand.primary,
                  }}
                >
                  <Icon
                    name={buyerTaxInfo?.taxCode ? 'file-check' : 'file-document-outline'}
                    size={15}
                    color={buyerTaxInfo?.taxCode ? theme.brand.primary : theme.text.muted}
                  />
                  <AppText
                    variant="xs"
                    weight={buyerTaxInfo?.taxCode ? 'medium' : 'normal'}
                    color={buyerTaxInfo?.taxCode ? theme.brand.primary : theme.text.muted}
                    tabularNums
                  >
                    {buyerTaxInfo?.taxCode ? `HĐĐT: ${buyerTaxInfo.taxCode}` : '+ Xuất HĐĐT'}
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* NÚT HERO CHỐT ĐƠN 56PX */}
              <PressableScale
                activeScale={0.97}
                haptic="step"
                playSound
                onPress={handleConfirmCheckout}
                style={[
                  s.heroCheckoutBtn,
                  {
                    backgroundColor:
                      payMethod === 'ghi_no'
                        ? theme.brand.danger
                        : theme.brand.accent,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon
                    name={payMethod === 'ghi_no' ? 'notebook-edit-outline' : 'check-circle'}
                    size={24}
                    color={theme.text.onBrand}
                  />
                  <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                    {payMethod === 'ghi_no' ? 'Xong & Ghi Nợ (F9)' : 'Xong & In Bill (F9)'}
                  </AppText>
                </View>
                <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
                  {totalAmount.toLocaleString('vi-VN')} đ
                </AppText>
              </PressableScale>
            </View>
          </View>
        </View>
      ) : (
        /* 📱 GIAO DIỆN MOBILE (1 CỘT CUỘN LIỀN MẠCH, KHÔNG TIỆN ÍCH THỪA) */
        <View style={{ flex: 1 }}>
          <ScrollView
            style={s.mainBody}
            contentContainerStyle={[s.mainBodyContent, { paddingBottom: 90 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. HỘP CẦN THU & CRM (100% PHẲNG LIỀN MẠCH DE-BOXING) */}
            <View
              style={[
                s.mobileBillCard,
                {
                  backgroundColor: theme.surface.card,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border.subtle,
                  borderRadius: 0,
                  borderWidth: 0,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <AppText variant="xs" weight="medium" color={theme.text.muted}>
                    CẦN THU:
                  </AppText>
                  <AppText variant="xl" weight="bold" color={theme.brand.primary} tabularNums style={{ marginTop: 2 }}>
                    {totalAmount.toLocaleString('vi-VN')} đ
                  </AppText>
                </View>
                <View style={[s.badgePill, { backgroundColor: theme.brand.primaryBg }]}>
                  <AppText variant="xs" weight="medium" color={theme.brand.primary} tabularNums>
                    {totalQty} món
                  </AppText>
                </View>
              </View>

              <View style={{ marginTop: 10 }}>
                {renderCrmBox()}
              </View>
            </View>

            {/* 2. BĂNG CHỌN PHƯƠNG THỨC */}
            <View style={{ marginVertical: 8, paddingHorizontal: 16 }}>
              {renderMethodTabs()}
            </View>

            {/* 3. VÙNG THAO TÁC PHƯƠNG THỨC */}
            {renderPaymentMethodContent(false)}

            {/* 4. CHI TIẾT ĐƠN HÀNG TRÊN MOBILE */}
            <View style={{ marginTop: 14 }}>
              <PaymentOrderSummary
                cart={cart}
                totalQty={totalQty}
                expandOrderItems={expandOrderItems}
                onToggleExpand={() => setExpandOrderItems(!expandOrderItems)}
                subTotal={subTotal}
                discountAmount={discountAmount}
                pointsDiscount={pointsDiscount}
                serviceFeeAmount={serviceFeeAmount}
                serviceFeeRate={serviceFeeRate}
                flatSurcharge={flatSurcharge}
                surchargeLabel={storeSettings.surchargeLabel}
                vatAmount={vatAmount}
                vatRate={vatRate}
                finalTotal={totalAmount}
              />
            </View>
          </ScrollView>

          {/* DOCK THAO TÁC ĐÁY MOBILE */}
          <View
            style={[
              s.bottomDockMobile,
              {
                backgroundColor: theme.surface.card,
                borderTopColor: theme.border.subtle,
              paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4,
              paddingLeft: Math.max(insets.left, 16),
              paddingRight: Math.max(insets.right, 16),
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => {
                  playTapSound();
                  setAutoPrint(!autoPrint);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 4 }}
              >
                <Icon
                  name={autoPrint ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={autoPrint ? theme.brand.primary : theme.text.muted}
                />
                <AppText variant="sm" weight="normal" color={theme.text.primary}>
                  In hóa đơn K80
                </AppText>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={handleSendZaloBill}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingVertical: 4 }}
                >
                  <Icon name="chat-processing-outline" size={18} color="#0068FF" />
                  <AppText variant="sm" weight="medium" color="#0068FF">
                    💬 Gửi Zalo
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => {
                    playTapSound();
                    setShowEInvoiceModal(true);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingVertical: 4 }}
                >
                  <Icon name="file-document-outline" size={18} color={theme.brand.primary} />
                  <AppText variant="sm" weight="medium" color={theme.brand.primary}>
                    + HĐĐT
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            <PressableScale
              activeScale={0.97}
              haptic="step"
              playSound
              onPress={handleConfirmCheckout}
              style={[
                s.checkoutBtn,
                {
                  backgroundColor:
                    payMethod === 'ghi_no'
                      ? theme.brand.danger
                      : theme.brand.accent,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon
                  name={payMethod === 'ghi_no' ? 'notebook-edit-outline' : 'cash-check'}
                  size={20}
                  color={theme.text.onBrand}
                />
                <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                  {payMethod === 'ghi_no' ? 'Xong & Ghi Nợ' : 'Xong & In Bill'}
                </AppText>
              </View>
              <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
                {totalAmount.toLocaleString('vi-VN')} đ
              </AppText>
            </PressableScale>
          </View>
        </View>
      )}

      {/* MODAL 0: BÀN PHÍM SỐ CẢM ỨNG IN-APP CRM */}
      <CrmKeypadModal
        visible={showCrmModal}
        onClose={() => setShowCrmModal(false)}
        currentCustomer={customer}
        onSelectCustomer={(cust) => {
          setCustomer(cust);
          setCustomerPhone(cust.phone);
        }}
      />

      {/* MODAL 1: CHIẾT KHẤU GIẢM GIÁ */}
      <DiscountModal
        visible={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
      />

      {/* MODAL 1.5: CHI TIẾT HÓA ĐƠN & LOG BẤT BIẾN KHÔNG THỂ XÓA */}
      <ReceiptPreviewModal
        visible={showReceiptModal}
        order={currentOrderHistoryItem}
        onClose={() => setShowReceiptModal(false)}
        onPrintAgain={handlePrintPreBill}
      />

      {/* MODAL 1.6: GHI CHÚ ĐƠN HÀNG 1-CHẠM (ZERO PHÍM ẢO) */}
      <OrderNoteModal
        visible={showNoteModal}
        currentNote={orderNote}
        onClose={() => setShowNoteModal(false)}
        onSaveNote={(saved) => setOrderNote(saved)}
      />

      {/* MODAL 1.7: IN TEM DÁN LY 50x30mm */}
      <CupStickerPreviewModal
        visible={showCupModal}
        stickers={cupStickers}
        onClose={() => setShowCupModal(false)}
      />

      {/* MODAL 1.8: XUẤT HĐĐT KHỞI TẠO TỪ MÁY TÍNH TIỀN */}
      <EInvoiceModal
        visible={showEInvoiceModal}
        buyerInfo={buyerTaxInfo || undefined}
        onClose={() => setShowEInvoiceModal(false)}
        onSave={(info) => setBuyerTaxInfo(info)}
        sellerTaxCode={storeSettings.eInvoiceTaxCode}
      />

      {/* MODAL 2: PHÓNG TO MÃ VIETQR */}
      <Modal visible={showQrZoom} transparent animationType="fade" onRequestClose={() => setShowQrZoom(false)} statusBarTranslucent>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowQrZoom(false)}
          style={[
            s.qrModalOverlay,
            {
              backgroundColor: theme.surface.backdrop,
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <View style={[s.qrModalCard, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
            <AppText variant="md" weight="medium" color={theme.text.primary} style={{ marginBottom: 4 }}>
              Quét Mã QR
            </AppText>
            <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginBottom: 12 }}>
              {selectedTable?.name || 'Bàn 01'} · {totalAmount.toLocaleString('vi-VN')} đ
            </AppText>
            {qrError ? (
              <VietQROffline
                bankBin={bankBin}
                accountNo={accountNo}
                accountHolder={storeSettings.accountHolder || 'HO KINH DOANH CHE BUOI AN GIANG'}
                amount={totalAmount}
                orderCode={selectedTable?.name || 'Ban01'}
                size={isWide ? 340 : 300}
                onCopyPayload={(p) => handleCopyText(p, 'Đã sao chép mã VietQR')}
              />
            ) : (
              <ExpoImage
                source={{ uri: qrImageUrl }}
                style={[s.qrZoomImage, { width: isWide ? 340 : 300, height: isWide ? 340 : 300 }]}
                contentFit="contain"
                transition={200}
                cachePolicy="memory-disk"
                onError={() => setQrError(true)}
              />
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Đóng phóng to mã QR"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                playTapSound();
                setShowQrZoom(false);
              }}
              style={[s.closeModalBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.default, marginTop: 14 }]}
            >
              <AppText variant="sm" weight="medium" color={theme.text.primary}>
                Đóng
              </AppText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🌟 MODAL 3: PHƯƠNG THỨC THANH TOÁN MỞ RỘNG (Ít dùng, giấu gọn gàng) */}
      <Modal
        visible={showMoreMethods}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreMethods(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowMoreMethods(false)}
          style={[
            s.qrModalOverlay,
            {
              backgroundColor: theme.surface.backdrop,
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <View style={[s.moreMethodsCard, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="dots-horizontal-circle-outline" size={20} color={theme.brand.primary} />
                <AppText variant="md" weight="medium" color={theme.text.primary}>
                  Phương Thức Khác
                </AppText>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Đóng chọn phương thức khác"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => {
                  playTapSound();
                  setShowMoreMethods(false);
                }}
                style={{ padding: 4 }}
              >
                <Icon name="close" size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Option 1: Chạm Thẻ / Quẹt Ví */}
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Thanh toán qua Thẻ và Ví điện tử"
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setPayMethod('the');
                setShowMoreMethods(false);
              }}
              style={[
                s.moreMethodItem,
                {
                  backgroundColor: payMethod === 'the' ? theme.brand.primaryBg : theme.surface.header,
                  borderColor: payMethod === 'the' ? theme.brand.primary : theme.border.default,
                },
              ]}
            >
              <View style={[s.moreIconBox, { backgroundColor: theme.brand.primaryBg }]}>
                <Icon name="credit-card-outline" size={22} color={theme.brand.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  Thẻ & Ví
                </AppText>
                <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                  Visa, Master, NAPAS, MoMo, ZaloPay, Apple Pay
                </AppText>
              </View>
              <Icon name="chevron-right" size={18} color={theme.text.muted} />
            </TouchableOpacity>

            {/* Option 2: Hỗn Hợp (Tiền Mặt + VietQR) */}
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Thanh toán hỗn hợp tiền mặt và VietQR"
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setPayMethod('hon_hop');
                setShowMoreMethods(false);
              }}
              style={[
                s.moreMethodItem,
                {
                  backgroundColor: payMethod === 'hon_hop' ? theme.brand.primaryBg : theme.surface.header,
                  borderColor: payMethod === 'hon_hop' ? theme.brand.primary : theme.border.default,
                  marginTop: 10,
                },
              ]}
            >
              <View style={[s.moreIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Icon name="swap-horizontal-bold" size={22} color={theme.brand.success} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  Hỗn Hợp (QR)
                </AppText>
                <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                  Một phần Tiền Mặt + một phần Chuyển Khoản VietQR
                </AppText>
              </View>
              <Icon name="chevron-right" size={18} color={theme.text.muted} />
            </TouchableOpacity>

            {/* Option 3: Ghi Nợ Khách Quen */}
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Ghi nợ cho khách quen"
              onPress={() => {
                playTapSound();
                if (Platform.OS !== 'web') {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch {}
                }
                setPayMethod('ghi_no');
                setShowMoreMethods(false);
              }}
              style={[
                s.moreMethodItem,
                {
                  backgroundColor: payMethod === 'ghi_no' ? 'rgba(239, 68, 68, 0.12)' : theme.surface.header,
                  borderColor: payMethod === 'ghi_no' ? theme.brand.danger : theme.border.default,
                  marginTop: 10,
                },
              ]}
            >
              <View style={[s.moreIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Icon name="notebook-outline" size={22} color={theme.brand.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="sm" weight="medium" color={theme.text.primary}>
                  Ghi Nợ Khách
                </AppText>
                <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 2 }}>
                  Lưu vào sổ công nợ, gạch nợ sau khi thu tiền mặt / QR
                </AppText>
              </View>
              <Icon name="chevron-right" size={18} color={theme.text.muted} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bottomUtilityBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  headerTitleCol: {
    flex: 1,
    paddingHorizontal: 10,
  },
  toastBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  wideWorkspace: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  wideReceiptCol: {
    width: '38%',
    minWidth: 340,
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  wideWorkstationCol: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  receiptHeader: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  receiptCrmBox: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  receiptUtilityRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  receiptUtilityBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  receiptFinanceBox: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  receiptFinanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  receiptHeroBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workstationTabsBar: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 6,
  },
  workstationTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 6,
  },
  workstationTabBtnActive: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  workstationBodyContent: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    flexGrow: 1,
    justifyContent: 'center',
  },
  workstationBottomDock: {
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heroCheckoutBtn: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  mobileBillCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  bottomDockMobile: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  mainBody: {
    flex: 1,
  },
  mainBodyContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 16,
  },
  wideMainBodyContent: {
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  wideLayoutRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  mobileLayoutCol: {
    flexDirection: 'column',
    gap: 12,
  },
  wideLeftPane: {
    flex: 1.15,
  },
  wideRightPane: {
    flex: 0.85,
  },
  mobilePane: {
    width: '100%',
  },
  cashTwinCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cashTwinCol: {
    flex: 1,
    padding: 14,
  },
  verticalDivider: {
    width: 1,
  },
  fixedGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  fixedGridBtn: {
    width: '31.6%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 8,
    marginTop: 2,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numpadKey: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsSummaryCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  qrCard: {
    width: '100%',
    maxWidth: 350,
    height: 350,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    position: 'relative',
    alignSelf: 'center',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrZoomBadge: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTheme.border.subtle,
    shadowColor: lightTheme.surface.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  transferCard: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
    alignSelf: 'center',
  },
  transferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPayBox: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  iconBoxRound: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixedCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  mixedCol: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  mixedInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  mixedCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  bottomDock: {
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  checkoutBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  qrModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrModalCard: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
  },
  qrZoomImage: {
    width: 280,
    height: 280,
  },
  closeModalBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreMethodsCard: {
    width: '92%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    alignItems: 'center',
  },
  moreMethodItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  moreIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crmSingleRow: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  crmRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  redeemPointsBtnCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  debtCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 12,
  },
  debtHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  debtCustomerBox: {
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  debtChangeCustBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  debtCalcGrid: {
    flexDirection: 'row',
    borderRadius: 10,
    marginTop: 12,
    paddingVertical: 10,
  },
  debtCalcCol: {
    flex: 1,
    alignItems: 'center',
  },
  debtSelectCustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
