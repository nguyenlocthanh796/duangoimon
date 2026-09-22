import { runner, assert } from './harness';
import { useAuthStore } from '../lib/store/useAuthStore';
import { usePOSStore } from '../lib/store/usePOSStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function runAppleReviewComplianceTests() {
  runner.setContext('Apple Compliance', 'Guideline 5.1.1 & 5.1.2');

  const setupTestState = async () => {
    await AsyncStorage.clear();
    useAuthStore.setState({
      isAuthenticated: true,
      token: 'test_token',
      ownerPin: '9999',
      managerPin: '8888',
      currentRole: 'owner',
      tenant: {
        id: 'tenant_test',
        code: 'testcafe',
        name: 'Test Cafe Apple Review',
        subscriptionPlan: 'pro',
        licenseDaysLeft: 365,
        licenseExpiresAt: '2027-12-31',
      },
      deviceBinding: {
        isBound: true,
        tenantId: 'tenant_test',
        tenantName: 'Test Cafe Apple Review',
        branchId: 'branch_01',
        branchName: 'Chi Nhánh 1',
        deviceRole: 'pos',
        deviceName: 'Máy POS Quầy 01',
        boundAt: new Date().toISOString(),
      },
    });

    usePOSStore.setState({
      tenantId: 'tenant_test',
      tables: [
        { id: 't1', name: 'Bàn 01', capacity: 4, area: 'Tầng 1', status: 'co_khach', totalAmount: 50000, itemCount: 1, guestCount: 2 },
      ],
    });
  };

  await runner.test('Guideline 5.1.1(v): Từ chối xóa tài khoản nếu cụm từ xác nhận không khớp', async () => {
    await setupTestState();
    const auth = useAuthStore.getState();
    const res = await auth.deleteAccountAndTenantData('9999', 'SAI CU PHAP');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Cần nhập chính xác cụm từ: XOA TAI KHOAN');

    // Dữ liệu vẫn được giữ nguyên
    assert.strictEqual(useAuthStore.getState().isAuthenticated, true);
    assert.strictEqual(useAuthStore.getState().tenant.id, 'tenant_test');
  });

  await runner.test('Guideline 5.1.1(v): Từ chối xóa tài khoản nếu mã PIN Chủ Quán sai', async () => {
    await setupTestState();
    const auth = useAuthStore.getState();
    const res = await auth.deleteAccountAndTenantData('1234', 'XOA TAI KHOAN');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Mã PIN Chủ Quán hoặc Mã Cứu Hộ không chính xác');

    // Dữ liệu vẫn được giữ nguyên
    assert.strictEqual(useAuthStore.getState().isAuthenticated, true);
    assert.strictEqual(useAuthStore.getState().tenant.id, 'tenant_test');
  });

  await runner.test('Guideline 5.1.1(v): Xóa tài khoản thành công khi nhập đúng cụm từ và PIN Chủ Quán', async () => {
    await setupTestState();
    const auth = useAuthStore.getState();
    const res = await auth.deleteAccountAndTenantData('9999', 'XOA TAI KHOAN');
    assert.strictEqual(res.success, true);

    // Trạng thái đã được dọn sạch hoàn toàn
    const stateAfter = useAuthStore.getState();
    assert.strictEqual(stateAfter.isAuthenticated, false);
    assert.strictEqual(stateAfter.token, undefined);
    assert.strictEqual(stateAfter.deviceBinding?.isBound, false);
    assert.strictEqual(stateAfter.deviceBinding?.tenantId, '');
  });

  await runner.test('Guideline 5.1.1(v): Hỗ trợ cụm từ tiếng Anh DELETE cho reviewer quốc tế', async () => {
    await setupTestState();
    const auth = useAuthStore.getState();
    const res = await auth.deleteAccountAndTenantData('9999', 'DELETE');
    assert.strictEqual(res.success, true);
    assert.strictEqual(useAuthStore.getState().isAuthenticated, false);
  });
}
