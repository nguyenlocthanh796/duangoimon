# 21 — SECURITY FINDINGS & VULNERABILITY REGISTER

*Bảng tổng hợp toàn diện các phát hiện an ninh từ quá trình điều tra thực tế mã nguồn.*

---

## 🚨 CRITICAL FINDINGS (MỨC ĐỘ NGUY HIỂM CAO NHẤT)

### 1. [CRIT-01] Thiếu Xác Thực Mật Mã Token trên Các Route Nghiệp Vụ (Broken Authentication & BOLA)
- **Vị Trí**: `backend/internal/handler/auth.go:275`, `backend/cmd/server/main.go:108-160`.
- **Thực Trạng**: Hàm đăng nhập sinh chuỗi thô `"jwt_token_" + user.ID`. Nhóm route `/api/v1/*` chỉ đi qua `TenantQuotaMiddleware` đọc `X-Tenant-ID` mà không xác thực chữ ký token JWT.
- **Tác Động**: Bất kỳ ai biết hoặc đoán được `X-Tenant-ID` đều có thể gọi toàn bộ API bán hàng, đọc báo cáo PnL, sửa giá món, hoặc xóa dữ liệu của tenant đó.

### 2. [CRIT-02] Hardcoded SuperAdmin & Mã PIN Quản Lý Mặc Định (`8888`/`9999`)
- **Vị Trí**: `backend/internal/database/database.go:193`, `backend/internal/handler/auth.go:173`, `backend/internal/handler/order.go:294`.
- **Thực Trạng**: Mã nguồn chứa tài khoản SuperAdmin cố định và 2 mã PIN dự phòng `8888`/`9999` cho phép vượt qua xác thực quản lý trên bất kỳ tenant nào mà không cần kiểm tra CSDL.
- **Tác Động**: Nhân viên thu ngân hoặc kẻ tấn công có thể dùng mã `8888`/`9999` để duyệt hủy đơn, hủy món, mở két tiền mà không cần chủ quán đồng ý.

### 3. [CRIT-03] Lỗ Hổng Xóa Sạch CSDL Tenant Qua API Restore Backup Không Xác Thực
- **Vị Trí**: `backend/internal/handler/backup.go:89-194`.
- **Thực Trạng**: `RestoreBackup` thực thi `Delete(&models.Category{})`, `Delete(&models.Product{})`, `Delete(&models.DiningTable{})` dựa trên `tenant_id` từ header mà không có xác thực quyền `owner` hay mật khẩu cấp 2.
- **Tác Động**: Kẻ tấn công có thể gửi request xóa sạch toàn bộ thực đơn, bàn ăn và ghi đè cài đặt ngân hàng của bất kỳ quán nào.

### 4. [CRIT-04] WebSocket Không Xác Thực & Rò Rỉ Giao Dịch Ngân Hàng Toàn Hệ Thống
- **Vị Trí**: `backend/internal/websocket/hub.go:53, 239`, `backend/internal/handler/webhook.go:112`.
- **Thực Trạng**: WebSocket handshake cho phép mọi Origin (`CheckOrigin` trả về `true`), đọc `tenant_id` không cần token. Đồng thời sự kiện `BANK_TRANSFER_RECEIVED` bị broadcast tới tất cả client của mọi tenant.
- **Tác Động**: Nghe lén toàn bộ đơn hàng trực tiếp, rò rỉ biến động số dư ngân hàng chéo giữa các quán, và có thể inject sự kiện giả mạo làm sai lệch trạng thái POS.

### 5. [CRIT-05] Mở Trực Tiếp Cổng CSDL PostgreSQL & Redis ra Mạng Ngoài
- **Vị Trí**: `docker-compose.yml:8, 25`.
- **Thực Trạng**: Container cấu hình port binding `"5432:5432"` và `"6379:6379"` lắng nghe trên `0.0.0.0` với mật khẩu mặc định `postgres` và Redis không có mật khẩu.
- **Tác Động**: Nếu VPS không có tường lửa ngoài, kẻ tấn công có thể kết nối trực tiếp vào CSDL để đọc hoặc phá hủy toàn bộ dữ liệu.

---

## ⚠️ HIGH FINDINGS (MỨC ĐỘ NGUY HIỂM CAO)

### 6. [HIGH-01] Lỗ Hổng SSRF & Port Scanning Qua Tính Năng In Nhiệt TCP
- **Vị Trí**: `backend/internal/handler/printer.go:228-280`.
- **Thực Trạng**: Hàm `isSafePrinterIP` cho phép kết nối tới tất cả dải IP private (`192.168.x.x`, `10.x.x.x`, `127.0.0.1`) và tùy ý chọn cổng kết nối.
- **Tác Động**: Có thể sử dụng máy chủ làm proxy để dò quét mạng nội bộ VPS hoặc tấn công các dịch vụ Redis/Database nội bộ.

### 7. [HIGH-02] CheckPasswordHash Cho Phép So Khớp Plaintext
- **Vị Trí**: `backend/internal/handler/auth.go:21-25`.
- **Thực Trạng**: `if hash == password { return true }` cho phép mật khẩu chưa hash đăng nhập thành công.

### 8. [HIGH-03] Hardcoded Secrets & Certificates trong Mã Nguồn
- **Vị Trí**: `backend/internal/config/config.go:34-46`, `frontend/credentials.json:6`, `frontend/cert.p12`.
- **Thực Trạng**: Fallback keys cho JWT, SaaS Master Key, Webhook Secret, và mật khẩu chứng chỉ iOS P12 được lưu trực tiếp trong code.

### 9. [HIGH-04] Tauri Desktop Vô Hiệu Hóa CSP & Expose IPC Mở Két Tiền
- **Vị Trí**: `desktop/src-tauri/tauri.conf.json:11, 24`, `desktop/src-tauri/src/main.rs:13`.
- **Thực Trạng**: `csp: null` và `withGlobalTauri: true`. Hàm `open_cash_drawer` có thể bị gọi tự do từ JS trong Webview.

### 10. [HIGH-05] Lưu Trữ Token & Thông Tin Đăng Nhập Dưới Dạng Unencrypted AsyncStorage
- **Vị Trí**: `frontend/lib/store/useAuthStore.ts`, `frontend/package.json`.
- **Thực Trạng**: Ứng dụng di động không sử dụng `expo-secure-store` để bảo vệ token phiên.
