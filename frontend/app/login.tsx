import React, { useRef, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet,
  useWindowDimensions, ScrollView, KeyboardAvoidingView, Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../lib/context/AuthContext';
import LoginForm from '../lib/components/auth/LoginForm';
import { ASSETS } from '../lib/assets';

// ─── Floating Orb ────────────────────────────────────────────
function Orb({
  size, color, left, top,
  dx = 30, dy = -20, duration = 8000, delay = 0,
}: {
  size: number; color: string; left: number; top: number;
  dx?: number; dy?: number; duration?: number; delay?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const tx = progress.interpolate({
    inputRange: [0, 0.5, 1], outputRange: [0, dx, 0],
  });
  const ty = progress.interpolate({
    inputRange: [0, 0.5, 1], outputRange: [0, dy, 0],
  });

  return (
    <Animated.View
      style={[{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, backgroundColor: color,
        left, top,
        transform: [{ translateX: tx }, { translateY: ty }],
      }]}
    />
  );
}

// ─── Feature Row ────────────────────────────────────────────
function FeatureRow({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureDot} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

// ─── Brand Side (Tablet) ────────────────────────────────────
function BrandSide() {
  return (
    <View style={styles.brandSide}>
      <LinearGradient
        colors={['rgba(249,115,22,0.10)', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      />
      <View style={styles.brandContent}>
        <Image
          source={ASSETS.brand.logoMark}
          style={{ width: 160, height: 48, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>POS Pro</Text>
        <Text style={styles.brandTagline}>
          Hệ thống quản lý nhà hàng thông minh
        </Text>
        <View style={styles.featureList}>
          <FeatureRow text="Quản lý bán hàng & bếp thời gian thực" />
          <FeatureRow text="Báo cáo doanh thu thông minh" />
          <FeatureRow text="Kết nối đa thiết bị, đồng bộ tức thì" />
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────
export default function LoginScreen() {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Entry animation
  const entryAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entryAnim, {
      toValue: 1, tension: 50, friction: 8, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      {/* Animated Gradient Background */}
      <LinearGradient
        colors={['#0B1120', '#162032', '#0F172A']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        <Orb size={300} color="rgba(249,115,22,0.08)" left={-80} top={-80} dx={40} dy={30} duration={10000} />
        <Orb size={220} color="rgba(59,130,246,0.06)" left={width - 160} top={250} dx={-30} dy={40} duration={12000} delay={1000} />
        <Orb size={180} color="rgba(168,85,247,0.05)" left={width * 0.3} top={500} dx={20} dy={-25} duration={8000} delay={2000} />
        <Orb size={100} color="rgba(249,115,22,0.04)" left={width * 0.8} top={100} dx={-15} dy={15} duration={9000} delay={500} />
      </LinearGradient>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.center,
              {
                opacity: entryAnim,
                transform: [{
                  translateY: entryAnim.interpolate({
                    inputRange: [0, 1], outputRange: [24, 0],
                  }),
                }],
              },
            ]}
          >
            {isTablet ? (
              <View style={styles.cardTablet}>
                <BrandSide />
                <View style={styles.formSide}>
                  <LoginForm onLogin={login} />
                </View>
              </View>
            ) : (
              <View style={styles.cardPhone}>
                <View style={styles.phoneBrand}>
                  <Image
                    source={ASSETS.brand.logoMark}
                    style={{ width: 120, height: 36, marginBottom: 12 }}
                    resizeMode="contain"
                  />
                  <Text style={styles.phoneBrandName}>POS Pro</Text>
                  <Text style={styles.phoneTagline}>
                    Quản lý nhà hàng thông minh
                  </Text>
                </View>
                <LoginForm onLogin={login} />
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1120' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },

  cardTablet: {
    flexDirection: 'row', width: '100%', maxWidth: 840,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 50, elevation: 24,
  },

  // Brand Side
  brandSide: {
    flex: 1.15, padding: 40, justifyContent: 'center', position: 'relative',
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.04)',
  },
  brandContent: { gap: 4 },
  brandName: {
    fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28, lineHeight: 20,
  },
  featureList: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F97316' },
  featureText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 18, flex: 1 },

  formSide: { flex: 1, padding: 40, justifyContent: 'center' },

  cardPhone: {
    width: '100%', maxWidth: 420,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 50, elevation: 24,
  },
  phoneBrand: { alignItems: 'center', marginBottom: 28, gap: 4 },
  phoneBrandName: {
    fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5,
  },
  phoneTagline: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2,
  },
});
