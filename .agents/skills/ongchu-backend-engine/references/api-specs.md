# 📡 ĐẶC TẢ CHI TIẾT REST API ENDPOINTS (API SPECS)

Base URL: `http://localhost:8080` (hoặc `http://localhost:8085` qua proxy)

---

## 1. HỆ THỐNG & ĐỒNG BỘ
- `GET /health`: Kiểm tra trạng thái máy chủ (`{"status": "ok", "app": "ongchu-lean-pos"}`).
- `GET /ws/pos`: Kết nối WebSocket 2 chiều nhận sự kiện cập nhật đơn hàng, gọi món, trạng thái bàn.

---

## 2. QUẢN LÝ ĐƠN HÀNG & BÀN
- `POST /api/v1/orders`: Tạo mới đơn hàng cho bàn.
  - Body: `{ "table_id": "table-1", "items": [{"product_id": "1", "quantity": 2, "unit_price": 35000, "modifiers": []}] }`
- `POST /api/v1/orders/:id/pay`: Thanh toán đơn hàng.
  - Body: `{ "payment_method": "tien_mat", "cash_given": 100000, "change_amount": 30000, "discount_amount": 0 }`
- `POST /api/v1/orders/:id/void-item`: Hủy món đã gửi bếp (yêu cầu lý do và ghi nhận audit log).

---

## 3. SỔ QUỸ TIỀN MẶT (CASH LEDGER)
- `POST /api/v1/cash/transactions`: Tạo phiếu thu / chi chợ tiền mặt.
  - Body: `{ "type": "chi", "category": "chi_mua_da", "amount": 20000, "description": "Mua 2 bao đá cây" }`
- `GET /api/v1/cash/transactions`: Lấy danh sách giao dịch thu chi trong ngày.
- `GET /api/v1/cash/summary`: Lấy tổng thu, tổng chi và số dư tiền mặt hiện tại.

---

## 4. GIAO CA & ĐẾM KÉT (CASH SHIFT)
- `POST /api/v1/shifts/open`: Mở ca làm việc mới kèm số tiền lẻ đầu ca (`starting_cash`).
- `POST /api/v1/shifts/:id/close`: Đóng ca làm việc, đối soát tiền két thực tế (`actual_ending_cash`).
- `GET /api/v1/shifts/current`: Lấy thông tin ca làm việc đang mở.

---

## 5. BÁO CÁO 3 CON SỐ VÀNG BỎ TÚI (OWNER P&L)
- `GET /api/v1/owner/pnl-summary`: Lấy 3 con số vàng:
  - `cash_in_drawer`: Tiền mặt két thực tế
  - `vietqr_bank_total`: Tiền VietQR về tài khoản
  - `real_net_profit`: Tiền lời thực đút túi

---

## 6. IN ẤN NHIỆT ESC/POS (PRINTER)
- `POST /api/v1/printer/print-receipt`: Gửi lệnh in hóa đơn qua TCP socket.
  - Body: `{ "order_id": "...", "printer_ip": "192.168.1.200", "printer_port": 9100, "kick_drawer": true }`
- `POST /api/v1/printer/open-drawer`: Gửi lệnh kích mở két tiền RJ11 độc lập.

---

## 7. MÀN HÌNH KHÁCH HÀNG (CUSTOMER DISPLAY - CFD)
- `POST /api/v1/public/cfd-sync`: Đồng bộ giỏ hàng và mã VietQR sang màn hình phụ.
- `GET /api/v1/public/cfd-active`: Lấy trạng thái giỏ hàng hiện tại cho màn hình CFD.
