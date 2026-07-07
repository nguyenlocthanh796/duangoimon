# Project: POS Refinement and Completeness

## Architecture
- **Frontend**: React Native / Expo application under `frontend/`
- **Backend**: FastAPI web server under `backend/`
- **Key Modules affected**:
  - `frontend/app/ban-hang/pos.tsx` (POS ordering screen)
  - `frontend/lib/api.ts` (API Client helper)
  - `frontend/app/ban-hang/index.tsx` (Table selection screen)
  - `frontend/app/ban-hang/payment.tsx` (Payment processing screen)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Investigate existing endpoints, styling patterns, and codebase structure. | None | DONE |
| 2 | POS UI refinement | Polish POS interface to be glossy, shiny, <=4px border-radius, iOS native look. | M1 | DONE |
| 3 | POS functional completeness | Fetch existing order for occupied tables, implement LƯU BÀN (POST/PUT order) and T.TOÁN. | M1, M2 | DONE |
| 4 | Verification & TS compile | Verify TypeScript compilation (`npx tsc --noEmit`) and perform integrity checks. | M3 | IN_PROGRESS (verification group) |

## Interface Contracts
### Order API ↔ POS Screen
- `GET /ban-hang/orders?status=moi` or filtering orders by table to find active orders.
- `POST /ban-hang/orders`: Create a new order when table has no active order.
- `PUT /ban-hang/orders/:id` (if supported) or check how existing order updates are processed.
- `POST /ban-hang/payments`: Processes payment for order.

## Code Layout
- Frontend code root: `e:\posa\frontend`
- Backend code root: `e:\posa\backend`
- Target file for editing: `e:\posa\frontend\app\ban-hang\pos.tsx`
