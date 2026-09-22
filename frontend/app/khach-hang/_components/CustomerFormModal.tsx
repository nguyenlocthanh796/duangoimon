import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { AppText, AppModal, AppFormField } from '../../../lib/components/ui';
import { CustomerLoyalty } from '../../../lib/store/usePOSStore';
import { formatCurrency } from '../../../lib/utils/format';
import { playTapSound } from '../../../lib/utils/sound';

interface CustomerFormModalProps {
  visible: boolean;
  onClose: () => void;
  editingCustomer: CustomerLoyalty | null;
  onSave: (data: { name: string; phone: string; notes?: string; debtBalance: number }) => void;
}

const DEBT_PRESETS = [0, 50000, 100000, 200000, 500000];

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  visible,
  onClose,
  editingCustomer,
  onSave,
}) => {
  const { theme, isDark } = useTheme();

  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formInitialDebt, setFormInitialDebt] = useState('0');

  useEffect(() => {
    if (visible) {
      if (editingCustomer) {
        setFormName(editingCustomer.name);
        setFormPhone(editingCustomer.phone);
        setFormNotes(editingCustomer.notes || '');
        setFormInitialDebt(editingCustomer.debtBalance ? editingCustomer.debtBalance.toString() : '0');
      } else {
        setFormName('');
        setFormPhone('');
        setFormNotes('');
        setFormInitialDebt('0');
      }
    }
  }, [editingCustomer, visible]);

  const handleSelectDebtPreset = useCallback((val: number) => {
    playTapSound();
    setFormInitialDebt(val.toString());
  }, []);

  const handleSave = useCallback(() => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}
    }
    const cleanDebt = parseInt(formInitialDebt.replace(/[^0-9]/g, ''), 10) || 0;
    onSave({
      name: formName,
      phone: formPhone,
      notes: formNotes,
      debtBalance: cleanDebt,
    });
  }, [formName, formPhone, formNotes, formInitialDebt, onSave]);

  if (!visible) return null;

  const currentDebtNum = parseInt(formInitialDebt.replace(/[^0-9]/g, ''), 10) || 0;

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={editingCustomer ? 'Sửa Hồ Sơ Khách' : 'Thêm Khách Hàng Mới'}
      icon={editingCustomer ? 'account-edit-outline' : 'account-plus-outline'}
      primaryAction={{
        label: editingCustomer ? 'Lưu Hồ Sơ' : 'Thêm Khách',
        onPress: handleSave,
      }}
      secondaryAction={{
        label: 'Hủy',
        onPress: onClose,
      }}
    >
      {/* Họ & Tên */}
      <AppFormField
        label="Họ và Tên"
        required
        icon="account-outline"
        value={formName}
        onChangeText={setFormName}
        placeholder="Ví dụ: Anh Nam, Chị Linh..."
        clearable
      />

      {/* Số Điện Thoại */}
      <AppFormField
        label="Số Điện Thoại"
        required
        icon="phone-outline"
        value={formPhone}
        onChangeText={setFormPhone}
        keyboardType="phone-pad"
        placeholder="0901 234 567"
        clearable
      />

      {/* Nợ Ban Đầu & Presets */}
      <View style={{ gap: 6 }}>
        <AppFormField
          label="Nợ Đầu Kỳ (VND)"
          icon="book-open-outline"
          value={formInitialDebt}
          onChangeText={setFormInitialDebt}
          keyboardType="numeric"
          placeholder="0"
          isCurrency
          rightLabel={currentDebtNum > 0 ? `${formatCurrency(currentDebtNum)} đ` : undefined}
        />

        {/* Preset Chips */}
        <View style={s.presetRow}>
          {DEBT_PRESETS.map((val) => {
            const isSelected = currentDebtNum === val;
            return (
              <TouchableOpacity
                key={val}
                activeOpacity={0.75}
                onPress={() => handleSelectDebtPreset(val)}
                style={[
                  s.presetChip,
                  {
                    backgroundColor: isSelected
                      ? theme.brand.primary
                      : isDark
                      ? theme.surface.header
                      : theme.surface.app,
                    borderColor: isSelected ? theme.brand.primary : theme.border.subtle,
                  },
                ]}
              >
                <AppText
                  variant="xs"
                  weight={isSelected ? 'bold' : 'normal'}
                  color={isSelected ? theme.text.onBrand : theme.text.primary}
                  tabularNums
                >
                  {val === 0 ? 'Không nợ' : formatCurrency(val)}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Ghi Chú / Khẩu Vị */}
      <AppFormField
        label="Ghi Chú Khẩu Vị / Sở Thích"
        icon="note-text-outline"
        value={formNotes}
        onChangeText={setFormNotes}
        placeholder="Khách quen văn phòng, ít đường..."
      />
    </AppModal>
  );
};

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 460,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    marginTop: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
  },
});

