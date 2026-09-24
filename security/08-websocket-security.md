# 08 — WEBSOCKET ARCHITECTURE & REALTIME SECURITY

## 1. WebSocket Engine Implementation

- **Package**: `github.com/gorilla/websocket` v1.5.3.
- **Hub Architecture**: `backend/internal/websocket/hub.go:73-121`.
  - `GlobalHub` quản lý danh sách `Clients map[*Client]bool`.
  - Các channel đồng bộ: `Broadcast`, `Register`, `Unregister`.
  - Reader pump xử lý ping/pong (interval 54s, pong timeout 60s, write timeout 10s, max message size 512KB).
  - Tích hợp `closeOnce sync.Once` chống double-close panic.

---

## 2. Handshake Authentication & Origin Validation

- **Code Reference**: `backend/internal/websocket/hub.go:27-55`.
- **CORS CheckOrigin**:
  ```go
  CheckOrigin: func(r *http.Request) bool {
      // ... kiểm tra localhost, domain ongchu.cloud, IP LAN ...
      return true // Cho phép kết nối cho tất cả thiết bị POS/KDS
  }
  ```
  - `CheckOrigin` luôn trả về `true` ở dòng cuối cùng.
  - **Cross-Site WebSocket Hijacking (CSWSH)**: Bất kỳ website độc hại nào người dùng truy cập từ cùng trình duyệt đều có thể mở kết nối WebSocket tới server POS.
- **Handshake Authentication**:
  - Endpoint `GET /ws/pos` **KHÔNG** yêu cầu Cookie, Header Authorization, hay Token.
  - `tenant_id` được đọc trực tiếp từ query param `c.DefaultQuery("tenant_id", "default")`.

---

## 3. Message Routing & Cross-Tenant Data Sniffing / Spoofing

1. **Eavesdropping / Sniffing**:
   - Kẻ tấn công chỉ cần mở kết nối `wss://app.ongchu.cloud/ws/pos?tenant_id=tenant_target` là nhận được toàn bộ sự kiện: `table_cart_updated`, `order_created`, `order_paid`, `kds_order_updated`, `shift_opened`, `shift_closed`, `settings_updated`.
2. **Message Spoofing / Injection**:
   - `websocket/hub.go:287`: `GlobalHub.BroadcastFromClient(client, message)` nhận raw message từ client và phát trực tiếp tới tất cả client khác cùng tenant.
   - Kẻ tấn công có thể giả mạo gói tin `{ "type": "product_price_updated", "productId": "prod_1", "price": 1000 }` hoặc `{ "type": "order_paid", "tableId": "tbl_1" }` làm thay đổi trạng thái giỏ hàng và bàn ăn trên tất cả máy POS trong quán.
3. **Global Broadcast Leak**:
   - `webhook.go:112`: Sự kiện `BANK_TRANSFER_RECEIVED` gọi `GlobalHub.BroadcastJSON` gửi tới toàn bộ client của **TẤT CẢ** các quán trên hệ thống.
