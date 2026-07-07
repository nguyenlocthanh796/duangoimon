# Milestone 2 Implementation Requirements: Sales, POS & Security Hardening

You are a worker tasked with implementing the UI redesigns and technical hardening for Milestone 2.
You must read the following Explorer handoff reports for details:
1. `e:\posa\.agents\explorer_m2_1\handoff.md` (Table Map & POS Ordering)
2. `e:\posa\.agents\explorer_m2_2\handoff.md` (Payment & Kitchen display)
3. `e:\posa\.agents\explorer_m2_3\handoff.md` (Auth guards, Sidebar, and tsconfig.json)

## Target Files to Modify:
1. `lib/context/AuthContext.tsx`
2. `lib/components/Sidebar.tsx`
3. `tsconfig.json`
4. `app/ban-hang/index.tsx`
5. `app/ban-hang/pos.tsx`
6. `app/ban-hang/payment.tsx`
7. `app/ban-hang/kitchen.tsx`

## Core Implementation Steps:
- Apply FOUC fix, secure Auth Guards (all roles check, manager role access, kitchen role redirect), local storage safety, orientation hooks (`useWindowDimensions`), and exclude `dist` in `tsconfig.json`.
- Redesign Table Map with floor-plan areas selector, status color-coding (light backgrounds/borders matching theme), and 44px tap targets.
- Redesign POS screen with iPad split-pane, mobile tabs, category tabs, bottom-sheet modifier, dynamic delta price labels, item merging in cart, 44px targets, and serialize `options` in `createOrder` API.
- Redesign Payment screen with method selector, cash received numpad, change calculator, precise price formatting (no rounding), API payment confirm, missing orderId error banner, and 44px targets.
- Redesign Kitchen Display screen with 3 columns Kanban layout (Pending, In-Progress, Done), WebSocket connection status, HTTP fallback polling, connection leak fix, and actual order item status completion API calls.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-07-04T04:00:37Z
<USER_REQUEST>
You are worker_m2, a developer worker agent.
Your working directory is: e:\posa\.agents\worker_m2

Your tasks:
1. Read the requirements in e:\posa\.agents\worker_m2\ORIGINAL_REQUEST.md.
2. Read the analysis and implementation proposals in the Explorer handoff reports:
   - e:\posa\.agents\explorer_m2_1\handoff.md (Table Map & POS Ordering index.tsx/pos.tsx)
   - e:\posa\.agents\explorer_m2_2\handoff.md (Payment & Kitchen payment.tsx/kitchen.tsx)
   - e:\posa\.agents\explorer_m2_3\handoff.md (AuthContext, Sidebar, tsconfig.json)
3. Implement all proposed designs, layout adjustments, and security guards in:
   - e:\posa\frontend\lib\context\AuthContext.tsx
   - e:\posa\frontend\lib\components\Sidebar.tsx
   - e:\posa\frontend\tsconfig.json
   - e:\posa\frontend\app\ban-hang\index.tsx
   - e:\posa\frontend\app\ban-hang\pos.tsx
   - e:\posa\frontend\app\ban-hang\payment.tsx
   - e:\posa\frontend\app\ban-hang\kitchen.tsx
4. Verify your changes:
   - Run type checking: `npx tsc --noEmit` from e:\posa\frontend
   - Run unit tests: `npx tsx --test lib/__tests__/auth-helpers.test.ts`
   - Run bundler check: `npx expo export`
   - Document all verification results in your report.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your completion report to e:\posa\.agents\worker_m2\handoff.md and notify the parent orchestrator using send_message.
</USER_REQUEST>

## 2026-07-04T04:01:22Z
<USER_REQUEST>
You are a worker tasked with implementing Milestone 2: Sales & POS Module in the project under `e:\posa\frontend` and `e:\posa\backend`.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please implement the following changes:

### 1. Backend: Order Status Update Endpoint (`backend/app/api/v1/ban_hang/orders.py`)
- Add a PUT `/ban-hang/orders/{order_id}/status` endpoint.
- It must retrieve the order, validate and update its status (`status: str`), commit to the database, and broadcast the `"order_updated"` event via websocket:
  ```python
  await ws_manager.broadcast("kitchen", {
      "event": "order_updated",
      "order": {"id": str(order.id), "status": order.status},
  })
  ```
- Run `docker compose down` and `docker compose up --build -d` in `e:\posa` to rebuild and apply the backend changes.

### 2. Design System & Helper Updates (`lib/theme.ts`)
- In `lib/theme.ts`, add a helper function `formatPriceFull(v: number)` that outputs exact numbers with thousands separators and the currency symbol (e.g. `14.500đ` or `1,500đ`) without any dynamic abbreviation to `k`. Use this on the payment screen.

### 3. Auth Guard & Sidebar Hardening (`lib/context/AuthContext.tsx`, `lib/components/Sidebar.tsx`, `tsconfig.json`)
- In `AuthContext.tsx`:
  - Show a full-screen `<ActivityIndicator size="large" />` when `!isInitialized` is true to prevent Flash of Unauthorized Content (FOUC).
  - Wrap `localStorage.getItem('pos_user')` in a try-catch. If JSON parsing throws an exception, catch it, log it, clear `pos_token` and `pos_user`, and reset the state.
  - Implement a default-deny check: if `userRole` is not one of `['admin', 'manager', 'cashier', 'accountant', 'kitchen']`, call `logout()`.
  - Redirection logic:
    - Map `manager` to `/quan-ly` (with same unrestricted access as `admin`).
    - Map `kitchen` to `/ban-hang/kitchen` on login and restrict the `kitchen` role strictly to routes matching `/ban-hang/kitchen` (redirect otherwise).
- In `Sidebar.tsx`:
  - Retrieve dynamic screen dimensions using `useWindowDimensions()`. Calculate `sidebarWidth = Math.min(300, screenWidth * 0.8)` dynamically. Ensure `translateX` closed-state boundaries are synchronized upon screen orientation change.
  - Dynamically render menu items based on the new `kitchen` and `manager` roles (manager sees all links; kitchen sees only "Nhà bếp").
- In `tsconfig.json`:
  - Add `"dist"` to the `"exclude"` array to prevent build declaration failures.

### 4. Table Map Redesign (`app/ban-hang/index.tsx`)
- Retrieve window dimensions dynamically using `useWindowDimensions()`.
- Replace the wrap-view layout inside the ScrollView with a native `<FlatList>` utilizing a dynamic `key={numCols}` to avoid grid alignment glitches on device rotation.
- Table cards styling: apply full-card background/border styling based on `STATUS_CONFIG` using centralized `COLORS` from `lib/theme.ts` (`trong` = soft green, `co_khach` = soft orange, `da_dat` = soft gray).
- Sort or group tables by area (e.g. Floor 1, Terrace) to facilitate user navigation.
- Ensure all touch targets are at least 44px (using explicit styling or `hitSlop`).

### 5. POS Ordering screen (`app/ban-hang/pos.tsx`)
- Retrieve window dimensions dynamically using `useWindowDimensions()`.
- Maintain iPad split-pane (product grid left, cart right) and Phone layout (tabs for Menu and Cart).
- Category tabs: render clean filter tabs using `COLORS`.
- Product cards: render with name and price. Touch target for the "Quick add" button must be at least 44px.
- Modifier Bottom Sheet:
  - Sizes pricing delta should calculate relative to the base item's price (`s.price - modalItem.price`) dynamically instead of using hardcoded rules.
  - Implement deep-equal modifier checking in `addToCartFromModal`: if an item with the same product ID, size, toppings array, and note already exists in the cart, merge them by updating the quantity. Otherwise, add as a new row.
- Cart ordering serialization: inside `handlePay`, verify that the options (selectedSize, selectedToppings) are fully preserved in the payload sent to the backend `api.createOrder` API call (passed in the `options` field).
- Stepper buttons and cart delete buttons touch targets must be at least 44px.

### 6. Payment Screen Redesign (`app/ban-hang/payment.tsx`)
- Cash Received Numpad: Prevent leading zeros (ignore `0` or `000` if the input is empty or `"0"`) and limit the absolute character length to 12 digits.
- Use `formatPriceFull` to display the exact numeric cash input and calculated change.
- Catch `api.processPayment` errors: remove the optimistic success fallback. Display the API error to the user using `Alert.alert`.
- Order validation guard: if `orderId` is missing, display a warning banner and disable the confirm button.
- Ensure all touch targets are at least 44px.

### 7. Kitchen Display Screen Redesign (`app/ban-hang/kitchen.tsx`)
- Restrict kitchen screen access to `admin`, `manager`, and `kitchen` roles (redirect other roles).
- Render Kanban columns: Pending (`cho_xu_ly`), In-Progress (`dang_lam`), Completed/Done (`hoan_thanh`).
- Connect WebSocket or polling to refresh the orders list.
- Kitchen order completion: when a user clicks "Bắt đầu làm" or "Xong", trigger the PUT `/ban-hang/orders/{order_id}/status` API call with the correct status (`dang_lam` or `hoan_thanh` / `completed`) to persist kitchen board changes to the database.
- Ensure all touch targets are at least 44px.

Verify compilation and runs:
1. Run typescript compiler: `npx tsc --noEmit` in `e:\posa\frontend`
2. Run bundler export: `npx expo export` in `e:\posa\frontend`
3. Run test suites:
   - `npx tsx --test lib/__tests__/auth-helpers.test.ts`
   - `npx tsx --test lib/__tests__/security-challenge.test.ts` (make sure security-challenge test is updated or added if it is missing).

Document all modified files, test command outputs, and report back.
</USER_REQUEST>

