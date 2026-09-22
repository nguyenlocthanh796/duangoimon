/**
 * 👑 OngChu Lean POS - QUANQUAN iPhone Bootstrap & Live Sync Test Suite
 * Kiểm thử tự động: Đăng nhập quán quanquan trên thiết bị cài đặt mới (AsyncStorage trống)
 * Xác nhận: Luôn có sẵn bàn ăn, thực đơn, và kết nối đúng Backend LAN (Zero Blank Screen).
 */

import './setup_env';
import { runner, assert } from './harness';
import { useAuthStore } from '../lib/store/useAuthStore';
import { usePOSStore } from '../lib/store/usePOSStore';
import { getBaseUrl } from '../lib/api/apiClient';

export async function runQuanQuanIPhoneBootstrapTests() {
  runner.setContext('QUANQUAN iPhone Bootstrap', 'Zero-Blank Screen & Live Catalog Hydration');

  await runner.test('1. Kiểm tra getBaseUrl() ưu tiên IP máy tính nội bộ LAN (192.168.x.x)', async () => {
    const url = getBaseUrl();
    assert.isTrue(
      url.includes('192.168.') || url.includes('localhost') || url.includes(':8080'),
      'getBaseUrl() phải trỏ về máy chủ nội bộ LAN hoặc localhost port 8080. Thực tế: ' + url
    );
    assert.isFalse(
      url.includes('app.ongchu.cloud') && !url.includes('192.168.'),
      'Không được trỏ về VPS cũ khi chạy môi trường nội bộ'
    );
  });

  await runner.test('2. Đăng nhập quanquan trên thiết bị mới tinh (AsyncStorage trắng) có ngay bàn và món', async () => {
    const pos = usePOSStore.getState();

    // Giả lập máy mới tinh bằng resetToCleanSlate trực tiếp
    pos.resetToCleanSlate('tenant_quanquan', 'Quán Ăn & Đồ Uống QUANQUAN');

    const freshPos = usePOSStore.getState();
    assert.strictEqual(freshPos.tenantId, 'tenant_quanquan');
    assert.isTrue(freshPos.tables.length >= 8, 'Phải có ít nhất 8 bàn ăn ban đầu, thực tế: ' + freshPos.tables.length);
    assert.isTrue(freshPos.menuItems.length >= 10, 'Phải có ít nhất 10 món ăn ban đầu, thực tế: ' + freshPos.menuItems.length);
    assert.isTrue(freshPos.categories.length > 0, 'Phải có danh mục món ăn, thực tế: ' + freshPos.categories.length);
    assert.isTrue(freshPos.areas.length > 0, 'Phải có khu vực bàn ăn, thực tế: ' + freshPos.areas.length);
    assert.isTrue(freshPos.selectedTable.id !== 'unassigned', 'Bàn ăn đang chọn không được là unassigned');
  });

  await runner.test('3. Đăng nhập đầy đủ luồng quanquan/Danh@!26062002 bảo toàn bàn ăn và món ăn', async () => {
    const auth = useAuthStore.getState();

    const res = await auth.loginWithCredentials(
      'quanquan',
      'quanquan',
      'Danh@!26062002',
      'branch_qq_01'
    );
    assert.isTrue(res.success, 'Đăng nhập quanquan phải thành công');

    const pos = usePOSStore.getState();
    assert.strictEqual(pos.tenantId, 'tenant_quanquan', 'Tenant ID phải là tenant_quanquan');
    assert.isTrue(pos.tables.length > 0, 'Bàn ăn không được rỗng sau đăng nhập, thực tế: ' + pos.tables.length + ' bàn');
    assert.isTrue(pos.menuItems.length > 0, 'Thực đơn không được rỗng sau đăng nhập, thực tế: ' + pos.menuItems.length + ' món');
    assert.isTrue(
      pos.storeSettings.storeName.includes('QUANQUAN') || pos.storeSettings.storeName.includes('quanquan'),
      'Tên quán phải phản ánh đúng QUANQUAN: ' + pos.storeSettings.storeName
    );
  });

  await runner.test('4. fetchMasterCatalog() đồng bộ 8 bàn và 22 món từ Backend Go SQLite khi online', async () => {
    const pos = usePOSStore.getState();
    const ok = await pos.fetchMasterCatalog();
    if (ok) {
      const livePos = usePOSStore.getState();
      assert.isTrue(livePos.tables.length >= 8, 'Backend Go phải cung cấp 8 bàn, thực tế: ' + livePos.tables.length);
      assert.isTrue(livePos.menuItems.length >= 22, 'Backend Go phải cung cấp 22 món, thực tế: ' + livePos.menuItems.length);
    }
  });
}

if (typeof require !== 'undefined' && require.main === module) {
  runQuanQuanIPhoneBootstrapTests().then(() => {
    runner.printSummary();
  });
}