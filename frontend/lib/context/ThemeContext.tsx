'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { colors, colorsDark, type ThemeColors } from '../theme/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  theme: ThemeColors;
  colors: typeof colors;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  theme: colors,
  colors,
  isDark: false,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = 'pos_theme_mode';

function getStoredTheme(): ThemeMode | null {
  try {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    }
  } catch {}
  return null;
}

function storeTheme(mode: ThemeMode) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme() || 'system');

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const theme = isDark ? colorsDark : colors;

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    storeTheme(newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = isDark ? 'light' : 'dark';
      storeTheme(next);
      return next;
    });
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ mode, theme, colors: theme, isDark, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
