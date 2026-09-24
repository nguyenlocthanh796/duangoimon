# 04 — AUTHORIZATION MATRIX & RBAC/BOLA CONTROLS

## 1. Role Definitions & Permissions

Theo thiết kế hệ thống có 4 vai trò chính:
- `owner`: Toàn quyền trên tenant (Cài đặt, Sổ quỹ, Giao ca, Doanh thu PnL, Xóa sửa thực đơn, Hủy đơn).
- `manager`: Quản lý ca, duyệt hủy món, xem báo cáo ngày.
- `cashier`: Thu ngân, mở ca, bán hàng, in bill, thu tiền mặt / VietQR.
- `waiter` / `staff`: Phục vụ gọi món tại bàn, gửi bếp.

---

## 2. Server-side Enforcement vs Client-side RBAC

| Tác Vụ / API | Phía Client (Frontend) | Phía Server (Backend) | Đánh Giá Lỗ Hổng |
|---|---|---|---|
| **Xem Sổ Quỹ & Doanh Thu** (`GET /api/v1/owner/pnl-summary`) | Ẩn tab `/bao-cao-loi-nhuan` nếu không phải `owner` | Không kiểm tra Role, chỉ kiểm tra `X-Tenant-ID` | **BOLA / Broken Access Control**: Phục vụ gửi request lấy được toàn bộ PnL |
| **Cập Nhật Cài Đặt Quán** (`PUT /api/v1/settings`) | Ẩn tab Cài Đặt trên UI nhân viên | Không kiểm tra Role, không yêu cầu PIN | Bất kỳ ai biết `X-Tenant-ID` đều có thể đổi tài khoản ngân hàng nhận tiền |
| **Xóa Sạch Menu & Bàn** (`POST /api/v1/backup/restore`) | Chỉ xuất hiện trong modal Cài Đặt | Không kiểm tra Role, không yêu cầu PIN | Bất kỳ ai gửi request đều có thể xóa sạch CSDL của tenant |
| **Mở Két Đựng Tiền** (`POST /api/v1/printer/open-drawer`) | Nút mở két trên UI | Không kiểm tra Role, không yêu cầu PIN | Bất kỳ nhân viên nào gửi request đều có thể kích mở két tiền |
| **Hủy Đơn Bán Hàng** (`POST /api/v1/orders/:id/void`) | Yêu cầu nhập PIN 4 số của Quản lý | Kiểm tra PIN qua `checkManagerPin(pin, "")` | PIN hardcoded `8888`/`9999` bypass; PIN trống tenant check |
| **Sửa Giá Món Ăn** (`PATCH /api/v1/products/:id/price`) | Yêu cầu tài khoản Quản trị | Không kiểm tra Role, chỉ ghi Audit Log | Thu ngân có thể sửa trực tiếp giá món xuống 0đ |
| **Chi Lương Nhân Viên** (`POST /api/v1/staff/:id/pay-salary`) | Chỉ có ở màn hình Quản lý | Không kiểm tra Role, tự động sinh phiếu chi | Bất kỳ nhân viên nào cũng có thể gọi API tự chi lương cho mình |

---

## 3. IDOR / BOLA Vulnerability Analysis

1. **Order Manipulation**:
   - `POST /api/v1/orders/:id/pay` và `POST /api/v1/orders/:id/void` chỉ nhận `id` trên URL param.
   - `checkManagerPin` không cô lập theo `tenant_id`, cho phép quản lý quán A hủy đơn của quán B nếu biết ID hóa đơn.
2. **Settings Overwrite**:
   - `PUT /api/v1/settings` chấp nhận payload cập nhật tài khoản ngân hàng VietQR mà không có chữ ký của Chủ Quán.
3. **Hardware Triggering**:
   - `POST /api/v1/printer/open-drawer` cho phép kích mở két từ xa mà không có token phân quyền.
