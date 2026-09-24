# 07 — OFFLINE ARCHITECTURE & SYNC RECONCILIATION

## 1. Offline POS Architecture

- **Zustand Offline Store**: `frontend/lib/store/useOfflineSyncStore.ts`.
- **Offline Storage**: Đơn hàng tạo khi mất mạng được gắn `client_order_id` (UUID v4) và lưu vào `AsyncStorage` (`@ongchu_offline_orders`).
- **Auto-Sync Trigger**: Khi mạng khôi phục (`online` event hoặc WebSocket `onopen`), `syncOrders()` tự động kích hoạt đẩy mảng đơn lên `POST /api/v1/sync/orders`.

---

## 2. Server Idempotency & Conflict Resolution

- **Code Reference**: `backend/internal/handler/sync.go:86-97`.
- **Cơ chế Idempotency**:
  ```go
  var existingOrder models.Order
  if err := db.Where("client_order_id = ?", clientKey).First(&existingOrder).Error; err == nil {
      // Đơn đã tồn tại -> Trả về duplicate, không chèn lại
      duplicateCount++
      continue
  }
  ```
  - Cột `client_order_id` có `uniqueIndex` trên bảng `orders` đảm bảo chống trùng lặp tại tầng CSDL.
- **Xử lý Ca Làm Việc (Shift Reconciliation)**:
  - Nếu đơn thanh toán ngoại tuyến có `shift_id`, server tự động cộng dồn `TotalCashSales` hoặc `TotalVietQRSales` và cập nhật `ExpectedEndingCash` trong ca tương ứng.
- **Trừ Kho Tự Động (BOM Deduction)**:
  - Server tự động truy vấn định lượng nguyên liệu (`models.RecipeItem`) và trừ tồn kho `current_stock`.
  - Nếu nguyên liệu chạm ngưỡng an toàn (`current_stock <= min_stock`), server gửi cảnh báo qua WebSocket và Telegram Bot.

---

## 3. Rủi Ro An Ninh Khi Đồng Bộ Ngoại Tuyến

1. **Price Tampering khi Offline**:
   - Client gửi mảng `items` có sẵn `unit_price` và `cost_price`. Nếu thiết bị client bị can thiệp (mod app), kẻ gian có thể sửa `unit_price` thành 0đ trước khi gửi sync.
   - `sync.go:135-145` ưu tiên lấy giá từ request (`it.UnitPrice`) thay vì bắt buộc tính lại từ giá niêm yết trong bảng `products`.
2. **Shift Tampering**:
   - Client có thể truyền `shift_id` bất kỳ để ghi nhận doanh thu vào ca đã đóng.
3. **Tenant Injection**:
   - `sync.go:64-66`: Nếu item trong mảng `orders` có `ord.TenantID` khác với header, server chấp nhận `ord.TenantID` đó, cho phép chèn đơn hàng chéo vào quán khác.
