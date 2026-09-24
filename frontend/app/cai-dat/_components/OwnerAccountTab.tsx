import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { AppText, useAppToast, AppModal } from '../../../lib/components/ui';
import { useAuthStore } from '../../../lib/store/useAuthStore';
import { useStoreSettings } from '../../../lib/store/usePOSStore';
import { playTapSound } from '../../../lib/utils/sound';

interface OwnerAccountTabProps {
  isWide?: boolean;
}

export function OwnerAccountTab({ isWide = false }: OwnerAccountTabProps) {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showToast } = useAppToast();

  const tenant = useAuthStore((s) => s.tenant);
  const deviceBinding = useAuthStore((s) => s.deviceBinding);
  const ownerPin = useAuthStore((s) => s.ownerPin);
  const managerPin = useAuthStore((s) => s.managerPin);
  const currentUser = useAuthStore((s) => s.currentUser);

  const setOwnerPin = useAuthStore((s) => s.setOwnerPin);
  const setManagerPin = useAuthStore((s) => s.setManagerPin);
  const changeOwnerPassword = useAuthStore((s) => s.changeOwnerPassword);
  const unbindDevice = useAuthStore((s) => s.unbindDevice);
  const deleteAccountAndTenantData = useAuthStore((s) => s.deleteAccountAndTenantData);

  const storeSettings = useStoreSettings();

  // State đổi mật khẩu SaaS
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // State đổi PIN Modals
  const [showOwnerPinModal, setShowOwnerPinModal] = useState(false);
  const [showManagerPinModal, setShowManagerPinModal] = useState(false);
  const [newOwnerPinInput, setNewOwnerPinInput] = useState('');
  const [newManagerPinInput, setNewManagerPinInput] = useState('');

  // State gỡ thiết bị Modal
  const [showUnbindModal, setShowUnbindModal] = useState(false);
  const [unbindCode, setUnbindCode] = useState('');

  // State Xóa Tài Khoản & Toàn Bộ Dữ Liệu Modal (Apple Guideline 5.1.1v)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const formatExpiryDate = (isoStr?: string) => {
    if (!isoStr) return '31/12/2027';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr.split('T')[0];
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return isoStr.split('T')[0];
    }
  };

  const cardStyle = [
    s.card,
    {
      backgroundColor: theme.surface.card,
      borderColor: theme.border.subtle,
      borderRadius: isWide ? 14 : 0,
      borderWidth: isWide ? 1 : 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border.subtle,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginTop: isWide ? 0 : 8,
    },
  ];

  const handleCopySubdomain = () => {
    playTapSound();
    const code = tenant?.code || 'ongchu';
    showToast({
      title: 'Đã Sao Chép Mã Quán',
      message: `Mã: ${code} (Dùng để đăng nhập nhân viên)`,
      type: 'info',
    });
  };

  const handleChangePassword = () => {
    playTapSound();
    if (!currentPassword.trim()) {
      showToast({ title: 'Thiếu thông tin', message: 'Cần nhập mật khẩu hiện tại', type: 'warning' });
      return;
    }
    if (newPassword.length < 6) {
      showToast({ title: 'Mật khẩu yếu', message: 'Mật khẩu cần tối thiểu 6 ký tự', type: 'warning' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({ title: 'Không khớp', message: 'Xác nhận mật khẩu mới không trùng khớp', type: 'warning' });
      return;
    }

    setPwdLoading(true);
    try {
      const res = changeOwnerPassword(currentPassword, newPassword);
      if (res.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        showToast({
          title: 'Đổi Mật Khẩu',
          message: 'Đã lưu mật khẩu Quản Trị mới!',
          type: 'success',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast({
          title: 'Đổi mật khẩu thất bại',
          message: res.error || 'Mật khẩu hiện tại không đúng',
          type: 'danger',
        });
      }
    } finally {
      setPwdLoading(false);
    }
  };

  const handleUpdateOwnerPin = () => {
    playTapSound();
    if (!/^\d{4}$/.test(newOwnerPinInput.trim())) {
      showToast({ title: 'PIN lỗi', message: 'Mã PIN cần đúng 4 chữ số', type: 'warning' });
      return;
    }
    const res = setOwnerPin(newOwnerPinInput.trim());
    if (res.success) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      showToast({
        title: 'Đổi PIN Chủ Quán',
        message: 'Đã cập nhật mã PIN Chủ Quán!',
        type: 'success',
      });
      setNewOwnerPinInput('');
      setShowOwnerPinModal(false);
    } else {
      showToast({ title: 'Lỗi cập nhật', message: res.error || 'Không thể đổi PIN', type: 'danger' });
    }
  };

  const handleUpdateManagerPin = () => {
    playTapSound();
    if (!/^\d{4}$/.test(newManagerPinInput.trim())) {
      showToast({ title: 'PIN lỗi', message: 'Mã PIN cần đúng 4 chữ số', type: 'warning' });
      return;
    }
    const res = setManagerPin(newManagerPinInput.trim());
    if (res.success) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      showToast({
        title: 'Đổi PIN Quản Lý',
        message: 'Đã cập nhật mã PIN Quản Lý!',
        type: 'success',
      });
      setNewManagerPinInput('');
      setShowManagerPinModal(false);
    } else {
      showToast({ title: 'Lỗi cập nhật', message: res.error || 'Không thể đổi PIN', type: 'danger' });
    }
  };

  const handleExecuteUnbind = async () => {
    playTapSound();
    if (!unbindCode.trim()) {
      showToast({ title: 'Thiếu mã', message: 'Nhập PIN Chủ Quán hoặc mã cứu hộ', type: 'warning' });
      return;
    }
    const res = await unbindDevice(unbindCode.trim());
    if (res.success) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
      setShowUnbindModal(false);
      setUnbindCode('');
      showToast({
        title: 'Gỡ Thiết Bị',
        message: 'Đã gỡ thiết bị khỏi quầy!',
        type: 'success',
      });
    } else {
      showToast({
        title: 'Gỡ thiết bị thất bại',
        message: res.error || 'Mã PIN hoặc Mã Cứu Hộ không chính xác',
        type: 'danger',
      });
    }
  };

  const handleExecuteDeleteAccount = async () => {
    playTapSound();
    if (!deletePin.trim()) {
      showToast({ title: 'Thiếu PIN', message: 'Cần nhập PIN Chủ Quán', type: 'warning' });
      return;
    }
    const confirmUpper = deleteConfirmText.trim().toUpperCase();
    if (confirmUpper !== 'XOA TAI KHOAN' && confirmUpper !== 'DELETE') {
      showToast({ title: 'Chưa đúng', message: 'Nhập chính xác: XOA TAI KHOAN', type: 'warning' });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAccountAndTenantData(deletePin.trim(), deleteConfirmText.trim());
      if (res.success) {
        if (Platform.OS !== 'web') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
        }
        setShowDeleteModal(false);
        setDeletePin('');
        setDeleteConfirmText('');
        showToast({
          title: 'Đã Xóa Dữ Liệu',
          message: 'Đã xóa tài khoản và dữ liệu thành công!',
          type: 'success',
        });
        setTimeout(() => {
          router.replace('/login');
        }, 300);
      } else {
        showToast({
          title: 'Xóa thất bại',
          message: res.error || 'Mã PIN không đúng hoặc thao tác bị từ chối',
          type: 'danger',
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[s.container, { gap: isWide ? 12 : 0 }]}>
      {/* 🌟 CARD 1: HỒ SƠ THƯƠNG HIỆU & BẢN QUYỀN SAAS */}
      <View style={cardStyle}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="crown" size={20} color={theme.brand.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Hồ Sơ Thương Hiệu & Bản Quyền
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Thông tin gian hàng SaaS được cấp phép
            </AppText>
          </View>
          <View
            style={[
              s.planBadge,
              { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : theme.status.readyBg },
            ]}
          >
            <View style={[s.dotIndicator, { backgroundColor: theme.brand.success }]} />
            <AppText variant="xs" weight="bold" color={theme.brand.success}>
              Gói {tenant?.subscriptionPlan?.toUpperCase() || 'PRO'}
            </AppText>
          </View>
        </View>

        {/* Danh sách thông số thương hiệu dạng hàng phẳng */}
        <View style={s.metaList}>
          <View style={s.metaRow}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Tên Gian Hàng
            </AppText>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              {tenant?.name || storeSettings.storeName}
            </AppText>
          </View>

          <View style={[s.metaRow, s.metaRowBorder, { borderTopColor: theme.border.subtle }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Mã Quán (Subdomain)
            </AppText>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCopySubdomain}
              style={[
                s.copyChip,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.subtle,
                },
              ]}
            >
              <AppText variant="sm" weight="bold" color={theme.brand.primary} tabularNums>
                {tenant?.code || 'ongchu'}
              </AppText>
              <Icon name="content-copy" size={14} color={theme.brand.primary} />
            </TouchableOpacity>
          </View>

          <View style={[s.metaRow, s.metaRowBorder, { borderTopColor: theme.border.subtle }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Tài Khoản Đăng Nhập
            </AppText>
            <View style={s.roleTag}>
              <Icon name="shield-check" size={14} color={theme.brand.primary} />
              <AppText variant="sm" weight="bold" color={theme.brand.primary}>
                {currentUser?.name || 'Chủ Quán (HQ Admin)'}
              </AppText>
            </View>
          </View>

          <View style={[s.metaRow, s.metaRowBorder, { borderTopColor: theme.border.subtle }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Số Điện Thoại Chủ Quán
            </AppText>
            <AppText variant="sm" weight="medium" color={theme.text.primary} tabularNums>
              {tenant?.phone || '1900 6868'}
            </AppText>
          </View>

          <View style={[s.metaRow, s.metaRowBorder, { borderTopColor: theme.border.subtle }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Thời Hạn Bản Quyền
            </AppText>
            <AppText variant="sm" weight="bold" color={theme.brand.success} tabularNums>
              Còn {tenant?.licenseDaysLeft ?? 365} ngày ({formatExpiryDate(tenant?.licenseExpiresAt)})
            </AppText>
          </View>
        </View>
      </View>

      {/* 🌟 CARD 2: ĐỔI MẬT KHẨU TÀI KHOẢN CHỦ QUÁN (SAAS PASSWORD) */}
      <View style={cardStyle}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.brand.primaryBg }]}>
            <Icon name="lock-reset" size={20} color={theme.brand.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Đổi Mật Khẩu Quản Trị (SaaS)
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Mật khẩu dùng để kích hoạt máy POS mới và truy cập từ xa
            </AppText>
          </View>
        </View>

        <View style={s.formBlock}>
          {/* Mật khẩu hiện tại */}
          <View style={s.inputWrapper}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Mật khẩu hiện tại *
            </AppText>
            <View style={[s.inputBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
              <Icon name="lock-outline" size={18} color={theme.text.muted} />
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Nhập mật khẩu hiện tại..."
                placeholderTextColor={theme.text.muted}
                secureTextEntry={!showCurrentPwd}
                style={[s.textInput, { color: theme.text.primary }]}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPwd(!showCurrentPwd)}
                style={s.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name={showCurrentPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mật khẩu mới */}
          <View style={s.inputWrapper}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Mật khẩu mới (tối thiểu 6 ký tự) *
            </AppText>
            <View style={[s.inputBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
              <Icon name="key-outline" size={18} color={theme.brand.primary} />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới..."
                placeholderTextColor={theme.text.muted}
                secureTextEntry={!showNewPwd}
                style={[s.textInput, { color: theme.text.primary }]}
              />
              <TouchableOpacity
                onPress={() => setShowNewPwd(!showNewPwd)}
                style={s.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name={showNewPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Xác nhận mật khẩu mới */}
          <View style={s.inputWrapper}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Nhập lại mật khẩu mới *
            </AppText>
            <View style={[s.inputBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
              <Icon name="check-circle-outline" size={18} color={theme.brand.success} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Xác nhận mật khẩu mới..."
                placeholderTextColor={theme.text.muted}
                secureTextEntry={!showConfirmPwd}
                style={[s.textInput, { color: theme.text.primary }]}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPwd(!showConfirmPwd)}
                style={s.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name={showConfirmPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.text.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleChangePassword}
            disabled={pwdLoading}
            style={[s.btnSavePassword, { backgroundColor: theme.brand.accent }]}
          >
            <Icon name="content-save-outline" size={18} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand}>
              {pwdLoading ? 'Đang Xử Lý...' : 'Đổi Mật Khẩu Quản Trị'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🌟 CARD 3: ĐỔI MÃ PIN MỞ CA VÀ CẤP PHÉP QUẦY (0MS KIOSK PIN) */}
      <View style={cardStyle}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.readyBg }]}>
            <Icon name="dialpad" size={20} color={theme.brand.success} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Mã PIN Vào Ca & Phê Duyệt Quầy (0ms)
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Đăng nhập nhanh 4 số khi khách đông mà không cần gõ mật khẩu dài
            </AppText>
          </View>
        </View>

        <View style={s.pinListBlock}>
          {/* 1. PIN Chủ Quán */}
          <View
            style={[
              s.pinCardItem,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            <View style={s.pinItemHeader}>
              <View style={s.pinTitleGroup}>
                <Icon name="crown" size={18} color={theme.brand.warning} />
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  PIN Chủ Quán ({ownerPin ? ownerPin : 'Chưa thiết lập'})
                </AppText>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  setNewOwnerPinInput('');
                  setShowOwnerPinModal(true);
                }}
                style={[
                  s.btnPinEdit,
                  { backgroundColor: isDark ? 'rgba(180, 83, 9, 0.2)' : '#FEF3C7', borderColor: theme.brand.accent },
                ]}
              >
                <Icon name="pencil-outline" size={14} color={theme.brand.accent} />
                <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                  Đổi PIN
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Chips phân quyền Chủ Quán */}
            <View style={s.presetWrap}>
              {['Toàn Quyền', 'Mở Két RJ11', 'Gỡ Máy POS', 'Xóa Dữ Liệu'].map((perm) => (
                <View
                  key={perm}
                  style={[s.chipBadge, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
                >
                  <AppText variant="xxs" color={theme.text.primary}>
                    ✓ {perm}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          {/* 2. PIN Quản Lý */}
          <View
            style={[
              s.pinCardItem,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            <View style={s.pinItemHeader}>
              <View style={s.pinTitleGroup}>
                <Icon name="shield-account" size={18} color={theme.brand.accent} />
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  PIN Quản Lý ({managerPin ? managerPin : 'Chưa thiết lập'})
                </AppText>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  playTapSound();
                  setNewManagerPinInput('');
                  setShowManagerPinModal(true);
                }}
                style={[
                  s.btnPinEdit,
                  { backgroundColor: isDark ? 'rgba(180, 83, 9, 0.2)' : '#FEF3C7', borderColor: theme.brand.accent },
                ]}
              >
                <Icon name="pencil-outline" size={14} color={theme.brand.accent} />
                <AppText variant="xs" weight="bold" color={theme.brand.accent}>
                  Đổi PIN
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Chips phân quyền Quản Lý */}
            <View style={s.presetWrap}>
              {['Duyệt Hủy Món', 'Duyệt Chiết Khấu > 20%', 'Mở / Đóng Ca'].map((perm) => (
                <View
                  key={perm}
                  style={[s.chipBadge, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
                >
                  <AppText variant="xxs" color={theme.text.primary}>
                    ✓ {perm}
                  </AppText>
                </View>
              ))}
            </View>
          </View>

          {/* 3. PIN Thu Ngân & Phục Vụ */}
          <View
            style={[
              s.pinCardItem,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
              },
            ]}
          >
            <View style={s.pinItemHeader}>
              <View style={s.pinTitleGroup}>
                <Icon name="account-group" size={18} color={theme.brand.success} />
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  PIN Nhân Viên
                </AppText>
              </View>
            </View>

            {/* Chips phân quyền Thu Ngân / Phục Vụ */}
            <View style={s.presetWrap}>
              {['Tạo Đơn Hàng', 'Báo Bếp KDS', 'In Tạm Tính', 'Thu Tiền / QR'].map((perm) => (
                <View
                  key={perm}
                  style={[s.chipBadge, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle }]}
                >
                  <AppText variant="xxs" color={theme.text.primary}>
                    ✓ {perm}
                  </AppText>
                </View>
              ))}
            </View>

            <AppText variant="xxs" color={theme.text.muted} style={{ marginTop: 2 }}>
              💡 Có thể cấp mã PIN riêng cho từng nhân viên tại mục Nhân Sự & Chấm Công.
            </AppText>
          </View>
        </View>
      </View>

      {/* 🌟 CARD 4: TRẠNG THÁI THIẾT BỊ & GỠ MÁY POS */}
      <View style={cardStyle}>
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.dangerBg }]}>
            <Icon name="cellphone-link-off" size={20} color={theme.brand.danger} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>
              Liên Kết Thiết Bị & Gỡ Máy POS
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              {deviceBinding.deviceName || 'Máy POS Quầy 01'} · {deviceBinding.branchName || 'Chi Nhánh 1 (Quận 1)'}
            </AppText>
          </View>
        </View>

        <View style={{ marginTop: 8, gap: 10 }}>
          <AppText variant="xs" color={theme.text.muted}>
            Thiết bị này đang được khóa bảo mật vào điểm bán. Khi chuyển giao máy cho quán khác hoặc đổi quầy, Chủ Quán có thể gỡ liên kết thiết bị.
          </AppText>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setUnbindCode('');
              setShowUnbindModal(true);
            }}
            style={[
              s.actionBtn44,
              {
                borderColor: theme.brand.danger,
                backgroundColor: 'transparent',
              },
            ]}
          >
            <Icon name="link-off" size={18} color={theme.brand.danger} />
            <AppText variant="sm" weight="bold" color={theme.brand.danger}>
              Gỡ Thiết Bị Khỏi Quầy
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🌟 CARD 5: XÓA TÀI KHOẢN & TOÀN BỘ DỮ LIỆU (APPLE APP STORE GUIDELINE 5.1.1v) */}
      <View
        style={[
          ...cardStyle,
          {
            borderColor: theme.brand.danger,
            marginTop: isWide ? 0 : 8,
          },
        ]}
      >
        <View style={s.sectionHeader}>
          <View style={[s.iconBox, { backgroundColor: theme.status.dangerBg }]}>
            <Icon name="account-remove-outline" size={20} color={theme.brand.danger} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="md" weight="bold" color={theme.brand.danger}>
              Xóa Tài Khoản & Toàn Bộ Dữ Liệu
            </AppText>
            <AppText variant="xs" color={theme.text.muted}>
              Apple Guideline 5.1.1(v) · Xóa sạch vĩnh viễn dữ liệu điểm bán
            </AppText>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <AppText variant="xs" color={theme.text.muted}>
            Thao tác này sẽ xóa vĩnh viễn toàn bộ thực đơn, bàn ăn, hóa đơn, lịch sử doanh thu và thông tin tài khoản khỏi thiết bị này. Dữ liệu sau khi xóa không thể phục hồi.
          </AppText>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              setDeletePin('');
              setDeleteConfirmText('');
              setShowDeleteModal(true);
            }}
            style={[
              s.actionBtn44,
              {
                backgroundColor: theme.status.dangerBg,
                borderColor: theme.status.dangerBorder,
              },
            ]}
          >
            <Icon name="delete-forever-outline" size={18} color={theme.brand.danger} />
            <AppText variant="sm" weight="bold" color={theme.brand.danger}>
              Xóa Toàn Bộ Dữ Liệu Quán
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🌟 MODAL 1: Đổi PIN Chủ Quán */}
      <AppModal
        visible={showOwnerPinModal}
        title="Đổi PIN Chủ Quán"
        onClose={() => setShowOwnerPinModal(false)}
        presentation="dialog"
        primaryAction={{
          label: 'Lưu PIN Mới',
          onPress: handleUpdateOwnerPin,
        }}
        secondaryAction={{
          label: 'Hủy',
          onPress: () => setShowOwnerPinModal(false),
        }}
      >
        <View style={{ gap: 14, paddingVertical: 4 }}>
          <AppText variant="sm" color={theme.text.muted}>
            Nhập 4 số PIN mới cho tài khoản Chủ Quán (Quyền tối cao):
          </AppText>
          <TextInput
            value={newOwnerPinInput}
            onChangeText={setNewOwnerPinInput}
            placeholder="VD: 9999"
            placeholderTextColor={theme.text.muted}
            keyboardType="numeric"
            maxLength={4}
            autoFocus
            style={[
              s.pinInputBox,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.default,
                color: theme.text.primary,
              },
            ]}
          />
        </View>
      </AppModal>

      {/* 🌟 MODAL 2: Đổi PIN Quản Lý */}
      <AppModal
        visible={showManagerPinModal}
        title="Đổi PIN Quản Lý"
        onClose={() => setShowManagerPinModal(false)}
        presentation="dialog"
        primaryAction={{
          label: 'Lưu PIN Mới',
          variant: 'accent',
          onPress: handleUpdateManagerPin,
        }}
        secondaryAction={{
          label: 'Hủy',
          onPress: () => setShowManagerPinModal(false),
        }}
      >
        <View style={{ gap: 14, paddingVertical: 4 }}>
          <AppText variant="sm" color={theme.text.muted}>
            Nhập 4 số PIN mới cho Quản Lý ca trực:
          </AppText>
          <TextInput
            value={newManagerPinInput}
            onChangeText={setNewManagerPinInput}
            placeholder="VD: 8888"
            placeholderTextColor={theme.text.muted}
            keyboardType="numeric"
            maxLength={4}
            autoFocus
            style={[
              s.pinInputBox,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.default,
                color: theme.text.primary,
              },
            ]}
          />
        </View>
      </AppModal>

      {/* 🌟 MODAL 3: Gỡ Thiết Bị POS */}
      <AppModal
        visible={showUnbindModal}
        title="Gỡ Thiết Bị Khỏi Quầy"
        onClose={() => setShowUnbindModal(false)}
        presentation="dialog"
        primaryAction={{
          label: 'Xác Nhận Gỡ',
          variant: 'danger',
          onPress: handleExecuteUnbind,
        }}
        secondaryAction={{
          label: 'Hủy',
          onPress: () => setShowUnbindModal(false),
        }}
      >
        <View style={{ gap: 14, paddingVertical: 4 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[s.iconBox, { backgroundColor: theme.status.dangerBg }]}>
              <Icon name="cellphone-link-off" size={20} color={theme.brand.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="md" weight="bold" color={theme.text.primary}>
                {deviceBinding.deviceName || 'Máy POS Quầy 01'}
              </AppText>
              <AppText variant="xs" color={theme.text.muted}>
                Chi nhánh: {deviceBinding.branchName || 'Chi Nhánh 1'}
              </AppText>
            </View>
          </View>

          <AppText variant="sm" color={theme.text.muted}>
            Nhập PIN Chủ Quán ({ownerPin}) hoặc Mã Cứu Hộ SaaS:
          </AppText>

          <TextInput
            value={unbindCode}
            onChangeText={setUnbindCode}
            placeholder="Nhập PIN hoặc SAASxxxxxx..."
            placeholderTextColor={theme.text.muted}
            autoCapitalize="characters"
            style={[
              s.inputBox,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.default,
                color: theme.text.primary,
              },
            ]}
          />
        </View>
      </AppModal>

      {/* 🌟 MODAL 4: Xóa Dữ Liệu 2 Lớp */}
      <AppModal
        visible={showDeleteModal}
        title="Xóa Dữ Liệu Điểm Bán"
        onClose={() => !isDeleting && setShowDeleteModal(false)}
        presentation="dialog"
        primaryAction={{
          label: isDeleting ? 'Đang Xóa...' : 'Xác Nhận Xóa',
          variant: 'danger',
          loading: isDeleting,
          disabled: isDeleting,
          onPress: handleExecuteDeleteAccount,
        }}
        secondaryAction={{
          label: 'Hủy Bỏ',
          disabled: isDeleting,
          onPress: () => setShowDeleteModal(false),
        }}
      >
        <View style={{ gap: 14, paddingVertical: 4 }}>
          <View style={{ backgroundColor: theme.status.dangerBg, padding: 12, borderRadius: 8, gap: 4 }}>
            <AppText variant="sm" weight="bold" color={theme.brand.danger}>
              ⚠ CẢNH BÁO BẢO MẬT 2 LỚP:
            </AppText>
            <AppText variant="xs" color={theme.brand.danger}>
              Toàn bộ dữ liệu doanh thu, hóa đơn, thực đơn sẽ bị xóa sạch và không thể phục hồi.
            </AppText>
          </View>

          <View style={s.inputWrapper}>
            <AppText variant="xs" color={theme.text.muted}>
              1. Nhập chính xác cụm từ: <AppText variant="xs" weight="bold" color={theme.brand.danger}>XOA TAI KHOAN</AppText>
            </AppText>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="XOA TAI KHOAN"
              placeholderTextColor={theme.text.muted}
              autoCapitalize="characters"
              style={[
                s.inputBox,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.status.dangerBorder,
                  color: theme.brand.danger,
                  fontWeight: '600',
                },
              ]}
            />
          </View>

          <View style={s.inputWrapper}>
            <AppText variant="xs" color={theme.text.muted}>
              2. Nhập mã PIN Chủ Quán ({ownerPin}):
            </AppText>
            <TextInput
              value={deletePin}
              onChangeText={setDeletePin}
              placeholder="PIN Chủ Quán..."
              placeholderTextColor={theme.text.muted}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              style={[
                s.inputBox,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.status.dangerBorder,
                  color: theme.brand.danger,
                  fontWeight: '600',
                },
              ]}
            />
          </View>
        </View>
      </AppModal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaList: {
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  metaRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formBlock: {
    gap: 12,
    marginTop: 4,
  },
  inputWrapper: {
    gap: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  eyeButton: {
    padding: 4,
  },
  btnSavePassword: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  pinListBlock: {
    gap: 10,
    marginTop: 4,
  },
  pinCardItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  pinItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnPinEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBtn44: {
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pinInputBox: {
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
  },
  modalBtn: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
