import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../lib/context/AuthContext';
import { SidebarProvider } from '../lib/context/SidebarContext';
import { ThemeProvider, useTheme } from '../lib/context/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from '../lib/components/ui/ErrorBoundary';
import { TableSkeleton } from '../lib/components/ui/Skeleton';
import WebIPhoneFrame from '../lib/components/ui/WebIPhoneFrame';
import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_400Regular_Italic,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import * as SplashScreen from 'expo-splash-screen';
import { POSSettingsProvider } from '../lib/context/POSSettingsContext';

SplashScreen.preventAutoHideAsync();

// Suppress RNW dev-mode "Unexpected text node" warnings (cosmetic only)
const origConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.join(' ');
  if (msg.includes('Unexpected text node')) return;
  origConsoleError.apply(console, args);
};

// Web iPhone Safe Area Mock Metrics (Simulate iPhone 11 Pro Max 1-to-1 in Expo Web mode)
const WEB_INSETS = { top: 44, bottom: 34, left: 0, right: 0 };
const webInitialMetrics = Platform.OS === 'web' ? {
  frame: { x: 0, y: 0, width: 414, height: 896 },
  insets: WEB_INSETS,
} : undefined;

// ─── Auth-gated stack ──────────────────────────────────────
function AppStack() {
  const { isInitialized } = useAuth();

  // Show splash/loading until auth is resolved to prevent flash of login
  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0F172A',
        }}
      >
        <TableSkeleton rowCount={5} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: true, animation: 'slide_from_right', animationDuration: 300 }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" options={{ animation: 'none' }} />
        <Stack.Screen name="ban-hang" />
        <Stack.Screen name="quan-ly" />
        <Stack.Screen name="ke-toan" />
      </Stack>
    </ErrorBoundary>
  );
}

function AppWithTheme() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppStack />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_400Regular_Italic,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    'material-community': require('../assets/fonts/MaterialCommunityIcons.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const appContent = (
    <POSSettingsProvider>
      <ThemeProvider>
        <AuthProvider>
          <SidebarProvider>
            <AppWithTheme />
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </POSSettingsProvider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={webInitialMetrics}>
        {Platform.OS === 'web' ? (
          <SafeAreaInsetsContext.Provider value={WEB_INSETS}>
            <WebIPhoneFrame>{appContent}</WebIPhoneFrame>
          </SafeAreaInsetsContext.Provider>
        ) : (
          appContent
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
