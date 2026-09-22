import assert from 'assert';
import { runner } from './harness';
import { useStaffStore, calculateStaffSalary } from '../lib/store/useStaffStore';
import { usePOSStore } from '../lib/store/usePOSStore';

export async function runStaffTimekeepingAndPayrollTests() {
  runner.setContext('Staff & Payroll', 'Timekeeping & Salary Calculations');

  // Test 1: Thêm nhân viên với 3 hình thức trả lương đa dạng
  await runner.test('Thêm nhân viên với 3 cấu trúc lương khác nhau: hourly, monthly, per_shift', () => {
    const store = useStaffStore.getState();

    // 1. Hourly staff
    const hourlyStaff = store.addStaff({
      name: 'Kiểm Thử Part-time',
      phone: '0901112222',
      role: 'phuc_vu',
      wageType: 'hourly',
      wageRate: 23000,
      allowance: 200000,
      overtimeRateMultiplier: 1.5,
    });
    assert.strictEqual(hourlyStaff.wageType, 'hourly');
    assert.strictEqual(hourlyStaff.wageRate, 23000);
    assert.strictEqual(hourlyStaff.allowance, 200000);

    // 2. Monthly staff
    const monthlyStaff = store.addStaff({
      name: 'Kiểm Thử Quản Lý',
      phone: '0903334444',
      role: 'quan_ly',
      wageType: 'monthly',
      wageRate: 9000000,
      allowance: 1200000,
      overtimeRateMultiplier: 2.0,
    });
    assert.strictEqual(monthlyStaff.wageType, 'monthly');
    assert.strictEqual(monthlyStaff.wageRate, 9000000);

    // 3. Per-shift staff
    const shiftStaff = store.addStaff({
      name: 'Kiểm Thử Theo Ca',
      phone: '0905556666',
      role: 'bao_ve',
      wageType: 'per_shift',
      wageRate: 190000,
      allowance: 150000,
      overtimeRateMultiplier: 1.5,
    });
    assert.strictEqual(shiftStaff.wageType, 'per_shift');
    assert.strictEqual(shiftStaff.wageRate, 190000);
  });

  // Test 2: Chấm công vào ca (clockIn) và ra ca (clockOut)
  await runner.test('Chấm công vào ca (clockIn) và ra ca (clockOut) tự động tính giờ công', () => {
    const store = useStaffStore.getState();
    const staff = store.staffList[0];

    // Clock in lúc 08:00
    store.clockIn(staff.id, 'ca_sang', '08:00');
    const updatedWorking = useStaffStore.getState().staffList.find((s) => s.id === staff.id);
    assert.strictEqual(updatedWorking?.isWorking, true);
    assert.strictEqual(updatedWorking?.activeShiftStartTime, '08:00');

    // Clock out lúc 12:30 (4.5 tiếng)
    const initialHours = updatedWorking?.currentMonthHours || 0;
    const res = store.clockOut(staff.id, '12:30', 'Hoàn thành ca sáng tốt');
    assert(res !== null, 'Clock out phải trả về kết quả');
    assert.strictEqual(res?.hours, 4.5);

    const updatedAfterOut = useStaffStore.getState().staffList.find((s) => s.id === staff.id);
    assert.strictEqual(updatedAfterOut?.isWorking, false);
    assert.strictEqual(updatedAfterOut?.currentMonthHours, initialHours + 4.5);

    // Kiểm tra đã ghi nhận vào shiftLogs
    const latestLog = useStaffStore.getState().shiftLogs[0];
    assert.strictEqual(latestLog.staffId, staff.id);
    assert.strictEqual(latestLog.hours, 4.5);
    assert.strictEqual(latestLog.note, 'Hoàn thành ca sáng tốt');
  });

  // Test 3: Chấm công thủ công theo ca và tăng ca OT
  await runner.test('Chấm công thủ công (logShift) với giờ thường và tăng ca OT', () => {
    const store = useStaffStore.getState();
    const staff = store.staffList[1];
    const initialHours = staff.currentMonthHours;
    const initialOt = staff.currentMonthOtHours;

    const log = store.logShift(staff.id, {
      shiftType: 'tang_ca',
      hours: 4,
      otHours: 2,
      note: 'Tăng ca cuối tuần đông khách',
    });

    assert(log !== null, 'Phải tạo log thành công');
    assert.strictEqual(log?.hours, 4);
    assert.strictEqual(log?.otHours, 2);

    const updated = useStaffStore.getState().staffList.find((s) => s.id === staff.id);
    assert.strictEqual(updated?.currentMonthHours, initialHours + 4);
    assert.strictEqual(updated?.currentMonthOtHours, initialOt + 2);
  });

  // Test 4: Tạm ứng lương liên kết Sổ Quỹ Tiền Mặt
  await runner.test('Tạm ứng lương (recordAdvance) tiền mặt tự động sinh phiếu chi Sổ Quỹ', () => {
    const store = useStaffStore.getState();
    const staff = store.staffList[2];
    const initialAdvance = staff.advancePaid;

    const posInitialTransactionsCount = usePOSStore.getState().cashTransactions.length;

    // Ứng 500,000 đ tiền mặt
    const ok = store.recordAdvance(staff.id, 500000, 'tien_mat', 'Đóng tiền trọ');
    assert.strictEqual(ok, true);

    const updated = useStaffStore.getState().staffList.find((s) => s.id === staff.id);
    assert.strictEqual(updated?.advancePaid, initialAdvance + 500000);

    // Kiểm tra Sổ Quỹ Tiền Mặt đã có thêm 1 giao dịch 'chi'
    const posTransactions = usePOSStore.getState().cashTransactions;
    assert.strictEqual(posTransactions.length, posInitialTransactionsCount + 1);
    const latestCashTx = posTransactions[0];
    assert.strictEqual(latestCashTx.type, 'chi');
    assert.strictEqual(latestCashTx.amount, 500000);
    assert.strictEqual(latestCashTx.category, 'Tạm Ứng Lương');
  });

  // Test 5: Điều chỉnh Thưởng và Phạt
  await runner.test('Điều chỉnh thưởng và phạt (adjustBonusDeduction)', () => {
    const store = useStaffStore.getState();
    const staff = store.staffList[0];

    store.adjustBonusDeduction(staff.id, 350000, 70000, 'Thưởng tip & phạt làm vỡ ly');
    const updated = useStaffStore.getState().staffList.find((s) => s.id === staff.id);
    assert.strictEqual(updated?.bonus, 350000);
    assert.strictEqual(updated?.deduction, 70000);
  });

  // Test 6: Bóc tách tài chính và tính Thực Lĩnh cho từng loại nhân viên
  await runner.test('Công thức tính Thực Lĩnh (calculateStaffSalary) chính xác 100%', () => {
    // 1. Hourly: 100h * 25k = 2.5Tr, OT 10h * 25k * 1.5 = 375k, allowance 200k, bonus 100k, deduction 50k, advance 500k
    // => Total income = 2.5M + 375k + 200k + 100k = 3.175M. Deductions = 50k + 500k = 550k. Net = 2.625M
    const testHourlyStaff: any = {
      wageType: 'hourly',
      wageRate: 25000,
      currentMonthHours: 100,
      currentMonthOtHours: 10,
      overtimeRateMultiplier: 1.5,
      allowance: 200000,
      bonus: 100000,
      deduction: 50000,
      advancePaid: 500000,
    };
    const hourlyCalc = calculateStaffSalary(testHourlyStaff);
    assert.strictEqual(hourlyCalc.baseSalary, 2500000);
    assert.strictEqual(hourlyCalc.otSalary, 375000);
    assert.strictEqual(hourlyCalc.allowance, 200000);
    assert.strictEqual(hourlyCalc.bonus, 100000);
    assert.strictEqual(hourlyCalc.netSalary, 2625000);

    // 2. Monthly: 8.5M + allowance 1M + bonus 500k - advance 1M = 9M
    const testMonthlyStaff: any = {
      wageType: 'monthly',
      wageRate: 8500000,
      currentMonthHours: 200,
      currentMonthOtHours: 0,
      allowance: 1000000,
      bonus: 500000,
      deduction: 0,
      advancePaid: 1000000,
    };
    const monthlyCalc = calculateStaffSalary(testMonthlyStaff);
    assert.strictEqual(monthlyCalc.baseSalary, 8500000);
    assert.strictEqual(monthlyCalc.netSalary, 9000000);
  });

  // Test 7: Chi Lương (paySalary), sinh PayrollRecord, hạch toán Sổ Quỹ và reset công
  await runner.test('Chi lương (paySalary) tạo PayrollRecord, ghi Sổ Quỹ và reset công kỳ mới', () => {
    const store = useStaffStore.getState();
    const staff = store.staffList.find((s) => calculateStaffSalary(s).netSalary > 0);
    assert(staff !== undefined, 'Phải có nhân viên có lương để test chi');

    const expectedNet = calculateStaffSalary(staff!).netSalary;
    const initialRecordsCount = store.payrollHistory.length;

    const record = store.paySalary(staff!.id, 'tien_mat', 'Chi lương tháng 9');
    assert(record !== null, 'Phải sinh bản ghi lương');
    assert.strictEqual(record?.netSalary, expectedNet);
    assert.strictEqual(record?.paymentMethod, 'tien_mat');

    // Kiểm tra lịch sử lương đã thêm 1
    assert.strictEqual(useStaffStore.getState().payrollHistory.length, initialRecordsCount + 1);

    // Kiểm tra nhân viên đã được reset công về 0
    const resetStaff = useStaffStore.getState().staffList.find((s) => s.id === staff!.id);
    assert.strictEqual(resetStaff?.currentMonthHours, 0);
    assert.strictEqual(resetStaff?.advancePaid, 0);
    assert.strictEqual(resetStaff?.bonus, 0);
    assert.strictEqual(resetStaff?.deduction, 0);
    assert(resetStaff?.lastPaidAt !== undefined);
  });
}
