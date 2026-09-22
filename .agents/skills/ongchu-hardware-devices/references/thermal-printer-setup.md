# 🖨️ HƯỚNG DẪN CẤU HÌNH & KẾT NỐI MÁY IN NHIỆT (THERMAL PRINTER SETUP)

Áp dụng cho các dòng máy in nhiệt phổ biến tại thị trường F&B Việt Nam: **Xprinter, Epson, Bixolon, Birch, Citizen (Khổ 80mm & 58mm)**.

---

## 1. CẤU HÌNH ĐỊA CHỈ IP TĨNH CHO MÁY IN LAN / WIFI
1. Cắm dây mạng LAN từ Router/Switch vào cổng RJ45 của máy in.
2. Tắt nguồn máy in, giữ nút **FEED** rồi bật nguồn lại trong 3 giây để in phiếu **Self-Test**.
3. Xem địa chỉ IP in trên phiếu (thường là `192.168.1.xxx` hoặc `192.168.123.100`).
4. Truy cập trình duyệt web vào địa chỉ IP của máy in để gán IP tĩnh cùng dải mạng với POS (Ví dụ: `192.168.1.200`, Subnet `255.255.255.0`, Gateway `192.168.1.1`).

---

## 2. KẾT NỐI NGĂN KÉO ĐỰNG TIỀN (CASH DRAWER RJ11)
1. Cắm giắc RJ11 từ ngăn kéo đựng tiền vào cổng **DK (Drawer Kick)** ở mặt sau máy in hóa đơn.
2. Khi thanh toán tiền mặt, Backend gửi chuỗi byte kích xung điện `\x1B\x70\x00\x19\xFA` (Xung 24V thời gian 250ms).
3. Ngăn kéo sẽ tự động bật mở mà thu ngân không cần dùng chìa khóa cơ.

---

## 3. XỬ LÝ SỰ CỐ THƯỜNG GẶP
- **Máy in không ra chữ / Giấy trắng tinh**: Cuộn giấy in nhiệt bị lắp ngược chiều. Lật lại mặt giấy bóng vào trong đầu in nhiệt.
- **Không kết nối được cổng 9100**: Kiểm tra lại dây cáp mạng hoặc kiểm tra xem máy in có bị trùng địa chỉ IP với thiết bị khác trong quán không.
- **Tiếng kêu bíp bíp liên tục**: Máy in hết giấy hoặc đầu in nhiệt bị kẹt nắp đậy.
