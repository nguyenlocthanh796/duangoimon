# 05 — TENANT & BRANCH ISOLATION ARCHITECTURE

## 1. Multi-Tenant Architecture Pattern

Hệ thống OngChu POS sử dụng mô hình lai (Hybrid):
1. **Mặc định (Shared Database, Discriminator Column)**:
   - Dùng chung 1 CSDL PostgreSQL 16 hoặc 1 file SQLite `ongchu_pos.db`.
   - Mọi bảng dữ liệu nghiệp vụ đều có cột `tenant_id` (size 36, index) và `branch_id` (size 36, index).
   - Truy vấn được filter thủ công bằng helper `ScopeTenant(db, tenantID)` (`backend/internal/handler/auth.go:37`).
2. **Nâng cao (Dedicated SQLite Shard per Tenant)**:
   - File `backend/internal/database/tenant_pool.go` định nghĩa `GetTenantDB(tenantID)`.
   - Nếu `ENABLE_TENANT_SHARDS=true`, mỗi tenant được cấp 1 file SQLite riêng trong `data/tenants/{tenant_id}.db`.

---

## 2. Extraction of Tenant ID (`TenantQuotaMiddleware`)

- **Code Reference**: `backend/internal/middleware/tenant_quota.go:21-65`.
- **Thứ tự ưu tiên lấy `tenant_id`**:
  1. Header `X-Tenant-ID`.
  2. Query string `tenant_id`.
  3. Context `tenant_id` từ auth middleware.
  4. Header `X-Tenant-Subdomain`.
  5. Fallback mặc định: `"tenant_ongchu"` (nếu `ENFORCE_TENANT_HEADER != 1`).
- **Lỗ Hổng Tenant Spoofing**:
  - Vì các route nghiệp vụ không kiểm tra JWT token, bất kỳ client nào chỉ cần thay đổi Header `X-Tenant-ID: tenant_nan_nhan` là có thể truy vấn và ghi dữ liệu vào tenant của nạn nhân!
  - `ENFORCE_TENANT_HEADER` không được bật mặc định, dẫn đến mọi request không có header tự động rơi vào `tenant_ongchu`.

---

## 3. Cross-Tenant Data Leaks & Bleeding

1. **WebSocket Broadcast Leak**:
   - `backend/internal/handler/webhook.go:112`: Giao dịch chuyển khoản ngân hàng được broadcast qua `websocket.GlobalHub.BroadcastJSON`, gửi bản tin tới **TẤT CẢ** các client đang kết nối trên máy chủ bất kể tenant nào.
2. **WebSocket Sniffing**:
   - `backend/internal/websocket/hub.go:239`: Kết nối WebSocket chấp nhận `tenant_id` từ query param mà không cần xác thực. Bất kỳ ai cũng có thể kết nối với `?tenant_id=tenant_target` để nghe lén toàn bộ luồng giỏ hàng, đơn hàng, hóa đơn của quán mục tiêu.
3. **Manager PIN Cross-Tenant Bypass**:
   - `backend/internal/handler/order.go:309`: Hàm `checkManagerPin(req.Pin, "")` truyền `tenantID` rỗng, dẫn đến mã PIN quản lý của Quán A có thể dùng để duyệt hủy đơn trên Quán B.
4. **Path Traversal trong Tenant Shard**:
   - `backend/internal/database/tenant_pool.go:30`: Hàm `SanitizeTenantID` loại bỏ ký tự đặc biệt, nhưng nếu sharding không được cô lập đường dẫn chặt chẽ, rủi ro ghi đè file vẫn tồn tại.
