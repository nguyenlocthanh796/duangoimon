## 2026-07-04T10:44:44Z

You are a worker tasked with implementing Milestone 1: Global Navigation & Auth Integration in the frontend under `e:\posa\frontend`.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please implement the following four steps:

### 1. Create JWT Decoder (`lib/auth-helpers.ts`)
Write a dependency-free TypeScript file to decode JWT tokens. The backend token encodes the user id ('sub') and expiration ('exp'). Cache the user object return from the login response (which includes the role: admin, cashier, accountant) in localStorage to handle roles if not present in the JWT.

Implement `decodeJwt(token)` and export it. It must be resilient and support UTF-8 decoding.

### 2. Create Auth & Route Guard Context (`lib/context/AuthContext.tsx`)
Create an `AuthProvider` that:
- Stores `token`, `username`, and `userRole`.
- On mount, reads `pos_token` and `pos_user` from `localStorage`.
- If the token is expired (`exp` from JWT is past), clear the token.
- Exposes `login(username, password)` which calls `api.login` (returns `{ access_token, user }`), sets state, and caches metadata in localStorage under `pos_token` and `pos_user`.
- Exposes `logout()` which clears state, calls `api.logout()`, removes items from `localStorage`, and redirects to `/login`.
- Automatically checks route segments (`useSegments` and `useRouter` from `expo-router`) in a `useEffect` to guard routes:
  - If NOT authenticated and segment is not 'login', redirect to `/login`.
  - If authenticated and segment is 'login', redirect to the user's default route:
    - `admin` -> `/quan-ly`
    - `cashier` -> `/ban-hang`
    - `accountant` -> `/ke-toan`
  - If authenticated, check route authorization:
    - Cashier can access ONLY `/ban-hang` and `/ban-hang/*`
    - Accountant can access `/ke-toan`, `/ke-toan/*`, `/quan-ly`, `/quan-ly/*`
    - Admin can access everything.
    - If a user tries to access a route they are unauthorized for, redirect them to their default route.

### 3. Create Sidebar Context (`lib/context/SidebarContext.tsx`)
Create a simple Context Provider that exposes:
- `isOpen` (boolean)
- `openSidebar()`
- `closeSidebar()`
- `toggleSidebar()`

### 4. Refactor `app/_layout.tsx` and Sub-layouts
- In `app/_layout.tsx`: Wrap the Stack navigation with `SafeAreaProvider` (from `react-native-safe-area-context`) and the `AuthProvider` component.
- In `app/ban-hang/_layout.tsx`, `app/quan-ly/_layout.tsx`, and `app/ke-toan/_layout.tsx`: Wrap inside `<SidebarProvider>` and render `<Sidebar />` before the `<Stack>` children.

### 5. Refactor `app/login.tsx`
- Ensure username & password validation (alert if empty before submit).
- Call `login` from the `AuthContext` instead of calling `api.login` directly.
- Catch API errors and display them to the user using `Alert.alert`.

### 6. Refactor `lib/components/Sidebar.tsx`
- Retrieve `userRole` and `logout` from `AuthContext`.
- Retrieve `isOpen` and `closeSidebar` from `SidebarContext`.
- Bind `visible` prop (or read `isOpen` inside Sidebar).
- Dynamically render menu items based on `userRole`:
  - Cashier: "Thu Ngân (POS)" (`/ban-hang`), "Nhà Bếp" (`/ban-hang/kitchen`).
  - Accountant: "Kế Toán" (`/ke-toan`), "Quản Lý" (`/quan-ly`).
  - Admin: "Thu Ngân (POS)" (`/ban-hang`), "Nhà Bếp" (`/ban-hang/kitchen`), "Quản Lý" (`/quan-ly`), "Kế Toán" (`/ke-toan`).
- Add a "Đăng xuất" (Logout) button at the bottom of the sidebar.
- Ensure all tap targets are min 44px.

### 7. Refactor Local Sidebar Triggers in Screens
Verify that pages under `ban-hang`, `quan-ly`, and `ke-toan` use the `useSidebar()` context trigger `openSidebar()` when the menu header button is clicked, and remove local sidebar state duplication.
Specifically check and update:
- `app/ban-hang/index.tsx` (remove the silent login hack at line 67-69!)
- `app/ban-hang/pos.tsx`
- `app/ban-hang/payment.tsx`
- `app/ban-hang/kitchen.tsx`
And ensure pages in `quan-ly` and `ke-toan` have header menu buttons that call `openSidebar()`.

Verify that your changes compile and run:
1. Run typescript compiler: `npx tsc --noEmit` in `e:\posa\frontend`
2. Run build: `npm run build` (or similar webpack build) to check for compile errors.

Document all created/edited files, and report verification command outputs.
