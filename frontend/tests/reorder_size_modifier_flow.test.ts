/**
 * 👑 OngChu Lean POS - Reorder & Size Modifier Flow Test Suite
 * Tests:
 * 1. Khách vào bàn gọi món Size M mặc định, Lưu Bếp (sendToKitchen).
 * 2. Khách gọi thêm cùng món nhưng Size L: tạo 2 dòng riêng biệt, không đè món cũ.
 * 3. Lưu bếp lần 2: Chỉ bắn món Size L mới vào KDS, không làm lại Size M.
 * 4. Bất biến F&B: Khách gọi thêm sau khi đợt trước đã gửi bếp sẽ tạo dòng đợt mới (sentToKitchen = false) để in vé tiếp theo.
 * 5. Khi chưa gửi bếp: Gọi thêm cùng Size L sẽ gộp số lượng (Deduplication).
 * 6. Khách đổi size món đã lưu bếp: Tự động reset sentToKitchen về false để báo lại bếp.
 */

import { runner, assert } from './harness';
import { usePOSStore } from '../lib/store/usePOSStore';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';

export async function runReorderSizeModifierFlowTests() {
  runner.setContext('Workflows', 'Reorder & Size Modifier Flow');

  const targetTable = mockTables[0]; // Bàn 01
  const teaItem = mockMenuItems[0]; // Trà Sữa Trân Châu Hoàng Gia (35k base, Size L +7k)
  const snackItem = mockMenuItems[3]; // Khoai Tây Chiên Lắc Phô Mai (30k base)

  const resetStore = () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: targetTable,
      tableCarts: {},
      tableDiscounts: {},
      viewMode: 'pos',
      orderChannel: 'dine_in',
      kdsOrders: [],
    });
  };

  await runner.test('1. Khách vào bàn gọi món Size M mặc định và Lưu Bếp', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Khách gọi 1 phần Khoai Tây Chiên Size M mặc định (30.000 đ)
    const initialMod = createSampleModifierData(snackItem, {
      qty: 1,
      selectedSize: 'Size Vừa (M)',
      unitPrice: 30000,
    });
    store.addToCart(initialMod);

    let cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    assert.strictEqual(cart.length, 1, 'Giỏ hàng có đúng 1 dòng');
    assert.strictEqual(cart[0].selectedSize, 'Size Vừa (M)', 'Size phải là M');
    assert.strictEqual(cart[0].qty, 1, 'Số lượng là 1');
    assert.strictEqual(cart[0].sentToKitchen, false, 'Chưa lưu bếp thì sentToKitchen = false');

    // Nhân viên bấm Lưu Bếp
    store.sendToKitchen();

    cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    assert.strictEqual(cart[0].sentToKitchen, true, 'Sau khi lưu bếp thì sentToKitchen = true');
    assert.strictEqual(usePOSStore.getState().tables.find((t) => t.id === targetTable.id)?.totalAmount, 30000, 'Tổng tiền bàn là 30.000 đ');
  });

  await runner.test('2. Khách gọi thêm cùng món nhưng Size L: tạo 2 dòng riêng biệt, không ghi đè món Size M cũ', () => {
    // Kế thừa trạng thái từ test 1 (đã có 1x Size M đã gửi bếp)
    const store = usePOSStore.getState();

    // Khách gọi thêm 1 phần Khoai Tây Chiên Size L (+6.000 đ = 36.000 đ)
    const addSizeLMod = createSampleModifierData(snackItem, {
      qty: 1,
      selectedSize: 'Size Lớn (L)',
      unitPrice: 36000,
    });
    store.addToCart(addSizeLMod);

    const cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    assert.strictEqual(cart.length, 2, 'Giỏ hàng phải có đúng 2 dòng riêng biệt');

    // Tìm dòng Size L mới và dòng Size M cũ
    const itemSizeL = cart.find((c) => c.selectedSize === 'Size Lớn (L)');
    const itemSizeM = cart.find((c) => c.selectedSize === 'Size Vừa (M)');

    assert.ok(itemSizeL, 'Phải có dòng Size L');
    assert.ok(itemSizeM, 'Phải bảo toàn dòng Size M cũ');
    assert.strictEqual(itemSizeL?.qty, 1, 'Size L có số lượng là 1');
    assert.strictEqual(itemSizeL?.sentToKitchen, false, 'Size L mới thêm nên sentToKitchen = false');
    assert.strictEqual(itemSizeM?.qty, 1, 'Size M cũ có số lượng là 1');
    assert.strictEqual(itemSizeM?.sentToKitchen, true, 'Size M cũ vẫn giữ sentToKitchen = true');

    // Kiểm tra tổng tiền bàn = 30k + 36k = 66k
    const table = usePOSStore.getState().tables.find((t) => t.id === targetTable.id);
    assert.strictEqual(table?.totalAmount, 66000, 'Tổng tiền bàn phải là 66.000 đ (30k + 36k)');
    assert.strictEqual(table?.itemCount, 2, 'Tổng số lượng là 2');
  });

  await runner.test('3. Lưu Bếp lần 2: Đánh dấu món mới gửi bếp, giữ nguyên tính toàn vẹn của 2 dòng', () => {
    const store = usePOSStore.getState();

    // Bấm Lưu Bếp lần 2
    store.sendToKitchen();

    const cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    assert.strictEqual(cart.length, 2, 'Vẫn giữ nguyên 2 dòng');

    const itemSizeL = cart.find((c) => c.selectedSize === 'Size Lớn (L)');
    const itemSizeM = cart.find((c) => c.selectedSize === 'Size Vừa (M)');

    assert.strictEqual(itemSizeL?.sentToKitchen, true, 'Size L đã được chuyển thành sentToKitchen = true');
    assert.strictEqual(itemSizeM?.sentToKitchen, true, 'Size M vẫn là sentToKitchen = true');
  });

  await runner.test('4. Bất biến F&B: Khách gọi thêm sau khi đợt trước đã gửi bếp tạo dòng đợt mới (sentToKitchen = false)', () => {
    const store = usePOSStore.getState();

    // Sau khi Size L đợt 1 đã gửi bếp, khách gọi thêm 1 phần Size L nữa
    const addRound2SizeL = createSampleModifierData(snackItem, {
      qty: 1,
      selectedSize: 'Size Lớn (L)',
      unitPrice: 36000,
    });
    store.addToCart(addRound2SizeL);

    const cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    // Phải có 3 dòng: 1x Size M (đã gửi), 1x Size L đợt 1 (đã gửi), 1x Size L đợt 2 (chưa gửi)
    assert.strictEqual(cart.length, 3, 'Phải có 3 dòng để bếp biết in vé đợt gọi thêm mới');

    const unsentItems = cart.filter((c) => !c.sentToKitchen);
    assert.strictEqual(unsentItems.length, 1, 'Chỉ có đúng 1 món chưa gửi bếp (đợt mới)');
    assert.strictEqual(unsentItems[0].selectedSize, 'Size Lớn (L)', 'Món chưa gửi là Size L');

    // Tổng tiền bàn = 30k + 36k + 36k = 102k
    const table = usePOSStore.getState().tables.find((t) => t.id === targetTable.id);
    assert.strictEqual(table?.totalAmount, 102000, 'Tổng tiền bàn phải là 102.000 đ');
    assert.strictEqual(table?.itemCount, 3, 'Tổng số lượng là 3 phần');
  });

  await runner.test('5. Khi chưa gửi bếp: Gọi thêm cùng cấu hình Size L sẽ tự động gộp số lượng (Deduplication)', () => {
    const store = usePOSStore.getState();

    // Khi dòng Size L đợt 2 chưa gửi bếp, khách bảo "Lấy thêm 1 phần Size L nữa"
    const addAnotherBeforeSent = createSampleModifierData(snackItem, {
      qty: 1,
      selectedSize: 'Size Lớn (L)',
      unitPrice: 36000,
    });
    store.addToCart(addAnotherBeforeSent);

    const cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    // Vẫn là 3 dòng vì đợt chưa gửi bếp được gộp số lượng từ 1 lên 2
    assert.strictEqual(cart.length, 3, 'Vẫn là 3 dòng (gộp vào dòng Size L chưa gửi bếp)');

    const unsentItem = cart.find((c) => !c.sentToKitchen);
    assert.strictEqual(unsentItem?.qty, 2, 'Dòng Size L chưa gửi bếp có số lượng là 2');

    // Tổng tiền bàn = 30k + 36k + 2 * 36k = 138k
    const table = usePOSStore.getState().tables.find((t) => t.id === targetTable.id);
    assert.strictEqual(table?.totalAmount, 138000, 'Tổng tiền bàn là 138.000 đ');
    assert.strictEqual(table?.itemCount, 4, 'Tổng số lượng là 4 phần');
  });

  await runner.test('6. Khách đổi size món đã lưu bếp: updateCartItem tự động reset sentToKitchen về false để báo lại bếp', () => {
    resetStore();
    const store = usePOSStore.getState();

    // 1. Khách gọi Trà Sữa Size M (35k)
    const teaMod = createSampleModifierData(teaItem, {
      qty: 1,
      selectedSize: 'Size Vừa (M)',
      unitPrice: 35000,
    });
    store.addToCart(teaMod);
    store.sendToKitchen();

    let cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    const cartItemId = cart[0].cartItemId;
    assert.strictEqual(cart[0].sentToKitchen, true, 'Món ban đầu đã gửi bếp');

    // 2. Khách đổi ý: "Đổi thành Size L (+7k = 42k)"
    const updatedMod = createSampleModifierData(teaItem, {
      qty: 1,
      selectedSize: 'Size Lớn (L)',
      unitPrice: 42000,
    });
    store.updateCartItem(cartItemId, updatedMod);

    cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    assert.strictEqual(cart[0].selectedSize, 'Size Lớn (L)', 'Size đã đổi thành L');
    assert.strictEqual(cart[0].unitPrice, 42000, 'Đơn giá đã cập nhật 42.000 đ');
    assert.strictEqual(
      cart[0].sentToKitchen,
      false,
      'sentToKitchen phải được reset về false để Lưu Bếp tiếp theo báo lại bếp đổi size'
    );

    // 3. Nhân viên bấm Lưu Bếp lại -> Báo Bếp thành công
    store.sendToKitchen();
    cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    assert.strictEqual(cart[0].sentToKitchen, true, 'Sau khi lưu bếp lại thì sentToKitchen = true');
    assert.strictEqual(usePOSStore.getState().tables.find((t) => t.id === targetTable.id)?.totalAmount, 42000, 'Tổng tiền bàn cập nhật 42.000 đ');
  });

  await runner.test('7. Quick Inline Size Pills: Chạm trực tiếp pill Size L thêm ngay vào giỏ đúng giá và size 0ms', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Giả lập callback handleAddSize từ thẻ món khi bấm pill [L 42k]
    const sizeL = { id: 'l', name: 'Size Lớn (L)', priceDelta: 7000 };
    store.addToCart({
      item: teaItem,
      qty: 1,
      selectedSize: sizeL.name,
      sugarLevel: '100%',
      iceLevel: '100%',
      selectedToppings: [],
      note: '',
      unitPrice: teaItem.price + sizeL.priceDelta,
    });

    const cart = usePOSStore.getState().tableCarts[targetTable.id] || [];
    assert.strictEqual(cart.length, 1, 'Giỏ hàng có 1 món');
    assert.strictEqual(cart[0].selectedSize, 'Size Lớn (L)', 'Món được chọn đúng Size L');
    assert.strictEqual(cart[0].unitPrice, 42000, 'Đơn giá tính chính xác 42.000 đ (35k + 7k)');
    assert.strictEqual(cart[0].sentToKitchen, false, 'Món mới chưa gửi bếp');
  });
}
