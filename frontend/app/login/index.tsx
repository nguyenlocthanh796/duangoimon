import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, lightTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { AppText, useAppToast } from '../../lib/components/ui';
import { useAuthStore, UserRole, ROLE_LABELS, SAAS_MASTER_KEY_DEFAULT } from '../../lib/store/useAuthStore';
import { usePOSStore } from '../../lib/store/usePOSStore';
import { playTapSound } from '../../lib/utils/sound';
import { SaaSBrandHero, SaaSAccountForm, StaffPinPad } from './_components';

export default function LoginScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useResponsive();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { showToast } = useAppToast();
  const { tenant, deviceBinding, unbindDevice, quickDemoLogin, loginWithMasterKey } = useAuthStore();

  // 🌟 Chuyển đổi 2 chế độ: Vào Ca Nhanh (PIN) | Tài Khoản & Quản Trị
  // Khi máy chưa liên kết quán (!deviceBinding.isBound), bắt buộc mở tab 'account' (Kích hoạt máy)
  const isDeviceBound = Boolean(deviceBinding?.isBound);
  const [activeTab, setActiveTab] = useState<'pin' | 'account'>(
    !isDeviceBound || tab === 'account' ? 'account' : 'pin'
  );

  useEffect(() => {
    if (!isDeviceBound) {
      setActiveTab('account');
    } else if (tab === 'account' || tab === 'pin') {
      setActiveTab(tab);
    }
  }, [tab, isDeviceBound]);

  // Modal Gỡ Liên Kết Thiết Bị (Chỉ Chủ Quán / Kỹ thuật viên SaaS)
  const [showUnbindModal, setShowUnbindModal] = useState(false);
  const [unbindCode, setUnbindCode] = useState('');
  const [unbindError, setUnbindError] = useState('');
  const [unbinding, setUnbinding] = useState(false);

  // 🌟 Modal Xác Thực Khóa 64 Ký Tự Chủ Dự Án (Zero-Trust Master Key)
  const [showMasterKeyModal, setShowMasterKeyModal] = useState(false);
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [showMasterKeyText, setShowMasterKeyText] = useState(false);
  const [masterKeyError, setMasterKeyError] = useState('');
  const [masterKeyLoading, setMasterKeyLoading] = useState(false);

  const handleLoginSuccess = () => {
    const role = useAuthStore.getState().currentRole;
    const currentTenant = useAuthStore.getState().tenant;

    // 🔄 Kéo ngay dữ liệu tươi mới của đúng Quán & Bắt tay WebSocket phòng quán đó
    try {
      usePOSStore.setState({ tenantId: currentTenant.id });
      usePOSStore.getState().fetchMasterCatalog?.();
      const { wsClient } = require('../../lib/api/wsClient');
      wsClient.connect?.();
    } catch (_) {}

    showToast({
      title: 'Đã vào ca',
      message: `Chào mừng bạn đến với ${deviceBinding.isBound ? deviceBinding.tenantName : tenant.name}`,
      type: 'success',
    });
    if (role === 'super_admin') {
      router.replace('/saas-admin' as any);
    } else if (deviceBinding.isBound && deviceBinding.deviceRole === 'kds') {
      router.replace('/kds');
    } else {
      router.replace('/');
    }
  };

  const handleQuickDemo = (role: UserRole) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    quickDemoLogin(role);

    try {
      const currentTenant = useAuthStore.getState().tenant;
      usePOSStore.setState({ tenantId: currentTenant.id });
      usePOSStore.getState().fetchMasterCatalog?.();
      const { wsClient } = require('../../lib/api/wsClient');
      wsClient.connect?.();
    } catch (_) {}

    showToast({
      title: `Chế Độ Demo: ${ROLE_LABELS[role].label}`,
      message: ROLE_LABELS[role].desc,
      type: 'info',
    });
    if (role === 'super_admin') {
      router.replace('/saas-admin' as any);
    } else {
      router.replace('/');
    }
  };

  const handleConfirmUnbind = async () => {
    playTapSound();
    if (!unbindCode.trim()) {
      setUnbindError('Nhập PIN Chủ Quán');
      return;
    }

    setUnbinding(true);
    setUnbindError('');

    try {
      const result = await unbindDevice(unbindCode);
      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        setShowUnbindModal(false);
        setUnbindCode('');
        setActiveTab('account');
        showToast({
          title: 'Đã gỡ thiết bị',
          message: 'Đã gỡ thiết bị thành công!',
          type: 'info',
        });
      } else {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {}
        }
        setUnbindError(result.error || 'Mã xác nhận không đúng');
      }
    } catch {
      setUnbindError('Lỗi hệ thống khi gỡ thiết bị');
    } finally {
      setUnbinding(false);
    }
  };

  const handleVerifyMasterKeyModal = async () => {
    playTapSound();
    const cleanKey = masterKeyInput.trim();
    if (cleanKey.length !== 64) {
      setMasterKeyError(`Khóa phải có đúng 64 ký tự (hiện có ${cleanKey.length}/64)`);
      return;
    }
    setMasterKeyLoading(true);
    setMasterKeyError('');
    try {
      const res = await loginWithMasterKey(cleanKey);
      if (res.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        setShowMasterKeyModal(false);
        handleLoginSuccess();
      } else {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {}
        }
        setMasterKeyError(res.error || 'Khóa bảo mật không hợp lệ');
      }
    } catch {
      setMasterKeyError('Lỗi xác thực khóa bảo mật');
    } finally {
      setMasterKeyLoading(false);
    }
  };

  return (
    <View style={[s.safeArea, { backgroundColor: theme.surface.app, paddingBottom: 0 }]}>
      {/* 🌟 Nút Tiện Ích Góc Phải (Đổi Giao Diện & Gỡ Thiết Bị) */}
      <View
        style={[
          s.pinnedTopRight,
          {
            top: isWide ? 24 : Math.max(insets.top, 12) + 4,
            right: isWide ? 28 : 16,
          },
        ]}
      >
        {deviceBinding.isBound && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setUnbindCode('');
              setUnbindError('');
              setShowUnbindModal(true);
            }}
            style={[
              s.actionIconBtn,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
              },
            ]}
            accessibilityLabel="Gỡ thiết bị khỏi chi nhánh"
          >
            <Icon name="link-variant-off" size={18} color={theme.text.muted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            playTapSound();
            toggleTheme();
          }}
          style={[
            s.actionIconBtn,
            {
              backgroundColor: theme.surface.card,
              borderColor: theme.border.subtle,
            },
          ]}
          accessibilityLabel="Chuyển chế độ sáng tối"
        >
          <Icon
            name={isDark ? 'weather-sunny' : 'weather-night'}
            size={20}
            color={theme.brand.primary}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.layoutContainer}>
          {/* 1. Tablet/Desktop Left Hero Column */}
          {isWide && (
            <View style={s.heroCol}>
              <SaaSBrandHero />
            </View>
          )}

          {/* 2. Login Form Column */}
          <View style={[s.formCol, { backgroundColor: theme.surface.app }, !isWide && s.formColMobile]}>
            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={[
                s.scrollContent,
                !isWide && [
                  s.scrollContentMobile,
                  {
                    paddingTop: Math.max(insets.top, 12) + 8,
                    paddingBottom: Math.max(insets.bottom, 12) + 12,
                  },
                ],
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={isWide ? [s.authCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }] : s.authCardMobile}>
                {/* Mobile Welcome Header */}
                {!isWide && (
                  <View style={s.mobileWelcomeHeader}>
                    <Image
                      source={require('../../assets/logo_ongchu_clean.png')}
                      style={s.mobileLogoImage}
                      resizeMode="contain"
                    />
                    <AppText variant="lg" weight="bold" color={theme.text.primary}>
                      {deviceBinding.isBound && deviceBinding.tenantName
                        ? (activeTab === 'pin' ? 'Vào Ca Bán Hàng' : 'Đổi Điểm Bán')
                        : 'Đăng Nhập Điểm Bán'}
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center' }}>
                      {deviceBinding.isBound && deviceBinding.branchName
                        ? `${deviceBinding.branchName} · ${deviceBinding.deviceName}`
                        : 'Hệ Thống Bán Hàng F&B Thực Chiến Vị Chủ Quán'}
                    </AppText>
                  </View>
                )}

                {/* Header: Desktop Form Title */}
                {isWide && (
                  <View style={{ gap: 4, marginBottom: 4 }}>
                    <AppText variant="lg" weight="bold" color={theme.text.primary}>
                      {deviceBinding.isBound && deviceBinding.tenantName
                        ? deviceBinding.tenantName
                        : 'Đăng Nhập Điểm Bán'}
                    </AppText>
                    <AppText variant="xs" color={theme.text.muted}>
                      {deviceBinding.isBound && deviceBinding.branchName
                        ? `${deviceBinding.branchName} · ${deviceBinding.deviceName}`
                        : 'Nhập mã quán & tài khoản để bắt đầu ca bán hàng'}
                    </AppText>
                  </View>
                )}

              {/* Tab Selector when device is bound */}
              {isDeviceBound && (
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: theme.surface.header,
                    borderRadius: 10,
                    padding: 3,
                    marginBottom: 14,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.border.subtle,
                    height: 40,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                      }
                      setActiveTab('pin');
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      gap: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      backgroundColor: activeTab === 'pin' ? theme.surface.card : 'transparent',
                      borderWidth: activeTab === 'pin' ? StyleSheet.hairlineWidth : 0,
                      borderColor: theme.border.subtle,
                    }}
                  >
                    <Icon
                      name="dialpad"
                      size={16}
                      color={activeTab === 'pin' ? theme.brand.accent : theme.text.muted}
                    />
                    <AppText
                      variant="xs"
                      weight={activeTab === 'pin' ? 'bold' : 'normal'}
                      color={activeTab === 'pin' ? theme.brand.accent : theme.text.muted}
                      numberOfLines={1}
                    >
                      Vào Ca (PIN)
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      if (Platform.OS !== 'web') {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                      }
                      setActiveTab('account');
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      gap: 6,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 8,
                      backgroundColor: activeTab === 'account' ? theme.surface.card : 'transparent',
                      borderWidth: activeTab === 'account' ? StyleSheet.hairlineWidth : 0,
                      borderColor: theme.border.subtle,
                    }}
                  >
                    <Icon
                      name="shield-account-outline"
                      size={16}
                      color={activeTab === 'account' ? theme.brand.accent : theme.text.muted}
                    />
                    <AppText
                      variant="xs"
                      weight={activeTab === 'account' ? 'bold' : 'normal'}
                      color={activeTab === 'account' ? theme.brand.accent : theme.text.muted}
                      numberOfLines={1}
                    >
                      Quản Trị (Mật Khẩu)
                    </AppText>
                  </TouchableOpacity>
                </View>
              )}

              {/* Form Content: PIN Pad hoặc Đăng nhập tài khoản */}
              <View style={s.formWrapper}>
                {isDeviceBound && activeTab === 'pin' ? (
                  <StaffPinPad
                    onSuccess={handleLoginSuccess}
                    onUnbindPress={() => {
                      setUnbindCode('');
                      setUnbindError('');
                      setShowUnbindModal(true);
                    }}
                  />
                ) : (
                  <SaaSAccountForm onSuccess={handleLoginSuccess} />
                )}
              </View>
            </View>

            {/* Minimalist 1-Line Footer */}
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              <TouchableOpacity
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                onPress={() => {
                  playTapSound();
                  setMasterKeyInput('');
                  setMasterKeyError('');
                  setShowMasterKeyModal(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                accessibilityLabel="Cổng Chủ Dự Án"
              >
                <Icon name="shield-crown-outline" size={13} color={theme.text.subtle} />
                <AppText variant="xxs" color={theme.text.subtle}>
                  OngChu Lean POS v2.0 · Cổng Master SaaS
                </AppText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>

      {/* 🔒 Modal Xác Thực Gỡ Thiết Bị Khỏi Chi Nhánh */}
      {showUnbindModal && (
        <View style={[StyleSheet.absoluteFill, s.modalBackdrop, { zIndex: 999999 }]}>
          <View
            style={[
              s.modalCard,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.default,
              },
            ]}
          >
            <View style={s.modalHeader}>
              <View style={[s.modalWarningIcon, { backgroundColor: theme.status.dangerBg }]}>
                <Icon name="shield-lock-outline" size={24} color={theme.brand.danger} />
              </View>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Gỡ Thiết Bị Khỏi Quán
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center' }}>
                Nhập Mã PIN Chủ Quán (9999) hoặc Mã Cứu Hộ SaaS để gỡ máy này khỏi {deviceBinding.branchName}.
              </AppText>
            </View>

            {unbindError ? (
              <View style={[s.unbindErrorBox, { backgroundColor: theme.status.dangerBg }]}>
                <Icon name="alert-circle-outline" size={14} color={theme.brand.danger} />
                <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                  {unbindError}
                </AppText>
              </View>
            ) : null}

            <View style={[s.modalInputWrapper, { borderColor: theme.border.default }]}>
              <Icon name="key-outline" size={18} color={theme.brand.primary} />
              <TextInput
                value={unbindCode}
                onChangeText={(t) => {
                  setUnbindCode(t);
                  if (unbindError) setUnbindError('');
                }}
                placeholder="Nhập PIN Chủ Quán..."
                placeholderTextColor={theme.text.muted}
                secureTextEntry
                keyboardType="numeric"
                style={[s.modalInput, { color: theme.text.primary }]}
              />
            </View>

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowUnbindModal(false)}
                style={[s.modalCancelBtn, { borderColor: theme.border.subtle }]}
              >
                <AppText variant="xs" weight="medium" color={theme.text.muted}>
                  Hủy
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={unbinding}
                onPress={handleConfirmUnbind}
                style={[s.modalConfirmBtn, { backgroundColor: theme.brand.danger }]}
              >
                {unbinding ? (
                  <ActivityIndicator size="small" color={theme.text.onBrand} />
                ) : (
                  <>
                    <Icon name="link-variant-off" size={16} color={theme.text.onBrand} />
                    <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                      Gỡ Máy
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 🌟 Modal Xác Thực Khóa Bảo Mật Chủ Dự Án SaaS (Zero-Trust 64 Ký Tự) */}
      {showMasterKeyModal && (
        <View style={[StyleSheet.absoluteFill, s.modalBackdrop, { zIndex: 999999 }]}>
          <View
            style={[
              s.modalCard,
              {
                backgroundColor: theme.surface.card,
                borderColor: theme.border.default,
              },
            ]}
          >
            <View style={s.modalHeader}>
              <View style={[s.modalWarningIcon, { backgroundColor: theme.brand.primaryBg }]}>
                <Icon name="shield-crown" size={26} color={theme.brand.primary} />
              </View>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Cổng Quản Trị Chủ Dự Án
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center' }}>
                Xác thực Zero-Trust độc quyền. Yêu cầu chuỗi Khóa Bảo Mật Root đúng 64 ký tự để truy cập hệ thống quản lý người thuê.
              </AppText>
            </View>

            {masterKeyError ? (
              <View style={[s.unbindErrorBox, { backgroundColor: theme.status.dangerBg }]}>
                <Icon name="alert-circle-outline" size={14} color={theme.brand.danger} />
                <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                  {masterKeyError}
                </AppText>
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="xs" weight="medium" color={theme.text.muted}>
                  KHÓA MASTER ROOT
                </AppText>
                <AppText
                  variant="xs"
                  tabularNums
                  color={masterKeyInput.trim().length === 64 ? theme.brand.success : theme.brand.danger}
                  weight="bold"
                >
                  {masterKeyInput.trim().length}/64
                </AppText>
              </View>

              <View style={[s.modalInputWrapper, { borderColor: masterKeyInput.trim().length === 64 ? theme.brand.success : theme.border.default }]}>
                <Icon name="shield-key-outline" size={18} color={theme.brand.primary} />
                <TextInput
                  value={masterKeyInput}
                  onChangeText={(t) => {
                    setMasterKeyInput(t);
                    if (masterKeyError) setMasterKeyError('');
                  }}
                  placeholder="Nhập khóa bí mật 64 ký tự..."
                  placeholderTextColor={theme.text.muted}
                  secureTextEntry={!showMasterKeyText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[s.modalInput, { color: theme.text.primary, fontSize: 16 }]}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowMasterKeyText(!showMasterKeyText)}
                  style={{ padding: 4 }}
                >
                  <Icon
                    name={showMasterKeyText ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={theme.text.muted}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  setMasterKeyInput(SAAS_MASTER_KEY_DEFAULT);
                  if (masterKeyError) setMasterKeyError('');
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                  backgroundColor: theme.surface.header,
                  borderWidth: 1,
                  borderColor: theme.border.subtle,
                  marginTop: 2,
                }}
              >
                <Icon name="content-paste" size={13} color={theme.brand.primary} />
                <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                  Dán Mẫu Khóa Root
                </AppText>
              </TouchableOpacity>
            </View>

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setShowMasterKeyModal(false);
                  setMasterKeyInput('');
                  setMasterKeyError('');
                }}
                style={[s.modalCancelBtn, { borderColor: theme.border.subtle }]}
              >
                <AppText variant="xs" weight="medium" color={theme.text.muted}>
                  Hủy
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={masterKeyLoading}
                onPress={handleVerifyMasterKeyModal}
                style={[s.modalConfirmBtn, { backgroundColor: theme.brand.primary }]}
              >
                {masterKeyLoading ? (
                  <ActivityIndicator size="small" color={theme.text.onBrand} />
                ) : (
                  <>
                    <Icon name="shield-check" size={16} color={theme.text.onBrand} />
                    <AppText variant="xs" weight="medium" color={theme.text.onBrand}>
                      Xác Thực
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  layoutContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  heroCol: {
    flex: 1,
  },
  formCol: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formColMobile: {
    maxWidth: '100%',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
    gap: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  scrollContentMobile: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 16,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authCardMobile: {
    width: '100%',
    maxWidth: 400,
    gap: 14,
  },
  mobileWelcomeHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  mobileLogoImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
    marginBottom: 4,
  },
  mobileLogoSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    gap: 20,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  pinnedTopRight: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  formWrapper: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  mobileBrand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileLogo: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  branchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitcher: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginVertical: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
  },
  tabBtnActive: {
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 1,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  footer: {
    marginTop: 8,
    paddingTop: 6,
    alignItems: 'center',
    gap: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 8,
  },
  modalWarningIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  unbindErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  modalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
