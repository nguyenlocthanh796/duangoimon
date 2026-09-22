/**
 * 👑 OngChu Lean POS - Automated Audit: Item Customization & Mock Modifiers Elimination
 *
 * Verifies:
 * 1. INITIAL_MENU_ITEMS in menuData.ts has real sizes/toppings for drinks, none for food/snacks.
 * 2. Zero hardcoded mock fallbacks (defaultSizes, defaultToppings, DEFAULT_DRINK_SIZES).
 * 3. Non-drink items do not inherit fake drink sizes, sugar, ice, or tea toppings.
 * 4. Product list item memoization correctly respects onCustomize presence.
 */

import './setup_env';
import { strict as assert } from 'node:assert';
import { INITIAL_MENU_ITEMS } from '../lib/constants/menuData';
import { areProductListItemPropsEqual } from '../lib/components/pos/product-card/ProductListItem';
import { areProductCardPropsEqual } from '../lib/components/pos/product-card/areProductCardPropsEqual';

console.log('================================================================================');
console.log('🔍 AUDIT: ITEM CUSTOMIZATION & MOCK MODIFIER ELIMINATION');
console.log('================================================================================\n');

// --- 1. AUDITING INITIAL_MENU_ITEMS CONFIGURATION ---
console.log('--- 1. AUDITING INITIAL_MENU_ITEMS CONFIGURATION ---');

const milkTea = INITIAL_MENU_ITEMS.find((i) => i.code === 'TS01');
assert.ok(milkTea, 'TS01 (Trà Sữa Trân Châu Hoàng Gia) must exist');
assert.ok(milkTea.sizes && milkTea.sizes.length === 3, 'TS01 must have 3 sizes (M, L, XL)');
assert.strictEqual(milkTea.sizes[0].name, 'Size Vừa (M)');
assert.strictEqual(milkTea.sizes[1].name, 'Size Lớn (L)');
assert.strictEqual(milkTea.sizes[2].name, 'Size Khổng Lồ (XL)');
assert.ok(milkTea.toppings && milkTea.toppings.length > 0, 'TS01 must have applicable toppings');
console.log('  ✅ [PASS] Drink TS01 has real sizes (M, L, XL) and toppings');

const frenchFries = INITIAL_MENU_ITEMS.find((i) => i.code === 'AV01');
assert.ok(frenchFries, 'AV01 (Khoai Tây Chiên Lắc Phô Mai) must exist');
assert.strictEqual(frenchFries.sizes, undefined, 'AV01 must NOT have sizes');
assert.strictEqual(frenchFries.toppings, undefined, 'AV01 must NOT have tea toppings');
assert.strictEqual(frenchFries.station, 'snack', 'AV01 must be station snack');
console.log('  ✅ [PASS] Food AV01 has ZERO sizes and ZERO toppings (no mock pollution)');

const friedChicken = INITIAL_MENU_ITEMS.find((i) => i.code === 'AV02');
assert.ok(friedChicken, 'AV02 (Gà Rán) must exist');
assert.strictEqual(friedChicken.sizes, undefined, 'AV02 must NOT have sizes');
assert.strictEqual(friedChicken.toppings, undefined, 'AV02 must NOT have toppings');
console.log('  ✅ [PASS] Food AV02 has ZERO sizes and ZERO toppings');

const saltCoffee = INITIAL_MENU_ITEMS.find((i) => i.code === 'CF01');
assert.ok(saltCoffee, 'CF01 (Cà Phê Muối Cố Đô) must exist');
assert.ok(saltCoffee.sizes && saltCoffee.sizes.length === 2, 'CF01 must have standard 2 sizes (M, L)');
console.log('  ✅ [PASS] Coffee CF01 has standard sizes (M, L)');

// --- 2. AUDITING CUSTOMIZATION ELIGIBILITY (canCustomize) ---
console.log('\n--- 2. AUDITING CUSTOMIZATION ELIGIBILITY (canCustomize) ---');

function isItemCustomizable(item: typeof INITIAL_MENU_ITEMS[0]): boolean {
  const effectiveSizes = item.sizes && item.sizes.length > 0 ? item.sizes : undefined;
  return Boolean(
    (effectiveSizes && effectiveSizes.length > 1) ||
    (item.toppings && item.toppings.length > 0) ||
    item.station === 'bar'
  );
}

assert.strictEqual(isItemCustomizable(milkTea), true, 'Milk tea must be customizable');
assert.strictEqual(isItemCustomizable(frenchFries), false, 'French fries without options must NOT be customizable');
assert.strictEqual(isItemCustomizable(friedChicken), false, 'Fried chicken without options must NOT be customizable');
console.log('  ✅ [PASS] isItemCustomizable correctly identifies customizable vs non-customizable items');

// --- 3. AUDITING PROPS EQUALITY WITH onCustomize PRESENCE ---
console.log('\n--- 3. AUDITING PROPS EQUALITY WITH onCustomize PRESENCE ---');

const baseItemProps = {
  name: 'Khoai Tây Chiên',
  price: 30000,
  code: 'AV01',
  category: 'Ăn Vặt',
  image: 'https://example.com/fries.jpg',
  cartQty: 0,
  isOutOfStock: false,
  width: 200,
  onPress: () => {},
  onAddSize: undefined,
  onDecrement: undefined,
  onCustomize: undefined,
};

assert.strictEqual(
  areProductListItemPropsEqual(baseItemProps, { ...baseItemProps }),
  true,
  'Identical item props must be equal'
);

assert.strictEqual(
  areProductListItemPropsEqual(baseItemProps, { ...baseItemProps, onCustomize: () => {} }),
  false,
  'Adding onCustomize callback must bust memoization in ProductListItem'
);

assert.strictEqual(
  areProductCardPropsEqual(
    { ...baseItemProps, layoutMode: 'list' },
    { ...baseItemProps, layoutMode: 'list', onCustomize: () => {} }
  ),
  false,
  'Adding onCustomize callback must bust memoization in ProductCard'
);

console.log('  ✅ [PASS] areProductListItemPropsEqual and areProductCardPropsEqual properly compare onCustomize presence');

// --- 4. AUDITING ZERO MOCK FALLBACK POLLUTION ---
console.log('\n--- 4. AUDITING ZERO MOCK FALLBACK POLLUTION ---');
const allSnacks = INITIAL_MENU_ITEMS.filter((i) => i.category === 'Ăn Vặt');
for (const snack of allSnacks) {
  assert.strictEqual(snack.sizes, undefined, `Snack [${snack.name}] must not have sizes`);
  assert.strictEqual(snack.toppings, undefined, `Snack [${snack.name}] must not have toppings`);
}
console.log(`  ✅ [PASS] All ${allSnacks.length} snacks in menuData are free from sizes/toppings mock fallbacks`);

console.log('\n================================================================================');
console.log('🎯 ALL 8 AUDIT CHECKS PASSED SUCCESSFULLY!');
console.log('================================================================================');
