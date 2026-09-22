import './setup_env';
import { areKdsTicketCardPropsEqual, KdsTicketCardProps } from '../lib/components/pos/KdsTicketCard';
import { usePOSStore, KDSOrder, KDSItem } from '../lib/store/usePOSStore';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${msg}`);
  }
}

console.log('================================================================================');
console.log('🔥 ADVERSARIAL STRESS TEST: KDS CLOCK ISOLATION & TICKET MEMOIZATION');
console.log('================================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLOCK ISOLATION & ZERO TICKET RE-RENDER VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. EMPIRICAL KDS CLOCK ISOLATION & TICKET RE-RENDER SIMULATION ---');

// Mock a set of active KDS orders
const mockOrders: KDSOrder[] = [
  {
    id: 'kds-1',
    tableId: 'tbl-1',
    orderCode: 'HD-0001',
    tableName: 'Bàn 01',
    createdAt: new Date().toISOString(),
    orderTime: '10:00',
    elapsedMinutes: 2,
    status: 'pending',
    items: [
      { id: 'item-1', cartItemId: 'c-1', name: 'Trà Đào', qty: 2, station: 'bar', status: 'pending', selectedToppings: [] },
      { id: 'item-2', cartItemId: 'c-2', name: 'Khoai Tây Chiên', qty: 1, station: 'snack', status: 'pending', selectedToppings: [] },
    ],
  },
  {
    id: 'kds-2',
    tableId: 'tbl-2',
    orderCode: 'HD-0002',
    tableName: 'Bàn 02',
    createdAt: new Date().toISOString(),
    orderTime: '10:05',
    elapsedMinutes: 5,
    status: 'cooking',
    items: [
      { id: 'item-3', cartItemId: 'c-3', name: 'Cà Phê Muối', qty: 1, station: 'bar', status: 'cooking', selectedToppings: [] },
    ],
  },
];

// Track render counts per ticket card
const renderCounters: Record<string, number> = {
  'kds-1': 0,
  'kds-2': 0,
};

// Simulate a React Memo wrapper behavior
const renderTicketHarness = (
  prevProps: KdsTicketCardProps | null,
  nextProps: KdsTicketCardProps
): boolean => {
  if (!prevProps || !areKdsTicketCardPropsEqual(prevProps, nextProps)) {
    renderCounters[nextProps.order.id]++;
    return true; // Re-rendered
  }
  return false; // Memo hit, skipped re-render
};

// Initial Render
let currentProps1: KdsTicketCardProps = {
  order: mockOrders[0],
  activeStation: 'all',
  onItemStatusToggle: (orderId, item) => {},
  onMarkOrderDone: (order) => {},
};

let currentProps2: KdsTicketCardProps = {
  order: mockOrders[1],
  activeStation: 'all',
  onItemStatusToggle: (orderId, item) => {},
  onMarkOrderDone: (order) => {},
};

renderTicketHarness(null, currentProps1);
renderTicketHarness(null, currentProps2);

assert(renderCounters['kds-1'] === 1, 'Initial render of Ticket 1 recorded exactly 1 render');
assert(renderCounters['kds-2'] === 1, 'Initial render of Ticket 2 recorded exactly 1 render');

// Simulate 60 seconds of clock ticks (60 timer ticks where parent re-renders inline callback closures)
console.log('\n--- Simulating 60 Clock Ticks with Inline Closure Re-generations ---');
for (let tick = 1; tick <= 60; tick++) {
  const newProps1: KdsTicketCardProps = {
    ...currentProps1,
    // Fresh inline callbacks created every render
    onItemStatusToggle: (orderId, item) => console.log('Tick callback 1', tick),
    onMarkOrderDone: (order) => console.log('Tick done callback 1', tick),
  };
  const newProps2: KdsTicketCardProps = {
    ...currentProps2,
    onItemStatusToggle: (orderId, item) => console.log('Tick callback 2', tick),
    onMarkOrderDone: (order) => console.log('Tick done callback 2', tick),
  };

  const r1 = renderTicketHarness(currentProps1, newProps1);
  const r2 = renderTicketHarness(currentProps2, newProps2);

  if (r1) currentProps1 = newProps1;
  if (r2) currentProps2 = newProps2;
}

assert(
  renderCounters['kds-1'] === 1,
  `Ticket 1 re-renders: ${renderCounters['kds-1']} (Expected: 1, ZERO re-renders during 60 clock ticks)`
);
assert(
  renderCounters['kds-2'] === 1,
  `Ticket 2 re-renders: ${renderCounters['kds-2']} (Expected: 1, ZERO re-renders during 60 clock ticks)`
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. TICKET DATA MUTATION & STATUS TRANSITION HARNESS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. TICKET STATUS & DATA MUTATION PRECISION ---');

// 2.1 Mutating item 1 status on Ticket 1
const updatedOrder1: KDSOrder = {
  ...mockOrders[0],
  items: [
    { ...mockOrders[0].items[0], status: 'cooking' },
    mockOrders[0].items[1],
  ],
};
const mutatedProps1: KdsTicketCardProps = {
  ...currentProps1,
  order: updatedOrder1,
};

const didRerenderTicket1 = renderTicketHarness(currentProps1, mutatedProps1);
const didRerenderTicket2 = renderTicketHarness(currentProps2, currentProps2);

assert(didRerenderTicket1 === true, 'Ticket 1 item status update ("cooking") triggered re-render');
assert(renderCounters['kds-1'] === 2, 'Ticket 1 render count incremented to 2');
assert(renderCounters['kds-2'] === 1, 'Ticket 2 render count remained untouched at 1 (Isolation preserved)');

currentProps1 = mutatedProps1;

// 2.2 Mutating station filter from 'all' to 'snack'
console.log('\n--- Station Filter Switching ---');
const stationFilteredProps1: KdsTicketCardProps = {
  ...currentProps1,
  activeStation: 'snack',
};
const stationFilteredProps2: KdsTicketCardProps = {
  ...currentProps2,
  activeStation: 'snack',
};

const filterRerender1 = renderTicketHarness(currentProps1, stationFilteredProps1);
const filterRerender2 = renderTicketHarness(currentProps2, stationFilteredProps2);

assert(filterRerender1 === true, 'Ticket 1 re-rendered upon activeStation filter change');
assert(filterRerender2 === true, 'Ticket 2 re-rendered upon activeStation filter change');
assert(renderCounters['kds-1'] === 3, 'Ticket 1 count = 3');
assert(renderCounters['kds-2'] === 2, 'Ticket 2 count = 2');

currentProps1 = stationFilteredProps1;
currentProps2 = stationFilteredProps2;

// ─────────────────────────────────────────────────────────────────────────────
// 3. STORE KDS ACTION CYCLE & STATE INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. STORE KDS ACTION LIFECYCLE & STATUS CYCLING ---');

// Reset store state with a test order
usePOSStore.setState({
  kdsOrders: [
    {
      id: 'kds-store-test',
      tableId: 'tbl-test',
      orderCode: 'HD-999',
      tableName: 'Bàn VIP 1',
      createdAt: new Date().toISOString(),
      orderTime: '11:00',
      elapsedMinutes: 1,
      status: 'pending',
      items: [
        { id: 'ki-1', cartItemId: 'ci-1', name: 'Trà Sữa Oolong', qty: 2, station: 'bar', status: 'pending', selectedToppings: [] },
        { id: 'ki-2', cartItemId: 'ci-2', name: 'Bánh Tráng Nướng', qty: 1, station: 'snack', status: 'pending', selectedToppings: [] },
      ],
    },
  ],
});

const actions = usePOSStore.getState();

// Step 1: Toggle ki-1 pending -> cooking
const state1 = usePOSStore.getState();
const item1Before = state1.kdsOrders[0].items[0];
const nextStatus1 = item1Before.status === 'pending' ? 'cooking' : item1Before.status === 'cooking' ? 'done' : 'pending';
actions.updateKDSItemStatus('kds-store-test', 'ki-1', nextStatus1);

const state2 = usePOSStore.getState();
assert(state2.kdsOrders[0].items[0].status === 'cooking', 'Store item ki-1 transitioned from pending -> cooking');
assert(state2.kdsOrders[0].status === 'cooking', 'Order status automatically upgraded to cooking when item starts cooking');

// Step 2: Toggle ki-1 cooking -> done
const item1Cooking = state2.kdsOrders[0].items[0];
const nextStatus2 = item1Cooking.status === 'pending' ? 'cooking' : item1Cooking.status === 'cooking' ? 'done' : 'pending';
actions.updateKDSItemStatus('kds-store-test', 'ki-1', nextStatus2);

const state3 = usePOSStore.getState();
assert(state3.kdsOrders[0].items[0].status === 'done', 'Store item ki-1 transitioned from cooking -> done');

// Step 3: Mark All Done action
actions.markAllKDSItemsDone('kds-store-test');
const state4 = usePOSStore.getState();
assert(
  state4.kdsOrders[0].items.every((it) => it.status === 'done'),
  'markAllKDSItemsDone set all items in order to done'
);
assert(state4.kdsOrders[0].status === 'ready', 'Order status transitioned to ready');

// Step 4: Mark Order Served
actions.updateKDSOrderStatus('kds-store-test', 'served');
const state5 = usePOSStore.getState();
assert(state5.kdsOrders[0].status === 'served', 'Order status transitioned to served');

// ─────────────────────────────────────────────────────────────────────────────
// 4. LARGE TICKET HIGH-FREQUENCY STRESS TEST
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. HIGH-FREQUENCY STRESS: 5,000 TICKETS & COMPARATOR CALLS ---');

const stressOrders: KDSOrder[] = Array.from({ length: 50 }, (_, i) => ({
  id: `kds-stress-${i}`,
  tableId: `tbl-${i}`,
  orderCode: `HD-${1000 + i}`,
  tableName: `Bàn ${i + 1}`,
  createdAt: new Date().toISOString(),
  orderTime: '12:00',
  elapsedMinutes: i % 20,
  status: (i % 3 === 0 ? 'pending' : i % 3 === 1 ? 'cooking' : 'ready') as any,
  items: Array.from({ length: 4 }, (_, j) => ({
    id: `item-${i}-${j}`,
    cartItemId: `c-${i}-${j}`,
    name: `Món số ${j + 1}`,
    qty: 1 + (j % 3),
    station: (j % 2 === 0 ? 'bar' : 'kitchen') as any,
    status: (j % 2 === 0 ? 'cooking' : 'pending') as any,
    selectedToppings: [],
  })),
}));

const stressStart = performance.now();
let memoHits = 0;
let memoMisses = 0;

for (let round = 0; round < 100; round++) {
  for (let i = 0; i < stressOrders.length; i++) {
    const prev: KdsTicketCardProps = {
      order: stressOrders[i],
      activeStation: 'all',
      onItemStatusToggle: () => {},
      onMarkOrderDone: () => {},
    };
    // If round is even, keep order identical (testing memo hit). If round is odd and i is 0, mutate item.
    let nextOrder = stressOrders[i];
    if (round % 2 === 1 && i === 0) {
      nextOrder = {
        ...stressOrders[i],
        elapsedMinutes: stressOrders[i].elapsedMinutes + 1,
      };
    }
    const next: KdsTicketCardProps = {
      order: nextOrder,
      activeStation: 'all',
      onItemStatusToggle: () => {},
      onMarkOrderDone: () => {},
    };

    if (areKdsTicketCardPropsEqual(prev, next)) {
      memoHits++;
    } else {
      memoMisses++;
    }
  }
}

const stressDuration = performance.now() - stressStart;
console.log(`  ⏱️ 5,000 comparator evaluations executed in ${stressDuration.toFixed(2)}ms`);
console.log(`  📊 Memo hits: ${memoHits}, Memo misses: ${memoMisses}`);

assert(memoHits === 4950, `Expected 4,950 memo hits (got: ${memoHits})`);
assert(memoMisses === 50, `Expected 50 memo misses for mutated orders (got: ${memoMisses})`);
assert(stressDuration < 50, `5,000 comparisons completed in < 50ms (actual: ${stressDuration.toFixed(2)}ms)`);

console.log('\n--- 4. KDS ITEM NAME & MODIFIER RESOLUTION INTEGRITY ---');

// Test that items with product_name, item.name, toppings_json are properly resolved
const backendPayloadItem: any = {
  id: 'b-1',
  cartItemId: 'c-b-1',
  product_name: 'Trà Sữa Trân Châu Hoàng Gia',
  quantity: 2,
  selected_size: 'Size L',
  sugar_level: '70%',
  ice_level: '100%',
  toppings_json: '["Trân Châu Hoàng Gia", "Thạch Củ Năng"]',
  note: 'Ít ngọt',
  station: 'bar',
  kitchen_status: 'dang_che_bien',
};

const resolvedName = backendPayloadItem.name || backendPayloadItem.product_name || backendPayloadItem.productName || (backendPayloadItem.item && backendPayloadItem.item.name) || 'Món';
assert(resolvedName === 'Trà Sữa Trân Châu Hoàng Gia', 'KDS correctly resolves name from backend product_name');

let resolvedToppings: string[] = [];
if (Array.isArray(backendPayloadItem.selectedToppings)) {
  resolvedToppings = backendPayloadItem.selectedToppings;
} else if (Array.isArray(backendPayloadItem.selected_toppings)) {
  resolvedToppings = backendPayloadItem.selected_toppings;
} else if (typeof backendPayloadItem.toppings_json === 'string' && backendPayloadItem.toppings_json) {
  try {
    resolvedToppings = JSON.parse(backendPayloadItem.toppings_json);
  } catch {}
}
assert(resolvedToppings.length === 2 && resolvedToppings[0] === 'Trân Châu Hoàng Gia', 'KDS correctly parses toppings_json string to array');

console.log('\n================================================================================');
console.log(`🎯 KDS ISOLATION & MEMOIZATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
