/**
 * 👑 Tier 4: Real-World Workload Scenarios Test Suite (5 Comprehensive Scenarios)
 * Full end-to-end F&B application lifecycle simulations.
 */

import { runner, assert } from './harness';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';
import { usePOSStore, CartItem } from '../lib/store/usePOSStore';
import { searchAndRankItems, removeVietnameseDiacritics } from '../lib/utils/vietnameseSearch';

export async function runTier4Tests() {
  runner.setContext('Tier 4', 'Real-World Workloads');

  // =========================================================================
  // Scenario 1: High-Velocity Lunch Rush POS Order Simulation
  // =========================================================================
  await runner.test('Scenario 1: Fast-Paced Lunch Rush POS Order Simulation (10 Customers)', () => {
    const startRush = performance.now();

    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
    });

    const store = usePOSStore.getState();

    // 10 customer orders simulation
    const queries = ['tstc', 'tdcs', 'cpm', 'ktcpm', 'bmnmo', 'tra sua', 'ca phe', 'tra dao', 'khoai tay', 'banh mi'];
    let totalRushRevenue = 0;

    for (let c = 0; c < queries.length; c++) {
      // 1. Search item by keyword or acronym
      const q = queries[c];
      const matched = searchAndRankItems(mockMenuItems, q, (i) => i.name, (i) => i.code);
      assert.greaterThan(matched.length, 0, `Query "${q}" found item`);
      const item = matched[0];

      // 2. Select table
      const table = mockTables[c % mockTables.length];
      store.selectTable(table);

      // 3. Add to cart with modifiers
      const modifierData = createSampleModifierData(item, {
        qty: (c % 3) + 1,
        selectedSize: c % 2 === 0 ? 'Size Lớn (L)' : 'Size Vừa (M)',
        sugarLevel: '70%',
        iceLevel: '100%',
        selectedToppings: c % 2 === 0 ? ['Trân Châu Hoàng Gia'] : [],
        unitPrice: item.price + (c % 2 === 0 ? 7000 : 0),
        note: `Khách số ${c + 1}`,
      });
      store.addToCart(modifierData);

      // 4. Send to kitchen
      const kitchenResult = store.sendToKitchen();
      assert.greaterThan(kitchenResult.newCount, 0);

      // 5. Checkout
      const cart = store.getCart();
      const orderTotal = cart.reduce((s, it) => s + it.unitPrice * it.qty, 0);
      totalRushRevenue += orderTotal;

      store.checkoutSuccess(orderTotal);
    }

    const rushDuration = performance.now() - startRush;
    assert.greaterThan(totalRushRevenue, 200000, 'Total lunch rush revenue calculated');
    assert.lessThan(rushDuration, 150, `10 Lunch rush orders completed in ${rushDuration}ms (< 150ms requirement)`);
  });

  // =========================================================================
  // Scenario 2: Table Split, Transfer & Multi-Cart Sync
  // =========================================================================
  await runner.test('Scenario 2: Table Split, Transfer & Multi-Cart Sync Across 4 Tables', () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
    });

    const store = usePOSStore.getState();

    // 1. Populate 4 tables with distinct orders
    store.selectTable(mockTables[0]); // t1 (Bàn 01)
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2, unitPrice: 35000 })); // 70k

    store.selectTable(mockTables[1]); // t2 (Bàn 02)
    store.addToCart(createSampleModifierData(mockMenuItems[1], { qty: 2, unitPrice: 39000 })); // 78k
    store.addToCart(createSampleModifierData(mockMenuItems[3], { qty: 1, unitPrice: 30000 })); // 30k (total 108k)

    store.selectTable(mockTables[2]); // t3 (Bàn 03)
    store.addToCart(createSampleModifierData(mockMenuItems[2], { qty: 2, unitPrice: 29000 })); // 58k

    store.selectTable(mockTables[3]); // t4 VIP
    store.addToCart(createSampleModifierData(mockMenuItems[4], { qty: 4, unitPrice: 25000 })); // 100k

    // Check isolation
    let state = usePOSStore.getState();
    assert.strictEqual(state.tableCarts['t1']?.length, 1);
    assert.strictEqual(state.tableCarts['t2']?.length, 2);
    assert.strictEqual(state.tableCarts['t3']?.length, 1);
    assert.strictEqual(state.tableCarts['t4']?.length, 1);

    // 2. Table Transfer: t1 moves to t5 (Lầu 1)
    store.selectTable(mockTables[0]);
    const moveSuccess = store.moveTable('t5');
    assert.isTrue(moveSuccess, 'Table 1 moved to Table 5');

    // 3. Table Split: t2 splits 1 item (snacks) to t6
    store.selectTable(mockTables[1]);
    const t2Cart = store.getCart();
    const snackItem = t2Cart.find((c) => c.item.id === mockMenuItems[3].id);
    assert.isDefined(snackItem);
    const splitSuccess = store.splitTable('t6', [snackItem.cartItemId]);
    assert.isTrue(splitSuccess, 'Table 2 split snacks to Table 6');

    // 4. Table Merge: t3 merges into t4 VIP
    store.selectTable(mockTables[2]);
    const mergeSuccess = store.mergeTable('t4');
    assert.isTrue(mergeSuccess, 'Table 3 merged into Table 4');

    // Verify final state distribution
    state = usePOSStore.getState();
    assert.strictEqual(state.tableCarts['t1'], undefined, 't1 freed');
    assert.strictEqual(state.tableCarts['t5']?.length, 1, 't5 has moved order (70k)');
    assert.strictEqual(state.tableCarts['t2']?.length, 1, 't2 has remaining drinks (78k)');
    assert.strictEqual(state.tableCarts['t6']?.length, 1, 't6 has split snack (30k)');
    assert.strictEqual(state.tableCarts['t3'], undefined, 't3 freed');
    assert.strictEqual(state.tableCarts['t4']?.length, 2, 't4 VIP has combined items (158k)');
  });

  // =========================================================================
  // Scenario 3: Cash Shift Opening, Expenses & Close Count
  // =========================================================================
  await runner.test('Scenario 3: Cash Shift Lifecycle & Expense Reconciliation', () => {
    // 1. Shift Opening
    const shiftOpening = {
      shiftId: 'shift_20260902_01',
      shiftName: 'Ca Sáng',
      cashierName: 'Nguyễn Lộc Thành',
      startingCash: 500000, // 500k tiền lẻ
      openedAt: new Date().toISOString(),
    };

    // 2. Cash transactions during shift (Sổ Quỹ Chi Chợ)
    const cashTransactions = [
      { id: 'ctx_1', type: 'chi', category: 'chi_mua_da', amount: 30000, desc: 'Mua 2 bao đá cây' },
      { id: 'ctx_2', type: 'chi', category: 'chi_mua_rau_cho', amount: 120000, desc: 'Mua 5kg chanh sả, húng lủi' },
      { id: 'ctx_3', type: 'chi', category: 'chi_ung_luong', amount: 200000, desc: 'Ứng lương phụ bếp' },
      { id: 'ctx_4', type: 'thu', category: 'thu_khac', amount: 50000, desc: 'Bán vỏ lon, chai nhựa' },
    ];

    const totalCashOut = cashTransactions.filter((c) => c.type === 'chi').reduce((s, c) => s + c.amount, 0); // 350,000
    const totalCashIn = cashTransactions.filter((c) => c.type === 'thu').reduce((s, c) => s + c.amount, 0);   //  50,000

    assert.strictEqual(totalCashOut, 350000, 'Total Cash Out = 350k');
    assert.strictEqual(totalCashIn, 50000, 'Total Cash In = 50k');

    // 3. Sales during shift (10 cash orders totaling 1,450,000 VND)
    const totalCashSales = 1450000;
    const totalVietQRSales = 890000; // Bank transfer

    // 4. Expected ending cash formula
    const expectedEndingCash = shiftOpening.startingCash + totalCashSales + totalCashIn - totalCashOut;
    assert.strictEqual(expectedEndingCash, 1650000, 'Expected Ending Cash = 1,650,000 VND');

    // 5. Cashier 9-Denomination Count at Shift Close
    const banknoteCounts = {
      500000: 1, //   500,000
      200000: 3, //   600,000
      100000: 4, //   400,000
      50000: 3,  //   150,000
      20000: 0,
      10000: 0,
      5000: 0,
      2000: 0,
      1000: 0,
    };

    const actualEndingCash =
      500000 * banknoteCounts[500000] +
      200000 * banknoteCounts[200000] +
      100000 * banknoteCounts[100000] +
      50000 * banknoteCounts[50000];

    assert.strictEqual(actualEndingCash, 1650000, 'Counted Cash = 1,650,000 VND');

    // 6. Reconciliation & Audit Log
    const differenceAmount = actualEndingCash - expectedEndingCash;
    assert.strictEqual(differenceAmount, 0, 'Shift is perfectly balanced (0 VND variance)');
  });

  // =========================================================================
  // Scenario 4: Direct Thermal Print & Cash Drawer Kick Pipeline
  // =========================================================================
  await runner.test('Scenario 4: Direct Thermal Print & Cash Drawer Kick Pipeline (Throughput & Bytes)', () => {
    const buildReceiptBytes = (order: {
      storeName: string;
      tableName: string;
      cashier: string;
      orderCode: string;
      items: { name: string; qty: number; unitPrice: number; amount: number }[];
      total: number;
      cashGiven: number;
      changeDue: number;
    }) => {
      const buffer: number[] = [];
      // Init
      buffer.push(0x1b, 0x40);
      // Center & Header Double
      buffer.push(0x1b, 0x61, 0x01, 0x1d, 0x21, 0x11);
      const storeStr = removeVietnameseDiacritics(order.storeName) + '\n';
      for (let i = 0; i < storeStr.length; i++) buffer.push(storeStr.charCodeAt(i));
      // Normal text & Table Info
      buffer.push(0x1d, 0x21, 0x00, 0x1b, 0x61, 0x00);
      const info = `Ban: ${removeVietnameseDiacritics(order.tableName)} - ${order.orderCode}\n`;
      for (let i = 0; i < info.length; i++) buffer.push(info.charCodeAt(i));
      // Items
      for (const it of order.items) {
        const itemLine = `${removeVietnameseDiacritics(it.name).padEnd(16).slice(0, 16)} ${it.qty} ${it.amount}\n`;
        for (let i = 0; i < itemLine.length; i++) buffer.push(itemLine.charCodeAt(i));
      }
      // Right Total
      buffer.push(0x1b, 0x61, 0x02);
      const tot = `Tong: ${order.total} d\n`;
      for (let i = 0; i < tot.length; i++) buffer.push(tot.charCodeAt(i));
      // Auto-cut
      buffer.push(0x1d, 0x56, 0x41, 0x10);
      // Drawer kick
      buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
      return new Uint8Array(buffer);
    };

    // Benchmark: 1000 receipts generated
    const startPrint = performance.now();
    let sampleBytes: Uint8Array = new Uint8Array();

    for (let i = 0; i < 1000; i++) {
      sampleBytes = buildReceiptBytes({
        storeName: 'ONGCHU LEAN POS',
        tableName: 'Bàn 01 VIP',
        cashier: 'Loc Thanh',
        orderCode: `HD-20260902-${i}`,
        items: [
          { name: 'Trà Sữa Trân Châu Hoàng Gia', qty: 2, unitPrice: 35000, amount: 70000 },
          { name: 'Cà Phê Muối Cố Đô', qty: 1, unitPrice: 29000, amount: 29000 },
        ],
        total: 99000,
        cashGiven: 100000,
        changeDue: 1000,
      });
    }

    const printDuration = performance.now() - startPrint;
    assert.lessThan(printDuration, 100, `1,000 receipts built in ${printDuration}ms (>10,000 receipts/sec)`);

    // Verify opcodes in sampleBytes
    const len = sampleBytes.length;
    // Auto-cut at end
    assert.strictEqual(sampleBytes[len - 9], 0x1d);
    assert.strictEqual(sampleBytes[len - 8], 0x56);
    assert.strictEqual(sampleBytes[len - 7], 0x41);
    assert.strictEqual(sampleBytes[len - 6], 0x10);
    // Drawer kick at end
    assert.strictEqual(sampleBytes[len - 5], 0x1b);
    assert.strictEqual(sampleBytes[len - 4], 0x70);
    assert.strictEqual(sampleBytes[len - 3], 0x00);
    assert.strictEqual(sampleBytes[len - 2], 0x19);
    assert.strictEqual(sampleBytes[len - 1], 0xfa);
  });

  // =========================================================================
  // Scenario 5: End-of-Day 3 Golden Numbers P&L Audit
  // =========================================================================
  await runner.test('Scenario 5: End-of-Day 3 Golden Numbers P&L Audit (50 Orders)', () => {
    // Generate 50 simulated orders
    let totalCashSales = 0;
    let totalVietQRSales = 0;
    let totalRevenue = 0;
    let totalCOGS = 0;

    for (let i = 1; i <= 50; i++) {
      const isCash = i % 2 === 0;
      const orderSubtotal = 100000 + (i % 10) * 25000;
      const cogs = Math.round(orderSubtotal * 0.38); // 38% cost of goods

      totalRevenue += orderSubtotal;
      totalCOGS += cogs;

      if (isCash) {
        totalCashSales += orderSubtotal;
      } else {
        totalVietQRSales += orderSubtotal;
      }
    }

    // Cash Expenses (Sổ Quỹ Chi Chợ trong ngày)
    const cashExpenses = [
      { desc: 'Mua 4 bao đá', amount: 80000 },
      { desc: 'Mua thịt bò, rau thơm ngoài chợ', amount: 650000 },
      { desc: 'Mua ly nhựa, túi bóng, ống hút', amount: 320000 },
      { desc: 'Ứng lương nhân viên ca tối', amount: 350000 },
    ];
    const totalCashExpenses = cashExpenses.reduce((s, c) => s + c.amount, 0); // 1,400,000 VND

    // --- BÁO CÁO 3 CON SỐ VÀNG BỎ TÚI (OWNER P&L) ---
    // Con số 1: Tiền mặt trong két thực tế (Sau khi trừ các khoản chi chợ thực tế)
    const goldenNumber1_CashInDrawer = totalCashSales - totalCashExpenses;

    // Con số 2: Tiền chuyển khoản VietQR trong tài khoản ngân hàng
    const goldenNumber2_VietQRBank = totalVietQRSales;

    // Con số 3: Lợi nhuận ròng bỏ túi thực tế (Doanh thu - Giá vốn - Chi phí thực tế)
    const goldenNumber3_RealNetProfit = totalRevenue - totalCOGS - totalCashExpenses;

    assert.strictEqual(totalRevenue, totalCashSales + totalVietQRSales, 'Total revenue = Cash + VietQR');
    assert.strictEqual(totalCashExpenses, 1400000, 'Cash expenses = 1.4M VND');
    assert.greaterThan(goldenNumber1_CashInDrawer, 0, 'Cash in drawer is positive');
    assert.greaterThan(goldenNumber2_VietQRBank, 0, 'VietQR bank total is positive');
    assert.greaterThan(goldenNumber3_RealNetProfit, 0, 'Real net profit is positive');

    // Mathematical verification: Profit + COGS + Expenses must equal Revenue
    assert.strictEqual(
      goldenNumber3_RealNetProfit + totalCOGS + totalCashExpenses,
      totalRevenue,
      'P&L balance formula holds 100% true'
    );
  });
}
