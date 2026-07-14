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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../lib/context/AuthContext';
import { useTheme } from '../lib/context/ThemeContext';
import LoginForm from '../lib/components/auth/LoginForm';
import { ASSETS } from '../lib/assets';
import { palette } from '../lib/theme/colors';
import { font } from '../lib/theme/typography';

// ─── Constants ─────────────────────────────────────────────
const ORANGE_GRADIENT: [string, string, string] = ['#F97316', '#F97316', '#DC2626'];
const ORANGE_GRADIENT_LIGHT: [string, string] = ['#FF8A50', '#F97316'];

const FEATURES = [
  { label: 'Bán hàng & gọi món', desc: 'Thao tác nhanh trên mọi thiết bị' },
  { label: 'Quản lý bếp thông minh', desc: 'Tự động chuyển món đến khu vực chế biến' },
  { label: 'Báo cáo tức thì', desc: 'Doanh thu, chi phí theo thời gian thực' },
  { label: 'Đồng bộ đa thiết bị', desc: 'Tất cả dữ liệu luôn được cập nhật' },
];

// ─── Brand Side — iPad ────────────────────────────────────
function BrandSide() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={ORANGE_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={s.brandSide}
    >
      {/* Decorative circles */}
      <View style={[s.decoCircle, { top: -80, right: -80, width: 300, height: 300, opacity: 0.08 }]} />
      <View style={[s.decoCircle, { bottom: 120, left: -60, width: 200, height: 200, opacity: 0.06 }]} />
      <View style={[s.decoCircle, { top: '40%', right: '20%', width: 80, height: 80, opacity: 0.05 }]} />

      <Animated.View style={[s.brandContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo */}
        <View style={s.logoWrap}>
            <Image
              source={ASSETS.brand.logoMark}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
            />
        </View>

        <Text style={s.brandTitle}>
          POS{' '}<Text style={{ color: '#FED7AA' }}>Pro</Text>
        </Text>
        <Text style={s.brandSub}>Phần mềm quản lý nhà hàng thông minh</Text>

        <View style={s.brandDivider} />

        {/* Feature list */}
        <View style={{ gap: 12}}>
          {FEATURES.map((item, i) => (
            <Animated.View
              key={item.label}
              style={{
                flexDirection: 'row',
                gap: 12,
                alignItems: 'flex-start',
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              }}
            >
              <View style={s.featureDot} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...font.button, color: '#fff', marginBottom: 1 }}>{item.label}</Text>
                <Text style={{ ...font.caption, color: 'rgba(255,255,255,0.65)' }}>{item.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      <Text style={s.footerText}>© 2026 POS Pro. All rights reserved.</Text>
    </LinearGradient>
  );
}

// ─── iPhone Header ──────────────────────────────────────────
function PhoneHeader() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', paddingTop: 20 }}>
      {/* Logo icon in glassmorphic container */}
      <View style={s.phoneLogoContainer}>
        <LinearGradient
          colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.phoneGlow}
        >
          <Image
            source={ASSETS.brand.logoMark}
            style={{ width: 28, height: 28 }}
            resizeMode="contain"
          />
        </LinearGradient>
      </View>

      <Text style={s.phoneTitle}>
        POS{' '}<Text style={{ color: '#FED7AA' }}>Pro</Text>
      </Text>
      <Text style={s.phoneSub}>Phần mềm quản lý nhà hàng thông minh</Text>
    </Animated.View>
  );
}

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
      duration: 500,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  const bgColor = isDark ? '#0F172A' : palette.stone[50];
  const cardBg = isDark ? '#1E293B' : '#fff';
  const textPrimary = isDark ? '#F1F5F9' : '#111827';
  const textSecondary = isDark ? '#737373' : '#6B7280';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6';

  // ── iPad ───────────────────────────────────────────────
  if (isTablet) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: bgColor }]}>
        <Animated.View style={{ flex: 1, flexDirection: 'row', opacity: fadeAnim }}>
          <BrandSide />
          <View style={[s.formSide, { backgroundColor: bgColor }]}>
            <View style={[s.formCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={{ marginBottom: 28 }}>
                <Text style={[s.formTitle, { color: textPrimary }]}>Đăng nhập</Text>
                <Text style={[s.formSubtitle, { color: textSecondary }]}>
                  Vui lòng đăng nhập để tiếp tục
                </Text>
              </View>
              <LoginForm onLogin={login} isTablet />
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── iPhone ─────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={s.phoneScrollInner}>
            <LinearGradient
              colors={ORANGE_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.4, y: 1 }}
              style={s.phoneGradientWrap}
          >
            <PhoneHeader />

            {/* Form card — slides up over gradient */}
            <Animated.View
              style={[
                s.phoneCard,
                {
                  backgroundColor: cardBg,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.1)',
                  opacity: fadeAnim,
                  transform: [{ translateY: Animated.multiply(fadeAnim, new Animated.Value(0)) }],
                },
              ]}
            >
              <View style={{ marginBottom: 24 }}>
                <Text style={[s.phoneCardTitle, { color: textPrimary }]}>Đăng nhập</Text>
                <Text style={[s.phoneCardSub, { color: textSecondary }]}>
                  Vui lòng đăng nhập để tiếp tục
                </Text>
              </View>
              <LoginForm onLogin={login} />
            </Animated.View>
          </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  decoCircle: {
    position: 'absolute',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  // ── Brand Side ──
  brandSide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 56,
    paddingVertical: 48,
    position: 'relative',
    overflow: 'hidden',
  },
  brandContent: {
    maxWidth: 420,
    zIndex: 1,
  },
  logoWrap: {
    marginBottom: 20,
  },
  brandTitle: {
    ...font.pageTitle,
    fontSize: 40,
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSub: {
    ...font.bodySmall,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 32,
  },
  brandDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 32,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FB923C',
    marginTop: 7,
  },
  footerText: {
    position: 'absolute',
    bottom: 48,
    left: 56,
    ...font.micro,
    color: 'rgba(255,255,255,0.3)',
  },
  // ── Form Side ──
  formSide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 36,
    borderWidth: 1,
    // Shadow
    ...Platform.select({
      web: { boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)' },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
    }),
  },
  formTitle: {
    ...font.sectionTitle,
  },
  formSubtitle: {
    ...font.bodySmall,
    marginTop: 4,
  },

  // ── Phone ──
  phoneGradientWrap: {
    flex: 1,
    minHeight: 700,
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 8,
  },
  phoneLogoContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  phoneGlow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneTitle: {
    ...font.pageTitle,
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
  },
  phoneSub: {
    ...font.caption,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
  },
  phoneCard: {
    width: '100%',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 20px 60px rgba(0,0,0,0.12)' },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
    }),
  },
  phoneCardTitle: {
    ...font.sectionTitle,
    textAlign: 'center',
  },
  phoneCardSub: {
    ...font.caption,
    textAlign: 'center',
    marginTop: 4,
  },
  phoneScrollInner: {
    flex: 1,
    justifyContent: 'center',
  },
});
