import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, useAppToast, AppModal, AppFormField } from '../../components/ui';
import {
  StaffMember,
  StaffRole,
  WageType,
  ROLE_CONFIG,
} from '../../store/useStaffStore';
import { useAuthStore } from '../../store/useAuthStore';
import { playTapSound } from '../../utils/sound';

interface StaffFormModalProps {
  visible: boolean;
  onClose: () => void;
  staff?: StaffMember | null;
  onSave: (data: {
    name: string;
    phone: string;
    role: StaffRole;
    wageType: WageType;
    wageRate: number;
    allowance: number;
    overtimeRateMultiplier: number;
    pinCode?: string;
    username?: string;
    password?: string;
    branchId?: string;
  }) => void;
  onDelete?: (staff: StaffMember) => void;
}

export function StaffFormModal({
  visible,
  onClose,
  staff,
  onSave,
  onDelete,
}: StaffFormModalProps) {
  const { theme } = useTheme();
  const { showToast } = useAppToast();
  const branches = useAuthStore((s) => s.branches);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const isOwner = useAuthStore((s) => s.isOwner());

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPinCode, setFormPinCode] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<StaffRole>('phuc_vu');
  const [formBranchId, setFormBranchId] = useState<string>('branch_01');
  const [formWageType, setFormWageType] = useState<WageType>('hourly');
  const [formWageRate, setFormWageRate] = useState('22000');
  const [formAllowance, setFormAllowance] = useState('0');
  const [formOtMultiplier, setFormOtMultiplier] = useState('1.5');

  useEffect(() => {
    if (staff) {
      setFormName(staff.name);
      setFormPhone(staff.phone || '');
      setFormPinCode(staff.pinCode || '');
      setFormUsername(staff.username || '');
      setFormPassword(staff.password || '');
      setFormRole(staff.role);
      setFormBranchId(staff.branchId || activeBranchId || 'branch_01');
      setFormWageType(staff.wageType);
      setFormWageRate(String(staff.wageRate));
      setFormAllowance(String(staff.allowance || 0));
      setFormOtMultiplier(String(staff.overtimeRateMultiplier || 1.5));
    } else {
      setFormName('');
      setFormPhone('');
      setFormPinCode('');
      setFormUsername('');
      setFormPassword('');
      setFormRole('phuc_vu');
      setFormBranchId(activeBranchId || 'branch_01');
      setFormWageType('hourly');
      setFormWageRate('22000');
      setFormAllowance('200000');
      setFormOtMultiplier('1.5');
    }
  }, [staff, visible, activeBranchId]);

  // Khi đổi vai trò, tự động gợi ý mức lương mặc định nếu là thêm mới
  const handleSelectRole = (role: StaffRole) => {
    playTapSound();
    setFormRole(role);
    if (!staff) {
      const cfg = ROLE_CONFIG[role];
      setFormWageType(cfg.defaultWageType);
      setFormWageRate(String(cfg.defaultRate));
    }
  };

  const handleSave = () => {
    playTapSound();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      showToast({ title: 'Thiếu tên', message: 'Nhập tên nhân viên!', type: 'danger' });
      return;
    }

    const rate = parseInt(formWageRate.replace(/\D/g, ''), 10) || 0;
    if (rate <= 0) {
      showToast({ title: 'Mức lương lỗi', message: 'Mức lương phải lớn hơn 0', type: 'danger' });
      return;
    }

    const allowance = parseInt(formAllowance.replace(/\D/g, ''), 10) || 0;
    const otMult = parseFloat(formOtMultiplier.replace(',', '.')) || 1.5;

    onSave({
      name: trimmedName,
      phone: formPhone.trim(),
      role: formRole,
      branchId: formBranchId,
      wageType: formWageType,
      wageRate: rate,
      allowance,
      overtimeRateMultiplier: otMult,
      pinCode: formPinCode.trim() || undefined,
      username: formRole === 'quan_ly' ? formUsername.trim() || undefined : undefined,
      password: formRole === 'quan_ly' ? formPassword.trim() || undefined : undefined,
    });

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={staff ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên'}
      icon={staff ? 'account-edit-outline' : 'account-plus-outline'}
      primaryAction={{
        label: staff ? 'Lưu' : 'Thêm NV',
        onPress: handleSave,
      }}
      secondaryAction={{
        label: 'Hủy',
        onPress: onClose,
      }}
    >
      {/* Họ tên */}
      <AppFormField
        label="Họ và tên"
        required
        icon="account-outline"
        value={formName}
        onChangeText={setFormName}
        placeholder="VD: Nguyễn Văn A"
        clearable
      />

      {/* Số điện thoại */}
      <AppFormField
        label="Số điện thoại"
        icon="phone-outline"
        value={formPhone}
        onChangeText={setFormPhone}
        placeholder="VD: 0901234567"
        keyboardType="phone-pad"
        clearable
      />

      {/* Phân quyền Đăng nhập: Quản lý (Tài khoản/Mật khẩu) vs Nhân viên (Mã PIN 4 số) */}
      {formRole === 'quan_ly' ? (
        <View style={{ gap: 8, marginTop: 4 }}>
          <AppFormField
            label="Tên đăng nhập Quản Lý"
            icon="account-key-outline"
            value={formUsername}
            onChangeText={setFormUsername}
            placeholder="VD: quanly_hoang, ql_chinhanh1..."
            autoCapitalize="none"
            clearable
          />
          <AppFormField
            label="Mật khẩu đăng nhập Quản Lý"
            icon="lock-outline"
            value={formPassword}
            onChangeText={setFormPassword}
            placeholder="Nhập mật khẩu cho Quản Lý..."
            secureTextEntry
            clearable
          />
          <AppFormField
            label="Mã PIN mở ca nhanh (4 số tùy chọn)"
            icon="shield-key-outline"
            value={formPinCode}
            onChangeText={setFormPinCode}
            placeholder="VD: 8888..."
            keyboardType="numeric"
            maxLength={6}
          />
        </View>
      ) : (
        <AppFormField
          label="Mã PIN vào ca (4 số)"
          icon="shield-key-outline"
          value={formPinCode}
          onChangeText={setFormPinCode}
          placeholder="VD: 1234, 5678, 2468..."
          keyboardType="numeric"
          maxLength={6}
          rightLabel={
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                playTapSound();
                const randomPin = String(Math.floor(1000 + Math.random() * 9000));
                setFormPinCode(randomPin);
              }}
            >
              <AppText variant="xs" color={theme.brand.primary} weight="medium">
                Gợi ý 4 số
              </AppText>
            </TouchableOpacity>
          }
        />
      )}

      {/* Chi nhánh làm việc */}
      {branches.length > 1 && (
        <View style={s.formGroup}>
          <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
            Chi nhánh làm việc
          </AppText>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {branches.map((b) => {
              const isSel = formBranchId === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  activeOpacity={0.75}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  onPress={() => {
                    playTapSound();
                    setFormBranchId(b.id);
                  }}
                  style={[
                    s.roleChipPill,
                    {
                      backgroundColor: isSel ? theme.brand.primary : theme.surface.header,
                      borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={isSel ? 'bold' : 'normal'}
                    color={isSel ? theme.text.onBrand : theme.text.primary}
                  >
                    📍 {b.name}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Vị trí làm việc */}
      <View style={s.formGroup}>
        <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
          Vị trí
        </AppText>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {(['thu_ngan', 'phuc_vu', 'pha_che', 'quan_ly', 'bep', 'tap_vu', 'bao_ve'] as StaffRole[]).map((r) => {
            const isSel = formRole === r;
            const rInfo = ROLE_CONFIG[r];
            return (
              <TouchableOpacity
                key={r}
                activeOpacity={0.75}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                onPress={() => handleSelectRole(r)}
                style={[
                  s.roleChipPill,
                  {
                    backgroundColor: isSel ? theme.brand.primary : theme.surface.header,
                    borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="sm"
                  weight={isSel ? 'medium' : 'normal'}
                  color={isSel ? theme.text.onBrand : theme.text.primary}
                >
                  {rInfo.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Hình thức trả lương */}
      <View style={s.formGroup}>
        <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginBottom: 6 }}>
          Hình thức lương
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { id: 'hourly' as const, label: 'Theo Giờ', sub: 'Part-time', icon: 'clock-outline' },
            { id: 'monthly' as const, label: 'Cố Định', sub: 'Full-time', icon: 'calendar-month-outline' },
            { id: 'per_shift' as const, label: 'Theo Ca', sub: 'Ca 4h/8h', icon: 'clock-fast' },
          ].map((wt) => {
            const isSel = formWageType === wt.id;
            return (
              <TouchableOpacity
                key={wt.id}
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  setFormWageType(wt.id);
                  if (!staff) {
                    if (wt.id === 'hourly') setFormWageRate('25000');
                    if (wt.id === 'monthly') setFormWageRate('7500000');
                    if (wt.id === 'per_shift') setFormWageRate('180000');
                  }
                }}
                style={[
                  s.wageOptionCard,
                  {
                    backgroundColor: isSel ? theme.brand.primaryBg : theme.surface.header,
                    borderColor: isSel ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <Icon name={wt.icon as any} size={18} color={isSel ? theme.brand.primary : theme.text.muted} />
                <AppText variant="sm" weight={isSel ? 'medium' : 'normal'} color={isSel ? theme.brand.primary : theme.text.primary}>
                  {wt.label}
                </AppText>
                <AppText variant="xxs" color={isSel ? theme.brand.primary : theme.text.muted}>
                  {wt.sub}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Mức lương */}
      <AppFormField
        label={
          formWageType === 'hourly'
            ? 'Mức lương mỗi giờ (VND/h)'
            : formWageType === 'per_shift'
            ? 'Mức lương mỗi ca (VND/ca)'
            : 'Lương cơ bản tháng (VND/tháng)'
        }
        icon="cash"
        isCurrency
        value={formWageRate}
        onChangeText={setFormWageRate}
        placeholder={formWageType === 'hourly' ? '25000' : formWageType === 'per_shift' ? '180000' : '8000000'}
        keyboardType="numeric"
      />

      {/* Phụ cấp cố định */}
      <AppFormField
        label="Phụ cấp (VND)"
        icon="gift-outline"
        isCurrency
        value={formAllowance}
        onChangeText={setFormAllowance}
        placeholder="0"
        keyboardType="numeric"
      />

      {/* Hệ số tăng ca OT */}
      <AppFormField
        label="Hệ số OT"
        icon="timer-sand"
        value={formOtMultiplier}
        onChangeText={setFormOtMultiplier}
        placeholder="1.5"
        keyboardType="numeric"
      />

      {/* Delete Button nếu đang sửa */}
      {staff && onDelete && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            onDelete(staff);
          }}
          style={[s.btnDeleteModal, { borderColor: theme.brand.danger }]}
        >
          <Icon name="trash-can-outline" size={16} color={theme.brand.danger} />
          <AppText variant="xs" weight="medium" color={theme.brand.danger}>
            Xóa Nhân Viên
          </AppText>
        </TouchableOpacity>
      )}
    </AppModal>
  );
}

const s = StyleSheet.create({
  formGroup: {
    marginBottom: 12,
  },
  roleChipPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wageOptionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  btnDeleteModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
});
