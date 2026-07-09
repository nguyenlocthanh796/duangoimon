# Plan: UI refinement for iOS/Apple devices (iPhone & iPad)

This plan details the steps required to optimize the typography, styling, brand color usage, and touch targets across selected screens (excluding sales module).

## Target Scope
- `app/login.tsx`
- All screens under `app/ke-toan/*`
- All screens under `app/quan-ly/*`
- `lib/components/Sidebar.tsx`
- `lib/theme/typography.ts`

## Exclusions
- Strictly do NOT modify any file under `app/ban-hang/*` or any sales-related component.

## Milestones

### Milestone 1: Codebase Audit & Exploration
- Spawn `teamwork_preview_explorer` to analyze all target files.
- Document:
  1. Excessive bolding and font weight usage in target screens (both typography token usage and inline `fontWeight: 'bold'` styles).
  2. Sub-44pt touch targets for interactive elements (buttons, inputs, clickable icons).
  3. Non-standard border radiuses (e.g. inline `borderRadius: 8/12/24` or Tailwind `rounded-lg/2xl/3xl`).
  4. Brand orange (`colors.brand.primary`) and neutral background usage.

### Milestone 2: Refactoring Typography & Design Tokens
- Modify `lib/theme/typography.ts` to:
  - Reduce excessive bolding (replace 800/900/Bold with 600/500/Medium for labels, data tables, descriptions).
  - Slightly increase typography scale size for better readability on iOS devices.
- Verify typography exports compile properly.

### Milestone 3: UI Refinement - Login Screen & Sidebar
- Modify `app/login.tsx` and `lib/components/Sidebar.tsx`.
- Adjust touch targets to >= 44x44 pt.
- Fix all border-radiuses to 4px using `shape.radius.md` or equivalent style properties.
- Use `colors.brand.primary` as the primary accent color.
- Ensure proper hover and click styling.

### Milestone 4: UI Refinement - Accounting Module (`app/ke-toan/*`)
- Modify `app/ke-toan/index.tsx`, `invoices.tsx`, and `_layout.tsx` (if any).
- Apply typography updates (reduce excessive bolding, use correct sizes).
- Align border-radiuses to 4px.
- Enforce touch targets >= 44x44 pt.
- Ensure minimalist, clean layout with orange accents and neutral backgrounds.

### Milestone 5: UI Refinement - Management Module (`app/quan-ly/*`)
- Modify all screens under `app/quan-ly/` (index.tsx, menu.tsx, tables.tsx, users.tsx, reports.tsx, etc.).
- Update table headers, inputs, action buttons, table cells to have correct font weights and scale.
- Align border-radiuses to 4px.
- Enforce touch targets >= 44x44 pt.

### Milestone 6: Verification & Review
- Spawn `teamwork_preview_challenger` / `teamwork_preview_reviewer` to review code changes.
- Ensure TypeScript compilation passes perfectly (`npx tsc --noEmit` in `e:\posa\frontend`).
- Verify no styling anomalies or layout breakage.
- Perform Forensic Audit logic check.
