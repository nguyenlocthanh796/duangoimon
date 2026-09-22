import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePOSStore } from './usePOSStore';
import { lightTheme } from '../theme';

export type StaffRole = 'thu_ngan' | 'phuc_vu' | 'pha_che' | 'quan_ly' | 'bep' | 'tap_vu' | 'bao_ve';
export type WageType = 'hourly' | 'monthly' | 'per_shift';
export type ShiftType = 'ca_sang' | 'ca_chieu' | 'ca_toi' | 'ca_full' | 'ca_gay' | 'tang_ca';

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  role: StaffRole;
  wageType: WageType;
  wageRate: number; // e.g. 25000 (đ/h), 8500000 (đ/tháng), hoặc 180000 (đ/ca)
  allowance: number; // Phụ cấp ăn ca, xăng xe, trách nhiệm
  overtimeRateMultiplier?: number; // Hệ số OT, mặc định 1.5
  joinDate: string;
  status: 'active' | 'inactive';
  currentMonthHours: number; // Tổng số giờ làm trong tháng
  currentMonthShifts: number; // Tổng số ca làm trong tháng (cho per_shift)
  currentMonthOtHours: number; // Tổng số giờ OT trong tháng
  bonus: number; // Thưởng hiệu suất
  deduction: number; // Phạt vi phạm
  advancePaid: number; // Đã ứng lương
  lastPaidAt?: string;
  pinCode?: string; // Mã PIN / Passcode 4-6 số đăng nhập nhanh (Thu ngân / Phục vụ / Bếp)
  username?: string; // Tên đăng nhập riêng (dành cho Quản lý)
  password?: string; // Mật khẩu đăng nhập (dành cho Quản lý)
  branchId?: string; // Chi nhánh làm việc (Quán phân quyền)
  // Trạng thái ca làm việc hiện tại
  isWorking?: boolean;
  activeShiftStartTime?: string; // e.g. '07:30'
  activeShiftDate?: string; // e.g. '2026-09-06'
  activeShiftType?: ShiftType;
}

export interface StaffShiftLog {
  id: string;
  staffId: string;
  staffName: string;
  date: string; // 'YYYY-MM-DD'
  shiftType: ShiftType;
  startTime?: string; // 'HH:mm'
  endTime?: string; // 'HH:mm'
  hours: number;
  otHours?: number;
  note?: string;
  createdAt: string;
  recordedBy?: string;
  branchId?: string;
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: StaffRole;
  period: string; // 'Tháng 09/2026'
  paidDate: string; // 'YYYY-MM-DD'
  paidTime: string; // 'HH:mm'
  wageType: WageType;
  wageRate: number;
  totalHours: number;
  totalShifts: number;
  totalOtHours: number;
  baseSalary: number;
  otSalary: number;
  allowance: number;
  bonus: number;
  deduction: number;
  advancePaid: number;
  netSalary: number;
  paymentMethod: 'tien_mat' | 'chuyen_khoan';
  note?: string;
  branchId?: string;
}

export const ROLE_CONFIG: Record<StaffRole, { label: string; color: string; defaultWageType: WageType; defaultRate: number }> = {
  thu_ngan: { label: 'Thu Ngân', color: lightTheme.brand.accent, defaultWageType: 'hourly', defaultRate: 25000 },
  phuc_vu: { label: 'Phục Vụ', color: lightTheme.brand.success, defaultWageType: 'hourly', defaultRate: 22000 },
  pha_che: { label: 'Pha Chế', color: lightTheme.brand.warning, defaultWageType: 'hourly', defaultRate: 28000 },
  quan_ly: { label: 'Quản Lý', color: lightTheme.brand.purple, defaultWageType: 'monthly', defaultRate: 8500000 },
  bep: { label: 'Bếp Nấu', color: lightTheme.brand.danger, defaultWageType: 'monthly', defaultRate: 9500000 },
  tap_vu: { label: 'Tạp Vụ', color: lightTheme.text.muted, defaultWageType: 'hourly', defaultRate: 20000 },
  bao_ve: { label: 'Bảo Vệ', color: lightTheme.brand.success, defaultWageType: 'per_shift', defaultRate: 200000 },
};

export const SHIFT_CONFIG: Record<ShiftType, { label: string; defaultHours: number; icon: string }> = {
  ca_sang: { label: 'Ca Sáng', defaultHours: 4, icon: 'weather-sunny' },
  ca_chieu: { label: 'Ca Chiều', defaultHours: 4, icon: 'weather-partly-cloudy' },
  ca_toi: { label: 'Ca Tối', defaultHours: 5, icon: 'weather-night' },
  ca_full: { label: 'Cả Ngày', defaultHours: 8, icon: 'calendar-today' },
  ca_gay: { label: 'Ca Gãy', defaultHours: 6, icon: 'clock-fast' },
  tang_ca: { label: 'Tăng Ca (OT)', defaultHours: 2, icon: 'lightning-bolt' },
};

export const INITIAL_STAFF: StaffMember[] = [];

export const INITIAL_SHIFT_LOGS: StaffShiftLog[] = [];

export const INITIAL_PAYROLL_HISTORY: PayrollRecord[] = [];

/**
 * Tính toán lương chi tiết cho một nhân viên
 */
export function calculateStaffSalary(staff: StaffMember) {
  let baseSalary = 0;
  if (staff.wageType === 'hourly') {
    baseSalary = staff.currentMonthHours * staff.wageRate;
  } else if (staff.wageType === 'per_shift') {
    baseSalary = staff.currentMonthShifts * staff.wageRate;
  } else {
    // monthly
    baseSalary = staff.wageRate;
  }

  // Tiền OT (Overtime)
  const otMultiplier = staff.overtimeRateMultiplier || 1.5;
  const hourlyBaseForOt = staff.wageType === 'hourly'
    ? staff.wageRate
    : Math.round(staff.wageRate / (staff.wageType === 'per_shift' ? 4 : 200));
  const otSalary = Math.round(staff.currentMonthOtHours * hourlyBaseForOt * otMultiplier);

  // Phụ cấp
  const allowance = staff.allowance || 0;

  // Thưởng & Phạt & Ứng
  const bonus = staff.bonus || 0;
  const deduction = staff.deduction || 0;
  const advancePaid = staff.advancePaid || 0;

  // Thực lĩnh
  const totalIncome = baseSalary + otSalary + allowance + bonus;
  const totalDeductions = deduction + advancePaid;
  const netSalary = Math.max(0, totalIncome - totalDeductions);

  return {
    baseSalary,
    otSalary,
    allowance,
    bonus,
    deduction,
    advancePaid,
    totalIncome,
    totalDeductions,
    netSalary,
  };
}

interface StaffState {
  tenantId: string;
  switchTenant: (tenantId: string) => Promise<void>;
  staffList: StaffMember[];
  shiftLogs: StaffShiftLog[];
  payrollHistory: PayrollRecord[];

  // Actions quản lý nhân sự
  addStaff: (staff: Omit<StaffMember, 'id' | 'joinDate' | 'status' | 'currentMonthHours' | 'currentMonthShifts' | 'currentMonthOtHours' | 'bonus' | 'deduction' | 'advancePaid' | 'isWorking'>) => StaffMember;
  updateStaff: (id: string, updates: Partial<StaffMember>) => void;
  deleteStaff: (id: string) => void;
  setStaffPin: (staffId: string, pin: string) => { success: boolean; error?: string };

  // Actions Chấm Công
  clockIn: (staffId: string, shiftType?: ShiftType, startTime?: string) => void;
  clockOut: (staffId: string, endTime?: string, note?: string) => { hours: number; logId: string } | null;
  logShift: (staffId: string, data: {
    shiftType: ShiftType;
    hours: number;
    otHours?: number;
    note?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    recordedBy?: string;
  }) => StaffShiftLog | null;
  deleteShiftLog: (logId: string) => void;

  // Actions Tài Chính & Lương
  recordAdvance: (staffId: string, amount: number, paymentMethod?: 'tien_mat' | 'chuyen_khoan', note?: string) => boolean;
  adjustBonusDeduction: (staffId: string, bonus: number, deduction: number, reason?: string) => void;
  paySalary: (staffId: string, paymentMethod?: 'tien_mat' | 'chuyen_khoan', note?: string) => PayrollRecord | null;
  payAllSalaries: (paymentMethod?: 'tien_mat' | 'chuyen_khoan') => PayrollRecord[];
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set, get) => ({
      tenantId: 'tenant_ongchu',

      switchTenant: async (tenantId: string) => {
        const current = get();
        if (current.tenantId === tenantId) return;

        // Save current tenant snapshot
        if (current.tenantId && current.tenantId !== 'unbound') {
          try {
            const snapshot = {
              tenantId: current.tenantId,
              staffList: current.staffList,
              shiftLogs: current.shiftLogs,
              payrollHistory: current.payrollHistory,
            };
            await AsyncStorage.setItem(`ongchu_staff_tenant_${current.tenantId}`, JSON.stringify(snapshot));
          } catch (_) {}
        }

        // Try restoring tenant snapshot
        try {
          const saved = await AsyncStorage.getItem(`ongchu_staff_tenant_${tenantId}`);
          if (saved) {
            const data = JSON.parse(saved);
            if (data && Array.isArray(data.staffList)) {
              let safeStaffList = data.staffList;
              if (tenantId !== 'tenant_ongchu' && safeStaffList.some((s: any) => s.id === 'st_01' || s.name === 'Nguyễn Văn An')) {
                safeStaffList = [];
              }
              set({
                tenantId,
                staffList: safeStaffList,
                shiftLogs: data.shiftLogs || [],
                payrollHistory: data.payrollHistory || [],
              });
              return;
            }
          }
        } catch (_) {}

        // Fresh staff list for new tenant (only demo store tenant_ongchu has sample staff)
        set({
          tenantId,
          staffList: tenantId === 'tenant_ongchu' ? INITIAL_STAFF : [],
          shiftLogs: [],
          payrollHistory: [],
        });
      },

      staffList: INITIAL_STAFF,
      shiftLogs: INITIAL_SHIFT_LOGS,
      payrollHistory: INITIAL_PAYROLL_HISTORY,

      addStaff: (newStaffData) => {
        const { staffList } = get();
        let branchId = (newStaffData as any).branchId;
        if (!branchId) {
          try {
            branchId = require('./useAuthStore').useAuthStore.getState().activeBranchId || 'branch_01';
          } catch (_) {
            branchId = 'branch_01';
          }
        }
        const newStaff: StaffMember = {
          branchId,
          ...newStaffData,
          id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          joinDate: new Date().toISOString().split('T')[0],
          status: 'active',
          currentMonthHours: 0,
          currentMonthShifts: 0,
          currentMonthOtHours: 0,
          bonus: 0,
          deduction: 0,
          advancePaid: 0,
          isWorking: false,
        };
        set({ staffList: [newStaff, ...staffList] });
        return newStaff;
      },

      updateStaff: (id, updates) => {
        const { staffList } = get();
        set({
          staffList: staffList.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        });
      },

      deleteStaff: (id) => {
        const { staffList } = get();
        set({
          staffList: staffList.filter((s) => s.id !== id),
        });
      },

      setStaffPin: (staffId, pin) => {
        const cleanPin = pin.trim();
        if (cleanPin.length < 4) {
          return { success: false, error: 'Mã PIN tối thiểu 4 chữ số' };
        }
        const { staffList } = get();
        const staff = staffList.find((s) => s.id === staffId);
        if (!staff) {
          return { success: false, error: 'Không tìm thấy nhân viên' };
        }
        set({
          staffList: staffList.map((s) => (s.id === staffId ? { ...s, pinCode: cleanPin } : s)),
        });
        return { success: true };
      },

      // 1-Chạm Bắt Đầu Ca Làm (Clock-In)
      clockIn: (staffId, shiftType = 'ca_sang', customStartTime) => {
        const { staffList } = get();
        const now = new Date();
        const timeStr = customStartTime || now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toISOString().split('T')[0];

        set({
          staffList: staffList.map((s) =>
            s.id === staffId
              ? {
                  ...s,
                  isWorking: true,
                  activeShiftStartTime: timeStr,
                  activeShiftDate: dateStr,
                  activeShiftType: shiftType,
                }
              : s
          ),
        });
      },

      // 1-Chạm Kết Thúc Ca Làm (Clock-Out)
      clockOut: (staffId, customEndTime, note) => {
        const { staffList, shiftLogs } = get();
        const staff = staffList.find((s) => s.id === staffId);
        if (!staff || !staff.isWorking) return null;

        const now = new Date();
        const endTimeStr = customEndTime || now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const startTimeStr = staff.activeShiftStartTime || '08:00';
        const dateStr = staff.activeShiftDate || now.toISOString().split('T')[0];
        const shiftType = staff.activeShiftType || 'ca_sang';

        // Tính số giờ làm dựa trên chênh lệch thời gian (hoặc mặc định theo ca)
        let workedHours = SHIFT_CONFIG[shiftType]?.defaultHours || 4;
        try {
          const [startH, startM] = startTimeStr.split(':').map(Number);
          const [endH, endM] = endTimeStr.split(':').map(Number);
          let diffMinutes = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
          if (diffMinutes < 0) diffMinutes += 24 * 60; // Qua đêm
          if (diffMinutes > 0) {
            workedHours = Math.round((diffMinutes / 60) * 10) / 10; // Làm tròn 1 chữ số thập phân
          }
        } catch {
          workedHours = SHIFT_CONFIG[shiftType]?.defaultHours || 4;
        }

        const newLog: StaffShiftLog = {
          id: `log_${Date.now()}`,
          staffId,
          staffName: staff.name,
          date: dateStr,
          shiftType,
          startTime: startTimeStr,
          endTime: endTimeStr,
          hours: workedHours,
          otHours: 0,
          note: note || `Ca ${SHIFT_CONFIG[shiftType]?.label || shiftType}`,
          createdAt: endTimeStr,
          recordedBy: 'Quản Lý',
        };

        set({
          shiftLogs: [newLog, ...shiftLogs],
          staffList: staffList.map((s) =>
            s.id === staffId
              ? {
                  ...s,
                  isWorking: false,
                  activeShiftStartTime: undefined,
                  activeShiftDate: undefined,
                  activeShiftType: undefined,
                  currentMonthHours: s.currentMonthHours + workedHours,
                  currentMonthShifts: s.currentMonthShifts + 1,
                }
              : s
          ),
        });

        return { hours: workedHours, logId: newLog.id };
      },

      // Chấm công thủ công / Chấm nhanh theo ca
      logShift: (staffId, data) => {
        const { staffList, shiftLogs } = get();
        const staff = staffList.find((s) => s.id === staffId);
        if (!staff) return null;

        const now = new Date();
        const date = data.date || now.toISOString().split('T')[0];
        const timeNow = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        const newLog: StaffShiftLog = {
          id: `log_${Date.now()}`,
          staffId,
          staffName: staff.name,
          date,
          shiftType: data.shiftType,
          startTime: data.startTime,
          endTime: data.endTime,
          hours: data.hours,
          otHours: data.otHours || 0,
          note: data.note,
          createdAt: timeNow,
          recordedBy: data.recordedBy || 'Quản Lý',
        };

        const totalHoursToAdd = data.hours;
        const otHoursToAdd = data.otHours || 0;

        set({
          shiftLogs: [newLog, ...shiftLogs],
          staffList: staffList.map((s) =>
            s.id === staffId
              ? {
                  ...s,
                  currentMonthHours: s.currentMonthHours + totalHoursToAdd,
                  currentMonthShifts: s.currentMonthShifts + 1,
                  currentMonthOtHours: s.currentMonthOtHours + otHoursToAdd,
                }
              : s
          ),
        });

        return newLog;
      },

      // Xóa ca chấm nhầm (hoàn lại giờ công)
      deleteShiftLog: (logId) => {
        const { shiftLogs, staffList } = get();
        const log = shiftLogs.find((l) => l.id === logId);
        if (!log) return;

        set({
          shiftLogs: shiftLogs.filter((l) => l.id !== logId),
          staffList: staffList.map((s) =>
            s.id === log.staffId
              ? {
                  ...s,
                  currentMonthHours: Math.max(0, s.currentMonthHours - log.hours),
                  currentMonthShifts: Math.max(0, s.currentMonthShifts - 1),
                  currentMonthOtHours: Math.max(0, s.currentMonthOtHours - (log.otHours || 0)),
                }
              : s
          ),
        });
      },

      // Tạm ứng lương (Tự động ghi phiếu chi vào Sổ Quỹ Tiền Mặt nếu trả tiền mặt)
      recordAdvance: (staffId, amount, paymentMethod = 'tien_mat', note) => {
        const { staffList } = get();
        const staff = staffList.find((s) => s.id === staffId);
        if (!staff || amount <= 0) return false;

        set({
          staffList: staffList.map((s) =>
            s.id === staffId ? { ...s, advancePaid: s.advancePaid + amount } : s
          ),
        });

        // Hạch toán Sổ Quỹ nếu chi tiền mặt từ két
        if (paymentMethod === 'tien_mat') {
          try {
            usePOSStore.getState().addCashTransaction({
              type: 'chi',
              category: 'Tạm Ứng Lương',
              amount,
              description: `Ứng lương: ${staff.name} (${ROLE_CONFIG[staff.role].label})${note ? ` - ${note}` : ''}`,
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              performedBy: 'Chủ Quán',
            });
          } catch (e) {
            console.warn('[StaffStore] Không thể hạch toán Sổ Quỹ:', e);
          }
        }

        return true;
      },

      // Điều chỉnh Thưởng / Phạt
      adjustBonusDeduction: (staffId, bonus, deduction) => {
        const { staffList } = get();
        set({
          staffList: staffList.map((s) =>
            s.id === staffId ? { ...s, bonus, deduction } : s
          ),
        });
      },

      // Chi Lương 1-Chạm (Lưu PayrollRecord, hạch toán Sổ Quỹ, reset công kỳ mới)
      paySalary: (staffId, paymentMethod = 'tien_mat', note) => {
        const { staffList, payrollHistory } = get();
        const staff = staffList.find((s) => s.id === staffId);
        if (!staff) return null;

        const salaryCalc = calculateStaffSalary(staff);
        if (salaryCalc.netSalary <= 0) return null;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const currentMonthName = `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        const newRecord: PayrollRecord = {
          id: `pr_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}_${staff.id}_${Date.now()}`,
          staffId: staff.id,
          staffName: staff.name,
          role: staff.role,
          period: currentMonthName,
          paidDate: dateStr,
          paidTime: timeStr,
          wageType: staff.wageType,
          wageRate: staff.wageRate,
          totalHours: staff.currentMonthHours,
          totalShifts: staff.currentMonthShifts,
          totalOtHours: staff.currentMonthOtHours,
          baseSalary: salaryCalc.baseSalary,
          otSalary: salaryCalc.otSalary,
          allowance: salaryCalc.allowance,
          bonus: salaryCalc.bonus,
          deduction: salaryCalc.deduction,
          advancePaid: salaryCalc.advancePaid,
          netSalary: salaryCalc.netSalary,
          paymentMethod,
          note: note || `Chi lương ${currentMonthName} (${paymentMethod === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'})`,
        };

        // Hạch toán Sổ Quỹ nếu thanh toán tiền mặt từ két
        if (paymentMethod === 'tien_mat') {
          try {
            usePOSStore.getState().addCashTransaction({
              type: 'chi',
              category: 'Chi Lương',
              amount: salaryCalc.netSalary,
              description: `Chi lương ${currentMonthName}: ${staff.name} (${ROLE_CONFIG[staff.role].label})`,
              time: timeStr,
              performedBy: 'Chủ Quán',
            });
          } catch (e) {
            console.warn('[StaffStore] Không thể hạch toán Sổ Quỹ:', e);
          }
        }

        // Cập nhật trạng thái nhân viên và lưu lịch sử
        set({
          payrollHistory: [newRecord, ...payrollHistory],
          staffList: staffList.map((s) =>
            s.id === staffId
              ? {
                  ...s,
                  currentMonthHours: 0,
                  currentMonthShifts: 0,
                  currentMonthOtHours: 0,
                  bonus: 0,
                  deduction: 0,
                  advancePaid: 0,
                  lastPaidAt: dateStr,
                }
              : s
          ),
        });

        return newRecord;
      },

      // Chi lương toàn bộ nhân viên (Bulk Pay)
      payAllSalaries: (paymentMethod = 'tien_mat') => {
        const { staffList } = get();
        const records: PayrollRecord[] = [];

        staffList.forEach((staff) => {
          const salaryCalc = calculateStaffSalary(staff);
          if (salaryCalc.netSalary > 0) {
            const record = get().paySalary(staff.id, paymentMethod, `Chi lương đồng loạt (${paymentMethod === 'tien_mat' ? 'Tiền mặt' : 'Chuyển khoản'})`);
            if (record) {
              records.push(record);
            }
          }
        });

        return records;
      },
    }),
    {
      name: 'ongchu_staff_storage',
      storage: createJSONStorage(() => AsyncStorage),
      // ponytail: bump version de xoa du lieu AsyncStorage cu (trong truoc day dan
      // den man hinh Nhan Su trong rong tren thiet bi da cai). Version moi = seed lai.
      version: 4,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.staffList?.some((s: any) => s.id === 'st_1' || s.name === 'Nguyễn Văn An')) {
          useStaffStore.setState({ staffList: [], shiftLogs: [], payrollHistory: [] });
        }
      },
      partialize: (state) => ({
        tenantId: state.tenantId,
        staffList: state.staffList,
        shiftLogs: state.shiftLogs,
        payrollHistory: state.payrollHistory,
      }),
    }
  )
);
