import { runner, assert } from './harness';
import * as fs from 'fs';
import * as path from 'path';
import { useRecipeBookStore } from '../lib/store/useRecipeBookStore';
import { useBaristaStore } from '../lib/modules/barista-sop/store/useBaristaStore';
import { SAMPLE_RECIPES, RECIPE_TEMPLATES } from '../lib/modules/barista-sop/constants';
import { checkRoutePermission } from '../lib/store/useAuthStore';
import { RAW_NAV_GROUPS } from '../lib/components/ui/sidebarConfig';
import { sendBatchBrewLabelToPrinter } from '../lib/utils/labelPrinter';

export async function runRecipeBookAndSOPTests() {
  runner.setContext('Recipe Book & SOP Engine', 'Verify Recipe Book, BOM COGS calculation, SOP Focus Mode, Multi-Timer, Modular Extraction, and Batch Printing');

  await runner.test('1. Staff & Owner roles have permission to access /so-cong-thuc', () => {
    assert.isTrue(checkRoutePermission('owner', '/so-cong-thuc'), 'Owner can access /so-cong-thuc');
    assert.isTrue(checkRoutePermission('manager', '/so-cong-thuc'), 'Manager can access /so-cong-thuc');
    assert.isTrue(checkRoutePermission('cashier', '/so-cong-thuc'), 'Cashier can access /so-cong-thuc');
    assert.isTrue(checkRoutePermission('server', '/so-cong-thuc'), 'Server can access /so-cong-thuc');
    assert.isFalse(checkRoutePermission('super_admin', '/so-cong-thuc'), 'Super Admin is SaaS-only');
  });

  await runner.test('2. Sidebar navigation config includes /so-cong-thuc with proper route & icon', () => {
    const menuGroup = RAW_NAV_GROUPS.find((g) => g.groupTitle === 'QUẢN LÝ BÀN & THỰC ĐƠN');
    assert.isTrue(Boolean(menuGroup), 'QUẢN LÝ BÀN & THỰC ĐƠN group must exist');
    const recipeItem = menuGroup?.items.find((i) => i.id === 'so_cong_thuc');
    assert.isTrue(Boolean(recipeItem), 'so_cong_thuc item must exist in sidebar');
    assert.strictEqual(recipeItem?.route, '/so-cong-thuc');
    assert.strictEqual(recipeItem?.icon, 'book-open-variant');
  });

  await runner.test('3. Sample recipes data integrity (BOM, steps, batch formulas)', () => {
    assert.isTrue(SAMPLE_RECIPES.length >= 5, 'Must have at least 5 standard F&B sample recipes');
    for (const r of SAMPLE_RECIPES) {
      assert.isTrue(Boolean(r.id), `Recipe ${r.productName} must have an id`);
      assert.isTrue(Boolean(r.productName), 'Recipe must have product name');
      assert.isTrue(r.sellingPrice > 0, `Recipe ${r.productName} selling price > 0`);
      assert.isTrue(r.variants.length > 0, `Recipe ${r.productName} must have at least 1 size variant`);
      assert.isTrue(r.steps.length > 0, `Recipe ${r.productName} must have SOP steps`);

      // Check variant ingredients
      for (const v of r.variants) {
        assert.isTrue(v.ingredients.length > 0, `Variant ${v.sizeName} must have ingredients`);
        for (const ing of v.ingredients) {
          assert.isTrue(ing.quantity > 0, `Ingredient ${ing.ingredientName} quantity > 0`);
          assert.isTrue(Boolean(ing.unit), `Ingredient ${ing.ingredientName} must have unit`);
        }
      }
    }
  });

  await runner.test('4. RecipeBookStore & BaristaStore calculation logic: Variant cost (COGS) & Profit margin', () => {
    const store = useBaristaStore.getState();

    // Test trà đào cam sả cost calculation
    const traDao = SAMPLE_RECIPES[2];
    const sizeM = traDao.variants[0];
    const costM = store.calculateVariantCost(sizeM);
    assert.isTrue(costM > 0, 'Cost of Size M must be > 0');

    // Selling price: 42,000. Check margin
    const marginM = store.calculateProfitMargin(traDao.sellingPrice, costM);
    assert.isTrue(marginM > 50 && marginM <= 100, `Margin must be between 50% and 100%, got ${marginM}%`);

    // Margin for 0 or negative price
    assert.strictEqual(store.calculateProfitMargin(0, 5000), 0, 'Margin with 0 selling price is 0');
  });

  await runner.test('5. RecipeBookStore batch scaling multiplier logic', () => {
    const store = useBaristaStore.getState();
    const traDao = SAMPLE_RECIPES[2];
    const ingredients = traDao.variants[0].ingredients;

    const scaled2x = store.scaleIngredientsForBatch(ingredients, 2);
    assert.strictEqual(scaled2x.length, ingredients.length, 'Length must be identical');
    assert.strictEqual(scaled2x[0].quantity, ingredients[0].quantity * 2, 'First ingredient must be doubled');

    const scaled5x = store.scaleIngredientsForBatch(ingredients, 5);
    assert.strictEqual(scaled5x[0].quantity, ingredients[0].quantity * 5, 'First ingredient must be 5x');
  });

  await runner.test('6. RecipeBookStore CRUD actions and 1-Touch Duplicate', () => {
    const store = useBaristaStore.getState();
    const initialCount = store.recipes.length;

    // Add new recipe
    const newRecipe = store.addRecipe({
      productId: 'p_test_99',
      productName: 'Trà Sữa Matcha Đậu Đỏ Test',
      category: 'Trà Sữa',
      sellingPrice: 48000,
      prepTimeMinutes: 4,
      difficulty: 'medium',
      description: 'Test recipe item',
      variants: [
        {
          sizeName: 'Size M',
          ingredients: [
            { ingredientId: 'ing_matcha', ingredientName: 'Bột Matcha Nhật', quantity: 15, unit: 'g', costPrice: 500 },
            { ingredientId: 'ing_sua_tuoi', ingredientName: 'Sữa Tươi Thanh Trùng', quantity: 150, unit: 'ml', costPrice: 35 },
          ],
        },
      ],
      steps: [
        { stepNumber: 1, title: 'Đánh tan matcha', description: 'Khuấy đều bột matcha với 50ml nước sôi 80°C' },
      ],
    });

    assert.isTrue(Boolean(newRecipe.id), 'New recipe must have generated id');
    assert.strictEqual(useBaristaStore.getState().recipes.length, initialCount + 1, 'Recipe count increased');

    // Duplicate recipe
    const duplicated = store.duplicateRecipe(newRecipe.id);
    assert.isTrue(Boolean(duplicated), 'Duplicated recipe must exist');
    assert.strictEqual(duplicated?.productName, `${newRecipe.productName} (Bản sao)`);
    assert.strictEqual(useBaristaStore.getState().recipes.length, initialCount + 2, 'Count increased after duplication');

    // Update recipe
    store.updateRecipe(newRecipe.id, { sellingPrice: 52000 });
    const updated = useBaristaStore.getState().recipes.find((r) => r.id === newRecipe.id);
    assert.strictEqual(updated?.sellingPrice, 52000, 'Selling price updated');

    // Delete recipes
    store.deleteRecipe(newRecipe.id);
    if (duplicated) store.deleteRecipe(duplicated.id);
    assert.strictEqual(useBaristaStore.getState().recipes.length, initialCount, 'Recipe count returned to initial');
  });

  await runner.test('7. Multi-Timer Brew Station Engine (Start, Pause, Resume, Tick, Finish)', () => {
    const store = useBaristaStore.getState();
    const traChanh = SAMPLE_RECIPES[0];
    const batch = traChanh.batchFormulas![0];

    // Start timer
    const timer = store.startBrewTimer(batch, traChanh);
    assert.isTrue(Boolean(timer.id), 'Timer must have id');
    assert.isTrue(timer.isRunning, 'Timer starts running');
    assert.strictEqual(timer.remainingSeconds, batch.brewTimeSeconds || 600);

    // Pause timer
    store.pauseBrewTimer(timer.id);
    let currentT = useBaristaStore.getState().activeTimers.find((t) => t.id === timer.id);
    assert.isFalse(Boolean(currentT?.isRunning), 'Timer is paused');

    // Resume timer
    store.resumeBrewTimer(timer.id);
    currentT = useBaristaStore.getState().activeTimers.find((t) => t.id === timer.id);
    assert.isTrue(Boolean(currentT?.isRunning), 'Timer resumed');

    // Tick timers
    store.tickTimers();
    currentT = useBaristaStore.getState().activeTimers.find((t) => t.id === timer.id);
    assert.strictEqual(currentT?.remainingSeconds, timer.totalSeconds - 1, 'Timer decremented by 1 second');

    // Stop timer
    store.stopBrewTimer(timer.id);
    assert.strictEqual(useBaristaStore.getState().activeTimers.length, 0, 'Timer removed after stop');
  });

  await runner.test('8. Quick Recipe Templates availability', () => {
    assert.isTrue(RECIPE_TEMPLATES.length >= 4, 'Must have at least 4 preset F&B templates');
    const lemonTemplate = RECIPE_TEMPLATES.find((t) => t.templateName.includes('Trà Chanh'));
    assert.isTrue(Boolean(lemonTemplate), 'Trà Chanh template must exist');
    assert.isTrue(lemonTemplate!.variants.length > 0, 'Template must have variants');
    assert.isTrue(lemonTemplate!.steps.length > 0, 'Template must have SOP steps');
  });

  await runner.test('9. Batch Shelf-life Label Generator integration', async () => {
    const res = await sendBatchBrewLabelToPrinter({
      batchName: 'Ủ Bình Cốt Trà Nhài 5L',
      teaType: 'Trà Xanh Hoa Nhài Lộc Phát',
      volumeOrYield: '35 Ly',
      brewedAt: '08:30 20/09',
      expiresAt: '12:30 20/09',
      shelfLifeHours: 4,
      baristaName: 'Ca Sáng',
    });
    assert.isTrue(res.success, 'Print label output must succeed');
  });

  await runner.test('10. App screen components and typography invariants (No raw <Text>)', () => {
    const screenPath = path.resolve(__dirname, '../app/so-cong-thuc/index.tsx');
    assert.isTrue(fs.existsSync(screenPath), 'app/so-cong-thuc/index.tsx must exist');

    const appRootPath = path.resolve(__dirname, '../lib/modules/barista-sop/BaristaSOPApp.tsx');
    assert.isTrue(fs.existsSync(appRootPath), 'lib/modules/barista-sop/BaristaSOPApp.tsx must exist');

    const rawTextRegex = /<Text[\s>]/g;
    const appRootContent = fs.readFileSync(appRootPath, 'utf8');
    assert.isFalse(rawTextRegex.test(appRootContent), 'BaristaSOPApp.tsx must not use raw <Text>');
    assert.isTrue(appRootContent.includes('<AppText'), 'Must use <AppText>');
    assert.isTrue(appRootContent.includes('<BaristaAppHeader'), 'Must use dedicated <BaristaAppHeader>');
    assert.isTrue(appRootContent.includes('<BaristaBottomNav'), 'Must use dedicated <BaristaBottomNav>');

    // Check modular subcomponents
    const focusModePath = path.resolve(__dirname, '../lib/modules/barista-sop/components/RecipeFocusMode.tsx');
    const detailViewPath = path.resolve(__dirname, '../lib/modules/barista-sop/components/RecipeDetailView.tsx');
    const formModalPath = path.resolve(__dirname, '../lib/modules/barista-sop/components/RecipeFormModal.tsx');
    const brewTabPath = path.resolve(__dirname, '../lib/modules/barista-sop/components/BrewingAssistantTab.tsx');
    const headerPath = path.resolve(__dirname, '../lib/modules/barista-sop/components/BaristaAppHeader.tsx');
    const bottomNavPath = path.resolve(__dirname, '../lib/modules/barista-sop/components/BaristaBottomNav.tsx');
    const baristaFocusPath = path.resolve(__dirname, '../lib/modules/barista-sop/components/BaristaFocusScreen.tsx');

    assert.isTrue(fs.existsSync(focusModePath), 'RecipeFocusMode.tsx must exist');
    assert.isTrue(fs.existsSync(detailViewPath), 'RecipeDetailView.tsx must exist');
    assert.isTrue(fs.existsSync(formModalPath), 'RecipeFormModal.tsx must exist');
    assert.isTrue(fs.existsSync(brewTabPath), 'BrewingAssistantTab.tsx must exist');
    assert.isTrue(fs.existsSync(headerPath), 'BaristaAppHeader.tsx must exist');
    assert.isTrue(fs.existsSync(bottomNavPath), 'BaristaBottomNav.tsx must exist');
    assert.isTrue(fs.existsSync(baristaFocusPath), 'BaristaFocusScreen.tsx must exist');

    assert.isFalse(rawTextRegex.test(fs.readFileSync(focusModePath, 'utf8')), 'Focus mode must not use raw <Text>');
    assert.isFalse(rawTextRegex.test(fs.readFileSync(detailViewPath, 'utf8')), 'Detail view must not use raw <Text>');
    assert.isFalse(rawTextRegex.test(fs.readFileSync(formModalPath, 'utf8')), 'Form modal must not use raw <Text>');
    assert.isFalse(rawTextRegex.test(fs.readFileSync(brewTabPath, 'utf8')), 'Brew tab must not use raw <Text>');
    assert.isFalse(rawTextRegex.test(fs.readFileSync(headerPath, 'utf8')), 'Header must not use raw <Text>');
    assert.isFalse(rawTextRegex.test(fs.readFileSync(bottomNavPath, 'utf8')), 'Bottom nav must not use raw <Text>');
    assert.isFalse(rawTextRegex.test(fs.readFileSync(baristaFocusPath, 'utf8')), 'Barista focus must not use raw <Text>');
  });

  await runner.test('11. Autonomous Barista Sub-App module index & extractor script presence', () => {
    const moduleIndexPath = path.resolve(__dirname, '../lib/modules/barista-sop/index.ts');
    assert.isTrue(fs.existsSync(moduleIndexPath), 'lib/modules/barista-sop/index.ts must exist');

    const extractorPath = path.resolve(__dirname, '../../scripts/extract_barista_subapp.py');
    assert.isTrue(fs.existsSync(extractorPath), 'scripts/extract_barista_subapp.py must exist');
    const extractorContent = fs.readFileSync(extractorPath, 'utf8');
    assert.isTrue(extractorContent.includes('generate_package_json'), 'Extractor must have package.json generator');
    assert.isTrue(extractorContent.includes('generate_app_json'), 'Extractor must have app.json generator');
  });
}
