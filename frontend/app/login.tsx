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
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../lib/context/AuthContext';
import { useTheme } from '../lib/context/ThemeContext';
import LoginForm from '../lib/components/auth/LoginForm';
import { ASSETS } from '../lib/assets';
import { font } from '../lib/theme/typography';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export default function LoginScreen() {
  const { login } = useAuth();
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 650,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  const cardBg = isDark ? 'rgba(30, 41, 59, 0.94)' : 'rgba(255, 255, 255, 0.95)';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const overlayBg = isDark ? 'rgba(15, 23, 42, 0.76)' : 'rgba(15, 23, 42, 0.52)';

  return (
    <View style={s.root}>
      <ImageBackground
        source={ASSETS.images.loginBg}
        style={s.bgImage}
        resizeMode="cover"
      >
        {/* Dark ambient overlay */}
        <LinearGradient
          colors={[overlayBg, 'rgba(15, 23, 42, 0.82)']}
          style={s.overlay}
        >
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <ScrollView
                contentContainerStyle={[
                  s.scrollContent,
                  { justifyContent: 'center' },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Animated.View
                  style={[
                    s.container,
                    isTablet ? s.containerTablet : s.containerMobile,
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateY: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [24, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {/* Tablet Left Banner Showcase */}
                  {isTablet && (
                    <View style={s.tabletBanner}>
                      <LinearGradient
                        colors={['rgba(249,115,22,0.88)', 'rgba(234,88,12,0.94)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.bannerInner}
                      >
                        <View style={s.bannerBrandRow}>
                          <View style={s.bannerLogoIcon}>
                            <Icon name="storefront-outline" size={26} color="#FFF" />
                          </View>
                          <Text style={s.bannerBrandText}>ongchu.vn</Text>
                        </View>

                        <Text style={s.bannerHeading}>
                          Hệ Thống POS F&B{'\n'}Thông Minh & Hiện Đại
                        </Text>
                        <Text style={s.bannerSubheading}>
                          Quản lý bán hàng siêu tốc 0.2s, đồng bộ đa thiết bị iPad/iPhone và kết nối tự động hóa đơn thuế HKD 2026.
                        </Text>

                        <View style={s.bannerFeatures}>
                          <View style={s.featureRow}>
                            <Icon name="check-circle" size={18} color="#FFE4E6" />
                            <Text style={s.featureText}>Giao diện iOS Native mượt mà 60fps</Text>
                          </View>
                          <View style={s.featureRow}>
                            <Icon name="check-circle" size={18} color="#FFE4E6" />
                            <Text style={s.featureText}>Bán hàng offline & đồng bộ Realtime</Text>
                          </View>
                          <View style={s.featureRow}>
                            <Icon name="check-circle" size={18} color="#FFE4E6" />
                            <Text style={s.featureText}>VietQR tự động & Loa báo tiền về</Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  )}

                  {/* Login Glass Form Card */}
                  <View
                    style={[
                      s.formCard,
                      { backgroundColor: cardBg },
                      isTablet && s.formCardTablet,
                      Platform.OS === 'web'
                        ? { boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }
                        : {
                            elevation: 12,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.2,
                            shadowRadius: 20,
                          },
                    ]}
                  >
                    {/* Brand Header */}
                    <View style={s.logoWrap}>
                      <LinearGradient
                        colors={['#F97316', '#EA580C']}
                        style={s.logoCircle}
                      >
                        {ASSETS.brand.logoMark ? (
                          <Image
                            source={ASSETS.brand.logoMark as any}
                            style={{ width: 34, height: 34 }}
                            resizeMode="contain"
                          />
                        ) : (
                          <Icon name="storefront" size={28} color="#FFF" />
                        )}
                      </LinearGradient>
                    </View>

                    <Text style={[s.title, { color: textPrimary }]}>
                      OngChu <Text style={{ color: '#F97316' }}>POS</Text>
                    </Text>

                    {/* Domain badge */}
                    <View style={s.domainBadge}>
                      <Icon name="web" size={13} color="#F97316" />
                      <Text style={s.domainBadgeText}>ongchu.vn</Text>
                    </View>

                    <Text style={[s.subtitle, { color: textSecondary }]}>
                      Đăng nhập hệ thống quản lý F&B
                    </Text>

                    {/* Login Form Component */}
                    <LoginForm onLogin={login} isTablet={isTablet} />

                    {/* Footer */}
                    <Text style={s.footer}>
                      © 2026 <Text style={{ color: '#F97316', fontWeight: 'bold' }}>ongchu.vn</Text> · All rights reserved.
                    </Text>
                  </View>
                </Animated.View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerMobile: {
    maxWidth: 410,
  },
  containerTablet: {
    maxWidth: 880,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 24,
    overflow: 'hidden',
  },
  tabletBanner: {
    flex: 1,
    minHeight: 540,
  },
  bannerInner: {
    flex: 1,
    padding: 36,
    justifyContent: 'center',
  },
  bannerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  bannerLogoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBrandText: {
    ...font.lg,
    fontSize: 22,
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerHeading: {
    ...font.lg,
    fontSize: 26,
    lineHeight: 36,
    color: '#FFF',
    fontWeight: '800',
    marginBottom: 12,
  },
  bannerSubheading: {
    ...font.md,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: 32,
  },
  bannerFeatures: {
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    ...font.smBold,
    color: '#FFF',
    fontSize: 14,
  },
  formCard: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  formCardTablet: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    paddingHorizontal: 36,
    paddingVertical: 36,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    ...font.lg,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  domainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    marginBottom: 6,
  },
  domainBadgeText: {
    ...font.smBold,
    color: '#F97316',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  subtitle: {
    ...font.sm,
    textAlign: 'center',
    marginBottom: 24,
  },
  footer: {
    ...font.sm,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
  },
});
