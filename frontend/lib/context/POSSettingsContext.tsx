'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  POSSettings,
  DEFAULT_POS_SETTINGS,
  DEFAULT_BANK_ACCOUNTS,
} from '../types/posSettings';
import { getKitchenModuleEnabled, setKitchenModuleEnabled } from '../utils/kitchenSettings';

const SETTINGS_STORAGE_KEY = 'POS_SETTINGS_V1';

let SecureStore: any = null;
async function getSecureStore() {
  if (!SecureStore && Platform.OS !== 'web') {
    try {
      SecureStore = await import('expo-secure-store');
    } catch {
      SecureStore = null;
    }
  }
  return SecureStore;
}

async function loadSavedSettings(): Promise<Partial<POSSettings> | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
      }
      return null;
    } else {
      const store = await getSecureStore();
      if (store) {
        const saved = await store.getItemAsync(SETTINGS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
      }
    }
  } catch (e) {
    console.warn('[POSSettingsContext] Failed to load settings from storage:', e);
  }
  return null;
}

async function persistSettings(newSettings: POSSettings): Promise<void> {
  try {
    const json = JSON.stringify(newSettings);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, json);
      }
    } else {
      const store = await getSecureStore();
      if (store) {
        await store.setItemAsync(SETTINGS_STORAGE_KEY, json);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, json);
      }
    }
  } catch (e) {
    console.warn('[POSSettingsContext] Failed to persist settings to storage:', e);
  }
}

async function removeSavedSettings(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
    } else {
      const store = await getSecureStore();
      if (store) {
        await store.deleteItemAsync(SETTINGS_STORAGE_KEY);
      } else if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
    }
  } catch (e) {
    console.warn('[POSSettingsContext] Failed to remove settings:', e);
  }
}

export interface POSSettingsContextType {
  settings: POSSettings;
  isLoaded: boolean;
  updateSettings: (newSettings: Partial<POSSettings>) => void;
  resetToDefaults: () => void;
}

const POSSettingsContext = createContext<POSSettingsContextType>({
  settings: DEFAULT_POS_SETTINGS,
  isLoaded: false,
  updateSettings: () => {},
  resetToDefaults: () => {},
});

import { api } from '../api';

export function POSSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<POSSettings>(DEFAULT_POS_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const kitchenEnabled = getKitchenModuleEnabled();
      const localSaved = await loadSavedSettings();
      let merged: POSSettings = { ...DEFAULT_POS_SETTINGS, enableKitchenModule: kitchenEnabled };

      if (localSaved) {
        merged = {
          ...merged,
          ...localSaved,
          bankAccounts:
            localSaved.bankAccounts && localSaved.bankAccounts.length > 0
              ? localSaved.bankAccounts
              : DEFAULT_BANK_ACCOUNTS,
        };
      }

      // Try fetching database store settings from server
      try {
        const res = await api.getPOSSettings();
        if (res?.settings) {
          const dbSettings = res.settings;
          // Preserve local device-level layout preferences
          const deviceMenuLayout = localSaved?.menuLayoutMode ?? merged.menuLayoutMode;
          const deviceTableLayout = localSaved?.tableLayoutMode ?? merged.tableLayoutMode;
          const deviceSound = localSaved?.enableSoundEffects ?? merged.enableSoundEffects;
          const deviceHaptics = localSaved?.enableHaptics ?? merged.enableHaptics;

          merged = {
            ...merged,
            ...dbSettings,
            menuLayoutMode: deviceMenuLayout,
            tableLayoutMode: deviceTableLayout,
            enableSoundEffects: deviceSound,
            enableHaptics: deviceHaptics,
            enableKitchenModule: kitchenEnabled,
          };
        }
      } catch {
        // Backend unavailable — graceful fallback to local settings
      }

      if (mounted) {
        setSettings(merged);
        setIsLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<POSSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.enableKitchenModule !== undefined) {
        setKitchenModuleEnabled(newSettings.enableKitchenModule);
      }
      persistSettings(updated);
      // Sync store settings to backend database
      api.savePOSSettings(updated).catch((err) => {
        console.warn('[POSSettingsContext] Failed to save settings to DB:', err);
      });
      return updated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_POS_SETTINGS);
    setKitchenModuleEnabled(true);
    removeSavedSettings();
    api.savePOSSettings(DEFAULT_POS_SETTINGS).catch(() => {});
  }, []);

  return (
    <POSSettingsContext.Provider
      value={{
        settings,
        isLoaded,
        updateSettings,
        resetToDefaults,
      }}
    >
      {children}
    </POSSettingsContext.Provider>
  );
}

export function usePOSSettingsContext(): POSSettingsContextType {
  return useContext(POSSettingsContext);
}

export function usePOSSettings(): POSSettingsContextType {
  return useContext(POSSettingsContext);
}
