# 20 — CROWN JEWELS & HIGH-VALUE ASSETS

## 1. High-Value Business Assets (Tài Sản Cốt Lõi)

| Tài Sản / Dữ Liệu | Bảng CSDL / Vị Trí Lưu | Hậu Quả Nếu Bị Xâm Phạm | Mức Độ Ưu Tiên Bảo Vệ |
|---|---|---|---|
| **Tiền Mặt trong Két & Lệnh Kích Két** | Bảng `cash_shifts`, TCP Socket RJ11 `\x1b\x70...` | Thất thoát tiền mặt trực tiếp tại quầy thu ngân | **CRITICAL (P0)** |
| **Tài Khoản Nhận Tiền VietQR** | Bảng `pos_settings` (`bank_account_no`, `bank_code`) | Tiền khách chuyển khoản bị chuyển hướng sang tài khoản kẻ gian | **CRITICAL (P0)** |
| **Báo Cáo Tài Chính & PnL 3 Con Số Vàng** | Endpoint `/api/v1/owner/pnl-summary`, bảng `orders`, `cash_transactions` | Lộ bí mật kinh doanh, doanh thu, lợi nhuận thực tế | **HIGH (P1)** |
| **Toàn Bộ Menu & Cấu Hình Quán (Restore Wiping)** | Bảng `products`, `categories`, `dining_tables`, `areas` | Ngừng trệ toàn bộ hoạt động bán hàng của quán nếu bị xóa sạch | **CRITICAL (P0)** |
| **Thông Tin Khách Hàng CRM** | Bảng `customers` (Tên, SĐT, Lịch sử chi tiêu) | Rò rỉ dữ liệu cá nhân khách hàng, vi phạm quyền riêng tư | **HIGH (P1)** |
| **Mật Khẩu & Mã PIN Quản Lý** | Bảng `users` (`password_hash`, `pin_code`) | Chiếm quyền điều khiển hệ thống, hủy đơn gian lận | **CRITICAL (P0)** |
| **Mã Bản Quyền & Fleet Thiết Bị SaaS** | Bảng `saas_license_keys`, `saas_invoices`, `tenant_devices` | Gian lận bản quyền phần mềm, đăng ký thiết bị trái phép | **HIGH (P1)** |
| **Chứng Chỉ Phân Phối iOS (P12 & Provisioning)** | `frontend/credentials/cert.p12` | Kẻ gian có thể ký ứng dụng giả mạo dưới danh nghĩa nhà phát triển | **HIGH (P1)** |
