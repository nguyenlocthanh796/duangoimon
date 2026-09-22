/**
 * 👑 OngChu Lean POS - Multi-Tenant Data Isolation Test Suite
 * Kiểm thử toàn diện: Cách ly dữ liệu đa khách thuê, chống chồng chéo đơn hàng, bàn ăn và sổ quỹ (Zero Data Bleeding)
 */

import './setup_env';
import { runner, assert } from './harness';
import { useAuthStore, DEFAULT_TENANT } from '../lib/store/useAuthStore';
import { usePOSStore } from '../lib/store/usePOSStore';
import { useStaffStore } from '../lib/store/useStaffStore';

export async function runMultiTenantIsolationTests() {
  runner.setContext('Multi-Tenant Isolation', 'Cross-Tenant Data Partitioning & Zero Bleeding');

  // =========================================================================
  // GIAI ĐOẠN 1: QUÁN GỐC (TENANT A - ONGCHU) CÓ DỮ LIỆU RIÊNG
  // =========================================================================
  await runner.test('Giai đoạn 1: Quán gốc (tenant_ongchu) hoạt động độc lập và lưu trữ dữ liệu', async () => {
    const pos = usePOSStore.getState();
    await pos.switchTenant('tenant_ongchu', 'OngChu Coffee & Tea HQ');

    // Giả lập phát sinh 2 hóa đơn tại quán gốc
    usePOSStore.setState({
      orderHistory: [
        {
          id: 'ord_ongchu_01',
          orderCode: 'HD-0001',
          tableId: 'tbl_01',
          tableName: 'Bàn 01',
          guestCount: 1,
          subtotal: 50000,
          discountAmount: 0,
          finalTotal: 50000,
          paidAmount: 50000,
          changeAmount: 0,
          paymentMethod: 'tien_mat',
          cashierName: 'Thu Ngân OngChu',
          status: 'paid',
          createdAt: new Date().toISOString(),
          items: [],
        },
        {
          id: 'ord_ongchu_02',
          orderCode: 'HD-0002',
          tableId: 'tbl_02',
          tableName: 'Bàn 02',
          guestCount: 2,
          subtotal: 85000,
          discountAmount: 0,
          finalTotal: 85000,
          paidAmount: 85000,
          changeAmount: 0,
          paymentMethod: 'vietqr',
          cashierName: 'Thu Ngân OngChu',
          status: 'paid',
          createdAt: new Date().toISOString(),
          items: [],
        },
      ],
      cashTransactions: [
        {
          id: 'tx_ongchu_01',
          type: 'chi',
          category: 'Mua đá',
          amount: 20000,
          description: 'Mua đá lạnh',
          time: '09:00',
          performedBy: 'Thu Ngân OngChu',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const store = usePOSStore.getState();
    assert.strictEqual(store.tenantId, 'tenant_ongchu', 'TenantId hiện tại phải là tenant_ongchu');
    assert.strictEqual(store.orderHistory.length, 2, 'Quán gốc có 2 hóa đơn');
    assert.strictEqual(store.cashTransactions.length, 1, 'Quán gốc có 1 giao dịch sổ quỹ');
  });

  // =========================================================================
  // GIAI ĐOẠN 2: TẠO & ĐĂNG NHẬP QUÁN MỚI (QUANQUAN) - PHẢI SẠCH TINH 100%
  // =========================================================================
  let targetTenantId = 'tenant_quanquan';
  await runner.test('Giai đoạn 2: Quán mới tạo (quanquan) nạp trạng thái sạch tinh (0 đơn, 0 quỹ, 0 giỏ dở)', async () => {
    const auth = useAuthStore.getState();

    // 1. Đăng nhập vào quán mới 'quanquan'
    const loginRes = await auth.loginWithCredentials('quanquan', 'owner', '123456', 'branch_01');
    assert.isTrue(loginRes.success, 'Đăng nhập vào quán quanquan phải thành công');

    targetTenantId = useAuthStore.getState().tenant.id;
    const pos = usePOSStore.getState();
    assert.strictEqual(pos.tenantId, targetTenantId, 'TenantId phải chuyển thành ' + targetTenantId);

    // 2. Kiểm tra Clean Slate: Tuyệt đối không được thừa hưởng 2 đơn hay 1 phiếu chi từ quán cũ
    assert.strictEqual(pos.orderHistory.length, 0, 'Quán mới tạo phải có 0 hóa đơn (Không chồng chéo)');
    assert.strictEqual(pos.cashTransactions.length, 0, 'Quán mới tạo phải có 0 giao dịch sổ quỹ');
    assert.strictEqual(pos.shiftHistory.length, 0, 'Quán mới tạo phải có 0 lịch sử ca trực cũ');
    assert.strictEqual(pos.kdsOrders.length, 0, 'Màn hình bếp quán mới phải trống 0 món');
    assert.strictEqual(Object.keys(pos.tableCarts).length, 0, 'Không có giỏ hàng dở dang');

    // 3. Toàn bộ bàn ăn phải ở trạng thái trống và không được rỗng bàn/món
    assert.isTrue(pos.tables.length > 0, `Quán quanquan phải có sẵn bàn ăn, thực tế: ${pos.tables.length} bàn`);
    assert.isTrue(pos.menuItems.length > 0, `Quán quanquan phải có sẵn thực đơn, thực tế: ${pos.menuItems.length} món`);
    const occupiedTables = pos.tables.filter((t) => t.status !== 'trong');
    assert.strictEqual(occupiedTables.length, 0, 'Mọi bàn ăn của quán mới phải trống 100%');

    // 4. Tên quán phải chuẩn theo tên quán mới
    assert.isTrue(
      pos.storeSettings.storeName.toLowerCase().includes('quanquan'),
      `Tên quán phải là Quán quanquan, thực tế: ${pos.storeSettings.storeName}`
    );
  });

  // =========================================================================
  // GIAI ĐOẠN 3: PHÁT SINH ĐƠN HÀNG TẠI QUÁN MỚI
  // =========================================================================
  await runner.test('Giai đoạn 3: Phát sinh đơn hàng tại quán mới chỉ ghi nhận riêng cho quanquan', async () => {
    const pos = usePOSStore.getState();

    // Giả lập checkout 1 hóa đơn tại quán quanquan
    usePOSStore.setState({
      orderHistory: [
        {
          id: 'ord_qq_01',
          orderCode: 'HD-QQ01',
          tableId: 'tbl_01',
          tableName: 'Bàn 01',
          guestCount: 1,
          subtotal: 39000,
          discountAmount: 0,
          finalTotal: 39000,
          paidAmount: 39000,
          changeAmount: 0,
          paymentMethod: 'tien_mat',
          cashierName: 'Chủ Quán quanquan',
          status: 'paid',
          createdAt: new Date().toISOString(),
          items: [],
        },
      ],
    });

    const store = usePOSStore.getState();
    assert.strictEqual(store.orderHistory.length, 1, 'Quán quanquan ghi nhận đúng 1 đơn hàng mới');
    assert.strictEqual(store.orderHistory[0].orderCode, 'HD-QQ01', 'Đúng mã hóa đơn của quán quanquan');
  });

  // =========================================================================
  // GIAI ĐOẠN 4: CHUYỂN NGƯỢC VỀ QUÁN GỐC - DỮ LIỆU CẢ 2 PHẢI NGUYÊN VẸN
  // =========================================================================
  await runner.test('Giai đoạn 4: Chuyển đổi qua lại giữa các quán bảo toàn dữ liệu độc lập', async () => {
    const pos = usePOSStore.getState();

    // 1. Chuyển về quán gốc
    await pos.switchTenant('tenant_ongchu', 'OngChu Coffee & Tea HQ');
    const storeOngchu = usePOSStore.getState();
    assert.strictEqual(storeOngchu.tenantId, 'tenant_ongchu', 'Đã chuyển về tenant_ongchu');
    assert.strictEqual(storeOngchu.orderHistory.length, 2, 'Quán gốc vẫn giữ nguyên 2 hóa đơn ban đầu');
    assert.strictEqual(storeOngchu.cashTransactions.length, 1, 'Quán gốc vẫn giữ nguyên 1 phiếu chi');

    // 2. Chuyển lại quán quanquan
    await pos.switchTenant(targetTenantId, 'Quán quanquan');
    const storeQuanQuan = usePOSStore.getState();
    assert.strictEqual(storeQuanQuan.tenantId, targetTenantId, 'Đã chuyển lại ' + targetTenantId);
    assert.strictEqual(storeQuanQuan.orderHistory.length, 1, 'Quán quanquan vẫn giữ nguyên 1 đơn của mình');
    assert.strictEqual(storeQuanQuan.orderHistory[0].orderCode, 'HD-QQ01', 'Hóa đơn quán quanquan không bị mất');
  });

  // =========================================================================
  // GIAI ĐOẠN 5: CÁCH LY NHÂN SỰ VÀ BẢNG LƯƠNG ĐA KHÁCH THUÊ
  // =========================================================================
  await runner.test('Giai đoạn 5: Phân vùng nhân sự và chấm công độc lập giữa các quán', async () => {
    const staffStore = useStaffStore.getState();

    // 1. Quán quanquan chuyển đổi nhân sự
    await staffStore.switchTenant(targetTenantId);
    assert.strictEqual(useStaffStore.getState().tenantId, targetTenantId, 'StaffStore chuyển sang ' + targetTenantId);

    // Quán mới không có lịch sử ca trực hay chấm công cũ
    assert.strictEqual(useStaffStore.getState().shiftLogs.length, 0, 'Quán mới không có log ca cũ');
    assert.strictEqual(useStaffStore.getState().payrollHistory.length, 0, 'Quán mới không có lịch sử chi lương cũ');

    // Dọn dẹp: Khôi phục lại quán gốc để các test suite tiếp theo chạy chuẩn
    await usePOSStore.getState().switchTenant('tenant_ongchu', 'OngChu Coffee & Tea HQ');
    await useStaffStore.getState().switchTenant('tenant_ongchu');
    useAuthStore.setState({
      tenant: DEFAULT_TENANT,
      activeBranchId: 'branch_01',
      currentUser: { id: 'usr_owner', name: 'Chủ Quán OngChu', role: 'owner', branchId: 'branch_01' },
      currentRole: 'owner',
      isAuthenticated: true,
      token: 'demo_token_owner',
    });
  });
}

if (typeof require !== 'undefined' && require.main === module) {
  runMultiTenantIsolationTests().then(() => {
    runner.printSummary();
  });
}

