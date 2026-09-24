# 💳 PAYMENT INTEGRITY & FRAUD TESTS

## 1. Test Scenarios

### PAY-01: Client-Side Price & Quantity Tampering
- **Vector**: Client submits order with `quantity: 0` or negative value.
- **Expected**: Backend enforces minimum quantity = 1, recomputes `itemTotal = uPrice * qty` on server, and calculates `totalAmount = subtotal - discountAmount`.
- **Actual Evidence**: Verified on `CreateOrder` handler; server enforces valid math.
- **Result**: **PASS**

### PAY-02: Forged Payment Confirmation
- **Vector**: Client attempts to mark order as `da_thanh_toan` without hitting `/pay` endpoint.
- **Expected**: Server requires `POST /api/v1/orders/:id/pay` with valid payment method and amount.
- **Actual Evidence**: Status `200 OK` on valid payment, status updated strictly within database transaction.
- **Result**: **PASS**

### PAY-03: Webhook Balance Injection
- **Vector**: Request `POST /api/v1/webhook/bank-transfer` with fake transaction and wrong `X-Webhook-Token`.
- **Expected**: `401 Unauthorized` ("Webhook token khong chinh xac hoac khong duoc uy quyen").
- **Actual Evidence**: `TestWebhookSecurity` PASS.
- **Result**: **PASS**

### PAY-04: Void Order After Bill Print
- **Vector**: Cashier voids order without Manager PIN.
- **Expected**: Rejected with `403 Forbidden`; when authorized, triggers Audit Log and Telegram alert.
- **Actual Evidence**: `TestVoidOrderPinCheck` PASS.
- **Result**: **PASS**
