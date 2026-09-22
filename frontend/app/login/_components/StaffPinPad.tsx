import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { AppText } from '../../../lib/components/ui/AppText';
import { useAuthStore, UserRole, ROLE_LABELS, SAAS_MASTER_KEY_DEFAULT } from '../../../lib/store/useAuthStore';
import { useStaffStore } from '../../../lib/store/useStaffStore';
import { playTapSound } from '../../../lib/utils/sound';

export interface StaffPinPadProps {
  onSuccess: () => void;
  onUnbindPress?: () => void;
}

interface StaffStripItem {
  id: string;
  name: string;
  roleLabel: string;
  roleShort: string;
  role: UserRole;
  avatarIcon: string;
  pinCode: string;
  isWorking?: boolean;
  isOwner?: boolean;
}

export const StaffPinPad: React.FC<StaffPinPadProps> = ({ onSuccess, onUnbindPress }) => {
  const { theme, isDark } = useTheme();
  const { isWide, height: windowHeight } = useResponsive();
  const { loginWithPin, loginWithMasterKey, deviceBinding, isRoleConfigured, tenant, managerPin, ownerPin } = useAuthStore();
  const staffList = useStaffStore((s) => s.staffList);

  // Chiều cao phím số co giãn chuẩn công thái học (58-62px mobile, 70px tablet/desktop)
  const numKeyHeight = isWide ? 70 : Math.min(64, Math.max(54, Math.round(windowHeight * 0.07)));

  const [pin, setPin] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // 🌟 DANH SÁCH NHÂN SỰ TRỰC CA HỢP NHẤT (1 DẢI THÔNG MINH)
  const availableStaffList = useMemo<StaffStripItem[]>(() => {
    const activeStaff = staffList.filter((s) => s.status === 'active');
    const items: StaffStripItem[] = [];

    // 1. Thêm nhân sự thực tế trong quán
    activeStaff.forEach((s) => {
      let mappedRole: UserRole = 'server';
      let icon = 'tray-full';
      let roleShort = 'PV';
      let roleLabel = 'Phục Vụ';

      if (s.role === 'thu_ngan') {
        mappedRole = 'cashier';
        icon = 'cash-register';
        roleShort = 'TN';
        roleLabel = 'Thu Ngân';
      } else if (s.role === 'pha_che') {
        mappedRole = 'cashier';
        icon = 'coffee';
        roleShort = 'PC';
        roleLabel = 'Pha Chế';
      } else if (s.role === 'quan_ly') {
        mappedRole = 'manager';
        icon = 'badge-account-horizontal';
        roleShort = 'QL';
        roleLabel = 'Quản Lý';
      } else if (s.role === 'bep') {
        mappedRole = 'server';
        icon = 'chef-hat';
        roleShort = 'Bếp';
        roleLabel = 'Bếp';
      } else if (s.role === 'tap_vu') {
        mappedRole = 'server';
        icon = 'broom';
        roleShort = 'TV';
        roleLabel = 'Tạp Vụ';
      }

      if (isRoleConfigured(mappedRole)) {
        items.push({
          id: s.id,
          name: s.name,
          roleLabel,
          roleShort,
          role: mappedRole,
          avatarIcon: icon,
          pinCode: s.pinCode || '',
          isWorking: Boolean(s.isWorking),
        });
      }
    });

    // 2. Thẻ Chủ Quán luôn khả dụng
    items.push({
      id: 'st_owner_master',
      name: deviceBinding.isBound && tenant.name ? `Chủ Quán (${tenant.name})` : 'Chủ Quán',
      roleLabel: 'Chủ Quán',
      roleShort: 'CQ',
      role: 'owner',
      avatarIcon: 'crown',
      pinCode: ownerPin || '',
      isWorking: true,
      isOwner: true,
    });

    // Sắp xếp: Ai đang trong ca (isWorking) đứng trước
    return items.sort((a, b) => {
      if (a.isOwner) return 1;
      if (b.isOwner) return -1;
      if (a.isWorking && !b.isWorking) return -1;
      if (!a.isWorking && b.isWorking) return 1;
      return 0;
    });
  }, [staffList, isRoleConfigured, deviceBinding.isBound, tenant.name]);

  const currentStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return availableStaffList.find((s) => s.id === selectedStaffId) || null;
  }, [selectedStaffId, availableStaffList]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 🔑 State Đăng Nhập Mật Khẩu Quản Trị (Chủ Quán / Quản Lý)
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // 🌟 State Xác Thực Khóa Bảo Mật Chủ Dự Án (Zero-Trust 64 Ký Tự)
  const [showMasterKeyPrompt, setShowMasterKeyPrompt] = useState(false);
  const [showForgotPinPrompt, setShowForgotPinPrompt] = useState(false);
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [showMasterKeyText, setShowMasterKeyText] = useState(false);
  const [masterKeyError, setMasterKeyError] = useState('');
  const [masterKeyLoading, setMasterKeyLoading] = useState(false);

  // Tự động xác thực khi nhập đủ 4 số
  useEffect(() => {
    if (pin.length === 4 && !currentStaff?.isOwner) {
      handleVerify(pin);
    }
  }, [pin, currentStaff?.isOwner]);

  const handleVerifyPassword = async () => {
    playTapSound();
    const cleanPass = passwordInput.trim();
    if (!cleanPass) {
      setPasswordError('Vui lòng nhập mật khẩu Chủ Quán');
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    try {
      const { loginWithCredentials } = useAuthStore.getState();
      const res = await loginWithCredentials(
        tenant.code,
        currentStaff?.isOwner ? 'owner' : currentStaff?.id || 'owner',
        cleanPass
      );
      if (res.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        onSuccess();
      } else {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {}
        }
        setPasswordError(res.error || 'Mật khẩu Chủ Quán không chính xác');
      }
    } catch {
      setPasswordError('Lỗi xác thực mật khẩu');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleKeyPress = (digit: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (errorMessage) setErrorMessage('');
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (errorMessage) setErrorMessage('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    playTapSound();
    if (errorMessage) setErrorMessage('');
    setPin('');
  };

  const handleVerify = async (codeToVerify: string) => {
    setLoading(true);
    try {
      const result = await loginWithPin(
        codeToVerify,
        undefined,
        selectedStaffId ? selectedStaffId : undefined
      );

      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        onSuccess();
      } else if (result.requiresMasterKey) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch {}
        }
        setShowMasterKeyPrompt(true);
        setMasterKeyInput('');
        setMasterKeyError('');
      } else {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } catch {}
        }
        setErrorMessage(result.error || 'Mã PIN không chính xác');
        setPin('');
      }
    } catch {
      setErrorMessage('Không thể xác thực mã PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMasterKey = async () => {
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
        onSuccess();
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

  const handleToggleStaff = (staffId: string) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    if (selectedStaffId === staffId) {
      // Chạm lần 2: Bỏ chọn để quay về chế độ nhận diện tự động
      setSelectedStaffId(null);
    } else {
      setSelectedStaffId(staffId);
    }
    setPin('');
    if (errorMessage) setErrorMessage('');
  };

  if (showForgotPinPrompt) {
    return (
      <View style={s.forgotPinCard}>
        {/* Header */}
        <View style={[s.forgotPinHeader, { borderBottomColor: theme.border.subtle }]}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              setShowForgotPinPrompt(false);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[s.forgotPinBackBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
          >
            <Icon name="arrow-left" size={18} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <AppText variant="sm" weight="medium" color={theme.text.primary}>
              Hỗ Trợ Quên Mã PIN
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              {currentStaff ? `${currentStaff.name} · ${currentStaff.roleLabel}` : 'Mã PIN Vào Ca'}
            </AppText>
          </View>
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.forgotPinContent}>
          {/* Card 1: Cấp lại trong 3s */}
          <View style={[s.infoCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon name="account-cog-outline" size={18} color={theme.brand.warning} />
              <AppText variant="xs" weight="bold" color={theme.brand.warning}>
                1. CẤP LẠI MÃ PIN (3 GIÂY)
              </AppText>
            </View>
            <AppText variant="xs" color={theme.text.muted}>
              Nếu nhân viên quên mã PIN: Báo Chủ Quán mở mục Cài Đặt hoặc Nhân Sự trên POS, chọn tên nhân viên để xem hoặc đổi mã PIN mới ngay lập tức.
            </AppText>
          </View>

          {/* Card 2: Cứu hộ SaaS */}
          {onUnbindPress && (
            <View style={[s.infoCard, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon name="shield-alert-outline" size={18} color={theme.brand.danger} />
                <AppText variant="xs" weight="bold" color={theme.brand.danger}>
                  2. CỨU HỘ KHẨN CẤP SAAS
                </AppText>
              </View>
              <AppText variant="xs" color={theme.text.muted}>
                Để gỡ máy khỏi chi nhánh: Nhập mã PIN Chủ Quán hoặc Mã Cứu Hộ SaaS (998877 / SAASxxxxxx).
              </AppText>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  setShowForgotPinPrompt(false);
                  onUnbindPress();
                }}
                style={[
                  s.quickPinBtn,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.brand.danger,
                    borderWidth: 1,
                    marginTop: 10,
                  },
                ]}
              >
                <Icon name="link-variant-off" size={16} color={theme.brand.danger} />
                <AppText variant="xs" weight="medium" color={theme.brand.danger}>
                  Gỡ Thiết Bị Khỏi Quán Này
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (showMasterKeyPrompt) {
    return (
      <View style={s.masterKeyCard}>
        {/* Header */}
        <View style={s.masterKeyHeader}>
          <View style={[s.masterKeyAvatar, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="shield-crown" size={30} color={theme.brand.primary} />
          </View>
          <AppText variant="md" weight="bold" color={theme.text.primary} style={{ textAlign: 'center' }}>
            Xác Thực Chủ Dự Án SaaS
          </AppText>
          <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center' }}>
            PIN nhận diện Chủ Dự Án. Yêu cầu nhập Khóa Bảo Mật Root 64 ký tự (Zero-Trust) để truy cập hệ thống quản trị.
          </AppText>
        </View>

        {/* Error message */}
        {masterKeyError ? (
          <View style={[s.masterKeyErrorBox, { backgroundColor: theme.status.dangerBg }]}>
            <Icon name="alert-circle-outline" size={16} color={theme.brand.danger} />
            <AppText variant="xs" weight="medium" color={theme.brand.danger}>
              {masterKeyError}
            </AppText>
          </View>
        ) : null}

        {/* Input */}
        <View style={s.masterKeyInputSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <AppText variant="xs" weight="medium" color={theme.text.muted}>
              KHÓA MASTER ROOT (64 KÝ TỰ)
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

          <View
            style={[
              s.masterKeyInputBox,
              {
                backgroundColor: theme.surface.card,
                borderColor: masterKeyInput.trim().length === 64 ? theme.brand.success : theme.border.default,
              },
            ]}
          >
            <Icon name="shield-key-outline" size={20} color={theme.brand.primary} style={{ marginRight: 8 }} />
            <TextInput
              value={masterKeyInput}
              onChangeText={(t) => {
                setMasterKeyInput(t);
                if (masterKeyError) setMasterKeyError('');
              }}
              placeholder="Nhập hoặc dán chuỗi 64 ký tự..."
              placeholderTextColor={theme.text.muted}
              secureTextEntry={!showMasterKeyText}
              autoCapitalize="none"
              autoCorrect={false}
              style={[s.masterKeyInput, { color: theme.text.primary }]}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowMasterKeyText(!showMasterKeyText)}
              style={s.eyeBtn}
            >
              <Icon
                name={showMasterKeyText ? 'eye-off-outline' : 'eye-outline'}
                size={20}
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
            style={[s.quickFillBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}
          >
            <Icon name="content-paste" size={14} color={theme.brand.primary} />
            <AppText variant="xs" weight="medium" color={theme.brand.primary}>
              Dán Mẫu Khóa Root
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Buttons */}
        <View style={s.masterKeyBtnRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setShowMasterKeyPrompt(false);
              setPin('');
              setMasterKeyInput('');
              setMasterKeyError('');
            }}
            style={[s.cancelBtn, { borderColor: theme.border.subtle }]}
          >
            <AppText variant="sm" weight="medium" color={theme.text.muted}>
              Quay Lại PIN
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={masterKeyLoading}
            onPress={handleVerifyMasterKey}
            style={[s.confirmBtn, { backgroundColor: theme.brand.primary }]}
          >
            {masterKeyLoading ? (
              <ActivityIndicator size="small" color={theme.text.onBrand} />
            ) : (
              <>
                <Icon name="login" size={18} color={theme.text.onBrand} />
                <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                  Vào Quản Trị
                </AppText>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* 🌟 1. DẢI NHÂN SỰ TRỰC CA THÔNG MINH (1 CHẠM HOẶC TỰ ĐỘNG) */}
      <View style={s.topSection}>
        <View style={s.sectionHeader}>
          <AppText variant="xs" weight="bold" color={theme.text.muted} style={{ letterSpacing: 0.5 }}>
            NHÂN SỰ TRỰC CA ({availableStaffList.length})
          </AppText>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              playTapSound();
              setSelectedStaffId(null);
              setPin('');
              if (errorMessage) setErrorMessage('');
            }}
          >
            <AppText
              variant="xs"
              weight={selectedStaffId === null ? 'bold' : 'normal'}
              color={selectedStaffId === null ? theme.brand.accent : theme.text.muted}
            >
              {selectedStaffId === null ? '● Tự động nhận diện' : 'Bỏ chọn'}
            </AppText>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.staffScrollContent}
        >
          {availableStaffList.map((staff) => {
            const isSelected = selectedStaffId === staff.id;
            const roleCfg = ROLE_LABELS[staff.role];

            return (
              <TouchableOpacity
                key={staff.id}
                activeOpacity={0.75}
                onPress={() => handleToggleStaff(staff.id)}
                style={[
                  s.staffChip,
                  {
                    backgroundColor: isSelected
                      ? theme.brand.primaryBg
                      : theme.surface.card,
                    borderColor: isSelected
                      ? theme.brand.accent
                      : theme.border.subtle,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    s.staffAvatar,
                    {
                      backgroundColor: isSelected
                        ? theme.brand.accent
                        : staff.isOwner
                        ? theme.brand.primary
                        : theme.surface.header,
                    },
                  ]}
                >
                  <Icon
                    name={staff.avatarIcon as any}
                    size={16}
                    color={
                      isSelected
                        ? theme.text.onBrand
                        : staff.isOwner
                        ? theme.brand.accent
                        : roleCfg.color
                    }
                  />
                  {staff.isWorking && !isSelected && (
                    <View
                      style={[
                        s.workingDot,
                        {
                          backgroundColor: theme.brand.success,
                          borderColor: theme.surface.card,
                        },
                      ]}
                    />
                  )}
                </View>

                <View style={{ gap: 1 }}>
                  <AppText
                    variant="xs"
                    weight={isSelected ? 'bold' : 'medium'}
                    color={isSelected ? theme.brand.accent : theme.text.primary}
                    numberOfLines={1}
                  >
                    {staff.name}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <AppText variant="xxs" color={theme.text.muted}>
                      {staff.roleLabel}
                    </AppText>
                    {staff.isWorking && (
                      <AppText variant="xxs" color={theme.brand.success} weight="medium">
                        · Đang ca
                      </AppText>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 🌟 2. PHÂN NHÁNH: NHẬP MẬT KHẨU CHỦ QUÁN HOẶC GÕ PIN NHÂN VIÊN */}
      {currentStaff?.isOwner ? (
        <View style={{ gap: 14, paddingHorizontal: 12, marginTop: 10, width: '100%' }}>
          <View style={{ gap: 4, alignItems: 'center' }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Mật Khẩu Chủ Quán
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Nhập mật khẩu tài khoản quản trị để vào hệ thống
            </AppText>
          </View>

          {/* Input Password */}
          <View style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.surface.card,
                borderColor: passwordError ? theme.brand.danger : theme.border.default,
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 12,
                height: 48,
              }}
            >
              <Icon name="lock-outline" size={20} color={theme.text.muted} style={{ marginRight: 8 }} />
              <TextInput
                secureTextEntry={!showPasswordText}
                placeholder="Nhập mật khẩu Chủ Quán..."
                placeholderTextColor={theme.text.muted}
                value={passwordInput}
                onChangeText={(t) => {
                  setPasswordInput(t);
                  if (passwordError) setPasswordError('');
                }}
                onSubmitEditing={handleVerifyPassword}
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: theme.text.primary,
                  paddingVertical: 8,
                }}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowPasswordText(!showPasswordText)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon
                  name={showPasswordText ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.text.muted}
                />
              </TouchableOpacity>
            </View>

            {passwordError ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="alert-circle-outline" size={14} color={theme.brand.danger} />
                <AppText variant="xs" color={theme.brand.danger} weight="medium">
                  {passwordError}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={passwordLoading}
              onPress={handleVerifyPassword}
              style={{
                backgroundColor: theme.brand.accent,
                borderRadius: 10,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
            >
              {passwordLoading ? (
                <ActivityIndicator size="small" color={theme.text.onBrand} />
              ) : (
                <>
                  <Icon name="login" size={20} color={theme.text.onBrand} />
                  <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                    Đăng Nhập Chủ Quán
                  </AppText>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                setSelectedStaffId(null);
                setPasswordInput('');
                setPasswordError('');
              }}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
              }}
            >
              <AppText variant="sm" color={theme.text.muted}>
                Quay lại chọn nhân viên
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* PIN DOTS & LỜI NHẮC CÔNG THÁI HỌC */}
          <View style={s.pinSection}>
            <View style={s.dotsContainer}>
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <View
                    key={idx}
                    style={[
                      s.dot,
                      {
                        borderColor: isFilled ? theme.brand.accent : theme.border.default,
                        backgroundColor: isFilled ? theme.brand.accent : 'transparent',
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Error / Instruction Message */}
            <View style={s.errorContainer}>
              {errorMessage ? (
                <View style={s.errorRow}>
                  <Icon name="alert-circle-outline" size={16} color={theme.brand.danger} />
                  <AppText variant="sm" weight="bold" color={theme.brand.danger}>
                    {errorMessage}
                  </AppText>
                </View>
              ) : (
                <AppText variant="sm" weight="medium" color={theme.text.muted} style={{ textAlign: 'center' }}>
                  {currentStaff
                    ? `Nhập 4 số PIN của ${currentStaff.name} để vào ca`
                    : 'Gõ 4 số PIN để vào ca ngay (Tự động nhận diện)'}
                </AppText>
              )}
            </View>
          </View>

          {/* 🌟 3. NUMPAD GRID 3x4 (CHUẨN CÔNG THÁI HỌC THUMB ZONE) */}
      <View style={s.numpad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
          <View key={rIdx} style={s.numpadRow}>
            {row.map((digit) => (
              <TouchableOpacity
                key={digit}
                activeOpacity={0.65}
                disabled={loading}
                onPress={() => handleKeyPress(digit)}
                accessibilityLabel={`Số ${digit}`}
                style={[
                  s.numKey,
                  {
                    height: numKeyHeight,
                    backgroundColor: theme.surface.card,
                    borderColor: theme.border.subtle,
                  },
                ]}
              >
                <AppText variant="display" weight="medium" color={theme.text.primary} tabularNums>
                  {digit}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Hàng cuối: Xóa toàn bộ - Số 0 - Xóa lùi */}
        <View style={s.numpadRow}>
          <TouchableOpacity
            activeOpacity={0.65}
            disabled={loading || pin.length === 0}
            onPress={handleClear}
            accessibilityLabel="Xóa toàn bộ mã PIN"
            style={[
              s.numKey,
              {
                height: numKeyHeight,
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            <AppText variant="md" weight="medium" color={theme.text.muted}>
              Xóa
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.65}
            disabled={loading}
            onPress={() => handleKeyPress('0')}
            accessibilityLabel="Số 0"
            style={[
              s.numKey,
              {
                height: numKeyHeight,
                backgroundColor: theme.surface.card,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            <AppText variant="display" weight="medium" color={theme.text.primary} tabularNums>
              0
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.65}
            disabled={loading || pin.length === 0}
            onPress={handleBackspace}
            accessibilityLabel="Xóa lùi một số"
            style={[
              s.numKey,
              {
                height: numKeyHeight,
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.brand.accent} />
            ) : (
              <Icon name="backspace-outline" size={26} color={theme.text.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 🌟 4. TRỢ LÝ QUÊN MÃ PIN VÀO CA */}
      <View style={s.bottomHelpSection}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            playTapSound();
            setShowForgotPinPrompt(true);
          }}
          style={s.helpBtn}
        >
          <Icon name="help-circle-outline" size={15} color={theme.text.muted} />
          <AppText variant="xs" weight="medium" color={theme.text.muted}>
            Quên mã PIN vào ca?
          </AppText>
        </TouchableOpacity>
      </View>
        </>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  topSection: {
    gap: 6,
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  staffScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 8,
    minHeight: 46,
  },
  staffAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  workingDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  pinSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginVertical: 2,
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.5,
  },
  errorContainer: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  numpad: {
    gap: 8,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  numKey: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomHelpSection: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  masterKeyCard: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  masterKeyHeader: {
    alignItems: 'center',
    gap: 6,
  },
  masterKeyAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  masterKeyErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  masterKeyInputSection: {
    gap: 6,
  },
  masterKeyInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  masterKeyInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  quickFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  masterKeyBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  forgotPinCard: {
    flex: 1,
    paddingVertical: 4,
  },
  forgotPinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  forgotPinBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotPinContent: {
    paddingTop: 12,
    gap: 12,
    paddingBottom: 24,
  },
  infoCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  pinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  pinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '46%',
  },
  quickPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    marginTop: 4,
  },
});
