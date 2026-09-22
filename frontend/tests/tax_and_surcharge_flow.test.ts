/**
 * 👑 OngChu Lean POS - Automated Test Suite
 * Tax (VAT) and Surcharge / Service Fee Financial Flow Tests
 */

import { runner, assert } from './harness';
import { usePOSStore } from '../lib/store/usePOSStore';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';

export async function runTaxAndSurchargeFlowTests() {
  runner.setContext('Tax & Surcharge', 'VAT, Service Fee & Flat Surcharge Financial Engine');

  const resetStore = () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
      orderHistory: [],
    });
    usePOSStore.getState().updateStoreSettings({
      vatRate: 0,
      serviceFeeRate: 0,
      flatSurcharge: 0,
      surchargeLabel: '',
    });
  };

  await runner.test('1. Default Zero Tax & Surcharge (Backward Compatibility)', () => {
    resetStore();
    const store = usePOSStore.getState();

    const settings = store.storeSettings;
    assert.strictEqual(settings.vatRate, 0, 'Default vatRate must be 0');
    assert.strictEqual(settings.serviceFeeRate, 0, 'Default serviceFeeRate must be 0');
    assert.strictEqual(settings.flatSurcharge, 0, 'Default flatSurcharge must be 0');

    // Add item to selected table (mockTables[0]: t1)
    const item1 = mockMenuItems[0]; // 35,000 đ
    store.addToCart(createSampleModifierData(item1, { qty: 2 })); // 70,000 đ

    const cart = usePOSStore.getState().getCart();
    assert.strictEqual(cart.length, 1, 'Cart should have 1 item');
    assert.strictEqual(cart[0].qty, 2, 'Qty should be 2');

    // Checkout 70k
    store.checkoutSuccess(70000, 'tien_mat');

    const invoices = usePOSStore.getState().orderHistory;
    const latest = invoices[0];
    assert.isTrue(Boolean(latest), 'Invoice must be created');
    assert.strictEqual(latest.subtotal, 70000, 'Subtotal should be 70,000');
    assert.strictEqual(latest.finalTotal, 70000, 'Final total should be 70,000');
    assert.strictEqual(latest.vatAmount ?? 0, 0, 'VAT should be 0');
    assert.strictEqual(latest.serviceFeeAmount ?? 0, 0, 'Service fee should be 0');
  });

  await runner.test('2. Percentage VAT Calculation (8% and 10%)', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Set 8% VAT
    store.updateStoreSettings({ vatRate: 8, serviceFeeRate: 0, flatSurcharge: 0 });
    const item4 = mockMenuItems[3]; // 30,000 đ
    store.addToCart(createSampleModifierData(item4, { qty: 1 })); // 30,000 đ

    // Subtotal 30,000 -> VAT 8% = 2,400 -> Final total = 32,400
    store.checkoutSuccess(32400, 'tien_mat');
    let latest = usePOSStore.getState().orderHistory[0];
    assert.strictEqual(latest.subtotal, 30000, 'Subtotal 30k');
    assert.strictEqual(latest.vatRate, 8, 'VAT rate 8%');
    assert.strictEqual(latest.vatAmount, 2400, 'VAT amount 2,400 đ');
    assert.strictEqual(latest.finalTotal, 32400, 'Final total 32,400 đ');

    // Set 10% VAT on table 2
    store.selectTable(mockTables[1]);
    store.updateStoreSettings({ vatRate: 10 });
    store.addToCart(createSampleModifierData(item4, { qty: 2 })); // 60,000 đ
    // Subtotal 60,000 -> VAT 10% = 6,000 -> Final total = 66,000
    store.checkoutSuccess(66000, 'tien_mat');
    latest = usePOSStore.getState().orderHistory[0];
    assert.strictEqual(latest.vatRate, 10, 'VAT rate 10%');
    assert.strictEqual(latest.vatAmount, 6000, 'VAT amount 6,000 đ');
    assert.strictEqual(latest.finalTotal, 66000, 'Final total 66,000 đ');
  });

  await runner.test('3. Service Fee (5%) + VAT (10%) Compounding Invariant', () => {
    resetStore();
    const store = usePOSStore.getState();

    // NetSales = 50,000
    // Service fee (5%) = 2,500
    // Taxable base = 52,500
    // VAT (10%) = 5,250
    // Final total = 57,750
    store.updateStoreSettings({
      serviceFeeRate: 5,
      vatRate: 10,
      flatSurcharge: 0,
    });

    const item5 = mockMenuItems[4]; // 25,000 đ
    store.addToCart(createSampleModifierData(item5, { qty: 2 })); // 50,000 đ

    store.checkoutSuccess(57750, 'tien_mat');
    const latest = usePOSStore.getState().orderHistory[0];
    assert.strictEqual(latest.subtotal, 50000, 'Subtotal 50k');
    assert.strictEqual(latest.serviceFeeRate, 5, 'Service fee 5%');
    assert.strictEqual(latest.serviceFeeAmount, 2500, 'Service fee 2,500 đ');
    assert.strictEqual(latest.vatRate, 10, 'VAT rate 10%');
    assert.strictEqual(latest.vatAmount, 5250, 'VAT amount 5,250 đ');
    assert.strictEqual(latest.finalTotal, 57750, 'Final total 57,750 đ');
  });

  await runner.test('4. Precedence: Discount & CRM Points Applied Before Service Fee and VAT', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Item 1: 35k x 4 = 140k
    // Discount = 40k (fixed)
    // CRM Points = 10k
    // Net Sales = 140k - 40k - 10k = 90k
    // Service fee (10%) = 9k
    // Taxable base = 90k + 9k = 99k
    // VAT (8%) = 99k * 0.08 = 7,920
    // Final Total = 90k + 9k + 7,920 = 106,920
    store.updateStoreSettings({
      serviceFeeRate: 10,
      vatRate: 8,
      flatSurcharge: 0,
    });

    const item1 = mockMenuItems[0];
    store.addToCart(createSampleModifierData(item1, { qty: 4 })); // 140,000 đ

    // Apply fixed discount
    store.applyDiscount('fixed', 40000, 'Voucher 40k');

    store.checkoutSuccess(106920, 'tien_mat', {
      pointsUsed: 10000,
    });

    const latest = usePOSStore.getState().orderHistory[0];
    assert.strictEqual(latest.subtotal, 140000, 'Subtotal 140,000');
    assert.strictEqual(latest.discountAmount, 40000, 'Discount 40,000');
    assert.strictEqual(latest.serviceFeeAmount, 9000, 'Service fee 9,000 (10% of 90k)');
    assert.strictEqual(latest.vatAmount, 7920, 'VAT amount 7,920 (8% of 99k)');
    assert.strictEqual(latest.finalTotal, 106920, 'Final total 106,920');
  });

  await runner.test('5. Flat Surcharge (Holiday/VIP Room) + VAT Calculation', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Subtotal = 50,000
    // Flat Surcharge = 20,000 (Phụ thu ngày lễ)
    // Service fee % = 0%
    // Taxable base = 50,000 + 20,000 = 70,000
    // VAT (10%) = 7,000
    // Final Total = 77,000
    store.updateStoreSettings({
      serviceFeeRate: 0,
      flatSurcharge: 20000,
      surchargeLabel: 'Phụ thu ngày Tết',
      vatRate: 10,
    });

    const item5 = mockMenuItems[4]; // 25k
    store.addToCart(createSampleModifierData(item5, { qty: 2 })); // 50k

    store.checkoutSuccess(77000, 'vietqr');

    const latest = usePOSStore.getState().orderHistory[0];
    assert.strictEqual(latest.subtotal, 50000, 'Subtotal 50,000');
    assert.strictEqual(latest.serviceFeeAmount, 20000, 'Service fee / flat surcharge 20,000');
    assert.strictEqual(latest.surchargeAmount, 20000, 'Surcharge amount 20,000');
    assert.strictEqual(latest.surchargeNote, 'Phụ thu ngày Tết', 'Surcharge note match');
    assert.strictEqual(latest.vatAmount, 7000, 'VAT 7,000');
    assert.strictEqual(latest.finalTotal, 77000, 'Final total 77,000');
    assert.strictEqual(latest.paymentMethod, 'vietqr', 'Payment method vietqr');
  });

  await runner.test('6. Explicit Meta Overrides in checkoutSuccess', () => {
    resetStore();
    const store = usePOSStore.getState();

    const item5 = mockMenuItems[4]; // 25k
    store.addToCart(createSampleModifierData(item5, { qty: 1 })); // 25,000

    store.checkoutSuccess(30000, 'the', {
      serviceFeeRate: 5,
      serviceFeeAmount: 2000,
      vatRate: 10,
      vatAmount: 3000,
      surchargeAmount: 2000,
      surchargeNote: 'Phí quẹt thẻ',
    });

    const latest = usePOSStore.getState().orderHistory[0];
    assert.strictEqual(latest.subtotal, 25000, 'Subtotal 25k');
    assert.strictEqual(latest.serviceFeeAmount, 2000, 'Service fee 2k');
    assert.strictEqual(latest.vatAmount, 3000, 'VAT 3k');
    assert.strictEqual(latest.finalTotal, 30000, 'Final total 30k');
    assert.strictEqual(latest.surchargeNote, 'Phí quẹt thẻ', 'Surcharge note matched');
  });
}
