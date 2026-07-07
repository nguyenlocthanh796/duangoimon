## 2026-07-04T03:53:12Z

Review the changes made in Milestone 1 (Global Navigation & Auth Integration) under `e:\posa\frontend` independently.
Review files:
- `lib/auth-helpers.ts`
- `lib/context/AuthContext.tsx`
- `lib/context/SidebarContext.tsx`
- `app/_layout.tsx`
- `app/login.tsx`
- `lib/components/Sidebar.tsx`
- Sub-layouts (`app/ban-hang/_layout.tsx`, `app/quan-ly/_layout.tsx`, `app/ke-toan/_layout.tsx`)
- Screens (`app/ban-hang/index.tsx`, `pos.tsx`, `payment.tsx`, `kitchen.tsx`)

Provide an independent verification of safety bounds, potential runtime exceptions, edge cases (e.g. invalid/corrupt JWT token, empty/null localStorage values), and TypeScript types correctness.

Write your review report to `e:\posa\.agents\reviewer_m1_2\handoff.md`.
