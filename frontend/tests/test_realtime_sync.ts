import './setup_env';
import { wsClient } from '../lib/api/wsClient';
import { usePOSStore } from '../lib/store/usePOSStore';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log(`  ✅ [PASS] ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${msg}`);
  }
}

console.log('================================================================================');
console.log('🚀 KIỂM CHỨNG ĐỒNG BỘ REALTIME 2 CHIỀU FULL-STACK (POS ↔ KDS ↔ CFD)');
console.log('================================================================================\n');

// 1. Kiểm chứng phương thức broadcast của wsClient
assert(typeof wsClient.broadcastCFDCartSync === 'function', 'wsClient có hàm broadcastCFDCartSync');
assert(typeof wsClient.broadcastOrderCreated === 'function', 'wsClient có hàm broadcastOrderCreated');
assert(typeof wsClient.broadcastKDSItemStatus === 'function', 'wsClient có hàm broadcastKDSItemStatus');
assert(typeof wsClient.broadcastOrderPaid === 'function', 'wsClient có hàm broadcastOrderPaid');
assert(typeof wsClient.broadcastTableCart === 'function', 'wsClient có hàm broadcastTableCart');

// 2. Kiểm chứng luồng xử lý sự kiện incoming từ WebSocket Hub
const sampleKdsOrder = {
  id: 'test_order_123',
  orderCode: 'OD-TEST-01',
  tableId: 't1',
  tableName: 'Bàn 01',
  createdAt: new Date().toISOString(),
  orderTime: '15:30',
  elapsedMinutes: 0,
  status: 'pending' as const,
  items: [
    {
      id: 'item_test_1',
      cartItemId: 'c_test_1',
      name: 'Trà Sữa Oolong',
      qty: 2,
      selectedToppings: [],
      station: 'bar' as const,
      status: 'pending' as const,
    },
  ],
};

usePOSStore.setState({
  kdsOrders: [sampleKdsOrder],
  tableCarts: {
    t1: [
      {
        cartItemId: 'c_test_1',
        item: { id: 'm1', name: 'Trà Sữa Oolong', price: 35000, category: 'Trà' } as any,
        qty: 2,
        unitPrice: 35000,
        sentToKitchen: true,
        status: 'pending' as const,
        selectedToppings: [],
        note: '',
      },
    ],
  },
});

// Kích hoạt xử lý kds_item_updated -> 'done'
(wsClient as any).handleIncomingEvent({
  type: 'kds_item_updated',
  order_id: 'test_order_123',
  item_id: 'item_test_1',
  status: 'da_xong',
});

const updatedKds = usePOSStore.getState().kdsOrders.find((o) => o.id === 'test_order_123');
assert(updatedKds?.items[0].status === 'done', 'KDS Item chuyển sang done khi nhận kds_item_updated');
assert(updatedKds?.status === 'ready', 'Toàn bộ đơn KDS chuyển sang ready khi tất cả món xong');

// Giả lập nhận event table_cart_updated từ thiết bị khác
(wsClient as any).handleIncomingEvent({
  type: 'table_cart_updated',
  table_id: 't1',
  cart: [
    {
      cartItemId: 'item_synced_1',
      item: { id: 'prod_1', name: 'Trà Sữa Oolong' },
      qty: 2,
      unitPrice: 35000,
    },
  ],
  guest_count: 4,
});

const syncedStore = usePOSStore.getState();
assert(syncedStore.tableCarts['t1']?.length === 1, 'Giỏ hàng Bàn t1 tự động đồng bộ 1 món từ thiết bị khác');
assert(syncedStore.tableCarts['t1'][0].qty === 2, 'Số lượng món giỏ hàng đồng bộ chính xác = 2');
const tableT1 = syncedStore.tables.find((t) => t.id === 't1');
assert(tableT1?.status === 'co_khach', 'Trạng thái Bàn t1 chuyển thành co_khach khi nhận giỏ hàng');
assert(tableT1?.totalAmount === 70000, 'Tổng tiền Bàn t1 tự động tính chuẩn = 70.000đ');

// Giả lập nhận event order_paid từ máy thu ngân khác kèm theo hóa đơn
const mockInvoice: any = {
  id: 'inv_realtime_999',
  orderCode: 'HD-999',
  subtotal: 70000,
  finalTotal: 70000,
  paymentMethod: 'tien_mat',
};

(wsClient as any).handleIncomingEvent({
  type: 'order_paid',
  order_id: 'test_order_123',
  table_id: 't1',
  invoice: mockInvoice,
});

const afterPaidStore = usePOSStore.getState();
assert(!afterPaidStore.tableCarts['t1'], 'Giỏ hàng Bàn t1 tự động dọn sạch sau khi nhận order_paid');
assert(afterPaidStore.tables.find((t) => t.id === 't1')?.status === 'trong', 'Bàn t1 chuyển thành trong sau khi nhận order_paid');
assert(afterPaidStore.orderHistory.some((h) => h.id === 'inv_realtime_999'), 'Hóa đơn inv_realtime_999 tự động cập nhật vào Sổ Đơn');

// 3. Kiểm chứng các thuật toán tối ưu cốt lõi
import { isSameModifierConfig, getModifierConfigSignature } from '../lib/utils/cartAlgorithms';
import { buildSearchIndex, searchWithPreIndex } from '../lib/utils/vietnameseSearch';
import { allocateProportionalAmounts } from '../lib/utils/eInvoice';

console.log('\n--------------------------------------------------------------------------------');
console.log('⚡ KIỂM CHỨNG CÁC THUẬT TOÁN TỐI ƯU CỐT LÕI (BIG-O & ZERO-REGEX)');
console.log('--------------------------------------------------------------------------------');

// Test Fast Modifier Signature
const sigA = getModifierConfigSignature('item_1', 35000, 'L', '70%', '50%', ['Trân Châu Đen', 'Thạch'], 'Ít ngọt');
const sigB = getModifierConfigSignature('item_1', 35000, 'L', '70%', '50%', ['Thạch', 'Trân Châu Đen'], 'Ít ngọt');
assert(sigA === sigB, 'Fast Signature Canonical Sorting khớp 100% không phụ thuộc thứ tự chọn');

const mockCartItem: any = {
  cartItemId: 'c1',
  item: { id: 'item_1', name: 'Trà Sữa' },
  qty: 1,
  unitPrice: 35000,
  selectedSize: 'L',
  sugarLevel: '70%',
  iceLevel: '50%',
  selectedToppings: ['Trân Châu Đen', 'Thạch'],
  note: 'Ít ngọt',
  configSignature: sigA,
};

const match = isSameModifierConfig(mockCartItem, {
  item: { id: 'item_1' } as any,
  qty: 1,
  unitPrice: 35000,
  selectedSize: 'L',
  sugarLevel: '70%',
  iceLevel: '50%',
  selectedToppings: ['Thạch', 'Trân Châu Đen'],
  note: 'Ít ngọt',
  configSignature: sigB,
} as any);
assert(match === true, 'isSameModifierConfig O(1) nhận diện trùng món thành công');

// Test Pre-indexed Search
const sampleMenu = [
  { id: '1', name: 'Trà Đào Cam Sả', code: 'TDCS' },
  { id: '2', name: 'Cà Phê Sữa Đá', code: 'CFSD' },
  { id: '3', name: 'Bạc Xỉu 3 Tầng', code: 'BX' },
];
const searchIdx = buildSearchIndex(sampleMenu, (i: any) => i.name, (i: any) => i.code);
const search1 = searchWithPreIndex(searchIdx, 'tdcs');
assert(search1.length === 1 && search1[0].id === '1', 'Pre-indexed search tìm khớp chính xác acronym "tdcs"');

const search2 = searchWithPreIndex(searchIdx, 'sua');
assert(search2.length === 1 && search2[0].id === '2', 'Pre-indexed search tìm khớp không dấu "sua"');

// Test Largest Remainder Method
const allocated = allocateProportionalAmounts(100, [33.33, 33.33, 33.34]);
const sumAllocated = allocated.reduce((s: number, v: number) => s + v, 0);
assert(sumAllocated === 100, 'Thuật toán Hare-Niemeyer phân bổ chính xác 100 đồng không lệch 1 đồng lẻ');

console.log(`\nKết quả: ${passed} PASS, ${failed} FAIL`);
if (failed > 0) process.exit(1);
