# Original User Request

## Follow-up — 2026-07-04T14:28:02Z

Refine the F&B POS ordering interface (`frontend/app/ban-hang/pos.tsx`) with an orange theme and less rounded (sharp/blocky) styling, ensuring all functionalities operate correctly.

Working directory: `e:\posa\frontend`
Integrity mode: development

## Requirements

### R1. Theme & Color Styling
- Enforce the dominant orange primary color (`#F97316` from `COLORS.primary`) for all interactive elements in `app/ban-hang/pos.tsx` (active category tabs, quantity step control buttons, checkout button, badges, active options, etc.).

### R2. Less Rounded (Sharp) Styling
- Adjust all `borderRadius` properties in `app/ban-hang/pos.tsx` to be 4px or less (ideally 2px or 4px) for cards, buttons, tabs, text inputs, modifers modal container, and image containers, replacing the current highly rounded shapes (12px to 24px).
- Maintain clean, professional, and consistent padding, spacing, and layout alignment.

### R3. Fully Operational Features
- Verify and guarantee all core actions:
  - Quick-adding products to the cart from the grid.
  - Tapping products with modifiers to open the customizable bottom-sheet/modal.
  - Customizing sizes, toppings, and adding kitchen notes in the modal.
  - Adding to cart/updating from modal.
  - Modifying quantity (plus/minus) and removing items in the cart (wide and mobile views).
  - "LƯU BÀN" (Save table) and "T.TOÁN" (Pay) actions calling endpoints properly without errors.
- Ensure TypeScript compilation passes perfectly (`npx tsc --noEmit` returns zero errors).

## Acceptance Criteria

### Styling & Aesthetics
- [ ] Category tabs have border-radius of 4px or less.
- [ ] Product cards and quick-add buttons have border-radius of 4px or less.
- [ ] Stepper controls, text inputs, and badges in both cart sheet and modifier modal have border-radius of 4px or less.
- [ ] Modals (cart sheet, modifier modal) have border-radius of 4px or less on wide/mobile screens.
- [ ] Dominant buttons (Save, Pay, Cancel, Add to Cart) use the orange accent color (#F97316) or success color (#10B981) appropriately, with border-radius of 4px or less.

### Functional Integrity
- [ ] POS screen compiles without TypeScript errors.
- [ ] Flow: Select Product -> Open Modifiers Modal -> Select Size/Topping -> Add -> Update Qty -> Pay/Save works end-to-end.
- [ ] No layout breaks or overlapping text on narrow/wide devices due to style changes.
