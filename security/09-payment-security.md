# 09 — PAYMENT & FINANCIAL TRANSACTION SECURITY

## 1. Payment Methods & Architecture

Hệ thống hỗ trợ 3 hình thức thanh toán:
1. **Tiền mặt (`tien_mat`)**: Thu ngân nhập tiền khách đưa -> tính tiền thối -> ghi nhận vào két và sổ quỹ.
2. **Chuyển khoản VietQR (`chuyen_khoan_vietqr`)**: Sinh mã QR động EMVCo Napas247 hoặc MBBank Soundbox -> khách quét app ngân hàng.
3. **Thanh toán kết hợp (`hon_hop`)**: Chia tỷ lệ tiền mặt và chuyển khoản.

---

## 2. VietQR Payload Generation & Integrity

- **Backend**: `backend/internal/service/vietqr.go:1-120`.
  - Sinh URL ảnh QR động qua cổng VietQR.io: `https://img.vietqr.io/image/{bank_code}-{account_no}-{template}.png?amount={amount}&addInfo={content}&accountName={acc_name}`.
  - Sinh chuỗi EMVCo QR Code chuẩn ngân hàng.
- **Rủi Ro Toàn Vẹn Tài Khoản**:
  - Thông tin tài khoản nhận tiền (`bank_account_no`, `bank_code`, `bank_account_name`) được lưu trong bảng `pos_settings`.
  - Vì `PUT /api/v1/settings` không có xác thực cấp cao hay OTP/PIN, nếu kẻ tấn công gửi request đổi số tài khoản, toàn bộ mã VietQR sinh ra trên POS và CFD sẽ trỏ về tài khoản của kẻ tấn công!

---

## 3. Webhook Integration & Replay Protection

- **Code Reference**: `backend/internal/handler/webhook.go:46-123`.
- **Bảo Mật Webhook Token**:
  - Đọc `X-Webhook-Token` hoặc `Authorization: Bearer <token>`.
  - So khớp với biến môi trường `WEBHOOK_SECRET` (fallback `ongchu_webhook_secret_2026`).
  - Dùng `subtle.ConstantTimeCompare` chống timing attack.
- **Lỗ Hổng Thiếu Idempotency & Replay Attack trên Webhook**:
  - Webhook nhận payload biến động số dư nhưng **KHÔNG** lưu `referenceCode` hoặc `id` giao dịch ngân hàng vào bảng CSDL để kiểm tra trùng lặp (deduplication).
  - Kẻ tấn công nếu có được token webhook hoặc gửi lại request cũ (Replay) có thể kích hoạt liên tục sự kiện `BANK_TRANSFER_RECEIVED` làm POS hiểu lầm đơn hàng đã thanh toán nhiều lần.
- **Simulation Endpoint**:
  - `POST /api/v1/public/webhook/simulate-transfer` bị vô hiệu hóa khi `gin.Mode() == gin.ReleaseMode`, nhưng hoạt động ở chế độ mặc định (Debug/Test).
