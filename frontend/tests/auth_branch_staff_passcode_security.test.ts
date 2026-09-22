/**
 * 👑 OngChu Lean POS - Multi-Role Security, Branch & Staff Passcode Usurpation Test Suite
 * Kịch bản kiểm thử toàn diện: Đăng nhập Chủ Quán -> Thiết lập Chi Nhánh -> Thiết lập Nhân Viên -> Tạo Passcode -> Chống Chiếm Quyền.
 */

import { runner, assert } from './harness';
import { useAuthStore, checkRoutePermission } from '../lib/store/useAuthStore';
import { useStaffStore } from '../lib/store/useStaffStore';

export async function runAuthBranchStaffPasscodeSecurityTests() {
  runner.setContext('Auth & Role Security', 'Branch Setup, Staff Passcodes & Anti-Usurpation');

  // =========================================================================
  // GIAI ĐOẠN 1: ĐĂNG NHẬP TÀI KHOẢN CHỦ QUÁN (OWNER LOGIN)
  // =========================================================================
  await runner.test('Giai đoạn 1: Chủ Quán đăng nhập tài khoản xác thực danh tính', async () => {
    const auth = useAuthStore.getState();

    // 1. Đăng nhập sai mật khẩu -> Bị từ chối
    const failRes = await auth.loginWithCredentials('tiemtra_ongchu', 'owner', 'sai_mat_khau');
    assert.isFalse(failRes.success, 'Đăng nhập sai mật khẩu phải thất bại');

    // 2. Đăng nhập đúng mật khẩu Chủ Quán
    const loginRes = await auth.loginWithCredentials('tiemtra_ongchu', 'owner', 'secret123', 'branch_01');
    assert.isTrue(loginRes.success, 'Đăng nhập đúng mật khẩu phải thành công');

    const state = useAuthStore.getState();
    assert.isTrue(state.isAuthenticated, 'Trạng thái xác thực phải là true');
    assert.strictEqual(state.currentRole, 'owner', 'Vai trò phải là owner (Chủ Quán)');
    assert.isTrue(state.isOwner(), 'isOwner() phải trả về true');
    assert.isTrue(Boolean(state.token), 'Phải có token phiên làm việc');
  });

  // =========================================================================
  // GIAI ĐOẠN 2: THIẾT LẬP CHI NHÁNH & BẢO VỆ CHUYỂN ĐỔI (BRANCH SETUP)
  // =========================================================================
  let newBranchId = '';
  await runner.test('Giai đoạn 2: Chủ Quán thiết lập chi nhánh mới & chuyển đổi hợp lệ', () => {
    const auth = useAuthStore.getState();
    const initialCount = auth.branches.length;

    // 1. Chủ Quán tạo thêm chi nhánh mới
    const addRes = auth.addBranch({
      code: 'CN-Q7-PMH',
      name: 'Chi Nhánh 4 (Phú Mỹ Hưng Q7)',
      address: '101 Tôn Dật Tiên, Tân Phong, Quận 7',
      phone: '028 5411 9999',
    });

    assert.isTrue(addRes.success, 'Chủ quán tạo chi nhánh mới phải thành công');
    assert.isTrue(Boolean(addRes.id), 'Chi nhánh mới phải có ID');
    newBranchId = addRes.id || '';

    const updatedBranches = useAuthStore.getState().branches;
    assert.strictEqual(updatedBranches.length, initialCount + 1, 'Số lượng chi nhánh phải tăng thêm 1');

    // 2. Chủ Quán chuyển đổi sang chi nhánh mới vừa tạo
    auth.switchBranch(newBranchId);
    assert.strictEqual(useAuthStore.getState().activeBranchId, newBranchId, 'Chủ quán chuyển chi nhánh thành công');

    // 3. Chủ Quán cập nhật thông tin chi nhánh
    const updateRes = auth.updateBranch(newBranchId, { name: 'Chi Nhánh 4 - Flagship PMH' });
    assert.isTrue(updateRes.success, 'Cập nhật chi nhánh thành công');
    const branch = useAuthStore.getState().branches.find((b) => b.id === newBranchId);
    assert.strictEqual(branch?.name, 'Chi Nhánh 4 - Flagship PMH', 'Tên chi nhánh đã được cập nhật');

    // Chuyển lại về branch_01
    auth.switchBranch('branch_01');
    assert.strictEqual(useAuthStore.getState().activeBranchId, 'branch_01');
  });

  // =========================================================================
  // GIAI ĐOẠN 3: THIẾT LẬP NHÂN VIÊN & TẠO PASSCODE RIÊNG BIỆT
  // =========================================================================
  let staffCashierId = '';
  let staffServerId = '';
  let staffManagerId = '';

  await runner.test('Giai đoạn 3: Thiết lập danh sách nhân viên và tạo Passcode bảo mật', () => {
    const staffStore = useStaffStore.getState();

    // 1. Tạo nhân viên Thu Ngân mới
    const cashier = staffStore.addStaff({
      name: 'Lê Thu Thảo',
      phone: '0981112222',
      role: 'thu_ngan',
      wageType: 'hourly',
      wageRate: 26000,
      allowance: 300000,
    });
    staffCashierId = cashier.id;

    // 2. Tạo nhân viên Phục Vụ mới
    const server = staffStore.addStaff({
      name: 'Trần Quốc Huy',
      phone: '0983334444',
      role: 'phuc_vu',
      wageType: 'hourly',
      wageRate: 23000,
      allowance: 200000,
    });
    staffServerId = server.id;

    // 3. Tạo Quản Lý mới
    const manager = staffStore.addStaff({
      name: 'Nguyễn Hoàng Nam',
      phone: '0985556666',
      role: 'quan_ly',
      wageType: 'monthly',
      wageRate: 9000000,
      allowance: 1200000,
    });
    staffManagerId = manager.id;

    // 4. Thiết lập Passcode cho từng người
    // Passcode quá ngắn (< 4 số) -> Bị từ chối
    const shortPinRes = staffStore.setStaffPin(staffCashierId, '12');
    assert.isFalse(shortPinRes.success, 'PIN < 4 chữ số phải bị từ chối');

    // Passcode hợp lệ
    assert.isTrue(staffStore.setStaffPin(staffCashierId, '5566').success, 'Gán PIN 5566 cho Thu Ngân Thảo');
    assert.isTrue(staffStore.setStaffPin(staffServerId, '3344').success, 'Gán PIN 3344 cho Phục Vụ Huy');
    assert.isTrue(staffStore.setStaffPin(staffManagerId, '7788').success, 'Gán PIN 7788 cho Quản Lý Nam');

    // Kiểm tra đã lưu trữ trong store
    const list = useStaffStore.getState().staffList;
    assert.strictEqual(list.find((s) => s.id === staffCashierId)?.pinCode, '5566');
    assert.strictEqual(list.find((s) => s.id === staffServerId)?.pinCode, '3344');
    assert.strictEqual(list.find((s) => s.id === staffManagerId)?.pinCode, '7788');
  });

  // =========================================================================
  // GIAI ĐOẠN 4: ĐĂNG NHẬP NHANH BẰNG PASSCODE VỪA TẠO
  // =========================================================================
  await runner.test('Giai đoạn 4: Đăng nhập nhanh bằng Passcode nhận diện đúng nhân sự & vai trò', async () => {
    const auth = useAuthStore.getState();
    auth.logout();
    assert.isFalse(useAuthStore.getState().isAuthenticated);

    // 1. Thu Ngân Thảo đăng nhập bằng PIN 5566
    const resCashier = await auth.loginWithPin('5566');
    assert.isTrue(resCashier.success, 'Thu Ngân đăng nhập PIN 5566 thành công');
    assert.strictEqual(useAuthStore.getState().currentRole, 'cashier', 'Vai trò nhận diện là cashier');
    assert.strictEqual(useAuthStore.getState().currentUser.name, 'Lê Thu Thảo', 'Tên nhân sự là Lê Thu Thảo');
    assert.isTrue(useAuthStore.getState().isCashier(), 'isCashier() = true');

    // 2. Phục Vụ Huy đăng nhập bằng PIN 3344
    auth.logout();
    const resServer = await auth.loginWithPin('3344');
    assert.isTrue(resServer.success, 'Phục Vụ đăng nhập PIN 3344 thành công');
    assert.strictEqual(useAuthStore.getState().currentRole, 'server', 'Vai trò nhận diện là server');
    assert.strictEqual(useAuthStore.getState().currentUser.name, 'Trần Quốc Huy');
    assert.isTrue(useAuthStore.getState().isServer(), 'isServer() = true');

    // 3. Quản Lý Nam đăng nhập bằng PIN 7788
    auth.logout();
    const resManager = await auth.loginWithPin('7788');
    assert.isTrue(resManager.success, 'Quản Lý đăng nhập PIN 7788 thành công');
    assert.strictEqual(useAuthStore.getState().currentRole, 'manager', 'Vai trò nhận diện là manager');
    assert.strictEqual(useAuthStore.getState().currentUser.name, 'Nguyễn Hoàng Nam');
    assert.isTrue(useAuthStore.getState().isManager(), 'isManager() = true');
  });

  // =========================================================================
  // GIAI ĐOẠN 5: CHỐNG CHIẾM QUYỀN GIAO DIỆN & ROUTE (ROUTE TAMPERING)
  // =========================================================================
  await runner.test('Giai đoạn 5: Chống chiếm quyền màn hình - Phân định ranh giới 4 cấp vai trò', async () => {
    const auth = useAuthStore.getState();

    // 1. Thu Ngân đăng nhập
    await auth.loginWithPin('5566');
    assert.strictEqual(useAuthStore.getState().currentRole, 'cashier');

    // Thu Ngân BỊ CHẶN tuyệt đối các màn hình nhạy cảm
    assert.isFalse(auth.canAccessRoute('/saas-admin'), 'Thu Ngân KHÔNG THỂ vào SaaS Admin');
    assert.isFalse(auth.canAccessRoute('/nhan-su'), 'Thu Ngân KHÔNG THỂ xem Bảng Lương & Nhân Sự');
    assert.isFalse(auth.canAccessRoute('/cai-dat'), 'Thu Ngân KHÔNG THỂ vào Cài Đặt Quán / VietQR');
    assert.isFalse(auth.canAccessRoute('/bao-cao-loi-nhuan'), 'Thu Ngân KHÔNG THỂ xem Lợi Nhuận Bỏ Túi');

    // Thu Ngân ĐƯỢC PHÉP vận hành thu ngân
    assert.isTrue(auth.canAccessRoute('/'), 'Thu Ngân được bán hàng');
    assert.isTrue(auth.canAccessRoute('/kds'), 'Thu Ngân được xem KDS');
    assert.isTrue(auth.canAccessRoute('/hoa-don'), 'Thu Ngân được xem Sổ Đơn');
    assert.isTrue(auth.canAccessRoute('/so-quy'), 'Thu Ngân được xem Sổ Quỹ ca mình');
    assert.isTrue(auth.canAccessRoute('/giao-ca'), 'Thu Ngân được Giao Ca');

    // 2. Phục Vụ đăng nhập
    await auth.loginWithPin('3344');
    assert.strictEqual(useAuthStore.getState().currentRole, 'server');

    // Phục Vụ BỊ CHẶN cả Sổ Quỹ và Giao Ca
    assert.isFalse(auth.canAccessRoute('/so-quy'), 'Phục Vụ KHÔNG THỂ xem Sổ Quỹ');
    assert.isFalse(auth.canAccessRoute('/giao-ca'), 'Phục Vụ KHÔNG THỂ vào Giao Ca / Mở Két');
    assert.isFalse(auth.canAccessRoute('/nhan-su'), 'Phục Vụ KHÔNG THỂ xem Lương');
    assert.isFalse(auth.canAccessRoute('/cai-dat'), 'Phục Vụ KHÔNG THỂ vào Cài Đặt');

    // Phục Vụ ĐƯỢC gọi món & xem KDS
    assert.isTrue(auth.canAccessRoute('/'), 'Phục Vụ được gọi món');
    assert.isTrue(auth.canAccessRoute('/kds'), 'Phục Vụ được xem bếp');

    // 3. Quản Lý đăng nhập
    await auth.loginWithPin('7788');
    assert.strictEqual(useAuthStore.getState().currentRole, 'manager');

    // Quản Lý ĐƯỢC xem P&L, Sổ Quỹ, Giao Ca
    assert.isTrue(auth.canAccessRoute('/so-quy'));
    assert.isTrue(auth.canAccessRoute('/giao-ca'));
    assert.isTrue(auth.canAccessRoute('/bao-cao-loi-nhuan'));

    // NHƯNG BỊ KHÓA Nhân Sự Lương và Cài Đặt Chủ Quán
    assert.isFalse(auth.canAccessRoute('/nhan-su'), 'Quản Lý KHÔNG THỂ vào Nhân Sự Lương');
    assert.isFalse(auth.canAccessRoute('/cai-dat'), 'Quản Lý KHÔNG THỂ đổi Cài Đặt Quán / VietQR');
    assert.isFalse(auth.canAccessRoute('/saas-admin'), 'Quản Lý KHÔNG THỂ vào SaaS Admin');
  });

  // =========================================================================
  // GIAI ĐOẠN 6: CHỐNG CHIẾM QUYỀN DUYỆT TÁC VỤ NGUY HIỂM (PIN HIJACKING)
  // =========================================================================
  await runner.test('Giai đoạn 6: Chống chiếm quyền duyệt hủy món & chiết khấu bằng PIN cá nhân', async () => {
    const auth = useAuthStore.getState();

    // Thu Ngân đang trực ca
    await auth.loginWithPin('5566');
    assert.isTrue(auth.isCashier());

    // Các hành động rủi ro thất thoát đều bắt buộc có Quản lý phê duyệt
    assert.isTrue(auth.requiresManagerApproval('void_item'), 'Hủy món yêu cầu duyệt');
    assert.isTrue(auth.requiresManagerApproval('void_order'), 'Hủy đơn yêu cầu duyệt');
    assert.isTrue(auth.requiresManagerApproval('excessive_discount'), 'Chiết khấu lớn yêu cầu duyệt');

    // 1. Thu Ngân thử nhập mã PIN của chính mình (5566) để tự duyệt
    const selfPinRes = await auth.verifyManagerPin('5566', 'void_item');
    assert.isFalse(selfPinRes.success, 'Thu Ngân dùng PIN của mình tự duyệt -> PHẢI BỊ CHẶN!');

    // 2. Thu Ngân thử dùng PIN của Phục Vụ (3344)
    const serverPinRes = await auth.verifyManagerPin('3344', 'void_item');
    assert.isFalse(serverPinRes.success, 'Dùng PIN phục vụ duyệt -> PHẢI BỊ CHẶN!');

    // 3. Nhập mã PIN bừa (0000, 1234)
    const randomPinRes = await auth.verifyManagerPin('1234', 'void_item');
    assert.isFalse(randomPinRes.success, 'Nhập PIN sai -> PHẢI BỊ CHẶN!');

    // 4. Quản lý đứng ra nhập mã PIN Quản Lý (8888 hoặc 9999)
    auth.setManagerPin('8888');
    auth.setOwnerPin('9999');
    const validManagerRes = await auth.verifyManagerPin('8888', 'void_item');
    assert.isTrue(validManagerRes.success, 'Nhập đúng PIN Quản Lý -> Phê duyệt thành công');

    const validOwnerRes = await auth.verifyManagerPin('9999', 'void_item');
    assert.isTrue(validOwnerRes.success, 'Nhập đúng PIN Chủ Quán -> Phê duyệt thành công');
  });

  // =========================================================================
  // GIAI ĐOẠN 7: CHỐNG CHIẾM ĐOẠT CHI NHÁNH (MULTI-BRANCH ISOLATION)
  // =========================================================================
  await runner.test('Giai đoạn 7: Chống chiếm đoạt chi nhánh - Nhân viên không thể đổi hoặc sửa chi nhánh', async () => {
    const auth = useAuthStore.getState();

    // Thu Ngân Thảo đang làm việc tại branch_01
    await auth.loginWithPin('5566');
    assert.strictEqual(useAuthStore.getState().activeBranchId, 'branch_01');

    // 1. Thu Ngân cố tình gọi switchBranch để nhảy sang branch_02
    auth.switchBranch('branch_02');
    assert.strictEqual(
      useAuthStore.getState().activeBranchId,
      'branch_01',
      'Thu Ngân KHÔNG THỂ chuyển đổi chi nhánh -> Vẫn giữ nguyên branch_01!'
    );

    // 2. Thu Ngân cố tình gọi addBranch để tạo chi nhánh giả mạo
    const addFakeBranch = auth.addBranch({
      code: 'CN-GIA-MAO',
      name: 'Chi Nhánh Hack',
      address: 'Nowhere',
      phone: '000',
    });
    assert.isFalse(addFakeBranch.success, 'Thu Ngân gọi addBranch -> BỊ TỪ CHỐI');
    assert.strictEqual(addFakeBranch.error, 'Chỉ Chủ Quán mới có quyền tạo thêm chi nhánh');

    // 3. Thu Ngân cố tình gọi updateBranch để đổi thông tin chi nhánh
    const updateFakeBranch = auth.updateBranch('branch_01', { name: 'Chi Nhánh Bị Chiếm Quyền' });
    assert.isFalse(updateFakeBranch.success, 'Thu Ngân gọi updateBranch -> BỊ TỪ CHỐI');
    assert.strictEqual(updateFakeBranch.error, 'Chỉ Chủ Quán mới có quyền chỉnh sửa chi nhánh');

    // Kiểm tra tên chi nhánh không bị thay đổi
    const br1 = useAuthStore.getState().branches.find((b) => b.id === 'branch_01');
    assert.isTrue(br1?.name !== 'Chi Nhánh Bị Chiếm Quyền');
  });

  // =========================================================================
  // GIAI ĐOẠN 8: CHỐNG CHIẾM QUYỀN GỠ MÁY KIOSK (DEVICE UNBIND PROTECTION)
  // =========================================================================
  await runner.test('Giai đoạn 8: Chống gỡ máy Kiosk POS trái phép bằng PIN nhân viên', async () => {
    const auth = useAuthStore.getState();

    // Đảm bảo thiết bị đang gắn với Kiosk
    assert.isTrue(useAuthStore.getState().deviceBinding.isBound);

    // 1. Thu Ngân nhập PIN cá nhân (5566) cố gỡ Kiosk
    const unbindSelf = await auth.unbindDevice('5566');
    assert.isFalse(unbindSelf.success, 'Dùng PIN Thu Ngân gỡ Kiosk -> BỊ CHẶN');
    assert.isTrue(useAuthStore.getState().deviceBinding.isBound, 'Thiết bị vẫn bị khóa chặt vào Kiosk');

    // 2. Quản Lý nhập PIN (8888) cố gỡ Kiosk (chỉ Chủ Quán hoặc SaaS Master Key mới được gỡ)
    const unbindMgr = await auth.unbindDevice('8888');
    assert.isFalse(unbindMgr.success, 'Dùng PIN Quản Lý gỡ Kiosk -> BỊ CHẶN');
    assert.isTrue(useAuthStore.getState().deviceBinding.isBound);

    // 3. Chỉ PIN Chủ Quán (9999) hoặc Mã Cứu Hộ SaaS (998877) mới gỡ được Kiosk
    auth.setOwnerPin('9999');
    const unbindOwner = await auth.unbindDevice('9999');
    assert.isTrue(unbindOwner.success, 'PIN Chủ Quán gỡ Kiosk -> Thành công');
    assert.isFalse(useAuthStore.getState().deviceBinding.isBound, 'Thiết bị đã được mở khóa về máy mới');

    // Liên kết lại Kiosk cho các luồng hoạt động tiếp theo
    auth.bindDevice('branch_01', 'pos', 'Máy POS Quầy 01');
    assert.isTrue(useAuthStore.getState().deviceBinding.isBound);
  });

  // =========================================================================
  // GIAI ĐOẠN 9: CHỐNG CHIẾM QUYỀN CHỦ DỰ ÁN SAAS (ZERO-TRUST SUPER ADMIN)
  // =========================================================================
  await runner.test('Giai đoạn 9: Bảo vệ Zero-Trust ngăn chặn chiếm quyền tài khoản Chủ Dự Án SaaS', async () => {
    const auth = useAuthStore.getState();

    // 1. Cố tình đăng nhập user 'saas' hoặc 'admin' không có Root Master Key 64 ký tự
    const hack1 = await auth.loginWithCredentials('ongchu', 'admin', '123456');
    assert.isFalse(hack1.success, 'Đăng nhập admin không có Root Master Key -> BỊ CHẶN');
    assert.isTrue(Boolean(hack1.error?.includes('64 ký tự')));

    // 2. Cố tình đăng nhập tài khoản Chủ Dự Án với sai mật khẩu -> Bị từ chối
    const hack2 = await auth.loginWithCredentials('ongchu', 'nguyenlocthanh291097', 'SaiMatKhau123');
    assert.isFalse(hack2.success, 'Sai mật khẩu Chủ Dự Án SaaS -> BỊ CHẶN');

    // 3. Nhập mã PIN đặc quyền 0000 hoặc 7777 -> Bị yêu cầu Khóa 64 ký tự
    const pinHack = await auth.loginWithPin('0000');
    assert.isFalse(pinHack.success);
    assert.isTrue(Boolean(pinHack.requiresMasterKey), 'requiresMasterKey = true');

    // 4. Chủ Quán (owner) tuyệt đối không được phép bước chân vào cổng quản trị /saas-admin
    assert.isFalse(checkRoutePermission('owner', '/saas-admin'), 'Chủ Quán bị chặn ngoài /saas-admin');
  });

  // =========================================================================
  // GIAI ĐOẠN 10: KHÔI PHỤC PHIÊN LÀM VIỆC AN TOÀN CHO HỆ THỐNG
  // =========================================================================
  await runner.test('Giai đoạn 10: Khôi phục phiên làm việc an toàn chuẩn ca quầy', () => {
    const auth = useAuthStore.getState();
    auth.quickDemoLogin('cashier');
    assert.isTrue(useAuthStore.getState().isAuthenticated);
    assert.strictEqual(useAuthStore.getState().currentRole, 'cashier');
    assert.strictEqual(useAuthStore.getState().activeBranchId, 'branch_01');
  });
}
