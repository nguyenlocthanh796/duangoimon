# 03 — AUTHENTICATION ARCHITECTURE & CONTROLS

## 1. Authentication Mechanisms

Hệ thống POS hỗ trợ 4 cơ chế đăng nhập / xác thực:

### 1.1. SaaS Tenant Login (`POST /api/v1/public/login`)
- **Code Reference**: `backend/internal/handler/auth.go:164-292`.
- **Luồng xử lý**:
  1. Nhận JSON `{ tenant_code, username, password }`.
  2. Bỏ qua DB check nếu username là `nguyenlocthanh291097` (SuperAdmin cứng).
  3. Tìm tenant theo subdomain hoặc tenant code.
  4. Tìm user theo `tenant_id` và `username`.
  5. So khớp mật khẩu qua `CheckPasswordHash(password, user.PasswordHash)`.
  6. **Token Generation**: Trả về `token: "jwt_token_" + user.ID` (hoặc `"saas_master_token"`).
  7. **Vấn đề An Ninh**: Token không phải là JSON Web Token có chữ ký mã hóa (HMAC/RSA). Token là chuỗi nối string cố định, không có thời hạn hết hạn (expiration/exp), không có chữ ký bảo vệ tính toàn vẹn.

### 1.2. Staff PIN Login (`POST /api/v1/public/staff-pin`)
- **Code Reference**: `backend/internal/handler/auth.go:372-413`.
- **Luồng xử lý**:
  1. Nhận JSON `{ tenant_id, branch_id, pin }`.
  2. Tìm kiếm trong bảng `users` với `pin_code = pin` và `tenant_id = tenantID`.
  3. **Hardcoded Fallbacks**: Nếu PIN là `"8888"` hoặc `"9999"`, hàm tự động trả về tài khoản Quản Lý / Chủ Quán giả lập ngay cả khi không có trong CSDL.
  4. **Token Generation**: Trả về `token: "pin_token_" + user.ID`. Không có chữ ký mật mã hay kiểm tra tính hợp lệ trên các endpoint nghiệp vụ.

### 1.3. Manager PIN Verification (`POST /api/v1/auth/verify-pin` & `checkManagerPin`)
- **Code Reference**: `backend/internal/handler/auth.go:102-146`, `backend/internal/handler/order.go:278-298`.
- **Luồng xử lý**:
  1. Kiểm tra PIN trong DB (`users.pin_code = pin AND (role = 'owner' OR role = 'manager')`).
  2. Bỏ qua kiểm tra nếu PIN là `"8888"` hoặc `"9999"`.
  3. `checkManagerPin` trong `order.go:309` được gọi với `tenantID = ""` (rỗng), dẫn đến bất kỳ PIN nào thuộc bất kỳ tenant nào cũng có thể duyệt hủy đơn của quán khác!

### 1.4. SaaS Landlord Admin Auth (`X-Admin-Key`)
- **Code Reference**: `backend/internal/middleware/auth_admin.go:14-41`.
- **Luồng xử lý**:
  - Đọc Header `X-Admin-Key` hoặc `Authorization: Bearer <key>`.
  - So khớp với biến môi trường `SAAS_ADMIN_KEY` (hoặc fallback `DefaultSaasMasterKey = "ongchu_master_admin_secret_key_2026"`).
  - So khớp an toàn với `subtle.ConstantTimeCompare`.

---

## 2. Password Hashing & Crypto Review

- **Library**: `golang.org/x/crypto/bcrypt`.
- **Cost Factor**: Cost 12 (`bcrypt.GenerateFromPassword([]byte(password), 12)`).
- **Lỗ Hổng Fallback Plaintext** (`backend/internal/handler/auth.go:21-25`):
  ```go
  func CheckPasswordHash(password, hash string) bool {
      // Legacy fallback cho mật khẩu lưu dạng plaintext lúc migration
      if hash == password {
          return true
      }
      err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
      return err == nil
  }
  ```
  *Đánh giá*: Cho phép mật khẩu dạng plaintext khớp trực tiếp. Nếu CSDL bị chèn hash giả lập bằng chính plaintext, hàm sẽ coi là hợp lệ.

---

## 3. Session & Token State

- **Storage**: Client lưu token trong `useAuthStore` (backed by `@react-native-async-storage/async-storage`).
- **Token Format**: `jwt_token_<uuid>` hoặc `pin_token_<uuid>` hoặc `saas_master_token`.
- **Validation**: Các route nghiệp vụ (`/api/v1/*`) **KHÔNG** validate chuỗi token này qua bất kỳ middleware giải mã nào; middleware chỉ đọc `X-Tenant-ID`.
- **Session Revocation / Invalidation**: Không có cơ chế blacklist hay whitelist phiên; token không thể bị thu hồi khi đổi mật khẩu hay xóa nhân viên.
