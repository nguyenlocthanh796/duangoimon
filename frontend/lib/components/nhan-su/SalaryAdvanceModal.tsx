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
import { StaffMember, ROLE_CONFIG } from '../../store/useStaffStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';

interface SalaryAdvanceModalProps {
  visible: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  onAdvance: (staffId: string, amount: number, paymentMethod: 'tien_mat' | 'chuyen_khoan', note?: string) => void;
}

const PRESET_AMOUNTS = [200000, 500000, 1000000, 2000000, 5000000];

export function SalaryAdvanceModal({
  visible,
  onClose,
  staff,
  onAdvance,
}: SalaryAdvanceModalProps) {
  const { theme } = useTheme();
  const { showToast } = useAppToast();

  const [amountStr, setAmountStr] = useState('500000');
  const [paymentMethod, setPaymentMethod] = useState<'tien_mat' | 'chuyen_khoan'>('tien_mat');
  const [noteStr, setNoteStr] = useState('Ứng lương giữa tháng');

  if (!staff || !visible) return null;

  const roleInfo = ROLE_CONFIG[staff.role];

  const handleSubmit = () => {
    playTapSound();
    const amount = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;
    if (amount <= 0) {
      showToast({ title: 'Số tiền lỗi', message: 'Số tiền ứng phải lớn hơn 0!', type: 'danger' });
      return;
    }

    onAdvance(staff.id, amount, paymentMethod, noteStr.trim());

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    showToast({
      title: 'Đã Cho Tạm Ứng',
      message: paymentMethod === 'tien_mat'
        ? `Đã chi ${formatCurrency(amount)} đ cho ${staff.name} (Tự động ghi Sổ Quỹ)`
        : `Đã ghi nhận ứng ${formatCurrency(amount)} đ cho ${staff.name}`,
      type: 'success',
    });

    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Tạm Ứng Lương"
      subtitle={`${staff.name} · ${roleInfo.label} (Đã ứng: ${formatCurrency(staff.advancePaid)} đ)`}
      icon={<Icon name="cash-fast" size={20} color={theme.brand.warning} />}
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
                backgroundColor: theme.brand.warning,
              },
            ]}
          >
            <Icon name="cash-fast" size={18} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand}>
              Chi Ứng
            </AppText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={s.scrollBody}>
        {/* Presets chọn nhanh */}
        <View style={s.sectionBlock}>
          <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
            CHỌN NHANH SỐ TIỀN ỨNG
          </AppText>
          <View style={s.presetRow}>
            {PRESET_AMOUNTS.map((p) => {
              const isSel = amountStr === String(p);
              return (
                <TouchableOpacity
                  key={p}
                  activeOpacity={0.75}
                  onPress={() => {
                    playTapSound();
                    setAmountStr(String(p));
                  }}
                  style={[
                    s.presetBtn,
                    {
                      backgroundColor: isSel ? `${theme.brand.warning}15` : theme.surface.header,
                      borderColor: isSel ? theme.brand.warning : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={isSel ? 'bold' : 'normal'}
                    color={isSel ? theme.brand.warning : theme.text.primary}
                    tabularNums
                  >
                    {p >= 1000000 ? `${p / 1000000}Tr` : `${p / 1000}k`}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Input số tiền */}
        <View style={s.sectionBlock}>
          <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
            SỐ TIỀN TẠM ỨNG (VND)
          </AppText>
          <TextInput
            value={amountStr}
            onChangeText={setAmountStr}
            placeholder="500000"
            placeholderTextColor={theme.text.muted}
            keyboardType="numeric"
            style={[
              s.input,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
                color: theme.brand.warning,
              },
            ]}
          />
        </View>

        {/* Nguồn tiền */}
        <View style={s.sectionBlock}>
          <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
            HÌNH THỨC CHI TIỀN
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
                  Chi từ két & ghi Sổ Quỹ
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
            LÝ DO TẠM ỨNG (TÙY CHỌN)
          </AppText>
          <TextInput
            value={noteStr}
            onChangeText={setNoteStr}
            placeholder="Ứng tiền trọ, việc gia đình..."
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
    maxWidth: 460,
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
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetBtn: {
    flex: 1,
    height: 38,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
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
