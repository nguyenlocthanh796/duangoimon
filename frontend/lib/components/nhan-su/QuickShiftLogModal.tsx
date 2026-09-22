import React, { useState, useEffect, useMemo } from 'react';
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
  ShiftType,
  SHIFT_CONFIG,
  ROLE_CONFIG,
} from '../../store/useStaffStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';

interface QuickShiftLogModalProps {
  visible: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  initialStaff?: StaffMember | null;
  onLogShift: (staffId: string, data: {
    shiftType: ShiftType;
    hours: number;
    otHours?: number;
    note?: string;
    date?: string;
  }) => void;
}

const SHIFT_OPTIONS: ShiftType[] = ['ca_sang', 'ca_chieu', 'ca_toi', 'ca_full'];
const OT_OPTIONS = [0, 0.5, 1, 1.5, 2];

export function QuickShiftLogModal({
  visible,
  onClose,
  staffList,
  initialStaff,
  onLogShift,
}: QuickShiftLogModalProps) {
  const { theme } = useTheme();
  const { showToast } = useAppToast();

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedShift, setSelectedShift] = useState<ShiftType>('ca_sang');
  const [hours, setHours] = useState(4);
  const [otHours, setOtHours] = useState(0);
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    if (visible) {
      const defaultId = initialStaff?.id || (staffList.length > 0 ? staffList[0].id : '');
      setSelectedStaffId(defaultId);
      setSelectedShift('ca_sang');
      setHours(4);
      setOtHours(0);
      setDateMode('today');
      setCustomDate(todayStr);
      setNoteInput('');
    }
  }, [visible, initialStaff, staffList, todayStr]);

  const currentStaff = useMemo(
    () => staffList.find((s) => s.id === selectedStaffId),
    [staffList, selectedStaffId]
  );

  const selectedDate = useMemo(() => {
    if (dateMode === 'today') return todayStr;
    if (dateMode === 'yesterday') return yesterdayStr;
    return customDate || todayStr;
  }, [dateMode, todayStr, yesterdayStr, customDate]);

  // Tính tiền tạm tính cho ca này theo định mức lương
  const estimatedPay = useMemo(() => {
    if (!currentStaff) return 0;
    const rate = currentStaff.wageRate || 0;
    const otMultiplier = currentStaff.overtimeRateMultiplier || 1.5;

    if (currentStaff.wageType === 'hourly') {
      const regularPay = hours * rate;
      const otPay = otHours * rate * otMultiplier;
      return Math.round(regularPay + otPay);
    }

    if (currentStaff.wageType === 'per_shift') {
      const basePerShift = rate;
      const baseHourly = Math.round(rate / 4);
      const otPay = otHours * baseHourly * otMultiplier;
      return Math.round(basePerShift + otPay);
    }

    if (currentStaff.wageType === 'monthly') {
      const baseHourly = Math.round(rate / 200);
      const otPay = otHours * baseHourly * otMultiplier;
      return Math.round(otPay);
    }

    return 0;
  }, [currentStaff, hours, otHours]);

  const handleSelectShift = (sh: ShiftType) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    setSelectedShift(sh);
    setHours(SHIFT_CONFIG[sh].defaultHours);
  };

  const handleAdjustHours = (delta: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setHours((prev) => Math.max(0.5, Math.min(24, Math.round((prev + delta) * 10) / 10)));
  };

  const handleSelectOt = (val: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setOtHours(val);
  };

  const handleSubmit = () => {
    playTapSound();
    if (!currentStaff) {
      showToast({ title: 'Chưa chọn', message: 'Chưa chọn nhân sự!', type: 'danger' });
      return;
    }

    if (hours <= 0) {
      showToast({ title: 'Lỗi giờ làm', message: 'Số giờ công phải lớn hơn 0!', type: 'danger' });
      return;
    }

    onLogShift(currentStaff.id, {
      shiftType: selectedShift,
      hours,
      otHours,
      note: noteInput.trim() || SHIFT_CONFIG[selectedShift].label,
      date: selectedDate,
    });

    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }

    showToast({
      title: 'Đã Chấm Công',
      message: `Đã ghi nhận ${hours}h${otHours > 0 ? ` (+${otHours}h OT)` : ''} cho ${currentStaff.name}`,
      type: 'success',
    });

    onClose();
  };

  if (!visible) return null;

  const roleInfo = currentStaff ? ROLE_CONFIG[currentStaff.role] : null;

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Chấm Công Nhanh"
      subtitle="1-Chạm ghi nhận công ca làm việc"
      icon={<Icon name="clock-plus-outline" size={18} color={theme.brand.accent} />}
      footer={
        <View style={s.modalFooter}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              onClose();
            }}
            style={[
              s.footerBtn,
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
              s.footerBtn,
              s.footerBtnPrimary,
              {
                backgroundColor: theme.brand.accent,
              },
            ]}
          >
            <Icon name="check" size={18} color={theme.text.onBrand} />
            <AppText variant="md" weight="bold" color={theme.text.onBrand}>
              Lưu Công
            </AppText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={s.scrollBody}>
            {/* 2. Chọn Nhân Sự (1 Dãy Duy Nhất - Triệt tiêu trùng lặp) */}
            <View style={s.sectionBlock}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                  NHÂN SỰ
                </AppText>
                {currentStaff && (
                  <AppText variant="xs" color={theme.brand.accent} tabularNums>
                    {currentStaff.wageType === 'hourly'
                      ? `${formatCurrency(currentStaff.wageRate)} đ/h`
                      : currentStaff.wageType === 'per_shift'
                      ? `${formatCurrency(currentStaff.wageRate)} đ/ca`
                      : 'Lương tháng'}
                  </AppText>
                )}
              </View>

              {staffList.length > 1 && !initialStaff ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
                >
                  {staffList.map((sItem) => {
                    const isSel = sItem.id === selectedStaffId;
                    const rInfo = ROLE_CONFIG[sItem.role];
                    return (
                      <TouchableOpacity
                        key={sItem.id}
                        activeOpacity={0.75}
                        accessible={true}
                        accessibilityRole="button"
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        onPress={() => {
                          playTapSound();
                          setSelectedStaffId(sItem.id);
                        }}
                        style={[
                          s.staffPill,
                          {
                            backgroundColor: isSel ? `${theme.brand.accent}15` : theme.surface.header,
                            borderColor: isSel ? theme.brand.accent : theme.border.subtle,
                          },
                        ]}
                      >
                        <View style={[s.pillAvatar, { backgroundColor: `${rInfo.color}25` }]}>
                          <Icon name="account" size={13} color={rInfo.color} />
                        </View>
                        <AppText
                          variant="sm"
                          weight={isSel ? 'bold' : 'normal'}
                          color={isSel ? theme.brand.accent : theme.text.primary}
                        >
                          {sItem.name}
                        </AppText>
                        <AppText variant="xs" color={isSel ? theme.brand.accent : theme.text.muted}>
                          ({rInfo.label})
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                /* Card khi chỉ có 1 nhân viên hoặc mở từ profile */
                currentStaff && roleInfo && (
                  <View
                    style={[
                      s.singleStaffCard,
                      {
                        backgroundColor: theme.surface.header,
                        borderColor: theme.border.subtle,
                      },
                    ]}
                  >
                    <View style={[s.pillAvatarLarge, { backgroundColor: `${roleInfo.color}20` }]}>
                      <Icon name="account" size={18} color={roleInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText variant="md" weight="bold" color={theme.text.primary}>
                          {currentStaff.name}
                        </AppText>
                        <View style={[s.roleBadge, { backgroundColor: `${roleInfo.color}15` }]}>
                          <AppText variant="xs" color={roleInfo.color}>
                            {roleInfo.label}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </View>
                )
              )}
            </View>

            {/* 3. Chọn Ca Định Mức (Lưới 2 Cột Gọn Gàng) */}
            <View style={s.sectionBlock}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                CA LÀM VIỆC
              </AppText>
              <View style={s.shiftGrid}>
                {SHIFT_OPTIONS.map((sh) => {
                  const isSel = selectedShift === sh;
                  const cfg = SHIFT_CONFIG[sh];
                  return (
                    <TouchableOpacity
                      key={sh}
                      activeOpacity={0.75}
                      onPress={() => handleSelectShift(sh)}
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

            {/* 4. Giờ Làm Chính (Stepper Tinh Gọn 1 Dòng Duy Nhất) */}
            <View style={s.sectionBlock}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                SỐ GIỜ LÀM CHÍNH
              </AppText>

              <View
                style={[
                  s.stepperRow,
                  {
                    backgroundColor: theme.surface.header,
                    borderColor: theme.border.subtle,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAdjustHours(-1)}
                  style={[s.stepBtn, { borderColor: theme.border.subtle }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    -1h
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAdjustHours(-0.5)}
                  style={[s.stepBtn, { borderColor: theme.border.subtle }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    -0.5h
                  </AppText>
                </TouchableOpacity>

                <View style={s.stepDisplay}>
                  <AppText variant="display" weight="bold" color={theme.brand.accent} tabularNums>
                    {hours}
                  </AppText>
                  <AppText variant="xs" color={theme.text.muted} style={{ marginTop: -2 }}>
                    giờ
                  </AppText>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAdjustHours(0.5)}
                  style={[s.stepBtn, { borderColor: theme.border.subtle }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    +0.5h
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAdjustHours(1)}
                  style={[s.stepBtn, { borderColor: theme.border.subtle }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <AppText variant="sm" weight="bold" color={theme.text.primary}>
                    +1h
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            {/* 5. Tăng Ca (OT) - 1 Hàng Ngang Co Giãn Đều */}
            <View style={s.sectionBlock}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                  TĂNG CA (OT)
                </AppText>
                <AppText variant="xs" color={theme.brand.warning} tabularNums>
                  OT x{currentStaff?.overtimeRateMultiplier || 1.5}
                </AppText>
              </View>

              <View style={s.otRow}>
                {OT_OPTIONS.map((ot) => {
                  const isSel = otHours === ot;
                  return (
                    <TouchableOpacity
                      key={ot}
                      activeOpacity={0.75}
                      accessible={true}
                      accessibilityRole="button"
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      onPress={() => handleSelectOt(ot)}
                      style={[
                        s.otChip,
                        {
                          backgroundColor: isSel
                            ? ot > 0
                              ? theme.brand.warning
                              : theme.brand.primary
                            : theme.surface.header,
                          borderColor: isSel
                            ? ot > 0
                              ? theme.brand.warning
                              : theme.brand.primary
                            : theme.border.subtle,
                        },
                      ]}
                    >
                      <AppText
                        variant="sm"
                        weight={isSel ? 'bold' : 'normal'}
                        color={isSel ? theme.text.onBrand : theme.text.primary}
                        tabularNums
                      >
                        {ot === 0 ? '0h' : `+${ot}h`}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 6. Ngày Làm Việc (3 Nút 1 Hàng Ngang) */}
            <View style={s.sectionBlock}>
              <AppText variant="xs" weight="medium" color={theme.text.muted} style={s.sectionLabel}>
                NGÀY LÀM
              </AppText>
              <View style={s.dateRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  accessible={true}
                  accessibilityRole="button"
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  onPress={() => {
                    playTapSound();
                    setDateMode('today');
                  }}
                  style={[
                    s.datePill,
                    {
                      backgroundColor: dateMode === 'today' ? theme.brand.primary : theme.surface.header,
                      borderColor: dateMode === 'today' ? theme.brand.primary : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={dateMode === 'today' ? 'bold' : 'normal'}
                    color={dateMode === 'today' ? theme.text.onBrand : theme.text.primary}
                  >
                    Hôm Nay
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  accessible={true}
                  accessibilityRole="button"
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  onPress={() => {
                    playTapSound();
                    setDateMode('yesterday');
                  }}
                  style={[
                    s.datePill,
                    {
                      backgroundColor: dateMode === 'yesterday' ? theme.brand.primary : theme.surface.header,
                      borderColor: dateMode === 'yesterday' ? theme.brand.primary : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={dateMode === 'yesterday' ? 'bold' : 'normal'}
                    color={dateMode === 'yesterday' ? theme.text.onBrand : theme.text.primary}
                  >
                    Hôm Qua
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  accessible={true}
                  accessibilityRole="button"
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  onPress={() => {
                    playTapSound();
                    setDateMode('custom');
                  }}
                  style={[
                    s.datePill,
                    {
                      backgroundColor: dateMode === 'custom' ? theme.brand.primary : theme.surface.header,
                      borderColor: dateMode === 'custom' ? theme.brand.primary : theme.border.subtle,
                    },
                  ]}
                >
                  <AppText
                    variant="sm"
                    weight={dateMode === 'custom' ? 'bold' : 'normal'}
                    color={dateMode === 'custom' ? theme.text.onBrand : theme.text.primary}
                  >
                    Khác
                  </AppText>
                </TouchableOpacity>
              </View>

              {dateMode === 'custom' && (
                <TextInput
                  value={customDate}
                  onChangeText={setCustomDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.text.muted}
                  style={[
                    s.customDateInput,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.subtle,
                      color: theme.text.primary,
                      marginTop: 6,
                    },
                  ]}
                />
              )}
            </View>

            {/* 7. Live Financial Strip (Tạm Tính Tiền Ca Làm Này) */}
            {currentStaff && (
              <View
                style={[
                  s.liveSummaryStrip,
                  {
                    backgroundColor: `${theme.brand.accent}12`,
                    borderColor: `${theme.brand.accent}30`,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="cash-check" size={20} color={theme.brand.accent} />
                  <View>
                    <AppText variant="xs" color={theme.text.muted}>
                      Tạm tính ca này
                    </AppText>
                    <AppText variant="md" weight="bold" color={theme.brand.accent} tabularNums>
                      +{formatCurrency(estimatedPay)} đ
                    </AppText>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="xs" color={theme.text.muted}>
                    Tổng công
                  </AppText>
                  <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums>
                    {hours + otHours}h {otHours > 0 ? `(${hours}h + ${otHours}h OT)` : ''}
                  </AppText>
                </View>
              </View>
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
  headerIconSquircle: {
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
  staffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 36,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleStaffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillAvatarLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  shiftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  shiftCard: {
    width: '49%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 38,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepBtn: {
    width: 48,
    height: 38,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  otRow: {
    flexDirection: 'row',
    gap: 6,
  },
  otChip: {
    flex: 1,
    height: 36,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 6,
  },
  datePill: {
    flex: 1,
    height: 36,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customDateInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  liveSummaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    height: 48,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnPrimary: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
