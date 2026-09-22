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
import { AppText, useAppToast, AppModal } from '../../components/ui';
import { StaffMember, ROLE_CONFIG } from '../../store/useStaffStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';

interface BonusDeductionModalProps {
  visible: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  onSave: (staffId: string, bonus: number, deduction: number, reason?: string) => void;
}

const BONUS_PRESETS = [50000, 100000, 200000, 500000];
const DEDUCTION_PRESETS = [20000, 50000, 100000, 200000];
const REASON_SUGGESTIONS = ['Thưởng chuyên cần', 'Thưởng doanh số vượt chỉ tiêu', 'Thưởng phụ cấp trách nhiệm', 'Phạt đi trễ ca', 'Phạt vỡ dụng cụ / đổ vỡ'];

export function BonusDeductionModal({
  visible,
  onClose,
  staff,
  onSave,
}: BonusDeductionModalProps) {
  const { theme } = useTheme();
  const { showToast } = useAppToast();

  const [bonusStr, setBonusStr] = useState('0');
  const [deductionStr, setDeductionStr] = useState('0');
  const [reasonStr, setReasonStr] = useState('');

  useEffect(() => {
    if (staff && visible) {
      setBonusStr(String(staff.bonus || 0));
      setDeductionStr(String(staff.deduction || 0));
      setReasonStr('');
    }
  }, [staff, visible]);

  if (!staff || !visible) return null;

  const roleInfo = ROLE_CONFIG[staff.role];

  const handleSubmit = () => {
    playTapSound();
    const bonus = parseInt(bonusStr.replace(/\D/g, ''), 10) || 0;
    const deduction = parseInt(deductionStr.replace(/\D/g, ''), 10) || 0;

    onSave(staff.id, bonus, deduction, reasonStr.trim());

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    showToast({
      title: 'Đã Cập Nhật',
      message: `Thưởng +${formatCurrency(bonus)}đ, Phạt -${formatCurrency(deduction)}đ cho ${staff.name}`,
      type: 'success',
    });

    onClose();
  };

  if (!visible || !staff) return null;

  return (
    <AppModal
      visible={visible}
      title="Thưởng & Phạt Kỳ Lương"
      subtitle={`${staff.name} · ${roleInfo.label}`}
      icon="gift-outline"
      iconColor={theme.brand.success}
      iconBg={`${theme.brand.success}15`}
      onClose={onClose}
      presentation="dialog"
      maxWidth={460}
      primaryAction={{
        label: 'Lưu',
        variant: 'primary',
        icon: 'check',
        onPress: handleSubmit,
      }}
      secondaryAction={{
        label: 'Hủy',
        onPress: onClose,
      }}
    >
      <View style={{ gap: 14 }}>
        {/* Tiền thưởng */}
        <View style={s.sectionBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="plus-circle-outline" size={16} color={theme.brand.success} />
            <AppText variant="xs" weight="medium" color={theme.brand.success} style={s.sectionLabel}>
              TIỀN THƯỞNG HIỆU SUẤT / TIP
            </AppText>
          </View>

          <TextInput
            value={bonusStr}
            onChangeText={setBonusStr}
            placeholder="0"
            placeholderTextColor={theme.text.muted}
            keyboardType="numeric"
            style={[
              s.input,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
                color: theme.brand.success,
              },
            ]}
          />

          {/* Dãy Preset Thưởng */}
          <View style={s.presetRow}>
            {BONUS_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  setBonusStr(String(p));
                }}
                style={[
                  s.presetBtn,
                  {
                    backgroundColor: bonusStr === String(p) ? `${theme.brand.success}15` : theme.surface.header,
                    borderColor: bonusStr === String(p) ? theme.brand.success : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  weight={bonusStr === String(p) ? 'bold' : 'normal'}
                  color={bonusStr === String(p) ? theme.brand.success : theme.text.primary}
                  tabularNums
                >
                  +{p >= 1000000 ? `${p / 1000000}Tr` : `${p / 1000}k`}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tiền phạt */}
        <View style={s.sectionBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="minus-circle-outline" size={16} color={theme.brand.danger} />
            <AppText variant="xs" weight="medium" color={theme.brand.danger} style={s.sectionLabel}>
              KHẤU TRỪ PHẠT VI PHẠM
            </AppText>
          </View>

          <TextInput
            value={deductionStr}
            onChangeText={setDeductionStr}
            placeholder="0"
            placeholderTextColor={theme.text.muted}
            keyboardType="numeric"
            style={[
              s.input,
              {
                backgroundColor: theme.surface.header,
                borderColor: theme.border.subtle,
                color: theme.brand.danger,
              },
            ]}
          />

          {/* Dãy Preset Phạt */}
          <View style={s.presetRow}>
            {DEDUCTION_PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  setDeductionStr(String(p));
                }}
                style={[
                  s.presetBtn,
                  {
                    backgroundColor: deductionStr === String(p) ? `${theme.brand.danger}15` : theme.surface.header,
                    borderColor: deductionStr === String(p) ? theme.brand.danger : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  weight={deductionStr === String(p) ? 'bold' : 'normal'}
                  color={deductionStr === String(p) ? theme.brand.danger : theme.text.primary}
                  tabularNums
                >
                  -{p >= 1000000 ? `${p / 1000000}Tr` : `${p / 1000}k`}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lý do */}
        <View style={s.sectionBlock}>
          <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
            LÝ DO THƯỞNG / PHẠT (TÙY CHỌN)
          </AppText>
          <TextInput
            value={reasonStr}
            onChangeText={setReasonStr}
            placeholder="VD: Thưởng chuyên cần, phạt đi muộn..."
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, marginTop: 6 }}
          >
            {REASON_SUGGESTIONS.map((sug) => (
              <TouchableOpacity
                key={sug}
                activeOpacity={0.75}
                onPress={() => {
                  playTapSound();
                  setReasonStr(sug);
                }}
                style={[
                  s.suggestionChip,
                  {
                    backgroundColor: reasonStr === sug ? `${theme.brand.accent}15` : theme.surface.header,
                    borderColor: reasonStr === sug ? theme.brand.accent : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  color={reasonStr === sug ? theme.brand.accent : theme.text.muted}
                >
                  {sug}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  input: {
    height: 42,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  presetBtn: {
    flex: 1,
    height: 34,
    minHeight: 34,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
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
