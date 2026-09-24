import type {
  OrderHistoryItem,
  StoreSettings,
} from '../usePOSStore';
import { BuyerTaxInfo, EInvoiceData, issueEInvoiceRecord } from '../../utils/eInvoice';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: '',
  address: '',
  phone: '',
  slogan: '',
  wifiName: '',
  wifiPassword: '',
  openingHours: '07:00 - 22:30',
  website: '',
  facebookPage: '',
  taxCode: '',
  businessRegistrationName: '',

  bankCode: 'MB',
  bankName: 'MBBank Quân Đội',
  accountNumber: '',
  accountHolder: '',
  bankBranch: '',
  transferSyntax: '[MA_DON]',
  qrPaymentTemplate: 'compact2',

  soundboxProvider: 'mbbank',
  mbSoundboxEnabled: false,
  mbSoundboxId: '',
  mbMerchantId: '',
  mbRefPrefix: 'HD',
  mbRawQrString: '',

  receiptTitle: 'HÓA ĐƠN THANH TOÁN',
  receiptFooterText: 'Cảm ơn Quý khách & Hẹn gặp lại!',
  printerIp: '192.168.1.200',
  printerPort: 9100,
  paperSize: 'K80',
  printCopies: 1,
  printQrOnBill: true,
  printWifiOnBill: true,
  printCashierOnBill: true,
  printItemNoteOnBill: true,
  printBarcodeOnBill: true,
  autoCut: true,
  kickDrawer: true,

  kitchenPrinterIp: '192.168.1.201',
  kitchenPrinterPort: 9100,
  enableKitchenPrinter: false,

  cupPrinterIp: '192.168.1.202',
  cupPrinterPort: 9100,
  enableCupPrinter: false,
  cupLabelSize: '50x30',
  autoPrintCupOnOrder: false,

  enableVoiceAlert: true,
  voiceAlertVolume: 1.0,
  voiceAlertRate: 1.05,
  voiceAlertPitch: 1.0,

  enableTableService: true,
  enableTakeaway: true,
  enableDelivery: true,
  enableVat: false,
  vatRate: 0,
  enableServiceFee: false,
  serviceFeeRate: 0,
  defaultOrderChannel: 'dine_in',
  autoPrintOnPayment: true,
  requireTableSelection: false,
  allowNegativeStock: true,
  requirePinForVoid: true,
  enableHaptics: true,
  enableSound: true,
  highDiscountThreshold: 20,
  kdsAutoCleanupMinutes: 30,
  cfdWelcomeMessage: 'Kính Chào Quý Khách!',
};

export interface OrderInvoiceSlice {
  orderHistory: OrderHistoryItem[];
  storeSettings: StoreSettings;

  // Order History Actions
  voidOrder: (orderId: string, reason: string) => boolean;

  // Settings Actions
  updateStoreSettings: (settings: Partial<StoreSettings>) => void;

  // e-Invoice Actions (Nghị định 123 / Thông tư 78)
  issueOrderEInvoice: (
    orderId: string,
    buyer: BuyerTaxInfo
  ) => { success: boolean; eInvoice?: EInvoiceData; message?: string };
}

export const createOrderInvoiceSlice = (set: any, get: any): OrderInvoiceSlice => ({
  orderHistory: [],
  storeSettings: DEFAULT_STORE_SETTINGS,

  voidOrder: (orderId: string, reason: string) => {
    const { orderHistory } = get();
    const target = orderHistory.find((o: OrderHistoryItem) => o.id === orderId);
    if (!target || target.status === 'voided') return false;

    const updated = orderHistory.map((o: OrderHistoryItem) =>
      o.id === orderId
        ? {
            ...o,
            status: 'voided' as const,
            voidReason: reason,
            voidedAt: new Date().toISOString(),
          }
        : o
    );
    set({ orderHistory: updated });

    // Đồng bộ hủy đơn xuống backend nếu đơn đã lưu trên server
    import('../../api/apiClient').then(({ apiClient }) => {
      apiClient.voidOrder(orderId, reason).catch(() => {});
    }).catch(() => {});

    return true;
  },

  updateStoreSettings: (newSettings: Partial<StoreSettings>) => {
    const { storeSettings, tenantId } = get();
    const merged = { ...storeSettings, ...newSettings };
    set({ storeSettings: merged });

    // 📡 Đồng bộ 2 chiều tức thì lên Go Backend Server (Lưu CSDL & Kích hoạt WS Broadcast)
    try {
      import('../settingsMapper').then(({ mapStoreSettingsToBackend }) => {
        import('../../api/apiClient').then(({ apiClient }) => {
          const payload = mapStoreSettingsToBackend(merged, tenantId);
          apiClient.updateSettings(payload).catch((err) => {
            console.warn('⚠️ Không thể đồng bộ settings lên server:', err);
          });
        });
      });
    } catch (_) {}
  },

  issueOrderEInvoice: (orderId: string, buyer: BuyerTaxInfo) => {
    const { orderHistory, storeSettings } = get();
    const order = orderHistory.find((o: OrderHistoryItem) => o.id === orderId || o.orderCode === orderId);
    if (!order) {
      return { success: false, message: 'Không tìm thấy hóa đơn' };
    }
    if (order.eInvoice) {
      return { success: false, message: 'Đơn hàng đã xuất HĐĐT', eInvoice: order.eInvoice };
    }
    if (!buyer.taxCode || !buyer.buyerName) {
      return { success: false, message: 'Thiếu MST hoặc tên người mua' };
    }

    try {
      const eInvoice = issueEInvoiceRecord({
        orderCode: order.orderCode,
        sellerTaxCode: storeSettings.eInvoiceTaxCode || '0316892345',
        sellerName: storeSettings.eInvoiceSellerName || storeSettings.storeName,
        sellerAddress: storeSettings.address,
        templateCode: storeSettings.eInvoiceTemplateCode || '1C26TAA',
        buyer,
        items: order.items.map((c: any) => ({
          name: (c.item?.name || 'Món') + (c.selectedSize ? ` (${c.selectedSize})` : ''),
          unit: 'Phần',
          qty: c.qty,
          unitPrice: c.unitPrice,
          total: c.unitPrice * c.qty,
          vatRate: order.vatRate || 0,
        })),
        totalAmount: order.subtotal - (order.discountAmount || 0),
        vatAmount: order.vatAmount || 0,
        finalAmount: order.finalTotal,
        paymentMethod: order.paymentMethod === 'tien_mat' ? 'TM' : order.paymentMethod === 'vietqr' ? 'CK' : 'TM/CK',
      });

      const updatedHistory = orderHistory.map((o: OrderHistoryItem) => {
        if (o.id === order.id) {
          return {
            ...o,
            eInvoice,
            auditLogs: [
              ...(o.auditLogs || []),
              {
                id: `log_einv_${Date.now()}`,
                time: new Date().toLocaleTimeString('vi-VN'),
                action: `XUẤT HĐĐT: ${eInvoice.invoiceCode} — Mã CQT: ${eInvoice.cqtCode}`,
                actor: 'Kế toán / Thu ngân',
                type: 'info' as const,
              },
            ],
          };
        }
        return o;
      });

      set({ orderHistory: updatedHistory });
      return { success: true, eInvoice, message: `Đã cấp HĐĐT ${eInvoice.invoiceCode}` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Lỗi phát hành HĐĐT' };
    }
  },
});