/**
 * 👑 OngChu Lean POS - Automated Test Suite
 * Park/Hold Orders (Hóa Đơn Chờ) & Cup Label Sticker (TSPL) Printing Flow
 */

import { runner, assert } from './harness';
import { usePOSStore } from '../lib/store/usePOSStore';
import { mockMenuItems, mockTables, createSampleModifierData } from './mock_data';
import {
  generateCupStickers,
  sanitizeVietnameseForLabel,
  buildTSPLScript,
} from '../lib/utils/labelPrinter';
import * as fs from 'fs';
import * as path from 'path';

export async function runHoldOrderAndCupStickerFlowTests() {
  runner.setContext('Hold Orders & Cup Stickers', 'Parked Orders Lifecycle & TSPL Cup Label Generator');

  const resetStore = () => {
    usePOSStore.setState({
      tables: mockTables.map((t) => ({ ...t, status: 'trong', totalAmount: 0, itemCount: 0 })),
      selectedTable: mockTables[0],
      tableCarts: {},
      tableDiscounts: {},
      orderHistory: [],
      parkedOrders: [],
    });
  };

  await runner.test('1. Park Current Order transfers cart to parkedOrders and resets table', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Table 1 (t1) selected
    const item1 = mockMenuItems[0]; // 35,000 đ
    store.addToCart(createSampleModifierData(item1, { qty: 2 }));
    store.applyDiscount('fixed', 10000, 'Khách quen');

    const cartBefore = store.getCart();
    assert.strictEqual(cartBefore.length, 1, 'Cart should have 1 item');
    assert.strictEqual(cartBefore[0].qty, 2, 'Quantity should be 2');

    // Park the order
    const { parkedOrder: parked } = store.parkCurrentOrder('Khách chờ chuyển khoản', 'Anh Tuấn', '0901234567');
    assert.isTrue(Boolean(parked), 'Parked order should be returned');
    assert.strictEqual(parked?.code, 'CHỜ-01', 'First parked code should be CHỜ-01');
    assert.strictEqual(parked?.itemCount, 2, 'Item count should be 2');
    assert.strictEqual(parked?.totalAmount, 60000, 'Total should be (35k * 2) - 10k = 60k');
    assert.strictEqual(parked?.customerName, 'Anh Tuấn', 'Customer name should match');
    assert.strictEqual(parked?.customerPhone, '0901234567', 'Customer phone should match');

    // Verify store state
    const currentParked = usePOSStore.getState().parkedOrders;
    assert.strictEqual(currentParked.length, 1, 'Parked orders count should be 1');

    // Verify current table cart is empty and table status is "trong"
    const cartAfter = usePOSStore.getState().getCart();
    assert.strictEqual(cartAfter.length, 0, 'Current table cart should be empty');
    const tableState = usePOSStore.getState().tables.find((t) => t.id === 't1');
    assert.strictEqual(tableState?.status, 'trong', 'Table status should be reset to trong');
    assert.strictEqual(tableState?.totalAmount, 0, 'Table total should be 0');
  });

  await runner.test('2. Sequential parking increments codes (CHỜ-01, CHỜ-02, CHỜ-03)', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Park order 1
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 1 }));
    const { parkedOrder: p1 } = store.parkCurrentOrder();
    assert.strictEqual(p1?.code, 'CHỜ-01', 'Order 1 code must be CHỜ-01');

    // Park order 2
    store.addToCart(createSampleModifierData(mockMenuItems[1], { qty: 3 }));
    const { parkedOrder: p2 } = store.parkCurrentOrder();
    assert.strictEqual(p2?.code, 'CHỜ-02', 'Order 2 code must be CHỜ-02');

    // Park order 3
    store.addToCart(createSampleModifierData(mockMenuItems[2], { qty: 1 }));
    const { parkedOrder: p3 } = store.parkCurrentOrder();
    assert.strictEqual(p3?.code, 'CHỜ-03', 'Order 3 code must be CHỜ-03');

    const parked = usePOSStore.getState().parkedOrders;
    assert.strictEqual(parked.length, 3, 'There should be 3 parked orders');
  });

  await runner.test('3. Restore parked order rehydrates cart and marks table as occupied', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Park an order on t1
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 2 }));
    store.applyDiscount('percent', 10, 'Ưu đãi');
    const { parkedOrder } = store.parkCurrentOrder('Mang về');
    assert.isTrue(Boolean(parkedOrder), 'Order parked');

    // Select Table 2 (t2)
    store.selectTable(mockTables[1]);
    assert.strictEqual(store.getCart().length, 0, 'Table 2 cart initially empty');

    // Restore to Table 2
    const success = store.restoreParkedOrder(parkedOrder!.id, 't2');
    assert.isTrue(success, 'Restore should succeed');

    // Verify parkedOrders reduced
    const remainingParked = usePOSStore.getState().parkedOrders;
    assert.strictEqual(remainingParked.length, 0, 'Parked orders should now be empty');

    // Verify Table 2 cart & discount restored
    const t2Cart = usePOSStore.getState().tableCarts['t2'];
    assert.isTrue(Boolean(t2Cart), 'Table 2 should have cart');
    assert.strictEqual(t2Cart.length, 1, 'Table 2 should have 1 item');
    assert.strictEqual(t2Cart[0].qty, 2, 'Qty should be 2');

    const t2Discount = usePOSStore.getState().tableDiscounts['t2'];
    assert.strictEqual(t2Discount?.value, 10, 'Discount 10% restored');

    // Verify Table 2 status updated to co_khach
    const t2Table = usePOSStore.getState().tables.find((t) => t.id === 't2');
    assert.strictEqual(t2Table?.status, 'co_khach', 'Table status should be co_khach');
    assert.strictEqual(t2Table?.itemCount, 2, 'Item count should be 2');
  });

  await runner.test('4. Delete & Clear All Parked Orders', () => {
    resetStore();
    const store = usePOSStore.getState();

    // Create 2 parked orders
    store.addToCart(createSampleModifierData(mockMenuItems[0], { qty: 1 }));
    const { parkedOrder: p1 } = store.parkCurrentOrder();
    store.addToCart(createSampleModifierData(mockMenuItems[1], { qty: 1 }));
    const { parkedOrder: p2 } = store.parkCurrentOrder();

    assert.strictEqual(usePOSStore.getState().parkedOrders.length, 2, '2 parked orders');

    // Delete single
    store.deleteParkedOrder(p1!.id);
    const afterDelete = usePOSStore.getState().parkedOrders;
    assert.strictEqual(afterDelete.length, 1, '1 parked order left');
    assert.strictEqual(afterDelete[0].id, p2!.id, 'Remaining order should be p2');

    // Clear all
    store.clearAllParkedOrders();
    assert.strictEqual(usePOSStore.getState().parkedOrders.length, 0, 'All parked orders cleared');
  });

  await runner.test('5. Cup Label Generator expands multiple quantities into discrete cup stickers', () => {
    const items = [
      {
        id: 'cart-1',
        productId: 'p1',
        product: mockMenuItems[0],
        qty: 2,
        selectedSize: { name: 'L', priceDelta: 6000 },
        selectedSugar: { name: '50% Đường' },
        selectedIce: { name: '70% Đá' },
        selectedToppings: [{ id: 'top-1', name: 'Trân Châu Đen', price: 5000 }],
        unitPrice: 46000,
        amount: 92000,
      },
      {
        id: 'cart-2',
        productId: 'p2',
        product: mockMenuItems[1],
        qty: 1,
        selectedSize: { name: 'M', priceDelta: 0 },
        unitPrice: 30000,
        amount: 30000,
      },
    ];

    const stickers = generateCupStickers('HD-0099', 'Bàn 05', items as any, 'ONGCHU COFFEE', '15:30');
    assert.strictEqual(stickers.length, 3, 'Total cups should be 2 + 1 = 3 stickers');

    // Cup 1: 1/3
    assert.strictEqual(stickers[0].cupIndex, 1, 'Cup index should be 1');
    assert.strictEqual(stickers[0].totalCups, 3, 'Total cups should be 3');
    assert.strictEqual(stickers[0].orderCode, 'HD-0099', 'Order code should match');
    assert.strictEqual(stickers[0].tableName, 'Bàn 05', 'Table name should match');
    assert.strictEqual(stickers[0].selectedSize, 'L', 'Size should be L');
    assert.strictEqual(stickers[0].sugarLevel, '50% Đường', 'Sugar level should match');
    assert.strictEqual(stickers[0].iceLevel, '70% Đá', 'Ice level should match');
    assert.strictEqual(stickers[0].toppings[0], 'Trân Châu Đen', 'Topping should match');
    assert.strictEqual(stickers[0].unitPrice, 46000, 'Unit price should be 46k');

    // Cup 2: 2/3
    assert.strictEqual(stickers[1].cupIndex, 2, 'Cup index should be 2');
    assert.strictEqual(stickers[1].totalCups, 3, 'Total cups should be 3');

    // Cup 3: 3/3
    assert.strictEqual(stickers[2].cupIndex, 3, 'Cup index should be 3');
    assert.strictEqual(stickers[2].totalCups, 3, 'Total cups should be 3');
    assert.strictEqual(stickers[2].selectedSize, 'M', 'Size should be M');
    assert.strictEqual(stickers[2].unitPrice, 30000, 'Unit price should be 30k');
  });

  await runner.test('6. Vietnamese diacritics sanitization & TSPL script compilation', () => {
    const raw = 'Trà Sữa Trân Châu Đường Đen';
    const clean = sanitizeVietnameseForLabel(raw);
    assert.strictEqual(clean, 'Tra Sua Tran Chau Duong Den', 'All diacritics removed for thermal printing');

    const sampleStickers = [
      {
        stickerId: 'STK-1',
        orderCode: 'CHỜ-01',
        tableName: 'Bàn 01',
        itemName: 'Trà Đào Cam Sả',
        selectedSize: 'L',
        sugarLevel: '50% Đ',
        iceLevel: '100% Đá',
        toppings: ['Đào miếng'],
        note: 'Ít sả',
        unitPrice: 42000,
        cupIndex: 1,
        totalCups: 1,
        orderTime: '10:15',
        storeName: 'ONGCHU TEA',
      },
    ];

    const tspl50x30 = buildTSPLScript(sampleStickers, '50x30');
    assert.isTrue(tspl50x30.includes('SIZE 50 mm, 30 mm'), 'Must set 50x30 mm');
    assert.isTrue(tspl50x30.includes('GAP 2 mm, 0 mm'), 'Must specify label gap');
    assert.isTrue(tspl50x30.includes('PRINT 1,1'), 'Must include print command');
    assert.isTrue(tspl50x30.includes('Tra Dao Cam Sa (L)'), 'Sanitized item and size present');
    assert.isTrue(tspl50x30.includes('ONGCHU TEA [1/1]'), 'Store name and cup index present');

    const tspl40x30 = buildTSPLScript(sampleStickers, '40x30');
    assert.isTrue(tspl40x30.includes('SIZE 40 mm, 30 mm'), 'Must set 40x30 mm');
  });

  await runner.test('7. Store Settings Cup Printer Configuration Update', () => {
    resetStore();
    const store = usePOSStore.getState();

    store.updateStoreSettings({
      enableCupPrinter: true,
      cupPrinterIp: '192.168.1.250',
      cupPrinterPort: 9200,
      cupLabelSize: '40x30',
      autoPrintCupOnOrder: true,
    });

    const updated = usePOSStore.getState().storeSettings;
    assert.strictEqual(updated.enableCupPrinter, true, 'enableCupPrinter should be true');
    assert.strictEqual(updated.cupPrinterIp, '192.168.1.250', 'cupPrinterIp should match');
    assert.strictEqual(updated.cupPrinterPort, 9200, 'cupPrinterPort should match');
    assert.strictEqual(updated.cupLabelSize, '40x30', 'cupLabelSize should be 40x30');
    assert.strictEqual(updated.autoPrintCupOnOrder, true, 'autoPrintCupOnOrder should be true');
  });

  await runner.test('8. Microcopy & AppText Compliance on Park & Cup Sticker Components', () => {
    const files = [
      'lib/components/pos/ParkedOrdersModal.tsx',
      'lib/components/pos/CupStickerPreviewModal.tsx',
      'app/cai-dat/_components/BillReceiptTab.tsx',
    ];

    const frontendDir = path.resolve(__dirname, '..');
    for (const rel of files) {
      const fullPath = path.join(frontendDir, rel);
      const content = fs.readFileSync(fullPath, 'utf8');

      // No administrative "Vui lòng"
      assert.isFalse(
        content.toLowerCase().includes('vui lòng'),
        `File ${rel} must not contain "Vui lòng"`
      );

      // No raw <Text> import from react-native (must use AppText)
      const hasRawTextImport = /import\s*\{[^}]*\bText\b[^}]*\}\s*from\s*['"]react-native['"]/.test(content);
      assert.isFalse(
        hasRawTextImport,
        `File ${rel} must not import raw Text from react-native`
      );
    }
  });
}
