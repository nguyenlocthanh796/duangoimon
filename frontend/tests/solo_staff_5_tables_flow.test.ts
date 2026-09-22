import { runner, assert } from './harness';
import { usePOSStore, UNASSIGNED_TABLE } from '../lib/store/usePOSStore';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';

export async function runSoloStaff5TablesFlowTests() {
  runner.setContext('Workflows', 'Solo Staff 5-Table Real-World Flow');

  const t1 = mockTables[0]; // Bàn 01
  const t2 = mockTables[1]; // Bàn 02
  const t3 = mockTables[2]; // Bàn 03
  const t4 = mockTables[3]; // Bàn 04
  const t5 = mockTables[4]; // Bàn 05

  const cafeItem = mockMenuItems[2]; // Cà Phê Muối (29k)
  const teaItem = mockMenuItems[1]; // Trà Đào Cam Sả (39k)
  const snackItem = mockMenuItems[3]; // Khoai Tây Chiên (30k)

  const resetStore = () => {
    usePOSStore.setState({
      tables: mockTables.slice(0, 5).map((t) => ({
        ...t,
        status: 'trong',
        totalAmount: 0,
        itemCount: 0,
        guestCount: 0,
      })),
      tableCarts: {},
      tableDiscounts: {},
      kdsOrders: [],
      orderHistory: [],
      selectedTable: { ...t1, status: 'trong', totalAmount: 0, itemCount: 0, guestCount: 0 },
      viewMode: 'pos',
      orderChannel: 'dine_in',
    });
  };

  await runner.test('Tình huống 1: Khách vào Bàn 01 gọi món & Lưu Bếp (Order & Kitchen Sync)', () => {
    resetStore();
    const store = usePOSStore.getState();
    store.selectTable(t1);

    store.addToCart(createSampleModifierData(cafeItem, { qty: 1, unitPrice: 29000 }));
    store.addToCart(createSampleModifierData(teaItem, { qty: 1, unitPrice: 39000, note: 'Ít đường' }));

    let cart = usePOSStore.getState().tableCarts[t1.id] || [];
    assert.strictEqual(cart.length, 2, 'Giỏ hàng Bàn 01 có 2 món');
    assert.strictEqual(cart[0].sentToKitchen, false, 'Món chưa gửi bếp');

    const result = store.sendToKitchen();
    assert.strictEqual(result.newCount, 2, 'Gửi 2 món xuống bếp');

    cart = usePOSStore.getState().tableCarts[t1.id] || [];
    assert.strictEqual(cart[0].sentToKitchen, true, 'Món 1 đã gửi bếp');
    assert.strictEqual(cart[1].sentToKitchen, true, 'Món 2 đã gửi bếp');

    const kds = usePOSStore.getState().kdsOrders;
    assert.strictEqual(kds.length, 1, 'KDS có 1 đơn');
    assert.strictEqual(kds[0].tableId, t1.id, 'Đơn KDS thuộc Bàn 01');
    assert.strictEqual(kds[0].items.length, 2, 'Đơn KDS có 2 món');
  });

  await runner.test('Tình huống 2: Khách Bàn 01 đổi món/công thức -> Tự động reset sentToKitchen', () => {
    // Kế thừa từ tình huống 1
    const store = usePOSStore.getState();
    let cart = usePOSStore.getState().tableCarts[t1.id] || [];
    assert.strictEqual(cart[0].sentToKitchen, true);

    // Khách đổi ý: Đổi sang Size Lớn (+6k), bớt đá
    store.updateCartItem(cart[0].cartItemId, {
      item: cafeItem,
      qty: 1,
      selectedSize: 'Size Lớn (L)',
      iceLevel: '50%',
      selectedToppings: [],
      note: 'Bớt đá',
      unitPrice: 35000,
    });

    cart = usePOSStore.getState().tableCarts[t1.id] || [];
    assert.strictEqual(cart[0].selectedSize, 'Size Lớn (L)', 'Size đã đổi thành L');
    assert.strictEqual(cart[0].sentToKitchen, false, 'sentToKitchen tự động reset về false để báo lại bếp');
  });

  await runner.test('Tình huống 3: Khách Bàn 01 gọi thêm đợt 2 (Reorder Round 2) tách dòng', () => {
    const store = usePOSStore.getState();
    // Bấm gửi bếp các thay đổi của đợt trước
    store.sendToKitchen();

    // 20 phút sau, khách gọi thêm 1 ly Trà Đào y hệt
    store.addToCart(createSampleModifierData(teaItem, { qty: 1, unitPrice: 39000, note: 'Ít đường' }));

    const cart = usePOSStore.getState().tableCarts[t1.id] || [];
    // Bất biến F&B: Đợt gọi mới không được gộp vào đợt cũ đã gửi bếp
    assert.strictEqual(cart.length, 3, 'Giỏ hàng có 3 dòng riêng biệt');
    // Món mới được prepend ở vị trí 0
    assert.strictEqual(cart[0].sentToKitchen, false, 'Món mới gọi chưa gửi bếp');
    assert.strictEqual(cart[1].sentToKitchen, true, 'Món cũ đợt 1 đã gửi bếp');
    assert.strictEqual(cart[2].sentToKitchen, true, 'Món cũ đợt 1 đã gửi bếp');

    const result2 = store.sendToKitchen();
    assert.strictEqual(result2.newCount, 1, 'Chỉ gửi 1 món mới xuống bếp');
  });

  await runner.test('Tình huống 4: Khách Bàn 01 chuyển sang Bàn 02 (Move Table & KDS sync)', () => {
    const store = usePOSStore.getState();
    store.applyDiscount('percent', 10, 'Khách quen');

    // Chuyển sang Bàn 02
    const ok = store.moveTable(t2.id);
    assert.strictEqual(ok, true, 'Chuyển bàn thành công');

    const state = usePOSStore.getState();
    // Bàn 01 trở về trống
    assert.strictEqual(state.tables.find((t) => t.id === t1.id)?.status, 'trong', 'Bàn 01 trở về trống');
    assert.strictEqual(state.tableCarts[t1.id], undefined, 'Giỏ Bàn 01 đã xóa');
    assert.strictEqual(state.tableDiscounts[t1.id], undefined, 'Giảm giá Bàn 01 đã dọn');

    // Bàn 02 nhận giỏ hàng & khuyến mãi
    assert.strictEqual(state.tables.find((t) => t.id === t2.id)?.status, 'co_khach', 'Bàn 02 có khách');
    assert.strictEqual(state.tableCarts[t2.id]?.length, 3, 'Bàn 02 nhận đủ 3 món');
    assert.strictEqual(state.tableDiscounts[t2.id]?.value, 10, 'Bàn 02 kế thừa giảm giá 10%');

    // Bất biến KDS: Toàn bộ vé KDS tự động cập nhật tên và ID thành Bàn 02
    for (const o of state.kdsOrders) {
      assert.strictEqual(o.tableId, t2.id, 'Đơn KDS đã chuyển sang tableId của Bàn 02');
      assert.strictEqual(o.tableName, t2.name, 'Đơn KDS đã chuyển sang tableName của Bàn 02');
    }
  });

  await runner.test('Tình huống 5: Khách Bàn 03 gộp sang Bàn 02 (Merge Tables)', () => {
    const store = usePOSStore.getState();
    // Bàn 03 có khách gọi 1 Khoai tây chiên
    store.selectTable(t3);
    store.addToCart(createSampleModifierData(snackItem, { qty: 1, unitPrice: 30000 }));
    store.sendToKitchen();

    // Bàn 03 gộp vào Bàn 02
    const ok = store.mergeTable(t2.id);
    assert.strictEqual(ok, true, 'Gộp bàn thành công');

    const state = usePOSStore.getState();
    // Bàn 03 trở về trống
    assert.strictEqual(state.tables.find((t) => t.id === t3.id)?.status, 'trong', 'Bàn 03 trở về trống');
    assert.strictEqual(state.tableCarts[t3.id], undefined, 'Giỏ Bàn 03 đã xóa');

    // Bàn 02 nhận thêm món từ Bàn 03 (3 + 1 = 4 món)
    assert.strictEqual(state.tableCarts[t2.id]?.length, 4, 'Bàn 02 có 4 món sau khi gộp');

    // KDS bàn 03 được chuyển sang Bàn 02
    for (const o of state.kdsOrders) {
      assert.strictEqual(o.tableId, t2.id, 'Tất cả KDS orders đều chuyển sang Bàn 02');
    }
  });

  await runner.test('Tình huống 6: Khách tách bàn / Tách hóa đơn (Split Table & Checkout)', () => {
    const store = usePOSStore.getState();
    const cartT2 = store.tableCarts[t2.id] || [];
    assert.strictEqual(cartT2.length, 4, 'Bàn 02 có 4 món trước khi tách');
    const itemToSplit = cartT2[0].cartItemId;

    store.selectTable(t2);
    // Tách món đầu tiên sang Bàn 04 cho người về trước trả
    const ok = store.splitTable(t4.id, [itemToSplit]);
    assert.strictEqual(ok, true, 'Tách bàn thành công');

    const stateAfterSplit = usePOSStore.getState();
    assert.strictEqual(stateAfterSplit.tableCarts[t2.id]?.length, 3, 'Bàn 02 còn 3 món');
    assert.strictEqual(stateAfterSplit.tableCarts[t4.id]?.length, 1, 'Bàn 04 có 1 món tách');

    // Bàn 04 thanh toán trước
    store.selectTable(t4);
    const invoice = store.checkoutSuccess(30000, 'tien_mat');
    assert.strictEqual(invoice.status, 'paid', 'Hóa đơn Bàn 04 đã thanh toán');

    const stateAfterPay = usePOSStore.getState();
    assert.strictEqual(stateAfterPay.tables.find((t) => t.id === t4.id)?.status, 'trong', 'Bàn 04 dọn sạch về trống');
    assert.strictEqual(stateAfterPay.tables.find((t) => t.id === t2.id)?.status, 'co_khach', 'Bàn 02 vẫn có khách');
  });

  await runner.test('Tình huống 7: Khách mua mang về (Takeaway) xen giữa lúc các bàn đang dùng', () => {
    const store = usePOSStore.getState();
    // Tạo đơn mang về không gán bàn
    store.startNewOrder();
    assert.strictEqual(usePOSStore.getState().selectedTable.id, UNASSIGNED_TABLE.id, 'Đang ở trạng thái Chưa Chọn Bàn');

    store.addToCart(createSampleModifierData(snackItem, { qty: 2, unitPrice: 30000 }));
    assert.strictEqual(usePOSStore.getState().tableCarts['unassigned']?.length, 1, 'Giỏ mang về có 1 món');

    // Thanh toán ngay tại quầy
    const invoice = store.checkoutSuccess(60000, 'tien_mat');
    assert.strictEqual(invoice.tableName, 'Chưa Chọn Bàn', 'Hóa đơn mang về');
    assert.strictEqual(usePOSStore.getState().tableCarts['unassigned'], undefined, 'Giỏ mang về đã dọn');

    // Bàn 02 vẫn nguyên vẹn
    assert.strictEqual(usePOSStore.getState().tableCarts[t2.id]?.length, 3, 'Bàn 02 không bị ảnh hưởng');
  });

  await runner.test('Tình huống 8: Thanh toán hỗn hợp (Mixed Payment: Tiền mặt + VietQR)', () => {
    const store = usePOSStore.getState();
    store.selectTable(t2);

    const subTotal = (store.tableCarts[t2.id] || []).reduce((s, c) => s + c.unitPrice * c.qty, 0);
    // Khách trả 50k tiền mặt, phần còn lại chuyển khoản VietQR
    const cashPart = 50000;
    const qrPart = Math.max(0, subTotal - cashPart);

    const invoice = store.checkoutSuccess(subTotal, 'hon_hop', {
      cashAmount: cashPart,
      vietqrAmount: qrPart,
    });

    assert.strictEqual(invoice.paymentMethod, 'hon_hop', 'Phương thức thanh toán là hỗn hợp');
    assert.strictEqual(invoice.paymentDetails?.cashAmount, cashPart, 'Khớp tiền mặt');
    assert.strictEqual(invoice.paymentDetails?.vietqrAmount, qrPart, 'Khớp VietQR');

    const state = usePOSStore.getState();
    assert.strictEqual(state.tables.find((t) => t.id === t2.id)?.status, 'trong', 'Bàn 02 đã thanh toán và về trống');
    assert.strictEqual(state.tableCarts[t2.id], undefined, 'Giỏ Bàn 02 đã xóa');
  });

  await runner.test('Tình huống 9: Hủy món (Void Item) khi khách hủy -> tự động xóa khỏi KDS', () => {
    const store = usePOSStore.getState();
    store.selectTable(t5);

    store.addToCart(createSampleModifierData(cafeItem, { qty: 1, unitPrice: 29000 }));
    store.addToCart(createSampleModifierData(teaItem, { qty: 1, unitPrice: 39000 }));
    store.sendToKitchen();

    let kds = usePOSStore.getState().kdsOrders;
    assert.strictEqual(kds[0].items.length, 2, 'KDS ban đầu có 2 món');

    const cartT5 = usePOSStore.getState().tableCarts[t5.id] || [];
    const itemToVoid = cartT5[0].cartItemId;

    // Hủy món đầu tiên
    store.voidItem(itemToVoid, 'Khách đi gấp');

    const cartAfter = usePOSStore.getState().tableCarts[t5.id] || [];
    assert.strictEqual(cartAfter.length, 1, 'Giỏ Bàn 05 còn 1 món');

    // Bất biến F&B: KDS tự động loại bỏ món bị hủy để nhân viên dừng pha chế
    kds = usePOSStore.getState().kdsOrders;
    assert.strictEqual(kds[0].items.length, 1, 'KDS chỉ còn 1 món');
    assert.strictEqual(kds[0].items[0].cartItemId, cartAfter[0].cartItemId, 'Khớp món còn lại');
  });

  await runner.test('Tình huống 10: Lưu vết Audit Log hủy món sau gửi bếp khi hoàn tất thanh toán', () => {
    const store = usePOSStore.getState();
    store.selectTable(t5);

    // Kiểm tra tableVoidLogs của Bàn 05 đã ghi nhận món bị hủy
    const voidLogs = store.tableVoidLogs?.[t5.id] || [];
    assert.strictEqual(voidLogs.length, 1, 'tableVoidLogs ghi nhận 1 món bị hủy sau gửi bếp');
    assert.strictEqual(voidLogs[0].reason, 'Khách đi gấp', 'Ghi đúng lý do hủy');

    // Bàn 05 thanh toán món còn lại
    const invoice = store.checkoutSuccess(39000, 'tien_mat');
    assert.strictEqual(invoice.status, 'paid', 'Hóa đơn đã thanh toán');

    // Kiểm tra invoice.auditLogs có chứa dòng HỦY MÓN BẾP
    const voidAudit = invoice.auditLogs?.find((l) => l.action.includes('HỦY MÓN BẾP'));
    assert.isDefined(voidAudit, 'Hóa đơn lưu vết Audit Log hủy món');
    assert.strictEqual(voidAudit?.type, 'warning', 'Mức độ cảnh báo là warning');
    assert.isTrue(voidAudit?.action.includes('Khách đi gấp'), 'Audit Log chứa lý do hủy');

    // tableVoidLogs của Bàn 05 đã được dọn sạch sau thanh toán
    assert.strictEqual(usePOSStore.getState().tableVoidLogs?.[t5.id], undefined, 'tableVoidLogs đã dọn');
  });

  await runner.test('Tình huống 11: KDS hiển thị cờ [Đã TT] (isPaid = true) khi bàn thanh toán trước lúc bếp đang làm', () => {
    const store = usePOSStore.getState();
    // Khách vào Bàn 01 gọi 2 ly nước
    store.selectTable(t1);
    store.addToCart(createSampleModifierData(cafeItem, { qty: 2, unitPrice: 29000 }));
    store.sendToKitchen();

    let kdsList = usePOSStore.getState().kdsOrders;
    const ticketT1 = kdsList.find((k) => k.tableId === t1.id);
    assert.isDefined(ticketT1, 'Có vé KDS cho Bàn 01');
    assert.isFalse(Boolean(ticketT1?.isPaid), 'Vé mới chưa thanh toán');

    // Khách trả tiền trước tại quầy
    store.checkoutSuccess(58000, 'tien_mat');

    // KDS tự động cập nhật isPaid = true để bếp biết khách đã trả tiền, không hủy vé
    kdsList = usePOSStore.getState().kdsOrders;
    const paidTicketT1 = kdsList.find((k) => k.tableId === t1.id);
    assert.isTrue(Boolean(paidTicketT1?.isPaid), 'Vé KDS đã được gắn cờ isPaid = true');
    assert.isDefined(paidTicketT1?.paidAt, 'Có mốc thời gian paidAt');
  });
}
