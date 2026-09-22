import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, AppModal, useAppToast } from '../../components/ui';
import {
  StaffMember,
  ROLE_CONFIG,
  calculateStaffSalary,
  PayrollRecord,
} from '../../store/useStaffStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';

interface PaySalaryModalProps {
  visible: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  onConfirmPay: (staffId: string, paymentMethod: 'tien_mat' | 'chuyen_khoan', note?: string) => PayrollRecord | null;
  onViewPayslip?: (record: PayrollRecord) => void;
}

export function PaySalaryModal({
  visible,
  onClose,
  staff,
  onConfirmPay,
  onViewPayslip,
}: PaySalaryModalProps) {
  const { theme } = useTheme();
  const { showToast } = useAppToast();

  const [paymentMethod, setPaymentMethod] = useState<'tien_mat' | 'chuyen_khoan'>('tien_mat');
  const [noteStr, setNoteStr] = useState('');

  if (!staff || !visible) return null;

  const roleInfo = ROLE_CONFIG[staff.role];
  const calc = calculateStaffSalary(staff);

  const handleSubmit = () => {
    playTapSound();
    if (calc.netSalary <= 0) {
      showToast({ title: 'Không có lương', message: `${staff.name} chưa có công hoặc đã ứng hết`, type: 'warning' });
      return;
    }

    const record = onConfirmPay(staff.id, paymentMethod, noteStr);

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    showToast({
      title: 'Đã Chi Lương',
      message: paymentMethod === 'tien_mat'
        ? `Đã chi ${formatCurrency(calc.netSalary)} đ cho ${staff.name} (Tự động ghi Sổ Quỹ)`
        : `Đã chi lương ${formatCurrency(calc.netSalary)} đ cho ${staff.name}`,
      type: 'success',
    });

    onClose();

    if (record && onViewPayslip) {
      onViewPayslip(record);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Chi Lương Kỳ Này"
      subtitle={`${staff.name} · ${roleInfo.label}`}
      icon={<Icon name="cash-check" size={20} color={theme.brand.accent} />}
      footer={
        <View style={s.modalFooter}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              onClose();
            }}
            style={[
              s.modalBtn,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <AppText variant="md" weight="medium" color={theme.text.primary}>
              Hủy
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleSubmit}
            style={[
              s.modalBtn,
              s.modalBtnPrimary,
              {
                backgroundColor: theme.brand.accent,
              },
            ]}
          >
            <Icon name="check" size={18} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand}>
              Chi Lương
            </AppText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={s.scrollBody}>
            {/* Hero Thực Lĩnh */}
            <View
              style={[
                s.heroNetCard,
                {
                  backgroundColor: `${theme.brand.success}10`,
                  borderColor: `${theme.brand.success}30`,
                },
              ]}
            >
              <AppText
                variant="xs"
                weight="medium"
                color={theme.text.muted}
                style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}
              >
                THỰC LĨNH CHI TRẢ
              </AppText>
              <AppText
                variant="display"
                weight="bold"
                color={calc.netSalary > 0 ? theme.brand.success : theme.text.muted}
                tabularNums
                style={{ marginVertical: 4 }}
              >
                {formatCurrency(calc.netSalary)} đ
              </AppText>
              <AppText variant="xs" color={theme.text.muted} tabularNums>
                {staff.wageType === 'hourly'
                  ? `${staff.currentMonthHours}h làm việc · Mức lương: ${formatCurrency(staff.wageRate)} đ/h`
                  : staff.wageType === 'per_shift'
                  ? `${staff.currentMonthShifts} ca làm việc · Mức lương: ${formatCurrency(staff.wageRate)} đ/ca`
                  : `Lương cứng: ${formatCurrency(staff.wageRate)} đ/tháng`}
              </AppText>
            </View>

            {/* Bảng bóc tách chi tiết */}
            <View style={s.sectionBlock}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                BÓC TÁCH THU NHẬP
              </AppText>

              <View style={[s.breakdownBox, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
                <View style={s.row}>
                  <AppText variant="sm" color={theme.text.muted}>
                    Lương cơ bản
                  </AppText>
                  <AppText variant="sm" weight="medium" color={theme.text.primary} tabularNums>
                    {formatCurrency(calc.baseSalary)} đ
                  </AppText>
                </View>

                {calc.otSalary > 0 && (
                  <View style={s.row}>
                    <AppText variant="sm" color={theme.text.muted}>
                      Tăng ca OT ({staff.currentMonthOtHours}h)
                    </AppText>
                    <AppText variant="sm" weight="medium" color={theme.brand.accent} tabularNums>
                      +{formatCurrency(calc.otSalary)} đ
                    </AppText>
                  </View>
                )}

                {calc.allowance > 0 && (
                  <View style={s.row}>
                    <AppText variant="sm" color={theme.text.muted}>
                      Phụ cấp ăn ca / xăng
                    </AppText>
                    <AppText variant="sm" weight="medium" color={theme.brand.success} tabularNums>
                      +{formatCurrency(calc.allowance)} đ
                    </AppText>
                  </View>
                )}

                {calc.bonus > 0 && (
                  <View style={s.row}>
                    <AppText variant="sm" color={theme.text.muted}>
                      Thưởng hiệu suất
                    </AppText>
                    <AppText variant="sm" weight="medium" color={theme.brand.success} tabularNums>
                      +{formatCurrency(calc.bonus)} đ
                    </AppText>
                  </View>
                )}

                {calc.deduction > 0 && (
                  <View style={s.row}>
                    <AppText variant="sm" color={theme.text.muted}>
                      Khấu trừ phạt
                    </AppText>
                    <AppText variant="sm" weight="medium" color={theme.brand.danger} tabularNums>
                      -{formatCurrency(calc.deduction)} đ
                    </AppText>
                  </View>
                )}

                {calc.advancePaid > 0 && (
                  <View style={s.row}>
                    <AppText variant="sm" color={theme.text.muted}>
                      Đã tạm ứng trước
                    </AppText>
                    <AppText variant="sm" weight="medium" color={theme.brand.warning} tabularNums>
                      -{formatCurrency(calc.advancePaid)} đ
                    </AppText>
                  </View>
                )}
              </View>
            </View>

            {/* Nguồn tiền xuất chi */}
            <View style={s.sectionBlock}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                HÌNH THỨC CHI TRẢ
              </AppText>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    playTapSound();
                    setPaymentMethod('tien_mat');
                  }}
                  style={[
                    s.methodCard,
                    {
                      backgroundColor: paymentMethod === 'tien_mat' ? `${theme.brand.accent}15` : theme.surface.header,
                      borderColor: paymentMethod === 'tien_mat' ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <Icon
                    name="cash"
                    size={20}
                    color={paymentMethod === 'tien_mat' ? theme.brand.accent : theme.text.muted}
                  />
                  <View>
                    <AppText
                      variant="sm"
                      weight={paymentMethod === 'tien_mat' ? 'bold' : 'normal'}
                      color={paymentMethod === 'tien_mat' ? theme.brand.accent : theme.text.primary}
                    >
                      Tiền Mặt
                    </AppText>
                    <AppText variant="xxs" color={theme.text.muted}>
                      Trừ két tiền & ghi Sổ Quỹ
                    </AppText>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    playTapSound();
                    setPaymentMethod('chuyen_khoan');
                  }}
                  style={[
                    s.methodCard,
                    {
                      backgroundColor: paymentMethod === 'chuyen_khoan' ? `${theme.brand.accent}15` : theme.surface.header,
                      borderColor: paymentMethod === 'chuyen_khoan' ? theme.brand.accent : theme.border.subtle,
                    },
                  ]}
                >
                  <Icon
                    name="bank-transfer"
                    size={20}
                    color={paymentMethod === 'chuyen_khoan' ? theme.brand.accent : theme.text.muted}
                  />
                  <View>
                    <AppText
                      variant="sm"
                      weight={paymentMethod === 'chuyen_khoan' ? 'bold' : 'normal'}
                      color={paymentMethod === 'chuyen_khoan' ? theme.brand.accent : theme.text.primary}
                    >
                      Chuyển Khoản
                    </AppText>
                    <AppText variant="xxs" color={theme.text.muted}>
                      Tài khoản ngân hàng
                    </AppText>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ghi chú */}
            <View style={s.sectionBlock}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                GHI CHÚ (TÙY CHỌN)
              </AppText>
              <TextInput
                value={noteStr}
                onChangeText={setNoteStr}
                placeholder="VD: Đã chi đủ lương kỳ 1..."
                placeholderTextColor={theme.text.muted}
                style={[
                  s.input,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.subtle,
                    color: theme.text.primary,
                  },
                ]}
              />
            </View>
          </View>
      </AppModal>
    );
}

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 14,
    gap: 12,
  },
  sectionBlock: {
    gap: 4,
  },
  sectionLabel: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroNetCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  breakdownBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    height: 42,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  modalBtnPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
