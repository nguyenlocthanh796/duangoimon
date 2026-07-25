import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../lib/context/AuthContext';
import { useTheme } from '../lib/context/ThemeContext';
import LoginForm from '../lib/components/auth/LoginForm';
import { ASSETS } from '../lib/assets';
import { font } from '../lib/theme/typography';
import { palette } from '../lib/theme/colors';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// ─── Main Screen ──────────────────────────────────────────
export default function LoginScreen() {
  const { login } = useAuth();
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const textPrimary = isDark ? '#F1F5F9' : '#111827';
  const textSecondary = isDark ? '#94A3B8' : '#6B7280';
  const bgColor = isDark ? '#0F172A' : '#F8FAFC';

  return (
    <SafeAreaView style={[s.root, { backgroundColor: bgColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              s.inner,
              { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
            ]}
          >
            {/* Logo */}
            <View style={s.logoWrap}>
              <LinearGradient
                colors={['rgba(249,115,22,0.12)', 'rgba(249,115,22,0.04)']}
                style={s.logoCircle}
              >
                <Image
                  source={ASSETS.brand.logoMark}
                  style={{ width: 32, height: 32 }}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>

            <Text style={[s.title, { color: textPrimary }]}>
              POS <Text style={{ color: '#F97316' }}>Pro</Text>
            </Text>
            <Text style={[s.subtitle, { color: textSecondary }]}>
              Đăng nhập để tiếp tục
            </Text>

            {/* Form Card */}
            <View
              style={[
                s.formCard,
                { backgroundColor: cardBg },
                isDark ? {} : Platform.OS === 'web'
                  ? { boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }
                  : { elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
              ]}
            >
              <LoginForm onLogin={login} />
            </View>

            {/* Footer */}
            <Text style={s.footer}>© 2026 POS Pro. All rights reserved.</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  inner: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logoWrap: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...font.lg,
    fontSize: 22,
    lineHeight: 42,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...font.sm,
    textAlign: 'center',
    marginBottom: 28,
  },
  formCard: {
    width: '100%',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  footer: {
    ...font.sm,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 32,
  },
});
