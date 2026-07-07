## 2026-07-04T21:45:40+07:00
Implement the POS Refinement and Completeness features:

1. Backend Changes (`backend/app/api/v1/ban_hang/orders.py`):
   - Define a Pydantic model `OrderUpdate` with `items` and optional `note`.
   - Implement a PUT endpoint at `PUT /ban-hang/orders/{order_id}`. It must:
     a. Fetch the existing order by ID.
     b. Verify the order exists and is not paid (i.e. status != 'da_thanh_toan').
     c. Delete all existing `OrderItem` instances associated with this order.
     d. Insert new `OrderItem` instances from the update payload.
     e. Recalculate and update the order's `total_amount`.
     f. Set the associated table status to 'dang_su_dung' (occupied) to ensure the table status is synchronized.
     g. Commit the changes and return the updated order.
     h. Send a WebSocket broadcast update to the kitchen.
   - Implement a GET endpoint at `GET /ban-hang/orders/active-table/{table_id}` to retrieve the active unpaid order (status != 'da_thanh_toan') for a table.

2. Frontend API Client (`frontend/lib/api.ts`):
   - Export `getActiveOrderForTable(tableId: string): Promise<any>` using `/ban-hang/orders/active-table/${tableId}`.
   - Export `updateOrder(orderId: string, data: any): Promise<any>` using `PUT /ban-hang/orders/${orderId}`.

3. Frontend UI & Styling Polish (`frontend/app/ban-hang/pos.tsx`):
   - Wrap the main actions buttons with `LinearGradient` from `expo-linear-gradient` to produce a premium glossy/shiny iOS native button style. Set subtle light-reflective top borders on gradients (e.g. borderTopColor: 'rgba(255,255,255,0.3)', borderTopWidth: 1).
   - Change all border radiuses (`borderRadius`) to be 4px or less (2px or 4px) for category tabs, product cards, inputs, modifer modals, stepper controls, and badges.
   - Add high-quality shadows (`shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.15, shadowRadius: 3`) and thin light borders (`borderColor: '#E2E8F0'`, or semi-transparent white borders on colored components) to create a polished, glass-like reflection effect.
   - Improve the iPhone cart modal to be a native-style sheet layout (with `presentationStyle="pageSheet"` and a drag grab handle centered at the top).
   - Ensure the iPad split-pane layout uses clean, crisp borders and standard iOS safe area margins.

4. Frontend POS Logic integration (`frontend/app/ban-hang/pos.tsx`):
   - Track `activeOrderId` state.
   - On component mount, check if the table status is occupied (by fetching `api.getActiveOrderForTable(tableId)`). If an unpaid order exists, load its items and populate the cart, mapping them to the format expected by the cart state.
   - Modify the `submitOrder` helper so that if `activeOrderId` is set, it updates the order via `api.updateOrder(activeOrderId, payload)`, otherwise it creates a new order via `api.createOrder(payload)`.
   - Tapping "LƯU BÀN" must submit/update the order and navigate back to the table map.
   - Tapping "T.TOÁN" must submit/update the order and transition to the payment screen with correct order parameters (e.g. `orderId`, `total`).

5. Verification:
   - Run the backend and verify the endpoints function correctly.
   - Run `npx tsc --noEmit` from the `frontend/` directory to verify there are absolutely zero TypeScript compilation errors.
