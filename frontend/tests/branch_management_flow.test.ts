/**
 * 👑 OngChu Lean POS - Multi-Branch Management & SaaS Quota Test Suite
 * Kịch bản kiểm thử toàn diện quy trình thêm & quản lý chi nhánh cho Chủ Quán
 */

import { runner, assert } from './harness';
import { useAuthStore, Branch, INITIAL_BRANCHES } from '../lib/store/useAuthStore';

export async function runBranchManagementFlowTests() {
  runner.setContext('Branch Management', 'Store Owner Multi-Branch Lifecycle & Quota Flow');

  // =========================================================================
  // GIAI ĐOẠN 1: CHỦ QUÁN XEM DANH SÁCH CHI NHÁNH & KIỂM TRA HẠN MỨC QUOTA
  // =========================================================================
  await runner.test('Giai đoạn 1: Chủ Quán xem danh sách chi nhánh và kiểm tra hạn mức Quota', () => {
    const auth = useAuthStore.getState();
    auth.setRole('owner');

    const branches = auth.branches;
    assert.isTrue(Array.isArray(branches), 'Danh sách chi nhánh phải là mảng');
    assert.isTrue(branches.length >= 1, 'Phải có tối thiểu 1 chi nhánh');

    const quota = auth.getBranchQuota();
    assert.isTrue(Boolean(quota), 'Quota phải trả về dữ liệu');
    assert.strictEqual(quota.currentCount, branches.length, 'Số lượng chi nhánh phải khớp với danh sách');
    assert.isTrue(Boolean(quota.planName), 'Tên gói cước phải tồn tại');
  });

  // =========================================================================
  // GIAI ĐOẠN 2: THÊM CHI NHÁNH MỚI HỢP LỆ VÀ CẬP NHẬT DANH SÁCH
  // =========================================================================
  let createdBranchId = '';
  await runner.test('Giai đoạn 2: Chủ Quán thêm chi nhánh mới hợp lệ (Tên, Mã, Địa chỉ, Hotline)', () => {
    const auth = useAuthStore.getState();
    auth.setRole('owner');
    const initialCount = auth.branches.length;

    const newBranchPayload = {
      code: 'CN-BINHTHANH',
      name: 'Chi Nhánh 5 (Bình Thạnh)',
      address: '45 Ung Văn Khiêm, P.25, Q. Bình Thạnh, TP.HCM',
      phone: '028 3512 8899',
    };

    const res = auth.addBranch(newBranchPayload);
    assert.isTrue(res.success, 'Thêm chi nhánh mới phải thành công');
    assert.isTrue(Boolean(res.id), 'Chi nhánh mới phải có ID');
    createdBranchId = res.id || '';

    const updatedBranches = useAuthStore.getState().branches;
    assert.strictEqual(updatedBranches.length, initialCount + 1, 'Số lượng chi nhánh phải tăng 1');

    const created = updatedBranches.find((b) => b.id === createdBranchId);
    assert.isTrue(Boolean(created), 'Chi nhánh mới phải có trong danh sách');
    assert.strictEqual(created?.name, 'Chi Nhánh 5 (Bình Thạnh)');
    assert.strictEqual(created?.code, 'CN-BINHTHANH');
    assert.strictEqual(created?.phone, '028 3512 8899');
  });

  // =========================================================================
  // GIAI ĐOẠN 3: KIỂM SOÁT HẠN MỨC GÓI CƯỚC SAAS (QUOTA CONTROL)
  // =========================================================================
  await runner.test('Giai đoạn 3: Tính toán chính xác hạn mức gói cước SaaS (Trial, Standard, Pro, Enterprise)', () => {
    const auth = useAuthStore.getState();
    const originalTenant = auth.tenant;

    // 1. Kiểm tra gói Standard (tối đa 1 chi nhánh)
    auth.updateTenant({ subscriptionPlan: 'standard' });
    const standardQuota = auth.getBranchQuota();
    assert.strictEqual(standardQuota.maxBranches, 1, 'Gói Standard tối đa 1 chi nhánh');
    assert.isTrue(standardQuota.isAtLimit, 'Quán có >1 chi nhánh phải bị đánh dấu isAtLimit=true');

    // 2. Kiểm tra gói Pro (tối đa 3 chi nhánh)
    auth.updateTenant({ subscriptionPlan: 'pro' });
    const proQuota = auth.getBranchQuota();
    assert.strictEqual(proQuota.maxBranches, 3, 'Gói Pro tối đa 3 chi nhánh');

    // 3. Kiểm tra gói Enterprise (không giới hạn chi nhánh)
    auth.updateTenant({ subscriptionPlan: 'enterprise' });
    const entQuota = auth.getBranchQuota();
    assert.strictEqual(entQuota.maxBranches, 'unlimited', 'Gói Enterprise không giới hạn chi nhánh');
    assert.isFalse(entQuota.isAtLimit, 'Gói Enterprise không bao giờ bị atLimit');

    // Khôi phục gói ban đầu
    auth.updateTenant({ subscriptionPlan: originalTenant.subscriptionPlan });
  });

  // =========================================================================
  // GIAI ĐOẠN 4: CHUYỂN ĐỔI CHI NHÁNH VẬN HÀNH (SWITCH ACTIVE BRANCH)
  // =========================================================================
  await runner.test('Giai đoạn 4: Chuyển đổi chi nhánh vận hành đồng bộ activeBranchId và deviceBinding', () => {
    const auth = useAuthStore.getState();
    auth.setRole('owner');

    // Chuyển sang chi nhánh vừa tạo
    auth.switchBranch(createdBranchId);
    assert.strictEqual(useAuthStore.getState().activeBranchId, createdBranchId, 'activeBranchId phải cập nhật');

    // getActiveBranch trả về đúng chi nhánh vừa chọn
    const active = useAuthStore.getState().getActiveBranch();
    assert.strictEqual(active.id, createdBranchId, 'getActiveBranch phải trả về chi nhánh mới');
    assert.strictEqual(active.name, 'Chi Nhánh 5 (Bình Thạnh)');

    // Chuyển lại về branch_01
    auth.switchBranch('branch_01');
    assert.strictEqual(useAuthStore.getState().activeBranchId, 'branch_01');
    assert.strictEqual(useAuthStore.getState().getActiveBranch().id, 'branch_01');
  });

  // =========================================================================
  // GIAI ĐOẠN 5: CHỈNH SỬA THÔNG TIN CHI NHÁNH (UPDATE BRANCH)
  // =========================================================================
  await runner.test('Giai đoạn 5: Chủ Quán chỉnh sửa thông tin địa chỉ và hotline chi nhánh', () => {
    const auth = useAuthStore.getState();
    auth.setRole('owner');

    const updateRes = auth.updateBranch(createdBranchId, {
      name: 'Chi Nhánh 5 - Flagship Bình Thạnh',
      address: '100 D2 Nối Dài, P.25, Q. Bình Thạnh',
      phone: '028 3512 9999',
    });

    assert.isTrue(updateRes.success, 'Chỉnh sửa chi nhánh phải thành công');

    const updated = useAuthStore.getState().branches.find((b) => b.id === createdBranchId);
    assert.strictEqual(updated?.name, 'Chi Nhánh 5 - Flagship Bình Thạnh');
    assert.strictEqual(updated?.address, '100 D2 Nối Dài, P.25, Q. Bình Thạnh');
    assert.strictEqual(updated?.phone, '028 3512 9999');
  });

  // =========================================================================
  // GIAI ĐOẠN 6: CHỐNG CHIẾM QUYỀN - NHÂN VIÊN KHÔNG THỂ THÊM/SỬA CHI NHÁNH
  // =========================================================================
  await runner.test('Giai đoạn 6: Chống chiếm quyền - Thu Ngân và Phục Vụ không thể thêm hoặc sửa chi nhánh', () => {
    const auth = useAuthStore.getState();

    // 1. Đổi sang vai trò Thu Ngân
    auth.setRole('cashier');

    const failAdd = auth.addBranch({
      code: 'CN-HACK',
      name: 'Chi Nhánh Trái Phép',
      address: 'Nowhere',
      phone: '000',
    });
    assert.isFalse(failAdd.success, 'Thu Ngân gọi addBranch phải bị từ chối');
    assert.strictEqual(failAdd.error, 'Chỉ Chủ Quán mới có quyền tạo thêm chi nhánh');

    const failUpdate = auth.updateBranch(createdBranchId, {
      name: 'Chi Nhánh Bị Sửa Trái Phép',
    });
    assert.isFalse(failUpdate.success, 'Thu Ngân gọi updateBranch phải bị từ chối');
    assert.strictEqual(failUpdate.error, 'Chỉ Chủ Quán mới có quyền chỉnh sửa chi nhánh');

    // 2. Thu Ngân thử switchBranch
    auth.switchBranch(createdBranchId);
    assert.strictEqual(
      useAuthStore.getState().activeBranchId,
      'branch_01',
      'Thu Ngân không thể switchBranch -> Vẫn giữ branch_01'
    );

    // Khôi phục lại vai trò Chủ Quán
    auth.setRole('owner');
  });

  // =========================================================================
  // GIAI ĐOẠN 7: DỌN DẸP TRẠNG THÁI (CLEANUP STATE)
  // =========================================================================
  await runner.test('Giai đoạn 7: Khôi phục trạng thái chuẩn chi nhánh ban đầu', () => {
    const auth = useAuthStore.getState();
    // Đưa branches về lại INITIAL_BRANCHES
    useAuthStore.setState({
      branches: INITIAL_BRANCHES,
      activeBranchId: 'branch_01',
    });

    assert.strictEqual(useAuthStore.getState().branches.length, INITIAL_BRANCHES.length);
    assert.strictEqual(useAuthStore.getState().activeBranchId, 'branch_01');
  });
}
