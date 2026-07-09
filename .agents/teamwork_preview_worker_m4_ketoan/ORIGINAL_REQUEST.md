## 2026-07-09T03:33:30Z

<USER_REQUEST>
You are a codebase implementer. Your working directory is `e:\posa\.agents\teamwork_preview_worker_m4_ketoan`.
Your task is to optimize the styling, typography, touch targets, and hover feedback for the accounting module screens:
1. `app/ke-toan/index.tsx`
2. `app/ke-toan/invoices.tsx`
3. `app/ke-toan/_layout.tsx`

Specific changes:
- Exclusions:
  - Absolutely do NOT modify any file under `app/ban-hang/*` or sales-related components.
- Bolding:
  - Find all manual bolding overrides (e.g. `fontWeight: '800'`, `fontWeight: '900'`) on amount texts and stat counts, and reduce them to `fontWeight: '700'`, `'600'`, or let them inherit the design token weight (now 600 or 500 in `typography.ts`).
- Touch Targets:
  - Ensure all buttons, input fields, filter chips, and clickable list rows have a touch target of at least 44x44 pt.
  - Header buttons like `addBtn` (currently height 38) -> change to height 44.
  - Filter chips / tabs (currently paddingVertical 6) -> change to `minHeight: 44` or add padding to guarantee >= 44pt height.
  - `exportBtn` (currently minHeight 30) -> change to `minHeight: 44` or `height: 44`.
  - Table list rows (currently paddingVertical 11, yielding ~38pt height) -> increase `paddingVertical` to `13` or `14` (yielding >=44pt height), or set `minHeight: 44`.
- Hover & Pointer States:
  - Add pointer cursor support and hover states to all interactive buttons, filter chips, and list rows. Track hover state in React component hooks (e.g. `onMouseEnter` / `onMouseLeave`) and modify backgrounds or opacity to give responsive desktop feedback.
- Border Radius:
  - Ensure all container, button, and card border radiuses are set to 4px using `shape.radius.md` or equivalent shape tokens.
- Compilation:
  - Verify that the code compiles cleanly (`npx tsc --noEmit`) and there are no syntax or type errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

</USER_REQUEST>
