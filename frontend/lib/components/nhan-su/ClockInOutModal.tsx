import React, { useState, useEffect } from 'react';
import {
  View,
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
  ShiftType,
  SHIFT_CONFIG,
  ROLE_CONFIG,
} from '../../store/useStaffStore';
import { playTapSound } from '../../utils/sound';

interface ClockInOutModalProps {
  visible: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  mode: 'in' | 'out';
  onClockIn: (staffId: string, shiftType: ShiftType, startTime: string) => void;
  onClockOut: (staffId: string, endTime: string, note?: string) => void;
}

export function ClockInOutModal({
  visible,
  onClose,
  staff,
  mode,
  onClockIn,
  onClockOut,
}: ClockInOutModalProps) {
  const { theme } = useTheme();
  const { showToast } = useAppToast();

  const [selectedShift, setSelectedShift] = useState<ShiftType>('ca_sang');
  const [timeInput, setTimeInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    if (visible) {
      const now = new Date();
      const currentHours = now.getHours();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setTimeInput(timeStr);

      if (mode === 'in') {
        if (currentHours < 12) {
          setSelectedShift('ca_sang');
        } else if (currentHours < 17) {
          setSelectedShift('ca_chieu');
        } else {
          setSelectedShift('ca_toi');
        }
        setNoteInput('');
      } else {
        setNoteInput('Hoàn thành ca làm việc');
      }
    }
  }, [visible, mode]);

  if (!staff || !visible) return null;

  const roleInfo = ROLE_CONFIG[staff.role];

  const handleSubmit = () => {
    playTapSound();
    const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const finalTime = timeInput.trim() || nowTime;

    if (mode === 'in') {
      onClockIn(staff.id, selectedShift, finalTime);
      showToast({
        title: 'Đã Vào Ca',
        message: `${staff.name} đã bắt đầu ${SHIFT_CONFIG[selectedShift].label} lúc ${finalTime}`,
        type: 'success',
      });
    } else {
      onClockOut(staff.id, finalTime, noteInput.trim());
      showToast({
        title: 'Đã Ra Ca',
        message: `${staff.name} đã kết thúc ca làm lúc ${finalTime}`,
        type: 'success',
      });
    }

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
      title={mode === 'in' ? 'Bắt Đầu Vào Ca' : 'Kết Thúc & Ra Ca'}
      subtitle={`${staff.name} · ${roleInfo.label}`}
      icon={
        <Icon
          name={mode === 'in' ? 'clock-in' : 'clock-out'}
          size={20}
          color={mode === 'in' ? theme.brand.success : theme.brand.accent}
        />
      }
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
                backgroundColor: mode === 'in' ? theme.brand.primary : theme.brand.accent,
              },
            ]}
          >
            <Icon
              name={mode === 'in' ? 'clock-in' : 'clock-out'}
              size={18}
              color={theme.text.onBrand}
            />
            <AppText variant="md" weight="bold" color={theme.text.onBrand}>
              {mode === 'in' ? 'Vào Ca' : 'Ra Ca'}
            </AppText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={{ gap: 14, padding: 16 }}>
        {mode === 'in' ? (
          <>
            {/* Chọn ca làm */}
            <View>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                CHỌN CA LÀM VIỆC
              </AppText>
              <View style={s.shiftGrid}>
                {(Object.keys(SHIFT_CONFIG) as ShiftType[]).map((sh) => {
                  const isSel = selectedShift === sh;
                  const cfg = SHIFT_CONFIG[sh];
                  return (
                    <TouchableOpacity
                      key={sh}
                      activeOpacity={0.75}
                      accessible={true}
                      accessibilityRole="button"
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      onPress={() => {
                        playTapSound();
                        setSelectedShift(sh);
                      }}
                      style={[
                        s.shiftCard,
                        {
                          backgroundColor: isSel ? `${theme.brand.accent}15` : theme.surface.header,
                          borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                        },
                      ]}
                    >
                      <Icon
                        name={cfg.icon as any}
                        size={16}
                        color={isSel ? theme.brand.accent : theme.text.muted}
                      />
                      <AppText
                        variant="sm"
                        weight={isSel ? 'bold' : 'normal'}
                        color={isSel ? theme.brand.accent : theme.text.primary}
                      >
                        {cfg.label}
                      </AppText>
                      <AppText
                        variant="xs"
                        color={isSel ? theme.brand.accent : theme.text.muted}
                        tabularNums
                      >
                        ({cfg.defaultHours}h)
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Giờ bắt đầu */}
            <View>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                GIỜ BẮT ĐẦU VÀO CA (HH:MM)
              </AppText>
              <TextInput
                value={timeInput}
                onChangeText={setTimeInput}
                placeholder="08:00"
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
          </>
        ) : (
          <>
            {/* Thông tin ca đang trực */}
            <View
              style={[
                s.infoBox,
                {
                  backgroundColor: theme.surface.header,
                  borderColor: theme.border.subtle,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <AppText variant="sm" color={theme.text.muted}>
                  Ca làm việc:
                </AppText>
                <AppText variant="md" weight="medium" color={theme.text.primary}>
                  {staff.activeShiftType ? SHIFT_CONFIG[staff.activeShiftType]?.label : 'Ca Sáng'}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="sm" color={theme.text.muted}>
                  Giờ bắt đầu vào:
                </AppText>
                <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
                  {staff.activeShiftStartTime || '08:00'}
                </AppText>
              </View>
            </View>

            {/* Giờ kết thúc */}
            <View>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                GIỜ KẾT THÚC RA CA (HH:MM)
              </AppText>
              <TextInput
                value={timeInput}
                onChangeText={setTimeInput}
                placeholder="12:00"
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

            {/* Ghi chú ra ca */}
            <View>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                GHI CHÚ BÀN GIAO CA (TÙY CHỌN)
              </AppText>
              <TextInput
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder="Bàn giao ca cho đồng nghiệp..."
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
          </>
        )}
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
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  shiftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shiftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 42,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
