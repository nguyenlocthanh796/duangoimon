/**
 * 👑 OngChu Lean POS - SaaS Multi-Tenant Authentication & Login Test Suite
 */

import { runner, assert } from './harness';
import { useAuthStore, checkRoutePermission, DEFAULT_TENANT } from '../lib/store/useAuthStore';
import { useSaaSAdminStore } from '../lib/store/useSaaSAdminStore';

export async function runSaaSAuthTests() {
  runner.setContext('SaaS Auth', 'Multi-Tenant Authentication & Roles');

  await runner.test('SaaS Tenant: Default tenant structure and active subscription', () => {
    const auth = useAuthStore.getState();
    assert.isTrue(auth.tenant !== null && auth.tenant !== undefined);
    assert.strictEqual(auth.tenant.code, 'ongchu');
    assert.strictEqual(auth.tenant.subscriptionPlan, 'pro');
    assert.isTrue(auth.tenant.licenseDaysLeft! > 0);
  });

  await runner.test('SaaS Login: Rejects empty credentials', async () => {
    const auth = useAuthStore.getState();
    const res1 = await auth.loginWithCredentials('', '', '');
    assert.isFalse(res1.success);
    assert.isTrue(res1.error !== undefined);

    const res2 = await auth.loginWithCredentials('ongchu', '', '123456');
    assert.isFalse(res2.success);
  });

  await runner.test('SaaS Login: Credentials authenticate owner and update tenant info', async () => {
    const auth = useAuthStore.getState();
    const res = await auth.loginWithCredentials('cafe99', 'owner', 'secret123', 'branch_02');
    assert.isTrue(res.success);

    const state = useAuthStore.getState();
    assert.isTrue(state.isAuthenticated);
    assert.strictEqual(state.currentRole, 'owner');
    assert.strictEqual(state.tenant.code, 'cafe99');
    assert.strictEqual(state.activeBranchId, 'branch_02');
    assert.isTrue(state.token !== undefined);
  });

  await runner.test('SaaS Login: Staff PIN 1-tap fast login for Cashier and Server', async () => {
    const auth = useAuthStore.getState();
    const { useStaffStore } = require('../lib/store/useStaffStore');
    useStaffStore.getState().addStaff({
      name: 'Thu Ngân Demo',
      phone: '0901111222',
      role: 'thu_ngan',
      wageType: 'hourly',
      wageRate: 25000,
      allowance: 0,
      overtimeRateMultiplier: 1.5,
      joinDate: '2026-01-01',
      status: 'active',
      currentMonthHours: 0,
      currentMonthShifts: 0,
      currentMonthOtHours: 0,
      bonus: 0,
      deduction: 0,
      advancePaid: 0,
      pinCode: '2222',
      isWorking: false,
    });
    useStaffStore.getState().addStaff({
      name: 'Phục Vụ Demo',
      phone: '0901111333',
      role: 'phuc_vu',
      wageType: 'hourly',
      wageRate: 25000,
      allowance: 0,
      overtimeRateMultiplier: 1.5,
      joinDate: '2026-01-01',
      status: 'active',
      currentMonthHours: 0,
      currentMonthShifts: 0,
      currentMonthOtHours: 0,
      bonus: 0,
      deduction: 0,
      advancePaid: 0,
      pinCode: '1111',
      isWorking: false,
    });

    // Login with Cashier PIN '2222'
    const resCashier = await auth.loginWithPin('2222');
    assert.isTrue(resCashier.success);
    assert.strictEqual(useAuthStore.getState().currentRole, 'cashier');
    assert.isTrue(useAuthStore.getState().isCashier());

    // Login with Server PIN '1111'
    const resServer = await auth.loginWithPin('1111');
    assert.isTrue(resServer.success);
    assert.strictEqual(useAuthStore.getState().currentRole, 'server');
    assert.isTrue(useAuthStore.getState().isServer());

    // Rejects wrong PIN
    const resWrong = await auth.loginWithPin('0000');
    assert.isFalse(resWrong.success);
  });

  await runner.test('SaaS Login: Quick Demo switch allows instant 0ms exploration', () => {
    const auth = useAuthStore.getState();

    auth.quickDemoLogin('manager');
    assert.strictEqual(useAuthStore.getState().currentRole, 'manager');
    assert.isTrue(useAuthStore.getState().isManager());
    assert.strictEqual(useAuthStore.getState().currentUser.name, 'Quản Lý Chi Nhánh 1');

    auth.quickDemoLogin('owner');
    assert.strictEqual(useAuthStore.getState().currentRole, 'owner');
    assert.isTrue(useAuthStore.getState().isOwner());
  });

  await runner.test('SaaS Login: Logout invalidates session', () => {
    const auth = useAuthStore.getState();
    auth.logout();

    const state = useAuthStore.getState();
    assert.isFalse(state.isAuthenticated);
    assert.strictEqual(state.token, undefined);

    // Reset back to authenticated demo cashier
    auth.quickDemoLogin('cashier');
  });

  await runner.test('SaaS Permissions: Route gating enforces Multi-Tenant security boundaries', () => {
    // Cashier cannot access Sensitive Management Screens
    assert.isTrue(checkRoutePermission('cashier', '/'));
    assert.isTrue(checkRoutePermission('cashier', '/kds'));
    assert.isTrue(checkRoutePermission('cashier', '/so-quy'));
    assert.isFalse(checkRoutePermission('cashier', '/nhan-su'));
    assert.isFalse(checkRoutePermission('cashier', '/cai-dat'));
    assert.isFalse(checkRoutePermission('cashier', '/bao-cao-loi-nhuan'));

    // Server only allowed sales and KDS
    assert.isTrue(checkRoutePermission('server', '/'));
    assert.isTrue(checkRoutePermission('server', '/kds'));
    assert.isFalse(checkRoutePermission('server', '/so-quy'));

    // Manager allowed operations but not owner settings or payroll
    assert.isTrue(checkRoutePermission('manager', '/so-quy'));
    assert.isTrue(checkRoutePermission('manager', '/bao-cao-loi-nhuan'));
    assert.isFalse(checkRoutePermission('manager', '/nhan-su'));
    assert.isFalse(checkRoutePermission('manager', '/cai-dat'));

    // Owner allowed 100% routes
    assert.isTrue(checkRoutePermission('owner', '/nhan-su'));
    assert.isTrue(checkRoutePermission('owner', '/cai-dat'));
    assert.isTrue(checkRoutePermission('owner', '/bao-cao-loi-nhuan'));
  });

  await runner.test('Device Binding: Kiosk terminal enrollment binds to branch & device role', () => {
    const auth = useAuthStore.getState();

    // Bind device to Branch 02 as KDS Kitchen Terminal
    auth.bindDevice('branch_02', 'kds', 'Bếp Nóng Lầu 1');

    const state = useAuthStore.getState();
    assert.isTrue(state.deviceBinding.isBound);
    assert.strictEqual(state.deviceBinding.branchId, 'branch_02');
    assert.strictEqual(state.deviceBinding.deviceRole, 'kds');
    assert.strictEqual(state.deviceBinding.deviceName, 'Bếp Nóng Lầu 1');
    assert.strictEqual(state.activeBranchId, 'branch_02');
  });

  await runner.test('Device Binding: Lock screen resets session to PIN pad without unbinding device', () => {
    const auth = useAuthStore.getState();
    auth.quickDemoLogin('cashier');
    assert.isTrue(useAuthStore.getState().isAuthenticated);

    // Cashier leaves counter, locks screen
    auth.lockScreen();

    const state = useAuthStore.getState();
    assert.isFalse(state.isAuthenticated);
    assert.strictEqual(state.token, undefined);
    assert.isTrue(state.deviceBinding.isBound); // Device stays locked to Kiosk mode!
  });

  await runner.test('Device Binding: Unbind rejects wrong PIN and requires Owner PIN or SaaS Recovery Key', async () => {
    const auth = useAuthStore.getState();

    // 1. Wrong PIN is rejected
    const resFail = await auth.unbindDevice('1234');
    assert.isFalse(resFail.success);
    assert.isTrue(useAuthStore.getState().deviceBinding.isBound);

    // 2. SaaS Emergency Key '998877' unbinds successfully
    const resSaaS = await auth.unbindDevice('998877');
    assert.isTrue(resSaaS.success);

    const state = useAuthStore.getState();
    assert.isFalse(state.deviceBinding.isBound);
    assert.isFalse(state.isAuthenticated);

    // Restore default demo device binding for subsequent app tests
    auth.bindDevice('branch_01', 'pos', 'Máy POS Quầy 01');
    auth.quickDemoLogin('cashier');
  });

  await runner.test('SaaS Super Admin: Route Guarding locks Super Admin to /saas-admin and blocks POS sales screens', () => {
    const auth = useAuthStore.getState();

    // 1. Super Admin đăng nhập
    auth.quickDemoLogin('super_admin');
    assert.strictEqual(useAuthStore.getState().currentRole, 'super_admin');
    assert.isTrue(useAuthStore.getState().isSuperAdmin());

    // 2. Super Admin CHỈ ĐƯỢC VÀO /saas-admin
    assert.isTrue(auth.canAccessRoute('/saas-admin'), 'Super Admin có quyền vào /saas-admin');

    // 3. Super Admin BỊ CHẶN TUYỆT ĐỐI khỏi màn hình POS bán hàng và các phân hệ vận hành quán
    assert.isFalse(auth.canAccessRoute('/'), 'Super Admin KHÔNG THỂ ở màn hình POS Bán Hàng');
    assert.isFalse(auth.canAccessRoute('/kds'), 'Super Admin KHÔNG THỂ ở KDS');
    assert.isFalse(auth.canAccessRoute('/hoa-don'), 'Super Admin KHÔNG THỂ ở Sổ Đơn');
    assert.isFalse(auth.canAccessRoute('/so-quy'), 'Super Admin KHÔNG THỂ ở Sổ Quỹ');
    assert.isFalse(auth.canAccessRoute('/giao-ca'), 'Super Admin KHÔNG THỂ ở Giao Ca');
    assert.isFalse(auth.canAccessRoute('/cai-dat'), 'Super Admin KHÔNG THỂ ở Cài Đặt Quán');

    // 4. Kiểm tra cờ Hydration đã được kích hoạt
    assert.isTrue(useAuthStore.getState()._hasHydrated, '_hasHydrated phải là true');

    // 5. Khôi phục lại phiên làm việc demo cashier
    auth.quickDemoLogin('cashier');
  });

  await runner.test('Registration Anti-Collision: Rejects duplicate phone numbers (even with +84, spaces, dashes)', async () => {
    const auth = useAuthStore.getState();

    // Thử đăng ký với SĐT đã tồn tại (0392387165 - Quán Chè Bưởi)
    const res1 = await auth.registerTenant('Tiệm Trà Mới 123', '0392387165', '123456');
    assert.isFalse(res1.success, 'Bắt buộc từ chối SĐT 0392387165 đã tồn tại');
    assert.isTrue(Boolean(res1.error?.includes('Số điện thoại này đã được đăng ký') || res1.error?.includes('đã tồn tại')));

    // Thử đăng ký với SĐT định dạng +84 908 123 456 (OngChu HQ)
    const res2 = await auth.registerTenant('Cà Phê Trứng 99', '+84 908 123 456', '123456');
    assert.isFalse(res2.success, 'Bắt buộc từ chối SĐT +84 908 123 456 đã tồn tại');
    assert.isTrue(Boolean(res2.error?.includes('Số điện thoại này đã được đăng ký') || res2.error?.includes('đã tồn tại')));

    // SĐT sai format (ít hơn 9 số hoặc quá 11 số)
    const resInvalid = await auth.registerTenant('Quán Mới', '123', '123456');
    assert.isFalse(resInvalid.success, 'Từ chối SĐT không hợp lệ');
  });

  await runner.test('Registration Anti-Collision: Rejects duplicate store names (case-insensitive & whitespace)', async () => {
    const auth = useAuthStore.getState();

    // Thử đăng ký với Tên Quán đã tồn tại (Quán Chè Bưởi) bằng số điện thoại mới
    const res1 = await auth.registerTenant('  Quán Chè Bưởi  ', '0977888999', '123456');
    assert.isFalse(res1.success, 'Bắt buộc từ chối Tên Quán "Quán Chè Bưởi" đã tồn tại');
    assert.isTrue(Boolean(res1.error?.includes('Tên quán này đã tồn tại') || res1.error?.includes('thương hiệu')));

    // Thử đăng ký với Tên Quán viết hoa toàn bộ "QUÁN CHÈ BƯỞI & TRÀ SỮA AN GIANG (HQ)"
    const res2 = await auth.registerTenant('QUÁN CHÈ BƯỞI & TRÀ SỮA AN GIANG (HQ)', '0977111222', '123456');
    assert.isFalse(res2.success, 'Bắt buộc từ chối tên quán trùng lặp không phân biệt hoa thường');

    // Tên quán quá ngắn (< 2 ký tự)
    const resShort = await auth.registerTenant('A', '0977000111', '123456');
    assert.isFalse(resShort.success, 'Từ chối tên quán dưới 2 ký tự');
  });

  await runner.test('Registration Flow: Successfully registers new unique store and creates isolated tenant', async () => {
    const auth = useAuthStore.getState();

    const uniqueStoreName = 'Cà Phê Muối Ba Đồn ' + Date.now();
    const uniquePhone = '0966' + Math.floor(100000 + Math.random() * 900000);

    const res = await auth.registerTenant(uniqueStoreName, uniquePhone, 'MatKhau@2026', 'Anh Ba');
    assert.isTrue(res.success, 'Đăng ký thành công với Tên quán và SĐT độc nhất');

    const state = useAuthStore.getState();
    assert.isTrue(state.isAuthenticated);
    assert.strictEqual(state.currentRole, 'owner');
    assert.strictEqual(state.tenant.name, uniqueStoreName);
    assert.strictEqual(state.tenant.phone, uniquePhone);
    assert.strictEqual(state.tenant.subscriptionPlan, 'trial');
    assert.strictEqual(state.tenant.licenseDaysLeft, 30);
    assert.isTrue(state.branches.length > 0);

    // Khôi phục lại phiên demo
    auth.quickDemoLogin('cashier');
  });

  await runner.test('Login Logic: Phone number auto-resolves to correct tenant and authenticates owner', async () => {
    const auth = useAuthStore.getState();

    // 1. Đăng nhập bằng SĐT Quán Chè Bưởi '0392387165'
    const resQQ = await auth.loginWithCredentials('0392387165', 'owner', 'Danh@!26062002', 'branch_01');
    assert.isTrue(resQQ.success, 'Đăng nhập SĐT 0392387165 thành công');
    assert.strictEqual(useAuthStore.getState().tenant.code, 'quanquan');
    assert.strictEqual(useAuthStore.getState().currentRole, 'owner');

    // 2. Đăng nhập bằng SĐT Tiệm Trà Bống '0933555789'
    const resTB = await auth.loginWithCredentials('0933555789', 'owner', '123456');
    assert.isTrue(resTB.success, 'Đăng nhập SĐT 0933555789 thành công');
    assert.strictEqual(useAuthStore.getState().tenant.code, 'trabong');

    // Khôi phục lại demo
    auth.quickDemoLogin('cashier');
  });

  await runner.test('Login Flow: Staff PIN login properly scopes to active tenant', async () => {
    const auth = useAuthStore.getState();
    auth.setOwnerPin('9999');
    auth.setManagerPin('8888');
    const { useStaffStore } = require('../lib/store/useStaffStore');
    useStaffStore.getState().addStaff({
      name: 'Thu Ngân Quán',
      phone: '0901111444',
      role: 'thu_ngan',
      wageType: 'hourly',
      wageRate: 25000,
      allowance: 0,
      overtimeRateMultiplier: 1.5,
      joinDate: '2026-01-01',
      status: 'active',
      currentMonthHours: 0,
      currentMonthShifts: 0,
      currentMonthOtHours: 0,
      bonus: 0,
      deduction: 0,
      advancePaid: 0,
      pinCode: '2222',
      isWorking: false,
    });
    useStaffStore.getState().addStaff({
      name: 'Phục Vụ Quán',
      phone: '0901111555',
      role: 'phuc_vu',
      wageType: 'hourly',
      wageRate: 25000,
      allowance: 0,
      overtimeRateMultiplier: 1.5,
      joinDate: '2026-01-01',
      status: 'active',
      currentMonthHours: 0,
      currentMonthShifts: 0,
      currentMonthOtHours: 0,
      bonus: 0,
      deduction: 0,
      advancePaid: 0,
      pinCode: '1111',
      isWorking: false,
    });

    // 1. PIN Chủ Quán '9999'
    const resOwner = await auth.loginWithPin('9999');
    assert.isTrue(resOwner.success);
    assert.strictEqual(useAuthStore.getState().currentRole, 'owner');

    // 2. PIN Quản Lý '8888'
    const resMgr = await auth.loginWithPin('8888');
    assert.isTrue(resMgr.success);
    assert.strictEqual(useAuthStore.getState().currentRole, 'manager');

    // 3. PIN Thu Ngân '2222'
    const resCashier = await auth.loginWithPin('2222');
    assert.isTrue(resCashier.success);
    assert.strictEqual(useAuthStore.getState().currentRole, 'cashier');

    // 4. PIN Phục Vụ '1111'
    const resServer = await auth.loginWithPin('1111');
    assert.isTrue(resServer.success);
    assert.strictEqual(useAuthStore.getState().currentRole, 'server');

    // Khôi phục lại demo
    auth.quickDemoLogin('cashier');
  });

  await runner.test('Security: Rejects random unregistered phone numbers even with valid passwords', async () => {
    const auth = useAuthStore.getState();

    // Thử đăng nhập với SĐT nhập bừa '0988776655' và mật khẩu 'Danh@!26062002'
    const resRandom = await auth.loginWithCredentials('0988776655', 'owner', 'Danh@!26062002');
    assert.isFalse(resRandom.success, 'Bắt buộc từ chối số điện thoại nhập bừa chưa đăng ký');
    assert.isTrue(Boolean(resRandom.error), 'Phải có thông báo lỗi');

    // Thử đăng nhập với SĐT ngẫu nhiên khác '0912345999' và mật khẩu '123456'
    const resRandom2 = await auth.loginWithCredentials('0912345999', 'owner', '123456');
    assert.isFalse(resRandom2.success, 'Bắt buộc từ chối số điện thoại không tồn tại');
  });

  await runner.test('Security: Rejects login for deleted tenants', async () => {
    const auth = useAuthStore.getState();
    const saas = useSaaSAdminStore.getState();

    // 1. Tạo quán tạm thời để kiểm thử xóa
    await saas.createTenant({
      name: 'Quán Tạm Xóa',
      subdomain: 'quantamxoa',
      phone: '0999888777',
      subscriptionPlan: 'standard',
    });

    const created = useSaaSAdminStore.getState().tenants.find((t) => t.subdomain === 'quantamxoa');
    assert.isTrue(Boolean(created), 'Quán tạm phải được tạo');

    // 2. Xóa quán tạm thời
    await useSaaSAdminStore.getState().deleteTenant(created!.id);

    // 3. Thử đăng nhập lại bằng SĐT '0999888777' -> Phải bị từ chối
    const resDeletedPhone = await auth.loginWithCredentials('0999888777', 'owner', 'Danh@!26062002');
    assert.isFalse(resDeletedPhone.success, 'Bắt buộc từ chối đăng nhập quán đã bị xóa');

    // 4. Thử đăng nhập lại bằng subdomain 'quantamxoa' -> Phải bị từ chối
    const resDeletedCode = await auth.loginWithCredentials('quantamxoa', 'owner', 'Danh@!26062002');
    assert.isFalse(resDeletedCode.success, 'Bắt buộc từ chối subdomain đã bị xóa');

    // Khôi phục lại demo
    auth.quickDemoLogin('cashier');
  });
}


