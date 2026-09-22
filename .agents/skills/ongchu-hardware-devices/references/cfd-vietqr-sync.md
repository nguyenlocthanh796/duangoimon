# 🖥️ ĐỒNG BỘ MÀN HÌNH PHỤ & MÃ VIETQR ĐỘNG (CFD & VIETQR SYNC)

Màn hình phụ khách hàng (Customer Facing Display - CFD) tại `/cfd` chạy trên một máy tính bảng (hoặc màn hình phụ thứ hai) quay về phía khách hàng.

---

## 1. GIAO THỨC ĐỒNG BỘ WEBSOCKET REALTIME
- Khi thu ngân thao tác thêm món, thay đổi Topping, số lượng hoặc áp dụng mã giảm giá trên máy POS chính:
  1. Máy POS phát sự kiện WebSocket lên `/ws/pos` với payload `cfd_cart_update`.
  2. Màn hình CFD lập tức re-render danh sách món ăn, số lượng và tổng tiền tạm tính.

---

## 2. TẠO MÃ VIETQR NAPAS247 ĐỘNG TỰ ĐỘNG
- Màn hình CFD tự động tạo đường dẫn URL mã QR động chuẩn VietQR Napas247:
  ```
  https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png?amount={TOTAL_AMOUNT}&addInfo=TT%20{TABLE_NAME}&accountName={ACCOUNT_NAME}
  ```
- **Ví dụ**:
  - Ngân hàng: `MBBank` (Mã `970422`)
  - Số tài khoản: `0909123456`
  - Tổng tiền: `130,000 đ`
  - Nội dung: `TT Ban10`
  - Chủ tài khoản: `QUAN CHE BUOI AN GIANG`
- Khách hàng chỉ cần mở ứng dụng ngân hàng bất kỳ (Vietcombank, MBBank, Techcombank, Momo, ZaloPay...) quét mã là thông tin tài khoản, số tiền và nội dung tự động điền sẵn 100%, không lo nhập nhầm số tiền.
