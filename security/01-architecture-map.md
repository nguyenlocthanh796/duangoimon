# 01 — ARCHITECTURE & DATA FLOW MAP

## 1. System Architecture Diagram

```text
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  +---------------------+  +---------------------+  +----------------------------+ |
|  | Android / iOS App   |  | Web PWA (Chrome/iOS)|  | Desktop Client (Tauri 2.0) | |
|  | Expo SDK 57 Native  |  | React 19 / Vite/Dist|  | Rust IPC -> TCP 9100       | |
|  +----------+----------+  +----------+----------+  +-------------+--------------+ |
+-------------|------------------------|---------------------------|----------------+
              |                        |                           |
              | (HTTPS / WSS)          | (HTTPS / WSS)             | (HTTPS / WSS / Direct TCP)
              v                        v                           v
+-----------------------------------------------------------------------------------+
|                        EDGE / REVERSE PROXY LAYER (NGINX)                         |
|  - Domain: ongchu.cloud, www.ongchu.cloud, app.ongchu.cloud                       |
|  - TLS 1.2 / TLS 1.3 (Let's Encrypt), HTTP/2                                      |
|  - Upstream Proxy: http://127.0.0.1:8080 (API & WS)                              |
|  - Static SPA Root: /var/www/ongchu-app                                           |
+-----------------------------------------------------------------------------------+
                                       |
                                       v (HTTP / WS on loopback 127.0.0.1:8080)
+-----------------------------------------------------------------------------------+
|                             GOLANG BACKEND ENGINE                                 |
|  [Gin Router + Recovery + RateLimiter + CORS]                                     |
|                                                                                   |
|  1. Public Group (/api/v1/public):                                                |
|     - /login, /register, /staff-pin, /bills/:code, /cfd-sync                      |
|                                                                                   |
|  2. Protected Merchant Group (/api/v1):                                           |
|     - Middleware: TenantQuotaMiddleware (X-Tenant-ID Header / Query Param)        |
|     - Handlers: Orders, Tables, Areas, Menu, Inventory, Staff, Cash, Shift,       |
|                 Printer, Webhook, Owner P&L, Sync, Backup                         |
|                                                                                   |
|  3. Landlord Group (/api/v1/saas):                                                |
|     - Middleware: SaaSAdminAuthMiddleware (X-Admin-Key / Bearer Key)              |
|     - Handlers: Tenants CRUD, Plans, Addons, Devices Fleet, License Keys          |
|                                                                                   |
|  4. WebSocket Hub (/ws/pos):                                                      |
|     - GlobalHub goroutine, Tenant-based channel routing                           |
+-------------------+--------------------+--------------------+---------------------+
                    |                    |                    |
                    v                    v                    v
+-----------------------+  +-----------------------+  +-----------------------------+
|    DATABASE LAYER     |  |    HARDWARE LAYER     |  |     THIRD-PARTY INTEGRATION |
| - PostgreSQL 16 (DB)  |  | - TCP 9100 ESC/POS    |  | - Telegram Bot API (Alerts) |
| - SQLite (Shard/Local)|  | - RJ11 Cash Drawer    |  | - SePay/Casso Bank Webhooks |
| - Redis 7 (Optional)  |  | - KDS / CFD Screen    |  | - VietQR Image Generation   |
+-----------------------+  +-----------------------+  +-----------------------------+
```

---

## 2. Component Security Profiles & Entrypoints

| Thư Mục / Module | Mục Đích Thực Tế | Mức Độ An Ninh | Điểm Vào (Entrypoints) |
|---|---|---|---|
| `backend/cmd/server/main.go` | Khởi tạo HTTP router, WebSocket hub, CORS, Route groups | **CRITICAL** | `main()`, `POST /api/v1/saas/*`, `GET /ws/pos` |
| `backend/internal/middleware` | Rate limiting, Auth Admin SaaS key, Tenant Quota check | **CRITICAL** | `SaaSAdminAuthMiddleware`, `TenantQuotaMiddleware`, `RateLimiterMiddleware` |
| `backend/internal/database` | GORM PostgreSQL / SQLite connections, AutoMigrate, Sharding | **CRITICAL** | `InitDB()`, `GetTenantDB()`, `SeedInitialData()` |
| `backend/internal/handler/auth.go` | SaaS Login, Tenant Register, Staff PIN check, Manager PIN | **CRITICAL** | `SaaSLogin()`, `RegisterTenant()`, `StaffPinLogin()`, `VerifyPin()` |
| `backend/internal/handler/backup.go` | Tiếp nhận file JSON và ghi đè CSDL menu/bàn/settings | **CRITICAL** | `POST /api/v1/backup/restore` |
| `backend/internal/handler/sync.go` | Nhận batch đơn ngoại tuyến và chèn vào CSDL | **HIGH** | `POST /api/v1/sync/orders` |
| `backend/internal/handler/printer.go` | Tạo byte ESC/POS và mở socket TCP 9100 ra máy in | **HIGH** | `PrintReceipt()`, `OpenDrawer()`, `PrintKitchen()` |
| `backend/internal/handler/webhook.go` | Nhận biến động số dư ngân hàng và broadcast WS | **HIGH** | `HandleBankTransferWebhook()`, `SimulateBankTransfer()` |
| `backend/internal/websocket/hub.go` | WebSocket hub kết nối hai chiều realtime | **CRITICAL** | `HandleWebSocket()`, `GlobalHub.Run()` |
| `frontend/lib/store/useAuthStore.ts` | Quản lý token, tài khoản đăng nhập, active tenant/branch | **HIGH** | `login()`, `logout()`, `verifyManagerPin()` |
| `frontend/lib/api/apiClient.ts` | HTTP Fetch client gắn Header `X-Tenant-ID` và Token | **HIGH** | `requestWithTimeout()` |
| `desktop/src-tauri/src/main.rs` | Tauri Rust IPC handler gọi máy in và mở két tiền | **HIGH** | `print_receipt`, `open_cash_drawer` |

---

## 3. Data Flow Traces

### A. Luồng Đăng Nhập & Cấp Quyền (Authentication Flow)
1. **Client** gửi `POST /api/v1/public/login` với `{ tenant_code, username, password }`.
2. **Server** (`handler/auth.go:165`):
   - Kiểm tra tài khoản cứng Super Admin `nguyenlocthanh291097` (mật khẩu so khớp trực tiếp).
   - Truy vấn CSDL bảng `tenants` và `users`.
   - Xác thực mật khẩu qua `CheckPasswordHash` (hỗ trợ cả bcrypt và legacy plaintext).
   - Trả về token giả lập dạng chuỗi `"jwt_token_" + user.ID` (không có chữ ký mật mã, không có TTL).
3. **Client** lưu token vào `useAuthStore` (AsyncStorage) và gắn vào Header `Authorization: Bearer <token>` và `X-Tenant-ID: <tenant_id>`.

### B. Luồng Nghiệp Vụ Bán Hàng & Đơn Hàng (Order Flow)
1. **Client** gửi `POST /api/v1/orders` với `{ tenant_id, branch_id, items, ... }`.
2. **Server**:
   - `TenantQuotaMiddleware` chỉ kiểm tra tenant có active và còn hạn license không qua `X-Tenant-ID`.
   - `CreateOrder` (`handler/order.go:53`) tạo bản ghi trong Transaction và broadcast WebSocket qua `GlobalHub.BroadcastToTenant`.
   - Không có bước xác thực danh tính người dùng hoặc chữ ký request.

### C. Luồng Trao Đổi Realtime (WebSocket Flow)
1. **Client** mở kết nối: `GET /ws/pos?client_id=...&tenant_id=...&branch_id=...`.
2. **Server** (`websocket/hub.go:232`):
   - Chấp nhận handshake từ bất kỳ Origin nào (`CheckOrigin` trả về `true`).
   - Đọc `tenant_id` từ query param mà không cần Token hay xác thực.
   - Nhận message bất kỳ từ client và broadcast tới tất cả các client cùng `tenant_id`.
