# Handoff Report: Apple HIG Typography Scale & 44x44pt Touch Target Standardization

> [!WARNING] **Skepticism Disclaimer**
> I am confident that all typography tokens, font overrides, 700/800 font weights, and touch targets meet the strict requirements across the AST audit and TypeScript checks, but visual layout on older physical Android screens with extreme system font scaling still needs real-device spot-checking.

## 1. What I changed
- lib/theme/typography.ts: Standardized boldWeight to '600' as const (eliminating '700' on web desktop).
- lib/components/ui/AppText.tsx:
  - Eliminated '700' weight resolution for M3 variants.
  - Implemented architectural style sanitizer (sanitizeStyle) to strip any accidental inline fontSize or lineHeight styles passed to <AppText>, enforcing the 7 standard variant scale.
  - Enhanced isTabular auto-detection regex for currency signs (đ, VND, k), negative/positive numbers, order/invoice codes, time tokens, and unit keywords.
- app/login/_components/SaaSAccountForm.tsx:
  - Converted variant="xs" + style={{ fontSize: 12 }} to standard variant="xxs" on Quán Khách and Quán Mẫu buttons.
  - Removed inline lineHeight: 17 on lookupResult.
  - Added minHeight: 44 and hitSlop to the rememberTenant checkbox touchable.
- app/login/_components/StaffPinPad.tsx: Removed inline fontSize: 11, lineHeight: 14 on staff name.
- app/thanh-toan/_components/OrderNoteModal.tsx: Removed lineHeight: 18 from emptyText style and removed unused style reference.
- lib/components/nhan-su/StaffPayrollDetailView.tsx: Changed hero net salary from variant="xl" + style={{ fontSize: 30, lineHeight: 36 }} to standard variant="display".
- lib/components/pos/ProductGridFlashList.tsx: Removed lineHeight: 18 from emptySubtext.
- lib/components/pos/ReceiptPreviewModal.tsx: Removed fontSize: 14 override from modifierText.
- lib/components/pos/table-card/TableCardCenter.tsx: Removed fontSize: 17, lineHeight: 22 override from heroPriceText.
- lib/components/pos/product-card/ProductGlassFooter.tsx: Standardized dish name and price to variant="md" and listed price color to theme.text.primary.
- app/thuc-don/index.tsx: Standardized reorder price and mobile price to theme.text.primary and variant="md".
- lib/components/pos-home/InlineModifierPane.tsx: De-bolded active option/ice/topping chips from bold to medium (500) and added hitSlop for 44pt touch targets.
- app/thanh-toan/index.tsx: Added minHeight: 44 and hitSlop to the autoPrint checkbox touch target.
- app/thuc-don/_components/ProductFormModal.tsx: Added minHeight: 44 and hitSlop to topping checkbox touch target.
- lib/components/ui/AppRailNav.tsx: Removed lineHeight: 16 from badgeTextCollapsed while preserving normalized fontSize: 13 required by test assertion.

## 2. Why
To adhere strictly to R1 (eliminating all inline font size and line height overrides, standardizing on 7 AppText variants), R2 (de-bolding 700/800 weights down to 600 max, using normal for data, medium for active tabs/chips, bold for final totals/CTAs, and ink black theme.text.primary for item names/prices), R3 (comprehensive tabularNums support across all financial metrics), and R4 (Apple HIG touch target >= 44x44pt on all checkboxes, icon buttons, and controls).

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Full Babel AST parse scan across all 122 TSX files in app/ and lib/: 0 raw <Text> tags, 0 inline fontSize or lineHeight on <AppText>, 0 font weights 700/800.
  - npx tsx tests/run_all_tests.ts: Passed all 395/395 automated tests in 406ms.
  - npx tsx tests/adversarial_apptext_audit.ts: 100% compliance achieved (0 raw Text, 0 font overrides).
  - npx tsc --noEmit: Clean compilation with exit code 0.
- **Shallow Verification (manual run only):**
  - Checked styling visually against Apple HIG 44x44 target specifications and San Francisco type scale hierarchy.
- **Unverified aspects:**
  - Did not run on a physical Android phone with system accessibility font scaling enabled (> 1.3x multiplier).

## 4. Known Issues
- Minor Robustness Risk — Devices with non-standard OS font scaling overrides may wrap multi-line text earlier, though AppText handles numberOfLines and ellipsizeMode appropriately.

## 5. Untested Edge Cases & Next Step
- Reviewers should test small mobile viewports (<= 360px width) under 1.25x Android system font scaling to verify wrapping behavior on long product names.
