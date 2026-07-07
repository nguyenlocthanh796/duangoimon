# Project Context: POS App React Native / Expo

## System Stack & Environment
- **Framework**: Expo SDK 57, Expo Router v4, React Native 0.86, TypeScript.
- **Backend API**: `http://localhost:8000/api/v1`
- **Auth Credentials**:
  - `admin` / `admin123` (Admin)
  - `cashier` / `cashier123` (Cashier)
  - `accountant` / `accountant123` (Accountant)
- **Design Tokens (`lib/theme.ts`)**:
  - Primary: `#F97316` (Orange)
  - PrimaryHover: `#EA580C`
  - Success: `#10B981` (Green)
  - Warning: `#F59E0B` (Amber)
  - Danger: `#EF4444` (Red)
  - BG: `#F8FAFC` (Slate)
  - Card: `#FFFFFF`
  - Text: `#1E293B`
  - Muted: `#94A3B8`
  - Border: `#E2E8F0`

## Screens to Redesign & Target Files
1. **Auth**:
   - `app/login.tsx` (Login Screen)
2. **Sales (Bán Hàng)**:
   - `app/ban-hang/index.tsx` (Table selection map)
   - `app/ban-hang/pos.tsx` (Product list / order / modifiers / cart)
   - `app/ban-hang/payment.tsx` (Payment methods, numpad, API)
   - `app/ban-hang/kitchen.tsx` (Kanban kitchen board, WebSocket)
3. **Management (Quản Lý)**:
   - `app/quan-ly/index.tsx` (Dashboard stats)
   - `app/quan-ly/menu.tsx` (Product list + CRUD form)
   - `app/quan-ly/tables.tsx` (Table CRUD + inline edit)
   - `app/quan-ly/users.tsx` (User CRUD + role selector)
   - `app/quan-ly/reports.tsx` (Daily revenue chart + top selling)
4. **Accounting (Kế Toán)**:
   - `app/ke-toan/index.tsx` (Transactions + filters)
   - `app/ke-toan/invoices.tsx` (Invoices list + export actions)

## Key Technical Details
- WebSocket url for kitchen updates: `ws://localhost:8000/ws/kitchen`
- Auth token is stored in localStorage under `'pos_token'`.
- All screens must use `SafeAreaView` from `react-native-safe-area-context` to avoid layout overlapping.
- Tap targets must be at least 44px for accessibility.
- Surfacing API errors via `Alert.alert` or custom toasts.
- Rendering spinners or skeletons during API requests.
- Showing empty states when a list is empty.
