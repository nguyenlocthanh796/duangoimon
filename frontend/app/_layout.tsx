import React, { useEffect } from 'react';
import { View, Image, Platform, StatusBar as RNStatusBar, LogBox, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../lib/store/useAuthStore';
import { AppText } from '../lib/components/ui/AppText';
import { playTapSound } from '../lib/utils/sound';

LogBox.ignoreAllLogs(true);
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../lib/theme';
import { useResponsive } from '../lib/hooks/useResponsive';
import { POSSettingsProvider } from '../lib/context/POSSettingsContext';
import { AppToastProvider, AppRailNav, AppSidebar } from '../lib/components/ui';

function RootNavigation() {
  const { isDark, theme } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentRole = useAuthStore((s) => s.currentRole);
  const impersonation = useAuthStore((s) => s.impersonation);
  const stopImpersonation = useAuthStore((s) => s.stopImpersonation);
  const canAccessRoute = useAuthStore((s) => s.canAccessRoute);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const hasHydrated = _hasHydrated || (useAuthStore.persist?.hasHydrated?.() ?? true);

  useEffect(() => {
    if (Platform.OS === 'android') {
      try {
        RNStatusBar.setTranslucent(true);
        RNStatusBar.setBackgroundColor('transparent', true);
        NavigationBar.setStyle(isDark ? 'dark' : 'light');
      } catch (_) {}
    }
  }, [isDark]);

  useEffect(() => {
    try {
      const { wsClient } = require('../lib/api/wsClient');
      wsClient.connect();
    } catch (_) {}

    // 🌟 Nhúng Google Font Inter và CSS Antialiasing chuẩn quốc tế trên Web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontId = 'ongchu-web-inter-font';
      if (!document.getElementById(fontId)) {
        const linkFont = document.createElement('link');
        linkFont.id = fontId;
        linkFont.rel = 'stylesheet';
        linkFont.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(linkFont);

        const style = document.createElement('style');
        style.id = 'ongchu-web-styles';
        style.innerHTML = `
          html, body, #root {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
          }
          .tabular-nums, [data-tabular="true"] {
            font-variant-numeric: tabular-nums !important;
          }
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.4);
            border-radius: 9999px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(100, 116, 139, 0.7);
          }
          [role="button"], button, a {
            cursor: pointer !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  useEffect(() => {
    // 🛡️ CHỜ HYDRATION: Đợi AsyncStorage nạp xong dữ liệu phiên đăng nhập thực tế
    if (!hasHydrated) return;

    const rawPath = (pathname || '/').split('?')[0].trim();
    const cleanPath = rawPath === '' || rawPath === '/index' || rawPath === '/index/' ? '/' : rawPath;

    if (!isAuthenticated && cleanPath !== '/login' && cleanPath !== '/cfd') {
      router.replace('/login');
      return;
    }

    if (isAuthenticated) {
      // 1. Super Admin: Cổng quản trị SaaS độc lập. Tuyệt đối không ở màn hình POS bán hàng (trừ khi mạo danh hỗ trợ quán)
      if (currentRole === 'super_admin' && !impersonation?.isImpersonating) {
        if (cleanPath !== '/saas-admin' && cleanPath !== '/login') {
          router.replace('/saas-admin' as any);
        }
        return;
      }

      // 2. Tài khoản POS quán thường (Owner, Manager, Cashier, Server): Không được vào cổng SaaS Admin
      if (cleanPath === '/saas-admin' && !impersonation?.isImpersonating) {
        router.replace('/');
        return;
      }

      // 3. Phân quyền các phân hệ thông thường (chỉ redirect nếu đường dẫn khác '/' và không được phép truy cập)
      if (cleanPath !== '/' && cleanPath !== '/login' && !canAccessRoute(cleanPath)) {
        router.replace('/');
      }
    }
  }, [hasHydrated, isAuthenticated, currentRole, impersonation?.isImpersonating, pathname, canAccessRoute]);

  const isCfd = pathname === '/cfd';
  const isLogin = pathname === '/login';
  const isSaasAdmin = pathname === '/saas-admin';
  const isStandalone = isCfd || isLogin || isSaasAdmin;
  const showRail = isWide && !isStandalone;
  const showSidebar = !isWide && !isStandalone;

  const [isSplashReady, setIsSplashReady] = React.useState(false);

  useEffect(() => {
    // 🌟 Hiển thị màn hình chào Splash Screen với Logo OngChu POS trong 150ms (Boot siêu tốc 0ms)
    const timer = setTimeout(() => {
      setIsSplashReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  if (!hasHydrated || !isSplashReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.surface.app,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <RNStatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
        <NavigationBar style={isDark ? 'dark' : 'light'} />
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Image
            source={require('../assets/logo_ongchu_clean.png')}
            style={{ width: 140, height: 140 }}
            resizeMode="contain"
          />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <AppText variant="lg" weight="bold" color={theme.text.primary}>
              OngChu POS
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Hệ Thống Quản Lý F&B Vị Chủ Quán
            </AppText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.surface.app }}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
        animated
      />
      <NavigationBar style={isDark ? 'dark' : 'light'} />
      {showRail && <AppRailNav />}
      <View style={{ flex: 1, backgroundColor: theme.surface.app }}>
        {impersonation?.isImpersonating && (
          <View
            style={{
              backgroundColor: theme.brand.purple,
              paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 10),
              paddingBottom: 8,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: 'rgba(255,255,255,0.2)',
              zIndex: 9999,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
              <Icon name="shield-account" size={18} color={theme.text.onBrand} />
              <View style={{ flex: 1 }}>
                <AppText variant="xs" weight="medium" color={theme.text.onBrand} numberOfLines={1}>
                  Đang Hỗ Trợ: {impersonation.tenantName} ({impersonation.tenantCode})
                </AppText>
                <AppText variant="xs" color="rgba(255,255,255,0.85)" style={{ marginTop: 1 }}>
                  Toàn quyền Chủ Quán · Dữ liệu cô lập
                </AppText>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                stopImpersonation();
                router.replace('/saas-admin' as any);
              }}
              style={{
                backgroundColor: theme.surface.card,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
              accessibilityLabel="Quay lại SaaS Admin"
            >
              <Icon name="exit-to-app" size={14} color={theme.brand.purple} />
              <AppText variant="xs" weight="medium" color={theme.brand.purple}>
                Về SaaS Admin
              </AppText>
            </TouchableOpacity>
          </View>
        )}
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: theme.surface.app },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login/index" />
          <Stack.Screen name="thanh-toan/index" />
          <Stack.Screen name="cfd/index" />
          <Stack.Screen name="kds/index" />
          <Stack.Screen name="hoa-don/index" />
          <Stack.Screen name="so-quy/index" />
          <Stack.Screen name="giao-ca/index" />
          <Stack.Screen name="bao-cao-loi-nhuan/index" />
          <Stack.Screen name="thuc-don/index" />
          <Stack.Screen name="cai-dat/index" />
          <Stack.Screen name="saas-admin/index" />
          <Stack.Screen name="quan-ly-ban/index" />
          <Stack.Screen name="kho-hang/index" />
          <Stack.Screen name="nhan-su/index" />
          <Stack.Screen name="khach-hang/index" />
          <Stack.Screen name="huong-dan/index" />
        </Stack>
      </View>
      {showSidebar && <AppSidebar />}
    </View>
  );
}

function EmulatorInsetsWrapper({ children }: { children: React.ReactNode }) {
  const emulatorInsets =
    Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).__INITIAL_SAFE_AREA_INSETS__
      ? (window as any).__INITIAL_SAFE_AREA_INSETS__
      : null;

  if (emulatorInsets) {
    return (
      <SafeAreaInsetsContext.Provider value={emulatorInsets}>
        {children}
      </SafeAreaInsetsContext.Provider>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <EmulatorInsetsWrapper>
          <ThemeProvider>
            <POSSettingsProvider>
              <AppToastProvider>
                <RootNavigation />
              </AppToastProvider>
            </POSSettingsProvider>
          </ThemeProvider>
        </EmulatorInsetsWrapper>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
