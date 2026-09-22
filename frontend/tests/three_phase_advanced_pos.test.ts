/**
 * 👑 OngChu Lean POS - Automated Test Suite
 * 3-Phase Advanced Enterprise POS Roadmap Tests:
 * - Giai Đoạn 1: Voice Announcer & Webhook Auto-Reconcile (Loa Báo Chuyển Khoản 0đ)
 * - Giai Đoạn 2: Yield Rate & COGS Spike Protection (% Hao Hụt & Giá Vốn Hiệu Dụng)
 * - Giai Đoạn 3: e-Invoice MTT CQT (Hóa Đơn Điện Tử Nghị Định 123 / Thông Tư 78)
 */

import { runner, assert } from './harness';
import { usePOSStore } from '../lib/store/usePOSStore';
import { vietnameseNumberToWords } from '../lib/utils/voiceAnnouncer';
import {
  calculateEffectiveCost,
  checkCostPriceSpike,
} from '../lib/constants/menuData';
import {
  validateTaxCode,
  generateCqtCode,
  issueEInvoiceRecord,
} from '../lib/utils/eInvoice';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';

export async function runThreePhaseAdvancedPOSTests() {
  runner.setContext('3-Phase Advanced POS', 'Voice Webhook, Yield COGS & e-Invoice MTT');

  const resetStore = () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
      orderHistory: [],
      inventoryItems: [],
      customers: [
        {
          id: 'cust_test_01',
          name: 'Anh Nam Công Ty ABC',
          phone: '0987654321',
          rewardPoints: 10000,
          totalSpend: 500000,
          debtBalance: 150000,
        },
      ],
    });
    usePOSStore.getState().updateStoreSettings({
      vatRate: 0,
      serviceFeeRate: 0,
      flatSurcharge: 0,
      enableVoiceAlert: true,
      autoCompleteOrderOnTransfer: true,
      enableEInvoice: true,
      eInvoiceTaxCode: '0316892345',
      eInvoiceSellerName: 'CÔNG TY TNHH F&B ÔNG CHỦ LEAN POS',
      eInvoiceTemplateCode: '1C26TAA',
    });
  };

  // ==========================================
  // GIAI ĐOẠN 1: VOICE ANNOUNCER & WEBHOOK
  // ==========================================
  await runner.test('Phase 1.1: Vietnamese Number to Words Conversion Accuracy', () => {
    const text45k = vietnameseNumberToWords(45000);
    assert.strictEqual(text45k, 'bốn mươi lăm nghìn', '45,000 should convert correctly');

    const text150k = vietnameseNumberToWords(150000);
    assert.strictEqual(text150k, 'một trăm năm mươi nghìn', '150,000 should convert correctly');

    const text1250k = vietnameseNumberToWords(1250000);
    assert.strictEqual(text1250k, 'một triệu hai trăm năm mươi nghìn', '1,250,000 should convert correctly');

    const text10m = vietnameseNumberToWords(10000000);
    assert.strictEqual(text10m, 'mười triệu', '10,000,000 should convert correctly');
  });

  await runner.test('Phase 1.2: Webhook Auto-Reconciles Customer Debt Invoice', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Tạo 1 hóa đơn ghi nợ
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2 })); // 70k
    store.checkoutSuccess(0, 'ghi_no', {
      customerPhone: '0987654321',
      customerName: 'Anh Nam Công Ty ABC',
    });

    const orders = usePOSStore.getState().orderHistory;
    assert.strictEqual(orders.length, 1, 'Debt invoice created');
    const debtInvoice = orders[0];
    assert.strictEqual(debtInvoice.paymentMethod, 'ghi_no');
    assert.strictEqual(debtInvoice.isDebtPaid, false);

    // Bắn Webhook chuyển khoản khớp đúng mã hóa đơn
    const res = store.handleBankTransferReceived({
      amount: 70000,
      matched_order_code: debtInvoice.orderCode,
      gateway: 'VietinBank',
      content: `Thanh toan don ${debtInvoice.orderCode}`,
    });

    assert.strictEqual(res.success, true, 'Webhook should process successfully');
    assert.strictEqual(res.autoReconciled, true, 'Debt should be auto reconciled');

    // Kiểm tra công nợ khách hàng đã được gạch: 150k nợ cũ + 70k nợ mới - 70k gạch nợ = 150k
    const cust = usePOSStore.getState().customers.find((c) => c.phone === '0987654321');
    assert.strictEqual(cust?.debtBalance, 150000, 'Debt balance updated to 150,000');

    const updatedInvoice = usePOSStore.getState().orderHistory.find((o) => o.id === debtInvoice.id);
    assert.strictEqual(updatedInvoice?.isDebtPaid, true, 'Invoice debt marked as paid');
  });

  await runner.test('Phase 1.3: Webhook Auto-Checkouts Active Table When Order Matches', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Bàn 1 đang có giỏ hàng 105k
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 3 })); // 105k
    const tableId = mockTables[0].id;
    assert.strictEqual(usePOSStore.getState().tableCarts[tableId]?.length, 1);

    // Webhook nhận được 105k
    const res = store.handleBankTransferReceived({
      amount: 105000,
      gateway: 'MBBank',
      content: 'Chuyen tien ban 01',
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.autoReconciled, true);

    // Bàn đã được thanh toán và giỏ hàng bàn được dọn
    const postOrders = usePOSStore.getState().orderHistory;
    assert.strictEqual(postOrders.length, 1);
    assert.strictEqual(postOrders[0].paymentMethod, 'vietqr');
    assert.strictEqual(postOrders[0].finalTotal, 105000);
  });

  // ==========================================
  // GIAI ĐOẠN 2: YIELD RATE & COGS PROTECTION
  // ==========================================
  await runner.test('Phase 2.1: Yield Rate & Effective Cost Calculation', () => {
    // Thịt bò tươi nhập thô 240,000 đ/kg. Tỉ lệ hao hụt gân mỡ sau lọc là 25% (Yield 75%)
    // Giá vốn thực tế = 240,000 / (75 / 100) = 320,000 đ/kg
    const effectiveCost = calculateEffectiveCost(240000, 75);
    assert.strictEqual(effectiveCost, 320000, 'Effective cost must account for yield waste');

    // Tỉ lệ yield 100% (không hao hụt) -> giá vốn giữ nguyên
    const zeroWasteCost = calculateEffectiveCost(150000, 100);
    assert.strictEqual(zeroWasteCost, 150000, '100% yield leaves cost unchanged');
  });

  await runner.test('Phase 2.2: COGS Price Spike Detection (> 15%)', () => {
    // Giá vốn trước: 100,000 đ. Giá mới: 120,000 đ (+20% > 15%) -> Cảnh báo spike
    const spikeRes = checkCostPriceSpike(120000, 100000, 15);
    assert.strictEqual(spikeRes.isSpike, true, '20% increase should trigger spike');
    assert.strictEqual(spikeRes.percentChange, 20, 'Spike percent must be 20%');

    // Giá mới: 110,000 đ (+10% <= 15%) -> An toàn
    const normalRes = checkCostPriceSpike(110000, 100000, 15);
    assert.strictEqual(normalRes.isSpike, false, '10% increase is within safety margin');
  });

  await runner.test('Phase 2.3: Restock Inventory Item Recalculates Effective Cost', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Thêm nguyên liệu Cà phê Robusta Mộc với yieldRate 90% (hao hụt 10% khi xay/sàng)
    store.addInventoryItem({
      sku: 'NL-CF-01',
      name: 'Cà phê Hạt Robusta Honey',
      category: 'nguyen_lieu',
      unit: 'kg',
      currentStock: 10,
      minStockAlert: 2,
      costPrice: 180000,
      yieldRate: 90, // Effective cost = 200,000
    });

    const item = usePOSStore.getState().inventoryItems.find((i) => i.sku === 'NL-CF-01');
    assert.isTrue(Boolean(item), 'Item must exist in inventory');
    assert.strictEqual(item?.effectiveCostPrice, 200000, 'Initial effective cost must be 200,000');

    // Nhập thêm kho 10kg với tổng chi phí 2,250,000 đ (giá đơn vị 225,000 đ/kg, tăng 25% > 15% spike)
    const restockRes = store.restockInventoryItem(item!.id, 10, 2250000, 'cash');
    assert.strictEqual(restockRes?.isSpike, true, 'Should detect price spike');

    const updatedItem = usePOSStore.getState().inventoryItems.find((i) => i.id === item!.id);
    assert.strictEqual(updatedItem?.currentStock, 20, 'Stock should be 20');
    assert.strictEqual(updatedItem?.previousCostPrice, 180000, 'Previous cost price recorded');
    // Effective cost mới = 225,000 / 0.9 = 250,000
    assert.strictEqual(updatedItem?.effectiveCostPrice, 250000, 'New effective cost must be 250,000');
  });

  // ==========================================
  // GIAI ĐOẠN 3: HÓA ĐƠN ĐIỆN TỬ MÁY TÍNH TIỀN (NĐ 123 / TT 78)
  // ==========================================
  await runner.test('Phase 3.1: Vietnam Tax Code (MST) Validation Engine', () => {
    // MST Doanh nghiệp 10 số
    assert.strictEqual(validateTaxCode('0316892345'), true, 'Valid 10-digit tax code');
    // MST Chi nhánh 13 số
    assert.strictEqual(validateTaxCode('0316892345-001'), true, 'Valid 13-digit branch tax code');
    // Sai định dạng: có chữ cái hoặc thiếu số
    assert.strictEqual(validateTaxCode('031689ABCDE'), false, 'Letters invalid');
    assert.strictEqual(validateTaxCode('12345678'), false, '8-digit invalid');
    assert.strictEqual(validateTaxCode(''), false, 'Empty tax code invalid');
  });

  await runner.test('Phase 3.2: CQT Code Generator Follows Decree 123 MTT Standard', () => {
    const cqtCode = generateCqtCode('0316892345', '12');
    assert.isTrue(cqtCode.startsWith('M1-'), 'CQT Code for POS MTT must start with M1-');
    assert.isTrue(cqtCode.includes('0316892345'), 'CQT Code must contain seller tax code');
    assert.isTrue(cqtCode.includes('00000012'), 'CQT Code must pad invoice number to 8 digits');
  });

  await runner.test('Phase 3.3: Issue e-Invoice Record Structure & CQT Lookup QR', () => {
    const record = issueEInvoiceRecord({
      orderCode: 'HD-260910-001',
      sellerTaxCode: '0316892345',
      sellerName: 'CÔNG TY TNHH F&B ÔNG CHỦ LEAN POS',
      buyer: {
        taxCode: '0101234567',
        buyerName: 'Công Ty Công Nghệ Phần Mềm Alpha',
        buyerAddress: 'Quận 1, TP. Hồ Chí Minh',
        buyerEmail: 'ketoan@alpha.vn',
      },
      items: [
        { name: 'Cà phê Muối', unit: 'Ly', qty: 2, unitPrice: 35000, total: 70000, vatRate: 8 },
      ],
      totalAmount: 70000,
      vatAmount: 5600,
      finalAmount: 75600,
    });

    assert.isTrue(Boolean(record.id), 'Record must have unique id');
    assert.strictEqual(record.templateCode, '1C26TAA', 'Template code default');
    assert.strictEqual(record.status, 'issued', 'Status must be issued');
    assert.strictEqual(record.buyerTaxCode, '0101234567', 'Buyer tax code correct');
    assert.isTrue(record.lookupUrl.includes('hoadondientu.gdt.gov.vn'), 'Lookup URL points to GDT');
    assert.isTrue(record.qrData.includes('0316892345'), 'QR payload contains seller MST');
  });

  await runner.test('Phase 3.4: Store Checkout Automatically Attaches e-Invoice When Requested', () => {
    resetStore();
    const store = usePOSStore.getState();

    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2 }));
    store.checkoutSuccess(70000, 'tien_mat', {
      buyerTaxInfo: {
        taxCode: '0316892345',
        buyerName: 'CÔNG TY TNHH ABC',
        buyerAddress: '123 Nguyễn Huệ, Q.1',
        buyerEmail: 'ketoan@abc.com',
      },
    });

    const order = usePOSStore.getState().orderHistory[0];
    assert.isTrue(Boolean(order.eInvoice), 'Order must have attached e-invoice');
    assert.strictEqual(order.eInvoice?.buyer.taxCode, '0316892345');
    assert.strictEqual(order.eInvoice?.buyer.buyerName, 'CÔNG TY TNHH ABC');

    // Audit log phải có dòng ghi vết HĐĐT
    const einvAudit = order.auditLogs?.find((log) => log.action.includes('XUẤT HĐĐT'));
    assert.isTrue(Boolean(einvAudit), 'Audit log must record e-invoice issuance');

    // Cấp HĐĐT lại cho đơn đã có HĐĐT phải báo lỗi đã xuất
    const reissue = store.issueOrderEInvoice(order.id, {
      taxCode: '0316892345',
      buyerName: 'CÔNG TY TNHH ABC',
    });
    assert.strictEqual(reissue.success, false, 'Cannot re-issue invoice already created');
  });
}
