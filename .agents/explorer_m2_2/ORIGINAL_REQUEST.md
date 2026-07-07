## 2026-07-04T03:58:22Z
Examine the Payment Screen (`app/ban-hang/payment.tsx`) and Kitchen Display (`app/ban-hang/kitchen.tsx`) in `e:\posa\frontend`.

Propose a detailed implementation strategy for:
1. Payment screen (`payment.tsx`):
   - Redesigning payment method selector (cash, card, QR, bank transfer).
   - Setting up a cash numpad with auto-calculation of change.
   - Processing payment via `POST /ban-hang/payments` API call, and returning to the table selection map on success.
   - Standardizing error handling: ensure that API errors are NOT swallowed or bypassed, and instead show an error alert.
2. Kitchen display (`kitchen.tsx`):
   - Redesigning the Kanban board layout (columns: Pending, In-Progress, Completed/Done).
   - Restricting kitchen display access to only authorized roles (`admin`, `manager`, `kitchen`).
   - Hooking up the real-time websocket (`ws://localhost:8000/ws/kitchen`) or polling for auto-refreshing order list cards (displaying table name, items list, and elapsed time).
   - Implementing actual kitchen order completion API calls so that completing a dish updates the backend state, rather than just modifying local component state.
3. Increasing all interactive touch targets to at least 44px.

Write your report to `e:\posa\.agents\explorer_m2_2\handoff.md`.
