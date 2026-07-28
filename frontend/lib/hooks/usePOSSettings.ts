'use client';
import { useState, useEffect, useCallback } from 'react';
import { getKitchenModuleEnabled, setKitchenModuleEnabled } from '../utils/kitchenSettings';

export interface BankAccountItem {
  id: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  bankBranch?: string;
  qrImageUrl?: string; // Custom uploaded QR code image or Soundbox QR URL
  isPrimary: boolean;
  isSpeakerEnabled: boolean;
  speakerName?: string; // e.g. "Loa MB Soundbox Thu Ngân"
}

export interface POSSettings {
  // 🖨 Printing & Receipt Customization
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

  // 💳 Bank Account & VietQR Payment Settings (Multi-Bank)
  bankAccounts: BankAccountItem[];
  bankName: string; // Active Primary Bank
  bankAccountNo: string;
  bankAccountName: string;
  bankBranch: string;
  defaultPaymentMethod: 'tien_mat' | 'qr' | 'card' | 'chuyen_khoan';
  enableDynamicQR: boolean;
  customCashPills: number[];

  // ⚖️ Ordering, Tax & Operation Rules
  enableKitchenModule: boolean;
  defaultServiceType: 'dine_in' | 'takeaway';
  defaultVatRate: number; // 0, 5, 8, 10
  vatType: 'inclusive' | 'exclusive';
  defaultServiceChargeRate: number; // 0, 5, 10
  allowDiscount: boolean;
  maxDiscountPercent: number;
  quickAddMode: 'direct' | 'modal';
  allowPriceEdit: boolean;
  autoCloseCartMobile: boolean;

  // 🧩 Custom POS Feature Toggles (Tùy Chỉnh Tính Năng Bán Hàng)
  enableTableMap: boolean; // Sơ đồ bàn & phòng
  enableMergeTables: boolean; // Ghép bàn & gộp đơn
  enableSplitItems: boolean; // Tách món & chia hóa đơn
  enableHoldOrder: boolean; // Lưu nháp & Tạm giữ đơn
  enableCustomerCRM: boolean; // Quản lý khách hàng & tích điểm CRM
  enableVatInvoice: boolean; // Thông tin xuất hóa đơn VAT điện tử
  enableFastCashPills: boolean; // Phím gợi ý tiền mặt nhanh

  // 📐 Layout Customization (Dạng Bảng / Thẻ vs Dạng Danh Sách)
  tableLayoutMode: 'grid' | 'list'; // Sơ đồ bàn: dạng lưới ô vuông vs dạng danh sách
  menuLayoutMode: 'grid' | 'list'; // Thực đơn món: dạng thẻ có ảnh vs dạng danh sách dòng

  // 🏬 Enterprise Advanced Operational Customizations (Chuẩn Công Nghiệp Enterprise)
  enableInventoryDeduction: boolean; // Tự động trừ kho nguyên liệu thời gian thực
  enableLowStockWarning: boolean; // Cảnh báo tồn kho tối thiểu
  allowNegativeStockSales: boolean; // Cho phép bán âm kho
  
  requireManagerPinForVoid: boolean; // Bắt buộc PIN Quản lý khi Hủy đơn / Giảm giá > 20%
  autoLockIdleMinutes: number; // Tự động khóa màn hình POS sau X phút (0 = tắt)
  enableCashDrawerAutoOpen: boolean; // Tự động mở két tiền khi thu tiền mặt
  requireShiftAuditOnClose: boolean; // Bắt buộc đếm tiền kiểm két khi chốt ca thu ngân
  
  holidaySurchargePercent: number; // Phụ thu ngày Lễ / Tết (0, 10, 15, 20%)
  serviceChargePercent: number; // Phí phục vụ VIP / Phòng lạnh (0, 5, 10%)
  cashRoundingRule: 'none' | 'round_1000_down' | 'round_1000_up'; // Quy tắc làm tròn tiền mặt
  
  reprintStampEnabled: boolean; // In chữ "BẢN IN LẠI" khi in bill lần 2

  // 🖥 UI & Sound Feedback
  tablesGridColumns: number; // 0 (auto), 3, 4, 5, 6
  productsGridColumns: number; // 0 (auto), 2, 3, 4
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
  // 🖨 Printing & Receipt
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

  // 💳 Bank Account & VietQR
  bankAccounts: DEFAULT_BANK_ACCOUNTS,
  bankName: 'MBBank',
  bankAccountNo: '0987654321',
  bankAccountName: 'NGUYEN LOC THANH',
  bankBranch: 'Chi nhánh TP.HCM',
  defaultPaymentMethod: 'tien_mat',
  enableDynamicQR: true,
  customCashPills: [50000, 100000, 200000, 500000],

  // ⚖️ Ordering & Tax Rules
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

  // 🧩 Custom POS Feature Toggles
  enableTableMap: true,
  enableMergeTables: true,
  enableSplitItems: true,
  enableHoldOrder: true,
  enableCustomerCRM: true,
  enableVatInvoice: true,
  enableFastCashPills: true,

  // 📐 Layout Customization
  tableLayoutMode: 'grid',
  menuLayoutMode: 'grid',

  // 🏬 Enterprise Advanced Operational Customizations
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

  // 🖥 UI & Sound
  tablesGridColumns: 0,
  productsGridColumns: 0,
  enableSoundEffects: true,
  enableHaptics: true,
};

const SETTINGS_STORAGE_KEY = 'POS_SETTINGS_V1';

export function usePOSSettings() {
  const [settings, setSettings] = useState<POSSettings>(DEFAULT_POS_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        const kitchenEnabled = getKitchenModuleEnabled();
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings((prev) => ({
            ...prev,
            ...parsed,
            bankAccounts: parsed.bankAccounts && parsed.bankAccounts.length > 0 ? parsed.bankAccounts : DEFAULT_BANK_ACCOUNTS,
            enableKitchenModule: kitchenEnabled,
          }));
        } else {
          setSettings((prev) => ({ ...prev, enableKitchenModule: kitchenEnabled }));
        }
      }
    } catch {
      /* ignore storage errors */
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings
  const updateSettings = useCallback((newSettings: Partial<POSSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.enableKitchenModule !== undefined) {
        setKitchenModuleEnabled(newSettings.enableKitchenModule);
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
        }
      } catch {
        /* ignore storage errors */
      }
      return updated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_POS_SETTINGS);
    setKitchenModuleEnabled(true);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
    resetToDefaults,
  };
}
