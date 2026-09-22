import React, { createContext, useContext, useState } from 'react';

export interface BankAccount {
  bankName: string;
  accountNo: string;
  accountName: string;
}

export interface POSSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptHeader: string;
  receiptFooter: string;
  primaryBank: BankAccount;
  vatRate: number;
}

const defaultSettings: POSSettings = {
  storeName: 'Cửa Hàng F&B',
  storeAddress: 'Việt Nam',
  storePhone: '',
  receiptHeader: 'Cảm ơn Quý khách đã ủng hộ!',
  receiptFooter: 'Hẹn gặp lại Quý khách lần sau!',
  primaryBank: {
    bankName: 'MBBank',
    accountNo: '',
    accountName: '',
  },
  vatRate: 0,
};

interface POSSettingsContextType {
  settings: POSSettings;
  updateSettings: (newSettings: Partial<POSSettings>) => void;
}

const POSSettingsContext = createContext<POSSettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export const POSSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<POSSettings>(defaultSettings);

  const updateSettings = (newSettings: Partial<POSSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <POSSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </POSSettingsContext.Provider>
  );
};

export const usePOSSettings = () => useContext(POSSettingsContext);
