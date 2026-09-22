import { playTapSound } from '../utils/sound';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useCallback } from 'react';
import { TableItem, MenuItemWithModifiers, SelectedModifierData, ModifierOption } from '../components/pos';
import { isSameModifierConfig, getModifierConfigSignature } from '../utils/cartAlgorithms';
import {
  CategoryItem,
  AreaItem,
  InventoryItem,
  calculateEffectiveCost,
  checkCostPriceSpike,
  UNASSIGNED_TABLE,
} from '../constants/menuData';
import type {
  InventoryTransaction,
  InventoryTransactionItem,
  InventoryTransactionType,
  InventoryStockOutReason,
  RecurringExpense,
} from '../constants/menuData';

let isCatalogFetching = false;
import { useOfflineSyncStore } from './useOfflineSyncStore';
import { speakPaymentSuccess } from '../utils/voiceAnnouncer';
import { BuyerTaxInfo, EInvoiceData, issueEInvoiceRecord } from '../utils/eInvoice';
import { wsClient } from '../api/wsClient';
import { createKDSSlice, KDSSlice } from './slices/kdsSlice';
import { createCartSlice, CartSlice } from './slices/cartSlice';
import { createMenuCatalogSlice, MenuCatalogSlice } from './slices/menuCatalogSlice';
import { createShiftAccountingSlice, ShiftAccountingSlice } from './slices/shiftAccountingSlice';
import { createInventorySlice, InventorySlice } from './slices/inventorySlice';
import { createOrderInvoiceSlice, OrderInvoiceSlice, DEFAULT_STORE_SETTINGS } from './slices/orderInvoiceSlice';
import { createCRMSlice, CRMSlice, DEFAULT_CUSTOMERS_LIST } from './slices/crmSlice';
export { DEFAULT_CUSTOMERS_LIST };

export type {
  CategoryItem,
  AreaItem,
  InventoryItem,
  MenuItemWithModifiers,
  TableItem,
  SelectedModifierData,
  ModifierOption,
  InventoryTransaction,
  InventoryTransactionItem,
  InventoryTransactionType,
  InventoryStockOutReason,
  RecurringExpense,
  BuyerTaxInfo,
  EInvoiceData,
};

export interface CashTransaction {
  id: string;
  type: 'thu' | 'chi';
  category: string;
  amount: number;
  description: string;
  time: string;
  performedBy: string;
  createdAt: string;
  branchId?: string;
  status?: 'completed' | 'voided';
  expenseType?: 'co_dinh' | 'hoat_dong';
  paymentMethod?: 'tien_mat' | 'chuyen_khoan';
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
}

export interface CustomerLoyalty {
  id: string;
  name: string;
  phone: string;
  rewardPoints: number;
  totalSpend: number;
  debtBalance: number;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export { isSameModifierConfig };

export type KitchenCookingStatus = 'pending' | 'cooking' | 'ready' | 'served';

export interface CartItem {
  cartItemId: string;
  item: MenuItemWithModifiers;
  qty: number;
  selectedSize?: string;
  sugarLevel?: string;
  iceLevel?: string;
  selectedToppings: string[];
  note: string;
  unitPrice: number;
  isTakeaway?: boolean;
  sentToKitchen?: boolean;
  sentAt?: string;
  roundIndex?: number;
  status?: KitchenCookingStatus;
  configSignature?: string;
}

export interface TableDiscount {
  type: 'percent' | 'fixed';
  value: number;
  note: string;
}

export interface MergePreviewData {
  sourceTable: TableItem;
  targetTable: TableItem;
  sourceItemsCount: number;
  sourceTotal: number;
  targetItemsCount: number;
  targetTotal: number;
  combinedItemsCount: number;
  combinedTotal: number;
}

export interface OrderRoundBatch {
  roundIndex: number; // Đợt 1, Đợt 2...
  orderedAt: string; // e.g. "08:15"
  items: {
    name: string;
    qty: number;
    unitPrice: number;
    selectedSize?: string;
    note?: string;
  }[];
}

export interface OrderAuditLog {
  id: string;
  time: string; // e.g. "08:15:20"
  action: string;
  actor: string;
  type: 'info' | 'success' | 'warning' | 'kitchen';
}

export interface OrderHistoryItem {
  id: string;
  orderCode: string; // e.g. HD-260902-001
  tableId: string;
  tableName: string;
  guestCount: number;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  discountNote?: string;
  serviceFeeRate?: number;
  serviceFeeAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  surchargeAmount?: number;
  surchargeNote?: string;
  finalTotal: number;
  paidAmount: number;
  changeAmount: number;
  paymentMethod: 'tien_mat' | 'vietqr' | 'the' | 'hon_hop' | 'ghi_no';
  debtAmount?: number;
  isDebtPaid?: boolean;
  debtPaidAt?: string;
  debtPaidMethod?: 'tien_mat' | 'vietqr';
  paymentDetails?: {
    cashAmount?: number;
    vietqrAmount?: number;
    bankName?: string;
    accountNumber?: string;
    customerPhone?: string;
    customerName?: string;
    pointsUsed?: number;
    pointsEarned?: number;
    vatRate?: number;
    vatAmount?: number;
    serviceFeeRate?: number;
    serviceFeeAmount?: number;
    surchargeAmount?: number;
    surchargeNote?: string;
  };
  createdAt: string;
  openedAt?: string;
  printedAt?: string;
  paidAt?: string;
  rounds?: OrderRoundBatch[];
  auditLogs?: OrderAuditLog[];
  cashierName: string;
  orderChannel?: 'tai_ban' | 'mang_ve' | 'giao_hang';
  status: 'paid' | 'voided';
  voidReason?: string;
  voidedAt?: string;
  eInvoice?: EInvoiceData;
  branchId?: string;
}

export interface ParkedOrder {
  id: string;
  code: string; // e.g. "CHỜ-01"
  tableId: string;
  tableName: string;
  items: CartItem[];
  discount?: TableDiscount;
  totalAmount: number;
  itemCount: number;
  note?: string;
  customerName?: string;
  customerPhone?: string;
  parkedAt: string;
  parkedBy?: string;
}

export interface KDSItem {
  id: string;
  cartItemId: string;
  name: string;
  qty: number;
  selectedSize?: string;
  sugarLevel?: string;
  iceLevel?: string;
  selectedToppings: string[];
  note?: string;
  station: 'bar' | 'kitchen' | 'snack';
  status: 'pending' | 'cooking' | 'done';
}

export interface KDSOrder {
  id: string;
  orderCode: string;
  tableId: string;
  tableName: string;
  guestCount?: number;
  createdAt: string;
  orderTime: string;
  elapsedMinutes: number;
  status: 'pending' | 'cooking' | 'ready' | 'served';
  items: KDSItem[];
  // ⚡ 3 Chốt An Toàn KDS Auto-Cleanup
  isPaid?: boolean;
  paidAt?: string;
  autoCleaned?: boolean;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  slogan: string;
  wifiName: string;
  wifiPassword: string;
  openingHours?: string;
  website?: string;
  facebookPage?: string;
  storeLogoUrl?: string;
  taxCode?: string;
  businessRegistrationName?: string;

  // VietQR config
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  bankBranch?: string;
  transferSyntax?: string;
  qrPaymentTemplate?: 'compact' | 'compact2' | 'qr_only';

  // Loa Báo Có Soundbox (MB Bank, Vietcombank, BIDV...)
  soundboxProvider?: 'mbbank' | 'vcb' | 'bidv' | 'other';
  mbSoundboxEnabled?: boolean;
  mbSoundboxId?: string;
  mbMerchantId?: string;
  mbRefPrefix?: string;
  mbRawQrString?: string;

  // Thermal Printer LAN config & Bill Customization
  receiptTitle?: string;
  receiptFooterText?: string;
  printerIp: string;
  printerPort: number;
  paperSize: 'K80' | 'K58';
  printCopies?: number;
  printQrOnBill?: boolean;
  printWifiOnBill?: boolean;
  printCashierOnBill?: boolean;
  printItemNoteOnBill?: boolean;
  printBarcodeOnBill?: boolean;
  autoCut: boolean;
  kickDrawer: boolean;

  // Máy in bếp / Bar phụ
  kitchenPrinterIp?: string;
  kitchenPrinterPort?: number;
  enableKitchenPrinter?: boolean;

  // Máy in tem dán ly (Cup Sticker)
  cupPrinterIp?: string;
  cupPrinterPort?: number;
  enableCupPrinter?: boolean;
  cupLabelSize?: '50x30' | '40x30';
  autoPrintCupOnOrder?: boolean;

  // Loa Báo Chuyển Khoản 0đ & Webhook Báo Có
  enableVoiceAlert?: boolean;
  voiceAlertVolume?: number;
  voiceAlertRate?: number;
  autoCompleteOrderOnTransfer?: boolean;
  autoPrintBillOnTransfer?: boolean;
  webhookApiKey?: string;

  // UI & Hardware preferences
  enableHaptics: boolean;
  enableSound: boolean;
  highDiscountThreshold: number;
  enableKds?: boolean;
  kdsAutoCleanupMinutes: number;

  // Sales & Operations Rules
  defaultOrderChannel?: 'dine_in' | 'takeaway';
  autoPrintOnPayment?: boolean;
  requireTableSelection?: boolean;
  allowNegativeStock?: boolean;
  vatRate?: number;
  serviceFeeRate?: number;
  flatSurcharge?: number;
  surchargeLabel?: string;
  requirePinForVoid?: boolean;
  backendUrl?: string;

  // 🎛️ Tùy chọn món & Đường · Đá (Modifiers)
  enableSugarIceModifier?: boolean;
  sugarIceCategories?: string[];
  quickNotesList?: string[];

  // Anti-fraud Telegram Bot
  telegramBotToken?: string;
  telegramChatId?: string;
  enableTelegramAlerts?: boolean;

  // CFD Display
  cfdWelcomeMessage?: string;

  // Hóa đơn điện tử máy tính tiền (Nghị định 123 / Thông tư 78)
  enableEInvoice?: boolean;
  eInvoiceTaxCode?: string;
  eInvoiceSellerName?: string;
  eInvoiceTemplateCode?: string;
  eInvoiceLookupUrl?: string;
}

export interface ShiftRecord {
  id: string;
  shiftName: string;
  cashierName: string;
  openedAt: string;
  closedAt: string;
  startingCash: number;
  totalCashSales: number;
  totalVietQRSales: number;
  totalCardSales: number;
  totalCashIn: number;
  totalCashOut: number;
  expectedEndingCash: number;
  actualEndingCash: number;
  differenceAmount: number;
  status: 'closed' | 'open';
  note?: string;
  denomCounts?: Record<number, number>;
  cashToKeepForNextShift?: number;
  cashToRemitToOwner?: number;
  orderCount?: number;
}

export interface ActiveShift {
  id: string;
  shiftName: string;
  cashierName: string;
  openedAt: string;
  startingCash: number;
  status: 'open' | 'closed';
  closedAt?: string;
  cashToKeepForNextShift?: number;
  cashToRemitToOwner?: number;
  note?: string;
  actualEndingCash?: number;
  differenceAmount?: number;
}

export interface POSState
  extends KDSSlice,
    CartSlice,
    MenuCatalogSlice,
    ShiftAccountingSlice,
    InventorySlice,
    OrderInvoiceSlice,
    CRMSlice {
  // Multi-Tenant Isolation
  tenantId: string;
  switchTenant: (tenantId: string, tenantName?: string, isNewTenant?: boolean) => Promise<void>;
  resetToCleanSlate: (tenantId: string, tenantName?: string) => void;

  // Channel State & Mode
  viewMode: 'tables' | 'pos';
  orderChannel: 'dine_in' | 'takeaway';

  getMergePreview: (targetTableId: string) => MergePreviewData | null;

  // Rail Navigation State
  isRailCollapsed: boolean;

  // Actions
  toggleRailCollapse: () => void;
  setViewMode: (mode: 'tables' | 'pos') => void;
  setOrderChannel: (channel: 'dine_in' | 'takeaway') => void;

  checkoutSuccess: (
    paidAmount: number,
    paymentMethod?: 'tien_mat' | 'vietqr' | 'the' | 'hon_hop' | 'ghi_no',
    paymentDetails?: {
      cashAmount?: number;
      vietqrAmount?: number;
      bankName?: string;
      accountNumber?: string;
      customerPhone?: string;
      customerName?: string;
      pointsUsed?: number;
      pointsEarned?: number;
      serviceFeeRate?: number;
      serviceFeeAmount?: number;
      vatRate?: number;
      vatAmount?: number;
      surchargeAmount?: number;
      surchargeNote?: string;
      buyerTaxInfo?: BuyerTaxInfo;
    }
  ) => OrderHistoryItem;

  populateSampleData: (tableId?: string) => void;
  fetchMasterCatalog: () => Promise<boolean>;
  purgeTestData: () => void;

  // Webhook & Voice Announcer Actions
  handleBankTransferReceived: (data: {
    amount: number;
    gateway?: string;
    content?: string;
    matched_order_code?: string;
    customer_name?: string;
    reference_code?: string;
  }) => { success: boolean; message: string; autoReconciled?: boolean };
}

export { UNASSIGNED_TABLE };

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      tenantId: 'tenant_ongchu',
      ...createMenuCatalogSlice(set, get),
      ...createCartSlice(set, get),
      ...createKDSSlice(set, get),
      ...createShiftAccountingSlice(set, get),
      ...createInventorySlice(set, get),
      ...createOrderInvoiceSlice(set, get),
      ...createCRMSlice(set, get),
      viewMode: 'tables',
      orderChannel: 'dine_in',
      isRailCollapsed: false,

  getMergePreview: (targetTableId: string) => {
    const { selectedTable, tableCarts, tables } = get();
    const targetTable = tables.find((t) => t.id === targetTableId);
    if (!targetTable) return null;

    const sourceCart = tableCarts[selectedTable.id] || [];
    const targetCart = tableCarts[targetTableId] || [];

    const sourceItemsCount = sourceCart.reduce((s, c) => s + c.qty, 0);
    const sourceTotal = sourceCart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
    const targetItemsCount = targetCart.reduce((s, c) => s + c.qty, 0);
    const targetTotal = targetCart.reduce((s, c) => s + c.unitPrice * c.qty, 0);

    return {
      sourceTable: selectedTable,
      targetTable,
      sourceItemsCount,
      sourceTotal,
      targetItemsCount,
      targetTotal,
      combinedItemsCount: sourceItemsCount + targetItemsCount,
      combinedTotal: sourceTotal + targetTotal,
    };
  },

  toggleRailCollapse: () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    set((s) => ({ isRailCollapsed: !s.isRailCollapsed }));
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setOrderChannel: (channel) => {
    const { tables, selectTable } = get();
    if (channel === 'takeaway') {
      const takeawayTable =
        tables.find((t) => t.area === 'Mang Về' || t.name.toLowerCase().includes('mang về')) ||
        tables[tables.length - 1];
      if (takeawayTable) {
        selectTable(takeawayTable);
      }
    }
    set({ orderChannel: channel });
  },

  checkoutSuccess: (paidAmount, paymentMethod = 'tien_mat', paymentDetails) => {
    const { selectedTable, tableCarts, tables, tableDiscounts, orderHistory, storeSettings, kdsOrders } = get();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    const currentCart = tableCarts[selectedTable.id] || [];
    const discount = tableDiscounts[selectedTable.id];
    const subtotal = currentCart.reduce((s, c) => s + c.unitPrice * c.qty, 0);

    let discountAmount = 0;
    if (discount) {
      discountAmount =
        discount.type === 'percent'
          ? Math.round((subtotal * discount.value) / 100)
          : Math.min(discount.value, subtotal);
    }
    const pointsUsed = paymentDetails?.pointsUsed || 0;
    const netSales = Math.max(0, subtotal - discountAmount - pointsUsed);

    // Thuế & Phụ thu
    const serviceFeeRate = paymentDetails?.serviceFeeRate ?? storeSettings.serviceFeeRate ?? 0;
    const flatSurcharge = paymentDetails?.surchargeAmount ?? storeSettings.flatSurcharge ?? 0;
    const serviceFeeAmount =
      paymentDetails?.serviceFeeAmount ??
      ((serviceFeeRate > 0 ? Math.round(netSales * (serviceFeeRate / 100)) : 0) + flatSurcharge);

    const vatRate = paymentDetails?.vatRate ?? storeSettings.vatRate ?? 0;
    const vatAmount =
      paymentDetails?.vatAmount ??
      (vatRate > 0 ? Math.round((netSales + serviceFeeAmount) * (vatRate / 100)) : 0);

    const finalTotal = netSales + serviceFeeAmount + vatAmount;
    const changeAmount = Math.max(0, paidAmount - finalTotal);

    // 🧾 Create Order History Invoice Record
    const orderIndex = orderHistory.length + 1;
    const orderCode = `HD-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(orderIndex).padStart(3, '0')}`;
    const invoiceTime = new Date().toISOString();

    const auditData = generateOrderAuditData({
      createdAt: invoiceTime,
      tableName: selectedTable.name,
      guestCount: selectedTable.guestCount || 1,
      items: currentCart,
      paymentMethod,
      paidAmount,
      changeAmount,
      finalTotal,
      status: 'paid',
    });

    const tableVoids = (get().tableVoidLogs || {})[selectedTable.id] || [];
    const customVoidAuditLogs: OrderAuditLog[] = tableVoids.map((v, idx) => ({
      id: `log_void_item_${idx}_${Date.now()}`,
      time: v.time,
      action: `HỦY MÓN BẾP: ${v.itemName} (x${v.qty}) — Lý do: ${v.reason}`,
      actor: 'Thu Ngân / Quản Lý',
      type: 'warning' as const,
    }));

    // 🧾 Tự động xuất HĐĐT máy tính tiền nếu có thông tin người mua
    let eInvoiceData: EInvoiceData | undefined = undefined;
    const buyerTax = paymentDetails?.buyerTaxInfo;
    if (buyerTax && buyerTax.taxCode) {
      try {
        eInvoiceData = issueEInvoiceRecord({
          orderCode,
          sellerTaxCode: storeSettings.eInvoiceTaxCode || '0316892345',
          sellerName: storeSettings.eInvoiceSellerName || storeSettings.storeName,
          sellerAddress: storeSettings.address,
          templateCode: storeSettings.eInvoiceTemplateCode || '1C26TAA',
          buyer: buyerTax,
          items: currentCart.map((c) => ({
            name: (c.item?.name || 'Món') + (c.selectedSize ? ` (${c.selectedSize})` : ''),
            unit: 'Phần',
            qty: c.qty,
            unitPrice: c.unitPrice,
            total: c.unitPrice * c.qty,
            vatRate: vatRate || 0,
          })),
          totalAmount: netSales + serviceFeeAmount,
          vatAmount: vatAmount,
          finalAmount: finalTotal,
          paymentMethod: paymentMethod === 'tien_mat' ? 'TM' : paymentMethod === 'vietqr' ? 'CK' : 'TM/CK',
        });
      } catch (err) {
        console.warn('Không thể xuất HĐĐT tự động:', err);
      }
    }

    const eInvoiceAuditLog: OrderAuditLog[] = eInvoiceData
      ? [
          {
            id: `log_einv_${Date.now()}`,
            time: new Date().toLocaleTimeString('vi-VN'),
            action: `XUẤT HĐĐT: ${eInvoiceData.invoiceCode} — Mã CQT: ${eInvoiceData.cqtCode}`,
            actor: 'Thu Ngân',
            type: 'info' as const,
          },
        ]
      : [];

    const newInvoice: OrderHistoryItem = {
      id: `inv_${Date.now()}`,
      orderCode,
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      guestCount: selectedTable.guestCount || 1,
      items: currentCart,
      subtotal,
      discountAmount,
      discountNote: discount?.note,
      serviceFeeRate: serviceFeeRate > 0 ? serviceFeeRate : undefined,
      serviceFeeAmount: serviceFeeAmount > 0 ? serviceFeeAmount : undefined,
      vatRate: vatRate > 0 ? vatRate : undefined,
      vatAmount: vatAmount > 0 ? vatAmount : undefined,
      surchargeAmount: flatSurcharge > 0 ? flatSurcharge : undefined,
      surchargeNote: paymentDetails?.surchargeNote || storeSettings.surchargeLabel,
      finalTotal,
      paidAmount,
      changeAmount,
      paymentMethod,
      debtAmount: paymentMethod === 'ghi_no' ? Math.max(0, finalTotal - paidAmount) : undefined,
      isDebtPaid: paymentMethod === 'ghi_no' ? false : undefined,
      paymentDetails: {
        ...(paymentDetails || {}),
        bankName: storeSettings.bankName,
        accountNumber: storeSettings.accountNumber,
        vatRate: vatRate > 0 ? vatRate : undefined,
        vatAmount: vatAmount > 0 ? vatAmount : undefined,
        serviceFeeRate: serviceFeeRate > 0 ? serviceFeeRate : undefined,
        serviceFeeAmount: serviceFeeAmount > 0 ? serviceFeeAmount : undefined,
      },
      createdAt: invoiceTime,
      openedAt: auditData.openedAt,
      printedAt: auditData.printedAt,
      paidAt: auditData.paidAt,
      rounds: auditData.rounds,
      auditLogs: [...auditData.auditLogs, ...customVoidAuditLogs, ...eInvoiceAuditLog],
      cashierName: 'Thu Ngân (Ca Sáng)',
      status: 'paid',
      eInvoice: eInvoiceData,
      branchId: require('./useAuthStore').useAuthStore.getState().activeBranchId || 'branch_01',
    };

    // 🤝 Cập nhật CRM Khách Hàng & Công Nợ
    let updatedCustomers = get().customers;
    const isDebt = paymentMethod === 'ghi_no';
    const debtToRecord = isDebt ? Math.max(0, finalTotal - paidAmount) : 0;
    const custPhone = paymentDetails?.customerPhone;
    const custName = paymentDetails?.customerName || (isDebt ? 'Khách ghi nợ' : undefined);

    if (isDebt && debtToRecord > 0) {
      const existing = custPhone ? updatedCustomers.find((c) => c.phone === custPhone) : null;
      if (existing) {
        updatedCustomers = updatedCustomers.map((c) =>
          c.id === existing.id
            ? { ...c, debtBalance: c.debtBalance + debtToRecord, totalSpend: c.totalSpend + finalTotal }
            : c
        );
      } else if (custPhone) {
        const newCust: CustomerLoyalty = {
          id: `cust_${Date.now()}`,
          name: custName || 'Khách nợ',
          phone: custPhone,
          rewardPoints: paymentDetails?.pointsEarned || 0,
          totalSpend: finalTotal,
          debtBalance: debtToRecord,
          createdAt: new Date().toISOString(),
        };
        updatedCustomers = [newCust, ...updatedCustomers];
      }
    } else if (custPhone) {
      const existing = updatedCustomers.find((c) => c.phone === custPhone);
      if (existing) {
        const pointsEarned = paymentDetails?.pointsEarned || 0;
        const pointsUsed = paymentDetails?.pointsUsed || 0;
        updatedCustomers = updatedCustomers.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                totalSpend: c.totalSpend + finalTotal,
                rewardPoints: Math.max(0, c.rewardPoints - pointsUsed + pointsEarned),
              }
            : c
        );
      }
    }

    const updatedCarts = { ...tableCarts };
    delete updatedCarts[selectedTable.id];

    const updatedDiscounts = { ...tableDiscounts };
    delete updatedDiscounts[selectedTable.id];

    const updatedVoidLogsPayment = { ...(get().tableVoidLogs || {}) };
    delete updatedVoidLogsPayment[selectedTable.id];

    // ⚡ Gắn cờ đã thanh toán cho các vé KDS của bàn này (Chốt 1 An Toàn)
    const paidAtNow = new Date().toISOString();
    const updatedKDSOrders = kdsOrders.map((k) =>
      k.tableId === selectedTable.id ? { ...k, isPaid: true, paidAt: paidAtNow } : k
    );

    set({
      tableCarts: updatedCarts,
      tableDiscounts: updatedDiscounts,
      tableVoidLogs: updatedVoidLogsPayment,
      orderHistory: [newInvoice, ...orderHistory],
      customers: updatedCustomers,
      kdsOrders: updatedKDSOrders,
      viewMode: 'tables',
      selectedTable: {
        ...selectedTable,
        status: 'trong',
        totalAmount: 0,
        itemCount: 0,
        guestCount: 0,
        createdAt: undefined,
      },
      tables: tables.map((t) =>
        t.id === selectedTable.id
          ? { ...t, status: 'trong', totalAmount: 0, itemCount: 0, guestCount: 0, createdAt: undefined }
          : t
      ),
    });

    // 📡 Đồng bộ thanh toán xong qua WebSocket Hub (giải phóng bàn, dọn màn hình CFD, đánh dấu vé KDS và cập nhật Sổ đơn)
    try {
      wsClient.broadcastOrderPaid(selectedTable.id, newInvoice.id, newInvoice);
      wsClient.broadcastCFDCartSync([], undefined, selectedTable.name);
    } catch (_) {}

    // 🔄 Tự động đưa đơn vào hàng đợi đồng bộ ngoại tuyến (Offline Sync Engine)
    try {
      useOfflineSyncStore.getState().enqueueOrder({
        orderCode,
        tableId: selectedTable.id,
        tableName: selectedTable.name,
        totalAmount: finalTotal,
        paidAmount,
        changeAmount,
        paymentMethod,
        items: currentCart.map((c) => ({
          productId: c.item.id,
          productName: c.item.name,
          quantity: c.qty,
          unitPrice: c.unitPrice,
          selectedSize: c.selectedSize,
          sugarLevel: c.sugarLevel,
          iceLevel: c.iceLevel,
          toppings: c.selectedToppings,
          note: c.note,
        })),
      });
    } catch (_) {}

    return newInvoice;
  },

  populateSampleData: (tableId) => {
    // Không nạp dữ liệu mẫu
  },

  fetchMasterCatalog: async () => {
    if (isCatalogFetching) return false;
    const tid = get().tenantId;
    if (!tid || tid === 'saas_master' || tid === 'tenant_saas' || tid === 'tenant_saas_root' || tid === 'unbound') {
      return false;
    }
    isCatalogFetching = true;
    try {
      const { apiClient } = await import('../api/apiClient');
      const { mapBackendToStoreSettings } = await import('./settingsMapper');
      const [catRes, prodRes, tableRes, ingRes, areaRes, topRes, setRes] = await Promise.all([
        apiClient.getCategories().catch(() => ({ success: false, data: null, status: 0 })),
        apiClient.getProducts().catch(() => ({ success: false, data: null, status: 0 })),
        apiClient.getTables().catch(() => ({ success: false, data: null, status: 0 })),
        apiClient.getIngredients().catch(() => ({ success: false, data: null, status: 0 })),
        apiClient.getAreas().catch(() => ({ success: false, data: null, status: 0 })),
        apiClient.getToppings().catch(() => ({ success: false, data: null, status: 0 })),
        apiClient.getSettings().catch(() => ({ success: false, data: null, status: 0 })),
      ]);

      // Nếu tenant không tồn tại trên VPS (404 Not Found), tự động dọn session cũ
      if (catRes.status === 404 || prodRes.status === 404 || setRes.status === 404) {
        try {
          const { useAuthStore } = await import('./useAuthStore');
          useAuthStore.getState().logout?.();
        } catch {}
        set({ tenantId: '' });
        return false;
      }

      const updates: any = {};

      if (setRes && setRes.success && setRes.data) {
        updates.storeSettings = mapBackendToStoreSettings(setRes.data, get().storeSettings);
      }

      if (catRes.success && Array.isArray(catRes.data) && catRes.data.length > 0) {
        updates.categories = catRes.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          icon: c.icon || 'food-outline',
          displayOrder: c.sort_order || c.displayOrder || 0,
        }));
      }

      const currentCats = updates.categories || get().categories || [];
      const catMap = new Map<string, string>();
      currentCats.forEach((c: any) => catMap.set(c.id, c.name));

      if (prodRes.success && Array.isArray(prodRes.data) && prodRes.data.length > 0) {
        updates.menuItems = prodRes.data.map((p: any) => {
          const resolvedCat = p.category || (p.category_id ? catMap.get(p.category_id) : undefined) || 'Khác';
          return {
            id: p.id,
            code: p.code || '',
            name: p.name,
            price: p.selling_price || p.price,
            costPrice: p.cost_price || p.costPrice || 0,
            unit: p.unit || 'Phần',
            station: p.station || 'bar',
            category: resolvedCat,
            image: p.image_url || p.image || '',
            sizes: p.sizes || [],
            toppings: p.toppings || [],
            allowSugarIce: p.allow_sugar_ice ?? p.allowSugarIce,
          };
        });
      }

      if (tableRes.success && Array.isArray(tableRes.data) && tableRes.data.length > 0) {
        const currentCarts = get().tableCarts || {};
        updates.tables = tableRes.data.map((t: any) => {
          const cartForTable = currentCarts[t.id] || [];
          const hasCart = cartForTable.length > 0;
          const cartTotal = cartForTable.reduce((s: number, c: any) => s + (c.unitPrice || 0) * (c.qty || 1), 0);
          const cartItems = cartForTable.reduce((s: number, c: any) => s + (c.qty || 1), 0);

          let finalStatus: any = t.status === 'da_thanh_toan' ? 'trong' : (t.status || 'trong');
          if (hasCart) {
            finalStatus = t.status === 'da_in_tam_tinh' ? 'da_in_tam_tinh' : 'co_khach';
          }

          return {
            id: t.id,
            name: t.name,
            area: t.area_name || t.area || 'Tầng Trệt',
            capacity: t.capacity || 4,
            status: finalStatus,
            guestCount: hasCart ? (t.guestCount || t.guest_count || 2) : 0,
            totalAmount: hasCart ? cartTotal : (t.total_amount || t.totalAmount || 0),
            itemCount: hasCart ? cartItems : (t.item_count || t.itemCount || 0),
          };
        });
      }

      const rawAreas = Array.isArray(areaRes.data)
        ? areaRes.data
        : (Array.isArray(areaRes.data?.data) ? areaRes.data.data : []);
      if (areaRes.success && rawAreas.length > 0) {
        updates.areas = rawAreas.map((a: any) => ({
          id: a.id,
          name: a.name,
          displayOrder: a.sort_order || a.displayOrder || 0,
        }));
      }

      const rawToppings = Array.isArray(topRes.data)
        ? topRes.data
        : (Array.isArray(topRes.data?.data) ? topRes.data.data : []);
      if (topRes.success && rawToppings.length > 0) {
        updates.toppings = rawToppings.map((t: any) => ({
          id: t.id,
          name: t.name,
          priceDelta: t.price_delta ?? t.priceDelta ?? 0,
        }));
      }

      if (ingRes.success && Array.isArray(ingRes.data) && ingRes.data.length > 0) {
        updates.inventoryItems = ingRes.data.map((i: any) => ({
          id: i.id,
          sku: i.code || i.sku || i.id,
          name: i.name,
          category: i.category || 'nguyen_lieu',
          unit: i.unit,
          currentStock: i.current_stock ?? i.currentStock ?? 0,
          minStockAlert: i.min_stock ?? i.minStockAlert ?? 0,
          costPrice: i.avg_cost_price ?? i.costPrice ?? 0,
        }));
      }

      if (Object.keys(updates).length > 0) {
        set(updates);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isCatalogFetching = false;
    }
  },

  purgeTestData: () => {
    const { tables } = get();
    const cleanTables = tables.map((t) => ({
      ...t,
      status: 'trong' as const,
      totalAmount: 0,
      itemCount: 0,
      guestCount: 0,
      createdAt: undefined,
    }));

    set({
      orderHistory: [],
      cashTransactions: [],
      shiftHistory: [],
      kdsOrders: [],
      tableCarts: {},
      tableDiscounts: {},
      tableVoidLogs: {},
      tables: cleanTables,
      selectedTable: cleanTables[0] || UNASSIGNED_TABLE,
    });
  },

  resetToCleanSlate: (tenantId: string, tenantName?: string) => {
    const { storeSettings } = get();
    const cleanSettings: StoreSettings = {
      ...storeSettings,
      storeName: tenantName || ('Quán ' + tenantId.replace('tenant_', '')),
      slogan: 'Hân Hạnh Phục Vụ Quý Khách',
    };
    set({
      tenantId,
      orderHistory: [],
      cashTransactions: [],
      shiftHistory: [],
      kdsOrders: [],
      tableCarts: {},
      tableDiscounts: {},
      tableVoidLogs: {},
      tables: [],
      selectedTable: UNASSIGNED_TABLE,
      categories: [],
      menuItems: [],
      areas: [],
      toppings: [],
      inventoryItems: [],
      storeSettings: cleanSettings,
      outOfStockProductIds: [],
    });
  },

  switchTenant: async (tenantId: string, tenantName?: string, isNewTenant = false) => {
    const current = get();
    if (current.tenantId === tenantId && !isNewTenant) {
      return;
    }

    // Save previous tenant snapshot
    if (current.tenantId && current.tenantId !== 'unbound') {
      try {
        const snapshot = {
          tenantId: current.tenantId,
          tableCarts: current.tableCarts,
          tableDiscounts: current.tableDiscounts,
          tables: current.tables,
          categories: current.categories,
          areas: current.areas,
          toppings: current.toppings,
          inventoryItems: current.inventoryItems,
          cashTransactions: current.cashTransactions,
          shiftHistory: current.shiftHistory,
          menuItems: current.menuItems,
          kdsOrders: current.kdsOrders,
          orderHistory: current.orderHistory,
          storeSettings: current.storeSettings,
          outOfStockProductIds: current.outOfStockProductIds,
          activeArea: current.activeArea,
        };
        await AsyncStorage.setItem(`ongchu_pos_tenant_${current.tenantId}`, JSON.stringify(snapshot));
      } catch (_) {}
    }

    // Attempt restoring saved tenant state
    if (!isNewTenant) {
      try {
        const saved = await AsyncStorage.getItem(`ongchu_pos_tenant_${tenantId}`);
        if (saved) {
          const tenantData = JSON.parse(saved);
          if (tenantData && Array.isArray(tenantData.tables)) {
            const safeTables = tenantData.tables || [];
            set({
              tenantId,
              tableCarts: tenantData.tableCarts || {},
              tableDiscounts: tenantData.tableDiscounts || {},
              tables: safeTables,
              selectedTable: safeTables[0] || UNASSIGNED_TABLE,
              categories: tenantData.categories || [],
              areas: tenantData.areas || [],
              toppings: tenantData.toppings || [],
              inventoryItems: tenantData.inventoryItems || [],
              cashTransactions: tenantData.cashTransactions || [],
              shiftHistory: tenantData.shiftHistory || [],
              menuItems: tenantData.menuItems || [],
              kdsOrders: tenantData.kdsOrders || [],
              orderHistory: tenantData.orderHistory || [],
              storeSettings: tenantData.storeSettings || { ...DEFAULT_STORE_SETTINGS, storeName: tenantName || ('Quán ' + tenantId) },
              outOfStockProductIds: tenantData.outOfStockProductIds || [],
              activeArea: tenantData.activeArea || 'Tất Cả',
              viewMode: 'tables',
              orderChannel: 'dine_in',
            });
            return;
          }
        }
      } catch (_) {}
    }

    // Brand new tenant or clean slate
    get().resetToCleanSlate(tenantId, tenantName);
  },

  // 🔔 Webhook Báo Có & Loa Chuyển Khoản Ngân Hàng
  handleBankTransferReceived: (data) => {
    const { storeSettings, orderHistory, settleCustomerDebt, checkoutSuccess, selectedTable, tableCarts } = get();
    const amount = Number(data.amount) || 0;
    const matchedCode = (data.matched_order_code || '').trim();
    let autoReconciled = false;
    let reconciledMsg = '';

    // 1. Phát loa giọng nói thông báo nếu bật
    if (storeSettings.enableVoiceAlert !== false) {
      speakPaymentSuccess(amount, matchedCode || undefined, data.customer_name, {
        volume: storeSettings.voiceAlertVolume ?? 1.0,
        rate: storeSettings.voiceAlertRate ?? 1.05,
      });
    }

    // 2. Tự động gạch nợ / hoàn tất đơn nếu bật auto-reconcile
    if (storeSettings.autoCompleteOrderOnTransfer !== false) {
      // Trường hợp A: Khớp hóa đơn nợ trong orderHistory
      const unpaidInvoice = orderHistory.find(
        (inv) =>
          inv.paymentMethod === 'ghi_no' &&
          !inv.isDebtPaid &&
          (inv.orderCode === matchedCode || (matchedCode && inv.orderCode.includes(matchedCode)))
      );

      const debtPhone = unpaidInvoice?.paymentDetails?.customerPhone;
      if (unpaidInvoice && debtPhone) {
        settleCustomerDebt(debtPhone, amount, 'vietqr', undefined, unpaidInvoice.id);
        autoReconciled = true;
        reconciledMsg = `Đã gạch nợ đơn ${unpaidInvoice.orderCode}`;
      } else if (selectedTable && tableCarts[selectedTable.id]?.length > 0) {
        // Trường hợp B: Bàn đang chọn có giỏ hàng
        checkoutSuccess(amount, 'vietqr');
        autoReconciled = true;
        reconciledMsg = `Đã tính tiền bàn ${selectedTable.name}`;
      }
    }

    return {
      success: true,
      message: reconciledMsg || `Đã nhận chuyển khoản ${amount.toLocaleString('vi-VN')}đ`,
      autoReconciled,
    };
  },
    }),
    {
      name: 'ongchu_pos_storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // 🌟 Khi khởi động/reload app: Luôn mở mặc định ở màn hình Sơ Đồ Bàn
        usePOSStore.setState({ viewMode: 'tables' });

        // Đảm bảo selectedTable luôn hợp lệ
        const finalTables = usePOSStore.getState().tables || [];
        if (finalTables.length > 0) {
          const curSelected = usePOSStore.getState().selectedTable;
          if (!curSelected || !finalTables.some((t) => t.id === curSelected.id)) {
            usePOSStore.setState({ selectedTable: finalTables[0] });
          }
        }
      },
      // 🌟 ONLINE-FIRST SINGLE SOURCE OF TRUTH:
      // Lưu trữ cấu hình và lịch sử tài chính cục bộ để đồng bộ tức thì trên client
      partialize: (state) => ({
        tenantId: state.tenantId,
        pinnedItemIds: state.pinnedItemIds,
        isRailCollapsed: state.isRailCollapsed,
        viewMode: state.viewMode,
        orderChannel: state.orderChannel,
        activeArea: state.activeArea,
        outOfStockProductIds: state.outOfStockProductIds,
        orderHistory: state.orderHistory,
        cashTransactions: state.cashTransactions,
        shiftHistory: state.shiftHistory,
      }),
    }
  )
);

// ==========================================
// 🌟 ATOMIC SELECTORS & HOOKS (TRIỆT TIÊU RE-RENDER THỪA)
// ==========================================

export const EMPTY_CART: CartItem[] = [];

// 1. Data Selectors
export const useSelectedTable = () => usePOSStore((s) => s.selectedTable);
export const useActiveTableId = () => usePOSStore((s) => s.selectedTable?.id);

export const useTableCart = (tableId?: string) =>
  usePOSStore(
    useCallback(
      (s) => (tableId ? s.tableCarts[tableId] || EMPTY_CART : EMPTY_CART),
      [tableId]
    )
  );

export const useActiveTableCart = () => {
  const activeId = useActiveTableId();
  return useTableCart(activeId);
};

export const useTableDiscount = (tableId?: string) =>
  usePOSStore(
    useCallback(
      (s) => (tableId ? s.tableDiscounts[tableId] : undefined),
      [tableId]
    )
  );

export const useActiveTableDiscount = () => {
  const activeId = useActiveTableId();
  return useTableDiscount(activeId);
};

export const useTableList = () => usePOSStore((s) => s.tables);
export const useTables = useTableList;

export const useTableById = (tableId: string) =>
  usePOSStore(
    useCallback(
      (s) => s.tables.find((t) => t.id === tableId),
      [tableId]
    )
  );

export const useActiveArea = () => usePOSStore((s) => s.activeArea);
export const useAreas = () => usePOSStore((s) => s.areas);
export const useCategories = () => usePOSStore((s) => s.categories);
export const useToppings = () => usePOSStore((s) => s.toppings);
export const useInventoryItems = () => usePOSStore((s) => s.inventoryItems);
export const useInventoryTransactions = () => usePOSStore((s) => s.inventoryTransactions);
export const useRecurringExpenses = () => usePOSStore((s) => s.recurringExpenses);
export const useCashTransactions = () => usePOSStore((s) => s.cashTransactions);
export const useShiftHistory = () => usePOSStore((s) => s.shiftHistory);
export const useActiveShift = () => usePOSStore((s) => s.activeShift);
export const useCustomers = () => usePOSStore((s) => s.customers);
export const useParkedOrders = () => usePOSStore((s) => s.parkedOrders);
export const useViewMode = () => usePOSStore((s) => s.viewMode);
export const useOrderChannel = () => usePOSStore((s) => s.orderChannel);
export const useOutOfStockProductIds = () => usePOSStore((s) => s.outOfStockProductIds);
export const useMenuItems = () => usePOSStore((s) => s.menuItems);
export const useKDSOrders = () => usePOSStore((s) => s.kdsOrders);
export const useOrderHistory = () => usePOSStore((s) => s.orderHistory);
export const useStoreSettings = () => usePOSStore((s) => s.storeSettings);
export const useIsRailCollapsed = () => usePOSStore((s) => s.isRailCollapsed);
export const usePinnedItemIds = () => usePOSStore((s) => s.pinnedItemIds);

// 2. Stable Action Selectors (Zero-Allocation Proxy Singleton)
const posActionsProxy = new Proxy({} as any, {
  get(_target, prop) {
    const fn = (usePOSStore.getState() as any)[prop];
    if (typeof fn === 'function') {
      return fn;
    }
    return fn;
  },
});

export const usePOSActions = () => posActionsProxy;
