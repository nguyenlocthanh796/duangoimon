# 🍎 HỒ SƠ & HƯỚNG DẪN DUYỆT APP STORE (APPLE REVIEW NOTES)
> **Ứng dụng:** OngChu POS (OngChu Lean POS)  
> **Bundle Identifier:** `cloud.ongchu.pos` (hoặc `app.armadillo9591.grizzly1520`)  
> **Nền tảng:** iOS & iPadOS (Hỗ trợ màn hình ngang và dọc, iPhone & iPad)  
> **Phiên bản:** 1.0.0 (Build 1)  
> **Danh mục:** Business / Food & Drink  

---

## 🔑 1. THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP KIỂM THỬ (SIGN-IN DEMO CREDENTIALS)

Khi mở ứng dụng, màn hình đăng nhập hiển thị sẵn tính năng đăng nhập nhanh hoặc nhập thông tin:

- **Mã Cửa Hàng (Tenant Code):** `quanquan`
- **Tên Đăng Nhập (Username):** `quanquan`
- **Mật Khẩu (Password):** `Danh@!26062002`
- **Mã PIN Chủ Quán (Owner PIN):** `9999`
- **Mã PIN Quản Lý (Manager PIN):** `8888`
- **Mã PIN Thu Ngân (Cashier PIN):** `2222`

*(Lưu ý: Reviewer có thể nhấn trực tiếp vào chip chọn nhanh `Quán Khách (quanquan)` ở trên màn hình để tự động điền và nhấn "Đăng Nhập Hệ Thống" vào thẳng POS).*

---

## 📱 2. MÔ TẢ LUỒNG HOẠT ĐỘNG CHÍNH ĐỂ APPLE KIỂM THỬ

1. **Xem sơ đồ bàn & Mở bàn:**
   - Sau khi đăng nhập, chọn bất kỳ bàn trống nào (ví dụ: `Bàn 01` hoặc `Bàn 02`).
   - Nhấn vào bàn để mở giao diện Thực đơn gọi món.
2. **Gọi món & Giỏ hàng:**
   - Nhấn chọn các món ăn/nước uống mẫu (ví dụ: `Bánh Mì Que Hải Phòng`, `Bạc Xỉu Sữa Dừa`).
   - Món ăn được thêm ngay vào giỏ hàng với tính toán số tiền chuẩn xác.
3. **Thanh toán & In hóa đơn:**
   - Nhấn nút `Tính Tiền` ở góc dưới.
   - Màn hình thanh toán xuất hiện với 2 phương thức: Tiền mặt hoặc Chuyển khoản VietQR.
   - Nhấn nút `Xong & In Bill` để hoàn tất thanh toán. Ứng dụng mô phỏng in hóa đơn nhiệt ESC/POS K80 và giải phóng bàn ăn.
4. **Kiểm tra tính năng Xóa tài khoản (Guideline 5.1.1v):**
   - Vào mục `Cài Đặt` (Settings) → Chọn tab `Tài Khoản & PIN`.
   - Cuộn xuống khu vực màu đỏ: `Xóa Tài Khoản & Toàn Bộ Dữ Liệu`.
   - Nhập cụm từ `XOA TAI KHOAN` và mã PIN `9999` để xóa sạch dữ liệu điểm bán an toàn.

---

## 🛡️ 3. GIẢI TRÌNH CÁC QUYỀN TRUY CẬP (PERMISSION JUSTIFICATIONS)

| Tên Quyền (Info.plist) | Mục Đích Thực Tế | Ghi Chú Dành Cho Apple Review |
| :--- | :--- | :--- |
| **`NSCameraUsageDescription`** | Quét mã vạch sản phẩm & Quét mã QR thanh toán ngân hàng | Camera chỉ được kích hoạt khi thu ngân chủ động nhấn biểu tượng Quét mã. Không lưu trữ hình ảnh hoặc video người dùng. |
| **`NSLocalNetworkUsageDescription`** | Tìm kiếm & kết nối máy in hóa đơn nhiệt ESC/POS (cổng TCP 9100) qua Wi-Fi nội bộ | Đặc thù ngành F&B: Máy in bill K80/K58 và két đựng tiền RJ11 kết nối qua mạng LAN cục bộ tại quán. Ứng dụng chỉ truyền lệnh byte thô ESC/POS tới máy in. |
| **`ITSAppUsesNonExemptEncryption`** | Đặt giá trị `false` | Ứng dụng chỉ sử dụng giao thức bảo mật chuẩn HTTPS (TLSv1.2/TLSv1.3) của hệ điều hành, không dùng thuật toán mã hóa độc quyền nào. |

---

## 🌐 4. CÁC ĐƯỜNG LIÊN KẾT BẮT BUỘC (APP STORE URLs)

- **Chính Sách Quyền Riêng Tư (Privacy Policy URL):**  
  `https://ongchu.cloud/privacy`
- **Trang Hỗ Trợ Kỹ Thuật (Support URL):**  
  `https://ongchu.cloud`
- **Email Hỗ Trợ:**  
  `support@ongchu.cloud` / `locthanhit@gmail.com`
- **Hotline / Zalo hỗ trợ 24/7:**  
  `+84 392 387 165`
