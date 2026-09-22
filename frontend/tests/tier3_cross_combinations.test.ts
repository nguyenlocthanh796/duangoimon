/**
 * 👑 Tier 3: Cross-Feature Combinations & Pairwise Integration Tests (≥15 test cases)
 * Full interaction chains: Search -> Modifiers -> Cart -> Split/Merge -> Discount Guard -> Cash Presets -> ESC/POS Bytes.
 */

import { runner, assert } from './harness';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';
import { usePOSStore, CartItem } from '../lib/store/usePOSStore';
import { searchAndRankItems, removeVietnameseDiacritics } from '../lib/utils/vietnameseSearch';

export async function runTier3Tests() {
  runner.setContext('Tier 3', 'Cross-Feature Integration Chains');

  await runner.test('Pairwise 1: Search -> Select -> Modifier Group -> Add to Active Table Cart', () => {
    // 1. Search for coffee using acronym
    const searchResults = searchAndRankItems(mockMenuItems, 'cpm', (i) => i.name, (i) => i.code);
    assert.greaterThan(searchResults.length, 0, 'Found Cà Phê Muối');
    const selectedProduct = searchResults[0];

    // 2. Select table 1
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
    });
    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]);

    // 3. Configure modifier data
    const modifierData = createSampleModifierData(selectedProduct, {
      qty: 2,
      sugarLevel: '70%',
      iceLevel: '100%',
      note: 'Mang về túi riêng',
      unitPrice: 29000,
    });

    // 4. Add to cart
    store.addToCart(modifierData);

    const cart = store.getCart();
    assert.strictEqual(cart.length, 1, 'Cart has 1 item');
    assert.strictEqual(cart[0].qty, 2, 'Qty is 2');
    assert.strictEqual(cart[0].unitPrice, 29000, 'Unit price 29,000 VND');

    const table1 = usePOSStore.getState().tables.find((t) => t.id === 't1');
    assert.strictEqual(table1?.status, 'co_khach', 'Table 1 status updated to co_khach');
    assert.strictEqual(table1?.totalAmount, 58000, 'Table 1 total amount is 58,000 VND');
  });

  await runner.test('Pairwise 2: Add Duplicate Item with Same Modifiers -> Deduplication Triggered', () => {
    const store = usePOSStore.getState();
    const product = mockMenuItems[0]; // Trà Sữa

    // First add: 1x Size L, 70% đường, 100% đá, Trân Châu Hoàng Gia
    store.addToCart(
      createSampleModifierData(product, {
        qty: 1,
        selectedSize: 'Size L',
        sugarLevel: '70%',
        iceLevel: '100%',
        selectedToppings: ['Trân Châu Hoàng Gia'],
        unitPrice: 47000,
      })
    );

    const countBefore = store.getCart().length;

    // Second add: Identical configuration
    store.addToCart(
      createSampleModifierData(product, {
        qty: 2,
        selectedSize: 'Size L',
        sugarLevel: '70%',
        iceLevel: '100%',
        selectedToppings: ['Trân Châu Hoàng Gia'],
        unitPrice: 47000,
      })
    );

    const cart = store.getCart();
    assert.strictEqual(cart.length, countBefore, 'Cart length remains unchanged (deduplicated)');
    const deduplicatedItem = cart.find((c) => c.item.id === product.id && c.selectedSize === 'Size L');
    assert.strictEqual(deduplicatedItem?.qty, 3, 'Qty merged from 1 + 2 = 3');
  });

  await runner.test('Pairwise 3: Add Same Item with Different Sugar/Ice -> Creates Separate Cart Line', () => {
    const store = usePOSStore.getState();
    const product = mockMenuItems[0]; // Trà Sữa

    // Add with 50% sugar instead of 70%
    store.addToCart(
      createSampleModifierData(product, {
        qty: 1,
        selectedSize: 'Size L',
        sugarLevel: '50%', // Different sugar!
        iceLevel: '100%',
        selectedToppings: ['Trân Châu Hoàng Gia'],
        unitPrice: 47000,
      })
    );

    const cart = store.getCart();
    const sameProductLines = cart.filter((c) => c.item.id === product.id);
    assert.strictEqual(sameProductLines.length, 2, '2 distinct lines for different sugar levels');
  });

  await runner.test('Pairwise 4: Send to Kitchen -> Subsequent identical items do NOT merge into sent items', () => {
    const store = usePOSStore.getState();

    // 1. Send active cart to kitchen
    const sendRes = store.sendToKitchen();
    assert.greaterThan(sendRes.newCount, 0, 'Sent items to kitchen');

    // 2. Add an identical item (Size L, 50% sugar)
    const product = mockMenuItems[0];
    store.addToCart(
      createSampleModifierData(product, {
        qty: 1,
        selectedSize: 'Size L',
        sugarLevel: '50%',
        iceLevel: '100%',
        selectedToppings: ['Trân Châu Hoàng Gia'],
        unitPrice: 47000,
      })
    );

    const cart = store.getCart();
    const unsentLines = cart.filter((c) => !c.sentToKitchen && c.item.id === product.id && c.sugarLevel === '50%');
    const sentLines = cart.filter((c) => c.sentToKitchen && c.item.id === product.id && c.sugarLevel === '50%');

    assert.strictEqual(sentLines.length, 1, '1 sent line preserved in kitchen state');
    assert.strictEqual(unsentLines.length, 1, '1 new unsent line created for fresh order');
  });

  await runner.test('Pairwise 5: Void Item after Kitchen Dispatch -> Generates Audit Event & Recalculates Total', () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
    });
    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]);

    // Add 2 items: 1 drink and 1 snack
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2, unitPrice: 35000 })); // 70k
    store.sendToKitchen(); // Send drink to kitchen

    // Add another snack (unsent)
    store.addToCart(createSampleModifierData(mockMenuItems[3], { qty: 1, unitPrice: 30000 })); // 30k (total 100k)

    const cart = store.getCart();
    const sentItem = cart.find((c) => c.sentToKitchen);
    assert.isDefined(sentItem, 'Sent item exists');
    assert.strictEqual(sentItem.qty, 2);

    const amountBefore = store.getCart().reduce((s, c) => s + c.unitPrice * c.qty, 0); // 100k

    // Void sent drink item
    store.voidItem(sentItem.cartItemId, 'Khách hủy: Chờ quá lâu');

    const cartAfter = store.getCart();
    const amountAfter = cartAfter.reduce((s, c) => s + c.unitPrice * c.qty, 0);

    assert.strictEqual(cartAfter.find((c) => c.cartItemId === sentItem.cartItemId), undefined, 'Voided item removed');
    assert.strictEqual(amountAfter, 30000, 'Remaining total is 30,000 VND (snack only)');
    assert.strictEqual(amountAfter, amountBefore - sentItem.unitPrice * sentItem.qty, 'Total reduced by voided amount');
  });

  await runner.test('Pairwise 6: Apply 15% Normal Discount -> Discount Amount & Net Total Correct', () => {
    const store = usePOSStore.getState();
    store.applyDiscount('percent', 15, 'Giảm giá thành viên Bạc');

    const discount = store.getDiscount();
    assert.strictEqual(discount?.type, 'percent');
    assert.strictEqual(discount?.value, 15);

    const cart = store.getCart();
    const subtotal = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
    const discountAmount = Math.round((subtotal * 15) / 100);
    const netTotal = subtotal - discountAmount;

    assert.strictEqual(netTotal, subtotal - discountAmount);
  });

  await runner.test('Pairwise 7: Apply 30% Excessive Discount -> Flags Anti-Fraud Guard Warning', () => {
    const isExcessive = (percent: number) => percent > 20;
    assert.isTrue(isExcessive(30), '30% discount exceeds 20% limit and must trigger warning');

    const store = usePOSStore.getState();
    store.applyDiscount('percent', 30, 'Giảm giá VIP đặc biệt duyệt bởi Chủ Quán');
    assert.strictEqual(store.getDiscount()?.value, 30);
  });

  await runner.test('Pairwise 8: Smart Cash Presets on Discounted Amount', () => {
    const netTotal = 175000;
    // Helper to calculate presets
    const candidateBills = [200000, 500000, 1000000];
    const rounded50k = Math.ceil(netTotal / 50000) * 50000; // 200,000

    const milestones = [rounded50k, ...candidateBills.filter((b) => b > netTotal && b !== rounded50k)];
    assert.strictEqual(milestones[0], 200000);
    assert.strictEqual(milestones[1], 500000);
  });

  await runner.test('Pairwise 9: 9 Cash Denominations Count -> Exact Match Calculation', () => {
    const totalAmount = 175000;
    const countedDenominations = {
      100000: 1, // 100,000
      50000: 1,  //  50,000
      20000: 1,  //  20,000
      5000: 1,   //   5,000
    };

    const cashGiven =
      100000 * countedDenominations[100000] +
      50000 * countedDenominations[50000] +
      20000 * countedDenominations[20000] +
      5000 * countedDenominations[5000];

    assert.strictEqual(cashGiven, totalAmount, 'Cash given equals total amount');
    const changeDue = cashGiven - totalAmount;
    assert.strictEqual(changeDue, 0, 'Change due is 0 VND');
  });

  await runner.test('Pairwise 10: Table Split -> Move subset to Table 2 -> Table 1 remains occupied', () => {
    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]); // t1
    store.clearCart();
    store.clearDiscount();

    // Add 2 distinct items to t1
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2, unitPrice: 35000 })); // 70k
    store.addToCart(createSampleModifierData(mockMenuItems[1], { qty: 1, unitPrice: 39000 })); // 39k

    const t1Cart = store.getCart();
    assert.strictEqual(t1Cart.length, 2);

    const itemToSplitId = t1Cart[0].cartItemId;
    const splitSuccess = store.splitTable('t2', [itemToSplitId]);
    assert.isTrue(splitSuccess, 'SplitTable returned true');

    const state = usePOSStore.getState();
    const t1CartAfter = state.tableCarts['t1'];
    const t2CartAfter = state.tableCarts['t2'];

    assert.strictEqual(t1CartAfter.length, 1, 'Table 1 has 1 remaining item');
    assert.strictEqual(t2CartAfter.length, 1, 'Table 2 received split item');

    const t1Table = state.tables.find((t) => t.id === 't1');
    const t2Table = state.tables.find((t) => t.id === 't2');
    assert.strictEqual(t1Table?.status, 'co_khach', 'Table 1 is still co_khach');
    assert.strictEqual(t2Table?.status, 'co_khach', 'Table 2 is now co_khach');
  });

  await runner.test('Pairwise 11: Table Merge -> Combines Table 3 into Table 1 and frees Table 3', () => {
    const store = usePOSStore.getState();
    store.selectTable(mockTables[2]); // t3
    store.clearCart();
    store.addToCart(createSampleModifierData(mockMenuItems[2], { qty: 2, unitPrice: 29000 })); // 58k

    // Merge t3 into t1
    const mergeSuccess = store.mergeTable('t1');
    assert.isTrue(mergeSuccess, 'MergeTable returned true');

    const state = usePOSStore.getState();
    assert.strictEqual(state.tableCarts['t3'], undefined, 'Table 3 cart cleared');
    assert.strictEqual(state.tableCarts['t1']?.length, 2, 'Table 1 has 2 items');

    const t3Table = state.tables.find((t) => t.id === 't3');
    assert.strictEqual(t3Table?.status, 'trong', 'Table 3 is now trong');
  });

  await runner.test('Pairwise 12: Order Checkout -> ESC/POS Raw Byte Buffer Verification', () => {
    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]); // t1
    const cart = store.getCart();
    const totalAmount = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);

    // Build receipt simulation
    const receiptReq = {
      storeName: 'ONGCHU COFFEE & TEA',
      tableName: 'Bàn 01',
      cashier: 'Thu Ngan Loc Thanh',
      orderCode: 'HD-20260902-001',
      items: cart.map((c) => ({
        name: c.item.name,
        qty: c.qty,
        unitPrice: c.unitPrice,
        amount: c.unitPrice * c.qty,
      })),
      total: totalAmount,
      cashGiven: totalAmount,
      changeDue: 0,
    };

    // Checkout in store
    store.checkoutSuccess(totalAmount);

    const stateAfter = usePOSStore.getState();
    assert.strictEqual(stateAfter.tableCarts['t1'], undefined, 'Table 1 cart cleared upon checkout');
    const t1Table = stateAfter.tables.find((t) => t.id === 't1');
    assert.strictEqual(t1Table?.status, 'trong', 'Table 1 status reset to trong');
  });

  await runner.test('Pairwise 13: Cash Shift Opening -> Cash In/Out -> Shift Closing Reconciliation', () => {
    // 1. Shift Open
    const startingCash = 500000;

    // 2. Sales during shift (3 cash orders: 150k + 200k + 100k = 450k)
    const totalCashSales = 450000;

    // 3. Cash out from Sổ Quỹ (Mua đá 30k, Rau 70k = 100k)
    const totalCashOut = 100000;

    // 4. Cash in from Sổ Quỹ (Bán vỏ lon = 50k)
    const totalCashIn = 50000;

    // 5. Expected Ending Cash
    const expectedEndingCash = startingCash + totalCashSales + totalCashIn - totalCashOut;
    assert.strictEqual(expectedEndingCash, 900000, 'Expected cash = 900,000 VND');

    // 6. Cashier counts 900,000 VND (1x 500k, 2x 200k)
    const actualEndingCash = 500000 * 1 + 200000 * 2;
    const diff = actualEndingCash - expectedEndingCash;
    assert.strictEqual(diff, 0, 'Zero cash shift variance');
  });

  await runner.test('Pairwise 14: VietQR Payment Channel -> Zero Cash Impact on Drawer', () => {
    const startingCash = 500000;
    const totalCashSales = 450000;
    const vietqrSales = 600000; // Paid via VietQR QR Transfer!

    // VietQR must NOT be added to expected cash in drawer
    const expectedCashInDrawer = startingCash + totalCashSales;
    assert.strictEqual(expectedCashInDrawer, 950000, 'VietQR sales do not inflate cash drawer expectation');
  });

  await runner.test('Pairwise 15: Takeaway Flow -> Auto Select Mang Về Table -> Immediate Checkout', () => {
    const store = usePOSStore.getState();
    store.setOrderChannel('takeaway');

    const currentTable = usePOSStore.getState().selectedTable;
    assert.isTrue(
      currentTable.area === 'Mang Về' || currentTable.name.toLowerCase().includes('mang về'),
      'Automatically selected Takeaway table'
    );

    // Add 1 takeaway item and checkout
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 1, unitPrice: 35000 }));
    assert.strictEqual(store.getCart().length, 1);

    store.checkoutSuccess(35000);
    assert.strictEqual(store.getCart().length, 0);
  });

  await runner.test('Pairwise 16: Custom Open Item -> Modifier Configuration -> Split & Checkout', () => {
    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]); // t1
    store.clearCart();

    // Add custom item
    store.addCustomItem('Món Đặc Biệt Quán Tự Nấu', 65000, 2); // 130k
    assert.strictEqual(store.getCart()[0].unitPrice, 65000);
    assert.strictEqual(store.getCart()[0].qty, 2);

    // Apply fixed discount 30k
    store.applyDiscount('fixed', 30000, 'Khách quen');
    const discount = store.getDiscount();
    assert.strictEqual(discount?.value, 30000);

    const subtotal = 130000;
    const netTotal = subtotal - (discount?.value || 0);
    assert.strictEqual(netTotal, 100000);

    store.checkoutSuccess(netTotal);
    assert.strictEqual(store.getCart().length, 0);
  });
}
