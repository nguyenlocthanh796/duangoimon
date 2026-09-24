# 17 — AUDIT LOGGING & ANTI-FRAUD INTELLIGENCE

## 1. Audit Log Schema & Persistence

- **Bảng CSDL**: `audit_logs` (`backend/internal/models/models.go:316-326`).
  - Cột: `id`, `tenant_id`, `branch_id`, `action`, `performed_by`, `order_id`, `details`, `severity`, `created_at`.
  - Thiết kế: Append-only log (không cung cấp API xóa nhật ký an ninh cho nhân viên).
- **Các Hành Vi Ghi Nhật Ký**:
  1. `in_tam_tinh` / `pre_print`: In tạm tính phiếu thanh toán trước khi thu tiền.
  2. `huy_don` / `huy_mon`: Hủy đơn hàng hoặc món ăn sau khi đã gửi bếp.
  3. `mo_ket_tay`: Kích mở két tiền thủ công không qua hóa đơn.
  4. `doi_gia_mon`: Thay đổi giá niêm yết của món ăn.
  5. `dong_ca_lech_tien`: Đóng ca làm việc có chênh lệch tiền mặt thực tế và lý thuyết.
  6. `chiet_khau_vuot_muc`: Giảm giá hóa đơn vượt ngưỡng cho phép (> 20%).

---

## 2. Realtime Telegram Anti-Fraud Goroutine

- **Service**: `backend/internal/service/telegram.go`.
- **Hoạt Động**:
  - Gửi cảnh báo tức thì tới Telegram của Chủ Quán qua Goroutine bất đồng bộ (`go func()`).
  - Gửi các cảnh báo trọng yếu:
    - Hủy món sau khi đã in tạm tính (nguy cơ thu ngân lấy tiền bỏ túi rồi hủy món).
    - Mở két tiền bằng tay ngoài giờ/không có đơn.
    - Lệch tiền két khi giao ca vượt ngưỡng (mức chênh lệch < -50.000đ kích hoạt cảnh báo nguy cấp `danger`).

---

## 3. Log Sensitive Data Sanitization Review

- **Mã PIN / Mật Khẩu**: Không bị in ra trong log của Gin router hay `AuditLog.Details`.
- **Số Tài Khoản / QR**: Chỉ ghi nhận mã đơn hàng `order_code` và số tiền `amount`.
- **Thiếu Sót**: Chưa có cấu hình chuyển log có cấu trúc (JSON Log) sang SIEM bên ngoài (e.g. Elastic/Loki/CloudWatch). Log hiện tại lưu trực tiếp trong CSDL và stdout.
