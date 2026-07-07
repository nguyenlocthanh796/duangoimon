## 2026-07-04T03:58:22Z
Examine `lib/context/AuthContext.tsx`, `lib/components/Sidebar.tsx`, and `tsconfig.json` in `e:\posa\frontend` to plan critical fixes carried over from Milestone 1.

Propose a detailed implementation strategy for:
1. Fixing the Flash of Unauthorized Content (FOUC): Update `AuthContext.tsx` to display a clean loading spinner (ActivityIndicator) while `isInitialized` is false, rather than rendering children screens.
2. Securing the Auth Guard against unknown roles and bypasses:
   - Handle the roles `admin`, `manager`, `cashier`, `accountant`, and `kitchen` explicitly.
   - Map `manager` to have full access (same as `admin`).
   - Map `kitchen` to redirect to `/ban-hang/kitchen` on login and restrict `kitchen` role to only access `/ban-hang/kitchen` routes.
   - Implement a default-deny policy (log out or force redirect to `/login` if role is unrecognized).
3. Local Storage JSON Safety: Handle invalid/corrupt JSON strings in `pos_user` storage.
4. Orientation changes: Ensure `Sidebar.tsx` and custom screen widths handle device orientation changes dynamically (using `useWindowDimensions()` or listener hooks).
5. `tsconfig.json`: Exclude the `"dist"` folder to prevent compiler output checks from failing.

Write your report to `e:\posa\.agents\explorer_m2_3\handoff.md`.
