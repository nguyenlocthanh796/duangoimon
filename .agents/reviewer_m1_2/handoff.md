# Milestone 1 Review Handoff Report

## 1. Observation

Direct observations made on frontend codebase files:

### A. Kitchen Display Dummy Completion (Integrity Violation)
In `e:\posa\frontend\app\ban-hang\kitchen.tsx`, the function `completeItem` updates only the local state and does not call any API:
```typescript
161:   const completeItem = (productId: string, orderId: string) => {
162:     setOrders(prev => {
163:       const order = prev.find(o => o.id === orderId);
164:       if (!order) return prev;
165:       const item = order.items.find(i => i.id === productId);
166:       if (!item) return prev;
167:       // Move completed item to completed section
168:       const updatedOrder = {
169:         ...order,
170:         items: order.items.filter(i => i.id !== productId),
171:       };
172:       // If all items completed, move whole order
173:       if (updatedOrder.items.length === 0) {
174:         setCompletedOrders(comp => [...comp, updatedOrder]);
175:         return prev.filter(o => o.id !== orderId);
176:       }
177:       return prev.map(o => o.id === orderId ? updatedOrder : o);
178:     });
179:   };
```
Furthermore, the WebSocket message listener triggers a full reload of the orders list, overwriting the local state:
```typescript
146:         socket.onmessage = (e) => {
147:           try {
148:             const msg = JSON.parse(e.data);
149:             if (msg.event === 'new_order') fetchOrders();
150:           } catch {}
151:         };
```
`fetchOrders()` performs an API get request and completely overwrites `orders` with data from the database:
```typescript
124:   const fetchOrders = useCallback(async () => {
125:     try {
126:       const data = await api.getOrders();
127:       const active = data.filter((o: any) => o.status !== 'da_thanh_toan' && o.status !== 'da_huy');
128:       setOrders(active.map((o: any) => ({
...
```

### B. Payment Screen Error Bypass (Integrity Violation)
In `e:\posa\frontend\app\ban-hang\payment.tsx`, `handlePay` catches any API error and still updates the state to mark the payment as successful:
```typescript
36:   const handlePay = async () => {
37:     if (!orderId || paying) return;
38:     setPaying(true);
39:     try {
40:       await api.processPayment({
41:         order_id: orderId,
42:         payment_method: method,
43:         amount_received: method === 'tien_mat' ? cash : undefined,
44:       });
45:       setPaid(true);
46:     } catch { setPaid(true); }
47:   };
```

### C. RBAC Guard Deficit & Security Bypass
In `e:\posa\frontend\lib\context\AuthContext.tsx`, if the token is valid but the user's role is not explicitly `'cashier'` or `'accountant'`, the routing guard fails to restrict access, granting complete access to Quản Lý, Kế Toán, and Bán Hàng modules:
```typescript
115:         // Check authorization
116:         if (userRole === 'cashier') {
117:           if (rootSegment !== 'ban-hang') {
118:             router.replace('/ban-hang');
119:           }
120:         } else if (userRole === 'accountant') {
121:           if (rootSegment !== 'ke-toan' && rootSegment !== 'quan-ly') {
122:             router.replace('/ke-toan');
123:           }
124:         }
```

### D. Customization Data Loss
In `e:\posa\frontend\app\ban-hang\pos.tsx`, product options (sizes, toppings) are correctly shown in the cart state but completely ignored when calling the API:
```typescript
129:   const handlePay = async () => {
130:     try {
131:       const res = await api.createOrder({
132:         table_id: tableId!, items: cart.map(i => ({
133:           product_id: i.id, product_name: i.name, quantity: i.qty, unit_price: i.unitPrice, note: i.note,
134:         })),
135:       });
...
```

### E. Uncaught LocalStorage Exception Hang
In `e:\posa\frontend\lib\context\AuthContext.tsx`, corrupt JSON in `pos_user` triggers a crash inside `initAuth` which prevents setting `isInitialized` without clearing the corrupt data:
```typescript
32:           const storedUserStr = localStorage.getItem('pos_user');
...
37:               const user = storedUserStr ? JSON.parse(storedUserStr) : null;
```

### F. Static Dimensions in Layout
In `e:\posa\frontend\lib\components\Sidebar.tsx` and `app/ban-hang/pos.tsx`, screen dimensions are evaluated statically at module load time:
```typescript
44: const { width: SCREEN_WIDTH } = Dimensions.get('window');
45: const SIDEBAR_WIDTH = Math.min(320, SCREEN_WIDTH * 0.75);
```

---

## 2. Logic Chain

1. **Kitchen Ticket Logic**:
   - `completeItem` changes only the React state variable `orders` (Observation A).
   - The API is never contacted to persist this change, nor is there any endpoint in `orders.py` or the `api` service to modify individual order item statuses.
   - Once a WebSocket `new_order` event is received, `fetchOrders()` retrieves the list from the database where the items still have their default status (`"moi"`), overwriting the local state (Observation A).
   - **Conclusion**: The kitchen completion display is a dummy mockup that breaks as soon as a new order is sent or the page is refreshed. This qualifies as an **INTEGRITY VIOLATION**.

2. **Payment Success Bypass**:
   - `processPayment` API call failure is swallowed in the catch block (Observation B).
   - Regardless of whether the database registers the payment or the server returns an error, the frontend displays `Thanh toán thành công` and redirects the user (Observation B).
   - **Conclusion**: Cashiers can inadvertently process payments that fail to record in the system. This is a severe logic bypass and an **INTEGRITY VIOLATION**.

3. **RBAC Vulnerability**:
   - The route guard logic only restricts routes when `userRole === 'cashier'` or `userRole === 'accountant'` (Observation C).
   - If a user logs in with a role claim that is empty, null, or any custom role (e.g. `'guest'`, `'member'`), they pass through without any redirect restrictions (Observation C).
   - **Conclusion**: Access control is implemented via blocklist matching rather than safelist routing, leading to access control bypasses.

4. **POS Customization Loss**:
   - Cart items contain details like `selectedSize` and `selectedToppings` (Observation D).
   - The mapped payload in `api.createOrder` excludes options or size parameters (Observation D).
   - **Conclusion**: Selected customizations are discarded when submitting orders to the backend.

5. **LocalStorage Crash**:
   - If `pos_user` contains invalid JSON, `JSON.parse` throws an unhandled exception inside the `initAuth` function (Observation E).
   - The execution halts before `setTokenState` or `setUsername` are set, but the corrupt entry is never removed from `localStorage`. On page reloads, the error keeps occurring (Observation E).
   - **Conclusion**: Corrupted user data in the browser cache locks the client in a broken loop.

6. **Static Dimensions Layout Bug**:
   - Calculating `SCREEN_WIDTH` globally (Observation F) prevents dynamic resizing.
   - **Conclusion**: Device rotation will not update the layout of the sidebar drawer or the POS item grid.

---

## 3. Caveats

- We did not investigate actual network latency or performance characteristics of the WebSocket manager under pressure.
- We did not verify all Quản Lý screens (`app/quan-ly/*`) or transactions list layouts since they are out of the designated Milestone 1 review scope.

---

## 4. Conclusion

**Verdict**: REQUEST_CHANGES

The Milestone 1 changes contain critical integrity violations, major security gaps, and correctness flaws. The kitchen display's local-only state mutation and the payment screen's error-swallowing bypass represent facade implementations. The RBAC guard allows unauthorized role bypasses, and order customizations are discarded on submit. These must be addressed before approving the milestone.

---

## 5. Verification Method

1. **TypeScript Type Safety Check**:
   Run the TypeScript compiler command:
   ```powershell
   cd e:\posa\frontend
   npx tsc --noEmit
   ```
   *Expected Result*: The command completes with zero type errors (confirming compilation type safety is correct).

2. **Kitchen Refresh Defect**:
   - Open the kitchen display screen.
   - Click completion checkmark on an item. Observe it moves to the "Đã xong" column.
   - Trigger a refresh or mock a websocket reload. Observe the item returns to the "Cần chế biến" column.

3. **Payment API Error Swallow**:
   - Stop the backend server or return a mock `500 Internal Server Error` on the `/ban-hang/payments` endpoint.
   - Complete a payment. Observe the UI still displays "Thanh toán thành công" and clears the table.

4. **RBAC Guard Bypass**:
   - Mock a JWT token containing a role payload like `"role": "unauthorized_role"`.
   - Log in and visit `/quan-ly` or `/ke-toan`. Observe that access is granted instead of being redirected.
