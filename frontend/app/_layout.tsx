import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../lib/context/AuthContext';
import { SidebarProvider } from '../lib/context/SidebarContext';
import { ThemeProvider, useTheme } from '../lib/context/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from '../lib/components/ui/ErrorBoundary';
import { TableSkeleton } from '../lib/components/ui/Skeleton';
import {
  useFonts,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// Suppress RNW dev-mode "Unexpected text node" warnings (cosmetic only)
const origConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = args.join(' ');
  if (msg.includes('Unexpected text node')) return;
  origConsoleError.apply(console, args);
};

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
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
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
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    'material-community': require('../assets/fonts/MaterialCommunityIcons.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>
              <AppWithTheme />
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
