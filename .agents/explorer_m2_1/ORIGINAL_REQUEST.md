## 2026-07-04T03:58:21Z

Examine the Table Map (`app/ban-hang/index.tsx`) and POS/Ordering Screen (`app/ban-hang/pos.tsx`) in `e:\posa\frontend`.

Propose a detailed implementation strategy for:
1. Table selection map (`index.tsx`): Designing the grid layout (3-4 columns) showing table name and area, color-coding based on table status (empty=green, occupied=orange, reserved=gray), and routing to POS with table context parameters.
2. POS / Ordering screen (`pos.tsx`):
   - Redesigning the layout: iPad split-pane (product grid left, cart right) and Phone layout (tabs for Menu and Cart).
   - Adding category filter tabs and rendering product cards (with name and price).
   - Building a modifier bottom-sheet/modal for size, toppings, quantity, and quick notes.
   - Auto-updating cart subtotal.
   - Ensuring modifier customization data (selected sizes, toppings, and notes) is fully preserved during serialization in the `createOrder` API payload.
3. Increasing all interactive touch targets to at least 44px.

Write your report to `e:\posa\.agents\explorer_m2_1\handoff.md`.
