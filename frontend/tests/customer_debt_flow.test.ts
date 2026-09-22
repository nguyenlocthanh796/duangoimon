/**
 * 👑 OngChu Lean POS - Automated Test Suite
 * Khách Hàng & Công Nợ (Customer CRM & Debt Ledger Flow Tests)
 */

import { runner, assert } from './harness';
import { usePOSStore, DEFAULT_CUSTOMERS_LIST } from '../lib/store/usePOSStore';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';
import { checkRoutePermission } from '../lib/store/useAuthStore';

export async function runCustomerDebtFlowTests() {
  runner.setContext('Customer & Debt', 'Khách Hàng & Công Nợ - CRM & Sổ Nợ Hóa Đơn');

  const resetStore = () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
      orderHistory: [],
      cashTransactions: [],
      customers: DEFAULT_CUSTOMERS_LIST.map((c) => ({ ...c })),
    });
  };

  await runner.test('1. Default Customer List & Schema Integrity', () => {
    resetStore();
    const store = usePOSStore.getState();

    assert.isTrue(store.customers.length >= 3, 'Default customer list should have at least 3 initial records');
    const anhMinh = store.customers.find((c) => c.phone === '0901234567');
    assert.isTrue(Boolean(anhMinh), 'Customer Anh Minh should exist');
    assert.strictEqual(anhMinh?.name, 'Anh Minh (VIP)', 'Customer name match');
    assert.strictEqual(anhMinh?.debtBalance, 350000, 'Initial debt balance match');
    assert.strictEqual(anhMinh?.rewardPoints, 25000, 'Initial reward points match');
  });

  await runner.test('2. Add and Update Customer Profiles', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Add new customer
    store.addCustomer({
      name: 'Chị Mai Lan',
      phone: '0988776655',
      rewardPoints: 50,
      totalSpend: 500000,
      debtBalance: 0,
      notes: 'Khách công ty đối diện',
    });

    let customers = usePOSStore.getState().customers;
    const maiLan = customers.find((c) => c.phone === '0988776655');
    assert.isTrue(Boolean(maiLan), 'Newly added customer should exist');
    assert.strictEqual(maiLan?.name, 'Chị Mai Lan');
    assert.strictEqual(maiLan?.debtBalance, 0);

    // Update customer
    store.updateCustomer(maiLan!.id, {
      notes: 'Khách thân thiết VIP',
      debtBalance: 120000,
    });

    customers = usePOSStore.getState().customers;
    const updated = customers.find((c) => c.id === maiLan!.id);
    assert.strictEqual(updated?.notes, 'Khách thân thiết VIP', 'Notes should be updated');
    assert.strictEqual(updated?.debtBalance, 120000, 'Debt balance should be updated');
  });

  await runner.test('3. Checkout with Ghi Nợ (Bill Debt Accumulation)', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Table 1 (mockTables[0])
    const item1 = mockMenuItems[0]; // 35,000 đ
    store.addToCart(createSampleModifierData(item1, { qty: 4 })); // 140,000 đ

    const anhMinh = store.customers.find((c) => c.phone === '0901234567')!;
    const initialDebt = anhMinh.debtBalance; // 350,000 đ
    const initialSpend = anhMinh.totalSpend;

    // Checkout with Ghi Nợ (paidAmount = 0)
    store.checkoutSuccess(
      0,
      'ghi_no',
      {
        customerName: anhMinh.name,
        customerPhone: anhMinh.phone,
      }
    );

    // Invoices check
    const invoices = usePOSStore.getState().orderHistory;
    const latest = invoices[0];
    assert.isTrue(Boolean(latest), 'Invoice should be created');
    assert.strictEqual(latest.paymentMethod, 'ghi_no', 'Payment method should be ghi_no');
    assert.strictEqual(latest.debtAmount, 140000, 'Invoice debt amount should be 140,000');
    assert.strictEqual(latest.isDebtPaid, false, 'Debt should be unpaid initially');
    assert.strictEqual(latest.paymentDetails?.customerPhone, anhMinh.phone, 'Customer phone match');

    // Customer balance check
    const updatedMinh = usePOSStore.getState().customers.find((c) => c.id === anhMinh.id)!;
    assert.strictEqual(updatedMinh.debtBalance, initialDebt + 140000, 'Customer debt balance should increase by 140,000');
    assert.strictEqual(updatedMinh.totalSpend, initialSpend + 140000, 'Total spend should increase');

    // Cashbook check: Ghi Nợ does NOT increase cash transactions
    const cashTxns = usePOSStore.getState().cashTransactions;
    assert.strictEqual(cashTxns.length, 0, 'No cash transactions should be generated upon Ghi Nợ checkout');
  });

  await runner.test('4. Settle Customer Debt via Cash (Tiền Mặt -> Sổ Quỹ Cashbook)', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Add order with ghi_no
    const item1 = mockMenuItems[0]; // 35k
    store.addToCart(createSampleModifierData(item1, { qty: 2 })); // 70k
    const anhMinh = store.customers.find((c) => c.phone === '0901234567')!;
    const startDebt = anhMinh.debtBalance; // 350k

    store.checkoutSuccess(0, 'ghi_no', {
      customerName: anhMinh.name,
      customerPhone: anhMinh.phone,
    });

    const invoice = usePOSStore.getState().orderHistory[0];
    assert.strictEqual(invoice.isDebtPaid, false);

    // Settle debt 70,000 đ with Cash for this invoice
    store.settleCustomerDebt(anhMinh.id, 70000, 'tien_mat', 'Anh Minh trả tiền mặt', invoice.id);

    // Verify invoice is marked paid
    const updatedInvoice = usePOSStore.getState().orderHistory.find((i) => i.id === invoice.id)!;
    assert.strictEqual(updatedInvoice.isDebtPaid, true, 'Invoice debt should be marked as paid');
    assert.strictEqual(updatedInvoice.debtPaidMethod, 'tien_mat', 'Paid method should be tien_mat');
    assert.isTrue(Boolean(updatedInvoice.debtPaidAt), 'Paid timestamp should be recorded');

    // Verify customer debt balance decreased
    const updatedMinh = usePOSStore.getState().customers.find((c) => c.id === anhMinh.id)!;
    assert.strictEqual(updatedMinh.debtBalance, startDebt, 'Customer debt balance should return to startDebt');

    // Verify Cashbook transaction generated
    const cashTxns = usePOSStore.getState().cashTransactions;
    assert.strictEqual(cashTxns.length, 1, 'Exactly 1 cash transaction should be recorded in Cashbook');
    const txn = cashTxns[0];
    assert.strictEqual(txn.type, 'thu', 'Transaction type must be "thu"');
    assert.strictEqual(txn.category, 'Thu nợ khách', 'Transaction category must be "Thu nợ khách"');
    assert.strictEqual(txn.amount, 70000, 'Transaction amount must be 70,000');
    assert.strictEqual(txn.paymentMethod, 'tien_mat', 'Transaction payment method must be tien_mat');
  });

  await runner.test('5. Settle Debt via VietQR (Chuyển Khoản Ngân Hàng)', () => {
    resetStore();
    const store = usePOSStore.getState();

    const anhMinh = store.customers.find((c) => c.phone === '0901234567')!;
    const curDebt = anhMinh.debtBalance; // 350,000 đ

    // Pay full debt 350,000 đ via VietQR
    store.settleCustomerDebt(anhMinh.id, curDebt, 'vietqr', 'Khách quét mã VietQR Napas247');

    const updatedMinh = usePOSStore.getState().customers.find((c) => c.id === anhMinh.id)!;
    assert.strictEqual(updatedMinh.debtBalance, 0, 'Customer debt balance should be 0');

    // Cashbook transaction recorded as chuyen_khoan
    const cashTxns = usePOSStore.getState().cashTransactions;
    assert.strictEqual(cashTxns.length, 1, 'Cashbook transaction recorded');
    assert.strictEqual(cashTxns[0].paymentMethod, 'chuyen_khoan', 'Method must be chuyen_khoan');
    assert.strictEqual(cashTxns[0].amount, 350000, 'Amount must be 350,000');
  });

  await runner.test('6. Partial Debt Payoff Calculations', () => {
    resetStore();
    const store = usePOSStore.getState();

    const anhMinh = store.customers.find((c) => c.phone === '0901234567')!;
    const originalDebt = anhMinh.debtBalance; // 350,000 đ

    // Partial payoff of 200,000 đ
    store.settleCustomerDebt(anhMinh.id, 200000, 'tien_mat', 'Trả bớt một phần');

    const updatedMinh = usePOSStore.getState().customers.find((c) => c.id === anhMinh.id)!;
    assert.strictEqual(updatedMinh.debtBalance, originalDebt - 200000, 'Remaining debt should be 150,000');

    // Second partial payoff of 150,000 đ
    store.settleCustomerDebt(anhMinh.id, 150000, 'tien_mat', 'Trả hết phần còn lại');

    const debtClearedMinh = usePOSStore.getState().customers.find((c) => c.id === anhMinh.id)!;
    assert.strictEqual(debtClearedMinh.debtBalance, 0, 'Debt should be fully cleared (0)');
  });

  await runner.test('7. Route Permission & RBAC for /khach-hang', () => {
    // Owner should have access
    assert.isTrue(checkRoutePermission('owner', '/khach-hang'), 'Owner must have access to /khach-hang');

    // Manager should have access
    assert.isTrue(checkRoutePermission('manager', '/khach-hang'), 'Manager must have access to /khach-hang');

    // Cashier should have access (since cashier looks up customer debt and records payoffs)
    assert.isTrue(checkRoutePermission('cashier', '/khach-hang'), 'Cashier must have access to /khach-hang');

    // Server should NOT have access to customer debt ledger
    assert.isFalse(checkRoutePermission('server', '/khach-hang'), 'Server must NOT have access to /khach-hang');

    // Super admin only has access to /saas-admin
    assert.isFalse(checkRoutePermission('super_admin', '/khach-hang'), 'Super Admin must NOT have access to /khach-hang');
  });
}
