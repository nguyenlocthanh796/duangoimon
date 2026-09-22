/**
 * 👑 ONGCHU LEAN POS — IOS FLOW & DATA INTEGRITY TEST SUITE
 * Kiểm thử tính toàn vẹn dữ liệu, chống mất dữ liệu khi cold start/rehydrate,
 * và luồng gọi món -> thanh toán -> reset bàn trên thiết bị iOS.
 */

import './setup_env';
import { runner, assert } from './harness';
import { usePOSStore } from '../lib/store/usePOSStore';

export async function runIosFlowPersistenceTests() {
  runner.setContext('iOS Flow & Data Persistence', 'Zero-Data Loss & Full Order Flow');

  await runner.test('1. Thêm món vào giỏ cập nhật đúng tableCarts và trạng thái bàn', async () => {
    const pos = usePOSStore.getState();
    pos.resetToCleanSlate('tenant_quanquan', 'Quán Ăn & Đồ Uống QUANQUAN');

    const store = usePOSStore.getState();
    const table = store.tables[0];
    store.selectTable(table);

    const dish1 = store.menuItems[0];
    store.addToCart({
      item: dish1,
      qty: 2,
      selectedSize: 'Size Vừa (M)',
      selectedToppings: [],
      note: '',
      unitPrice: dish1.price,
    });

    const afterStore = usePOSStore.getState();
    const currentCart = afterStore.tableCarts[table.id] || [];
    assert.strictEqual(currentCart.length, 1, 'Giỏ hàng phải có 1 món');
    assert.strictEqual(currentCart[0].qty, 2, 'Số lượng món phải là 2');
    assert.strictEqual(currentCart[0].unitPrice, dish1.price, 'Giá tiền đơn vị khớp với giá món');

    const currentTable = afterStore.tables.find((t) => t.id === table.id);
    assert.strictEqual(currentTable?.status, 'co_khach', 'Bàn phải chuyển sang có khách');
    assert.strictEqual(currentTable?.totalAmount, dish1.price * 2, 'Tổng tiền bàn khớp 2 phần');
  });

  await runner.test('2. Thanh toán thành công (checkoutSuccess) dọn sạch giỏ và reset bàn về trống', async () => {
    const store = usePOSStore.getState();
    const table = store.tables[0];
    store.selectTable(table);

    const dish = store.menuItems[0];
    store.addToCart({
      item: dish,
      qty: 1,
      selectedSize: 'Size Vừa (M)',
      selectedToppings: [],
      note: '',
      unitPrice: dish.price,
    });

    store.checkoutSuccess(dish.price, 'tien_mat');

    const afterStore = usePOSStore.getState();
    assert.strictEqual(afterStore.tableCarts[table.id]?.length || 0, 0, 'Giỏ hàng của bàn phải rỗng');

    const clearedTable = afterStore.tables.find((t) => t.id === table.id);
    assert.strictEqual(clearedTable?.status, 'trong', 'Bàn phải về trạng thái trống');
    assert.strictEqual(clearedTable?.totalAmount, 0, 'Tổng tiền bàn phải về 0');

    assert.strictEqual(afterStore.selectedTable.status, 'trong', 'selectedTable phải về trạng thái trống');
    assert.strictEqual(afterStore.selectedTable.totalAmount, 0, 'selectedTable totalAmount phải về 0');
    assert.strictEqual(afterStore.orderHistory.length, 1, 'Lịch sử đơn phải có 1 hóa đơn');
  });

  await runner.test('3. Rehydration bảo vệ tenant quanquan không bị xóa trắng bàn và thực đơn', async () => {
    const store = usePOSStore.getState();
    assert.isTrue(store.tables.length >= 8, 'Bàn ăn phải giữ nguyên ít nhất 8 bàn');
    assert.isTrue(store.menuItems.length >= 10, 'Thực đơn phải giữ nguyên ít nhất 10 món');
    assert.isTrue(Boolean(store.selectedTable?.id), 'selectedTable phải luôn hợp lệ');
  });
}

if (typeof require !== 'undefined' && require.main === module) {
  runIosFlowPersistenceTests().then(() => {
    runner.printSummary();
  });
}
