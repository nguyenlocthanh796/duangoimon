import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';
import { AppText } from '../../lib/components/ui/AppText';
import { AppHeader } from '../../lib/components/ui/AppHeader';
import { usePOSStore } from '../../lib/store/usePOSStore';
import { formatCurrency } from '../../lib/utils/format';
import { playTapSound } from '../../lib/utils/sound';

export default function CheckBillPortalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [orderCode, setOrderCode] = useState('');
  const [errorText, setErrorText] = useState('');

  const orderHistory = usePOSStore((s) => s.orderHistory);
  const recentOrders = (orderHistory || []).slice(0, 3);

  const handleSearch = () => {
    playTapSound();
    const clean = orderCode.trim();
    if (!clean) {
      setErrorText('Vui lòng nhập mã hóa đơn cần tra cứu');
      return;
    }
    setErrorText('');
    router.push((`/b/${encodeURIComponent(clean)}`) as any);
  };

  const handleFillCode = (code: string) => {
    playTapSound();
    setOrderCode(code);
    setErrorText('');
  };

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      <AppHeader
        title="Tra Cứu Hóa Đơn"
        subtitle="Hóa đơn điện tử e-Receipt"
        showBack={true}
        showHamburger={false}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            {
              paddingBottom: Math.max(insets.bottom, 24) + 20,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              s.card,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            <View style={s.iconWrap}>
              <Icon name="receipt-text-check-outline" size={52} color={theme.brand.accent} />
            </View>

            <AppText variant="md" weight="bold" color={theme.text.primary} style={s.centerText}>
              CỔNG TRA CỨU HÓA ĐƠN
            </AppText>
            <AppText variant="xs" color={theme.text.muted} style={[s.centerText, { marginTop: 4, marginBottom: 18 }]}>
              Nhập mã hóa đơn in trên phiếu tính tiền để xem lại chi tiết và lưu hóa đơn điện tử.
            </AppText>

            {/* Input Section */}
            <View style={s.formGroup}>
              <AppText variant="xs" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
                MÃ HÓA ĐƠN
              </AppText>
              <View
                style={[
                  s.inputRow,
                  {
                    backgroundColor: theme.surface.app,
                    borderColor: errorText ? theme.brand.danger : theme.border.default,
                  },
                ]}
              >
                <Icon name="barcode-scan" size={20} color={theme.brand.accent} style={{ marginRight: 8 }} />
                <TextInput
                  style={[s.input, { color: theme.text.primary }]}
                  placeholder="Ví dụ: HD-0012, HD-9999..."
                  placeholderTextColor={theme.text.muted}
                  value={orderCode}
                  onChangeText={(t) => {
                    setOrderCode(t);
                    if (errorText) setErrorText('');
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
                {Boolean(orderCode) && (
                  <TouchableOpacity onPress={() => setOrderCode('')}>
                    <Icon name="close-circle" size={18} color={theme.text.muted} />
                  </TouchableOpacity>
                )}
              </View>

              {Boolean(errorText) && (
                <AppText variant="xxs" color={theme.brand.danger} style={{ marginTop: 4 }}>
                  {errorText}
                </AppText>
              )}

              {/* Sample Chips */}
              <View style={{ marginTop: 10 }}>
                <AppText variant="xxs" color={theme.text.muted} style={{ marginBottom: 6 }}>
                  Mã hóa đơn mẫu:
                </AppText>
                <View style={s.chipsWrap}>
                  {['HD-9999', 'HD-001', 'HD-0012'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[s.chip, { backgroundColor: theme.surface.app, borderColor: theme.border.subtle }]}
                      onPress={() => handleFillCode(c)}
                      activeOpacity={0.7}
                    >
                      <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
                        {c}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Submit CTA */}
              <TouchableOpacity
                style={[s.btnSubmit, { backgroundColor: theme.brand.accent }]}
                onPress={handleSearch}
                activeOpacity={0.85}
              >
                <Icon name="magnify" size={20} color={theme.text.onBrand} style={{ marginRight: 6 }} />
                <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                  Tra Cứu Hóa Đơn
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Recent Orders in Local System */}
            {recentOrders.length > 0 && (
              <View style={[s.recentSection, { borderTopColor: theme.border.subtle }]}>
                <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ marginBottom: 8 }}>
                  HÓA ĐƠN GẦN ĐÂY TẠI QUÁN
                </AppText>
                {recentOrders.map((ord) => (
                  <TouchableOpacity
                    key={ord.id}
                    style={[s.recentItem, { backgroundColor: theme.surface.app, borderColor: theme.border.subtle }]}
                    onPress={() => {
                      playTapSound();
                      router.push((`/b/${encodeURIComponent(ord.orderCode)}`) as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <AppText variant="xs" weight="bold" color={theme.text.primary} tabularNums>
                        {ord.orderCode} · {ord.tableName}
                      </AppText>
                      <AppText variant="xxs" color={theme.text.muted}>
                        {new Date(ord.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </AppText>
                    </View>
                    <AppText variant="xs" weight="bold" color={theme.brand.accent} tabularNums>
                      {formatCurrency(ord.finalTotal)} đ →
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Feature Highlights */}
            <View style={[s.featuresRow, { borderTopColor: theme.border.subtle }]}>
              <View style={s.featureCol}>
                <Icon name="lightning-bolt" size={20} color={theme.brand.accent} />
                <AppText variant="xs" weight="bold" color={theme.text.primary} style={{ marginTop: 4 }}>
                  Tức Thì
                </AppText>
                <AppText variant="xxs" color={theme.text.muted}>
                  Không cần tải app
                </AppText>
              </View>
              <View style={s.featureCol}>
                <Icon name="shield-check" size={20} color={theme.brand.success} />
                <AppText variant="xs" weight="bold" color={theme.text.primary} style={{ marginTop: 4 }}>
                  Chính Xác
                </AppText>
                <AppText variant="xxs" color={theme.text.muted}>
                  Khớp dữ liệu POS
                </AppText>
              </View>
              <View style={s.featureCol}>
                <Icon name="leaf" size={20} color={theme.brand.success} />
                <AppText variant="xs" weight="bold" color={theme.text.primary} style={{ marginTop: 4 }}>
                  Tiết Kiệm
                </AppText>
                <AppText variant="xxs" color={theme.text.muted}>
                  Bảo vệ môi trường
                </AppText>
              </View>
            </View>

            <AppText variant="xxs" color={theme.text.muted} style={[s.centerText, { marginTop: 18 }]}>
              Hệ sinh thái <AppText variant="xxs" weight="bold" color={theme.brand.accent}>OngChu Lean POS</AppText> · https://ongchu.cloud
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  centerText: {
    textAlign: 'center',
  },
  formGroup: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  chipsWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    marginTop: 16,
  },
  recentSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  featureCol: {
    alignItems: 'center',
  },
});
