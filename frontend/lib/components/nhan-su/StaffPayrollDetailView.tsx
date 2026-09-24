import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, AppHeader } from '../../components/ui';
import {
  StaffMember,
  StaffShiftLog,
  ROLE_CONFIG,
  SHIFT_CONFIG,
  calculateStaffSalary,
} from '../../store/useStaffStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';

interface StaffPayrollDetailViewProps {
  staff: StaffMember;
  shiftLogs?: StaffShiftLog[];
  isWide?: boolean;
  isInline?: boolean;
  onBack: () => void;
  onOpenAdvance: (staff: StaffMember) => void;
  onOpenBonusDeduction: (staff: StaffMember) => void;
  onOpenPaySalary: (staff: StaffMember) => void;
  onViewQuickPayslip: (staff: StaffMember) => void;
}

export function StaffPayrollDetailView({
  staff,
  shiftLogs = [],
  isWide,
  isInline,
  onBack,
  onOpenAdvance,
  onOpenBonusDeduction,
  onOpenPaySalary,
  onViewQuickPayslip,
}: StaffPayrollDetailViewProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const roleInfo = ROLE_CONFIG[staff.role];
  const calc = calculateStaffSalary(staff);
  const staffShiftLogs = shiftLogs.filter((l) => l.staffId === staff.id);
  const regularHours = Math.max(0, staff.currentMonthHours - staff.currentMonthOtHours);

  // Bắt phím Back vật lý Android để quay lại liền mạch
  useEffect(() => {
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => sub.remove();
    }
  }, [onBack]);

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {/* 1. Header liền mạch tuyệt đối với StatusBar, tự động tính insets.top */}
      <AppHeader
        title="Chi Tiết Lương"
        subtitle={`${staff.name} · ${roleInfo.label}`}
        showBack={!isInline}
        onBack={onBack}
        showHamburger={false}
        rightCustom={
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              onViewQuickPayslip(staff);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: theme.surface.header,
              borderColor: theme.border.subtle,
              borderWidth: StyleSheet.hairlineWidth,
            }}
          >
            <Icon name="receipt" size={15} color={theme.brand.primary} />
            <AppText variant="sm" weight="medium" color={theme.brand.primary}>
              Xem Phiếu
            </AppText>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.scrollContent,
          isWide && { maxWidth: 680, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Flat Hero Banner: THỰC LĨNH DỰ KIẾN (Tràn viền, triệt tiêu đóng khung hộp) */}
        <View
          style={[
            s.heroBanner,
            {
              backgroundColor: theme.surface.card,
              borderBottomColor: theme.border.subtle,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <AppText
            variant="xs"
            weight="medium"
            color={theme.text.muted}
            style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}
          >
            Thực Lĩnh Dự Kiến
          </AppText>
          <AppText
            variant="display"
            weight="bold"
            color={calc.netSalary > 0 ? theme.brand.success : theme.text.muted}
            tabularNums
            style={{ marginTop: 6 }}
          >
            {formatCurrency(calc.netSalary)} đ
          </AppText>
          <View style={s.heroSubRow}>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              {staff.wageType === 'hourly'
                ? `Lương: ${formatCurrency(staff.wageRate)}đ/h · Đã làm ${staff.currentMonthHours}h`
                : staff.wageType === 'per_shift'
                ? `Lương: ${formatCurrency(staff.wageRate)}đ/ca · Đã làm ${staff.currentMonthShifts} ca`
                : `Lương cứng: ${formatCurrency(staff.wageRate)}đ/tháng`}
            </AppText>
          </View>
        </View>

        {/* 3. Phân Đoạn Dữ Liệu: BÓC TÁCH THU NHẬP (Flat List Group) */}
        <View style={s.sectionHeader}>
          <AppText variant="xs" weight="medium" color={theme.text.muted} style={{ letterSpacing: 0.5 }}>
            BÓC TÁCH THU NHẬP
          </AppText>
        </View>

        <View
          style={[
            s.flatGroup,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              borderBottomColor: theme.border.subtle,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          {/* Lương cơ bản */}
          <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="md" color={theme.text.muted}>
              Lương cơ bản
            </AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
              {formatCurrency(calc.baseSalary)} đ
            </AppText>
          </View>

          {/* Công / Ca */}
          <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="md" color={theme.text.muted}>
              Thời gian làm việc
            </AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
              {staff.wageType === 'hourly'
                ? `${staff.currentMonthHours} giờ (${staff.currentMonthOtHours}h tăng ca)`
                : staff.wageType === 'per_shift'
                ? `${staff.currentMonthShifts} ca`
                : 'Cả tháng'}
            </AppText>
          </View>

          {/* Tăng ca OT */}
          {calc.otSalary > 0 && (
            <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
              <View>
                <AppText variant="md" color={theme.text.muted}>
                  Tăng ca OT (x{staff.overtimeRateMultiplier || 1.5})
                </AppText>
                <AppText variant="xs" color={theme.text.muted} tabularNums>
                  {staff.currentMonthOtHours} giờ tăng ca
                </AppText>
              </View>
              <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                +{formatCurrency(calc.otSalary)} đ
              </AppText>
            </View>
          )}

          {/* Phụ cấp */}
          {calc.allowance > 0 && (
            <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
              <AppText variant="md" color={theme.text.muted}>
                Phụ cấp
              </AppText>
              <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                +{formatCurrency(calc.allowance)} đ
              </AppText>
            </View>
          )}

          {/* Thưởng */}
          {calc.bonus > 0 && (
            <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
              <AppText variant="md" color={theme.text.muted}>
                Thưởng hiệu suất
              </AppText>
              <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                +{formatCurrency(calc.bonus)} đ
              </AppText>
            </View>
          )}

          {/* Khấu trừ phạt */}
          {calc.deduction > 0 && (
            <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
              <AppText variant="md" color={theme.text.muted}>
                Khấu trừ vi phạm
              </AppText>
              <AppText variant="md" weight="medium" color={theme.brand.danger} tabularNums>
                -{formatCurrency(calc.deduction)} đ
              </AppText>
            </View>
          )}

          {/* Đã tạm ứng */}
          {calc.advancePaid > 0 && (
            <View style={[s.flatRow, { borderBottomWidth: 0 }]}>
              <AppText variant="md" color={theme.text.muted}>
                Đã tạm ứng trong kỳ
              </AppText>
              <AppText variant="md" weight="medium" color={theme.brand.warning} tabularNums>
                -{formatCurrency(calc.advancePaid)} đ
              </AppText>
            </View>
          )}
        </View>

        {/* 3. Chi tiết chấm công & ca làm việc trong kỳ */}
        <View style={s.sectionHeader}>
          <AppText
            variant="xs"
            weight="medium"
            color={theme.text.muted}
            style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
          >
            Chi tiết chấm công & ca làm ({staffShiftLogs.length} ca)
          </AppText>
        </View>

        <View
          style={[
            s.flatGroup,
            {
              backgroundColor: theme.surface.card,
              borderTopColor: theme.border.subtle,
              borderBottomColor: theme.border.subtle,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          {/* Thống kê 4 chỉ số công */}
          <View style={[s.kpiRow, { borderBottomColor: theme.border.subtle }]}>
            <View style={s.kpiCol}>
              <AppText variant="xs" color={theme.text.muted}>Tổng công</AppText>
              <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                {staff.currentMonthHours}h
              </AppText>
            </View>
            <View style={[s.kpiDivider, { backgroundColor: theme.border.subtle }]} />
            <View style={s.kpiCol}>
              <AppText variant="xs" color={theme.text.muted}>Giờ chuẩn</AppText>
              <AppText variant="sm" weight="medium" color={theme.text.primary} tabularNums>
                {regularHours}h
              </AppText>
            </View>
            <View style={[s.kpiDivider, { backgroundColor: theme.border.subtle }]} />
            <View style={s.kpiCol}>
              <AppText variant="xs" color={theme.text.muted}>Tăng ca OT</AppText>
              <AppText variant="sm" weight="medium" color={staff.currentMonthOtHours > 0 ? theme.brand.success : theme.text.muted} tabularNums>
                {staff.currentMonthOtHours}h
              </AppText>
            </View>
            <View style={[s.kpiDivider, { backgroundColor: theme.border.subtle }]} />
            <View style={s.kpiCol}>
              <AppText variant="xs" color={theme.text.muted}>Tổng ca</AppText>
              <AppText variant="sm" weight="medium" color={theme.text.primary} tabularNums>
                {staff.currentMonthShifts} ca
              </AppText>
            </View>
          </View>

          {/* Danh sách từng ca làm */}
          {staffShiftLogs.length === 0 ? (
            <View style={[s.flatRow, { justifyContent: 'center', paddingVertical: 18 }]}>
              <AppText variant="xs" color={theme.text.muted}>
                Chưa có bản ghi chấm công chi tiết trong kỳ
              </AppText>
            </View>
          ) : (
            staffShiftLogs.map((log, index) => {
              const shiftCfg = SHIFT_CONFIG[log.shiftType] || {
                label: log.shiftType,
                icon: 'clock-outline',
              };
              const isLast = index === staffShiftLogs.length - 1;
              return (
                <View
                  key={log.id}
                  style={[
                    s.flatRow,
                    {
                      borderBottomColor: theme.border.subtle,
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[s.shiftIconBox, { backgroundColor: `${theme.brand.primary}15` }]}>
                      <Icon name={shiftCfg.icon as any} size={18} color={theme.brand.primary} />
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <AppText variant="sm" weight="medium" color={theme.text.primary}>
                          {shiftCfg.label}
                        </AppText>
                        <AppText variant="xs" color={theme.text.muted} tabularNums>
                          {log.date}
                        </AppText>
                      </View>
                      <AppText variant="xs" color={theme.text.muted} tabularNums>
                        {log.startTime && log.endTime ? `${log.startTime} - ${log.endTime}` : 'Ca ghi nhận'}
                        {log.note ? ` · ${log.note}` : ''}
                      </AppText>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText variant="sm" weight="bold" color={theme.text.primary} tabularNums>
                      {log.hours}h
                    </AppText>
                    {log.otHours && log.otHours > 0 ? (
                      <AppText variant="xs" color={theme.brand.success} tabularNums>
                        +{log.otHours}h OT
                      </AppText>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Đệm đáy trống tránh che bởi thanh nút docked */}
        <View style={{ height: 72 }} />
      </ScrollView>

      {/* 4. Docked Action Bar: 1 Hàng Ngang Chuẩn POS */}
      <View
        style={[
          s.dockedActionBar,
          {
            backgroundColor: theme.surface.card,
            borderTopColor: theme.border.subtle,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingBottom: (insets.bottom > 0 ? Math.max(4, Math.round(insets.bottom * 0.25)) : 4) + 4,
          },
        ]}
      >
        <View style={[s.actionRow, isWide && { maxWidth: 680, alignSelf: 'center', width: '100%' }]}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              onOpenAdvance(staff);
            }}
            style={[
              s.actionBtn,
              { backgroundColor: theme.surface.header, borderColor: theme.border.subtle, flex: 1 },
            ]}
          >
            <Icon name="cash-minus" size={18} color={theme.brand.warning} />
            <AppText variant="sm" weight="medium" color={theme.brand.warning} numberOfLines={1}>
              Ứng Lương
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              onOpenBonusDeduction(staff);
            }}
            style={[
              s.actionBtn,
              { backgroundColor: theme.surface.header, borderColor: theme.border.subtle, flex: 1 },
            ]}
          >
            <Icon name="scale-balance" size={18} color={theme.text.primary} />
            <AppText variant="sm" weight="medium" color={theme.text.primary} numberOfLines={1}>
              Thưởng/Phạt
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
              }
              onOpenPaySalary(staff);
            }}
            style={[
              s.actionBtn,
              { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent, flex: 1.25 },
            ]}
          >
            <Icon name="check-circle-outline" size={18} color={theme.text.onBrand} />
            <AppText variant="sm" weight="bold" color={theme.text.onBrand} numberOfLines={1}>
              Chi Lương
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  heroSubRow: {
    marginTop: 6,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  flatGroup: {
    width: '100%',
  },
  flatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  kpiDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
  },
  shiftIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockedActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
});
