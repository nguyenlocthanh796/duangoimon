import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, oledTheme, ThemeType } from './colors';

export * from './tokens';
export * from './m3';

export type ThemeMode = 'light' | 'dark' | 'oled' | 'system';

interface ThemeContextType {
  theme: ThemeType;
  isDark: boolean;
  isOled: boolean;
  mode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  isOled: false,
  mode: 'light',
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  // Mặc định luôn ưu tiên chế độ SÁNG (Light POS Clean Slate)
  const [mode, setMode] = useState<ThemeMode>('light');

  const isDark = mode === 'oled' || (mode === 'system' ? systemScheme === 'dark' : mode === 'dark');
  const isOled = mode === 'oled';
  const theme = mode === 'oled' ? oledTheme : isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' || prev === 'oled' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, isOled, mode, toggleTheme, setThemeMode: setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
