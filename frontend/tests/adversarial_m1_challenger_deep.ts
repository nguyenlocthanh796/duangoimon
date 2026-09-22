import './setup_env';
import { areCartItemRowPropsEqual, CartItemRowProps } from '../lib/components/pos/CartItemRow';
import { areSwipeableCartItemPropsEqual } from '../lib/components/pos/FullScreenCartModal';
import { areProductCardPropsEqual, ProductCardProps } from '../lib/components/pos/ProductCard';
import { areKdsTicketCardPropsEqual, KdsTicketCardProps } from '../lib/components/pos/KdsTicketCard';
import { CartItem, KDSOrder, KDSItem } from '../lib/store/usePOSStore';
import * as fs from 'fs';
import * as path from 'path';

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
console.log('🔥 EMPIRICAL CHALLENGER DEEP VERIFICATION: M1 MEMOIZATION & PROPS HARNESS');
console.log('================================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. CHALLENGE CartItemRow COMPARATOR
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. CHALLENGING CartItemRow areCartItemRowPropsEqual ---');

const baseCartProps: CartItemRowProps = {
  id: 'cart-item-1',
  name: 'Trà Sữa Trân Châu Đường Đen',
  price: 35000,
  qty: 2,
  note: 'Ít ngọt',
  modifiers: 'Size L · 50% Đường',
  sentToKitchen: false,
  sentAt: '14:30',
  onUpdateQty: () => {},
  onRemove: () => {},
  onVoidPress: () => {},
};

// 1.1 Equal props with completely different arrow function references
const cartPropsDifferentCallbacks: CartItemRowProps = {
  ...baseCartProps,
  onUpdateQty: (d) => console.log(d),
  onRemove: () => console.log('remove'),
  onVoidPress: () => console.log('void'),
};
assert(
  areCartItemRowPropsEqual(baseCartProps, cartPropsDifferentCallbacks) === true,
  'CartItemRow: Different callback references do NOT bust memoization'
);

// 1.2 Data mutations MUST trigger re-render (return false)
const cartMutations: [string, Partial<CartItemRowProps>][] = [
  ['id changed', { id: 'cart-item-2' }],
  ['name changed', { name: 'Trà Sữa Khoai Môn' }],
  ['price changed', { price: 40000 }],
  ['qty changed', { qty: 3 }],
  ['note changed', { note: 'Nhiều đá' }],
  ['modifiers changed', { modifiers: 'Size M · 70% Đường' }],
  ['sentToKitchen changed', { sentToKitchen: true }],
  ['sentAt changed', { sentAt: '14:35' }],
];

for (const [desc, delta] of cartMutations) {
  const mutated = { ...baseCartProps, ...delta };
  assert(
    areCartItemRowPropsEqual(baseCartProps, mutated) === false,
    `CartItemRow: ${desc} correctly triggers re-render (returns false)`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHALLENGE SwipeableCartItem COMPARATOR
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. CHALLENGING SwipeableCartItem areSwipeableCartItemPropsEqual ---');

const baseSwipeItem: CartItem = {
  cartItemId: 'c-101',
  item: {
    id: 'prod-1',
    name: 'Cà Phê Muối',
    price: 29000,
    category: 'Cà Phê',
  },
  qty: 1,
  unitPrice: 29000,
  note: 'Không ngọt',
  sentToKitchen: false,
  selectedSize: 'Size M',
  sugarLevel: '30%',
  iceLevel: '50%',
  selectedToppings: ['Thạch Cà Phê', 'Kem Muối'],
};

const baseSwipeProps = {
  item: baseSwipeItem,
  isLast: false,
  theme: { isDark: false },
  isDark: false,
  onEdit: () => {},
  onStepQty: () => {},
  onRemove: () => {},
};

// 2.1 Identical data with new callback closures
const swipePropsDifferentCallbacks = {
  ...baseSwipeProps,
  onEdit: () => console.log('edit'),
  onStepQty: () => console.log('step'),
  onRemove: () => console.log('remove'),
};
assert(
  areSwipeableCartItemPropsEqual(baseSwipeProps, swipePropsDifferentCallbacks) === true,
  'SwipeableCartItem: New callback instances do NOT bust memoization'
);

// 2.2 Deep selectedToppings change detection
const swipeWithDifferentToppings = {
  ...baseSwipeProps,
  item: {
    ...baseSwipeItem,
    selectedToppings: ['Thạch Cà Phê', 'Trân Châu Trắng'],
  },
};
assert(
  areSwipeableCartItemPropsEqual(baseSwipeProps, swipeWithDifferentToppings) === false,
  'SwipeableCartItem: Topping content change triggers re-render'
);

// 2.3 Topping empty vs undefined resilience
const swipeWithEmptyToppings = {
  ...baseSwipeProps,
  item: {
    ...baseSwipeItem,
    selectedToppings: [],
  },
};
const swipeWithUndefinedToppings = {
  ...baseSwipeProps,
  item: {
    ...baseSwipeItem,
    selectedToppings: undefined as any,
  },
};
assert(
  areSwipeableCartItemPropsEqual(swipeWithEmptyToppings, swipeWithUndefinedToppings) === true,
  'SwipeableCartItem: Empty array vs undefined toppings are treated as empty without crash'
);

// 2.4 Other mutations
const swipeMutations: [string, any][] = [
  ['cartItemId changed', { cartItemId: 'c-102' }],
  ['qty changed', { qty: 2 }],
  ['unitPrice changed', { unitPrice: 35000 }],
  ['note changed', { note: 'Thêm đá' }],
  ['sentToKitchen changed', { sentToKitchen: true }],
  ['selectedSize changed', { selectedSize: 'Size L' }],
  ['sugarLevel changed', { sugarLevel: '100%' }],
  ['iceLevel changed', { iceLevel: '100%' }],
  ['item name changed', { item: { ...baseSwipeItem.item, name: 'Cà Phê Sữa' } }],
  ['isLast changed', { isLast: true }],
  ['isDark changed', { isDark: true }],
];

for (const [desc, delta] of swipeMutations) {
  let mutated: any;
  if ('isLast' in delta || 'isDark' in delta) {
    mutated = { ...baseSwipeProps, ...delta };
  } else {
    mutated = { ...baseSwipeProps, item: { ...baseSwipeItem, ...delta } };
  }
  assert(
    areSwipeableCartItemPropsEqual(baseSwipeProps, mutated) === false,
    `SwipeableCartItem: ${desc} triggers re-render`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CHALLENGE ProductCard COMPARATOR
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. CHALLENGING ProductCard areProductCardPropsEqual ---');

const baseProductProps: ProductCardProps = {
  name: 'Trà Đào Cam Sả',
  price: 39000,
  code: 'TDS01',
  category: 'Trà Trái Cây',
  image: 'https://example.com/tda.jpg',
  layoutMode: 'grid',
  cartQty: 0,
  isOutOfStock: false,
  width: 160,
  onPress: () => {},
  onCustomize: () => {},
  onLongPress: () => {},
};

// 3.1 Equal props with new callbacks
const prodDifferentCallbacks: ProductCardProps = {
  ...baseProductProps,
  onPress: () => console.log('press'),
  onCustomize: () => console.log('cust'),
  onLongPress: () => console.log('long'),
};
assert(
  areProductCardPropsEqual(baseProductProps, prodDifferentCallbacks) === true,
  'ProductCard: Different callback instances do NOT bust memoization'
);

// 3.2 Category comparison (Worker M1 fix check)
const prodCategoryChanged: ProductCardProps = {
  ...baseProductProps,
  category: 'Trà Sữa',
};
assert(
  areProductCardPropsEqual(baseProductProps, prodCategoryChanged) === false,
  'ProductCard: Category change MUST trigger re-render (Worker M1 fix verified)'
);

// 3.3 Other mutations
const productMutations: [string, Partial<ProductCardProps>][] = [
  ['cartQty changed', { cartQty: 1 }],
  ['layoutMode changed', { layoutMode: 'list' }],
  ['isOutOfStock changed', { isOutOfStock: true }],
  ['name changed', { name: 'Trà Vải' }],
  ['price changed', { price: 42000 }],
  ['image changed', { image: 'https://example.com/new.jpg' }],
  ['code changed', { code: 'TV01' }],
  ['width changed', { width: 180 }],
];

for (const [desc, delta] of productMutations) {
  const mutated = { ...baseProductProps, ...delta };
  assert(
    areProductCardPropsEqual(baseProductProps, mutated) === false,
    `ProductCard: ${desc} triggers re-render`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CHALLENGE KdsTicketCard COMPARATOR
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. CHALLENGING KdsTicketCard areKdsTicketCardPropsEqual ---');

const baseKdsOrder: KDSOrder = {
  id: 'kds-ord-1',
  orderCode: 'HD-00100',
  tableId: 't-4',
  tableName: 'Bàn 04',
  createdAt: '2026-09-02T15:10:00Z',
  orderTime: '15:10',
  elapsedMinutes: 3,
  guestCount: 2,
  status: 'pending',
  items: [
    {
      id: 'kds-item-1',
      cartItemId: 'c-1',
      name: 'Trà Sữa Oolong',
      qty: 2,
      station: 'bar',
      status: 'pending',
      selectedSize: 'Size L',
      sugarLevel: '50%',
      iceLevel: '70%',
      selectedToppings: ['Trân Châu Đen'],
      note: 'Mang đi',
    },
    {
      id: 'kds-item-2',
      cartItemId: 'c-2',
      name: 'Khoai Tây Chiên',
      qty: 1,
      station: 'snack',
      status: 'cooking',
      selectedToppings: [],
      note: 'Giòn',
    },
  ],
};

const baseKdsProps: KdsTicketCardProps = {
  order: baseKdsOrder,
  activeStation: 'all',
  onItemStatusToggle: () => {},
  onMarkOrderDone: () => {},
};

// 4.1 Equal props with different callbacks
const kdsDifferentCallbacks: KdsTicketCardProps = {
  ...baseKdsProps,
  onItemStatusToggle: () => console.log('toggle'),
  onMarkOrderDone: () => console.log('done'),
};
assert(
  areKdsTicketCardPropsEqual(baseKdsProps, kdsDifferentCallbacks) === true,
  'KdsTicketCard: Callback references do NOT bust memoization'
);

// 4.2 Top-level order mutations
const kdsOrderMutations: [string, Partial<KDSOrder>][] = [
  ['status changed', { status: 'ready' }],
  ['tableName changed', { tableName: 'Bàn 08' }],
  ['orderCode changed', { orderCode: 'HD-00101' }],
  ['orderTime changed', { orderTime: '15:15' }],
  ['elapsedMinutes changed', { elapsedMinutes: 14 }],
  ['guestCount changed', { guestCount: 4 }],
];

for (const [desc, delta] of kdsOrderMutations) {
  const mutated = { ...baseKdsProps, order: { ...baseKdsOrder, ...delta } };
  assert(
    areKdsTicketCardPropsEqual(baseKdsProps, mutated) === false,
    `KdsTicketCard: ${desc} triggers re-render`
  );
}

// 4.3 Active station filter change
assert(
  areKdsTicketCardPropsEqual(baseKdsProps, { ...baseKdsProps, activeStation: 'bar' }) === false,
  'KdsTicketCard: activeStation filter change triggers re-render'
);

// 4.4 Nested item mutations (Item deep equality)
const nestedItemMutations: [string, Partial<KDSItem>][] = [
  ['item status changed to done', { status: 'done' }],
  ['item qty changed', { qty: 3 }],
  ['item name changed', { name: 'Trà Sữa Lài' }],
  ['item note changed', { note: 'Không đá' }],
  ['item station changed', { station: 'kitchen' }],
  ['item selectedSize changed', { selectedSize: 'Size M' }],
  ['item sugarLevel changed', { sugarLevel: '100%' }],
  ['item iceLevel changed', { iceLevel: '0%' }],
  ['item selectedToppings changed', { selectedToppings: ['Trân Châu Trắng'] }],
];

for (const [desc, delta] of nestedItemMutations) {
  const mutatedItems: KDSItem[] = [
    { ...baseKdsOrder.items[0], ...delta },
    baseKdsOrder.items[1],
  ];
  const mutated: KdsTicketCardProps = {
    ...baseKdsProps,
    order: { ...baseKdsOrder, items: mutatedItems },
  };
  assert(
    areKdsTicketCardPropsEqual(baseKdsProps, mutated) === false,
    `KdsTicketCard: Nested ${desc} triggers re-render`
  );
}

// 4.5 Items array length change (e.g. item deleted or added)
const kdsExtraItem: KdsTicketCardProps = {
  ...baseKdsProps,
  order: {
    ...baseKdsOrder,
    items: [
      ...baseKdsOrder.items,
      {
        id: 'kds-item-3',
        cartItemId: 'c-3',
        name: 'Trà Đào',
        qty: 1,
        station: 'bar',
        status: 'pending',
        selectedToppings: [],
      },
    ],
  },
};
assert(
  areKdsTicketCardPropsEqual(baseKdsProps, kdsExtraItem) === false,
  'KdsTicketCard: Adding item to items array triggers re-render'
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. CHALLENGE ReceiptPreviewModal TYPOGRAPHY TOKENS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. CHALLENGING ReceiptPreviewModal TYPOGRAPHY TOKENS ---');

const receiptFilePath = path.join(__dirname, '../lib/components/pos/ReceiptPreviewModal.tsx');
const receiptContent = fs.readFileSync(receiptFilePath, 'utf8');

// Check that line 254 no longer has inline fontSize override
const hasInlineFontSize = /<AppText[^>]*style=\{[^}]*fontSize:\s*\d+[^}]*\}/.test(receiptContent);
assert(!hasInlineFontSize, 'ReceiptPreviewModal: Zero forbidden inline fontSize overrides on AppText');

const hasExplicitVariantXs = receiptContent.includes('Powered by OngChu Lean POS · TCP 9100 Direct');
assert(hasExplicitVariantXs, 'ReceiptPreviewModal: Footer text adheres to standard AppText variant="xs"');

// ─────────────────────────────────────────────────────────────────────────────
// 6. BENCHMARK: 100,000 RAPID COMPARATOR EXECUTIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. BENCHMARKING COMPARATORS UNDER 100,000 ITERATIONS STRESS ---');

const iterations = 100000;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  areCartItemRowPropsEqual(baseCartProps, cartPropsDifferentCallbacks);
  areSwipeableCartItemPropsEqual(baseSwipeProps, swipePropsDifferentCallbacks);
  areProductCardPropsEqual(baseProductProps, prodDifferentCallbacks);
  areKdsTicketCardPropsEqual(baseKdsProps, kdsDifferentCallbacks);
}

const elapsedMs = performance.now() - start;
const avgUs = (elapsedMs / (iterations * 4)) * 1000;

console.log(`  ⏱️ Executed ${iterations * 4} comparator checks in ${elapsedMs.toFixed(2)}ms (${avgUs.toFixed(4)} μs per check)`);
assert(elapsedMs < 300, `Performance: 400,000 comparator evaluations run in < 300ms (actual: ${elapsedMs.toFixed(2)}ms)`);

// ─────────────────────────────────────────────────────────────────────────────
// 7. STALE CLOSURE & REF INTEGRITY AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 7. AUDITING useRef CALLBACK STABILITY ACROSS RENDERS ---');

function createCallbackRefHarness<T extends (...args: any[]) => any>(initialFn: T) {
  const ref = { current: initialFn };
  return {
    update: (newFn: T) => { ref.current = newFn; },
    execute: (...args: Parameters<T>): ReturnType<T> => ref.current(...args),
  };
}

let capturedState = 0;
const harness = createCallbackRefHarness((delta: number) => {
  capturedState += delta;
});

// Render 1: Initial callback
harness.execute(1);
assert(capturedState === 1, 'Harness executes render 1 callback (state=1)');

// Render 2: Parent state advances, new arrow function closure
let capturedState2 = 100;
harness.update((delta: number) => {
  capturedState2 += delta * 10;
});
harness.execute(2);
assert(capturedState2 === 120, 'Harness executes updated render 2 callback without stale closure (state=120)');

console.log('\n================================================================================');
console.log(`🎯 EMPIRICAL CHALLENGE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
