import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { AppText } from './AppText';

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

export interface ToastOptions {
  title: string;
  message?: string;
  type?: ToastType;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useAppToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useAppToast must be used within an AppToastProvider');
  }
  return ctx;
};

export const AppToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useResponsive();

  const [toast, setToast] = useState<ToastOptions | null>(null);
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const useNative = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(translateY, { toValue: 16, duration: 160, useNativeDriver: useNative }),
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: useNative }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    ({ title, message, type = 'success', durationMs = 2000 }: ToastOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (Platform.OS !== 'web') {
        try {
          if (type === 'danger' || type === 'warning') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch {}
      }

      setToast({ title, message, type, durationMs });

      // Reset initial animation states
      translateY.setValue(20);
      opacity.setValue(0);

      const useNative = Platform.OS !== 'web';
      // Spring up from bottom gently like Native OS Toast / Dynamic Island HUD
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, friction: 9, tension: 90, useNativeDriver: useNative }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: useNative }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, durationMs);
    },
    [translateY, opacity, hideToast]
  );

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { icon: 'check-circle' as const, color: theme.brand.success };
      case 'warning':
        return { icon: 'alert-circle' as const, color: theme.brand.warning };
      case 'danger':
        return { icon: 'close-circle' as const, color: theme.brand.danger };
      case 'info':
      default:
        return { icon: 'information' as const, color: theme.brand.primary };
    }
  };

  const currentIcon = toast ? getToastIcon(toast.type || 'info') : null;

  // Single-line concise copy (OS Toast Invariant - Microcopy <= 7-10 words)
  const displayText = toast
    ? (() => {
        if (!toast.message || toast.message.trim() === toast.title.trim()) {
          return toast.title;
        }
        const tLower = toast.title.toLowerCase().trim();
        const mLower = toast.message.toLowerCase().trim();
        if (mLower.startsWith(tLower) || mLower.includes(tLower)) {
          return toast.message;
        }
        return `${toast.title} · ${toast.message}`;
      })()
    : '';

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && currentIcon && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              bottom: Math.max(insets.bottom, 16) + (isWide ? 28 : 74),
              transform: [{ translateY }],
              opacity,
            },
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.toastPill,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.96)' : 'rgba(15, 23, 42, 0.94)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.12)',
              },
            ]}
          >
            <Icon name={currentIcon.icon} size={16} color={currentIcon.color} />
            <AppText
              variant="xs"
              weight="medium"
              color={theme.text.onBrand}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.toastText}
            >
              {displayText}
            </AppText>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999999,
    elevation: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    maxWidth: 420,
    gap: 8,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toastText: {
    flexShrink: 1,
  },
});
