# Project: apple_ui_refine

## Architecture
- Module/package boundaries, data flow, shared interfaces:
  - Theme definitions in `lib/theme/` (colors, shape, typography)
  - Screens: Login, Kế toán (Accounting), Quản lý (Management), and Sidebar (Navigation)
  - Interactive elements: Pressables, Touchables, Buttons, Inputs, Icons.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Codebase Audit & Exploration | Find all elements violating rules | none | IN_PROGRESS (Remediation: e0b033af-e84f-489e-9ed9-848f709fbf0d) |
| 2 | M2: Refactor Typography & Theme | Modify typography.ts | M1 | DONE |
| 3 | M3: Update Login & Sidebar | Refine login.tsx and Sidebar.tsx | M2 | DONE |
| 4 | M4: Update Accounting Module | Refine app/ke-toan/* | M2 | DONE |
| 5 | M5: Update Management Module | Refine app/quan-ly/* | M2 | DONE |
| 6 | M6: Compilation & Verification | Run build/compile checks, Review/Audit | M3, M4, M5 | FAILED (Integrity Violation Veto) |

## Interface Contracts
- `lib/theme/typography.ts` exports `font` and `scale`. All target screens should use `font` style tokens rather than hardcoding weight/size.
