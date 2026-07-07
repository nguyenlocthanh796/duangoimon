# Project: F&B POS App (POS Pro)

## Architecture
- **Framework**: Expo SDK 57, Expo Router v4, React Native 0.86, TypeScript.
- **Routing**: Expo Router file-based routing (`app/ban-hang`, `app/quan-ly`, `app/ke-toan`).
- **State & Communication**: HTTP client in `lib/api.ts` utilizing JWT tokens stored in localStorage. Real-time updates for kitchen using WebSockets (`ws://localhost:8000/ws/kitchen`).
- **Global UI components**: Sidebar drawer layout (`lib/components/Sidebar.tsx`) with role-based routing and a global menu button in each page. Design system tokens in `lib/theme.ts`.

## Code Layout
- `app/` - Application screens
  - `login.tsx` - Login and authentication check
  - `ban-hang/` - Point of Sale flow (tables, checkout, kitchen)
  - `quan-ly/` - Dashboard, menu configuration, tables CRUD, user CRUD, sales reports
  - `ke-toan/` - Transactions and invoicing
- `lib/` - Shared services and utilities
  - `api.ts` - REST client with helper methods
  - `theme.ts` - Styling colors, typography, formatters
  - `components/` - Global components (Sidebar, etc.)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Navigation & Auth Integration | Enhance login, decode role from token, build role-based Sidebar layout | None | DONE |
| 2 | Sales & POS Module | Redesign POS tables map, order cart, modifier modal, payment flow, kitchen display | M1 | IN_PROGRESS (worker: teamwork_preview_worker) |
| 3 | Management Module | Redesign Dashboard stats, menu CRUD, tables CRUD, user CRUD, reports page with sales chart | M1 | PLANNED |
| 4 | Accounting Module | Redesign transactions list with filter tabs, create invoice, and export invoice actions | M1 | PLANNED |
| 5 | Verification & Hardening | Safearias, min-44px targets, loading indicators, API error handling | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Auth Token Payload
- Extracted JWT claims:
  - `sub`: username (e.g. "admin", "cashier", "accountant")
  - `role`: user role ("admin", "cashier", "accountant")
  - `exp`: expiration timestamp

### Role-Based Access Control (RBAC)
- Cashier: Has access ONLY to Bán hàng (`/ban-hang/*` and `/ban-hang/kitchen`).
- Accountant: Has access to Kế toán (`/ke-toan/*`) and Quản lý (`/quan-ly/*`).
- Admin/Manager: Has full access to all modules.
