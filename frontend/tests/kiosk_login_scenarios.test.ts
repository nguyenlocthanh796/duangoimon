/**
 * 👑 OngChu Lean POS - Kiosk Login Scenarios & Adversarial Test Suite
 * Covers: PIN entry, Shift switching, Screen lock, Device binding & unbinding security,
 * SaaS account enrollment, and Route permission boundaries.
 */

import { runner, assert } from './harness';
import { useAuthStore, checkRoutePermission, UserRole } from '../lib/store/useAuthStore';

export async function runKioskLoginScenarioTests() {
  runner.setContext('Kiosk Scenarios', 'Full Kiosk Login, Shift, Security & Enrollment Matrix');

  // ==========================================
  // NHÓM A: NHẬP MÃ PIN VÀO CA (STAFF PIN SHIFT)
  // ==========================================

  await runner.test('Scenario A1: Nhập đúng PIN Phục Vụ (1111) -> Vào ca Server, hạn chế màn quản lý', async () => {
    const auth = useAuthStore.getState();
    auth.logout();

    const res = await auth.loginWithPin('1111');
    assert.isTrue(res.success);

    const state = useAuthStore.getState();
    assert.isTrue(state.isAuthenticated);
    assert.strictEqual(state.currentRole, 'server');
    assert.isTrue(state.isServer());
    assert.isFalse(state.isCashier());
    assert.isFalse(state.isManager());
    assert.isFalse(state.isOwner());

    // Quyền: Phục vụ chỉ được gọi món và xem KDS
    assert.isTrue(checkRoutePermission('server', '/'));
    assert.isTrue(checkRoutePermission('server', '/kds'));
    assert.isFalse(checkRoutePermission('server', '/so-quy'));
    assert.isFalse(checkRoutePermission('server', '/giao-ca'));
    assert.isFalse(checkRoutePermission('server', '/bao-cao-loi-nhuan'));
    assert.isFalse(checkRoutePermission('server', '/nhan-su'));
    assert.isFalse(checkRoutePermission('server', '/cai-dat'));
  });

  await runner.test('Scenario A2: Nhập đúng PIN Thu Ngân (2222) -> Vào ca Cashier, có quyền Sổ Quỹ & Giao Ca', async () => {
    const auth = useAuthStore.getState();
    auth.logout();

    const res = await auth.loginWithPin('2222');
    assert.isTrue(res.success);

    const state = useAuthStore.getState();
    assert.isTrue(state.isAuthenticated);
    assert.strictEqual(state.currentRole, 'cashier');
    assert.isTrue(state.isCashier());

    // Quyền: Thu ngân được bán hàng, xem KDS, ghi sổ quỹ và giao ca
    assert.isTrue(checkRoutePermission('cashier', '/'));
    assert.isTrue(checkRoutePermission('cashier', '/kds'));
    assert.isTrue(checkRoutePermission('cashier', '/so-quy'));
    assert.isTrue(checkRoutePermission('cashier', '/giao-ca'));
    assert.isFalse(checkRoutePermission('cashier', '/nhan-su'));
    assert.isFalse(checkRoutePermission('cashier', '/cai-dat'));
    assert.isFalse(checkRoutePermission('cashier', '/bao-cao-loi-nhuan'));
  });

  await runner.test('Scenario A3: Nhập đúng PIN Quản Lý (8888) -> Vào ca Manager, mở quyền Báo Cáo Lợi Nhuận', async () => {
    const auth = useAuthStore.getState();
    auth.logout();

    const res = await auth.loginWithPin('8888');
    assert.isTrue(res.success);

    const state = useAuthStore.getState();
    assert.isTrue(state.isAuthenticated);
    assert.strictEqual(state.currentRole, 'manager');
    assert.isTrue(state.isManager());

    // Quyền: Quản lý xem được báo cáo lợi nhuận, nhưng không sửa nhân sự hay cài đặt quán
    assert.isTrue(checkRoutePermission('manager', '/'));
    assert.isTrue(checkRoutePermission('manager', '/so-quy'));
    assert.isTrue(checkRoutePermission('manager', '/giao-ca'));
    assert.isTrue(checkRoutePermission('manager', '/bao-cao-loi-nhuan'));
    assert.isFalse(checkRoutePermission('manager', '/nhan-su'));
    assert.isFalse(checkRoutePermission('manager', '/cai-dat'));
  });

  await runner.test('Scenario A4: Nhập đúng PIN Chủ Quán (9999) -> Vào ca Owner, full quyền 100%', async () => {
    const auth = useAuthStore.getState();
    auth.setOwnerPin('9999');
    auth.logout();

    const res = await auth.loginWithPin('9999');
    assert.isTrue(res.success);

    const state = useAuthStore.getState();
    assert.isTrue(state.isAuthenticated);
    assert.strictEqual(state.currentRole, 'owner');
    assert.isTrue(state.isOwner());

    // Quyền: Chủ quán truy cập toàn quyền
    assert.isTrue(checkRoutePermission('owner', '/nhan-su'));
    assert.isTrue(checkRoutePermission('owner', '/cai-dat'));
    assert.isTrue(checkRoutePermission('owner', '/bao-cao-loi-nhuan'));
    assert.isTrue(checkRoutePermission('owner', '/so-quy'));
  });

  await runner.test('Scenario A5: Nhập sai mã PIN (0000, 1234, 9998) -> Bị từ chối và báo lỗi', async () => {
    const auth = useAuthStore.getState();
    auth.logout();

    const wrongPins = ['0000', '1234', '9998', 'abcd', '111', ''];
    for (const pin of wrongPins) {
      const res = await auth.loginWithPin(pin);
      assert.isFalse(res.success, `PIN [${pin}] phải bị từ chối`);
      assert.isTrue(res.error !== undefined && res.error.length > 0);
    }

    const state = useAuthStore.getState();
    assert.isFalse(state.isAuthenticated);
    assert.strictEqual(state.token, undefined);
  });

  // ==========================================
  // NHÓM B: KHÓA MÀN HÌNH & ĐỔI CA (LOCK & SWITCH SHIFT)
  // ==========================================

  await runner.test('Scenario B1: Nhân viên bấm Khóa Máy (Tạm Rời) -> Xóa phiên nhưng giữ nguyên Kiosk binding', () => {
    const auth = useAuthStore.getState();
    // Đang trong ca thu ngân
    auth.quickDemoLogin('cashier');
    assert.isTrue(useAuthStore.getState().isAuthenticated);

    // Khóa màn hình tạm rời quầy
    auth.lockScreen();

    const state = useAuthStore.getState();
    assert.isFalse(state.isAuthenticated);
    assert.strictEqual(state.token, undefined);
    assert.isTrue(state.deviceBinding.isBound); // Thiết bị vẫn khóa Kiosk
  });

  await runner.test('Scenario B2: Bàn giao ca mới -> Đăng xuất người cũ, người mới nhập PIN thành công', async () => {
    const auth = useAuthStore.getState();

    // 1. Thu Ngân (2222) kết thúc ca
    await auth.loginWithPin('2222');
    assert.strictEqual(useAuthStore.getState().currentRole, 'cashier');

    // 2. Bấm Đổi Ca
    auth.logout();
    assert.isFalse(useAuthStore.getState().isAuthenticated);

    // 3. Phục Vụ (1111) nhận ca mới
    const res = await auth.loginWithPin('1111');
    assert.isTrue(res.success);
    assert.strictEqual(useAuthStore.getState().currentRole, 'server');
  });

  // ==========================================
  // NHÓM C: AN NINH GỠ THIẾT BỊ (UNBIND SECURITY)
  // ==========================================

  await runner.test('Scenario C1: Nhân viên cố tình gỡ máy bằng PIN nhân viên hoặc PIN bừa -> Bị chặn đứng', async () => {
    const auth = useAuthStore.getState();
    // Đảm bảo máy đang khóa
    auth.bindDevice('branch_01', 'pos', 'Máy POS Quầy 01');
    assert.isTrue(useAuthStore.getState().deviceBinding.isBound);

    // Thử với PIN Thu Ngân (2222), Phục Vụ (1111), Quản Lý (8888), mã ngẫu nhiên
    const maliciousAttempts = ['2222', '1111', '8888', '0000', '123456', 'admin'];
    for (const attempt of maliciousAttempts) {
      const res = await auth.unbindDevice(attempt);
      assert.isFalse(res.success, `Mã gỡ [${attempt}] không được phép gỡ máy`);
      assert.isTrue(useAuthStore.getState().deviceBinding.isBound); // Không bị gỡ
    }
  });

  await runner.test('Scenario C2: Chủ Quán nhập đúng PIN Chủ Quán (9999) -> Gỡ thiết bị thành công', async () => {
    const auth = useAuthStore.getState();
    auth.setOwnerPin('9999');
    auth.bindDevice('branch_01', 'pos', 'Máy POS Quầy 01');

    const res = await auth.unbindDevice('9999');
    assert.isTrue(res.success);

    const state = useAuthStore.getState();
    assert.isFalse(state.deviceBinding.isBound);
    assert.isFalse(state.isAuthenticated);
  });

  await runner.test('Scenario C3: Cứu hộ khẩn cấp SaaS Master Rescue Key (998877) -> Gỡ máy thành công', async () => {
    const auth = useAuthStore.getState();
    auth.bindDevice('branch_01', 'pos', 'Máy POS Quầy 01');

    const res = await auth.unbindDevice('998877');
    assert.isTrue(res.success);

    const state = useAuthStore.getState();
    assert.isFalse(state.deviceBinding.isBound);
  });

  // ==========================================
  // NHÓM D: KÍCH HOẠT MÁY MỚI (SAAS ENROLLMENT)
  // ==========================================

  await runner.test('Scenario D1: Kích hoạt SaaS thất bại khi bỏ trống hoặc nhập sai mật khẩu', async () => {
    const auth = useAuthStore.getState();

    // Trống thông tin
    const resEmpty = await auth.loginWithCredentials('', '', '');
    assert.isFalse(resEmpty.success);

    // Sai mật khẩu
    const resWrongPass = await auth.loginWithCredentials('ongchu', 'owner', 'wrong_password_xyz');
    assert.isFalse(resWrongPass.success);
    assert.isTrue(resWrongPass.error !== undefined);
  });

  await runner.test('Scenario D2: Kích hoạt SaaS thành công -> Gán máy vào Chi Nhánh 2 vai trò KDS', async () => {
    const auth = useAuthStore.getState();

    // 1. Xác thực tài khoản chủ quán
    const resAuth = await auth.loginWithCredentials('ongchu', 'owner', '123456', 'branch_02');
    assert.isTrue(resAuth.success);

    // 2. Thiết lập gán máy KDS
    auth.bindDevice('branch_02', 'kds', 'Bếp Lầu 1');

    const state = useAuthStore.getState();
    assert.isTrue(state.deviceBinding.isBound);
    assert.strictEqual(state.deviceBinding.branchId, 'branch_02');
    assert.strictEqual(state.deviceBinding.deviceRole, 'kds');
    assert.strictEqual(state.deviceBinding.deviceName, 'Bếp Lầu 1');

    // Khôi phục lại trạng thái mặc định cho các bài test tiếp theo
    auth.bindDevice('branch_01', 'pos', 'Máy POS Quầy 01');
    auth.quickDemoLogin('cashier');
  });

  await runner.test('Scenario D3: Bật / Tắt KDS phân phối 5 tab cân đối, 100% quyền truy cập hợp lệ', () => {
    // 1. Khi BẬT KDS
    const ownerTabsWithKds = ['/', '/', '/kds', '/hoa-don', '/cai-dat'];
    const cashierTabsWithKds = ['/', '/', '/kds', '/hoa-don', '/giao-ca'];
    const serverTabsWithKds = ['/', '/', '/kds', '/hoa-don', '/huong-dan'];

    ownerTabsWithKds.forEach((route) => assert.isTrue(checkRoutePermission('owner', route)));
    cashierTabsWithKds.forEach((route) => assert.isTrue(checkRoutePermission('cashier', route)));
    serverTabsWithKds.forEach((route) => assert.isTrue(checkRoutePermission('server', route)));

    // 2. Khi TẮT KDS (Trà sữa, cafe nhỏ pha chế tại quầy)
    const ownerTabsNoKds = ['/', '/', '/hoa-don', '/so-quy', '/cai-dat'];
    const cashierTabsNoKds = ['/', '/', '/hoa-don', '/so-quy', '/giao-ca'];
    const serverTabsNoKds = ['/', '/', '/hoa-don', '/cfd', '/huong-dan'];

    ownerTabsNoKds.forEach((route) => assert.isTrue(checkRoutePermission('owner', route)));
    cashierTabsNoKds.forEach((route) => assert.isTrue(checkRoutePermission('cashier', route)));
    serverTabsNoKds.forEach((route) => assert.isTrue(checkRoutePermission('server', route)));
  });
}

