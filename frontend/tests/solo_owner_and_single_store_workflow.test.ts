/**
 * 👑 OngChu Lean POS - Solo Owner & Single-Store Architecture Test Suite
 * Tests:
 * 1. Single-store initial state (no mock branches, branches.length === 1, isMultiBranch() === false).
 * 2. Insecure default PIN elimination (ownerPin === '', managerPin === '', unconfigured PINs rejected).
 * 3. Solo owner autonomy (requiresManagerApproval returns false for owner, bypasses ManagerPinModal).
 * 4. Multi-branch scale-up (isMultiBranch() dynamically toggles).
 */

import { runner, assert } from './harness';
import { useAuthStore, INITIAL_BRANCHES } from '../lib/store/useAuthStore';

export async function runSoloOwnerAndSingleStoreTests() {
  runner.setContext('Solo Owner & Single Store', 'Zero Default PINs & Single Store Architecture');

  await runner.test('1. Initial store setup has exactly 1 branch and isMultiBranch() is false', () => {
    assert.strictEqual(INITIAL_BRANCHES.length, 1, 'INITIAL_BRANCHES must only contain 1 primary branch');
    assert.strictEqual(INITIAL_BRANCHES[0].code, 'CN-01');
    assert.strictEqual(INITIAL_BRANCHES[0].name, 'Cửa Hàng Chính');

    const auth = useAuthStore.getState();
    assert.isFalse(auth.isMultiBranch(), 'isMultiBranch() must return false for single store');
  });

  await runner.test('2. Fresh store has zero default PINs and rejects old hardcoded PINs (8888, 9999, 2222, 1111)', async () => {
    // Register a brand new unique store
    const uniqueStore = 'Tiệm Bánh Mì ' + Date.now();
    const uniquePhone = '0981' + Math.floor(100000 + Math.random() * 900000);
    const regRes = await useAuthStore.getState().registerTenant(uniqueStore, uniquePhone, 'MatKhau@2026', 'Chủ Quán Ba');
    assert.isTrue(regRes.success);

    const state = useAuthStore.getState();
    assert.strictEqual(state.ownerPin, '', 'ownerPin must be empty for fresh store');
    assert.strictEqual(state.managerPin, '', 'managerPin must be empty for fresh store');
    assert.strictEqual(state.branches.length, 1, 'Fresh store must have exactly 1 branch');
    assert.isFalse(state.isMultiBranch(), 'Fresh store is not multi-branch');

    // Reject all old hardcoded PINs
    const oldPins = ['8888', '9999', '2222', '1111', '0000', '1234'];
    for (const pin of oldPins) {
      const verifyRes = await state.verifyManagerPin(pin);
      assert.isFalse(verifyRes.success, `PIN ${pin} must be rejected on unconfigured store`);

      const loginRes = await state.loginWithPin(pin);
      assert.isFalse(loginRes.success, `Login with PIN ${pin} must be rejected on unconfigured store`);
    }
  });

  await runner.test('3. Solo Owner autonomy: owner bypasses PIN approval for high-risk actions', () => {
    const auth = useAuthStore.getState();
    auth.setRole('owner');

    // Owner should NEVER be prompted for PIN
    assert.isFalse(auth.requiresManagerApproval('void_item'), 'Owner does not require PIN for void_item');
    assert.isFalse(auth.requiresManagerApproval('void_order'), 'Owner does not require PIN for void_order');
    assert.isFalse(auth.requiresManagerApproval('excessive_discount'), 'Owner does not require PIN for excessive discount');
    assert.isFalse(auth.requiresManagerApproval('reprint_bill'), 'Owner does not require PIN for reprint_bill');

    // Super admin also bypasses
    auth.setRole('super_admin');
    assert.isFalse(auth.requiresManagerApproval('void_item'), 'Super Admin does not require PIN');

    // Cashier and Server DO require approval
    auth.setRole('cashier');
    assert.isTrue(auth.requiresManagerApproval('void_item'), 'Cashier requires PIN for void_item');
    assert.isTrue(auth.requiresManagerApproval('excessive_discount'), 'Cashier requires PIN for discount > 20%');

    auth.setRole('server');
    assert.isTrue(auth.requiresManagerApproval('void_item'), 'Server requires PIN for void_item');

    // Reset back to owner
    auth.setRole('owner');
  });

  await runner.test('4. Setting custom PINs works securely without leaking default PINs', async () => {
    const auth = useAuthStore.getState();

    // Owner sets custom PIN
    const setOwnerRes = auth.setOwnerPin('3456');
    assert.isTrue(setOwnerRes.success);
    assert.strictEqual(useAuthStore.getState().ownerPin, '3456');

    // Manager sets custom PIN
    const setMgrRes = auth.setManagerPin('7890');
    assert.isTrue(setMgrRes.success);
    assert.strictEqual(useAuthStore.getState().managerPin, '7890');

    // Verification succeeds for configured PINs
    const verifyOwner = await auth.verifyManagerPin('3456');
    assert.isTrue(verifyOwner.success, 'Custom owner PIN verifies successfully');

    const verifyMgr = await auth.verifyManagerPin('7890');
    assert.isTrue(verifyMgr.success, 'Custom manager PIN verifies successfully');

    // Old default PINs still fail
    const verifyOld8888 = await auth.verifyManagerPin('8888');
    assert.isFalse(verifyOld8888.success, 'Old 8888 must still fail');

    const verifyOld9999 = await auth.verifyManagerPin('9999');
    assert.isFalse(verifyOld9999.success, 'Old 9999 must still fail');
  });

  await runner.test('5. Multi-branch scale-up: adding branch enables isMultiBranch()', () => {
    const auth = useAuthStore.getState();
    auth.setRole('owner');

    assert.isFalse(auth.isMultiBranch(), 'Initially single store');

    // Owner creates Branch 2
    const addRes = auth.addBranch({
      code: 'CN-02',
      name: 'Chi Nhánh 2 (Quận 2)',
      address: 'Thảo Điền, TP. Thủ Đức',
      phone: '028 3899 9999',
    });
    assert.isTrue(addRes.success);
    assert.strictEqual(useAuthStore.getState().branches.length, 2);
    assert.isTrue(useAuthStore.getState().isMultiBranch(), 'isMultiBranch() must now return true');

    // Reset back to demo cashier
    auth.quickDemoLogin('cashier');
  });
}
