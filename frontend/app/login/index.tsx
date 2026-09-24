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
import { useAuthStore, UserRole, ROLE_LABELS } from '../../lib/store/useAuthStore';
import { useStaffStore } from '../../lib/store/useStaffStore';
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
  const { tenant, deviceBinding, unbindDevice, quickDemoLogin, loginWithMasterKey, ownerPin, managerPin } = useAuthStore();
  const staffList = useStaffStore((s) => s.staffList);

  // 🌟 Kiểm tra xem quán đã thiết lập bất kỳ mã PIN nào chưa (ownerPin, managerPin, hoặc nhân sự)
  const hasConfiguredPin = Boolean(
    ownerPin?.trim() ||
    managerPin?.trim() ||
    staffList.some((s) => Boolean(s.pinCode?.trim()))
  );

  // 🌟 Chuyển đổi 2 chế độ: Vào Ca Nhanh (PIN) | Tài Khoản & Quản Trị
  // Nếu máy chưa liên kết quán hoặc CHƯA TỪNG thiết lập mã PIN -> Mặc định mở Mật Khẩu Quản Trị
  const isDeviceBound = Boolean(deviceBinding?.isBound);
  const [activeTab, setActiveTab] = useState<'pin' | 'account'>(
    !isDeviceBound || !hasConfiguredPin || tab === 'account' ? 'account' : 'pin'
  );

  useEffect(() => {
    if (!isDeviceBound || !hasConfiguredPin) {
      setActiveTab('account');
    } else if (tab === 'account' || tab === 'pin') {
      setActiveTab(tab);
    }
  }, [tab, isDeviceBound, hasConfiguredPin]);

  // Modal Gỡ Liên Kết Thiết Bị (Chỉ Chủ Quán / Kỹ thuật viên SaaS)
  const [showUnbindModal, setShowUnbindModal] = useState(false);
  const [unbindCode, setUnbindCode] = useState('');
  const [unbindError, setUnbindError] = useState('');
  const [unbinding, setUnbinding] = useState(false);

  // 🌟 Đồng hồ thời gian thực chuẩn quầy thu ngân F&B Việt Nam
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const day = now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
      setCurrentTimeStr(`${time} · ${day}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = () => {
    const role = useAuthStore.getState().currentRole || 'owner';
    useAuthStore.setState({
      isAuthenticated: true,
      currentRole: role,
      _hasHydrated: true,
    });

    if (role === 'super_admin') {
      showToast({
        title: 'Cổng Quản Trị SaaS',
        message: 'Đăng nhập thành công Cổng Quản Trị Hệ Thống SaaS',
        type: 'success',
      });
      router.replace('/saas-admin' as any);
      return;
    }

    const currentTenant = useAuthStore.getState().tenant;

    // 🔄 Kéo ngay dữ liệu tươi mới của đúng Quán & Bắt tay WebSocket phòng quán đó
    try {
      usePOSStore.setState({ tenantId: currentTenant.id || 'tenant_87fb90f7' });
      usePOSStore.getState().fetchMasterCatalog?.();
      const { wsClient } = require('../../lib/api/wsClient');
      wsClient.connect?.();
    } catch (_) {}

    showToast({
      title: 'Đã vào ca',
      message: `Chào mừng bạn đến với ${deviceBinding.isBound ? deviceBinding.tenantName : tenant.name}`,
      type: 'success',
    });

    setTimeout(() => {
      if (deviceBinding.isBound && deviceBinding.deviceRole === 'kds') {
        router.replace('/kds');
      } else {
        router.replace('/');
      }
    }, 50);
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
        <View style={[s.layoutContainer, { backgroundColor: theme.surface.app }]}>
          {/* Centered Login Column */}
          <View style={[s.formCol, { backgroundColor: theme.surface.card }]}>
            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={[
                s.scrollContent,
                {
                  paddingTop: Math.max(insets.top, 16) + 16,
                  paddingBottom: Math.max(insets.bottom, 16) + 16,
                },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={s.authCard}>
                {/* Brand Header & Store Identity */}
                <View style={s.welcomeHeader}>
                  <Image
                    source={require('../../assets/logo_ongchu_clean.png')}
                    style={s.brandLogoImage}
                    resizeMode="contain"
                  />
                  <AppText variant="lg" weight="bold" color={theme.text.primary} style={{ textAlign: 'center' }} numberOfLines={1}>
                    {deviceBinding.isBound && deviceBinding.tenantName
                      ? deviceBinding.tenantName
                      : 'Đăng Nhập Điểm Bán'}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <AppText variant="xs" color={theme.text.muted}>
                      {deviceBinding.isBound && deviceBinding.branchName
                        ? `${deviceBinding.branchName} · ${deviceBinding.deviceName}`
                        : 'Hệ Thống Bán Hàng F&B Thực Chiến'}
                    </AppText>
                    {currentTimeStr ? (
                      <>
                        <AppText variant="xs" color={theme.border.default}>•</AppText>
                        <AppText variant="xs" color={theme.text.muted} tabularNums>
                          {currentTimeStr}
                        </AppText>
                      </>
                    ) : null}
                  </View>
                </View>

              {/* Tab Selector when device is bound */}
              {isDeviceBound && (
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6',
                    borderRadius: 100,
                    padding: 3,
                    marginBottom: 16,
                    height: 42,
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
                      borderRadius: 100,
                      backgroundColor: activeTab === 'pin' ? (isDark ? '#F3EFEA' : '#0F1419') : 'transparent',
                    }}
                  >
                    <Icon
                      name="dialpad"
                      size={16}
                      color={activeTab === 'pin' ? (isDark ? '#0F1419' : '#FFFFFF') : theme.text.muted}
                    />
                    <AppText
                      variant="sm"
                      weight={activeTab === 'pin' ? 'bold' : 'normal'}
                      color={activeTab === 'pin' ? (isDark ? '#0F1419' : '#FFFFFF') : theme.text.muted}
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
                      borderRadius: 100,
                      backgroundColor: activeTab === 'account' ? (isDark ? '#F3EFEA' : '#0F1419') : 'transparent',
                    }}
                  >
                    <Icon
                      name="shield-account-outline"
                      size={16}
                      color={activeTab === 'account' ? (isDark ? '#0F1419' : '#FFFFFF') : theme.text.muted}
                    />
                    <AppText
                      variant="sm"
                      weight={activeTab === 'account' ? 'bold' : 'normal'}
                      color={activeTab === 'account' ? (isDark ? '#0F1419' : '#FFFFFF') : theme.text.muted}
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
                    onSwitchToAccount={() => setActiveTab('account')}
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
            </ScrollView>

            {/* 🌟 FOOTER Ở CHÂN TRANG (DÍNH ĐÁY MÀN HÌNH) */}
            <View
              style={[
                s.pageFooter,
                {
                  paddingBottom: Math.max(insets.bottom, 12) + 8,
                },
              ]}
            >
              {/* Trust Badges Minimalist Row */}
              <View style={s.trustBadgesRow}>
                <View style={s.trustItem}>
                  <Icon name="lightning-bolt" size={13} color={theme.brand.accent} />
                  <AppText variant="xxs" color={theme.text.muted}>
                    Offline 0ms
                  </AppText>
                </View>
                <AppText variant="xxs" color={theme.border.default}>·</AppText>
                <View style={s.trustItem}>
                  <Icon name="printer-pos-outline" size={13} color={theme.brand.success} />
                  <AppText variant="xxs" color={theme.text.muted}>
                    In Nhiệt 9100
                  </AppText>
                </View>
                <AppText variant="xxs" color={theme.border.default}>·</AppText>
                <View style={s.trustItem}>
                  <Icon name="shield-check-outline" size={13} color={theme.brand.accent} />
                  <AppText variant="xxs" color={theme.text.muted}>
                    An Toàn Két
                  </AppText>
                </View>
              </View>

              {/* Minimalist 1-Line Clean Footer */}
              <AppText variant="xxs" color={theme.text.subtle}>
                © 2026 OngChu Lean POS · Nền Tảng Quản Lý F&B Thực Chiến
              </AppText>
            </View>
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
    </View>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  layoutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCol: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  authCard: {
    width: '100%',
    gap: 16,
  },
  welcomeHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  brandLogoImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginBottom: 2,
  },
  pageFooter: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 8,
  },
  trustBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
