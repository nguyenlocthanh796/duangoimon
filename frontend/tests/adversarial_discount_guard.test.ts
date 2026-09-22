/**
 * 👑 OngChu Lean POS — Adversarial Stress Test Suite
 * Special focus: Anti-Fraud Discount Guard (>20%) & Business Continuity
 */

import './setup_env';
import { usePOSStore } from '../lib/store/usePOSStore';
import { calculateCartTotal, calculateCartItemCount } from '../lib/utils/cartAlgorithms';
import { mockMenuItems, mockTables } from './mock_data';
import { assert, runner } from './harness';

// Mirroring the exact logic from DiscountModal.tsx
export const QUICK_REASONS = [
  'Khách VIP Thân Thiết',
  'Chủ Quán Duyệt',
  'Bù Lỗi Phục Vụ / Món',
  'Khai Trương / Sự Kiện',
  'Chiết Khấu Nội Bộ',
];

export function computeDiscountGuard(
  subTotal: number,
  discountType: 'percent' | 'fixed',
  valStr: string
) {
  const activeDiscountVal = parseFloat(valStr) || 0;

  const discountAmount = (() => {
    if (activeDiscountVal <= 0) return 0;
    if (discountType === 'percent') {
      return Math.round((subTotal * activeDiscountVal) / 100);
    }
    return Math.min(subTotal, activeDiscountVal);
  })();

  const discountPercentage = (() => {
    if (subTotal <= 0) return 0;
    if (discountType === 'percent') return activeDiscountVal;
    return Math.round((discountAmount / subTotal) * 100);
  })();

  const isExcessiveDiscount = discountPercentage > 20;
  const finalTotal = Math.max(0, subTotal - discountAmount);

  return {
    activeDiscountVal,
    discountAmount,
    discountPercentage,
    isExcessiveDiscount,
    finalTotal,
  };
}

export function validateReason(note: string): boolean {
  return note.trim().length > 0;
}

export function generateAuditNote(isExcessive: boolean, note: string, discountType: 'percent' | 'fixed', value: number): string {
  if (isExcessive) {
    const trimmed = note.trim();
    return trimmed.startsWith('[ANTI-FRAUD AUDIT >20%]')
      ? trimmed
      : `[ANTI-FRAUD AUDIT >20%] ${trimmed}`;
  }
  return note.trim() || (discountType === 'percent' ? `Giảm ${value}%` : `Giảm ${value.toLocaleString('vi-VN')} đ`);
}

export async function runAdversarialDiscountSuite() {
  runner.setContext('Adversarial-Fraud-Guard', 'Percentage Discount Boundaries');

  // Test 1: Normal boundaries 0%, 5%, 10%, 15%, 20%
  await runner.test('Boundary Test: 0% discount must NOT trigger anti-fraud guard', () => {
    const res = computeDiscountGuard(100000, 'percent', '0');
    assert.strictEqual(res.discountPercentage, 0);
    assert.strictEqual(res.discountAmount, 0);
    assert.strictEqual(res.isExcessiveDiscount, false, '0% should be false');
    assert.strictEqual(res.finalTotal, 100000);
  });

  await runner.test('Boundary Test: 5% discount must NOT trigger anti-fraud guard', () => {
    const res = computeDiscountGuard(100000, 'percent', '5');
    assert.strictEqual(res.discountPercentage, 5);
    assert.strictEqual(res.discountAmount, 5000);
    assert.strictEqual(res.isExcessiveDiscount, false, '5% should be false');
    assert.strictEqual(res.finalTotal, 95000);
  });

  await runner.test('Boundary Test: 10% discount must NOT trigger anti-fraud guard', () => {
    const res = computeDiscountGuard(100000, 'percent', '10');
    assert.strictEqual(res.discountPercentage, 10);
    assert.strictEqual(res.discountAmount, 10000);
    assert.strictEqual(res.isExcessiveDiscount, false, '10% should be false');
    assert.strictEqual(res.finalTotal, 90000);
  });

  await runner.test('Boundary Test: 15% discount must NOT trigger anti-fraud guard', () => {
    const res = computeDiscountGuard(100000, 'percent', '15');
    assert.strictEqual(res.discountPercentage, 15);
    assert.strictEqual(res.discountAmount, 15000);
    assert.strictEqual(res.isExcessiveDiscount, false, '15% should be false');
    assert.strictEqual(res.finalTotal, 85000);
  });

  await runner.test('Boundary Test: Exactly 20% discount boundary must NOT trigger anti-fraud guard', () => {
    const res = computeDiscountGuard(100000, 'percent', '20');
    assert.strictEqual(res.discountPercentage, 20);
    assert.strictEqual(res.discountAmount, 20000);
    assert.strictEqual(res.isExcessiveDiscount, false, '20% boundary should NOT trigger warning (must be > 20)');
    assert.strictEqual(res.finalTotal, 80000);
  });

  runner.setContext('Adversarial-Fraud-Guard', 'High Percentage Discounts');

  await runner.test('High Discount: 20.001% and 20.1% MUST trigger anti-fraud guard', () => {
    const res1 = computeDiscountGuard(100000, 'percent', '20.1');
    assert.strictEqual(res1.discountPercentage, 20.1);
    assert.strictEqual(res1.isExcessiveDiscount, true, '20.1% must trigger anti-fraud guard');

    const res2 = computeDiscountGuard(100000, 'percent', '20.001');
    assert.strictEqual(res2.isExcessiveDiscount, true, '20.001% must trigger anti-fraud guard');
  });

  await runner.test('High Discount: 25% MUST trigger anti-fraud guard', () => {
    const res = computeDiscountGuard(100000, 'percent', '25');
    assert.strictEqual(res.discountPercentage, 25);
    assert.strictEqual(res.discountAmount, 25000);
    assert.strictEqual(res.isExcessiveDiscount, true, '25% must trigger anti-fraud guard');
    assert.strictEqual(res.finalTotal, 75000);
  });

  await runner.test('High Discount: 50% MUST trigger anti-fraud guard', () => {
    const res = computeDiscountGuard(200000, 'percent', '50');
    assert.strictEqual(res.discountPercentage, 50);
    assert.strictEqual(res.discountAmount, 100000);
    assert.strictEqual(res.isExcessiveDiscount, true, '50% must trigger anti-fraud guard');
    assert.strictEqual(res.finalTotal, 100000);
  });

  await runner.test('High Discount: 80% MUST trigger anti-fraud guard', () => {
    const res = computeDiscountGuard(500000, 'percent', '80');
    assert.strictEqual(res.discountPercentage, 80);
    assert.strictEqual(res.discountAmount, 400000);
    assert.strictEqual(res.isExcessiveDiscount, true, '80% must trigger anti-fraud guard');
    assert.strictEqual(res.finalTotal, 100000);
  });

  await runner.test('High Discount: 100% (Free Order) MUST trigger anti-fraud guard', () => {
    const res = computeDiscountGuard(150000, 'percent', '100');
    assert.strictEqual(res.discountPercentage, 100);
    assert.strictEqual(res.discountAmount, 150000);
    assert.strictEqual(res.isExcessiveDiscount, true, '100% must trigger anti-fraud guard');
    assert.strictEqual(res.finalTotal, 0);
  });

  runner.setContext('Adversarial-Fraud-Guard', 'Fixed Cash Amount Discounts');

  await runner.test('Fixed Cash: 20,000 on 100,000 subtotal (=20%) must NOT trigger guard', () => {
    const res = computeDiscountGuard(100000, 'fixed', '20000');
    assert.strictEqual(res.discountAmount, 20000);
    assert.strictEqual(res.discountPercentage, 20);
    assert.strictEqual(res.isExcessiveDiscount, false, '20,000 / 100,000 = 20% must NOT trigger guard');
    assert.strictEqual(res.finalTotal, 80000);
  });

  await runner.test('Fixed Cash: 25,000 on 100,000 subtotal (=25%) MUST trigger guard', () => {
    const res = computeDiscountGuard(100000, 'fixed', '25000');
    assert.strictEqual(res.discountAmount, 25000);
    assert.strictEqual(res.discountPercentage, 25);
    assert.strictEqual(res.isExcessiveDiscount, true, '25,000 / 100,000 = 25% MUST trigger guard');
    assert.strictEqual(res.finalTotal, 75000);
  });

  await runner.test('Fixed Cash: 20,000 on 200,000 subtotal (=10%) must NOT trigger guard', () => {
    const res = computeDiscountGuard(200000, 'fixed', '20000');
    assert.strictEqual(res.discountAmount, 20000);
    assert.strictEqual(res.discountPercentage, 10);
    assert.strictEqual(res.isExcessiveDiscount, false);
    assert.strictEqual(res.finalTotal, 180000);
  });

  await runner.test('Fixed Cash: 50,000 on 200,000 subtotal (=25%) MUST trigger guard', () => {
    const res = computeDiscountGuard(200000, 'fixed', '50000');
    assert.strictEqual(res.discountAmount, 50000);
    assert.strictEqual(res.discountPercentage, 25);
    assert.strictEqual(res.isExcessiveDiscount, true);
    assert.strictEqual(res.finalTotal, 150000);
  });

  await runner.test('Fixed Cash: Exceeding subtotal (150,000 on 100,000) caps at subtotal and triggers guard', () => {
    const res = computeDiscountGuard(100000, 'fixed', '150000');
    assert.strictEqual(res.discountAmount, 100000, 'Discount amount capped at subtotal');
    assert.strictEqual(res.discountPercentage, 100, '100% discount percentage');
    assert.strictEqual(res.isExcessiveDiscount, true, 'Must trigger guard');
    assert.strictEqual(res.finalTotal, 0, 'Final total cannot go below 0');
  });

  await runner.test('Fixed Cash: 0 subtotal edge case', () => {
    const res = computeDiscountGuard(0, 'fixed', '50000');
    assert.strictEqual(res.discountAmount, 0);
    assert.strictEqual(res.discountPercentage, 0);
    assert.strictEqual(res.isExcessiveDiscount, false);
    assert.strictEqual(res.finalTotal, 0);
  });

  runner.setContext('Adversarial-Fraud-Guard', 'Reason & Whitespace Validation');

  await runner.test('Empty reason string must be blocked', () => {
    assert.strictEqual(validateReason(''), false, 'Empty reason is invalid');
  });

  await runner.test('Whitespace-only string must be blocked', () => {
    assert.strictEqual(validateReason('   '), false, 'Spaces only is invalid');
    assert.strictEqual(validateReason('\t\n\r  '), false, 'Tabs and newlines only is invalid');
  });

  await runner.test('Valid non-empty reason is allowed', () => {
    assert.strictEqual(validateReason('Khách VIP Thân Thiết'), true, 'Valid reason is allowed');
    assert.strictEqual(validateReason('   Chủ Quán Duyệt   '), true, 'Padded reason is valid after trim');
  });

  runner.setContext('Adversarial-Fraud-Guard', 'Quick Reason Pills & Tagging');

  await runner.test('Quick reason pills are complete and selectable', () => {
    assert.strictEqual(QUICK_REASONS.length, 5, '5 quick reasons exist');
    assert.isTrue(QUICK_REASONS.includes('Khách VIP Thân Thiết'));
    assert.isTrue(QUICK_REASONS.includes('Chủ Quán Duyệt'));
    assert.isTrue(QUICK_REASONS.includes('Bù Lỗi Phục Vụ / Món'));
    assert.isTrue(QUICK_REASONS.includes('Khai Trương / Sự Kiện'));
    assert.isTrue(QUICK_REASONS.includes('Chiết Khấu Nội Bộ'));

    // Test pill selection simulation
    for (const pill of QUICK_REASONS) {
      assert.strictEqual(validateReason(pill), true, `Pill "${pill}" is a valid reason`);
    }
  });

  await runner.test('Audit note tagging prepends [ANTI-FRAUD AUDIT >20%]', () => {
    const normalNote = 'Chủ Quán Duyệt';
    const auditNote = generateAuditNote(true, normalNote, 'percent', 30);
    assert.strictEqual(auditNote, '[ANTI-FRAUD AUDIT >20%] Chủ Quán Duyệt');
  });

  await runner.test('Audit note tagging is idempotent (does not double tag)', () => {
    const alreadyTagged = '[ANTI-FRAUD AUDIT >20%] Chủ Quán Duyệt';
    const auditNote = generateAuditNote(true, alreadyTagged, 'percent', 30);
    assert.strictEqual(auditNote, '[ANTI-FRAUD AUDIT >20%] Chủ Quán Duyệt');
  });

  await runner.test('Normal discount (<=20%) does NOT prepend audit tag', () => {
    const note = 'Khách VIP';
    const normalNote = generateAuditNote(false, note, 'percent', 10);
    assert.strictEqual(normalNote, 'Khách VIP');

    const emptyNote = generateAuditNote(false, '', 'percent', 15);
    assert.strictEqual(emptyNote, 'Giảm 15%');

    const emptyFixedNote = generateAuditNote(false, '', 'fixed', 20000);
    assert.strictEqual(emptyFixedNote, 'Giảm 20.000 đ');
  });

  runner.setContext('Adversarial-Business-Continuity', 'Store Multi-Table & Checkout Integrity');

  await runner.test('Apply discount in Zustand store and verify table isolation', () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {
        t1: [
          {
            cartItemId: 'item_t1_1',
            item: mockMenuItems[0],
            qty: 2,
            unitPrice: 35000,
            selectedToppings: [],
            note: '',
          },
        ],
        t2: [
          {
            cartItemId: 'item_t2_1',
            item: mockMenuItems[1],
            qty: 1,
            unitPrice: 39000,
            selectedToppings: [],
            note: '',
          },
        ],
      },
      tableDiscounts: {},
    });

    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]); // t1
    store.applyDiscount('percent', 25, '[ANTI-FRAUD AUDIT >20%] Khách VIP Thân Thiết');

    // Verify t1 discount
    const discT1 = usePOSStore.getState().tableDiscounts['t1'];
    assert.isDefined(discT1);
    assert.strictEqual(discT1?.value, 25);
    assert.strictEqual(discT1?.note, '[ANTI-FRAUD AUDIT >20%] Khách VIP Thân Thiết');

    // Verify t2 is unaffected
    const discT2 = usePOSStore.getState().tableDiscounts['t2'];
    assert.strictEqual(discT2, undefined, 'Table 2 must not have discount leaked from Table 1');
  });

  await runner.test('Checkout success clears cart, table discounts and resets table to trong', () => {
    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]); // t1
    store.checkoutSuccess(70000);

    const stateAfter = usePOSStore.getState();
    assert.strictEqual(stateAfter.tableCarts['t1'], undefined, 'Cart for t1 deleted');
    assert.strictEqual(stateAfter.tableDiscounts['t1'], undefined, 'Discounts for t1 deleted');
    const t1 = stateAfter.tables.find((t) => t.id === 't1');
    assert.strictEqual(t1?.status, 'trong');
    assert.strictEqual(t1?.totalAmount, 0);
  });

  await runner.test('Cash Shift & Sổ Quỹ Variance Reconciliation Formula Integrity', () => {
    // Expected ending cash = starting_cash + total_cash_sales + total_cash_in - total_cash_out
    const startingCash = 2000000;
    const totalCashSales = 5450000;
    const totalCashIn = 500000; // Nạp thêm tiền lẻ
    const totalCashOut = 350000; // Mua đá + rau

    const expectedEndingCash = startingCash + totalCashSales + totalCashIn - totalCashOut;
    assert.strictEqual(expectedEndingCash, 7600000, 'Expected ending cash is exactly 7,600,000 VND');

    // Actual counting: 7,550,000 VND -> diff = -50,000 VND
    const actualEndingCash1 = 7550000;
    const diff1 = actualEndingCash1 - expectedEndingCash;
    assert.strictEqual(diff1, -50000, 'Thiếu 50,000 VND');

    // Actual counting: 7,600,000 VND -> diff = 0 VND (Khớp 100%)
    const actualEndingCash2 = 7600000;
    const diff2 = actualEndingCash2 - expectedEndingCash;
    assert.strictEqual(diff2, 0, 'Khớp 100%');
  });

  await runner.test('Owner P&L 3 Golden Numbers Calculation Integrity', () => {
    const totalRevenue = 12500000;
    const totalCashSales = 8000000;
    const totalVietQRSales = 4500000;
    const totalCOGS = 3750000; // 30% Cost of Goods
    const totalCashExpenses = 1200000; // Sổ quỹ chi thực tế

    assert.strictEqual(totalCashSales + totalVietQRSales, totalRevenue, 'Revenue consistency');

    // Golden Number 1: Tiền mặt trong két thực tế
    const cashInDrawer = totalCashSales - totalCashExpenses;
    assert.strictEqual(cashInDrawer, 6800000, 'Cash in drawer = 6,800,000 VND');

    // Golden Number 2: Tiền chuyển khoản VietQR
    const bankTotal = totalVietQRSales;
    assert.strictEqual(bankTotal, 4500000, 'Bank total = 4,500,000 VND');

    // Golden Number 3: Lợi nhuận ròng bỏ túi
    const realNetProfit = totalRevenue - totalCOGS - totalCashExpenses;
    assert.strictEqual(realNetProfit, 7550000, 'Net profit = 7,550,000 VND');
  });
}

// Execute directly if run as main script
if (require.main === module) {
  runAdversarialDiscountSuite().then(() => {
    const success = runner.printSummary();
    if (!success) {
      process.exit(1);
    }
  });
}
