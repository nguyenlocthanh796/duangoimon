# 🛡️ QUY CHUẨN SỔ QUỸ, KIỂM KÉT & CHỐNG GIAN LẬN (ANTI-FRAUD & ACCOUNTING)

Áp dụng cho toàn bộ dự án `duanpos-ongchu`. Thiết kế hệ thống kế toán tiền mặt và kiểm soát nội bộ cho chủ nhà hàng, quán cà phê theo triết lý "Vị Chủ Quán" thực chiến.

---

## 📖 1. SỔ QUỸ CHI CHỢ THỰC TẾ (`/so-quy`)

### 1.1. Triết Lý Chi Chợ Không Cần Hóa Đơn VAT
- Quán ăn, trà sữa, cà phê truyền thống phát sinh nhiều khoản chi chợ không có hóa đơn đỏ (mua đá cây 20k, mua 3kg chanh 50k, ứng lương nhân viên 200k).
- Sổ quỹ OngChu POS cho phép lập phiếu chi trong **3 giây** với các nút mẫu bấm nhanh (Preset Chips):
  - *Mua đá cây*: Mặc định `20,000 đ`
  - *Mua rau chợ*: Mặc định `150,000 đ`
  - *Ứng lương*: Mặc định `500,000 đ`
  - *Điện / Nước*: Mặc định `300,000 đ`
  - *Ly / Bao bì*: Mặc định `200,000 đ`

### 1.2. Công Thức Cập Nhật Tự Động
- Khi tạo một khoản chi tiền mặt (`type: 'chi'`), hệ thống tự động:
  1. Tạo bản ghi `CashTransaction` trong CSDL.
  2. Cộng dồn vào `total_cash_out` của ca làm việc hiện tại (`CashShift`).
  3. Giảm trừ số dư tiền mặt lý thuyết trong két.

---

## 🔒 2. GIAO CA & ĐẾM KÉT 30 GIÂY (`/giao-ca`)

### 2.1. Công Thức Tính Tiền Két Lý Thuyết (Expected Cash)
$$\text{Két Lý Thuyết} = \text{Tiền Đầu Ca} + \text{Tiền Mặt Bán Đơn} + \text{Thu Ngoài} - \text{Chi Ngoài}$$

- Doanh thu chuyển khoản VietQR được ghi nhận riêng vào `total_vietqr_sales` và **KHÔNG** cộng vào tiền két vật lý (vì tiền đã nằm trong tài khoản ngân hàng của Chủ Quán).

### 2.2. Kiểm Đếm & Xử Lý Chênh Lệch (Reconciliation)
- Thu ngân cuối ca chỉ cần đếm tiền mặt vật lý trong két và nhập số tiền vào ô `Tiền đếm được`.
- Hệ thống tự động tính:
  $$\text{Chênh Lệch} = \text{Tiền Thực Tế} - \text{Tiền Lý Thuyết}$$
  - $\text{Chênh Lệch} = 0$: Hiển thị huy hiệu xanh `KÉT TIỀN KHỚP 100%`.
  - $\text{Chênh Lệch} > 0$: Cảnh báo `THỪA KÉT (+X đ)`.
  - $\text{Chênh Lệch} < 0$: Cảnh báo `THIẾU KÉT (-X đ)`.
- Khi bấm `XÁC NHẬN KẾT CA`:
  1. Đóng ca làm việc (`status: 'da_dong'`).
  2. Ghi nhận `actual_ending_cash`, `difference_amount`, `note`.
  3. Gửi thông báo tóm tắt qua Bot Telegram cho Chủ Quán.

---

## 📊 3. BÁO CÁO 3 CON SỐ VÀNG BỎ TÚI (`/bao-cao-loi-nhuan`)

Chủ quán không cần xem bảng cân đối kế toán phức tạp, chỉ cần xem **3 Con Số Vàng**:
1. **Tiền mặt trong két thực tế (`cash_in_drawer`)**:
   Số tiền mặt thực đang có trong hộc kéo thu ngân để chuẩn bị tiền thối cho ngày mai hoặc rút về cất.
2. **Tiền về tài khoản VietQR (`vietqr_bank_total`)**:
   Tổng tiền khách đã quét mã Napas247 về thẳng app ngân hàng Vietcombank/MBBank của Chủ Quán.
3. **Tiền lời thực sự đút túi (`real_net_profit`)**:
   $$\text{Tiền Lời Đút Túi} = \text{Tổng Doanh Thu} - \text{Giá Vốn Nguyên Liệu (BOM)} - \text{Tổng Tiền Chi Chợ Mặt}$$

---

## 🚨 4. MA TRẬN PHÁT HIỆN & BÁO ĐỘNG GIAN LẬN NỘI BỘ (AUDIT LOGS)

| Hành Vi Rủi Ro | Mức Độ | Cơ Chế Kiểm Soát & Báo Động |
| :--- | :--- | :--- |
| **Hủy món sau khi in tạm tính** | 🔴 Nguy Hiểm Cao | • Bắt buộc nhập lý do hủy món trong `VoidItemModal`.<br>• Ghi `AuditLog` với `severity: 'danger'`.<br>• Bắn tin nhắn Telegram khẩn cấp đến Chủ Quán. |
| **Chiết khấu đơn hàng > 20%** | 🟡 Cảnh Báo | • Ghi nhận `AuditLog` kèm mã voucher hoặc lý do giảm giá tay.<br>• Thông báo tóm tắt qua Telegram. |
| **Mở ngăn kéo tiền bằng tay** | 🟡 Cảnh Báo | • Ghi nhận thời gian và thu ngân đang trực ca khi phím mở két được kích hoạt mà không có mã hóa đơn tương ứng. |
| **Lệch tiền giao ca cuối ca** | 🔴 Nguy Hiểm Cao | • Tự động gửi bảng kê chi tiết: Tiền đầu ca, Doanh thu mặt, Tiền chi chợ, Tiền đếm thực tế và Chênh lệch. |
