import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../lib/theme';
import { useResponsive } from '../../../lib/hooks/useResponsive';
import { useAuthStore } from '../../../lib/store/useAuthStore';
import { useStaffStore } from '../../../lib/store/useStaffStore';
import { AppText, Button, AppModal, AppFormField } from '../../../lib/components/ui';
import { playTapSound } from '../../../lib/utils/sound';
import { formatCurrency } from '../../../lib/utils/format';
import { DenomCounterGrid, CASH_DENOMINATIONS } from './DenomCounterGrid';

export interface OpenShiftModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: {
    shiftName: string;
    cashierName: string;
    startingCash: number;
    note?: string;
    denomCounts?: Record<number, number>;
  }) => void;
  defaultStartingCash?: number;
}

export const SHIFT_COMPACT_PRESETS = [
  { id: 'sang', title: 'Ca Sáng', time: '07:00 - 14:30', full: 'Ca Sáng (07:00 - 14:30)' },
  { id: 'chieu', title: 'Ca Chiều', time: '14:30 - 22:00', full: 'Ca Chiều (14:30 - 22:00)' },
  { id: 'toi', title: 'Ca Tối', time: '17:00 - 23:00', full: 'Ca Tối (17:00 - 23:00)' },
];

export const QUICK_STARTING_CASH = [200000, 500000, 1000000, 2000000];

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  visible,
  onClose,
  onConfirm,
  defaultStartingCash = 500000,
}) => {
  const { theme, isDark } = useTheme();
  const { isWide } = useResponsive();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((st) => st.currentUser);
  const staffList = useStaffStore((st) => st.staffList) || [];

  const [selectedShiftId, setSelectedShiftId] = useState('sang');
  const [cashierName, setCashierName] = useState(currentUser?.name || 'Thu Ngân');
  const [startingCashStr, setStartingCashStr] = useState(defaultStartingCash.toString());
  const [note, setNote] = useState('');
  const [showDenomGrid, setShowDenomGrid] = useState(false);
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (visible) {
      setStartingCashStr(defaultStartingCash.toString());
      setCashierName(currentUser?.name || 'Thu Ngân');
      setSelectedShiftId('sang');
      setNote('');
      setShowDenomGrid(false);
      setDenomCounts({});
    }
  }, [visible, defaultStartingCash, currentUser]);

  const startingCash = parseInt(startingCashStr.replace(/\D/g, ''), 10) || 0;
  const currentShift = SHIFT_COMPACT_PRESETS.find((s) => s.id === selectedShiftId) || SHIFT_COMPACT_PRESETS[0];

  // Cập nhật số tờ đếm tiền lẻ đầu ca
  const updateDenomCount = (denom: number, delta: number) => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setDenomCounts((prev) => {
      const cur = prev[denom] || 0;
      const next = Math.max(0, cur + delta);
      const updated = { ...prev, [denom]: next };
      const sum = CASH_DENOMINATIONS.reduce((acc, d) => acc + d * (updated[d] || 0), 0);
      setStartingCashStr(sum.toString());
      return updated;
    });
  };

  const handleConfirm = () => {
    playTapSound();
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    onConfirm({
      shiftName: currentShift.full,
      cashierName,
      startingCash,
      note: note.trim() || undefined,
      denomCounts: Object.keys(denomCounts).length > 0 ? denomCounts : undefined,
    });
    onClose();
  };

  const activeStaff = staffList.filter((s) => s.status === 'active');

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      presentation={isWide ? 'dialog' : 'sheet'}
      maxWidth={isWide ? 580 : undefined}
      title="Mở Ca Bán Hàng"
      subtitle="Bàn giao két & thiết bị đầu ca"
      icon="cash-register"
      primaryAction={{
        label: 'Vào Ca',
        onPress: handleConfirm,
        variant: 'accent',
      }}
    >
            {/* 1. CHỌN CA LÀM VIỆC (3 TAB NGANG 1 DÒNG GỌN GÀNG) */}
            <View>
              <AppText variant="md" weight="bold" color={theme.text.primary} style={s.sectionLabel}>
                Chọn Ca
              </AppText>
              <View style={s.shiftTabsRow}>
                {SHIFT_COMPACT_PRESETS.map((item) => {
                  const isSelected = selectedShiftId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.75}
                      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                      onPress={() => {
                        playTapSound();
                        setSelectedShiftId(item.id);
                      }}
                      style={[
                        s.shiftTabItem,
                        {
                          backgroundColor: isSelected ? theme.brand.primaryBg : theme.surface.header,
                          borderColor: isSelected ? theme.brand.primary : theme.border.subtle,
                        },
                      ]}
                    >
                      <AppText
                        variant="sm"
                        weight={isSelected ? 'bold' : 'medium'}
                        color={isSelected ? theme.brand.primary : theme.text.primary}
                      >
                        {item.title}
                      </AppText>
                      <AppText
                        variant="xxs"
                        tabularNums
                        color={isSelected ? theme.brand.primary : theme.text.muted}
                        style={{ marginTop: 1 }}
                      >
                        {item.time.split(' - ')[0]}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. THU NGÂN TRỰC CA (1 HÀNG CHỌN NHANH) */}
            <View>
              <AppFormField
                label="Thu Ngân"
                icon="account-outline"
                value={cashierName}
                onChangeText={setCashierName}
                placeholder="Tên thu ngân..."
                clearable
              />

              {/* Danh sách nhân viên chọn nhanh 1-chạm */}
              {activeStaff.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.staffScrollRow}
                  style={{ marginTop: 6 }}
                >
                  {activeStaff.map((st) => {
                    const isSelected = cashierName === st.name;
                    return (
                      <TouchableOpacity
                        key={st.id}
                        activeOpacity={0.75}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        onPress={() => {
                          playTapSound();
                          setCashierName(st.name);
                        }}
                        style={[
                          s.staffChip,
                          {
                            backgroundColor: isSelected ? theme.brand.primaryBg : theme.surface.header,
                            borderColor: isSelected ? theme.brand.primary : theme.border.subtle,
                          },
                        ]}
                      >
                        <AppText
                          variant="xs"
                          weight={isSelected ? 'bold' : 'normal'}
                          color={isSelected ? theme.brand.primary : theme.text.muted}
                        >
                          {st.name}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* 3. TIỀN LẺ ĐẦU CA (KÉT BAN ĐẦU) */}
            <View>
              <View style={s.labelWithActionRow}>
                <AppText variant="md" weight="bold" color={theme.text.primary}>
                  Tiền Đầu Ca
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.75}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={() => {
                    playTapSound();
                    setShowDenomGrid((prev) => !prev);
                  }}
                  style={[
                    s.toggleDenomBtn,
                    {
                      backgroundColor: showDenomGrid ? theme.brand.primaryBg : theme.surface.header,
                      borderColor: showDenomGrid ? theme.brand.primary : theme.border.subtle,
                    },
                  ]}
                >
                  <Icon
                    name={showDenomGrid ? 'keyboard-outline' : 'calculator-variant-outline'}
                    size={14}
                    color={showDenomGrid ? theme.brand.primary : theme.text.muted}
                  />
                  <AppText
                    variant="xs"
                    weight="bold"
                    color={showDenomGrid ? theme.brand.primary : theme.text.muted}
                  >
                    {showDenomGrid ? 'Nhập Nhanh' : 'Đếm Tờ (9)'}
                  </AppText>
                </TouchableOpacity>
              </View>

              {!showDenomGrid ? (
                <>
                  <TextInput
                    value={startingCash > 0 ? startingCash.toLocaleString('vi-VN') : ''}
                    onChangeText={(val) => setStartingCashStr(val.replace(/\D/g, ''))}
                    keyboardType="numeric"
                    placeholder="0 đ"
                    placeholderTextColor={theme.text.muted}
                    style={[
                      s.cashInputField,
                      {
                        backgroundColor: theme.surface.header,
                        color: theme.brand.primary,
                        borderColor: theme.border.subtle,
                      },
                    ]}
                  />

                  {/* 4 Mệnh Giá Gợi Ý Nhanh Xếp 1 Hàng */}
                  <View style={s.quickCashGrid}>
                    {QUICK_STARTING_CASH.map((amt) => {
                      const isMatch = startingCash === amt;
                      return (
                        <TouchableOpacity
                          key={amt}
                          activeOpacity={0.75}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          onPress={() => {
                            playTapSound();
                            setStartingCashStr(amt.toString());
                          }}
                          style={[
                            s.quickCashPill,
                            {
                              backgroundColor: isMatch ? theme.brand.primaryBg : theme.surface.header,
                              borderColor: isMatch ? theme.brand.primary : theme.border.subtle,
                            },
                          ]}
                        >
                          <AppText
                            variant="sm"
                            tabularNums
                            weight={isMatch ? 'bold' : 'normal'}
                            color={isMatch ? theme.brand.primary : theme.text.primary}
                          >
                            {(amt / 1000).toLocaleString('vi-VN')}k
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : (
                <View
                  style={[
                    s.denomCardWrap,
                    {
                      backgroundColor: theme.surface.header,
                      borderColor: theme.border.subtle,
                    },
                  ]}
                >
                  <View style={s.denomHeaderSummary}>
                    <AppText variant="xs" color={theme.text.muted}>
                      TỔNG TIỀN ĐẾM ĐƯỢC:
                    </AppText>
                    <AppText variant="md" weight="bold" color={theme.brand.primary} tabularNums>
                      {formatCurrency(startingCash)} đ
                    </AppText>
                  </View>
                  <DenomCounterGrid
                    denomCounts={denomCounts}
                    onUpdate={updateDenomCount}
                    isClosed={false}
                  />
                </View>
              )}
            </View>

            {/* 4. GHI CHÚ BÀN GIAO */}
            <AppFormField
              label="Ghi Chú"
              value={note}
              onChangeText={setNote}
              placeholder="Ghi chú nhận két, thiết bị..."
              icon="note-text-outline"
            />
    </AppModal>
  );
};

const s = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    flexGrow: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 14,
  },
  sectionLabel: {
    marginBottom: 6,
  },
  // 1. Shift Tabs Row (3 Cột Đều Nhau)
  shiftTabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shiftTabItem: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  // 2. Input Fields
  inputField: {
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  cashInputField: {
    height: 52,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 20,
    fontWeight: '600',
  },
  staffScrollRow: {
    gap: 6,
  },
  staffChip: {
    paddingHorizontal: 12,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // 3. Cash Grid
  labelWithActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toggleDenomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickCashGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickCashPill: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  denomCardWrap: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  denomHeaderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  // Submit
  submitActionBtn: {
    marginTop: 4,
    height: 50,
    borderRadius: 14,
  },
});
