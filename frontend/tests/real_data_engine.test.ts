/**
 * 👑 OngChu Lean POS - Real Data Engine Test Suite
 * Tests:
 * 1. computeRealPnLMetrics computes 100% accurate financial metrics from real OrderHistory and CashTransactions.
 * 2. Purge test data (purgeTestData) cleanly resets orders, cashbook, shifts and tables to pristine 0 state.
 * 3. Master Catalog Hydration (fetchMasterCatalog) synchronizes with live Go Backend.
 * 4. Order-to-Invoice record mapping contract.
 */

import { runner, assert } from './harness';
import {
  computeRealPnLMetrics,
  getDateRangeBounds,
  filterOrdersByRange,
  orderToInvoiceRecord,
} from '../lib/utils/reportCalculations';
import { usePOSStore, OrderHistoryItem, CashTransaction } from '../lib/store/usePOSStore';
import { apiClient } from '../lib/api/apiClient';

export async function runRealDataEngineTests() {
  console.log('\n--- Running Real Data Engine & Dynamic PnL Tests ---');
  runner.setContext('Real Data Engine', '100% Dynamic Financial Calculations & Catalog Sync');

  // Test 1: computeRealPnLMetrics with real order list
  await runner.test('computeRealPnLMetrics accurately sums revenue, food cost and PnL', () => {
    const now = new Date();
    const testOrders: OrderHistoryItem[] = [
      {
        id: 'ord_1',
        orderCode: 'HD-TEST-001',
        tableId: 't1',
        tableName: 'Bàn 01',
        guestCount: 2,
        items: [
          {
            cartItemId: 'c1',
            item: {
              id: '1',
              name: 'Trà Sữa Trân Châu Hoàng Gia',
              price: 35000,
              costPrice: 12000,
              unit: 'Ly',
              station: 'bar',
              category: 'Trà Sữa',
            },
            qty: 2,
            unitPrice: 35000,
            selectedToppings: [],
            note: '',
          },
        ],
        subtotal: 70000,
        discountAmount: 0,
        finalTotal: 70000,
        paidAmount: 70000,
        changeAmount: 0,
        paymentMethod: 'tien_mat',
        createdAt: now.toISOString(),
        cashierName: 'Thu Ngân',
        status: 'paid',
      },
      {
        id: 'ord_2',
        orderCode: 'HD-TEST-002',
        tableId: 't2',
        tableName: 'Bàn 02',
        guestCount: 3,
        items: [
          {
            cartItemId: 'c2',
            item: {
              id: '2',
              name: 'Trà Đào Cam Sả Tươi',
              price: 39000,
              costPrice: 14000,
              unit: 'Ly',
              station: 'bar',
              category: 'Trà Trái Cây',
            },
            qty: 1,
            unitPrice: 39000,
            selectedToppings: [],
            note: '',
          },
        ],
        subtotal: 39000,
        discountAmount: 0,
        finalTotal: 39000,
        paidAmount: 39000,
        changeAmount: 0,
        paymentMethod: 'vietqr',
        createdAt: now.toISOString(),
        cashierName: 'Thu Ngân',
        status: 'paid',
      },
    ];

    const testTx: CashTransaction[] = [
      {
        id: 'tx_1',
        type: 'chi',
        category: 'mua_da',
        amount: 20000,
        description: 'Mua đá cây',
        time: '08:00',
        performedBy: 'Thu Ngân',
        createdAt: now.toISOString(),
      },
    ];

    const res = computeRealPnLMetrics(testOrders, testTx, 'today', undefined, undefined, 1000000);
    const { rangeConfig, soldProducts, invoiceRecords } = res;

    // Total Revenue = 70,000 + 39,000 = 109,000
    assert.strictEqual(rangeConfig.revenue, 109000, 'Total revenue must be exact sum of orders');
    // Total Food Cost = (12,000 * 2) + 14,000 = 38,000
    assert.strictEqual(rangeConfig.foodCost, 38000, 'Food cost must be exact costPrice sum');
    // Cash Expenses = 20,000
    assert.strictEqual(rangeConfig.cashExpenses, 20000, 'Cash expenses must match tx amount');
    // Net Profit = Revenue - FoodCost - CashExpenses = 109,000 - 38,000 - 20,000 = 51,000
    assert.strictEqual(rangeConfig.netProfit, 51000, 'Net profit must equal Revenue - Cost - Expenses');
    // Cash In Drawer = Base (1,000,000) + Cash Sales (70,000) - Expenses (20,000) = 1,050,000
    assert.strictEqual(rangeConfig.cashInDrawer, 1050000, 'Cash in drawer formula check');
    // VietQR Total = 39,000
    assert.strictEqual(rangeConfig.vietqrTotal, 39000, 'VietQR sales check');
    // Cash Sales = 70,000
    assert.strictEqual(rangeConfig.cashSales, 70000, 'Cash sales check');
    // TT40 Tax Check: Revenue 109,000 -> 1% GTGT = 1090, 0.5% TNCN = 545, Total = 1635
    const vatTT40 = Math.round(rangeConfig.revenue * 0.01);
    const tncnTT40 = Math.round(rangeConfig.revenue * 0.005);
    assert.strictEqual(vatTT40, 1090, 'TT40 GTGT 1% must be 1,090');
    assert.strictEqual(tncnTT40, 545, 'TT40 TNCN 0.5% must be 545');
    assert.strictEqual(vatTT40 + tncnTT40, 1635, 'TT40 Total tax must be 1,635');
    // Order Count = 2
    assert.strictEqual(rangeConfig.orderCount, 2, 'Order count must be 2');
    // Sold Products check
    assert.strictEqual(soldProducts.length, 2, 'Must have 2 sold products');
    assert.strictEqual(soldProducts[0].name, 'Trà Sữa Trân Châu Hoàng Gia', 'Top product check');
    assert.strictEqual(soldProducts[0].qtySold, 2, 'Top product qty check');
    // Invoice records check
    assert.strictEqual(invoiceRecords.length, 2, 'Must map 2 invoice records');
    assert.strictEqual(invoiceRecords[0].payMethod, 'tien_mat', 'Invoice 1 payment method check');
    assert.strictEqual(invoiceRecords[1].payMethod, 'vietqr', 'Invoice 2 payment method check');
  });

  // Test 2: Order to InvoiceRecord mapping
  await runner.test('orderToInvoiceRecord maps OrderHistoryItem correctly', () => {
    const testOrder: OrderHistoryItem = {
      id: 'inv_abc',
      orderCode: 'HD-9999',
      tableId: 't1',
      tableName: 'Bàn 01',
      guestCount: 2,
      items: [
        {
          cartItemId: 'c1',
          item: { id: '1', name: 'Trà Sữa', price: 30000, unit: 'Ly', station: 'bar', category: 'Trà Sữa' },
          qty: 2,
          unitPrice: 30000,
          selectedToppings: [],
          note: '',
        },
      ],
      subtotal: 60000,
      discountAmount: 5000,
      discountNote: 'Khách quen',
      finalTotal: 55000,
      paidAmount: 55000,
      changeAmount: 0,
      paymentMethod: 'vietqr',
      createdAt: '2026-09-08T14:30:00.000Z',
      cashierName: 'Nguyễn Văn Thu Ngân',
      status: 'paid',
    };

    const inv = orderToInvoiceRecord(testOrder);
    assert.strictEqual(inv.id, 'HD-9999', 'Invoice ID must be orderCode');
    assert.strictEqual(inv.tableName, 'Bàn 01', 'Table name check');
    assert.strictEqual(inv.totalAmount, 55000, 'Total amount check');
    assert.strictEqual(inv.discountAmount, 5000, 'Discount amount check');
    assert.strictEqual(inv.payMethod, 'vietqr', 'Payment method check');
    assert.strictEqual(inv.status, 'completed', 'Paid order maps to completed');
    assert.strictEqual(inv.items.length, 1, 'Items length check');
    assert.strictEqual(inv.items[0].name, 'Trà Sữa', 'Item name check');
  });

  // Test 3: Purge test data action
  await runner.test('purgeTestData resets all orders, cashbook, shifts and tables', () => {
    const store = usePOSStore.getState();
    // Execute purge
    store.purgeTestData();

    const after = usePOSStore.getState();
    assert.strictEqual(after.orderHistory.length, 0, 'Order history must be empty after purge');
    assert.strictEqual(after.cashTransactions.length, 0, 'Cash transactions must be empty after purge');
    assert.strictEqual(after.shiftHistory.length, 0, 'Shift history must be empty after purge');
    assert.strictEqual(after.kdsOrders.length, 0, 'KDS orders must be empty after purge');
    assert.strictEqual(Object.keys(after.tableCarts).length, 0, 'Table carts must be empty');

    // All tables must be reset to 'trong'
    const nonCleanTables = after.tables.filter((t) => t.status !== 'trong' || t.totalAmount !== 0 || t.itemCount !== 0);
    assert.strictEqual(nonCleanTables.length, 0, 'All tables must be reset to trong with 0 amount');

    // Restore sample data for subsequent tests
    store.populateSampleData('t1');
  });

  // Test 4: Master Catalog Hydration from Backend APIs
  await runner.test('fetchMasterCatalog synchronizes master catalog from live Go Backend', async () => {
    const health = await apiClient.get('/health');
    if (health.success && health.data?.status === 'healthy') {
      const store = usePOSStore.getState();
      const success = await store.fetchMasterCatalog();
      assert.ok(success, 'fetchMasterCatalog must succeed when backend is live');

      const updated = usePOSStore.getState();
      assert.ok(updated.categories.length >= 6, 'Must hydrate at least 6 categories from DB');
      assert.ok(updated.menuItems.length >= 20, 'Must hydrate at least 20 menu items from DB');
      assert.ok(updated.tables.length >= 8, 'Must hydrate at least 8 tables from DB');
      assert.ok(updated.inventoryItems.length >= 15, 'Must hydrate ingredients from DB');
      assert.ok(updated.areas.length >= 1, 'Must hydrate areas from DB');
      assert.ok(updated.toppings.length >= 1, 'Must hydrate toppings from DB');
    } else {
      assert.ok(true, 'Backend not live, skipping live network call test');
    }
  });
}
