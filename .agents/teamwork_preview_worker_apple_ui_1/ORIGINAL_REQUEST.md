## 2026-07-08T20:53:29+07:00
You are a Worker subagent for the Apple UI Optimization task.
Your task is to implement the modifications defined in e:\posa\.agents\teamwork_preview_explorer_apple_ui_1\analysis.md and e:\posa\.agents\teamwork_preview_explorer_apple_ui_3\analysis.md under e:\posa\frontend.

Detailed steps to execute:
1. Run "npm install @expo-google-fonts/be-vietnam-pro" in e:\posa\frontend.
2. Edit e:\posa\frontend\app\_layout.tsx to import/load the Be Vietnam Pro fonts as proposed in the reports, replacing Inter.
3. Edit e:\posa\frontend\tailwind.config.js to add default mapping and fontFamily keys for the font.
4. Edit e:\posa\frontend\lib\theme\typography.ts to map all typography objects to use Be Vietnam Pro font family names on both iOS/Android. Also optimize scaleFactor for iPad OS classification as specified:
   const isIPad = Platform.OS === 'ios' && Platform.isPad;
   const scaleFactor = isIPad ? 1.35 : 1.08;
5. Edit e:\posa\frontend\lib\theme\shape.ts to clamp the md, lg, and full corner radius tokens to 4 (clamped to <=4px).
6. Edit all hardcoded corner radii (borderRadius) to be 4px or less (removing rounded-2xl / rounded-3xl classes or properties) in the list of files:
   - app/ban-hang/index.tsx
   - app/ban-hang/kitchen.tsx
   - app/ban-hang/payment.tsx
   - app/login.tsx
   - lib/components/auth/LoginForm.tsx
   - lib/components/ke-toan/InvoiceFormContent.tsx
   - lib/components/payment/CashSuggestions.tsx
   - lib/components/payment/SplitBillPanel.tsx
   - lib/components/pos/CartItemRow.tsx
   - lib/components/pos/CartMainActions.tsx
   - lib/components/pos/CartPanel.tsx
   - lib/components/pos/CartSplitActions.tsx
   - lib/components/pos/MobileCartBar.tsx
   - lib/components/pos/MoreMenu.tsx
   - lib/components/pos/MoveTableModal.tsx
   - lib/components/pos/NoteEditor.tsx
   - lib/components/pos/ProductCard.tsx
   - lib/components/pos/TableCard.tsx
   - lib/components/purchaseOrders/POForm.tsx
   - lib/components/purchaseOrders/ReceiveModal.tsx
   - lib/components/recipes/RecipeForm.tsx
   - lib/components/Sidebar.tsx
   - lib/components/ui/FormModal.tsx
   - lib/components/ui/SkeletonBox.tsx
7. Adjust touch target sizes to be at least 44x44 pt for buttons, input fields, filters, etc., using hitSlop or direct sizing in:
   - AreaFilter.tsx (height -> 56, button -> 44)
   - CategoryTabs.tsx (height -> 56, button -> 44)
   - CashInputPanel.tsx (suggestion button height -> 44)
   - CartItemRow.tsx (quantity selector height -> 44, width -> 120, buttons -> 40)
   - ProductCard.tsx (add hitSlop={7} to options button)
   - TableScreenHeader.tsx (width/height -> 44)
   - OrderHeader.tsx (width/height -> 44)
   - payment.tsx (back button size -> 44)
   - kitchen.tsx (top buttons -> 44)
   - index.tsx (refresh button -> 44, back button hitSlop/size -> 44)
   - LoginForm.tsx (remember row height -> 44)

Verify the implementation by running typescript check: "npx tsc --noEmit" and dev server export: "npx expo export" to ensure there are no syntax, importing, or layout errors.
Write your handoff report to e:\posa\.agents\teamwork_preview_worker_apple_ui_1\handoff.md and notify the orchestrator.
