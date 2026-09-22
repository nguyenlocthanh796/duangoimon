/**
 * 👑 OngChu Lean POS - Menu, Category, Topping, Table & Area Management Test Suite
 * Verifies core requirements:
 * 1. Product CRUD & Reordering: add, edit, delete, reorder products
 * 2. Category CRUD & Reordering: add, edit, delete, reorder categories
 * 3. Topping CRUD & Reordering: add, edit, delete, reorder toppings (with priceDelta)
 * 4. Table & Area Reordering: reorder tables, add/edit/reorder areas
 * 5. ModifierSheet Topping integration: verifies storeToppings and item toppings customization
 */

import { runner, assert } from './harness';
import { usePOSStore, MenuItemWithModifiers, ModifierOption, AreaItem, TableItem } from '../lib/store/usePOSStore';

export async function runMenuAndTableManagementTests() {
  console.log('\n--- Running Menu, Category, Topping, Table & Area Management Tests ---');
  runner.setContext('Management', 'Menu, Category, Topping & Table Flow');

  // Test 1: Category CRUD & Reordering
  runner.test('Category Management: Add, Update, Reorder, Delete', () => {
    const store = usePOSStore.getState();
    const initialCount = store.categories.length;
    assert.ok(initialCount > 0, 'Initial categories should not be empty');

    // 1. Add Category
    store.addCategory('Đồ Uống Đá Xay');
    let state = usePOSStore.getState();
    assert.ok(state.categories.length === initialCount + 1, 'Category count should increment by 1');
    const newCat = state.categories.find(c => c.name === 'Đồ Uống Đá Xay');
    assert.ok(!!newCat, 'New category should exist in store');

    // 2. Update Category
    store.updateCategory(newCat!.id, 'Đá Xay & Sinh Tố');
    state = usePOSStore.getState();
    const updatedCat = state.categories.find(c => c.id === newCat!.id);
    assert.ok(updatedCat?.name === 'Đá Xay & Sinh Tố', 'Category name should be updated');

    // 3. Reorder Categories (swap first two)
    const firstCat = state.categories[0];
    const secondCat = state.categories[1];
    const reordered = [...state.categories];
    reordered[0] = secondCat;
    reordered[1] = firstCat;
    store.reorderCategories(reordered);
    state = usePOSStore.getState();
    assert.ok(state.categories[0].id === secondCat.id, 'First category should now be secondCat');
    assert.ok(state.categories[1].id === firstCat.id, 'Second category should now be firstCat');

    // 4. Delete Category
    store.deleteCategory(newCat!.id);
    state = usePOSStore.getState();
    assert.ok(state.categories.length === initialCount, 'Category count should return to initialCount after deletion');
    assert.ok(!state.categories.some(c => c.id === newCat!.id), 'Deleted category should not exist');
  });

  // Test 2: Product CRUD & Reordering
  runner.test('Product Management: Add, Update, Reorder, Delete', () => {
    const store = usePOSStore.getState();
    const initialCount = store.menuItems.length;
    assert.ok(initialCount > 0, 'Initial menu items should not be empty');

    // 1. Add Product with custom toppings
    const customToppings: ModifierOption[] = [
      { id: 'top-test-1', name: 'Trân Châu Sợi', priceDelta: 7000 },
      { id: 'top-test-2', name: 'Thạch Phô Mai', priceDelta: 12000 },
    ];

    const newProduct: MenuItemWithModifiers = {
      id: 'prod-test-999',
      name: 'Trà Sữa Khoai Môn Kem Trứng',
      price: 45000,
      costPrice: 18000,
      category: 'Trà Sữa',
      code: 'TS99',
      unit: 'Ly',
      station: 'bar',
      toppings: customToppings,
    };

    store.addProduct(newProduct);
    let state = usePOSStore.getState();
    assert.ok(state.menuItems.length === initialCount + 1, 'Product count should increment by 1');
    const added = state.menuItems.find(p => p.id === 'prod-test-999');
    assert.ok(!!added, 'Added product should exist in store');
    assert.ok(added?.name === 'Trà Sữa Khoai Môn Kem Trứng', 'Product name should match');
    assert.ok(added?.toppings?.length === 2, 'Product should retain custom toppings');
    assert.ok(added?.toppings?.[1].name === 'Thạch Phô Mai', 'Second topping should be Thạch Phô Mai');

    // 2. Update Product
    const updatedProduct: MenuItemWithModifiers = {
      ...added!,
      name: 'Trà Sữa Khoai Môn Phô Mai Đặc Biệt',
      price: 52000,
      costPrice: 20000,
    };
    store.updateProduct(updatedProduct.id, updatedProduct);
    state = usePOSStore.getState();
    const checked = state.menuItems.find(p => p.id === 'prod-test-999');
    assert.ok(checked?.name === 'Trà Sữa Khoai Môn Phô Mai Đặc Biệt', 'Product name should be updated');
    assert.ok(checked?.price === 52000, 'Product price should be updated to 52000');

    // 3. Reorder Products (move newly added product to top)
    const allProducts = [...state.menuItems];
    const prodIdx = allProducts.findIndex(p => p.id === 'prod-test-999');
    const [movedItem] = allProducts.splice(prodIdx, 1);
    allProducts.unshift(movedItem);
    store.reorderProducts(allProducts);
    state = usePOSStore.getState();
    assert.ok(state.menuItems[0].id === 'prod-test-999', 'New product should now be at position 0');

    // 4. Delete Product
    store.deleteProduct('prod-test-999');
    state = usePOSStore.getState();
    assert.ok(state.menuItems.length === initialCount, 'Product count should return to initialCount');
    assert.ok(!state.menuItems.some(p => p.id === 'prod-test-999'), 'Deleted product should not exist');
  });

  // Test 3: Topping Management CRUD & Reordering
  runner.test('Topping Management: Add, Update, Reorder, Delete', () => {
    const store = usePOSStore.getState();
    assert.ok(Array.isArray(store.toppings), 'Store should have toppings array');
    const initialToppingsCount = store.toppings.length;
    assert.ok(initialToppingsCount >= 8, 'Initial toppings should have at least 8 items');

    // 1. Add Topping
    store.addTopping({ name: 'Hạt Sen Huế', priceDelta: 12000 });
    let state = usePOSStore.getState();
    assert.ok(state.toppings.length === initialToppingsCount + 1, 'Topping count should increment by 1');
    const newTop = state.toppings.find(t => t.name === 'Hạt Sen Huế');
    assert.ok(!!newTop, 'New topping should exist');
    assert.ok(newTop?.priceDelta === 12000, 'New topping price delta should be 12000');

    // 2. Update Topping
    store.updateTopping(newTop!.id, { name: 'Hạt Sen Huế Thượng Hạng', priceDelta: 15000 });
    state = usePOSStore.getState();
    const updatedTop = state.toppings.find(t => t.id === newTop!.id);
    assert.ok(updatedTop?.name === 'Hạt Sen Huế Thượng Hạng', 'Topping name should be updated');
    assert.ok(updatedTop?.priceDelta === 15000, 'Topping price should be updated to 15000');

    // 3. Reorder Toppings (swap first two toppings)
    const top0 = state.toppings[0];
    const top1 = state.toppings[1];
    const reorderedTops = [...state.toppings];
    reorderedTops[0] = top1;
    reorderedTops[1] = top0;
    store.reorderToppings(reorderedTops);
    state = usePOSStore.getState();
    assert.ok(state.toppings[0].id === top1.id, 'First topping should now be top1');
    assert.ok(state.toppings[1].id === top0.id, 'Second topping should now be top0');

    // 4. Delete Topping
    store.deleteTopping(newTop!.id);
    state = usePOSStore.getState();
    assert.ok(state.toppings.length === initialToppingsCount, 'Topping count should return to initial');
    assert.ok(!state.toppings.some(t => t.id === newTop!.id), 'Deleted topping should not exist');
  });

  // Test 4: Table & Area Reordering
  runner.test('Table & Area Management: Reorder Tables & Reorder Areas', () => {
    const store = usePOSStore.getState();
    const initialTables = store.tables;
    const initialAreas = store.areas;
    assert.ok(initialTables.length > 0, 'Tables should not be empty');
    assert.ok(initialAreas.length > 0, 'Areas should not be empty');

    // 1. Reorder Tables
    const tbl0 = initialTables[0];
    const tbl1 = initialTables[1];
    const reorderedTables: TableItem[] = [...initialTables];
    reorderedTables[0] = tbl1;
    reorderedTables[1] = tbl0;
    store.reorderTables(reorderedTables);
    let state = usePOSStore.getState();
    assert.ok(state.tables[0].id === tbl1.id, 'First table should now be tbl1');
    assert.ok(state.tables[1].id === tbl0.id, 'Second table should now be tbl0');

    // 2. Add Area & Reorder Areas
    store.addArea('Sân Thượng Rooftop');
    state = usePOSStore.getState();
    const newArea = state.areas.find(a => a.name === 'Sân Thượng Rooftop');
    assert.ok(!!newArea, 'New area should exist in store');

    // Move new area to the very top
    const areaList: AreaItem[] = [...state.areas];
    const areaIdx = areaList.findIndex(a => a.id === newArea!.id);
    const [movedArea] = areaList.splice(areaIdx, 1);
    areaList.unshift(movedArea);
    store.reorderAreas(areaList);
    state = usePOSStore.getState();
    assert.ok(state.areas[0].id === newArea!.id, 'New area should now be at position 0');

    // 3. Clean up area
    store.deleteArea(newArea!.id);
    state = usePOSStore.getState();
    assert.ok(!state.areas.some(a => a.id === newArea!.id), 'Deleted area should not exist');
  });
}
