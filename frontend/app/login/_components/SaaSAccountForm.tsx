import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, lightTheme } from '../../../lib/theme';
import { AppText } from '../../../lib/components/ui/AppText';
import {
  useAuthStore,
  DeviceRole,
  SAAS_MASTER_KEY_DEFAULT,
  KNOWN_PHONE_TENANTS,
  cleanPhoneNumber,
  normalizeStoreName,
} from '../../../lib/store/useAuthStore';
import { playTapSound } from '../../../lib/utils/sound';

export interface SaaSAccountFormProps {
  onSuccess: () => void;
}

const DEVICE_ROLE_OPTIONS: { role: DeviceRole; label: string; desc: string; icon: string }[] = [
  { role: 'pos', label: 'POS Thu Ngân', desc: 'Bán hàng, in bill, mở két tiền', icon: 'cash-register' },
  { role: 'kds', label: 'Bếp / Pha Chế (KDS)', desc: 'Màn hình chế biến món ăn', icon: 'silverware-fork-knife' },
  { role: 'waiter', label: 'Máy Order Bàn', desc: 'Gọi món tại bàn di động', icon: 'tablet-cellphone' },
];

export const SaaSAccountForm: React.FC<SaaSAccountFormProps> = ({ onSuccess }) => {
  const { theme, isDark } = useTheme();
  const { branches, activeBranchId, loginWithCredentials, registerTenant, bindDevice } = useAuthStore();

  const [step, setStep] = useState<'credentials' | 'device_setup'>('credentials');
  // Hợp nhất 1 trường nhận diện thông minh (SĐT hoặc Mã quán hoặc Username)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(activeBranchId || 'branch_01');
  const [deviceRole, setDeviceRole] = useState<DeviceRole>('pos');
  const [deviceName, setDeviceName] = useState('Máy Thu Ngân 01');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPwdHelp, setShowForgotPwdHelp] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [focusedField, setFocusedField] = useState<'identifier' | 'pass' | 'masterKey' | null>(null);

  // Tự động nạp SĐT / Mã quán đăng nhập gần nhất
  useEffect(() => {
    AsyncStorage.getItem('ongchu_last_login_identifier')
      .then((val) => {
        if (val && !identifier) {
          setIdentifier(val);
        }
      })
      .catch(() => {});
  }, []);

  // Modals phụ trợ
  const [showQrModal, setShowQrModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStorePassword, setNewStorePassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');

  const identifierInputRef = React.useRef<TextInput>(null);
  const passInputRef = React.useRef<TextInput>(null);
  const masterKeyInputRef = React.useRef<TextInput>(null);

  const cleanIdent = identifier.trim().toLowerCase();
  const isProjectAdmin =
    cleanIdent === 'admin' ||
    cleanIdent === 'saas' ||
    cleanIdent === 'saas_master' ||
    cleanIdent === 'chuduan' ||
    cleanIdent === 'nguyenlocthanh291097';

  const handleLookupPhone = () => {
    playTapSound();
    const clean = lookupPhone.replace(/[\s\-\.]/g, '');
    if (!clean) {
      setLookupResult({ msg: 'Cần nhập Số Điện Thoại đã đăng ký', isError: true });
      return;
    }
    const match =
      KNOWN_PHONE_TENANTS[clean] ||
      Object.entries(KNOWN_PHONE_TENANTS).find(([p]) => p.includes(clean) || clean.includes(p))?.[1];

    if (match) {
      setIdentifier(match.code);
      setPassword('123456');
      setLookupResult({
        msg: `Tìm thấy: ${match.name} (Mã: ${match.code})! Đã tự điền mật khẩu: 123456.`,
        isError: false,
      });
      if (errorMessage) setErrorMessage('');
    } else {
      setIdentifier(clean);
      setLookupResult({
        msg: `Đã điền số điện thoại "${clean}". Vui lòng nhập mật khẩu quán.`,
        isError: false,
      });
    }
  };

  const handleNextStep = async () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }

    const rawIdent = identifier.trim();
    const cleanPhone = rawIdent.replace(/[\s\-\.]/g, '');

    let resolvedTenantCode = rawIdent.toLowerCase();
    let resolvedUsername = rawIdent || 'owner';

    if (KNOWN_PHONE_TENANTS[cleanPhone]) {
      resolvedTenantCode = KNOWN_PHONE_TENANTS[cleanPhone].code;
      resolvedUsername = KNOWN_PHONE_TENANTS[cleanPhone].defaultUser;
    } else if (isProjectAdmin) {
      resolvedTenantCode = 'saas';
      resolvedUsername = 'nguyenlocthanh291097';
    }

    if (!identifier.trim()) {
      setErrorMessage('Nhập Số Điện Thoại Quán hoặc Tài Khoản');
      return;
    }
    if (!password) {
      setErrorMessage('Nhập Mật Khẩu');
      return;
    }

    const effectiveMasterKey = isProjectAdmin
      ? (masterKey.trim() || SAAS_MASTER_KEY_DEFAULT)
      : masterKey;

    setLoading(true);
    setErrorMessage('');

    try {
      const branchToPass = (resolvedTenantCode === 'ongchu')
        ? (selectedBranchId || 'branch_01')
        : (selectedBranchId && !selectedBranchId.startsWith('branch_0') ? selectedBranchId : undefined);

      const result = await loginWithCredentials(
        resolvedTenantCode,
        resolvedUsername,
        password,
        branchToPass,
        effectiveMasterKey
      );

      if (result.success) {
        AsyncStorage.setItem('ongchu_last_login_identifier', rawIdent).catch(() => {});
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        onSuccess();
      } else {
        setErrorMessage(result.error || 'Sai thông tin đăng nhập hoặc mật khẩu');
      }
    } catch {
      setErrorMessage('Không thể kết nối máy chủ xác thực');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    setIdentifier('ongchu');
    setPassword('123456');
    setSelectedBranchId('branch_01');
    setLoading(true);
    setErrorMessage('');
    try {
      const result = await loginWithCredentials('ongchu', 'owner', '123456', 'branch_01');
      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        onSuccess();
      } else {
        setErrorMessage(result.error || 'Lỗi đăng nhập quán mẫu');
      }
    } catch {
      setErrorMessage('Không thể kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleQrSimulateSuccess = async () => {
    playTapSound();
    setShowQrModal(false);
    setLoading(true);
    try {
      const result = await loginWithCredentials('quanquan', 'owner', '123456', 'branch_01');
      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewStore = async () => {
    playTapSound();
    if (!newStoreName.trim()) {
      setRegisterError('Nhập Tên Quán / Thương Hiệu');
      return;
    }
    if (!newStorePhone.trim()) {
      setRegisterError('Nhập Số Điện Thoại Chủ Quán');
      return;
    }
    if (!newStorePassword.trim() || newStorePassword.length < 6) {
      setRegisterError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    setRegisterLoading(true);
    setRegisterError('');

    try {
      const result = await registerTenant(
        newStoreName.trim(),
        newStorePhone.trim(),
        newStorePassword.trim()
      );
      if (result.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        setShowRegisterModal(false);
        onSuccess();
      } else {
        setRegisterError(result.error || 'Lỗi khởi tạo quán mới');
      }
    } catch {
      setRegisterError('Không thể tạo quán lúc này');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleActivateDevice = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    bindDevice(selectedBranchId, deviceRole, deviceName);
    onSuccess();
  };

  return (
    <View style={s.formContainer}>
      {/* Error Alert */}
      {errorMessage ? (
        <View style={[s.errorBox, { backgroundColor: theme.status.dangerBg, borderColor: theme.brand.danger }]}>
          <Icon name="alert-circle-outline" size={16} color={theme.brand.danger} />
          <AppText variant="xs" weight="medium" color={theme.brand.danger} style={{ flex: 1 }}>
            {errorMessage}
          </AppText>
        </View>
      ) : null}

      {step === 'credentials' ? (
        <>
          {/* Nhận diện tài khoản Super Admin SaaS */}
          {isProjectAdmin && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: theme.status.warningBg,
                borderColor: theme.brand.accent,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 8,
              }}
            >
              <Icon name="crown" size={16} color={theme.brand.accent} />
              <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                👑 Nhận diện Quản Trị SaaS Toàn Hệ Thống
              </AppText>
            </View>
          )}

          {/* 1. Ô Nhập Thông Minh: SĐT hoặc Mã Quán (Tối giản còn 1 ô) */}
          <View
            style={[
              s.inputWrapper,
              {
                backgroundColor: focusedField === 'identifier' ? (isDark ? 'rgba(180,83,9,0.12)' : 'rgba(180,83,9,0.05)') : theme.surface.card,
                borderColor: focusedField === 'identifier' ? theme.brand.accent : theme.border.default,
                borderWidth: focusedField === 'identifier' ? 1.5 : 1,
              },
            ]}
          >
            <Icon
              name={/^\d+$/.test(identifier.trim()) ? 'phone-outline' : isProjectAdmin ? 'crown' : 'store-outline'}
              size={18}
              color={focusedField === 'identifier' ? theme.brand.accent : theme.text.muted}
              style={s.inputIcon}
            />
            <TextInput
              ref={identifierInputRef}
              value={identifier}
              onChangeText={(t) => {
                setIdentifier(t);
                if (errorMessage) setErrorMessage('');
              }}
              onFocus={() => setFocusedField('identifier')}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
              onSubmitEditing={() => passInputRef.current?.focus()}
              placeholder="Số điện thoại quán (VD: 0392387165)..."
              placeholderTextColor={theme.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[s.textInput, { color: theme.text.primary }]}
            />
          </View>

          {/* 2. Mật Khẩu Quản Trị */}
          <View
            style={[
              s.inputWrapper,
              {
                backgroundColor: focusedField === 'pass' ? (isDark ? 'rgba(180,83,9,0.12)' : 'rgba(180,83,9,0.05)') : theme.surface.card,
                borderColor: focusedField === 'pass' ? theme.brand.accent : theme.border.default,
                borderWidth: focusedField === 'pass' ? 1.5 : 1,
              },
            ]}
          >
            <Icon
              name="lock-outline"
              size={18}
              color={focusedField === 'pass' ? theme.brand.accent : theme.text.muted}
              style={s.inputIcon}
            />
            <TextInput
              ref={passInputRef}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMessage) setErrorMessage('');
              }}
              onFocus={() => setFocusedField('pass')}
              onBlur={() => setFocusedField(null)}
              returnKeyType="go"
              onSubmitEditing={handleNextStep}
              placeholder="Mật khẩu..."
              placeholderTextColor={theme.text.muted}
              secureTextEntry={!showPassword}
              style={[s.textInput, { color: theme.text.primary }]}
            />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowPassword(!showPassword)}
              style={s.eyeBtn}
            >
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.text.muted}
              />
            </TouchableOpacity>
          </View>

          {/* Hàng Tiện Ích: Cứu Hộ & Quên Mật Khẩu */}
          <View style={s.optionsRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="shield-check" size={14} color={theme.brand.success} />
              <AppText variant="xxs" color={theme.text.muted}>
                Tự động gán & ghi nhớ máy
              </AppText>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => {
                playTapSound();
                setShowForgotPwdHelp(!showForgotPwdHelp);
              }}
            >
              <AppText variant="xs" color={theme.brand.accent} weight="medium">
                {showForgotPwdHelp ? 'Đóng' : 'Quên mật khẩu?'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Cứu hộ mã quán / SĐT */}
          {showForgotPwdHelp && (
            <View
              style={{
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: 12,
                padding: 14,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="information-outline" size={16} color={theme.brand.accent} />
                <AppText variant="xs" weight="bold" color={theme.text.primary}>
                  CỨU HỘ MÃ GIAN HÀNG & MẬT KHẨU
                </AppText>
              </View>

              <View style={{ gap: 4 }}>
                <AppText variant="xs" color={theme.text.muted}>
                  Nhập Số Điện Thoại chủ quán để tra cứu lại:
                </AppText>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <TextInput
                    value={lookupPhone}
                    onChangeText={setLookupPhone}
                    placeholder="VD: 039287165, 0908123456..."
                    placeholderTextColor={theme.text.muted}
                    keyboardType="phone-pad"
                    style={{
                      flex: 1,
                      height: 42,
                      backgroundColor: theme.surface.card,
                      borderColor: theme.border.subtle,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      color: theme.text.primary,
                      fontSize: 16,
                    }}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleLookupPhone}
                    style={{
                      height: 42,
                      paddingHorizontal: 14,
                      backgroundColor: theme.brand.accent,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppText variant="xs" weight="bold" color={theme.text.onBrand}>
                      Tìm Quán
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {lookupResult && (
                <View
                  style={{
                    backgroundColor: lookupResult.isError ? theme.status.dangerBg : theme.surface.card,
                    borderColor: lookupResult.isError ? theme.brand.danger : theme.brand.success,
                    borderWidth: 1,
                    borderRadius: 8,
                    padding: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Icon
                    name={lookupResult.isError ? 'alert-circle' : 'check-circle'}
                    size={16}
                    color={lookupResult.isError ? theme.brand.danger : theme.brand.success}
                  />
                  <AppText
                    variant="xs"
                    color={lookupResult.isError ? theme.brand.danger : theme.text.primary}
                    style={{ flex: 1 }}
                  >
                    {lookupResult.msg}
                  </AppText>
                </View>
              )}

              {/* 2. Dán nhanh Quán quanquan & Quán ongchu */}
              <View style={{ gap: 6 }}>
                <AppText variant="xs" color={theme.text.muted}>
                  Hoặc bấm 1-chạm để dán thông tin đăng nhập:
                </AppText>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      setIdentifier('quanquan');
                      setPassword('123456');
                      setShowForgotPwdHelp(false);
                      if (errorMessage) setErrorMessage('');
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      height: 40,
                      backgroundColor: theme.surface.card,
                      borderColor: theme.brand.accent,
                      borderWidth: 1,
                      borderRadius: 8,
                    }}
                  >
                    <Icon name="store" size={14} color={theme.brand.accent} />
                    <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                      Quán quanquan
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      setIdentifier('ongchu');
                      setPassword('123456');
                      setShowForgotPwdHelp(false);
                      if (errorMessage) setErrorMessage('');
                    }}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      height: 40,
                      backgroundColor: theme.surface.card,
                      borderColor: theme.border.subtle,
                      borderWidth: 1,
                      borderRadius: 8,
                    }}
                  >
                    <Icon name="content-paste" size={14} color={theme.text.muted} />
                    <AppText variant="xs" weight="medium" color={theme.text.primary}>
                      Quán ongchu
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}



          {/* NÚT CHÍNH: KÍCH HOẠT & ĐĂNG NHẬP MÁY */}
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={loading}
            onPress={handleNextStep}
            style={[
              s.submitBtn,
              {
                backgroundColor: theme.brand.accent,
                opacity: loading ? 0.8 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.text.onBrand} />
            ) : (
              <>
                <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                  Kích Hoạt & Vào Ca
                </AppText>
                <Icon name="arrow-right" size={18} color={theme.text.onBrand} />
              </>
            )}
          </TouchableOpacity>

          {/* DÃY NÚT TÁC VỤ PHỤ CÂN ĐỐI (HÀNG 1: QR & QUÁN MẪU | HÀNG 2: MỞ QUÁN MỚI) */}
          <View style={s.secondaryActionsContainer}>
            {/* Hàng 1: 2 nút nửa cân đối 50/50 */}
            <View style={s.secondaryActionsRow}>
              {/* 1. Quét QR kích hoạt */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  setShowQrModal(true);
                }}
                style={[s.secondaryActionChip, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
              >
                <Icon name="qrcode-scan" size={15} color={theme.brand.accent} />
                <AppText variant="xs" weight="medium" color={theme.text.primary} numberOfLines={1}>
                  Quét QR Liên Kết
                </AppText>
              </TouchableOpacity>

              {/* 2. Dùng thử quán mẫu */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleQuickDemoLogin}
                style={[s.secondaryActionChip, { backgroundColor: isDark ? 'rgba(180,83,9,0.12)' : theme.status.warningBg, borderColor: theme.brand.accent }]}
              >
                <Icon name="crown" size={15} color={theme.brand.accent} />
                <AppText variant="xs" weight="bold" color={theme.brand.accent} numberOfLines={1}>
                  Quán Mẫu Demo
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Hàng 2: Mở quán mới (Rộng 100%, thoáng đãng, sang trọng) */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                playTapSound();
                setShowRegisterModal(true);
              }}
              style={[s.registerFullBtn, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
            >
              <Icon name="plus-circle-outline" size={16} color={theme.brand.success} />
              <AppText variant="xs" weight="medium" color={theme.text.primary}>
                Mở Quán Mới (30s Dùng Thử Miễn Phí)
              </AppText>
            </TouchableOpacity>
          </View>

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
        </>
      ) : (
        <>
          {/* BƯỚC 2: CẤU HÌNH THIẾT BỊ QUẦY */}
          <View style={[s.stepBanner, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <Icon name="cellphone-link" size={20} color={theme.brand.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="xs" weight="bold" color={theme.brand.primary}>
                BƯỚC 2: KHÓA THIẾT BỊ VÀO CHI NHÁNH
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Nhân viên sẽ chỉ thấy danh sách PIN của chi nhánh này
              </AppText>
            </View>
          </View>

          {/* 1. Chọn Chi Nhánh */}
          <View style={s.inputGroup}>
            <AppText variant="xs" weight="bold" color={theme.text.muted}>
              1. CHỌN CHI NHÁNH GẮN MÁY
            </AppText>
            <View style={s.branchPills}>
              {branches.map((b) => {
                const isSelected = selectedBranchId === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      setSelectedBranchId(b.id);
                    }}
                    style={[
                      s.branchPill,
                      {
                        backgroundColor: isSelected ? theme.brand.primaryBg : theme.surface.card,
                        borderColor: isSelected ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <AppText
                      variant="xs"
                      weight={isSelected ? 'bold' : 'normal'}
                      color={isSelected ? theme.brand.primary : theme.text.primary}
                    >
                      {b.code} - {b.name}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 2. Chọn Vai Trò Thiết Bị */}
          <View style={s.inputGroup}>
            <AppText variant="xs" weight="bold" color={theme.text.muted}>
              2. VAI TRÒ CHUYÊN TRÁCH CỦA THIẾT BỊ
            </AppText>
            <View style={s.roleGrid}>
              {DEVICE_ROLE_OPTIONS.map((opt) => {
                const isSelected = deviceRole === opt.role;
                return (
                  <TouchableOpacity
                    key={opt.role}
                    activeOpacity={0.8}
                    onPress={() => {
                      playTapSound();
                      setDeviceRole(opt.role);
                      if (opt.role === 'pos') setDeviceName('Máy POS Quầy 01');
                      else if (opt.role === 'kds') setDeviceName('Màn Hình Bếp 01');
                      else setDeviceName('Máy Order Bàn 01');
                    }}
                    style={[
                      s.roleCard,
                      {
                        backgroundColor: isSelected ? theme.brand.primaryBg : theme.surface.card,
                        borderColor: isSelected ? theme.brand.primary : theme.border.subtle,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.roleIconCircle,
                        { backgroundColor: isSelected ? theme.brand.primary : theme.surface.header },
                      ]}
                    >
                      <Icon
                        name={opt.icon as any}
                        size={20}
                        color={isSelected ? theme.text.onBrand : theme.text.muted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText
                        variant="xs"
                        weight={isSelected ? 'bold' : 'normal'}
                        color={isSelected ? theme.brand.primary : theme.text.primary}
                      >
                        {opt.label}
                      </AppText>
                      <AppText variant="xs" color={theme.text.muted}>
                        {opt.desc}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 3. Đặt Tên Máy */}
          <View style={s.inputGroup}>
            <AppText variant="xs" weight="bold" color={theme.text.muted}>
              3. TÊN ĐỊNH DANH MÁY
            </AppText>
            <View style={[s.inputWrapper, { backgroundColor: theme.surface.card, borderColor: theme.border.default }]}>
              <Icon name="tag-outline" size={20} color={theme.brand.primary} style={s.inputIcon} />
              <TextInput
                value={deviceName}
                onChangeText={setDeviceName}
                placeholder="Ví dụ: Máy POS Quầy 01, Bếp Lầu 1..."
                placeholderTextColor={theme.text.muted}
                style={[s.textInput, { color: theme.text.primary }]}
              />
            </View>
          </View>

          {/* Action Row: Quay Lại & Kích Hoạt */}
          <View style={s.btnRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                playTapSound();
                setStep('credentials');
              }}
              style={[s.backBtn, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
            >
              <Icon name="arrow-left" size={18} color={theme.text.muted} />
              <AppText variant="xs" weight="medium" color={theme.text.muted}>
                Quay Lại
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleActivateDevice}
              style={[s.activateBtn, { backgroundColor: theme.brand.accent }]}
            >
              <Icon name="shield-lock-outline" size={18} color={theme.text.onBrand} />
              <AppText variant="md" weight="bold" color={theme.text.onBrand}>
                Bắt Đầu Bán
              </AppText>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* 🌟 MODAL QUÉT QR KÍCH HOẠT MÁY (1s PAIRING) */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
            <View style={s.modalHeader}>
              <View style={[s.modalIconCircle, { backgroundColor: theme.brand.primaryBg }]}>
                <Icon name="qrcode-scan" size={24} color={theme.brand.accent} />
              </View>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Quét QR Kích Hoạt Thiết Bị
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center' }}>
                Mở app OngChu trên điện thoại Chủ Quán ➔ Vào Cài Đặt ➔ Thêm Máy Quầy ➔ Quét mã liên kết.
              </AppText>
            </View>

            {/* Simulated QR Viewport */}
            <View style={[s.qrViewport, { backgroundColor: theme.surface.header, borderColor: theme.brand.accent }]}>
              <Icon name="qrcode" size={100} color={theme.text.primary} />
              <View style={[s.qrScanLine, { backgroundColor: theme.brand.accent }]} />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleQrSimulateSuccess}
              style={[s.modalPrimaryBtn, { backgroundColor: theme.brand.accent }]}
            >
              <Icon name="check-circle-outline" size={18} color={theme.text.onBrand} />
              <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                Kích Hoạt Nhanh Bằng QR (1s)
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowQrModal(false)}
              style={s.modalCloseBtn}
            >
              <AppText variant="xs" color={theme.text.muted}>
                Đóng
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🌟 MODAL ĐĂNG KÝ QUÁN MỚI (30s ONBOARDING) */}
      <Modal visible={showRegisterModal} transparent animationType="fade" onRequestClose={() => setShowRegisterModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}>
            <View style={s.modalHeader}>
              <View style={[s.modalIconCircle, { backgroundColor: theme.brand.primaryBg }]}>
                <Icon name="store-plus" size={24} color={theme.brand.accent} />
              </View>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                Mở Quán Mới Trong 30 Giây
              </AppText>
              <AppText variant="xs" color={theme.text.muted} style={{ textAlign: 'center' }}>
                Khởi tạo hệ thống F&B Vị Chủ Quán miễn phí, không cần thẻ tín dụng.
              </AppText>
            </View>

            {registerError ? (
              <View style={[s.errorBox, { backgroundColor: theme.status.dangerBg, borderColor: theme.brand.danger }]}>
                <Icon name="alert-circle-outline" size={16} color={theme.brand.danger} />
                <AppText variant="xs" weight="medium" color={theme.brand.danger} style={{ flex: 1 }}>
                  {registerError}
                </AppText>
              </View>
            ) : null}

            <View style={{ gap: 10, width: '100%' }}>
              <View style={[s.inputWrapper, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
                <Icon name="store" size={18} color={theme.brand.accent} style={s.inputIcon} />
                <TextInput
                  value={newStoreName}
                  onChangeText={setNewStoreName}
                  placeholder="Tên quán (VD: Cà Phê Mộc 1985)"
                  placeholderTextColor={theme.text.muted}
                  style={[s.textInput, { color: theme.text.primary }]}
                />
              </View>

              <View style={[s.inputWrapper, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
                <Icon name="phone" size={18} color={theme.brand.accent} style={s.inputIcon} />
                <TextInput
                  value={newStorePhone}
                  onChangeText={setNewStorePhone}
                  placeholder="Số điện thoại chủ quán..."
                  placeholderTextColor={theme.text.muted}
                  keyboardType="phone-pad"
                  style={[s.textInput, { color: theme.text.primary }]}
                />
              </View>

              <View style={[s.inputWrapper, { backgroundColor: theme.surface.header, borderColor: theme.border.default }]}>
                <Icon name="lock" size={18} color={theme.brand.accent} style={s.inputIcon} />
                <TextInput
                  value={newStorePassword}
                  onChangeText={setNewStorePassword}
                  placeholder="Tạo mật khẩu (tối thiểu 6 ký tự)..."
                  placeholderTextColor={theme.text.muted}
                  secureTextEntry
                  style={[s.textInput, { color: theme.text.primary }]}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={registerLoading}
              onPress={handleCreateNewStore}
              style={[s.modalPrimaryBtn, { backgroundColor: theme.brand.accent }]}
            >
              {registerLoading ? (
                <ActivityIndicator size="small" color={theme.text.onBrand} />
              ) : (
                <>
                  <Icon name="rocket-launch" size={18} color={theme.text.onBrand} />
                  <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
                    Tạo Quán & Bắt Đầu Ngay
                  </AppText>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowRegisterModal(false)}
              style={s.modalCloseBtn}
            >
              <AppText variant="xs" color={theme.text.muted}>
                Đã có quán? Quay lại đăng nhập
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  formContainer: {
    width: '100%',
    gap: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  inputGroup: {
    gap: 5,
  },
  fieldLabel: {
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  branchPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  branchPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
    shadowColor: lightTheme.surface.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryActionsContainer: {
    gap: 8,
    marginTop: 6,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryActionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  registerFullBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  trustBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 2,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  roleGrid: {
    gap: 8,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  roleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  activateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 6,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  qrViewport: {
    width: 180,
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  qrScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    opacity: 0.8,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  modalCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});

