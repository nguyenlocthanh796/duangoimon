import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  BackHandler,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export interface StaffDetailViewProps {
  staff: StaffMember;
  shiftLogs?: StaffShiftLog[];
  isWide?: boolean;
  onBack: () => void;
  onEdit: (staff: StaffMember) => void;
  onLogShift: (staff: StaffMember) => void;
  onAdvance: (staff: StaffMember) => void;
  onPaySalary: (staff: StaffMember) => void;
}

export function StaffDetailView({
  staff,
  shiftLogs = [],
  isWide,
  onBack,
  onEdit,
  onLogShift,
  onAdvance,
  onPaySalary,
}: StaffDetailViewProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const roleInfo = ROLE_CONFIG[staff.role] || {
    label: 'Nhân Viên',
    color: theme.brand.primary,
  };
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
      {/* 1. Header chuẩn, hòa màu 100% StatusBar */}
      <AppHeader
        showBack
        onBack={() => {
          playTapSound();
          onBack();
        }}
        title="Hồ Sơ Nhân Sự"
        subtitle={`${staff.name} · ${roleInfo.label}`}
        rightCustom={
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              onEdit(staff);
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
            <Icon name="pencil" size={15} color={theme.text.primary} />
            <AppText variant="sm" weight="medium" color={theme.text.primary}>
              Sửa
            </AppText>
          </TouchableOpacity>
        }
      />

      {/* 2. Cuộn nội dung De-boxed phẳng */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          isWide && { maxWidth: 680, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card thông tin nhân viên */}
        <View
          style={[
            s.heroSection,
            {
              backgroundColor: theme.surface.card,
              borderBottomColor: theme.border.subtle,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <View style={[s.avatarCircle, { backgroundColor: `${roleInfo.color}18` }]}>
            <Icon name="account" size={32} color={roleInfo.color} />
          </View>
          <AppText variant="md" weight="bold" color={theme.text.primary} style={{ marginTop: 10 }}>
            {staff.name}
          </AppText>

          <View style={s.heroBadgesRow}>
            <View style={[s.badge, { backgroundColor: `${roleInfo.color}15` }]}>
              <AppText variant="xs" weight="medium" color={roleInfo.color}>
                {roleInfo.label}
              </AppText>
            </View>

            <View
              style={[
                s.badge,
                {
                  backgroundColor:
                    staff.status === 'active'
                      ? `${theme.brand.success}15`
                      : `${theme.text.muted}15`,
                },
              ]}
            >
              <AppText
                variant="xs"
                weight="medium"
                color={staff.status === 'active' ? theme.brand.success : theme.text.muted}
              >
                {staff.status === 'active' ? 'Đang làm việc' : 'Đã nghỉ việc'}
              </AppText>
            </View>

            {staff.isWorking && (
              <View style={[s.badge, { backgroundColor: `${theme.brand.primary}15` }]}>
                <AppText variant="xs" weight="medium" color={theme.brand.primary}>
                  • Đang trực
                </AppText>
              </View>
            )}
          </View>

          <View style={s.heroSubRow}>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              SĐT: {staff.phone || 'Chưa cập nhật'}
            </AppText>
            <AppText variant="xs" color={theme.text.muted} tabularNums>
              · Ngày vào: {staff.joinDate || '2026-01-01'}
            </AppText>
          </View>
        </View>

        {/* 1. HỢP ĐỒNG & MỨC LƯƠNG */}
        <View style={s.sectionHeader}>
          <AppText
            variant="xs"
            weight="medium"
            color={theme.text.muted}
            style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
          >
            Hợp đồng & mức lương
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
          <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="md" color={theme.text.muted}>Hình thức làm việc</AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary}>
              {staff.wageType === 'hourly'
                ? 'Theo giờ (Part-time)'
                : staff.wageType === 'per_shift'
                ? 'Theo ca làm việc'
                : 'Cố định tháng (Full-time)'}
            </AppText>
          </View>

          <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="md" color={theme.text.muted}>Mức lương cơ sở</AppText>
            <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
              {staff.wageType === 'hourly'
                ? `${formatCurrency(staff.wageRate)} đ/giờ`
                : staff.wageType === 'per_shift'
                ? `${formatCurrency(staff.wageRate)} đ/ca`
                : `${formatCurrency(staff.wageRate)} đ/tháng`}
            </AppText>
          </View>

          <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="md" color={theme.text.muted}>Phụ cấp ăn ca / xăng</AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
              {formatCurrency(staff.allowance || 0)} đ
            </AppText>
          </View>

          <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="md" color={theme.text.muted}>Hệ số tăng ca OT</AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
              {staff.overtimeRateMultiplier || 1.5}x
            </AppText>
          </View>

          <View style={[s.flatRow, { borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="dialpad" size={16} color={theme.brand.primary} />
              <AppText variant="md" color={theme.text.muted}>Mã PIN vào ca</AppText>
            </View>
            <AppText variant="md" weight="medium" color={theme.brand.primary} tabularNums>
              {staff.pinCode || 'Chưa đặt (mặc định)'}
            </AppText>
          </View>
        </View>

        {/* 2. TỔNG KẾT CÔNG & THU NHẬP KỲ NÀY */}
        <View style={s.sectionHeader}>
          <AppText
            variant="xs"
            weight="medium"
            color={theme.text.muted}
            style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
          >
            Tổng kết công & thu nhập kỳ này
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

          {/* Dòng bóc tách tài chính */}
          <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
            <AppText variant="md" color={theme.text.muted}>Lương cơ bản</AppText>
            <AppText variant="md" weight="medium" color={theme.text.primary} tabularNums>
              {formatCurrency(calc.baseSalary)} đ
            </AppText>
          </View>

          {calc.otSalary > 0 && (
            <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
              <AppText variant="md" color={theme.text.muted}>Tăng ca OT</AppText>
              <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                +{formatCurrency(calc.otSalary)} đ
              </AppText>
            </View>
          )}

          {calc.allowance > 0 && (
            <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
              <AppText variant="md" color={theme.text.muted}>Phụ cấp</AppText>
              <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                +{formatCurrency(calc.allowance)} đ
              </AppText>
            </View>
          )}

          {calc.bonus > 0 && (
            <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
              <AppText variant="md" color={theme.text.muted}>Thưởng hiệu suất</AppText>
              <AppText variant="md" weight="medium" color={theme.brand.success} tabularNums>
                +{formatCurrency(calc.bonus)} đ
              </AppText>
            </View>
          )}

          {calc.deduction > 0 && (
            <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
              <AppText variant="md" color={theme.text.muted}>Khấu trừ vi phạm</AppText>
              <AppText variant="md" weight="medium" color={theme.brand.danger} tabularNums>
                -{formatCurrency(calc.deduction)} đ
              </AppText>
            </View>
          )}

          {calc.advancePaid > 0 && (
            <View style={[s.flatRow, { borderBottomColor: theme.border.subtle }]}>
              <AppText variant="md" color={theme.text.muted}>Đã tạm ứng</AppText>
              <AppText variant="md" weight="medium" color={theme.brand.warning} tabularNums>
                -{formatCurrency(calc.advancePaid)} đ
              </AppText>
            </View>
          )}

          <View style={[s.flatRow, { borderBottomWidth: 0 }]}>
            <AppText variant="md" weight="bold" color={theme.text.primary}>Thực lĩnh dự kiến</AppText>
            <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums>
              {formatCurrency(calc.netSalary)} đ
            </AppText>
          </View>
        </View>

        {/* 3. LỊCH SỬ CHẤM CÔNG & CA LÀM */}
        <View style={s.sectionHeader}>
          <AppText
            variant="xs"
            weight="medium"
            color={theme.text.muted}
            style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
          >
            Lịch sử chấm công & ca làm ({staffShiftLogs.length} ca)
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
          {staffShiftLogs.length === 0 ? (
            <View style={s.emptyLogs}>
              <Icon name="calendar-blank-outline" size={32} color={theme.text.muted} />
              <AppText variant="xs" color={theme.text.muted} style={{ marginTop: 6 }}>
                Chưa có ca làm nào được ghi nhận trong kỳ
              </AppText>
            </View>
          ) : (
            staffShiftLogs.slice(0, 10).map((log, idx) => {
              const isLast = idx === Math.min(staffShiftLogs.length, 10) - 1;
              const shiftInfo = SHIFT_CONFIG[log.shiftType];

              return (
                <View
                  key={log.id}
                  style={[
                    s.logItem,
                    !isLast && { borderBottomColor: theme.border.subtle, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <View style={[s.logIconSquircle, { backgroundColor: `${theme.brand.primary}12` }]}>
                    <Icon name={shiftInfo?.icon as any || 'clock-outline'} size={18} color={theme.brand.primary} />
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="sm" weight="medium" color={theme.text.primary}>
                        {shiftInfo?.label || log.shiftType}
                      </AppText>
                      <AppText variant="sm" weight="medium" color={theme.brand.primary} tabularNums>
                        {log.hours}h{log.otHours ? ` (+${log.otHours}h OT)` : ''}
                      </AppText>
                    </View>

                    <AppText variant="xs" color={theme.text.muted} tabularNums style={{ marginTop: 2 }}>
                      {log.date} {log.startTime ? `· ${log.startTime} - ${log.endTime || '...'}` : ''}
                    </AppText>

                    {log.note && (
                      <AppText variant="xs" color={theme.text.muted} numberOfLines={1} style={{ marginTop: 2, fontStyle: 'italic' }}>
                        "{log.note}"
                      </AppText>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Đệm đáy tránh che bởi thanh nút docked */}
        <View style={{ height: 72 }} />
      </ScrollView>

      {/* 4. Docked Bottom Action Bar - 1 Hàng Ngang Chuẩn POS */}
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
              onLogShift(staff);
            }}
            style={[s.actionBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle, flex: 1 }]}
          >
            <Icon name="clock-plus-outline" size={18} color={theme.text.primary} />
            <AppText variant="sm" weight="medium" color={theme.text.primary} numberOfLines={1}>
              Chấm Ca
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
              onAdvance(staff);
            }}
            style={[s.actionBtn, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle, flex: 1 }]}
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch {}
              }
              onPaySalary(staff);
            }}
            style={[s.actionBtn, { backgroundColor: theme.brand.accent, borderColor: theme.brand.accent, flex: 1.25 }]}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  emptyLogs: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logIconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
