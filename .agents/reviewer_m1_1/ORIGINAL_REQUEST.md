## 2026-07-04T03:53:12Z

Review the changes made in Milestone 1 (Global Navigation & Auth Integration) under `e:\posa\frontend`.
Review files:
- `lib/auth-helpers.ts`
- `lib/context/AuthContext.tsx`
- `lib/context/SidebarContext.tsx`
- `app/_layout.tsx`
- `app/login.tsx`
- `lib/components/Sidebar.tsx`
- Sub-layouts (`app/ban-hang/_layout.tsx`, `app/quan-ly/_layout.tsx`, `app/ke-toan/_layout.tsx`)
- Screens (`app/ban-hang/index.tsx`, `pos.tsx`, `payment.tsx`, `kitchen.tsx`)

Verify that:
1. Route guards correctly handle redirect flow for authenticated/unauthenticated states and roles.
2. Sidebar items render correctly based on user role and trigger logout.
3. Code layout is correct, types check cleanly, and there are no lint issues.
4. SafeAreaView wrapping and 44px minimum touch targets are applied correctly.

Write your review report to `e:\posa\.agents\reviewer_m1_1\handoff.md`.
