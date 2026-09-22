/**
 * 👑 OngChu Lean POS - Table & Cart Selection Flow Test Suite
 * Tests flexible order workflows:
 * 1. Table first -> Menu -> Save/Pay
 * 2. Menu first (Unassigned) -> Edit Cart -> Assign to Table on Save/Pay
 * 3. Cart modifications (Qty, Modifiers, Deduplication)
 */

import { runner, assert } from './harness';
import { usePOSStore, UNASSIGNED_TABLE } from '../lib/store/usePOSStore';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';
import { aggregateCartItems, getBatchInfo } from '../lib/utils/cartAlgorithms';

export async function runTableCartSelectionFlowTests() {
  runner.setContext('Workflows', 'Table & Cart Selection Flow');

  const resetStore = () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
      viewMode: 'tables',
      orderChannel: 'dine_in',
    });
  };

  await runner.test('startNewOrder initializes UNASSIGNED_TABLE with clean state', () => {
    resetStore();
    const store = usePOSStore.getState();
    store.startNewOrder();

    const state = usePOSStore.getState();
    assert.strictEqual(state.selectedTable.id, 'unassigned', 'selectedTable id should be unassigned');
    assert.strictEqual(state.selectedTable.name, 'Chưa Chọn Bàn', 'selectedTable name should match');
    assert.strictEqual(state.viewMode, 'pos', 'viewMode should switch to pos');
    assert.strictEqual(state.orderChannel, 'dine_in', 'orderChannel should be dine_in');
  });

  await runner.test('Adding items to cart while unassigned stores items under unassigned key', () => {
    resetStore();
    const store = usePOSStore.getState();
    store.startNewOrder();

    const item1 = mockMenuItems[0];
    const modData = createSampleModifierData(item1, {
      qty: 2,
      selectedSize: 'Size Lớn (L)',
      sugarLevel: '70%',
      iceLevel: '50%',
    });
    store.addToCart(modData);

    const state = usePOSStore.getState();
    const cart = state.tableCarts['unassigned'] || [];
    assert.strictEqual(cart.length, 1, 'Cart should contain 1 item');
    assert.strictEqual(cart[0].qty, 2, 'Quantity should be 2');
    assert.strictEqual(cart[0].selectedSize, 'Size Lớn (L)', 'Size should be L');
  });

  await runner.test('Cart editing in unassigned order: update quantity and modifiers', () => {
    resetStore();
    const store = usePOSStore.getState();
    store.startNewOrder();

    const item1 = mockMenuItems[0];
    const modData = createSampleModifierData(item1, {
      qty: 1,
      selectedSize: 'Size Vừa (M)',
      sugarLevel: '100%',
      iceLevel: '100%',
    });
    store.addToCart(modData);

    let state = usePOSStore.getState();
    let cart = state.tableCarts['unassigned'] || [];
    const cartItemId = cart[0].cartItemId;

    // Tăng số lượng (+2 => 3)
    store.updateCartQty(cartItemId, 2);
    state = usePOSStore.getState();
    cart = state.tableCarts['unassigned'] || [];
    assert.strictEqual(cart[0].qty, 3, 'Quantity should increase to 3');

    // Cập nhật modifier (đổi sang size L, đường 50%)
    store.updateCartItem(cartItemId, {
      ...cart[0],
      selectedSize: 'Size Lớn (L)',
      sugarLevel: '50%',
      unitPrice: cart[0].unitPrice + 5000,
    });
    state = usePOSStore.getState();
    cart = state.tableCarts['unassigned'] || [];
    assert.strictEqual(cart[0].selectedSize, 'Size Lớn (L)', 'Size should be updated to L');
    assert.strictEqual(cart[0].sugarLevel, '50%', 'Sugar level should be updated to 50%');
  });

  await runner.test('assignCartToTable transfers cart and discount to target table and cleans up unassigned', () => {
    resetStore();
    const store = usePOSStore.getState();
    store.startNewOrder();

    const item1 = mockMenuItems[0];
    const modData = createSampleModifierData(item1, {
      qty: 2,
      selectedSize: 'Size Vừa (M)',
      sugarLevel: '100%',
      iceLevel: '100%',
    });
    store.addToCart(modData);
    store.applyDiscount('percent', 10, 'Khai trương');

    const targetTable = store.tables[2]; // Bàn 03
    store.assignCartToTable(targetTable);

    const state = usePOSStore.getState();
    // Bàn hiện tại phải là targetTable
    assert.strictEqual(state.selectedTable.id, targetTable.id, 'selectedTable should be targetTable');
    
    // Giỏ hàng của targetTable phải có đúng 1 món với qty = 2
    const targetCart = state.tableCarts[targetTable.id] || [];
    assert.strictEqual(targetCart.length, 1, 'Target table cart should have 1 item');
    assert.strictEqual(targetCart[0].qty, 2, 'Target table item qty should be 2');

    // Chiết khấu phải chuyển sang targetTable
    assert.strictEqual(state.tableDiscounts[targetTable.id]?.value, 10, 'Discount should transfer to target table');

    // Giỏ hàng unassigned phải được dọn dẹp
    assert.isTrue(!state.tableCarts['unassigned'] || state.tableCarts['unassigned'].length === 0, 'Unassigned cart should be cleared');

    // Trạng thái bàn đích phải chuyển thành có khách
    const updatedTable = state.tables.find((t) => t.id === targetTable.id);
    assert.strictEqual(updatedTable?.status, 'co_khach', 'Target table status should be co_khach');
  });

  await runner.test('After assigning to table, sendToKitchen marks items as sent for the table', () => {
    resetStore();
    const store = usePOSStore.getState();
    store.startNewOrder();

    const item1 = mockMenuItems[0];
    store.addToCart(createSampleModifierData(item1, { qty: 2 }));
    
    const targetTable = store.tables[2];
    store.assignCartToTable(targetTable);

    store.sendToKitchen();

    const state = usePOSStore.getState();
    const cart = state.tableCarts[targetTable.id] || [];
    assert.isTrue(cart.length > 0, 'Cart should have items');
    assert.isTrue(Boolean(cart[0]?.sentToKitchen), 'Items should be marked as sentToKitchen');
  });

  await runner.test('Pre-selecting table before adding items works as standard flow', () => {
    resetStore();
    const store = usePOSStore.getState();
    const table1 = store.tables[0];
    store.selectTable(table1);

    const item2 = mockMenuItems[1];
    store.addToCart(createSampleModifierData(item2, { qty: 1 }));

    const state = usePOSStore.getState();
    const cart = state.tableCarts[table1.id] || [];
    assert.strictEqual(state.selectedTable.id, table1.id, 'selectedTable should be table1');
    assert.strictEqual(cart.length, 1, 'Table 1 cart should have 1 item');
    assert.strictEqual(cart[0].qty, 1, 'Item qty should be 1');
  });

  await runner.test('aggregateCartItems accurately aggregates items across multiple order batches', () => {
    const { aggregateCartItems } = require('../lib/utils/cartAlgorithms');
    const mockCart = [
      {
        cartItemId: 'c_1',
        item: { id: 'cf_1', name: 'Cà Phê Sữa Đá', price: 29000 },
        qty: 2,
        unitPrice: 29000,
        selectedSize: 'Lớn',
        sugarLevel: '70%',
        iceLevel: '100%',
        selectedToppings: ['Trân Châu Đen'],
        note: 'Ít ngọt',
        sentToKitchen: true,
      },
      {
        cartItemId: 'c_2',
        item: { id: 'cf_1', name: 'Cà Phê Sữa Đá', price: 29000 },
        qty: 1,
        unitPrice: 29000,
        selectedSize: 'Lớn',
        sugarLevel: '70%',
        iceLevel: '100%',
        selectedToppings: ['Trân Châu Đen'],
        note: 'Ít ngọt',
        sentToKitchen: false,
      },
      {
        cartItemId: 'c_3',
        item: { id: 'tra_1', name: 'Trà Đào Cam Sả', price: 39000 },
        qty: 1,
        unitPrice: 39000,
        selectedSize: 'Vừa',
        sugarLevel: '100%',
        iceLevel: '100%',
        selectedToppings: [],
        note: '',
        sentToKitchen: true,
      },
    ];

    const aggregated = aggregateCartItems(mockCart);
    assert.strictEqual(aggregated.length, 2, 'Should aggregate 3 items into 2 unique menu entries');
    
    const cfItem = aggregated.find((a: any) => a.item.id === 'cf_1');
    assert.isTrue(Boolean(cfItem), 'Cà phê item must exist');
    assert.strictEqual(cfItem?.totalQty, 3, 'Total qty of Cà phê should be 3');
    assert.strictEqual(cfItem?.totalAmount, 87000, 'Total amount should be 87000');
    assert.strictEqual(cfItem?.sentQty, 2, 'Sent qty should be 2');
    assert.strictEqual(cfItem?.newQty, 1, 'New qty should be 1');
  });

  await runner.test('getBatchInfo correctly detects batch boundaries for unsent and sent rounds', () => {
    const testCart: any[] = [
      { cartItemId: 'i1', sentToKitchen: false },
      { cartItemId: 'i2', sentToKitchen: false },
      { cartItemId: 'i3', sentToKitchen: true, roundIndex: 2, sentAt: '20:15' },
      { cartItemId: 'i4', sentToKitchen: true, roundIndex: 2, sentAt: '20:15' },
      { cartItemId: 'i5', sentToKitchen: true, roundIndex: 1, sentAt: '19:30' },
    ];

    const b0 = getBatchInfo(testCart, 0);
    assert.isTrue(b0 !== null && b0.isUnsent === true, 'Index 0 is unsent header');
    assert.strictEqual(b0?.label, 'Món mới · Chưa gửi bếp');

    const b1 = getBatchInfo(testCart, 1);
    assert.strictEqual(b1, null, 'Index 1 is same batch, should return null');

    const b2 = getBatchInfo(testCart, 2);
    assert.isTrue(b2 !== null && b2.isUnsent === false, 'Index 2 is Round 2 header');
    assert.strictEqual(b2?.roundIndex, 2);
    assert.strictEqual(b2?.label, 'Đợt 2 · 20:15');

    const b3 = getBatchInfo(testCart, 3);
    assert.strictEqual(b3, null, 'Index 3 is same Round 2 batch, should return null');

    const b4 = getBatchInfo(testCart, 4);
    assert.isTrue(b4 !== null && b4.isUnsent === false, 'Index 4 is Round 1 header');
    assert.strictEqual(b4?.roundIndex, 1);
    assert.strictEqual(b4?.label, 'Đợt 1 · 19:30');
  });

  await runner.test('sendToKitchen sequentially assigns roundIndex to newly added items', () => {
    resetStore();
    const store = usePOSStore.getState();
    const tableId = mockTables[0].id;
    usePOSStore.setState({ selectedTable: mockTables[0] });

    // Round 1
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 1 }));
    store.sendToKitchen();

    let state = usePOSStore.getState();
    let cart = state.tableCarts[tableId] || [];
    assert.strictEqual(cart.length, 1);
    assert.strictEqual(cart[0].sentToKitchen, true);
    assert.strictEqual(cart[0].roundIndex, 1);

    // Round 2
    store.addToCart(createSampleModifierData(mockMenuItems[1], { qty: 2 }));
    state = usePOSStore.getState();
    cart = state.tableCarts[tableId] || [];
    assert.strictEqual(cart.some((c) => !c.sentToKitchen), true, 'Has unsent items before send');

    store.sendToKitchen();
    state = usePOSStore.getState();
    cart = state.tableCarts[tableId] || [];
    const itemRound2 = cart.find((c) => c.item.id === mockMenuItems[1].id);
    assert.strictEqual(itemRound2?.sentToKitchen, true);
    assert.strictEqual(itemRound2?.roundIndex, 2, 'Second batch must receive roundIndex = 2');
  });
}

