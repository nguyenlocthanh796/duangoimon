# Project Plan: POS Refinement (app/ban-hang/pos.tsx)

## Overview
The goal is to refine the POS ordering screen (`frontend/app/ban-hang/pos.tsx`) to enforce:
1. Dominant orange primary color (`#F97316` or `COLORS.primary`) for all interactive elements.
2. Less rounded (sharp/blocky) styling, keeping all `borderRadius` <= 4px.
3. Functional completeness and correct operations of all POS ordering/cart interactions.
4. Clean TypeScript compilation with no errors.

## Milestones & Work Breakdown
We decompose the project into the following milestones:

### Milestone 1: Exploration and Codebase Analysis
- Inspect the file `frontend/app/ban-hang/pos.tsx` in detail.
- Identify all style elements using rounded borders: category tabs, product cards, stepper controls, text inputs, badges, and modals.
- Identify styling blocks where color needs to be unified to `#F97316` or success color `#10B981` appropriately.
- Check typescript compilation status and existing compiler options.

### Milestone 2: Styling and Theme Refinement
- Update `frontend/app/ban-hang/pos.tsx` styles.
- Change border radius definitions (`borderRadius: X`) to be 4px or less.
- Ensure buttons (Save, Pay, Cancel, Add to Cart) use appropriate primary orange and success colors.
- Keep layout blocky and clean.

### Milestone 3: Functional Verification and TypeScript Compilation
- Verify flow: select item -> select sizes/toppings -> add to cart -> update qty -> save table / pay.
- Run `npx tsc --noEmit` to verify type safety.
- Fix any TypeScript type mismatch issues.

## Execution Strategy
1. **Explore**: Spawn a read-only Explorer subagent (`teamwork_preview_explorer`) to analyze `pos.tsx` styling and typescript status and output an action plan.
2. **Implement**: Spawn a Worker subagent (`teamwork_preview_worker`) to implement the style modifications and fix typescript issues.
3. **Verify**: Spawn Reviewer subagent (`teamwork_preview_reviewer`) to verify that styles align with requirements and functional integrity works correctly.
