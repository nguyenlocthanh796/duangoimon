import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  useWindowDimensions, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/context/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, font } from '../lib/theme';
import LoginForm from '../lib/components/auth/LoginForm';
import { ASSETS } from '../lib/assets';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.innerContainer}>
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            {isTablet ? (
              <View style={styles.cardTablet}>
                <View style={styles.brandSide}>
                  <View style={styles.overlay} />
                  <View style={styles.brandContent}>
                    <Image source={ASSETS.brand.logoMark} style={{ width: 180, height: 60, marginBottom: 8 }} resizeMode="contain" />
                    <Text style={styles.brandDesc}>
                      Giải pháp toàn diện quản lý bán hàng, bếp/bar, doanh thu và kế toán cho nhà hàng F&B.
                    </Text>
                    <View style={styles.featureList}>
                      <Text style={styles.featureItem}>⚡ Đồng bộ hóa dữ liệu thời gian thực</Text>
                      <Text style={styles.featureItem}>🍳 Kết nối bếp & thu ngân tức thì</Text>
                      <Text style={styles.featureItem}>📈 Báo cáo thông minh đa thiết bị</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.formSide}>
                  <LoginForm onLogin={login} />
                </View>
              </View>
            ) : (
              <View style={styles.cardPhone}>
                <View style={styles.phoneHeader}>
                  <Image source={ASSETS.brand.logoMark} style={{ width: 140, height: 48 }} resizeMode="contain" />
                  <Text style={styles.phoneBadge}>Giải Pháp F&B Toàn Diện</Text>
                </View>
                <LoginForm onLogin={login} />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  innerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, position: 'relative' },
  circle1: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(249,115,22,0.08)', top: -50, left: -50,
  },
  circle2: {
    position: 'absolute', width: 350, height: 350, borderRadius: 175,
    backgroundColor: 'rgba(59,130,246,0.05)', bottom: -80, right: -60,
  },
  cardTablet: {
    flexDirection: 'row', width: '100%', maxWidth: 720, borderRadius: 4,
    backgroundColor: '#fff', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  brandSide: { flex: 1.2, backgroundColor: '#F97316', justifyContent: 'center', position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  brandContent: { padding: 32, gap: 16 },
  brandBadge: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  brandLogo: { color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  brandDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 20 },
  featureList: { gap: 8, marginTop: 8 },
  featureItem: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  formSide: { flex: 1, padding: 32, justifyContent: 'center' },
  cardPhone: {
    width: '100%', maxWidth: 400, borderRadius: 4,
    backgroundColor: '#fff', padding: 28, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  phoneHeader: { alignItems: 'center', marginBottom: 24 },
  phoneLogo: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  phoneBadge: { fontSize: 12, color: '#94A3B8', marginTop: 4, fontWeight: '600' },
});
