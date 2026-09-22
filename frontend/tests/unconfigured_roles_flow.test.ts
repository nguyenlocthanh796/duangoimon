/**
 * 👑 OngChu Lean POS - Unconfigured Roles & Staff Kiosk Flow Test Suite
 * Tests role configuration, grayed-out state, PIN rejection, unlocking, and route guards.
 */

import { runner, assert } from './harness';
import { useAuthStore, checkRoutePermission } from '../lib/store/useAuthStore';

export async function runUnconfiguredRolesFlowTests() {
  runner.setContext('Unconfigured Roles', 'Staff Kiosk Role Configuration & Activation Flow');

  await runner.test('1. Default demo tenant (ongchu) has all roles configured', async () => {
    // Reset to demo tenant
    await useAuthStore.getState().loginWithCredentials('ongchu', 'admin', '123456');
    const { isRoleConfigured } = useAuthStore.getState();
    assert.isTrue(isRoleConfigured('owner'), 'Owner should always be configured');
    assert.isTrue(isRoleConfigured('super_admin'), 'Super Admin should always be configured');
    assert.isTrue(isRoleConfigured('cashier'), 'Demo cashier should be configured');
    assert.isTrue(isRoleConfigured('server'), 'Demo server should be configured');
    assert.isTrue(isRoleConfigured('manager'), 'Demo manager should be configured');
  });

  await runner.test('2. New store (tiemtraan) initializes with only Owner configured', async () => {
    const res = await useAuthStore.getState().loginWithCredentials(
      'tiemtraan',
      'chuquan_annhien',
      '123456'
    );
    assert.isTrue(res.success, 'Store owner login should succeed');

    const state = useAuthStore.getState();
    assert.strictEqual(state.tenant.code, 'tiemtraan', 'Tenant code must be tiemtraan');
    assert.strictEqual(state.tenant.name, 'Tiệm Trà & Cafe An Nhiên', 'Tenant name must match');
    assert.strictEqual(state.currentRole, 'owner', 'Role must be owner');

    // Check role configuration
    assert.isTrue(state.isRoleConfigured('owner'), 'Owner is always configured');
    assert.isFalse(state.isRoleConfigured('cashier'), 'Cashier should NOT be configured initially');
    assert.isFalse(state.isRoleConfigured('server'), 'Server should NOT be configured initially');
    assert.isFalse(state.isRoleConfigured('manager'), 'Manager should NOT be configured initially');
  });

  await runner.test('3. PIN login for unconfigured role is rejected with clear error', async () => {
    const auth = useAuthStore.getState();
    auth.setOwnerPin('9999');
    auth.setManagerPin('8888');
    const { useStaffStore } = require('../lib/store/useStaffStore');
    useStaffStore.getState().addStaff({
      name: 'Thu Ngân Test',
      phone: '0901234888',
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
      name: 'Phục Vụ Test',
      phone: '0901234999',
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

    useAuthStore.getState().lockScreen();

    // Attempt Cashier PIN 2222 when unconfigured
    const cashierRes = await useAuthStore.getState().loginWithPin('2222');
    assert.isFalse(cashierRes.success, 'Unconfigured cashier PIN must fail');
    assert.isTrue(Boolean(cashierRes.error?.includes('chưa được Chủ Quán thiết lập')), 'Error message must explain role is not configured');

    // Attempt Server PIN 1111 when unconfigured
    const serverRes = await useAuthStore.getState().loginWithPin('1111');
    assert.isFalse(serverRes.success, 'Unconfigured server PIN must fail');
    assert.isTrue(Boolean(serverRes.error?.includes('chưa được Chủ Quán thiết lập')), 'Error message must explain role is not configured');

    // Attempt Manager PIN 8888 when unconfigured
    const managerRes = await useAuthStore.getState().loginWithPin('8888');
    assert.isFalse(managerRes.success, 'Unconfigured manager PIN must fail');
    assert.isTrue(Boolean(managerRes.error?.includes('chưa được Chủ Quán thiết lập')), 'Error message must explain role is not configured');
  });

  await runner.test('4. PIN login for Owner (9999) always succeeds', async () => {
    const ownerRes = await useAuthStore.getState().loginWithPin('9999');
    assert.isTrue(ownerRes.success, 'Owner PIN 9999 must succeed');
    assert.strictEqual(useAuthStore.getState().currentRole, 'owner', 'Current role must be owner');
    assert.isTrue(useAuthStore.getState().isAuthenticated, 'Must be authenticated');
  });

  await runner.test('5. Store Owner toggles Cashier ON -> Cashier PIN unlocks immediately', async () => {
    // Toggle Cashier
    useAuthStore.getState().toggleConfiguredRole('cashier');
    assert.isTrue(useAuthStore.getState().isRoleConfigured('cashier'), 'Cashier must now be configured');

    // Lock screen and try Cashier PIN 2222
    useAuthStore.getState().lockScreen();
    const cashierRes = await useAuthStore.getState().loginWithPin('2222');
    assert.isTrue(cashierRes.success, 'Cashier PIN 2222 must now succeed');
    assert.strictEqual(useAuthStore.getState().currentRole, 'cashier', 'Current role must be cashier');
  });

  await runner.test('6. Store Owner toggles Cashier OFF -> Cashier PIN is locked again', async () => {
    // Re-login as owner to toggle
    await useAuthStore.getState().loginWithPin('9999');
    useAuthStore.getState().toggleConfiguredRole('cashier');
    assert.isFalse(useAuthStore.getState().isRoleConfigured('cashier'), 'Cashier must now be unconfigured');

    // Lock screen and try Cashier PIN 2222
    useAuthStore.getState().lockScreen();
    const cashierRes = await useAuthStore.getState().loginWithPin('2222');
    assert.isFalse(cashierRes.success, 'Cashier PIN 2222 must be rejected again');
  });

  await runner.test('7. Comprehensive Route Guard matrix for all 5 roles', async () => {
    // 1. Super Admin: ONLY /saas-admin
    assert.isTrue(checkRoutePermission('super_admin', '/saas-admin'), 'Super Admin can access /saas-admin');
    assert.isFalse(checkRoutePermission('super_admin', '/'), 'Super Admin blocked from POS');
    assert.isFalse(checkRoutePermission('super_admin', '/cai-dat'), 'Super Admin blocked from POS settings');

    // 2. Owner: All POS screens, BLOCKED from /saas-admin
    assert.isTrue(checkRoutePermission('owner', '/'), 'Owner can access POS');
    assert.isTrue(checkRoutePermission('owner', '/cai-dat'), 'Owner can access settings');
    assert.isTrue(checkRoutePermission('owner', '/nhan-su'), 'Owner can access staff');
    assert.isTrue(checkRoutePermission('owner', '/thanh-toan'), 'Owner can access payment');
    assert.isFalse(checkRoutePermission('owner', '/saas-admin'), 'Owner strictly blocked from /saas-admin');

    // 3. Manager: POS, KDS, Invoices, Cashbook, Shift, but BLOCKED from /nhan-su, /cai-dat, /saas-admin
    assert.isTrue(checkRoutePermission('manager', '/'), 'Manager can access POS');
    assert.isTrue(checkRoutePermission('manager', '/kds'), 'Manager can access KDS');
    assert.isTrue(checkRoutePermission('manager', '/so-quy'), 'Manager can access cashbook');
    assert.isTrue(checkRoutePermission('manager', '/giao-ca'), 'Manager can access shift');
    assert.isFalse(checkRoutePermission('manager', '/nhan-su'), 'Manager blocked from staff payroll');
    assert.isFalse(checkRoutePermission('manager', '/cai-dat'), 'Manager blocked from settings');
    assert.isFalse(checkRoutePermission('manager', '/saas-admin'), 'Manager blocked from /saas-admin');

    // 4. Cashier: POS, KDS, Invoices, Cashbook, Shift, CFD, Payment
    assert.isTrue(checkRoutePermission('cashier', '/'), 'Cashier can access POS');
    assert.isTrue(checkRoutePermission('cashier', '/thanh-toan'), 'Cashier can access payment');
    assert.isTrue(checkRoutePermission('cashier', '/kds'), 'Cashier can access KDS');
    assert.isTrue(checkRoutePermission('cashier', '/so-quy'), 'Cashier can access cashbook');
    assert.isTrue(checkRoutePermission('cashier', '/giao-ca'), 'Cashier can access shift');
    assert.isFalse(checkRoutePermission('cashier', '/cai-dat'), 'Cashier blocked from settings');
    assert.isFalse(checkRoutePermission('cashier', '/nhan-su'), 'Cashier blocked from staff');
    assert.isFalse(checkRoutePermission('cashier', '/saas-admin'), 'Cashier blocked from /saas-admin');

    // 5. Server (Waiter): POS, KDS, Invoices, CFD
    assert.isTrue(checkRoutePermission('server', '/'), 'Server can access POS');
    assert.isTrue(checkRoutePermission('server', '/kds'), 'Server can access KDS');
    assert.isTrue(checkRoutePermission('server', '/hoa-don'), 'Server can access invoices');
    assert.isFalse(checkRoutePermission('server', '/so-quy'), 'Server blocked from cashbook');
    assert.isFalse(checkRoutePermission('server', '/giao-ca'), 'Server blocked from shift');
    assert.isFalse(checkRoutePermission('server', '/cai-dat'), 'Server blocked from settings');
  });
}
