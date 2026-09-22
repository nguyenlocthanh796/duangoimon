/**
 * 👑 OngChu Lean POS - Tier 5: Milestone M4 Integration Test Suite
 * Tests Auth/Roles & PIN Gating, Offline Order Sync Queue & Persistence,
 * Inventory BOM & Recipe Deduction, Dynamic VietQR EMVCo Spec, and
 * Bidirectional KDS <-> Table Cart Sync.
 */

import { runner, assert } from './harness';
import { useAuthStore } from '../lib/store/useAuthStore';
import { useOfflineSyncStore, generateUUID } from '../lib/store/useOfflineSyncStore';
import { useInventoryBOMStore } from '../lib/store/useInventoryBOMStore';
import { formatTLV, calculateCRC16, generateVietQREMVCo } from '../lib/components/pos/VietQROffline';
import { generateQRMatrix } from '../lib/utils/qrCodeGenerator';
import { usePOSStore } from '../lib/store/usePOSStore';
import { apiClient } from '../lib/api/apiClient';
import { wsClient } from '../lib/api/wsClient';
import { mockMenuItems, mockTables } from './mock_data';

export async function runTier5Tests() {
  // ============================================================================
  // 1. AUTH STORE, ROLES & PIN GATING
  // ============================================================================
  runner.setContext('Tier 5', 'Auth & Security Role Hierarchy');

  await runner.test('Auth: Default role is owner with standard profile', () => {
    const auth = useAuthStore.getState();
    assert.strictEqual(auth.currentRole, 'owner');
    assert.isTrue(auth.isOwner());
    assert.isFalse(auth.isServer());
    assert.strictEqual(auth.currentUser.role, 'owner');
  });

  await runner.test('Auth: Role switching updates permissions and user profile', () => {
    const auth = useAuthStore.getState();

    // Switch to Server
    auth.setRole('server');
    assert.strictEqual(useAuthStore.getState().currentRole, 'server');
    assert.isTrue(useAuthStore.getState().isServer());
    assert.strictEqual(useAuthStore.getState().currentUser.role, 'server');

    // Switch to Owner
    auth.setRole('owner');
    assert.strictEqual(useAuthStore.getState().currentRole, 'owner');
    assert.isTrue(useAuthStore.getState().isOwner());
    assert.strictEqual(useAuthStore.getState().currentUser.role, 'owner');

    // Reset back to Cashier
    auth.setRole('cashier');
    assert.strictEqual(useAuthStore.getState().currentRole, 'cashier');
  });

  await runner.test('Auth: Manager PIN verification with configured pins (8888, 9999)', async () => {
    const auth = useAuthStore.getState();

    // Default pin is empty, unconfigured PINs fail
    const resUnset = await auth.verifyManagerPin('8888');
    assert.isFalse(resUnset.success, 'Unconfigured PIN 8888 must fail');

    // Once configured by owner, verification succeeds
    auth.setManagerPin('8888');
    const res8888 = await auth.verifyManagerPin('8888');
    assert.isTrue(res8888.success, 'Configured master PIN 8888 must succeed');

    auth.setOwnerPin('9999');
    const res9999 = await auth.verifyManagerPin('9999');
    assert.isTrue(res9999.success, 'Configured owner PIN 9999 must succeed');

    const resFail = await auth.verifyManagerPin('1234');
    assert.isFalse(resFail.success, 'Incorrect PIN 1234 must fail');
  });

  await runner.test('Auth: Custom Manager PIN update and verification', async () => {
    const auth = useAuthStore.getState();
    auth.setManagerPin('5678');
    assert.strictEqual(useAuthStore.getState().managerPin, '5678');

    const resCustom = await auth.verifyManagerPin('5678');
    assert.isTrue(resCustom.success, 'Custom PIN 5678 must succeed');

    // Reset back to default
    auth.setManagerPin('8888');
  });

  await runner.test('Auth: Permission escalation matrix via requiresManagerApproval', () => {
    const auth = useAuthStore.getState();

    // Cashier requires approval for high-risk actions
    auth.setRole('cashier');
    assert.isTrue(auth.requiresManagerApproval('void_item'));
    assert.isTrue(auth.requiresManagerApproval('void_order'));
    assert.isTrue(auth.requiresManagerApproval('excessive_discount'));
    assert.isTrue(auth.requiresManagerApproval('reprint_bill'));

    // Server requires approval for high-risk actions
    auth.setRole('server');
    assert.isTrue(auth.requiresManagerApproval('void_item'));
    assert.isTrue(auth.requiresManagerApproval('void_order'));
    assert.isTrue(auth.requiresManagerApproval('excessive_discount'));
    assert.isTrue(auth.requiresManagerApproval('reprint_bill'));

    // Owner NEVER requires approval (full bypass)
    auth.setRole('owner');
    assert.isFalse(auth.requiresManagerApproval('void_item'));
    assert.isFalse(auth.requiresManagerApproval('void_order'));
    assert.isFalse(auth.requiresManagerApproval('excessive_discount'));
    assert.isFalse(auth.requiresManagerApproval('reprint_bill'));

    // Reset back to cashier
    auth.setRole('cashier');
  });

  // ============================================================================
  // 2. OFFLINE SYNC STORE & ORDER QUEUE
  // ============================================================================
  runner.setContext('Tier 5', 'Offline Order Sync Queue');

  await runner.test('Offline: RFC4122 v4 UUID format validation', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();

    assert.strictEqual(uuid1.length, 36, 'UUID length must be 36 characters');
    assert.strictEqual(uuid1.charAt(14), '4', 'UUID version must be 4');
    assert.isTrue(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid1),
      'UUID must follow RFC4122 format'
    );
    assert.isFalse(uuid1 === uuid2, 'Consecutive UUIDs must be distinct');
  });

  await runner.test('Offline: Enqueue order preserves order details and initializes queue metadata', () => {
    const syncStore = useOfflineSyncStore.getState();
    syncStore.clearQueue();

    const queued = syncStore.enqueueOrder({
      orderCode: 'HD-OFF-001',
      tableId: 't1',
      tableName: 'Bàn 01',
      totalAmount: 95000,
      paidAmount: 100000,
      changeAmount: 5000,
      paymentMethod: 'tien_mat',
      items: [
        {
          productId: 'p1',
          productName: 'Trà Đào Cam Sả',
          quantity: 2,
          unitPrice: 35000,
          selectedSize: 'L',
        },
        {
          productId: 'p2',
          productName: 'Cà Phê Muối',
          quantity: 1,
          unitPrice: 25000,
        },
      ],
    });

    assert.isDefined(queued.clientOrderId, 'Queued order must receive a clientOrderId');
    assert.strictEqual(queued.retryCount, 0, 'Initial retryCount must be 0');
    assert.strictEqual(queued.items.length, 2);
    assert.strictEqual(useOfflineSyncStore.getState().queue.length, 1);
  });

  await runner.test('Offline: Multiple orders queued preserve FIFO order', () => {
    const syncStore = useOfflineSyncStore.getState();
    syncStore.clearQueue();

    const o1 = syncStore.enqueueOrder({
      orderCode: 'HD-001',
      tableId: 't1',
      tableName: 'Bàn 01',
      totalAmount: 50000,
      paidAmount: 50000,
      changeAmount: 0,
      paymentMethod: 'tien_mat',
      items: [],
    });

    const o2 = syncStore.enqueueOrder({
      orderCode: 'HD-002',
      tableId: 't2',
      tableName: 'Bàn 02',
      totalAmount: 70000,
      paidAmount: 70000,
      changeAmount: 0,
      paymentMethod: 'vietqr',
      items: [],
    });

    const queue = useOfflineSyncStore.getState().queue;
    assert.strictEqual(queue.length, 2);
    assert.strictEqual(queue[0].clientOrderId, o1.clientOrderId);
    assert.strictEqual(queue[1].clientOrderId, o2.clientOrderId);
  });

  await runner.test('Offline: removeOrder by clientOrderId', () => {
    const syncStore = useOfflineSyncStore.getState();
    syncStore.clearQueue();

    const o1 = syncStore.enqueueOrder({
      orderCode: 'HD-001',
      tableId: 't1',
      tableName: 'Bàn 01',
      totalAmount: 50000,
      paidAmount: 50000,
      changeAmount: 0,
      paymentMethod: 'tien_mat',
      items: [],
    });

    assert.strictEqual(useOfflineSyncStore.getState().queue.length, 1);
    syncStore.removeOrder(o1.clientOrderId);
    assert.strictEqual(useOfflineSyncStore.getState().queue.length, 0);
  });

  await runner.test('Offline: Network failure simulation increments retryCount and sets error status', async () => {
    const syncStore = useOfflineSyncStore.getState();
    syncStore.clearQueue();

    syncStore.enqueueOrder({
      orderCode: 'HD-FAIL-01',
      tableId: 't3',
      tableName: 'Bàn 03',
      totalAmount: 45000,
      paidAmount: 50000,
      changeAmount: 5000,
      paymentMethod: 'tien_mat',
      items: [],
    });

    const originalFetch = global.fetch;
    try {
      // Mock fetch failure (offline / ECONNREFUSED)
      global.fetch = async () => {
        throw new Error('Connection refused (Server offline)');
      };

      const result = await syncStore.syncOrders();
      assert.strictEqual(result.synced_count, 0);
      assert.isDefined(result.error);

      const state = useOfflineSyncStore.getState();
      assert.strictEqual(state.syncStatus, 'error');
      assert.isFalse(state.isOnline);
      assert.strictEqual(state.queue[0].retryCount, 1);
      assert.includes(state.queue[0].lastError, 'Connection refused');
    } finally {
      global.fetch = originalFetch;
    }
  });

  await runner.test('Offline: Successful sync removes orders from queue and increments totalSyncedCount', async () => {
    const syncStore = useOfflineSyncStore.getState();
    syncStore.clearQueue();

    const o1 = syncStore.enqueueOrder({
      orderCode: 'HD-SYNC-01',
      tableId: 't1',
      tableName: 'Bàn 01',
      totalAmount: 60000,
      paidAmount: 60000,
      changeAmount: 0,
      paymentMethod: 'tien_mat',
      items: [],
    });

    const originalFetch = global.fetch;
    try {
      // Mock successful backend response matching Go POST /api/v1/sync/orders contract
      global.fetch = (async (url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) || '{}');
        assert.strictEqual(body.orders.length, 1);
        assert.strictEqual(body.orders[0].client_order_id, o1.clientOrderId);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            synced_count: 1,
            duplicate_count: 0,
            results: [{ client_order_id: o1.clientOrderId, status: 'synced' }],
          }),
        } as any;
      }) as any;

      const result = await syncStore.syncOrders();
      assert.strictEqual(result.synced_count, 1);

      const state = useOfflineSyncStore.getState();
      assert.strictEqual(state.syncStatus, 'synced');
      assert.strictEqual(state.queue.length, 0, 'Synced order must be removed from queue');
      assert.greaterThanOrEqual(state.totalSyncedCount, 1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  // ============================================================================
  // 3. INVENTORY BOM & RECIPE STORE
  // ============================================================================
  runner.setContext('Tier 5', 'Inventory BOM & Recipe Deduction');

  await runner.test('Inventory: Initial ingredients and stock levels are properly configured', () => {
    const bom = useInventoryBOMStore.getState();
    assert.greaterThan(bom.ingredients.length, 5);

    const traDen = bom.ingredients.find((i) => i.id === 'ing_tra_den');
    assert.isDefined(traDen);
    assert.strictEqual(traDen.unit, 'g');
    assert.greaterThan(traDen.currentStock, traDen.minStock);

    const syrupDao = bom.ingredients.find((i) => i.id === 'ing_syrup_dao');
    assert.isDefined(syrupDao);
    // Initial syrup is 420 <= minStock 500
    assert.lessThanOrEqual(syrupDao.currentStock, syrupDao.minStock);
  });

  await runner.test('Inventory: Low stock detection returns items below or equal to threshold', () => {
    const bom = useInventoryBOMStore.getState();
    const lowStock = bom.getLowStockIngredients();
    assert.greaterThanOrEqual(lowStock.length, 1);

    for (const item of lowStock) {
      assert.lessThanOrEqual(item.currentStock, item.minStock);
    }
  });

  await runner.test('Inventory: deductForOrder calculates exact recipe quantities', () => {
    const bom = useInventoryBOMStore.getState();
    const traDenBefore = bom.ingredients.find((i) => i.id === 'ing_tra_den')!.currentStock;
    const syrupDaoBefore = bom.ingredients.find((i) => i.id === 'ing_syrup_dao')!.currentStock;

    // p1 recipe: 15g tra_den, 35ml syrup_dao. Order 2x p1:
    const result = bom.deductForOrder([{ productId: 'p1', quantity: 2 }]);

    assert.strictEqual(result.deductedCount, 15 * 2 + 35 * 2); // 100

    const traDenAfter = useInventoryBOMStore.getState().ingredients.find((i) => i.id === 'ing_tra_den')!.currentStock;
    const syrupDaoAfter = useInventoryBOMStore.getState().ingredients.find((i) => i.id === 'ing_syrup_dao')!.currentStock;

    assert.strictEqual(traDenAfter, traDenBefore - 30);
    assert.strictEqual(syrupDaoAfter, syrupDaoBefore - 70);
  });

  await runner.test('Inventory: restockIngredient and updateStock update ingredient levels', () => {
    const bom = useInventoryBOMStore.getState();

    // Restock 1000g of tra_den
    const stockBefore = bom.ingredients.find((i) => i.id === 'ing_tra_den')!.currentStock;
    bom.restockIngredient('ing_tra_den', 1000);
    const stockAfter = useInventoryBOMStore.getState().ingredients.find((i) => i.id === 'ing_tra_den')!.currentStock;
    assert.strictEqual(stockAfter, stockBefore + 1000);

    // Explicit updateStock
    bom.updateStock('ing_tra_den', 2500);
    assert.strictEqual(
      useInventoryBOMStore.getState().ingredients.find((i) => i.id === 'ing_tra_den')!.currentStock,
      2500
    );
  });

  await runner.test('Inventory: isProductLowStock flags products with depleted recipe ingredients', () => {
    const bom = useInventoryBOMStore.getState();

    // p1 uses syrup_dao which is at or below minStock
    const isP1Low = bom.isProductLowStock('p1');
    assert.isTrue(isP1Low, 'Product p1 should be flagged low stock due to syrup_dao');

    // Unknown product returns false
    assert.isFalse(bom.isProductLowStock('non_existent_product'));
  });

  // ============================================================================
  // 4. DYNAMIC VIETQR & EMVCO GENERATION
  // ============================================================================
  runner.setContext('Tier 5', 'Dynamic VietQR EMVCo Payload');

  await runner.test('VietQR: formatTLV builds length-prefixed Tag-Length-Value strings', () => {
    assert.strictEqual(formatTLV('00', '01'), '000201');
    assert.strictEqual(formatTLV('53', '704'), '5303704');
    assert.strictEqual(formatTLV('58', 'VN'), '5802VN');
  });

  await runner.test('VietQR: calculateCRC16 produces valid 4-character uppercase hex checksum', () => {
    // Standard CCITT 0x1021 check with a test string
    const crc = calculateCRC16('0002010102126304');
    assert.strictEqual(crc.length, 4);
    assert.isTrue(/^[0-9A-F]{4}$/.test(crc), 'CRC must be 4 uppercase hex digits');
  });

  await runner.test('VietQR: generateVietQREMVCo builds full spec-compliant EMVCo string', () => {
    const bankBin = '970422'; // MBBank BIN
    const accountNo = '0988776655';
    const amount = 145000;
    const orderCode = 'HD-0012';

    const payload = generateVietQREMVCo(bankBin, accountNo, amount, orderCode);

    // 1. Must start with Tag 00 Payload Format Indicator
    assert.isTrue(payload.startsWith('000201'), 'Must start with 000201');

    // 2. Must contain Tag 01 Dynamic QR indicator (12)
    assert.includes(payload, '010212');

    // 3. Must contain Napas GUID in Tag 38
    assert.includes(payload, 'A000000727');

    // 4. Must contain Bank Bin and Account Number
    assert.includes(payload, bankBin);
    assert.includes(payload, accountNo);

    // 5. Must contain Currency VND Tag 53
    assert.includes(payload, '5303704');

    // 6. Must contain Amount Tag 54
    assert.includes(payload, '5406145000');

    // 7. Must contain Country Code Tag 58
    assert.includes(payload, '5802VN');

    // 8. Must contain Tag 62 with order note
    assert.includes(payload, 'TT HD-0012');

    // 9. Must end with Tag 63 followed by 4-digit CRC
    assert.includes(payload, '6304');
    const crcPart = payload.slice(-4);
    assert.isTrue(/^[0-9A-F]{4}$/.test(crcPart));
  });

  await runner.test('VietQR: QR Matrix generator creates non-empty 2D boolean grid', () => {
    const payload = generateVietQREMVCo('970422', '0988776655', 50000, 'HD-01');
    const matrix = generateQRMatrix(payload);

    assert.greaterThan(matrix.length, 20, 'QR matrix should have dimension >= 21');
    assert.strictEqual(matrix.length, matrix[0].length, 'QR matrix must be square');

    // Verify finder patterns exist in corners
    assert.isTrue(matrix[0][0], 'Top-left corner must be black');
    assert.isTrue(matrix[0][matrix.length - 1], 'Top-right corner must be black');
    assert.isTrue(matrix[matrix.length - 1][0], 'Bottom-left corner must be black');
  });

  // ============================================================================
  // 5. BIDIRECTIONAL KDS <-> TABLE CART STATUS SYNC
  // ============================================================================
  runner.setContext('Tier 5', 'Bidirectional KDS Sync');

  await runner.test('KDS: sendToKitchen updates cart item status to pending', () => {
    const store = usePOSStore.getState();

    // Select Table 1 and add an item
    const t1 = store.tables[0];
    store.selectTable(t1);
    store.clearCart();

    store.addToCart({
      item: mockMenuItems[0],
      qty: 2,
      unitPrice: mockMenuItems[0].price,
      selectedToppings: [],
      note: '',
    });

    const cartBefore = store.getCart();
    assert.strictEqual(cartBefore.length, 1);
    assert.isFalse(Boolean(cartBefore[0].sentToKitchen));

    // Send to kitchen
    const sendRes = store.sendToKitchen();
    assert.strictEqual(sendRes.newCount, 2);

    const cartAfter = usePOSStore.getState().getCart();
    assert.strictEqual(cartAfter.length, 1);
    assert.isTrue(Boolean(cartAfter[0].sentToKitchen));
    assert.strictEqual(cartAfter[0].status, 'pending');
  });

  await runner.test('KDS: updateKDSItemStatus updates both KDS item and POS cart item status', () => {
    const store = usePOSStore.getState();
    const kdsOrders = store.kdsOrders;
    assert.greaterThan(kdsOrders.length, 0);

    const firstKds = kdsOrders[0];
    const firstItem = firstKds.items[0];

    // Transition item to cooking
    store.updateKDSItemStatus(firstKds.id, firstItem.id, 'cooking');

    const updatedKds = usePOSStore.getState().kdsOrders.find((o) => o.id === firstKds.id);
    assert.isDefined(updatedKds);
    const updatedItem = updatedKds.items.find((i) => i.id === firstItem.id);
    assert.strictEqual(updatedItem?.status, 'cooking');

    // If item was mapped to a table cart, verify table cart item status is updated
    const tableCart = usePOSStore.getState().tableCarts[firstKds.tableId];
    if (tableCart) {
      const matchingCartItem = tableCart.find((ci) => ci.cartItemId === firstItem.cartItemId);
      if (matchingCartItem) {
        assert.strictEqual(matchingCartItem.status, 'cooking');
      }
    }
  });

  await runner.test('KDS: markAllKDSItemsDone sets KDS items to done and order to ready', () => {
    const store = usePOSStore.getState();
    const firstKds = store.kdsOrders[0];

    store.markAllKDSItemsDone(firstKds.id);

    const updated = usePOSStore.getState().kdsOrders.find((o) => o.id === firstKds.id);
    assert.isDefined(updated);
    assert.strictEqual(updated.status, 'ready');

    for (const item of updated.items) {
      assert.strictEqual(item.status, 'done');
    }
  });

  await runner.test('KDS: updateKDSOrderStatus to served cascades to cart items', () => {
    const store = usePOSStore.getState();
    const firstKds = store.kdsOrders[0];

    store.updateKDSOrderStatus(firstKds.id, 'served');

    const updated = usePOSStore.getState().kdsOrders.find((o) => o.id === firstKds.id);
    assert.isDefined(updated);
    assert.strictEqual(updated.status, 'served');

    const tableCart = usePOSStore.getState().tableCarts[firstKds.tableId];
    if (tableCart && tableCart.length > 0) {
      for (const ci of tableCart) {
        assert.strictEqual(ci.status, 'served');
      }
    }
  });

  // ============================================================================
  // 6. API & WEBSOCKET CLIENT BEHAVIOR
  // ============================================================================
  runner.setContext('Tier 5', 'API Client & WebSocket Dispatch');

  await runner.test('API Client: Offline detection with status 0 and isOffline flag', async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async () => {
        throw new Error('Failed to fetch');
      };

      const res = await apiClient.get('/api/v1/health');
      assert.isFalse(res.success);
      assert.strictEqual(res.status, 0);
      assert.isTrue(Boolean(res.isOffline));
    } finally {
      global.fetch = originalFetch;
    }
  });

  await runner.test('WebSocket Client: Subscription and event listener registration', () => {
    let receivedEvent: any = null;
    const unsubscribe = wsClient.subscribe((event) => {
      receivedEvent = event;
    });

    assert.strictEqual(typeof unsubscribe, 'function');

    // Unsubscribe cleanly
    unsubscribe();
  });

  await runner.test('WebSocket Client: Dispatch kds_item_updated to POS store', () => {
    const store = usePOSStore.getState();
    if (store.kdsOrders.length > 0) {
      const order = store.kdsOrders[0];
      const item = order.items[0];

      // Simulate incoming WS message handling via handleIncomingEvent
      (wsClient as any).handleIncomingEvent({
        type: 'kds_item_updated',
        order_id: order.id,
        item_id: item.id,
        status: 'da_xong',
      });

      const updatedKds = usePOSStore.getState().kdsOrders.find((o) => o.id === order.id);
      const updatedItem = updatedKds?.items.find((i) => i.id === item.id);
      assert.strictEqual(updatedItem?.status, 'done');
    }
  });

  await runner.test('WebSocket Client: Dispatch product_86_toggled toggles stock state', () => {
    const store = usePOSStore.getState();
    const testProductId = 'p1';
    const isOutOfStockBefore = store.outOfStockProductIds.includes(testProductId);

    (wsClient as any).handleIncomingEvent({
      type: 'product_86_toggled',
      product_id: testProductId,
    });

    const isOutOfStockAfter = usePOSStore.getState().outOfStockProductIds.includes(testProductId);
    assert.strictEqual(isOutOfStockAfter, !isOutOfStockBefore);

    // Revert back
    (wsClient as any).handleIncomingEvent({
      type: 'product_86_toggled',
      product_id: testProductId,
    });
    assert.strictEqual(usePOSStore.getState().outOfStockProductIds.includes(testProductId), isOutOfStockBefore);
  });
}
