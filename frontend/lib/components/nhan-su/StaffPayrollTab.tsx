import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import { AppText, useAppToast, EmptyState } from '../../components/ui';
import {
  StaffMember,
  ROLE_CONFIG,
  calculateStaffSalary,
  PayrollRecord,
} from '../../store/useStaffStore';
import { formatCurrency } from '../../utils/format';
import { playTapSound } from '../../utils/sound';

interface StaffPayrollTabProps {
  staffList: StaffMember[];
  isWide: boolean;
  isDesktopLarge?: boolean;
  selectedStaffId?: string;
  isMasterDetail?: boolean;
  onOpenAdd?: () => void;
  onSelectStaff: (staff: StaffMember) => void;
  onOpenAdvance: (staff: StaffMember) => void;
  onOpenBonusDeduction: (staff: StaffMember) => void;
  onOpenPaySalary: (staff: StaffMember) => void;
  onOpenHistory: () => void;
  onBulkPay: () => void;
  onViewQuickPayslip: (staff: StaffMember) => void;
}

export function StaffPayrollTab({
  staffList,
  isWide,
  isDesktopLarge,
  selectedStaffId,
  isMasterDetail,
  onOpenAdd,
  onSelectStaff,
  onOpenAdvance,
  onOpenBonusDeduction,
  onOpenPaySalary,
  onOpenHistory,
  onBulkPay,
  onViewQuickPayslip,
}: StaffPayrollTabProps) {
  const { theme, isDark } = useTheme();
  const { showToast } = useAppToast();
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'paid'>('all');

  // Thống kê tổng quan quỹ lương
  const payrollStats = useMemo(() => {
    let totalNet = 0;
    let totalBase = 0;
    let totalAdvance = 0;
    let totalHours = 0;
    let totalShifts = 0;
    let unpaidCount = 0;
    let paidCount = 0;

    staffList.forEach((s) => {
      const c = calculateStaffSalary(s);
      totalNet += c.netSalary;
      totalBase += c.baseSalary;
      totalAdvance += c.advancePaid;
      totalHours += s.currentMonthHours;
      totalShifts += s.currentMonthShifts;
      if (c.netSalary > 0) {
        unpaidCount += 1;
      } else {
        paidCount += 1;
      }
    });

    return { totalNet, totalBase, totalAdvance, totalHours, totalShifts, unpaidCount, paidCount };
  }, [staffList]);

  // Lọc danh sách nhân sự
  const filteredStaffList = useMemo(() => {
    if (filterType === 'unpaid') {
      return staffList.filter((s) => calculateStaffSalary(s).netSalary > 0);
    }
    if (filterType === 'paid') {
      return staffList.filter((s) => calculateStaffSalary(s).netSalary === 0);
    }
    return staffList;
  }, [staffList, filterType]);

  const formatCompactMoney = (amount: number): string => {
    if (amount >= 1000000) {
      const val = amount / 1000000;
      return `${val % 1 === 0 ? val : val.toFixed(1)}Tr`;
    }
    if (amount >= 1000) {
      return `${Math.round(amount / 1000)}k`;
    }
    return `${amount}`;
  };

  return (
    <ScrollView
      contentContainerStyle={[
        s.container,
        { padding: isWide ? 16 : 0, paddingBottom: 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Dãy 2 KPI Quỹ Lương Trượt Ngang (Horizontal Scrollable Metric Strip) */}
      <View
        style={[
          s.kpiScrollWrapper,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.kpiScrollContent}
        >
          {/* Card 1: Quỹ Lương Dự Kiến */}
          <View style={[s.kpiCard, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="cash-multiple" size={15} color={theme.brand.success} />
              <AppText variant="xs" color={theme.text.muted}>
                Quỹ Lương Dự Kiến
              </AppText>
            </View>
            <AppText variant="md" weight="bold" color={theme.brand.success} tabularNums style={{ marginTop: 2 }}>
              {formatCurrency(payrollStats.totalNet)} đ
            </AppText>
          </View>

          {/* Card 2: Tổng Công & Ca */}
          <View style={[s.kpiCard, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="clock-outline" size={15} color={theme.brand.primary} />
              <AppText variant="xs" color={theme.text.muted}>
                Tổng Công & Ca
              </AppText>
            </View>
            <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
              {payrollStats.totalHours}h ({payrollStats.totalShifts} ca)
            </AppText>
          </View>

          {/* Card 3: Đã Ứng Trước */}
          <View style={[s.kpiCard, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="cash-minus" size={15} color={theme.brand.danger} />
              <AppText variant="xs" color={theme.text.muted}>
                Đã Tạm Ứng
              </AppText>
            </View>
            <AppText variant="md" weight="bold" color={theme.brand.danger} tabularNums style={{ marginTop: 2 }}>
              -{formatCurrency(payrollStats.totalAdvance)} đ
            </AppText>
          </View>

          {/* Card 4: Tổng Lương Cơ Bản */}
          <View style={[s.kpiCard, { backgroundColor: theme.surface.header, borderColor: theme.border.subtle }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="calculator" size={15} color={theme.text.muted} />
              <AppText variant="xs" color={theme.text.muted}>
                Lương Cơ Bản
              </AppText>
            </View>
            <AppText variant="md" weight="bold" color={theme.text.primary} tabularNums style={{ marginTop: 2 }}>
              {formatCurrency(payrollStats.totalBase)} đ
            </AppText>
          </View>
        </ScrollView>
      </View>

      {/* 2. Dãy lọc Tier 2 Capsule Pills (Trải dài liền mạch toàn chiều ngang) */}
      <View
        style={[
          s.filterBar,
          {
            backgroundColor: theme.surface.card,
            borderBottomColor: theme.border.subtle,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        <View
          style={[
            s.segmentedContainer,
            {
              backgroundColor: theme.surface.header,
              borderColor: theme.border.subtle,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              playTapSound();
              if (Platform.OS !== 'web') {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
              }
              setFilterType('all');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={[
              s.segmentedPill,
              {
                backgroundColor: filterType === 'all' ? theme.brand.primary : 'transparent',
              },
            ]}
          >
            <AppText
              variant="sm"
              weight={filterType === 'all' ? 'medium' : 'normal'}
              color={filterType === 'all' ? theme.text.onBrand : theme.text.muted}
              tabularNums
            >
              Tất Cả ({staffList.length})
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
              setFilterType('unpaid');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={[
              s.segmentedPill,
              {
                backgroundColor: filterType === 'unpaid' ? theme.brand.primary : 'transparent',
              },
            ]}
          >
            <AppText
              variant="sm"
              weight={filterType === 'unpaid' ? 'medium' : 'normal'}
              color={filterType === 'unpaid' ? theme.text.onBrand : theme.text.muted}
              tabularNums
            >
              Chưa Chi ({payrollStats.unpaidCount})
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
              setFilterType('paid');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={[
              s.segmentedPill,
              {
                backgroundColor: filterType === 'paid' ? theme.brand.primary : 'transparent',
              },
            ]}
          >
            <AppText
              variant="sm"
              weight={filterType === 'paid' ? 'medium' : 'normal'}
              color={filterType === 'paid' ? theme.text.onBrand : theme.text.muted}
              tabularNums
            >
              Đã Chi ({payrollStats.paidCount})
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Danh sách nhân viên trong bảng lương (Flat Seamless Canvas - Zero Chevron `>`) */}
      <View
        style={[
          s.listWrapper,
          isWide && {
            flexDirection: isMasterDetail ? 'column' : 'row',
            flexWrap: isMasterDetail ? 'nowrap' : 'wrap',
            gap: isMasterDetail ? 8 : 12,
            paddingHorizontal: isMasterDetail ? 12 : 16,
            paddingTop: 12,
          },
        ]}
      >
        {filteredStaffList.length === 0 ? (
          staffList.length === 0 ? (
            <EmptyState
              style={{ width: '100%', paddingVertical: 24 }}
              icon="cash-check"
              message="Chưa có dữ liệu bảng lương"
              description="Thêm nhân viên và ghi nhận công làm việc để tạo bảng lương"
              actionText="+ Thêm Nhân Viên"
              onAction={onOpenAdd}
            />
          ) : (
            <View style={[s.emptyBox, { backgroundColor: theme.surface.card, borderColor: theme.border.subtle, width: '100%' }]}>
              <Icon name="cash-check" size={36} color={theme.text.muted} />
              <AppText variant="sm" color={theme.text.muted} style={{ marginTop: 6 }}>
                {filterType === 'unpaid' ? 'Đã chi hết lương cho nhân sự' : 'Không có dữ liệu bảng lương'}
              </AppText>
            </View>
          )
        ) : (
          filteredStaffList.map((staff) => {
            const roleInfo = ROLE_CONFIG[staff.role];
            const calc = calculateStaffSalary(staff);
            const isSelected = selectedStaffId === staff.id;

            return (
              <TouchableOpacity
                key={staff.id}
                activeOpacity={0.7}
                onPress={() => {
                  playTapSound();
                  if (Platform.OS !== 'web') {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch {}
                  }
                  onSelectStaff(staff);
                }}
                style={[
                  s.payrollCard,
                  isWide && {
                    width: isMasterDetail ? '100%' : isDesktopLarge ? '32.4%' : '49.2%',
                    borderRadius: 10,
                    borderWidth: 1,
                  },
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(180, 83, 9, 0.15)'
                        : '#FEF3C7'
                      : theme.surface.card,
                    borderColor: isSelected ? theme.brand.accent : theme.border.subtle,
                    borderBottomColor: isSelected ? theme.brand.accent : theme.border.subtle,
                    borderBottomWidth: isWide ? 1 : StyleSheet.hairlineWidth,
                    borderLeftWidth: isSelected ? 4 : isWide ? 1 : 0,
                    borderLeftColor: isSelected ? theme.brand.accent : theme.border.subtle,
                  },
                ]}
              >
                {/* Khối Trái: Avatar Squircle + Tên + Role + Tóm tắt công */}
                <View style={s.cardLeft}>
                  <View style={[s.avatarCircle, { backgroundColor: `${roleInfo.color}18` }]}>
                    <Icon name="account" size={20} color={roleInfo.color} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="md" weight="normal" color={theme.text.primary} numberOfLines={1}>
                        {staff.name}
                      </AppText>
                      <View style={[s.roleBadge, { backgroundColor: `${roleInfo.color}15` }]}>
                        <AppText variant="xs" color={roleInfo.color}>
                          {roleInfo.label}
                        </AppText>
                      </View>
                    </View>

                    {/* Dòng 2: Tóm tắt công / ca + Các khoản cộng trừ (1 dòng liền mạch sạch sẽ) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <AppText variant="sm" color={theme.text.muted} tabularNums numberOfLines={1} style={{ flexShrink: 1 }}>
                        {staff.wageType === 'hourly'
                          ? `${staff.currentMonthHours}h`
                          : staff.wageType === 'per_shift'
                          ? `${staff.currentMonthShifts} ca`
                          : 'Cố định'}
                        {` · ${formatCompactMoney(calc.baseSalary)}`}
                        {calc.allowance > 0 ? ` · +${formatCompactMoney(calc.allowance)} PC` : ''}
                        {calc.bonus > 0 ? ` · +${formatCompactMoney(calc.bonus)} T` : ''}
                        {calc.deduction > 0 ? ` · -${formatCompactMoney(calc.deduction)} P` : ''}
                        {calc.advancePaid > 0 ? ` · -${formatCompactMoney(calc.advancePaid)} ứng` : ''}
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Khối Phải: Thực Lĩnh (Zero Chevron `>`) */}
                <View style={s.cardRight}>
                  <AppText variant="xs" color={theme.text.muted}>
                    Thực lĩnh
                  </AppText>
                  <AppText
                    variant="md"
                    weight="medium"
                    color={calc.netSalary > 0 ? theme.brand.success : theme.text.muted}
                    tabularNums
                    style={{ marginTop: 1 }}
                  >
                    {formatCurrency(calc.netSalary)} đ
                  </AppText>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  kpiScrollWrapper: {
    paddingVertical: 8,
  },
  kpiScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  kpiCard: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 140,
    justifyContent: 'center',
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  segmentedPill: {
    flex: 1,
    height: 34,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrapper: {
    width: '100%',
  },
  payrollCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 62,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 12,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  emptyBox: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 28,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
