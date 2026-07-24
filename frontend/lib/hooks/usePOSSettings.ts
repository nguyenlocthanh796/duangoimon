'use client';
import { useState, useEffect, useCallback } from 'react';

export interface POSSettings {
  // Printing & Receipt
  autoPrintReceipt: boolean;
  autoPrintKitchenTicket: boolean;
  paperSize: 'K80' | 'K57';
  kitchenTicketCopies: number;
  receiptHeaderTitle: string;
  receiptHeaderAddress: string;
  receiptHeaderPhone: string;
  receiptHeaderTaxId: string;
  receiptFooterText: string;

  // Ordering & Operations
  defaultServiceType: 'dine_in' | 'takeaway';
  defaultVatRate: number; // 0, 8, 10
  defaultServiceChargeRate: number; // 0, 5, 10
  quickAddMode: 'direct' | 'modal';
  allowPriceEdit: boolean;
  autoCloseCartMobile: boolean;

  // Payment & Cashier
  defaultPaymentMethod: 'tien_mat' | 'qr' | 'card' | 'chuyen_khoan';
  enableDynamicQR: boolean;
  customCashPills: number[];

  // UI & Audio/Haptics
  tablesGridColumns: number; // 0 (auto), 3, 4, 5, 6
  productsGridColumns: number; // 0 (auto), 2, 3, 4
  enableSoundEffects: boolean;
  enableHaptics: boolean;
}

export const DEFAULT_POS_SETTINGS: POSSettings = {
  // Printing & Receipt
  autoPrintReceipt: false,
  autoPrintKitchenTicket: true,
  paperSize: 'K80',
  kitchenTicketCopies: 1,
  receiptHeaderTitle: 'NHÀ HÀNG POS F&B',
  receiptHeaderAddress: '123 Đường Nguyễn Trãi, Q.5, TP.HCM',
  receiptHeaderPhone: '0901 234 567',
  receiptHeaderTaxId: '0312345678',
  receiptFooterText: 'Cảm ơn Quý khách & Hẹn gặp lại!\nPass Wi-Fi: posfb2026',

  // Ordering & Operations
  defaultServiceType: 'dine_in',
  defaultVatRate: 8,
  defaultServiceChargeRate: 0,
  quickAddMode: 'direct',
  allowPriceEdit: false,
  autoCloseCartMobile: false,

  // Payment & Cashier
  defaultPaymentMethod: 'tien_mat',
  enableDynamicQR: true,
  customCashPills: [50000, 100000, 200000, 500000],

  // UI & Audio/Haptics
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
        if (saved) {
          const parsed = JSON.parse(saved);
          setSettings((prev) => ({ ...prev, ...parsed }));
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
