import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';
import { useResponsive } from '../../lib/hooks/useResponsive';
import { AppText, useAppToast, AppHeader, Tier1Tabs, Tier1TabItem } from '../../lib/components/ui';
import {
  useStaffStore,
  StaffMember,
  PayrollRecord,
  ShiftType,
  calculateStaffSalary,
} from '../../lib/store/useStaffStore';
import { formatCurrency } from '../../lib/utils/format';
import { playTapSound } from '../../lib/utils/sound';
import {
  StaffListTab,
  StaffAttendanceTab,
  StaffPayrollTab,
  StaffFormModal,
  ClockInOutModal,
  QuickShiftLogModal,
  SalaryAdvanceModal,
  BonusDeductionModal,
  PaySalaryModal,
  PayslipDetailView,
  PayrollHistoryModal,
  StaffDetailView,
  StaffPayrollDetailView,
} from '../../lib/components/nhan-su';

export default function StaffScreen() {
  const { theme, isDark } = useTheme();
  const { isWide, isDesktopLarge } = useResponsive();
  const { showToast } = useAppToast();
  const [activeTab, setActiveTab] = useState<'staff' | 'attendance' | 'payroll'>('staff');

  // Stores
  const {
    staffList,
    shiftLogs,
    payrollHistory,
    addStaff,
    updateStaff,
    deleteStaff,
    clockIn,
    clockOut,
    logShift,
    deleteShiftLog,
    recordAdvance,
    adjustBonusDeduction,
    paySalary,
    payAllSalaries,
  } = useStaffStore();

  // Modals state
  const [staffFormVisible, setStaffFormVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [clockModalVisible, setClockModalVisible] = useState(false);
  const [clockTargetStaff, setClockTargetStaff] = useState<StaffMember | null>(null);
  const [clockMode, setClockMode] = useState<'in' | 'out'>('in');

  const [quickLogVisible, setQuickLogVisible] = useState(false);
  const [quickLogTargetStaff, setQuickLogTargetStaff] = useState<StaffMember | null>(null);

  const [advanceModalVisible, setAdvanceModalVisible] = useState(false);
  const [advanceTargetStaff, setAdvanceTargetStaff] = useState<StaffMember | null>(null);

  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [bonusTargetStaff, setBonusTargetStaff] = useState<StaffMember | null>(null);

  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payTargetStaff, setPayTargetStaff] = useState<StaffMember | null>(null);
  const [activePayslipRecord, setActivePayslipRecord] = useState<PayrollRecord | null>(null);

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [detailTargetStaff, setDetailTargetStaff] = useState<StaffMember | null>(null);
  const [selectedPayrollStaff, setSelectedPayrollStaff] = useState<StaffMember | null>(null);

  // Thống kê nhanh
  const workingCount = useMemo(() => staffList.filter((s) => s.isWorking).length, [staffList]);
  const totalPayrollEst = useMemo(() => {
    return staffList.reduce((sum, s) => sum + calculateStaffSalary(s).netSalary, 0);
  }, [staffList]);

  const tabs = useMemo<Tier1TabItem<'staff' | 'attendance' | 'payroll'>[]>(
    () => [
      { id: 'staff', label: 'Đội Ngũ', icon: 'account-group-outline', badge: staffList.length },
      { id: 'attendance', label: 'Chấm Công', icon: 'calendar-clock', badge: workingCount > 0 ? workingCount : undefined },
      { id: 'payroll', label: 'Bảng Lương', icon: 'cash-multiple' },
    ],
    [staffList.length, workingCount]
  );

  // Handlers
  const handleOpenAddStaff = () => {
    playTapSound();
    setEditingStaff(null);
    setStaffFormVisible(true);
  };

  const handleOpenEditStaff = (staff: StaffMember) => {
    playTapSound();
    setEditingStaff(staff);
    setStaffFormVisible(true);
  };

  const handleClockIn = (staff: StaffMember) => {
    playTapSound();
    setClockTargetStaff(staff);
    setClockMode('in');
    setClockModalVisible(true);
  };

  const handleClockOut = (staff: StaffMember) => {
    playTapSound();
    setClockTargetStaff(staff);
    setClockMode('out');
    setClockModalVisible(true);
  };

  const handleOpenQuickLog = (staff?: StaffMember) => {
    playTapSound();
    setQuickLogTargetStaff(staff || null);
    setQuickLogVisible(true);
  };

  const handleOpenAdvance = (staff: StaffMember) => {
    playTapSound();
    setAdvanceTargetStaff(staff);
    setAdvanceModalVisible(true);
  };

  const handleOpenBonus = (staff: StaffMember) => {
    playTapSound();
    setBonusTargetStaff(staff);
    setBonusModalVisible(true);
  };

  const handleOpenPaySalary = (staff: StaffMember) => {
    playTapSound();
    setPayTargetStaff(staff);
    setPayModalVisible(true);
  };

  const handleSelectStaff = (staff: StaffMember) => {
    playTapSound();
    setDetailTargetStaff(staff);
  };

  const handleViewQuickPayslip = (staff: StaffMember) => {
    playTapSound();
    const calc = calculateStaffSalary(staff);
    const now = new Date();
    const tempRecord: PayrollRecord = {
      id: `preview_${staff.id}`,
      staffId: staff.id,
      staffName: staff.name,
      role: staff.role,
      period: `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
      paidDate: now.toISOString().split('T')[0],
      paidTime: now.toTimeString().slice(0, 5),
      wageType: staff.wageType,
      wageRate: staff.wageRate,
      totalHours: staff.currentMonthHours,
      totalShifts: staff.currentMonthShifts,
      totalOtHours: staff.currentMonthOtHours,
      baseSalary: calc.baseSalary,
      otSalary: calc.otSalary,
      allowance: calc.allowance,
      bonus: calc.bonus,
      deduction: calc.deduction,
      advancePaid: calc.advancePaid,
      netSalary: calc.netSalary,
      paymentMethod: 'tien_mat',
      note: 'Xem trước phiếu lương hiện tại',
    };
    setActivePayslipRecord(tempRecord);
  };

  return (
    <View style={[s.container, { backgroundColor: theme.surface.app }]}>
      {activePayslipRecord ? (
        <PayslipDetailView
          record={activePayslipRecord}
          shiftLogs={shiftLogs}
          isWide={isWide}
          onBack={() => setActivePayslipRecord(null)}
        />
      ) : detailTargetStaff ? (
        <StaffDetailView
          staff={detailTargetStaff}
          shiftLogs={shiftLogs}
          isWide={isWide}
          onBack={() => setDetailTargetStaff(null)}
          onEdit={(staff) => {
            setDetailTargetStaff(null);
            handleOpenEditStaff(staff);
          }}
          onLogShift={(staff) => {
            setDetailTargetStaff(null);
            handleOpenQuickLog(staff);
          }}
          onAdvance={(staff) => {
            handleOpenAdvance(staff);
          }}
          onPaySalary={(staff) => {
            handleOpenPaySalary(staff);
          }}
        />
      ) : selectedPayrollStaff ? (
        <StaffPayrollDetailView
          staff={selectedPayrollStaff}
          shiftLogs={shiftLogs}
          isWide={isWide}
          onBack={() => setSelectedPayrollStaff(null)}
          onOpenAdvance={handleOpenAdvance}
          onOpenBonusDeduction={handleOpenBonus}
          onOpenPaySalary={handleOpenPaySalary}
          onViewQuickPayslip={handleViewQuickPayslip}
        />
      ) : (
        <>
          {/* Header Bar: Hamburger + Tiêu đề + Contextual CTA Button theo Tab */}
          <AppHeader
            title="Nhân Sự"
            subtitle={`${staffList.length} NV · ${formatCurrency(totalPayrollEst)} đ`}
            rightCustom={
              activeTab === 'staff' ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleOpenAddStaff}
                  style={[s.headerCtaBtn, { backgroundColor: theme.brand.primary }]}
                >
                  <Icon name="plus" size={16} color={theme.text.onBrand} />
                  <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                    Thêm NV
                  </AppText>
                </TouchableOpacity>
              ) : activeTab === 'attendance' ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleOpenQuickLog()}
                  style={[s.headerCtaBtn, { backgroundColor: theme.brand.primary }]}
                >
                  <Icon name="clock-plus-outline" size={16} color={theme.text.onBrand} />
                  <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                    Chấm Công
                  </AppText>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setHistoryModalVisible(true)}
                    style={[
                      s.headerCtaBtn,
                      {
                        backgroundColor: theme.surface.header,
                        borderColor: theme.border.subtle,
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <Icon name="history" size={15} color={theme.text.primary} />
                    <AppText variant="sm" weight="medium" color={theme.text.primary}>
                      Lịch Sử
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => payAllSalaries('tien_mat')}
                    style={[s.headerCtaBtn, { backgroundColor: theme.brand.accent }]}
                  >
                    <Icon name="check-all" size={16} color={theme.text.onBrand} />
                    <AppText variant="sm" weight="medium" color={theme.text.onBrand}>
                      Chi Toàn Bộ
                    </AppText>
                  </TouchableOpacity>
                </View>
              )
            }
          />

          {/* 🌟 DÃY 1: TAB CẤP 1 (Underline Tabs 46px chuẩn Invariant 3.13) */}
          <Tier1Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            backgroundColor={theme.status.warningBg}
          />

          {/* Main Tab Content */}
          {activeTab === 'staff' && (
            <StaffListTab
              staffList={staffList}
              isWide={isWide}
              isDesktopLarge={isDesktopLarge}
              onOpenAdd={handleOpenAddStaff}
              onSelectStaff={handleSelectStaff}
            />
          )}

          {activeTab === 'attendance' && (
            <StaffAttendanceTab
              staffList={staffList}
              shiftLogs={shiftLogs}
              isWide={isWide}
              isDesktopLarge={isDesktopLarge}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onQuickLog={handleOpenQuickLog}
              onDeleteLog={deleteShiftLog}
            />
          )}

          {activeTab === 'payroll' && (
            <StaffPayrollTab
              staffList={staffList}
              isWide={isWide}
              isDesktopLarge={isDesktopLarge}
              onSelectStaff={(staff) => setSelectedPayrollStaff(staff)}
              onOpenAdvance={handleOpenAdvance}
              onOpenBonusDeduction={handleOpenBonus}
              onOpenPaySalary={handleOpenPaySalary}
              onOpenHistory={() => setHistoryModalVisible(true)}
              onBulkPay={() => payAllSalaries('tien_mat')}
              onViewQuickPayslip={handleViewQuickPayslip}
            />
          )}
        </>
      )}

      {/* MODALS */}
      {/* 1. Thêm / Sửa Nhân Sự */}
      <StaffFormModal
        visible={staffFormVisible}
        onClose={() => setStaffFormVisible(false)}
        staff={editingStaff}
        onSave={(data) => {
          if (editingStaff) {
            updateStaff(editingStaff.id, data);
            showToast({ title: 'Đã Cập Nhật', message: `Hồ sơ ${data.name} đã được lưu`, type: 'success' });
          } else {
            addStaff(data);
            showToast({ title: 'Đã Tạo Nhân Sự', message: `Đã thêm ${data.name} vào hệ thống`, type: 'success' });
          }
        }}
        onDelete={(staff) => {
          deleteStaff(staff.id);
          showToast({ title: 'Đã Xóa', message: `Đã xóa nhân viên ${staff.name}`, type: 'success' });
        }}
      />

      {/* 2. Điểm danh Vào Ca / Ra Ca */}
      <ClockInOutModal
        visible={clockModalVisible}
        onClose={() => setClockModalVisible(false)}
        staff={clockTargetStaff}
        mode={clockMode}
        onClockIn={(staffId, shiftType, startTime) => clockIn(staffId, shiftType, startTime)}
        onClockOut={(staffId, endTime, note) => clockOut(staffId, endTime, note)}
      />

      {/* 3. Chấm công nhanh theo ca */}
      <QuickShiftLogModal
        visible={quickLogVisible}
        onClose={() => setQuickLogVisible(false)}
        staffList={staffList}
        initialStaff={quickLogTargetStaff}
        onLogShift={(staffId, data) => logShift(staffId, data)}
      />

      {/* 4. Tạm ứng lương */}
      <SalaryAdvanceModal
        visible={advanceModalVisible}
        onClose={() => setAdvanceModalVisible(false)}
        staff={advanceTargetStaff}
        onAdvance={(staffId, amount, paymentMethod, note) => {
          recordAdvance(staffId, amount, paymentMethod, note);
        }}
      />

      {/* 5. Thưởng & Phạt */}
      <BonusDeductionModal
        visible={bonusModalVisible}
        onClose={() => setBonusModalVisible(false)}
        staff={bonusTargetStaff}
        onSave={(staffId, bonus, deduction, reason) => {
          adjustBonusDeduction(staffId, bonus, deduction, reason);
        }}
      />

      {/* 6. Chi Lương từng người */}
      <PaySalaryModal
        visible={payModalVisible}
        onClose={() => setPayModalVisible(false)}
        staff={payTargetStaff}
        onConfirmPay={(staffId, paymentMethod, note) => paySalary(staffId, paymentMethod, note)}
        onViewPayslip={(record) => {
          setPayModalVisible(false);
          setActivePayslipRecord(record);
        }}
      />

      {/* 7. Lịch Sử Chi Lương */}
      <PayrollHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        payrollHistory={payrollHistory}
        onSelectRecord={(rec) => {
          setHistoryModalVisible(false);
          setActivePayslipRecord(rec);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
  },
});
