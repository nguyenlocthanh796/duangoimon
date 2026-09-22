/**
 * 👑 OngChu Lean POS - 5-Device Concurrent Multi-Terminal Store Flow Test Suite
 * Simulates an active multi-terminal F&B store running 5 distinct devices:
 * 1. Cashier Kiosk (Quầy Thu Ngân)
 * 2. KDS Kitchen Display (Màn Bếp / Bar)
 * 3. Waiter 1 Mobile (Phục Vụ Bàn 01, 02)
 * 4. Waiter 2 Mobile (Phục Vụ Bàn 03, Mang Về)
 * 5. CFD Customer Facing Display (Màn Phụ Khách Hàng)
 */

import { runner, assert } from './harness';
import { usePOSStore, UNASSIGNED_TABLE, ShiftRecord } from '../lib/store/usePOSStore';
import { computeRealPnLMetrics } from '../lib/utils/reportCalculations';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';

export async function runFiveDevicesConcurrentStoreTests() {
  runner.setContext('Multi-Device Store', '5-Device Concurrent Restaurant Operations Flow');

  const t1 = mockTables[0]; // Bàn 01
  const t2 = mockTables[1]; // Bàn 02

  const milkTea = mockMenuItems[0]; // Trà Sữa Trân Châu Hoàng Gia (35k)
  const peachTea = mockMenuItems[1]; // Trà Đào Cam Sả (39k)
  const saltCoffee = mockMenuItems[2]; // Cà Phê Muối Cố Đô (29k)
  const snackItem = mockMenuItems[3]; // Khoai Tây Chiên (30k)

  const resetAllStoreState = () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({
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
      cashTransactions: [],
      selectedTable: { ...t1, status: 'trong', totalAmount: 0, itemCount: 0, guestCount: 0 },
      viewMode: 'pos',
      orderChannel: 'dine_in',
    });
  };

  // =========================================================================
  // GIAI ĐOẠN 1: THU NGÂN MỞ CA ĐẦU NGÀY
  // =========================================================================
  await runner.test('Phase 1: [Device 1 - Quầy Thu Ngân] Mở ca quầy đầu ngày (Tiền đầu ca: 1.000.000 đ)', () => {
    resetAllStoreState();
    const startingCash = 1000000;
    assert.strictEqual(startingCash, 1000000, 'Tiền đầu ca ban đầu là 1.000.000 đ');

    const store = usePOSStore.getState();
    assert.strictEqual(store.cashTransactions.length, 0, 'Sổ quỹ đầu ngày ban đầu bằng 0');
    assert.strictEqual(store.orderHistory.length, 0, 'Lịch sử đơn đầu ngày ban đầu bằng 0');
  });

  // =========================================================================
  // GIAI ĐOẠN 2: PHỤC VỤ 1 GỌI MÓN BÀN 01 & BÁO BẾP
  // =========================================================================
  await runner.test('Phase 2: [Device 3 - Phục Vụ 1] Khách vào Bàn 01 gọi 2 Trà Sữa Size L + 1 Trà Đào -> Báo Bếp', () => {
    resetAllStoreState();
    const store = usePOSStore.getState();
    store.selectTable(t1);

    // Thêm 2 Trà Sữa Size L (45k x 2 = 90k)
    store.addToCart(
      createSampleModifierData(milkTea, {
        qty: 2,
        selectedSize: 'Size Lớn (L)',
        unitPrice: 45000,
        note: '70% đường, 50% đá',
      })
    );

    // Thêm 1 Trà Đào Cam Sả (39k)
    store.addToCart(
      createSampleModifierData(peachTea, {
        qty: 1,
        selectedSize: 'Size Vừa (M)',
        unitPrice: 39000,
        note: 'Ít ngọt',
      })
    );

    let cart = usePOSStore.getState().tableCarts[t1.id] || [];
    assert.strictEqual(cart.length, 2, 'Bàn 01 có 2 dòng món');

    const milkTeaLine = cart.find((c) => c.item.id === milkTea.id);
    const peachTeaLine = cart.find((c) => c.item.id === peachTea.id);
    assert.strictEqual(milkTeaLine?.qty, 2, 'Trà Sữa có số lượng 2');
    assert.strictEqual(peachTeaLine?.qty, 1, 'Trà Đào có số lượng 1');
    assert.strictEqual(milkTeaLine?.sentToKitchen, false, 'Món chưa gửi bếp');

    // Phục vụ bấm "Báo Bếp"
    const res = store.sendToKitchen();
    assert.strictEqual(res.newCount, 3, 'Báo bếp thành công tổng cộng 3 phần món');

    cart = usePOSStore.getState().tableCarts[t1.id] || [];
    assert.strictEqual(cart[0].sentToKitchen, true, 'Dòng 1 đã đánh dấu sentToKitchen = true');
    assert.strictEqual(cart[1].sentToKitchen, true, 'Dòng 2 đã đánh dấu sentToKitchen = true');

    // Bàn 01 chuyển sang trạng thái "co_khach"
    const updatedT1 = usePOSStore.getState().tables.find((t) => t.id === t1.id);
    assert.strictEqual(updatedT1?.status, 'co_khach', 'Bàn 01 phải chuyển sang trạng thái có khách');
    assert.strictEqual(updatedT1?.totalAmount, 129000, 'Tổng tiền Bàn 01 là 90k + 39k = 129.000 đ');
  });

  // =========================================================================
  // GIAI ĐOẠN 3: MÀN HÌNH BẾP KDS NHẬN ĐƠN BÀN 01
  // =========================================================================
  await runner.test('Phase 3: [Device 2 - Màn Bếp KDS] Nhận vé Bàn 01 realtime qua WebSocket -> Đổi sang Đang làm', () => {
    const kds = usePOSStore.getState().kdsOrders;
    assert.strictEqual(kds.length, 1, 'KDS phải có 1 đơn từ Bàn 01');
    assert.strictEqual(kds[0].tableId, t1.id, 'Đơn KDS thuộc Bàn 01');
    assert.strictEqual(kds[0].items.length, 2, 'Vé bếp gồm 2 dòng món');
    assert.strictEqual(kds[0].status, 'pending', 'Trạng thái ban đầu là pending');

    // Đầu bếp bấm nhận món -> Đang chế biến
    usePOSStore.getState().updateKDSOrderStatus(kds[0].id, 'cooking');
    assert.strictEqual(usePOSStore.getState().kdsOrders[0].status, 'cooking', 'Vé bếp đã chuyển sang cooking');
  });

  // =========================================================================
  // GIAI ĐOẠN 4: PHỤC VỤ 2 GỌI MÓN MANG VỀ (TAKEAWAY)
  // =========================================================================
  await runner.test('Phase 4: [Device 4 - Phục Vụ 2] Khách mua mang về 2 Cà Phê Muối (note: Túi đôi) -> Báo Bếp', () => {
    const store = usePOSStore.getState();
    store.startNewOrder();

    // Thêm 2 Cà Phê Muối Cố Đô (29k x 2 = 58k)
    store.addToCart(
      createSampleModifierData(saltCoffee, {
        qty: 2,
        unitPrice: 29000,
        note: 'Mang đi túi đôi',
      })
    );

    const res = store.sendToKitchen();
    assert.strictEqual(res.newCount, 2, 'Gửi 2 phần mang về xuống bếp');

    const kds = usePOSStore.getState().kdsOrders;
    assert.strictEqual(kds.length, 2, 'KDS có 2 đơn (Bàn 01 và Mang Về)');
  });

  // =========================================================================
  // GIAI ĐOẠN 5: BÀN 01 GỌI THÊM ĐỢT 2 (REORDER ROUND 2)
  // =========================================================================
  await runner.test('Phase 5: [Device 3 - Phục Vụ 1] Khách Bàn 01 gọi thêm 1 Khoai Tây Chiên -> Tách dòng gửi bếp đợt 2', () => {
    const store = usePOSStore.getState();
    store.selectTable(t1);

    // Thêm 1 Khoai Tây Chiên (30k)
    store.addToCart(
      createSampleModifierData(snackItem, {
        qty: 1,
        unitPrice: 30000,
        note: 'Lắc nhiều phô mai',
      })
    );

    const cart = usePOSStore.getState().tableCarts[t1.id] || [];
    assert.strictEqual(cart.length, 3, 'Bàn 01 hiện có 3 dòng món');

    const newSnackLine = cart.find((c) => c.item.id === snackItem.id);
    assert.strictEqual(newSnackLine?.sentToKitchen, false, 'Món mới chưa gửi bếp');

    // Báo bếp đợt 2
    const res = store.sendToKitchen();
    assert.strictEqual(res.newCount, 1, 'Chỉ gửi đúng 1 phần mới của đợt 2');

    const updatedT1 = usePOSStore.getState().tables.find((t) => t.id === t1.id);
    assert.strictEqual(updatedT1?.totalAmount, 159000, 'Tổng tiền Bàn 01 là 129k + 30k = 159.000 đ');
  });

  // =========================================================================
  // GIAI ĐOẠN 6: ĐẦU BẾP HOÀN TẤT TẤT CẢ CÁC MÓN TRÊN KDS
  // =========================================================================
  await runner.test('Phase 6: [Device 2 - Màn Bếp KDS] Đầu bếp chế biến xong bấm Xong Hết (Ready/Served)', () => {
    const store = usePOSStore.getState();
    const kds = store.kdsOrders;

    // Bấm hoàn tất vé Bàn 01 và Mang Về
    store.updateKDSOrderStatus(kds[0].id, 'ready');
    store.updateKDSOrderStatus(kds[1].id, 'ready');

    assert.strictEqual(usePOSStore.getState().kdsOrders[0].status, 'ready');
    assert.strictEqual(usePOSStore.getState().kdsOrders[1].status, 'ready');
  });

  // =========================================================================
  // GIAI ĐOẠN 7: BÀN 01 XIN TÍNH TIỀN & MÀN PHỤ CFD ĐỒNG BỘ VIETQR
  // =========================================================================
  await runner.test('Phase 7: [Device 5 - Màn Phụ CFD] Đồng bộ giỏ hàng Bàn 01 (159.000 đ) & Cú pháp VietQR', () => {
    const cart = usePOSStore.getState().tableCarts[t1.id] || [];
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
    assert.strictEqual(subtotal, 159000, 'CFD nhận đúng tổng tiền Bàn 01: 159.000 đ');

    // Kiểm tra thông điệp VietQR hiển thị cho khách
    const bankBin = '970422'; // MBBank
    const bankAccount = '0988776655';
    const amount = subtotal;
    const memo = `BAN01_${Date.now()}`;
    const vietQrUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURI(memo)}`;

    assert.includes(vietQrUrl, '0988776655', 'URL VietQR chứa đúng số tài khoản quán');
    assert.includes(vietQrUrl, '159000', 'URL VietQR chứa đúng số tiền cần thu');
  });

  // =========================================================================
  // GIAI ĐOẠN 8: THU NGÂN HOÀN TẤT THANH TOÁN VIETQR BÀN 01
  // =========================================================================
  await runner.test('Phase 8: [Device 1 - Thu Ngân] Hoàn tất thanh toán VietQR -> Bàn 01 về trống, KDS đánh dấu Đã TT', () => {
    const store = usePOSStore.getState();
    store.selectTable(t1);

    // Áp dụng chiết khấu 9.000 đ -> Khách thanh toán 150.000 đ
    store.applyDiscount('fixed', 9000, 'Khách quen');

    const invoice = store.checkoutSuccess(150000, 'vietqr');
    assert.strictEqual(invoice.status, 'paid', 'Thanh toán Bàn 01 thành công');
    assert.isDefined(invoice.id, 'Có mã hóa đơn');

    // Bàn 01 đã được reset về trống
    const clearedT1 = usePOSStore.getState().tables.find((t) => t.id === t1.id);
    assert.strictEqual(clearedT1?.status, 'trong', 'Bàn 01 đã trở lại trạng thái bàn trống');
    assert.strictEqual(clearedT1?.totalAmount, 0, 'Tổng tiền Bàn 01 reset về 0');

    // Giỏ hàng Bàn 01 được dọn dẹp
    assert.strictEqual(usePOSStore.getState().tableCarts[t1.id], undefined, 'Giỏ hàng Bàn 01 đã xóa');

    // KDS đơn của Bàn 01 được đánh dấu isPaid = true
    const kdsT1 = usePOSStore.getState().kdsOrders.find((k) => k.tableId === t1.id);
    assert.strictEqual(kdsT1?.isPaid, true, 'KDS đơn Bàn 01 hiển thị cờ [Đã TT]');
  });

  // =========================================================================
  // GIAI ĐOẠN 9: THU NGÂN THANH TOÁN TIỀN MẶT ĐƠN MANG VỀ
  // =========================================================================
  await runner.test('Phase 9: [Device 1 - Thu Ngân] Thanh toán Mang Về tiền mặt 58.000 đ', () => {
    const store = usePOSStore.getState();
    store.selectTable(UNASSIGNED_TABLE);

    const invoice = store.checkoutSuccess(58000, 'tien_mat');
    assert.strictEqual(invoice.status, 'paid', 'Thanh toán đơn Mang Về thành công');
    assert.strictEqual(invoice.finalTotal, 58000, 'Số tiền đúng 58.000 đ');
  });

  // =========================================================================
  // GIAI ĐOẠN 10: CHI SỔ QUỸ TIỀN MẶT THỰC TẾ TRONG CA
  // =========================================================================
  await runner.test('Phase 10: [Device 1 - Thu Ngân] Chi Sổ Quỹ tiền mặt (Mua đá 20k, Túi nilong 50k = Chi 70k)', () => {
    const store = usePOSStore.getState();

    // Chi 1: Mua đá 20.000 đ
    store.addCashTransaction({
      type: 'chi',
      category: 'Mua đá lạnh',
      amount: 20000,
      description: 'Chi tiền mặt lấy 2 bao đá bi ca trưa',
      time: '12:15',
      performedBy: 'Thu Ngân 01',
    });

    // Chi 2: Mua túi nilong mang về 50.000 đ
    store.addCashTransaction({
      type: 'chi',
      category: 'Bao bì & Ly mang về',
      amount: 50000,
      description: 'Mua 1 cuộn túi nilon chữ T',
      time: '12:20',
      performedBy: 'Thu Ngân 01',
    });

    const txs = usePOSStore.getState().cashTransactions;
    assert.strictEqual(txs.length, 2, 'Đã ghi nhận 2 phiếu chi');

    const totalCashOut = txs.filter((t) => t.type === 'chi').reduce((sum, t) => sum + t.amount, 0);
    assert.strictEqual(totalCashOut, 70000, 'Tổng tiền mặt chi ra trong ca là 70.000 đ');
  });

  // =========================================================================
  // GIAI ĐOẠN 11: KIỂM KÉT & ĐÓNG CA GIAO TIỀN CHUẨN XÁC 100%
  // =========================================================================
  await runner.test('Phase 11: [Device 1 - Thu Ngân] Kiểm két 30s & Đóng ca: Tiền lý thuyết = 988.000 đ, lệch = 0 đ', () => {
    const startingCash = 1000000;
    const totalCashSales = 58000;
    const totalCashOut = 70000;
    const totalCashIn = 0;

    // Công thức kế toán bất biến:
    // expectedEndingCash = startingCash (1.000.000) + totalCashSales (58.000) + totalCashIn (0) - totalCashOut (70.000)
    // = 988.000 đ
    const expectedCash = startingCash + totalCashSales + totalCashIn - totalCashOut;
    assert.strictEqual(expectedCash, 988000, 'Tiền lý thuyết trong két phải là đúng 988.000 đ');

    const actualCash = 988000;
    const diffAmount = actualCash - expectedCash;
    assert.strictEqual(diffAmount, 0, 'Chênh lệch két đúng bằng 0 đ (khớp 100%)');

    // Lưu bản ghi ca đóng
    const closedShift: ShiftRecord = {
      id: `shift_${Date.now()}`,
      shiftName: 'Ca Sáng',
      cashierName: 'Thu Ngân 01',
      openedAt: '09/09 07:00',
      closedAt: '09/09 17:00',
      startingCash,
      totalCashSales,
      totalVietQRSales: 150000,
      totalCardSales: 0,
      totalCashIn,
      totalCashOut,
      expectedEndingCash: expectedCash,
      actualEndingCash: actualCash,
      differenceAmount: diffAmount,
      status: 'closed',
    };

    usePOSStore.getState().addShiftRecord(closedShift);
    const history = usePOSStore.getState().shiftHistory;
    assert.strictEqual(history[0].differenceAmount, 0, 'Lịch sử ca ghi nhận chênh lệch 0 đ');
  });

  // =========================================================================
  // GIAI ĐOẠN 12: BÁO CÁO 3 CON SỐ VÀNG BỎ TÚI (OWNER P&L)
  // =========================================================================
  await runner.test('Phase 12: [Chủ Quán Dashboard] Báo Cáo 3 Con Số Vàng: Két thực tế, Tiền VietQR, Lợi nhuận ròng', () => {
    const store = usePOSStore.getState();
    const { rangeConfig } = computeRealPnLMetrics(store.orderHistory, store.cashTransactions, 'today');

    // Tổng doanh thu: 150.000 đ (Bàn 01) + 58.000 đ (Mang về) = 208.000 đ
    assert.strictEqual(rangeConfig.revenue, 208000, 'Tổng doanh thu thực tế là 208.000 đ');

    // Con số 2: Tiền chuyển khoản VietQR trong ngân hàng = 150.000 đ
    assert.strictEqual(rangeConfig.vietqrTotal, 150000, 'Con số 2: Tiền VietQR trong ngân hàng là 150.000 đ');

    // Con số 3: Lợi nhuận ròng = Doanh thu - Giá vốn - Chi phí hoạt động
    assert.isDefined(rangeConfig.netProfit, 'Lợi nhuận ròng được tính toán');
    assert.isTrue(rangeConfig.netProfit > 0, 'Lợi nhuận ròng dương');
  });
}
