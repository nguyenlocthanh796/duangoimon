import { getKitchenModuleEnabled, setKitchenModuleEnabled } from '../utils/kitchenSettings';

export interface BankAccountItem {
  id: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  bankBranch?: string;
  qrImageUrl?: string;
  isPrimary: boolean;
  isSpeakerEnabled: boolean;
  speakerName?: string;
}

export interface POSSettings {
  autoPrintReceipt: boolean;
  autoPrintKitchenTicket: boolean;
  paperSize: 'K80' | 'K57';
  receiptFontSize: 'normal' | 'large';
  showLogoOnReceipt: boolean;
  receiptLogoUrl: string;
  kitchenTicketCopies: number;
  receiptHeaderTitle: string;
  receiptHeaderAddress: string;
  receiptHeaderPhone: string;
  receiptHeaderTaxId: string;
  receiptFooterText: string;
  showQrOnReceipt: boolean;
  printerType: 'browser' | 'lan' | 'bluetooth';
  cashierPrinterIp: string;
  kitchenPrinterIp: string;
  bankAccounts: BankAccountItem[];
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  bankBranch: string;
  defaultPaymentMethod: 'tien_mat' | 'qr' | 'card' | 'chuyen_khoan';
  enableDynamicQR: boolean;
  customCashPills: number[];
  enableKitchenModule: boolean;
  defaultServiceType: 'dine_in' | 'takeaway';
  defaultVatRate: number;
  vatType: 'inclusive' | 'exclusive';
  defaultServiceChargeRate: number;
  allowDiscount: boolean;
  maxDiscountPercent: number;
  quickAddMode: 'direct' | 'modal';
  allowPriceEdit: boolean;
  autoCloseCartMobile: boolean;
  enableTableMap: boolean;
  enableMergeTables: boolean;
  enableSplitItems: boolean;
  enableHoldOrder: boolean;
  enableCustomerCRM: boolean;
  enableVatInvoice: boolean;
  enableFastCashPills: boolean;
  tableLayoutMode: 'grid' | 'list';
  menuLayoutMode: 'grid' | 'list';
  enableInventoryDeduction: boolean;
  enableLowStockWarning: boolean;
  allowNegativeStockSales: boolean;
  requireManagerPinForVoid: boolean;
  autoLockIdleMinutes: number;
  enableCashDrawerAutoOpen: boolean;
  requireShiftAuditOnClose: boolean;
  holidaySurchargePercent: number;
  serviceChargePercent: number;
  cashRoundingRule: 'none' | 'round_1000_down' | 'round_1000_up';
  reprintStampEnabled: boolean;
  tablesGridColumns: number;
  productsGridColumns: number;
  enableSoundEffects: boolean;
  enableHaptics: boolean;
}

export const DEFAULT_BANK_ACCOUNTS: BankAccountItem[] = [
  {
    id: 'bank-1',
    bankName: 'MBBank',
    bankAccountNo: '0987654321',
    bankAccountName: 'NGUYEN LOC THANH',
    bankBranch: 'Chi nhánh TP.HCM',
    qrImageUrl: 'https://api.vietqr.io/image/970422-0987654321-compact2.png',
    isPrimary: true,
    isSpeakerEnabled: true,
    speakerName: 'Loa MB Soundbox 01 (Quầy thu ngân)',
  },
  {
    id: 'bank-2',
    bankName: 'Vietcombank',
    bankAccountNo: '1012345678',
    bankAccountName: 'CUA HANG POS FB',
    bankBranch: 'Chi nhánh Tân Bình',
    qrImageUrl: '',
    isPrimary: false,
    isSpeakerEnabled: false,
    speakerName: '',
  },
];

export const DEFAULT_POS_SETTINGS: POSSettings = {
  autoPrintReceipt: false,
  autoPrintKitchenTicket: true,
  paperSize: 'K80',
  receiptFontSize: 'normal',
  showLogoOnReceipt: true,
  receiptLogoUrl: 'https://pos.ongchu.vn/logo.png',
  kitchenTicketCopies: 1,
  receiptHeaderTitle: 'NHÀ HÀNG POS F&B',
  receiptHeaderAddress: '123 Đường Nguyễn Trãi, Phường 2, Quận 5, TP.HCM',
  receiptHeaderPhone: '0901 234 567',
  receiptHeaderTaxId: '0312345678',
  receiptFooterText: 'Cảm ơn Quý khách & Hẹn gặp lại!\nWi-Fi: POS_FB_GUEST / Pass: posfb2026',
  showQrOnReceipt: true,
  printerType: 'browser',
  cashierPrinterIp: '192.168.1.200',
  kitchenPrinterIp: '192.168.1.201',
  bankAccounts: DEFAULT_BANK_ACCOUNTS,
  bankName: 'MBBank',
  bankAccountNo: '0987654321',
  bankAccountName: 'NGUYEN LOC THANH',
  bankBranch: 'Chi nhánh TP.HCM',
  defaultPaymentMethod: 'tien_mat',
  enableDynamicQR: true,
  customCashPills: [50000, 100000, 200000, 500000],
  enableKitchenModule: true,
  defaultServiceType: 'dine_in',
  defaultVatRate: 8,
  vatType: 'inclusive',
  defaultServiceChargeRate: 0,
  allowDiscount: true,
  maxDiscountPercent: 50,
  quickAddMode: 'direct',
  allowPriceEdit: false,
  autoCloseCartMobile: false,
  enableTableMap: true,
  enableMergeTables: true,
  enableSplitItems: true,
  enableHoldOrder: true,
  enableCustomerCRM: true,
  enableVatInvoice: true,
  enableFastCashPills: true,
  tableLayoutMode: 'grid',
  menuLayoutMode: 'grid',
  enableInventoryDeduction: true,
  enableLowStockWarning: true,
  allowNegativeStockSales: false,
  requireManagerPinForVoid: true,
  autoLockIdleMinutes: 5,
  enableCashDrawerAutoOpen: true,
  requireShiftAuditOnClose: true,
  holidaySurchargePercent: 0,
  serviceChargePercent: 0,
  cashRoundingRule: 'none',
  reprintStampEnabled: true,
  tablesGridColumns: 0,
  productsGridColumns: 0,
  enableSoundEffects: true,
  enableHaptics: true,
};
