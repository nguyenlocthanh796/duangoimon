# Original User Request

## Initial Request — 2026-07-04T03:39:02Z

Build a professional F&B POS (Point-of-Sale) **React Native / Expo** app targeting iPad & iPhone for restaurant operations — covering table management, ordering, kitchen display, management dashboards, and accounting. All 3 modules (bán hàng, quản lý, kế toán) are built in parallel. Target: functional prototype with clean, professional UI (no animation required). UI libraries and chart libraries are welcome; folder refactoring is allowed.

Working directory: `e:\posa\frontend`
Integrity mode: development

---

## Context (Existing Codebase)

- **Stack**: Expo SDK 57, expo-router v4, React Native 0.86, TypeScript
- **Backend**: FastAPI at `http://localhost:8000/api/v1` (running, CORS enabled)
- **Auth**: JWT Bearer token via `POST /auth/login` → stored in `localStorage`; demo accounts: `admin/admin123`, `cashier/cashier123`, `accountant/accountant123`
- **Existing screens** (functional but minimal UI — rewrite UI while keeping logic):
  - `app/login.tsx` — login screen
  - `app/ban-hang/index.tsx` — table selection
  - `app/ban-hang/pos.tsx` — ordering / cart / modifier modal (459 lines)
  - `app/ban-hang/payment.tsx` — payment screen
  - `app/ban-hang/kitchen.tsx` — kitchen display (WebSocket `/ws/kitchen`)
  - `app/quan-ly/` — management: dashboard, menu, tables, users, reports
  - `app/ke-toan/` — accounting: transactions, invoices
  - `lib/api.ts` — HTTP client with JWT helper
  - `lib/theme.ts` — design tokens: primary `#F97316`, success `#10B981`, danger `#EF4444`, bg `#F8FAFC`

---

## Requirements

### R1. Bán hàng — Sales & POS (Priority: High)

Redesign all screens under `app/ban-hang/` with professional F&B POS UX:

- **Table map** (`index.tsx`): floor-plan grid with color-coded status (empty=green, occupied=orange, reserved=gray); shows table name and area; tapping navigates to POS with table context.
- **POS / Ordering** (`pos.tsx`): on iPad show split-pane (product grid left, cart right); on phone show tabs (Menu / Cart); category filter tabs; product cards with name and price; modifier bottom-sheet for size, topping, quantity, quick notes; real-time cart subtotal.
- **Payment** (`payment.tsx`): payment method selector (cash / card / QR / bank transfer); numpad for cash received; auto-calculated change; confirm button calls `POST /ban-hang/payments`; returns to table map on success.
- **Kitchen Display** (`kitchen.tsx`): Kanban board with columns Pending / In-Progress / Done; auto-refresh via WebSocket or polling; order cards show table name, items, time elapsed.

### R2. Quản lý — Management (Priority: High)

Redesign all screens under `app/quan-ly/` with consistent design language:

- **Dashboard** (`index.tsx`): stat cards (revenue today, order count, table occupancy rate, low-stock alerts); top-5 products; data from `GET /quan-ly/dashboard`.
- **Menu management** (`menu.tsx`): searchable product list; add / edit product form with fields: code, name, category, price, cost_price, unit, is_active; calls `POST /quan-ly/products` and `PUT /quan-ly/products/:id`.
- **Table management** (`tables.tsx`): CRUD list of tables (name, area, capacity, status); inline edit.
- **User management** (`users.tsx`): list users by role; create/update user with role selector.
- **Reports** (`reports.tsx`): bar chart of last-7-day daily revenue; top-selling products table; data from `GET /quan-ly/reports/sales`. Use a chart library (e.g., victory-native, react-native-chart-kit).

### R3. Kế toán — Accounting (Priority: Medium)

Redesign screens under `app/ke-toan/`:

- **Transactions** (`index.tsx`): list with filter tabs (All / Thu / Chi); amount color-coded (green=thu, red=chi); create new transaction form (type, category, amount, note).
- **Invoices** (`invoices.tsx`): list with status badge (moi / da_xuat); create invoice linked to an order (order_id, buyer_name, vat_rate); "Export" action calls `POST /ke-toan/invoices/:id/export`.

### R4. Global Design System & Navigation

- Use the existing design tokens from `lib/theme.ts`. Extend them as needed.
- Navigation: drawer sidebar for role-based module access (cashier sees bán hàng only; admin/manager sees all; accountant sees kế toán + quản lý).
- All screens must be `SafeAreaView`-wrapped and touch-target optimized (min 44px tap targets).
- Every list screen must have: loading skeleton or spinner while fetching; empty state message when list is empty.
- API errors must be surfaced to the user (Alert or toast), not silently swallowed.
- May install additional npm packages (UI kits, chart libraries, icon sets) as needed.
- May refactor file/folder structure if it improves maintainability.

### R5. API Integration

All screens call the real backend — no hardcoded mock data in production code paths.

Key endpoints:
```
POST   /auth/login                     → { access_token }
GET    /ban-hang/tables                → [{ id, name, area, capacity, status }]
GET    /ban-hang/products              → [{ id, code, name, category, price, ... }]
POST   /ban-hang/orders               → creates order
POST   /ban-hang/payments             → processes payment
WS     ws://localhost:8000/ws/kitchen → kitchen real-time events
GET    /quan-ly/dashboard             → { today_revenue, total_orders, table_stats, top_products }
GET    /quan-ly/products              → [...]
POST   /quan-ly/products              → create
PUT    /quan-ly/products/:id          → update
GET    /quan-ly/tables                → [...]
POST   /quan-ly/tables                → create
PUT    /quan-ly/tables/:id            → update
GET    /quan-ly/users                 → [...]
POST   /quan-ly/users                 → create
PUT    /quan-ly/users/:id             → update
GET    /quan-ly/reports/sales         → { daily: [...], top_products: [...] }
GET    /ke-toan/transactions          → [...]
POST   /ke-toan/transactions          → create
GET    /ke-toan/invoices              → [...]
POST   /ke-toan/invoices              → create
POST   /ke-toan/invoices/:id/export   → mark exported
```

---

## Acceptance Criteria

### Bán hàng — Functional
- [ ] Table map renders all tables from API with correct status color
- [ ] Tapping a table opens POS screen showing that table's name in the header
- [ ] Adding a product and pressing Confirm sends `POST /ban-hang/orders` successfully
- [ ] Payment screen allows selecting a method and completing payment; table map refreshes after
- [ ] Kitchen screen displays order cards grouped into columns; does not crash

### Quản lý — Functional
- [ ] Dashboard loads and displays at least 3 stat cards with live API data (not hardcoded)
- [ ] Product list renders, search by name filters the result
- [ ] Adding a product via the form creates it via API and it appears in the list without full reload
- [ ] Reports screen renders a visible chart with axes and at least 1 bar

### Kế toán — Functional
- [ ] Transaction list loads from API and filter tabs (thu / chi) actually filter the list
- [ ] Create transaction form submits to API and new item appears in list

### Design Quality
- [ ] No screen shows raw JSON, `undefined`, or error stack traces to the user
- [ ] Every list screen has a visible loading state while fetching
- [ ] Every list screen has a visible empty state when no data
- [ ] API errors surface as user-visible messages (Alert or toast)
- [ ] Login screen validates empty fields before submit

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

## Follow-up — 2026-07-04T14:42:11Z

Polishing the F&B POS ordering interface (`frontend/app/ban-hang/pos.tsx`) to be glossy/shiny and look like a native iPad/iPhone app, and fully completing all POS functionalities (such as loading pre-existing orders for occupied tables).

Working directory: `e:\posa\frontend`
Integrity mode: development

## Requirements

### R1. Native iPad & iPhone Layout (iOS Look & Feel)
- Maintain and enhance a true native split-pane layout on iPad (Product grid left, Cart panel right with clean, crisp borders) and an intuitive tab/sheet switcher on iPhone.
- Optimize iOS safe areas, native typography sizes, and standard touch target sizing (minimum 44px).

### R2. Glossy & Shiny UI (Sáng bóng hơn)
- Implement subtle gradients (e.g., using `expo-linear-gradient` if appropriate or CSS linear gradients/shadows) to give buttons and panels a semi-gloss/glassmorphic look.
- Use sharp border-radius (<= 4px) combined with subtle, high-quality shadows (`shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.15, shadowRadius: 3`) and thin light borders (`borderColor: '#E2E8F0'`, or semi-transparent white borders on colored components) to create a polished, glass-like reflection effect.
- Keep the dominant color scheme as orange (`#F97316` / `#EA580C`) but style it with premium glossiness.

### R3. Complete & Advanced POS Features
- **Load pre-existing orders**: If a table is already occupied (`status: 'co_khach'`), the POS screen must fetch its active unpaid order from the backend and populate the cart, allowing the cashier to add more items to the existing order rather than creating a new one.
- **Save table**: Tapping "LƯU BÀN" must update the active order with new items, calling `PUT /ban-hang/orders/:id` (if order exists) or `POST /ban-hang/orders` (if new order), and navigate back.
- **Pay**: Tapping "T.TOÁN" must submit/update the order and transition to the payment screen with correct order parameters.

### R4. Technical Integrity
- Ensure TypeScript compilation passes perfectly (`npx tsc --noEmit` returns zero errors).
- Clean up any unused state/variables or styling warnings.

## Acceptance Criteria

### iOS Native & Glossy Aesthetics
- [ ] Category tabs, product cards, and control buttons have border-radius <= 4px and a glossy/shiny effect (subtle gradient/shadow overlays).
- [ ] Cart item count badges and modifier tuning badges are clearly visible with sharp edges.
- [ ] Modal views and cart panels feel native to iOS, using crisp borders and clean spacing.

### Functional Completeness
- [ ] Selecting an occupied table loads the current items from the server into the cart.
- [ ] Modifying/Adding items and pressing "LƯU BÀN" updates the existing order on the server without duplication.
- [ ] Tapping "T.TOÁN" passes the existing order ID (or new order ID) to the payment screen.
- [ ] Zero TypeScript compiling errors.

## Follow-up — 2026-07-04T14:46:46Z

The user has manually added the backend endpoints and frontend API methods for order updating and active order retrieval:
- Backend:
  - `GET /api/v1/ban-hang/orders/active-table/{table_id}`: Retrieves the active unpaid order for a table.
  - `PUT /api/v1/ban-hang/orders/{order_id}`: Updates an existing unpaid order with new items and recalculates total.
- Frontend (`lib/api.ts`):
  - `api.getActiveOrderForTable(tableId)`: calls the GET endpoint.
  - `api.updateOrder(orderId, data)`: calls the PUT endpoint.

These methods should be used when implementing pre-existing order loading and table saving in `app/ban-hang/pos.tsx`.
