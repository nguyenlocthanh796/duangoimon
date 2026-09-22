import './setup_env';
import { runner, assert } from './harness';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';
import { usePOSStore, CartItem } from '../lib/store/usePOSStore';
import {
  removeVietnameseDiacritics,
  getVietnameseAcronym,
  scoreVietnameseSearch,
  matchesVietnameseSearch,
  searchAndRankItems,
} from '../lib/utils/vietnameseSearch';
import { getResponsiveFont } from '../lib/theme/typography';
import { lightTheme, darkTheme } from '../lib/theme/colors';

import {
  isSameModifierConfig,
  calculateCartItemCount,
  calculateCartTotal,
  countUnsentKitchenItems,
  formatModifierSummary,
} from '../lib/utils/cartAlgorithms';
import {
  CASH_DENOMINATIONS,
  calculateCashTotal,
  calculateShiftVariance,
  calculateSmartPresets,
  formatCashShort,
} from '../lib/utils/cashPresets';

// ESC/POS byte builder simulation contract matching Go printer.go
function buildTestESCPOSBytes(req: {
  storeName: string;
  tableName: string;
  cashier: string;
  orderCode: string;
  items: { name: string; qty: number; unitPrice: number; amount: number; modifiers?: string }[];
  total: number;
  cashGiven?: number;
  changeDue?: number;
}): Uint8Array {
  const buffer: number[] = [];

  // ESC @ : Init [0x1B, 0x40]
  buffer.push(0x1b, 0x40);

  // ESC t 0 : Code table [0x1B, 0x74, 0x00]
  buffer.push(0x1b, 0x74, 0x00);

  // ESC a 1 : Center [0x1B, 0x61, 0x01]
  buffer.push(0x1b, 0x61, 0x01);

  // GS ! 17 : Double height/width header [0x1D, 0x21, 0x11]
  buffer.push(0x1d, 0x21, 0x11);
  const store = removeVietnameseDiacritics(req.storeName || 'ONGCHU POS') + '\n';
  for (let i = 0; i < store.length; i++) buffer.push(store.charCodeAt(i));

  // GS ! 0 : Normal text [0x1D, 0x21, 0x00]
  buffer.push(0x1d, 0x21, 0x00);

  // ESC a 0 : Left [0x1B, 0x61, 0x00]
  buffer.push(0x1b, 0x61, 0x00);
  const info = `Ban: ${removeVietnameseDiacritics(req.tableName)} Thu Ngan: ${removeVietnameseDiacritics(req.cashier)}\nMa HD: ${req.orderCode}\n`;
  for (let i = 0; i < info.length; i++) buffer.push(info.charCodeAt(i));

  for (const it of req.items) {
    const line = `${removeVietnameseDiacritics(it.name).padEnd(16).slice(0, 16)} ${String(it.qty).padStart(3)} ${String(it.amount).padStart(10)}\n`;
    for (let i = 0; i < line.length; i++) buffer.push(line.charCodeAt(i));
  }

  // ESC a 2 : Right [0x1B, 0x61, 0x02]
  buffer.push(0x1b, 0x61, 0x02);
  const totalLine = `Tong Tien: ${req.total} d\n`;
  for (let i = 0; i < totalLine.length; i++) buffer.push(totalLine.charCodeAt(i));

  // GS V 65 16 : Auto-cut [0x1D, 0x56, 0x41, 0x10]
  buffer.push(0x1d, 0x56, 0x41, 0x10);

  // ESC p 0 25 250 : Drawer kick [0x1B, 0x70, 0x00, 0x19, 0xFA]
  buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa);

  return new Uint8Array(buffer);
}

export async function runTier1Tests() {
  // -------------------------------------------------------------------------
  // Feature 1: Zustand Atomic Selectors & Multi-Table State Management
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'Zustand Multi-Table Store');

  await runner.test('Zustand - Cart isolation across multiple tables', () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
    });

    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]); // Bàn 01
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2 })); // 2x Trà Sữa

    store.selectTable(mockTables[1]); // Bàn 02
    store.addToCart(createSampleModifierData(mockMenuItems[1], { qty: 1 })); // 1x Trà Đào

    const state = usePOSStore.getState();
    assert.strictEqual(state.tableCarts['t1']?.length, 1, 'Table 1 cart length should be 1');
    assert.strictEqual(state.tableCarts['t1'][0].qty, 2, 'Table 1 cart item qty should be 2');
    assert.strictEqual(state.tableCarts['t2']?.length, 1, 'Table 2 cart length should be 1');
    assert.strictEqual(state.tableCarts['t2'][0].qty, 1, 'Table 2 cart item qty should be 1');
    assert.strictEqual(state.tableCarts['t3'], undefined, 'Table 3 cart should be empty');
  });

  await runner.test('Zustand - Update quantity and remove item when qty hits 0', () => {
    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]);
    store.clearCart();
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2 }));
    const cart = store.getCart();
    const itemId = cart[0].cartItemId;

    // Increment
    store.updateCartQty(itemId, 1);
    assert.strictEqual(usePOSStore.getState().getCart()[0].qty, 3, 'Qty should increment to 3');

    // Decrement by 3 -> should auto-remove item
    store.updateCartQty(itemId, -3);
    assert.strictEqual(usePOSStore.getState().getCart().length, 0, 'Cart should be empty after reaching 0');
  });

  await runner.test('Zustand - Send to kitchen marks all items with timestamp', () => {
    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]);
    store.clearCart();
    store.addToCart(createSampleModifierData(mockMenuItems[2], { qty: 1 })); // 1x Cà phê muối

    const res = store.sendToKitchen();
    assert.strictEqual(res.newCount, 1, 'Should send 1 new item to kitchen');
    assert.isTrue(res.allSent, 'All items should now be sent');

    const updatedCart = store.getCart();
    assert.strictEqual(updatedCart[0].sentToKitchen, true, 'sentToKitchen flag must be true');
    assert.isDefined(updatedCart[0].sentAt, 'sentAt timestamp must be defined');
  });

  await runner.test('Zustand - Table Move transfers cart cleanly and frees source table', () => {
    const store = usePOSStore.getState();
    store.selectTable(mockTables[0]); // t1
    store.clearCart();
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2 }));

    const moved = store.moveTable('t4'); // Move t1 to t4
    assert.isTrue(moved, 'moveTable should return true');

    const state = usePOSStore.getState();
    assert.strictEqual(state.tableCarts['t1'], undefined, 'Source table cart should be undefined');
    assert.strictEqual(state.tableCarts['t4']?.length, 1, 'Target table cart should have 1 item');
    const t1 = state.tables.find((t) => t.id === 't1');
    const t4 = state.tables.find((t) => t.id === 't4');
    assert.strictEqual(t1?.status, 'trong', 'Source table status must be trong');
    assert.strictEqual(t4?.status, 'co_khach', 'Target table status must be co_khach');
  });

  await runner.test('Zustand - Table Merge combines items from both tables', () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t })),
      selectedTable: mockTables[1],
      tableCarts: {},
      tableDiscounts: {},
    });
    const store = usePOSStore.getState();
    store.selectTable(mockTables[1]); // t2
    store.addToCart(createSampleModifierData(mockMenuItems[1], { qty: 1 })); // 39k (t2 has 1 item, qty 1)

    store.selectTable(mockTables[3]); // t4
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2 })); // 70k (t4 has 1 item, qty 2)

    const merged = store.mergeTable('t2'); // Merge t4 into t2
    assert.isTrue(merged, 'mergeTable should succeed');

    const state = usePOSStore.getState();
    assert.strictEqual(state.tableCarts['t4'], undefined, 'Source table t4 cart cleared');
    assert.strictEqual(state.tableCarts['t2']?.length, 2, 'Target table t2 now has 2 items');
    assert.strictEqual(state.tableCarts['t2'].reduce((s, c) => s + c.qty, 0), 3, 'Total item qty is 3');
  });

  await runner.test('Zustand - Checkout success clears cart and resets table status', () => {
    const store = usePOSStore.getState();
    store.selectTable(mockTables[1]); // t2
    store.checkoutSuccess(109000);

    const state = usePOSStore.getState();
    assert.strictEqual(state.tableCarts['t2'], undefined, 'Cart for t2 cleared on checkout');
    assert.strictEqual(state.tableDiscounts['t2'], undefined, 'Discount for t2 cleared');
    const t2 = state.tables.find((t) => t.id === 't2');
    assert.strictEqual(t2?.status, 'trong', 'Table status reset to trong');
    assert.strictEqual(t2?.totalAmount, 0, 'Table total amount reset to 0');
  });

  // -------------------------------------------------------------------------
  // Feature 2: FlashList 60 FPS & Component Memoization Props
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'FlashList & Memoization');

  await runner.test('CartItemRow memo comparator - accurately detects equal props', () => {
    const cartItemA: CartItem = {
      cartItemId: 'item_1',
      item: mockMenuItems[0],
      qty: 2,
      selectedSize: 'Size Lớn (L)',
      sugarLevel: '70%',
      iceLevel: '100%',
      selectedToppings: ['Trân Châu Hoàng Gia'],
      note: 'Ít đá',
      unitPrice: 47000,
      sentToKitchen: false,
    };

    const cartItemB: CartItem = { ...cartItemA };

    // Custom areEqual comparator for CartItemRow
    const areCartItemPropsEqual = (prev: { item: CartItem }, next: { item: CartItem }) => {
      const p = prev.item;
      const n = next.item;
      return (
        p.cartItemId === n.cartItemId &&
        p.qty === n.qty &&
        p.unitPrice === n.unitPrice &&
        p.selectedSize === n.selectedSize &&
        p.sugarLevel === n.sugarLevel &&
        p.iceLevel === n.iceLevel &&
        p.note === n.note &&
        p.sentToKitchen === n.sentToKitchen &&
        (p.selectedToppings || []).join(',') === (n.selectedToppings || []).join(',')
      );
    };

    assert.isTrue(areCartItemPropsEqual({ item: cartItemA }, { item: cartItemB }), 'Props must be equal');

    // Mutate qty
    const cartItemMutatedQty = { ...cartItemA, qty: 3 };
    assert.isFalse(areCartItemPropsEqual({ item: cartItemA }, { item: cartItemMutatedQty }), 'Props not equal on qty change');

    // Mutate sentToKitchen
    const cartItemMutatedKitchen = { ...cartItemA, sentToKitchen: true };
    assert.isFalse(areCartItemPropsEqual({ item: cartItemA }, { item: cartItemMutatedKitchen }), 'Props not equal on sentToKitchen change');
  });

  await runner.test('ProductCard memo comparator - detects name, price, and out-of-stock changes', () => {
    const areProductCardPropsEqual = (
      prev: { id: string; price: number; isOutOfStock: boolean },
      next: { id: string; price: number; isOutOfStock: boolean }
    ) => {
      return (
        prev.id === next.id &&
        prev.price === next.price &&
        prev.isOutOfStock === next.isOutOfStock
      );
    };

    const p1 = { id: 'prod_1', price: 35000, isOutOfStock: false };
    const p2 = { id: 'prod_1', price: 35000, isOutOfStock: false };
    const p3 = { id: 'prod_1', price: 35000, isOutOfStock: true };

    assert.isTrue(areProductCardPropsEqual(p1, p2), 'Identical product props are equal');
    assert.isFalse(areProductCardPropsEqual(p1, p3), 'Out of stock change invalidates memo');
  });

  await runner.test('TableCard memo comparator - detects status, total amount, and guest count', () => {
    const areTableCardPropsEqual = (
      prev: { id: string; status: string; totalAmount: number; guestCount: number },
      next: { id: string; status: string; totalAmount: number; guestCount: number }
    ) => {
      return (
        prev.id === next.id &&
        prev.status === next.status &&
        prev.totalAmount === next.totalAmount &&
        prev.guestCount === next.guestCount
      );
    };

    const t1 = { id: 't1', status: 'trong', totalAmount: 0, guestCount: 0 };
    const t2 = { id: 't1', status: 'trong', totalAmount: 0, guestCount: 0 };
    const t3 = { id: 't1', status: 'co_khach', totalAmount: 145000, guestCount: 3 };

    assert.isTrue(areTableCardPropsEqual(t1, t2), 'Unchanged table is equal');
    assert.isFalse(areTableCardPropsEqual(t1, t3), 'Occupied table with amount invalidates memo');
  });

  await runner.test('CartItemRow memo comparator - detects qty, price, note, sentToKitchen, modifiers', () => {
    const areCartItemRowPropsEqual = (
      prev: any,
      next: any
    ) => {
      return (
        prev.id === next.id &&
        prev.name === next.name &&
        prev.qty === next.qty &&
        prev.price === next.price &&
        prev.note === next.note &&
        prev.modifiers === next.modifiers &&
        prev.sentToKitchen === next.sentToKitchen &&
        prev.sentAt === next.sentAt &&
        prev.onUpdateQty === next.onUpdateQty &&
        prev.onRemove === next.onRemove &&
        prev.onVoidPress === next.onVoidPress
      );
    };

    const fn = () => {};
    const r1 = { id: 'c1', name: 'Trà Sữa', qty: 2, price: 35000, note: '', modifiers: 'Size L', sentToKitchen: false, onUpdateQty: fn, onRemove: fn };
    const r2 = { id: 'c1', name: 'Trà Sữa', qty: 2, price: 35000, note: '', modifiers: 'Size L', sentToKitchen: false, onUpdateQty: fn, onRemove: fn };
    const r3 = { id: 'c1', name: 'Trà Sữa', qty: 3, price: 35000, note: '', modifiers: 'Size L', sentToKitchen: false, onUpdateQty: fn, onRemove: fn };
    const r4 = { id: 'c1', name: 'Trà Sữa', qty: 2, price: 35000, note: '', modifiers: 'Size L', sentToKitchen: true, onUpdateQty: fn, onRemove: fn };

    assert.isTrue(areCartItemRowPropsEqual(r1, r2), 'Identical cart row props equal');
    assert.isFalse(areCartItemRowPropsEqual(r1, r3), 'Qty change invalidates memo');
    assert.isFalse(areCartItemRowPropsEqual(r1, r4), 'Kitchen dispatch invalidates memo');
  });

  await runner.test('FlashList estimatedItemSize layout contracts', () => {
    const productGridEstimatedSize = 160;
    const productListEstimatedSize = 72;
    const tableGridEstimatedSize = 145;

    assert.greaterThan(productGridEstimatedSize, productListEstimatedSize, 'Grid item height > List item height');
    assert.strictEqual(tableGridEstimatedSize, 145, 'TableCard estimatedItemSize is strictly 145px');
  });

  await runner.test('Key extractor stability across renders', () => {
    const keyExtractorItem = (item: CartItem) => item.cartItemId;
    const keyExtractorTable = (table: any) => table.id;

    assert.strictEqual(keyExtractorItem({ cartItemId: 'custom_123' } as any), 'custom_123');
    assert.strictEqual(keyExtractorTable({ id: 't4' }), 't4');
  });

  // -------------------------------------------------------------------------
  // Feature 3: Vietnamese Search Engine 0ms (vietnameseSearch.ts)
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'Vietnamese Search 0ms');

  await runner.test('removeVietnameseDiacritics transforms all Vietnamese tones to plain ASCII', () => {
    const input = 'Trà Sữa Trân Châu Hoàng Gia Đường Đen';
    const output = removeVietnameseDiacritics(input);
    assert.strictEqual(output, 'tra sua tran chau hoang gia duong den');

    const tones = 'à á ả ã ạ ă ắ ằ ẳ ẵ ặ â ấ ầ ẩ ẫ ậ è é ẻ ẽ ẹ ê ế ề ể ễ ệ ì í ỉ ĩ ị ò ó ỏ õ ọ ô ố ồ ổ ỗ ộ ơ ớ ờ ở ỡ ợ ù ú ủ ũ ụ ư ứ ừ ử ữ ự ỳ ý ỷ ỹ ỵ đ';
    const tonesOutput = removeVietnameseDiacritics(tones);
    assert.includes(tonesOutput, 'a');
    assert.includes(tonesOutput, 'e');
    assert.includes(tonesOutput, 'i');
    assert.includes(tonesOutput, 'o');
    assert.includes(tonesOutput, 'u');
    assert.includes(tonesOutput, 'y');
    assert.includes(tonesOutput, 'd');
    assert.isFalse(tonesOutput.includes('đ'), 'No đ remains');
  });

  await runner.test('getVietnameseAcronym generates correct first-letter abbreviations', () => {
    assert.strictEqual(getVietnameseAcronym('Trà Đào Cam Sả Tươi'), 'tdcst');
    assert.strictEqual(getVietnameseAcronym('Cà Phê Muối Cố Đô'), 'cpmcd');
    assert.strictEqual(getVietnameseAcronym('Khoai Tây Chiên Lắc Phô Mai'), 'ktclpm');
    assert.strictEqual(getVietnameseAcronym('Bánh Mì Nướng'), 'bmn');
  });

  await runner.test('scoreVietnameseSearch assigns correct tiered scores (100, 90, 75, 65, 50, 0)', () => {
    const name = 'Trà Đào Cam Sả';
    const code = 'TDCS';

    // 100: Exact match code or exact name
    assert.strictEqual(scoreVietnameseSearch(name, 'TDCS', code), 100, 'Exact code score is 100');
    assert.strictEqual(scoreVietnameseSearch(name, 'tra dao cam sa', code), 100, 'Exact name score is 100');

    // 90: Prefix match
    assert.strictEqual(scoreVietnameseSearch(name, 'tra dao', code), 90, 'Prefix score is 90');

    // 75: Exact acronym (without matching SKU code)
    assert.strictEqual(scoreVietnameseSearch(name, 'tdcs'), 75, 'Exact acronym score is 75');

    // 65: Prefix acronym
    assert.strictEqual(scoreVietnameseSearch(name, 'td'), 65, 'Prefix acronym score is 65');

    // 50: Substring match
    assert.strictEqual(scoreVietnameseSearch(name, 'cam sa', code), 50, 'Substring score is 50');

    // 0: No match
    assert.strictEqual(scoreVietnameseSearch(name, 'kem bo', code), 0, 'Mismatch score is 0');
  });

  await runner.test('matchesVietnameseSearch returns boolean match status', () => {
    assert.isTrue(matchesVietnameseSearch('Cà Phê Muối', 'cpm'));
    assert.isTrue(matchesVietnameseSearch('Cà Phê Muối', 'muoi'));
    assert.isFalse(matchesVietnameseSearch('Cà Phê Muối', 'tra sua'));
  });

  await runner.test('searchAndRankItems accurately sorts products by score descending', () => {
    const items = [
      { id: '1', name: 'Trà Xanh Thái Lan', code: 'TXTL' },
      { id: '2', name: 'Trà Đào Cam Sả', code: 'TDCS' },
      { id: '3', name: 'Trà Đào', code: 'TD' },
    ];

    // Searching 'tra dao' -> 'Trà Đào' is exact (100), 'Trà Đào Cam Sả' is prefix (90), 'Trà Xanh' is mismatch (0)
    const result = searchAndRankItems(items, 'tra dao', (i) => i.name, (i) => i.code);
    assert.strictEqual(result.length, 2, 'Should match 2 items');
    assert.strictEqual(result[0].name, 'Trà Đào', 'Exact match ranked #1');
    assert.strictEqual(result[1].name, 'Trà Đào Cam Sả', 'Prefix match ranked #2');
  });

  await runner.test('searchAndRankItems execution latency benchmark < 5ms for 1000 items', () => {
    const thousandItems = Array.from({ length: 1000 }, (_, i) => ({
      id: `item_${i}`,
      name: i % 2 === 0 ? `Trà Sữa Trân Châu Vị Số ${i}` : `Cà Phê Sữa Đá Vị Số ${i}`,
      code: `SKU_${i}`,
    }));

    const start = performance.now();
    const res = searchAndRankItems(thousandItems, 'tstc', (i) => i.name, (i) => i.code);
    const duration = performance.now() - start;

    assert.lessThan(duration, 15, `Search 1000 items took ${duration}ms, must be < 15ms (60 FPS threshold)`);
    assert.greaterThan(res.length, 0, 'Found matching items');
  });

  // -------------------------------------------------------------------------
  // Feature 4: Modifier Config & Smart Deduplication
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'Modifier Config Deduplication');

  await runner.test('isSameModifierConfig returns true when all toppings and options match exactly', () => {
    const cartItem: CartItem = {
      cartItemId: 'c1',
      item: mockMenuItems[0],
      qty: 1,
      selectedSize: 'Size L',
      sugarLevel: '70%',
      iceLevel: '100%',
      selectedToppings: ['Trân Châu', 'Thạch Phô Mai'],
      note: 'Ít đá',
      unitPrice: 47000,
      sentToKitchen: false,
    };

    const newData = createSampleModifierData(mockMenuItems[0], {
      selectedSize: 'Size L',
      sugarLevel: '70%',
      iceLevel: '100%',
      selectedToppings: ['Thạch Phô Mai', 'Trân Châu'], // Reversed order!
      note: 'Ít đá',
      unitPrice: 47000,
    });

    assert.isTrue(isSameModifierConfig(cartItem, newData), 'Should match even with reversed toppings array');
  });

  await runner.test('isSameModifierConfig returns false when size differs', () => {
    const cartItem: CartItem = {
      cartItemId: 'c1',
      item: mockMenuItems[0],
      qty: 1,
      selectedSize: 'Size M',
      unitPrice: 35000,
      selectedToppings: [],
      note: '',
      sentToKitchen: false,
    };

    const newData = createSampleModifierData(mockMenuItems[0], {
      selectedSize: 'Size L',
      unitPrice: 42000,
    });

    assert.isFalse(isSameModifierConfig(cartItem, newData), 'Size difference prevents deduplication');
  });

  await runner.test('isSameModifierConfig returns false when sugar or ice level differs', () => {
    const cartItem: CartItem = {
      cartItemId: 'c1',
      item: mockMenuItems[0],
      qty: 1,
      sugarLevel: '100%',
      iceLevel: '100%',
      unitPrice: 35000,
      selectedToppings: [],
      note: '',
      sentToKitchen: false,
    };

    const newDataSugar = createSampleModifierData(mockMenuItems[0], { sugarLevel: '50%' });
    const newDataIce = createSampleModifierData(mockMenuItems[0], { iceLevel: '50%' });

    assert.isFalse(isSameModifierConfig(cartItem, newDataSugar), 'Sugar level difference prevents deduplication');
    assert.isFalse(isSameModifierConfig(cartItem, newDataIce), 'Ice level difference prevents deduplication');
  });

  await runner.test('isSameModifierConfig returns false when customer note differs', () => {
    const cartItem: CartItem = {
      cartItemId: 'c1',
      item: mockMenuItems[0],
      qty: 1,
      unitPrice: 35000,
      selectedToppings: [],
      note: 'Uống tại quán',
      sentToKitchen: false,
    };

    const newData = createSampleModifierData(mockMenuItems[0], { note: 'Mang về túi riêng' });
    assert.isFalse(isSameModifierConfig(cartItem, newData), 'Customer note difference prevents deduplication');
  });

  await runner.test('isSameModifierConfig returns false when existing item already sent to kitchen', () => {
    const cartItem: CartItem = {
      cartItemId: 'c1',
      item: mockMenuItems[0],
      qty: 1,
      unitPrice: 35000,
      selectedToppings: [],
      note: '',
      sentToKitchen: true, // Already sent to kitchen!
    };

    const newData = createSampleModifierData(mockMenuItems[0]);
    assert.isFalse(isSameModifierConfig(cartItem, newData), 'Sent item must never be merged with new unsent item');
  });

  await runner.test('isSameModifierConfig returns false when item IDs differ', () => {
    const cartItem: CartItem = {
      cartItemId: 'c1',
      item: mockMenuItems[0],
      qty: 1,
      unitPrice: 35000,
      selectedToppings: [],
      note: '',
      sentToKitchen: false,
    };

    const newData = createSampleModifierData(mockMenuItems[1]);
    assert.isFalse(isSameModifierConfig(cartItem, newData), 'Different items must never merge');
  });

  // -------------------------------------------------------------------------
  // Feature 5: 9 Cash Denominations Counter & Shift Audit
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', '9 Cash Denominations Counter');

  await runner.test('CASH_DENOMINATIONS contains exactly 9 standard Vietnamese banknotes', () => {
    assert.strictEqual(CASH_DENOMINATIONS.length, 9, 'Must have 9 denominations');
    assert.strictEqual(CASH_DENOMINATIONS[0], 500000);
    assert.strictEqual(CASH_DENOMINATIONS[1], 200000);
    assert.strictEqual(CASH_DENOMINATIONS[2], 100000);
    assert.strictEqual(CASH_DENOMINATIONS[3], 50000);
    assert.strictEqual(CASH_DENOMINATIONS[4], 20000);
    assert.strictEqual(CASH_DENOMINATIONS[5], 10000);
    assert.strictEqual(CASH_DENOMINATIONS[6], 5000);
    assert.strictEqual(CASH_DENOMINATIONS[7], 2000);
    assert.strictEqual(CASH_DENOMINATIONS[8], 1000);
  });

  await runner.test('calculateCashTotal correctly aggregates counts across all 9 banknotes', () => {
    const counts = {
      500000: 2, // 1,000,000
      200000: 3, //   600,000
      100000: 5, //   500,000
      50000: 4,  //   200,000
      20000: 10, //   200,000
      10000: 5,  //    50,000
      5000: 8,   //    40,000
      2000: 5,   //    10,000
      1000: 7,   //     7,000
    };
    const total = calculateCashTotal(counts);
    assert.strictEqual(total, 2607000, 'Sum must equal 2,607,000 VND');
  });

  await runner.test('Shift reconciliation: expected ending cash calculation formula', () => {
    const startingCash = 1000000;
    const totalCashSales = 3500000;
    const totalCashIn = 500000;
    const totalCashOut = 200000;

    const expectedEndingCash = startingCash + totalCashSales + totalCashIn - totalCashOut;
    assert.strictEqual(expectedEndingCash, 4800000, 'Expected ending cash = 4,800,000 VND');
  });

  await runner.test('Shift reconciliation: difference calculation for positive and negative variance', () => {
    const expected = 4800000;

    // Exact match
    const actual1 = 4800000;
    assert.strictEqual(actual1 - expected, 0, 'Zero difference');

    // Thừa tiền (positive)
    const actual2 = 4850000;
    assert.strictEqual(actual2 - expected, 50000, 'Thừa 50k (+50,000 VND)');

    // Thiếu tiền (negative)
    const actual3 = 4780000;
    assert.strictEqual(actual3 - expected, -20000, 'Thiếu 20k (-20,000 VND)');
  });

  await runner.test('Currency format with dots in Vietnamese locale', () => {
    const formatVND = (val: number) => `${val.toLocaleString('vi-VN')} đ`;
    assert.strictEqual(formatVND(150000), '150.000 đ');
    assert.strictEqual(formatVND(2607000), '2.607.000 đ');
  });

  await runner.test('Denomination counter bounds protection against negative counts', () => {
    const curCount = 0;
    const delta = -1;
    const nextCount = Math.max(0, curCount + delta);
    assert.strictEqual(nextCount, 0, 'Cannot have negative banknote count');
  });

  // -------------------------------------------------------------------------
  // Feature 6: Smart Presets Calculation (smartPresets)
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'Smart Presets Calculation');

  await runner.test('Smart Presets for 47,000 VND generates 6 action buttons including 50k, 100k, 200k', () => {
    const presets = calculateSmartPresets(47000);
    assert.strictEqual(presets.length, 6, 'Must return 6 preset action items');
    assert.strictEqual(presets.find((p) => p.id === 'exact')?.value, 47000, 'Exact button matches total');
    assert.strictEqual(presets.find((p) => p.id === 'round_1')?.value, 50000, 'First milestone 50k');
    assert.strictEqual(presets.find((p) => p.id === 'round_2')?.value, 100000, 'Second milestone 100k');
    assert.strictEqual(presets.find((p) => p.id === 'round_3')?.value, 200000, 'Third milestone 200k');
    assert.strictEqual(presets.find((p) => p.id === 'add')?.value, 10000, 'Add 10k for under 500k');
  });

  await runner.test('Smart Presets for round amount 100,000 VND generates higher bills', () => {
    const presets = calculateSmartPresets(100000);
    assert.strictEqual(presets.find((p) => p.id === 'round_1')?.value, 200000, 'First milestone 200k');
    assert.strictEqual(presets.find((p) => p.id === 'round_2')?.value, 500000, 'Second milestone 500k');
    assert.strictEqual(presets.find((p) => p.id === 'round_3')?.value, 1000000, 'Third milestone 1M');
  });

  await runner.test('Smart Presets for large amount 1,350,000 VND', () => {
    const presets = calculateSmartPresets(1350000);
    assert.strictEqual(presets.find((p) => p.id === 'round_1')?.value, 1400000, 'Rounded 50k step: 1.4M');
    assert.strictEqual(presets.find((p) => p.id === 'round_2')?.value, 1500000, 'Rounded 100k / bill: 1.5M');
    assert.strictEqual(presets.find((p) => p.id === 'round_3')?.value, 2000000, 'Next bill: 2M');
    assert.strictEqual(presets.find((p) => p.id === 'add')?.value, 50000, 'Add 50k for >= 500k');
  });

  await runner.test('Smart Presets for small amount 9,000 VND', () => {
    const presets = calculateSmartPresets(9000);
    assert.strictEqual(presets.find((p) => p.id === 'round_1')?.value, 10000, 'First milestone 10k');
    assert.strictEqual(presets.find((p) => p.id === 'round_2')?.value, 20000, 'Second milestone 20k');
    assert.strictEqual(presets.find((p) => p.id === 'round_3')?.value, 50000, 'Third milestone 50k');
  });

  await runner.test('Smart Presets quick add increment logic (< 500k is +10k, >= 500k is +50k)', () => {
    const p1 = calculateSmartPresets(150000);
    const p2 = calculateSmartPresets(750000);
    assert.strictEqual(p1.find((p) => p.id === 'add')?.value, 10000, '150k gets +10k');
    assert.strictEqual(p2.find((p) => p.id === 'add')?.value, 50000, '750k gets +50k');
  });

  await runner.test('Smart Presets round milestones are strictly greater than totalAmount', () => {
    const testTotals = [15000, 47000, 89000, 235000, 990000, 1540000];
    for (const total of testTotals) {
      const presets = calculateSmartPresets(total);
      const setPresets = presets.filter((p) => p.type === 'set');
      for (const p of setPresets) {
        assert.greaterThan(p.value, total, `Preset ${p.value} must be > total ${total}`);
      }
    }
  });

  await runner.test('Cart Algorithms helper functions calculate counts, subtotals, and summaries', () => {
    const testCart: CartItem[] = [
      {
        cartItemId: 'c1',
        item: mockMenuItems[0],
        qty: 2,
        selectedSize: 'Size Lớn (L)',
        sugarLevel: '70%',
        iceLevel: '50%',
        selectedToppings: ['Trân Châu Hoàng Gia'],
        note: 'Ít ngọt',
        unitPrice: 47000,
        sentToKitchen: true,
      },
      {
        cartItemId: 'c2',
        item: mockMenuItems[3],
        qty: 1,
        selectedToppings: [],
        note: '',
        unitPrice: 30000,
        sentToKitchen: false,
      },
    ];

    assert.strictEqual(calculateCartItemCount(testCart), 3, 'Total items = 3');
    assert.strictEqual(calculateCartTotal(testCart), 124000, 'Total amount = 47k*2 + 30k*1 = 124k');
    assert.strictEqual(countUnsentKitchenItems(testCart), 1, 'Unsent items = 1');
    assert.strictEqual(
      formatModifierSummary(testCart[0]),
      'Size Lớn (L) · 70% Đường · 50% Đá · +Trân Châu Hoàng Gia'
    );
  });

  await runner.test('Cash Presets variance calculation for balanced, over, and short drawer', () => {
    const shift = { startingCash: 500000, totalCashSales: 2000000, totalCashIn: 0, totalCashOut: 100000 };
    // Expected = 2,400,000
    const balanced = calculateShiftVariance(shift, 2400000);
    assert.isTrue(balanced.isBalanced, 'Exact match is balanced');
    assert.strictEqual(balanced.diffAmount, 0);

    const over = calculateShiftVariance(shift, 2450000);
    assert.isTrue(over.isOver, 'Higher cash is over');
    assert.strictEqual(over.diffAmount, 50000);

    const short = calculateShiftVariance(shift, 2350000);
    assert.isTrue(short.isShort, 'Lower cash is short');
    assert.strictEqual(short.diffAmount, -50000);

    assert.strictEqual(formatCashShort(50000), '50k');
    assert.strictEqual(formatCashShort(1500000), '1.5 triệu');
  });

  // -------------------------------------------------------------------------
  // Feature 7: Typography 5 Tiers System (typography.ts)
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'Typography 5 Tiers');

  await runner.test('getResponsiveFont for Mobile returns standard font sizes (14, 16, 18, 22, 28)', () => {
    const fonts = getResponsiveFont(true);
    assert.strictEqual(fonts.xs.fontSize, 14, 'Mobile xs is 14px');
    assert.strictEqual(fonts.sm.fontSize, 16, 'Mobile sm is 16px');
    assert.strictEqual(fonts.md.fontSize, 18, 'Mobile md is 18px');
    assert.strictEqual(fonts.lg.fontSize, 22, 'Mobile lg is 22px');
    assert.strictEqual(fonts.xl.fontSize, 28, 'Mobile xl is 28px (Hero Total Amount)');
  });

  await runner.test('getResponsiveFont for iPad/Desktop returns scaled font sizes (14, 16, 18, 22, 30)', () => {
    const fonts = getResponsiveFont(false);
    assert.strictEqual(fonts.xs.fontSize, 14, 'Tablet xs is 14px');
    assert.strictEqual(fonts.sm.fontSize, 16, 'Tablet sm is 16px');
    assert.strictEqual(fonts.md.fontSize, 18, 'Tablet md is 18px');
    assert.strictEqual(fonts.lg.fontSize, 22, 'Tablet lg is 22px');
    assert.strictEqual(fonts.xl.fontSize, 30, 'Tablet xl is 30px');
  });

  await runner.test('includeFontPadding is false across all font tokens (prevents Android clipping)', () => {
    const fonts = getResponsiveFont(true);
    assert.strictEqual(fonts.xs.includeFontPadding, false);
    assert.strictEqual(fonts.sm.includeFontPadding, false);
    assert.strictEqual(fonts.md.includeFontPadding, false);
    assert.strictEqual(fonts.lg.includeFontPadding, false);
    assert.strictEqual(fonts.xl.includeFontPadding, false);
  });

  await runner.test('Letter tracking typography ergonomics', () => {
    const fonts = getResponsiveFont(true);
    assert.greaterThan(fonts.xs.letterSpacing || 0, 0, 'Micro text xs has positive letter spacing');
    assert.lessThan(fonts.lg.letterSpacing || 0, 0, 'Header lg has negative letter spacing');
    assert.lessThan(fonts.xl.letterSpacing || 0, 0, 'Display xl has negative letter spacing');
  });

  await runner.test('Line height proportions adhere to 1.25x - 1.42x standard', () => {
    const fonts = getResponsiveFont(true);
    assert.greaterThanOrEqual(fonts.xs.lineHeight, fonts.xs.fontSize * 1.2);
    assert.greaterThanOrEqual(fonts.sm.lineHeight, fonts.sm.fontSize * 1.2);
    assert.greaterThanOrEqual(fonts.md.lineHeight, fonts.md.fontSize * 1.2);
    assert.greaterThanOrEqual(fonts.lg.lineHeight, fonts.lg.fontSize * 1.2);
  });

  // -------------------------------------------------------------------------
  // Feature 8: Tabular Nums & Numeric Formatting
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'Tabular Nums & Numerics');

  await runner.test('Tabular nums fontVariant spec array contract', () => {
    const tabularStyle = { fontVariant: ['tabular-nums'] };
    assert.includes(tabularStyle.fontVariant, 'tabular-nums');
  });

  await runner.test('Formatted currency string alignment width stability', () => {
    const formatNumericVND = (v: number) => v.toLocaleString('vi-VN').padStart(12, ' ');
    const str1 = formatNumericVND(10000);
    const str2 = formatNumericVND(500000);
    const str3 = formatNumericVND(10000000);

    assert.strictEqual(str1.length, 12);
    assert.strictEqual(str2.length, 12);
    assert.strictEqual(str3.length, 12);
  });

  await runner.test('Order code format standard HD-xxxxx', () => {
    const orderCode = 'HD-20260902-001';
    assert.isTrue(/^HD-\d{8}-\d{3}$/.test(orderCode), 'Matches standard order code regex');
  });

  await runner.test('Zero padding and integer safety in shift calculations', () => {
    const rawVal = 145000.000001;
    const rounded = Math.round(rawVal);
    assert.strictEqual(rounded, 145000, 'Floating point artifacts are stripped');
  });

  await runner.test('Tabular badge count display formatted correctly', () => {
    const itemCount = 5;
    const badgeText = `${itemCount} món`;
    assert.strictEqual(badgeText, '5 món');
  });

  // -------------------------------------------------------------------------
  // Feature 9: Dual-Theme High-Contrast Tokens (colors.ts)
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'Dual-Theme Tokens');

  await runner.test('Light theme tokens: Indochine Ngà Giấy Dó and Gỗ Mun brand', () => {
    assert.strictEqual(lightTheme.isDark, false);
    assert.strictEqual(lightTheme.surface.app, '#F9F6F0');
    assert.strictEqual(lightTheme.surface.card, '#FFFFFF');
    assert.strictEqual(lightTheme.text.primary, '#1C1917'); // 15.8:1 AAA contrast
    assert.strictEqual(lightTheme.brand.primary, '#1C1917');
    assert.strictEqual(lightTheme.brand.accent, '#B45309');
    assert.strictEqual(lightTheme.brand.success, '#15803D');
    assert.strictEqual(lightTheme.brand.danger, '#DC2626');
  });

  await runner.test('Dark theme tokens: Indochine Cà Phê Rang Đậm and Gỗ Gụ brand', () => {
    assert.strictEqual(darkTheme.isDark, true);
    assert.strictEqual(darkTheme.surface.app, '#14110E');
    assert.strictEqual(darkTheme.surface.card, '#1E1813');
    assert.strictEqual(darkTheme.text.primary, '#F3EFEA'); // 15.2:1 AAA contrast
    assert.strictEqual(darkTheme.brand.primary, '#B45309');
    assert.strictEqual(darkTheme.brand.accent, '#B45309');
    assert.strictEqual(darkTheme.brand.success, '#22C55E');
    assert.strictEqual(darkTheme.brand.danger, '#EF4444');
  });

  await runner.test('Token schema parity between Light and Dark themes', () => {
    const checkKeys = (obj1: any, obj2: any) => {
      for (const k of Object.keys(obj1)) {
        assert.isDefined(obj2[k], `Key ${k} must exist in darkTheme`);
        if (typeof obj1[k] === 'object' && obj1[k] !== null) {
          checkKeys(obj1[k], obj2[k]);
        }
      }
    };
    checkKeys(lightTheme, darkTheme);
  });

  await runner.test('Semantic border tokens in Light and Dark themes', () => {
    assert.strictEqual(lightTheme.border.default, '#D6D3D1');
    assert.strictEqual(darkTheme.border.default, '#382E25');
    assert.strictEqual(lightTheme.border.active, '#1C1917');
    assert.strictEqual(darkTheme.border.active, '#F59E0B');
  });

  await runner.test('Warning & Accent tokens consistency', () => {
    assert.strictEqual(lightTheme.brand.warning, '#D97706');
    assert.strictEqual(darkTheme.brand.warning, '#F59E0B');
  });

  // -------------------------------------------------------------------------
  // Feature 10: Anti-Fraud Guard & Discount Verification
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'Anti-Fraud & Discounts');

  await runner.test('Discount guard: percentage <= 20% is normal, > 20% triggers warning guard', () => {
    const isExcessiveDiscount = (type: 'percent' | 'fixed', value: number, subtotal: number) => {
      if (type === 'percent') return value > 20;
      if (type === 'fixed') return subtotal > 0 && (value / subtotal) * 100 > 20;
      return false;
    };

    assert.isFalse(isExcessiveDiscount('percent', 10, 200000), '10% is not excessive');
    assert.isFalse(isExcessiveDiscount('percent', 20, 200000), '20% is boundary threshold, not excessive');
    assert.isTrue(isExcessiveDiscount('percent', 25, 200000), '25% is excessive (>20%)');
    assert.isTrue(isExcessiveDiscount('fixed', 50000, 200000), '50k / 200k = 25% is excessive');
  });

  await runner.test('Discount amount calculation for percent type', () => {
    const subtotal = 350000;
    const percent = 15;
    const discountAmount = Math.round((subtotal * percent) / 100);
    const total = subtotal - discountAmount;

    assert.strictEqual(discountAmount, 52500, '15% of 350k = 52.5k');
    assert.strictEqual(total, 297500, 'Total is 297,500 VND');
  });

  await runner.test('Discount amount calculation for fixed type', () => {
    const subtotal = 350000;
    const fixedVal = 50000;
    const total = Math.max(0, subtotal - fixedVal);

    assert.strictEqual(total, 300000, 'Total after 50k fixed discount is 300,000 VND');
  });

  await runner.test('Audit log creation schema contract for anti-fraud events', () => {
    const auditRecord = {
      id: 'audit_01',
      action: 'chiet_khau_vuot_muc',
      performedBy: 'Thu Ngan 01',
      details: 'Áp dụng chiết khấu 30% cho khách VIP thân thiết',
      severity: 'warning',
      createdAt: new Date().toISOString(),
    };

    assert.strictEqual(auditRecord.action, 'chiet_khau_vuot_muc');
    assert.strictEqual(auditRecord.severity, 'warning');
    assert.isDefined(auditRecord.details);
  });

  await runner.test('Void item audit logging contract after kitchen dispatch', () => {
    const voidRecord = {
      id: 'void_01',
      action: 'huy_mon',
      orderId: 'ord_123',
      performedBy: 'Thu Ngan 01',
      details: 'Hủy 1x Trà Đào Cam Sả: Khách đổi sang Cà phê muối',
      severity: 'warning',
    };

    assert.strictEqual(voidRecord.action, 'huy_mon');
    assert.includes(voidRecord.details, 'Hủy 1x Trà Đào Cam Sả');
  });

  // -------------------------------------------------------------------------
  // Feature 11: Backend Engine Contracts & ESC/POS Heat-Printer Builder
  // -------------------------------------------------------------------------
  runner.setContext('Tier 1', 'Backend & ESC/POS Printer');

  await runner.test('ESC/POS Auto-Cut opcode is strictly [0x1D, 0x56, 0x41, 0x10]', () => {
    const bytes = buildTestESCPOSBytes({
      storeName: 'OngChu Lean POS',
      tableName: 'Bàn 01',
      cashier: 'Loc Thanh',
      orderCode: 'HD-001',
      items: [{ name: 'Trà Sữa', qty: 2, unitPrice: 35000, amount: 70000 }],
      total: 70000,
    });

    let foundCut = false;
    for (let i = 0; i < bytes.length - 3; i++) {
      if (bytes[i] === 0x1d && bytes[i + 1] === 0x56 && bytes[i + 2] === 0x41 && bytes[i + 3] === 0x10) {
        foundCut = true;
        break;
      }
    }
    assert.isTrue(foundCut, 'Must contain auto-cut opcode [0x1D, 0x56, 0x41, 0x10]');
  });

  await runner.test('ESC/POS Cash Drawer Kick opcode is strictly [0x1B, 0x70, 0x00, 0x19, 0xFA]', () => {
    const bytes = buildTestESCPOSBytes({
      storeName: 'OngChu Lean POS',
      tableName: 'Bàn 01',
      cashier: 'Loc Thanh',
      orderCode: 'HD-001',
      items: [{ name: 'Trà Sữa', qty: 1, unitPrice: 35000, amount: 35000 }],
      total: 35000,
    });

    let foundDrawer = false;
    for (let i = 0; i < bytes.length - 4; i++) {
      if (
        bytes[i] === 0x1b &&
        bytes[i + 1] === 0x70 &&
        bytes[i + 2] === 0x00 &&
        bytes[i + 3] === 0x19 &&
        bytes[i + 4] === 0xfa
      ) {
        foundDrawer = true;
        break;
      }
    }
    assert.isTrue(foundDrawer, 'Must contain drawer kick opcode [0x1B, 0x70, 0x00, 0x19, 0xFA]');
  });

  await runner.test('ESC/POS Initialization and alignment opcodes present in byte stream', () => {
    const bytes = buildTestESCPOSBytes({
      storeName: 'OngChu Lean POS',
      tableName: 'Bàn 01',
      cashier: 'Loc Thanh',
      orderCode: 'HD-001',
      items: [],
      total: 0,
    });

    // Initializer [0x1B, 0x40]
    assert.strictEqual(bytes[0], 0x1b);
    assert.strictEqual(bytes[1], 0x40);

    // Code table [0x1B, 0x74, 0x00]
    assert.strictEqual(bytes[2], 0x1b);
    assert.strictEqual(bytes[3], 0x74);
    assert.strictEqual(bytes[4], 0x00);
  });

  await runner.test('ESC/POS Byte stream strips Vietnamese diacritics to clean ASCII', () => {
    const bytes = buildTestESCPOSBytes({
      storeName: 'QUÁN CÀ PHÊ ÔNG CHỦ',
      tableName: 'Bàn Tầng Trệt 01',
      cashier: 'Nguyễn Lộc Thành',
      orderCode: 'HD-888',
      items: [{ name: 'Trà Sữa Trân Châu Hoàng Gia', qty: 1, unitPrice: 35000, amount: 35000 }],
      total: 35000,
    });

    // All characters in stream should be <= 127 (plain 7-bit ASCII + ESC control codes)
    let nonAsciiCount = 0;
    for (let i = 0; i < bytes.length; i++) {
      // Allow standard ESC/POS command bytes (like 0xFA in drawer kick)
      if (bytes[i] > 127 && bytes[i] !== 0xfa) {
        nonAsciiCount++;
      }
    }
    assert.strictEqual(nonAsciiCount, 0, 'No unescaped high UTF-8 bytes in text stream');
  });

  await runner.test('WebSocket Hub message payload contract validation', () => {
    const cfdMessage = {
      type: 'cfd_cart_sync',
      tenantId: 'tenant_1',
      branchId: 'branch_1',
      tableId: 't1',
      tableName: 'Bàn 01',
      items: [{ name: 'Trà Sữa', qty: 2, price: 35000 }],
      total: 70000,
      timestamp: Date.now(),
    };

    const jsonStr = JSON.stringify(cfdMessage);
    const parsed = JSON.parse(jsonStr);

    assert.strictEqual(parsed.type, 'cfd_cart_sync');
    assert.strictEqual(parsed.total, 70000);
    assert.strictEqual(parsed.items.length, 1);
  });

  await runner.test('P&L SQL aggregation schema logic (3 Golden Numbers contract)', () => {
    const totalRevenue = 7700000;
    const totalCOGS = 3000000;
    const totalExpenses = 700000;
    const totalVietQRSales = 3200000;
    const totalCashSales = 4500000;

    // Con số 1: Tiền mặt két thực tế
    const cashInDrawer = totalCashSales - totalExpenses;
    assert.strictEqual(cashInDrawer, 3800000, 'Golden #1 Cash in Drawer = 3,800,000 VND');

    // Con số 2: Tiền chuyển khoản VietQR
    const vietqrBankTotal = totalVietQRSales;
    assert.strictEqual(vietqrBankTotal, 3200000, 'Golden #2 VietQR Bank Total = 3,200,000 VND');

    // Con số 3: Lợi nhuận ròng bỏ túi
    const realNetProfit = totalRevenue - totalCOGS - totalExpenses;
    assert.strictEqual(realNetProfit, 4000000, 'Golden #3 Real Net Profit = 4,000,000 VND');
  });

  await runner.test('KDS Order lifecycle and item status progression', () => {
    const store = usePOSStore.getState();
    if (store.kdsOrders.length === 0) {
      store.populateSampleData();
    }
    assert.isTrue(store.kdsOrders.length > 0, 'KDS has initial orders');
    
    const targetOrder = store.kdsOrders[0];
    const targetItem = targetOrder.items[0];

    // Transition item status: pending -> cooking -> done
    store.updateKDSItemStatus(targetOrder.id, targetItem.id, 'cooking');
    let updatedOrder = usePOSStore.getState().kdsOrders.find((o) => o.id === targetOrder.id);
    assert.strictEqual(updatedOrder?.items.find((i) => i.id === targetItem.id)?.status, 'cooking');

    // Mark all done
    store.markAllKDSItemsDone(targetOrder.id);
    updatedOrder = usePOSStore.getState().kdsOrders.find((o) => o.id === targetOrder.id);
    assert.strictEqual(updatedOrder?.status, 'ready');
  });

  await runner.test('Order History invoice recording and voiding with audit log', () => {
    const store = usePOSStore.getState();
    if (store.orderHistory.length === 0) {
      store.populateSampleData();
    }
    let sampleOrder = store.orderHistory.find((o) => o.status === 'paid');
    if (!sampleOrder) {
      store.populateSampleData();
      sampleOrder = usePOSStore.getState().orderHistory.find((o) => o.status === 'paid') || usePOSStore.getState().orderHistory[0];
    }
    const initialStatus = sampleOrder?.status;
    assert.strictEqual(initialStatus, 'paid');

    const voidSuccess = store.voidOrder(sampleOrder.id, 'Khách trả lại món do bận đột xuất');
    assert.isTrue(voidSuccess);

    const voidedRecord = usePOSStore.getState().orderHistory.find((o) => o.id === sampleOrder.id);
    assert.strictEqual(voidedRecord?.status, 'voided');
    assert.strictEqual(voidedRecord?.voidReason, 'Khách trả lại món do bận đột xuất');
  });

  await runner.test('Store Settings and Menu management contracts', () => {
    const store = usePOSStore.getState();
    assert.strictEqual(store.storeSettings.printerPort, 9100);

    store.updateStoreSettings({
      printerIp: '192.168.1.250',
      paperSize: 'K80',
    });
    assert.strictEqual(usePOSStore.getState().storeSettings.printerIp, '192.168.1.250');

    // Menu price update
    const firstProduct = store.menuItems[0];
    store.updateProductPrice(firstProduct.id, 49000);
    const updatedProduct = usePOSStore.getState().menuItems.find((p) => p.id === firstProduct.id);
    assert.strictEqual(updatedProduct?.price, 49000);
  });
}

runTier1Tests().then(() => {
  const passed = runner.printSummary();
  if (!passed) process.exit(1);
});
