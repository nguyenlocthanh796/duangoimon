# 👑 CẨM NANG HƯỚNG DẪN SỬ DỤNG ONGCHU LEAN POS
> **Hệ Thống Quản Lý Bán Hàng F&B Thực Chiến Vị Chủ Quán — Vận Hành Tối Giản, Chống Thất Thoát, Không Thừa Thãi**

---

## 🧭 MỤC LỤC
1. [Khởi Động Ca Làm Việc & Đếm Két Đầu Ngày](#1-khởi-động-ca-làm-việc--đếm-két-đầu-ngày)
2. [Vận Hành Bán Hàng & Giờ Cao Điểm](#2-vận-hành-bán-hàng--giờ-cao-điểm)
3. [Đa Kênh Thanh Toán & Xuất Hóa Đơn Điện Tử](#3-đa-kênh-thanh-toán--xuất-hóa-đơn-điện-tử)
4. [Điều Phối Bếp / Bar Realtime (KDS)](#4-điều-phối-bếp--bar-realtime-kds)
5. [Sổ Quỹ Chi Chợ 3 Giây & Quản Lý Dòng Tiền](#5-sổ-quỹ-chi-chợ-3-giây--quản-lý-dòng-tiền)
6. [Giao Ca Cuối Ngày & Kiểm Két 30 Giây](#6-giao-ca-cuối-ngày--kiểm-két-30-giây)
7. [Báo Cáo 3 Con Số Vàng Bỏ Túi Cho Chủ Quán](#7-báo-cáo-3-con-số-vàng-bỏ-túi-cho-chủ-quán)
8. [Quản Lý Nhân Sự & Bảng Lương Tự Động](#8-quản-lý-nhân-sự--bảng-lương-tự-động)
9. [Quản Lý Khách Hàng & Sổ Nợ CRM](#9-quản-lý-khách-hàng--sổ-nợ-crm)
10. [Quản Lý Kho Hàng & Giá Vốn Yield COGS](#10-quản-lý-kho-hàng--giá-vốn-yield-cogs)
11. [Cài Đặt Thương Hiệu, Bảo Mật PIN & Bot Telegram](#11-cài-đặt-thương-hiệu-bảo-mật-pin--bot-telegram)
12. [Cài Đặt Phần Cứng & Máy In Nhiệt ESC/POS](#12-cài-đặt-phần-cứng--máy-in-nhiệt-escpos)
13. [In Tem Dán Ly Trà Sữa / Cà Phê 50x30mm](#13-in-tem-dán-ly-trà-sữa--cà-phê-50x30mm)
14. [Xử Lý Sự Cố Khẩn Cấp Thường Gặp (Troubleshooting)](#14-xử-lý-sự-cố-khẩn-cấp-thường-gặp-troubleshooting)

---

## 1. KHỞI ĐỘNG CA LÀM VIỆC & ĐẾM KÉT ĐẦU NGÀY

### 1.1. Đăng Nhập & Mở Ca
1. Mở ứng dụng POS trên Điện thoại, Máy tính bảng (iPad) hoặc Máy tính POS.
2. Chạm vào **Đổi Ca / Vào Ca Mới** hoặc nhập **Mã PIN 4 số** của bạn:
   - **Chủ Quán**: PIN mặc định `9999` (Toàn quyền quản trị chuỗi, xem báo cáo, cài đặt).
   - **Quản Lý**: PIN mặc định `8888` (Xem thực đơn, kho hàng, P&L chi nhánh, duyệt chiết khấu).
   - **Thu Ngân**: PIN mặc định `1111` (Bán hàng, thu tiền, in bill, mở sổ quỹ ca).
   - **Phục Vụ**: PIN mặc định `2222` (Xem bàn, gọi món, báo bếp).
3. Vào menu **Giao Ca Đếm Két** (`/giao-ca`) $\rightarrow$ Chọn **Mở Ca Mới**.
4. Nhập số tiền mặt có sẵn trong két để thối tiền lẻ (Ví dụ: `1.000.000 đ`).
5. Bấm **Xác Nhận Mở Ca** — Hệ thống kích hoạt đồng hồ ca và ghi nhận số dư đầu kỳ.

> [!TIP]
> **Quy Tắc Vị Chủ Quán**: Tiền lẻ đầu ca chuẩn bị từ 500k - 1tr (các mệnh giá 10k, 20k, 50k). Không để tiền chẵn 500k trong két đầu ngày để tránh thiếu tiền thối cho khách mở hàng.

---

## 2. VẬN HÀNH BÁN HÀNG & GIỜ CAO ĐIỂM

### 2.1. Chọn Bàn & Mở Đơn
- **Khách ngồi tại bàn**: Trên màn hình **Bán Hàng** (`/`), chạm vào ô bàn khách ngồi (Màu xám: Bàn trống; Màu xanh: Đang có khách).
- **Khách mang về (Take-away)**: Chọn nhanh tab **Mang Về** hoặc bấm trực tiếp vào danh sách món mà không cần gán số bàn.

### 2.2. Chọn Món, Topping & Tùy Chọn
1. Chạm vào món ăn / thức uống trên menu (Lọc theo danh mục: Cà phê, Trà sữa, Ăn vặt, Sinh tố...).
2. Nếu món có tùy chọn (Size M/L, Đường 30%/50%/70%, Đá ít/bình thường, Topping Trân châu/Thạch):
   - Bảng tùy chọn bật lên ngay lập tức.
   - Chạm 1 lần để chọn size và thêm topping.
   - Bấm **Thêm Vào Đơn**.
3. **Đổi giá hoặc số lượng tức thì**: Chạm vào món trong giỏ hàng để tăng giảm `+ / -` hoặc nhập số lượng nhanh.

### 2.3. Báo Bếp / Bar Chế Biến (KDS)
- Sau khi chọn xong món, bấm nút **Báo Bếp** (Màu cam jade).
- **Ngay lập tức (0ms)**:
  - Máy in bar/bếp in phiếu order món tự động qua cổng mạng LAN (Port 9100).
  - Màn hình **Bếp & Bar KDS** (`/kds`) phát chuông thông báo và hiện thẻ order mới.
  - Bàn chuyển sang trạng thái **Có khách** (Màu xanh thương hiệu).

### 2.4. Chuyển Bàn, Gộp Bàn, Tách Đơn
- Khi khách muốn chuyển bàn:
  1. Chạm vào bàn hiện tại $\rightarrow$ Chọn **Chuyển Bàn**.
  2. Chọn bàn đích muốn chuyển tới $\rightarrow$ Xác nhận.
  3. Mọi món ăn và trạng thái chế biến tự động chuyển sang bàn mới.
- Khi 2 nhóm khách gộp chung: Chọn **Gộp Bàn** $\rightarrow$ Toàn bộ món gộp về 1 hóa đơn duy nhất.

### 2.5. Tạo Danh Mục Mặt Hàng Đơn Giản, Nhanh Chóng
- Khi quán ra mắt nhóm sản phẩm mới (Bánh Ngọt, Trà Trái Cây, Ăn Vặt...):
  - **Thao tác 1-chạm**: Vào **Thực Đơn** (`/thuc-don`) $\rightarrow$ Tab **Danh Mục** $\rightarrow$ Bấm **[+ Thêm Nhóm]** $\rightarrow$ Nhập tên & chọn icon $\rightarrow$ Bấm **[Tạo Nhóm]**.
  - **Hướng dẫn có hình ảnh minh họa từng bước**: Xem tài liệu chi tiết tại [docs/HUONG_DAN_TAO_DANH_MUC.md](file:///d:/duanpos-ongchu/docs/HUONG_DAN_TAO_DANH_MUC.md) hoặc xem trực tiếp trên ứng dụng tại mục **Hướng Dẫn** (`/huong-dan`).

### 2.6. Thêm Món Ngoài Menu (+ Món Khác / Custom Item)
- Phục vụ các yêu cầu đặc thù của khách (ví dụ: Mua thêm đá lạnh, tiền gửi xe hộ, bao bì đặc biệt):
  1. Tại màn hình Bán Hàng, bấm nút **[+ Món Khác]** ở góc danh mục hoặc giỏ hàng.
  2. Nhập **Tên món/dịch vụ** (Ví dụ: `Thêm đá viên túi lớn`) và **Đơn giá**.
  3. Chọn số lượng $\rightarrow$ Bấm **Thêm Vào Đơn**. Món xuất hiện ngay trong giỏ hàng và bill tính tiền.

### 2.7. Chiết Khấu Đơn Hàng (% Hoặc VNĐ) & Khóa PIN An Toàn
- Giảm giá cho khách VIP, đối tác hoặc chương trình khai trương:
  1. Trong giỏ hàng, chạm vào dòng **Giảm giá / Chiết khấu**.
  2. Chọn giảm theo phần trăm `%` (Ví dụ: `10%`) hoặc số tiền cụ thể `VNĐ` (Ví dụ: `20.000 đ`).
  3. **Cơ chế chống gian lận**: Nếu mức giảm $\le 20\%$, hệ thống áp dụng ngay; nếu mức giảm $> 20\%$, bắt buộc nhập **Mã PIN Quản Lý** và hệ thống tự động bắn cảnh báo qua Bot Telegram của Chủ Quán.

### 2.8. Quản Lý Nhóm Topping & Định Giá Thức Uống
- Vào **Thực Đơn** (`/thuc-don`) $\rightarrow$ Tab **Topping**:
  1. Tạo nhóm tùy chọn (Ví dụ: *Topping Trà Sữa*, *Mức Đường*, *Mức Đá*).
  2. Thêm từng loại kèm giá bán (Ví dụ: *Trân châu đen: +5.000đ*, *Pudding trứng: +8.000đ*).
  3. Gán nhóm topping vào các danh mục đồ uống phù hợp để hiển thị tự động khi thu ngân chọn món.

### 2.9. Tra Cứu Sổ Đơn, In Lại Bill & Hoàn Tiền
- Vào menu **Sổ Đơn** (`/hoa-don`):
  1. Tìm kiếm hóa đơn theo Mã đơn (`HD-xxxxx`), Số bàn hoặc Khung giờ.
  2. Bấm vào hóa đơn để xem chi tiết từng món và phương thức thanh toán.
  3. Bấm **In Lại Bill**: Máy in xuất lại hóa đơn có ghi rõ nhãn `[IN LẠI]` để tránh gian lận.
  4. Bấm **Hoàn Tiền / Hủy Đơn**: Chọn lý do hủy (Khách trả lại món, Sai đơn) $\rightarrow$ Nhập PIN quản lý $\rightarrow$ Hệ thống tự động hoàn tiền vào sổ quỹ ca.

---

## 3. ĐA KÊNH THANH TOÁN & XUẤT HÓA ĐƠN ĐIỆN TỬ

### 3.1. Thanh Toán Tiền Mặt
1. Tại giỏ hàng, bấm **Tính Tiền** $\rightarrow$ Màn hình thanh toán hiển thị tổng tiền cần thu.
2. Chọn mệnh giá tiền khách đưa qua phím tắt nhanh (`50k`, `100k`, `200k`, `500k`, `Đưa đủ`).
3. Màn hình tự động tính chính xác **Tiền thừa thối lại**.
4. Bấm **Xong & In Bill**:
   - Két đựng tiền tự động bật mở qua cổng RJ11.
   - Máy in K80/K58 in hóa đơn thanh toán sắc nét trong 0.5s.
   - Đơn hàng hoàn tất và bàn trở về trạng thái trống.

### 3.2. Thanh Toán Chuyển Khoản VietQR Động
1. Tại màn hình thanh toán, chọn tab **VietQR Chuyển Khoản**.
2. Mã QR động hiển thị lập tức với **Đúng số tiền** và **Nội dung chuyển khoản chuẩn**:
   - Khách hàng xem mã QR trực tiếp trên màn hình thu ngân hoặc màn hình phụ khách hàng **CFD** (`/cfd`).
   - Khách mở ứng dụng ngân hàng bất kỳ (Vietcombank, MBBank, Techcombank, Momo, ZaloPay...) quét mã 1 giây.
3. **Xác nhận tiền vào**:
   - **Loa thông báo âm thanh 0 đồng**: Ứng dụng tự động phát giọng nói *"Đã nhận thành công [số tiền] đồng"* qua loa quầy.
   - Bấm **Hoàn Tất & In Bill**.

### 3.3. Bán Ghi Nợ Cho Khách Quen (Sổ Nợ)
1. Chọn tab **Ghi Nợ Khách Quen**.
2. Tìm kiếm khách theo Tên hoặc Số điện thoại.
3. Nhập số tiền khách trả trước (nếu có) $\rightarrow$ Số tiền còn lại được ghi nhận tự động vào **Sổ Nợ** (`/khach-hang`).
4. Khi khách thanh toán nợ: Vào **Khách Hàng & Sổ Nợ** $\rightarrow$ Chọn khách $\rightarrow$ Bấm **Thu Nợ**.

### 3.4. Thanh Toán Kết Hợp (Tiền Mặt + Chuyển Khoản VietQR)
- Trường hợp khách chỉ còn một ít tiền mặt và muốn trả nốt phần còn lại qua chuyển khoản:
  1. Tại màn hình Thanh Toán, chọn hình thức **Kết Hợp (Split Payment)**.
  2. Nhập số tiền mặt khách đưa (Ví dụ: Tổng bill `150.000 đ`, khách đưa `50.000 đ`).
  3. Hệ thống tự động tính số tiền còn lại (`100.000 đ`) và sinh mã VietQR động chính xác `100.000 đ`.
  4. Khách quét mã $\rightarrow$ Loa báo nhận tiền $\rightarrow$ Bấm **Xong & In Bill**.
  5. Sổ quỹ ca tự động phân bổ chính xác: `50.000 đ` vào két tiền mặt và `100.000 đ` vào tài khoản ngân hàng.

### 3.5. Xuất Hóa Đơn Điện Tử Máy Tính Tiền (MTT CQT)
- OngChu Lean POS tích hợp sẵn chuẩn **Nghị định 123/2020/NĐ-CP** và **Thông tư 78/2021/TT-BTC**.
- Khi khách có nhu cầu lấy hóa đơn VAT:
  1. Bật công tắc **Xuất Hóa Đơn VAT (MTT)**.
  2. Nhập Mã Số Thuế (MST) của công ty $\rightarrow$ Hệ thống tự động tra cứu tên doanh nghiệp và địa chỉ từ cổng Thuế.
  3. Bấm **Ký & Gửi CQT** $\rightarrow$ Hóa đơn điện tử có mã của Cơ quan Thuế phát hành trong 1 giây kèm mã QR tra cứu trên hóa đơn in nhiệt.

---

## 4. ĐIỀU PHỐI BẾP / BAR REALTIME (KDS)

Màn hình **Bếp & Bar KDS** (`/kds`) hoạt động độc lập trên máy tính bảng hoặc màn hình TV treo tại quầy pha chế / bếp.

### 4.1. Quy Trình Chế Biến Mượt Mà
- **Cột Chờ Làm (Màu vàng)**: Các món mới báo từ quầy thu ngân hoặc phục vụ. Đồng hồ bấm giây đếm ngược theo thời gian thực.
- **Bắt Đầu Làm**: Đầu bếp / Bartender chạm vào món hoặc thẻ order để chuyển sang trạng thái **Đang nấu / Đang pha (Màu xanh dương)**.
- **Xong Món**: Chạm vào từng món khi hoàn thành hoặc bấm **Xong Hết**.
- **Báo Bưng Bàn**: Khi toàn bộ món trong đơn đã xong, chuông reo báo nhân viên bưng đồ tới bàn khách.

### 4.2. Báo Hết Món Nhanh (86 Out of Stock)
- Khi nguyên liệu trong bếp hết (Ví dụ: Hết trà sen vàng):
  1. Trên màn hình KDS, bấm nút **Báo Hết Món**.
  2. Chọn món hết hàng $\rightarrow$ Xác nhận.
  3. **Tức thì 0ms**: Toàn bộ máy POS của thu ngân và phục vụ tự động khóa món đó, không thể chọn thêm, tránh tình trạng nhận order rồi phải xin lỗi khách.

---

## 5. SỔ QUỸ CHI CHỢ 3 GIÂY & QUẢN LÝ DÒNG TIỀN

Mọi khoản chi lặt vặt bằng tiền mặt trong ngày đều phải ghi lại để cuối ngày két không bị lệch.

### 5.1. Thao Tác Ghi Chi Chợ 3 Giây
1. Vào menu **Sổ Quỹ Chi Chợ** (`/so-quy`).
2. Chạm vào phím tắt danh mục chi thường gặp:
   - **Mua Đá**
   - **Mua Rau / Thịt / Thực Phẩm**
   - **Bao Bì / Ly Nhựa / Ống Hút**
   - **Sửa Chữa Điện Nước**
   - **Ứng Lương Nhân Viên**
   - **Khác**
3. Nhập số tiền chi (Ví dụ: `50.000 đ`).
4. Bấm **Lưu Khoản Chi** $\rightarrow$ Xong!
5. Hệ thống tự động trừ trực tiếp số tiền này vào **Tiền mặt trong két ca hiện tại**.

---

## 6. GIAO CA CUỐI NGÀY & KIỂM KÉT 30 GIÂY

### 6.1. Quy Trình Kiểm Két Chốt Ca
1. Cuối ca, Thu ngân vào màn hình **Giao Ca Đếm Két** (`/giao-ca`).
2. Hệ thống hiển thị bảng số tờ tiền các mệnh giá:
   - Đếm số lượng tờ tiền thực tế trong két và nhập số tờ (`500k: x tờ`, `200k: x tờ`, `100k: x tờ`...).
   - Bảng tính tự động nhân ra **Tổng tiền mặt thực tế kiểm đếm**.
3. Bấm **Đối Soát Ca**:
   - **Tiền mặt hệ thống tính**: `Tiền đầu ca + Doanh thu tiền mặt bán hàng + Tiền thu khác - Tiền chi chợ`.
   - **Tiền thực tế kiểm két**: Số tiền đếm được.
   - **Chênh lệch**:
     - Bằng `0 đ`: Ca chuẩn xác hoàn hảo, két khớp 100%.
     - Khác `0 đ`: Hệ thống báo động chênh lệch màu đỏ (Thừa hoặc Thiếu).
4. Bấm **Chốt & In Phiếu Giao Ca** $\rightarrow$ Máy in nhiệt in biên bản giao ca bàn giao cho ca sau.

### 6.2. Cơ Chế Báo Động Gian Lận Tức Thì Qua Telegram
Hệ thống tự động kích hoạt Goroutine gửi cảnh báo khẩn cấp tới điện thoại Chủ Quán khi:
- Lệch két tiền mặt cuối ca vượt ngưỡng cho phép (> 20.000 đ).
- Hủy món ăn sau khi đã in phiếu tạm tính cho khách.
- Áp dụng chiết khấu giảm giá đơn hàng lớn hơn 20%.
- Bấm nút kích mở két đựng tiền bằng tay ngoài giao dịch bán hàng.

---

## 7. BÁO CÁO 3 CON SỐ VÀNG BỎ TÚI CHO CHỦ QUÁN

Chủ quán không cần xem bảng biểu kế toán phức tạp hàng chục trang. Truy cập **Báo Cáo Lợi Nhuận** (`/bao-cao-loi-nhuan`) để nắm bắt 3 con số cốt lõi:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        3 CON SỐ VÀNG BỎ TÚI                            │
├────────────────────────────────┬───────────────────────────────────────┤
│ 1. TIỀN MẶT TRONG KÉT THỰC TẾ  │ Doanh thu tiền mặt - Chi chợ tiền mặt │
│    (Cầm tay ngay)              │ = Tiền thực tế có trong ngăn kéo két  │
├────────────────────────────────┼───────────────────────────────────────┤
│ 2. TIỀN VIETQR NGÂN HÀNG       │ Tổng tiền khách chuyển khoản Napas247 │
│    (Tài khoản số dư ngân hàng) │ = Đối soát chuẩn xác với App Ngân Hàng│
├────────────────────────────────┼───────────────────────────────────────┤
│ 3. LỢI NHUẬN RÒNG BỎ TÚI       │ Doanh thu thuần - Giá vốn (COGS)      │
│    (Tiền lời thực sự hôm nay)  │ - Chi phí vận hành trong ngày         │
└────────────────────────────────┴───────────────────────────────────────┘
```

- **Biểu đồ doanh thu theo giờ**: Giúp bố trí ca nhân viên vào khung giờ cao điểm (11h-13h và 19h-21h).
- **Top 5 món bán chạy nhất (Best-sellers)**: Nắm rõ món sinh lời chủ lực để luôn dự trữ đầy đủ nguyên liệu.

---

## 8. QUẢN LÝ NHÂN SỰ & BẢNG LƯƠNG TỰ ĐỘNG

Tính năng quản lý nhân sự tại `/nhan-su` giải phóng chủ quán khỏi sổ sách chấm công thủ công và tính lương cuối tháng.

### 8.1. Thêm Nhân Viên & 3 Mô Hình Trả Lương
1. Vào menu **Nhân Sự** (`/nhan-su`) $\rightarrow$ Bấm **[+ Thêm Nhân Viên]**.
2. Chọn hình thức trả lương phù hợp với từng vị trí:
   - **Theo Giờ (`hourly`)**: Dành cho nhân viên part-time (sinh viên, phục vụ ca linh hoạt). Mức lương tính theo đơn giá/giờ.
   - **Theo Tháng (`monthly`)**: Dành cho nhân sự full-time cố định (Bếp trưởng, Quản lý cửa hàng).
   - **Theo Ca (`per_shift`)**: Dành cho nhân viên khoán theo từng ca 4 tiếng hoặc 6 tiếng.
3. Thiết lập **Mã PIN 4 số** riêng biệt cho từng nhân viên: Giúp nhân viên chấm công và đăng nhập bán hàng mà không thể xem doanh thu của quán.

### 8.2. Chấm Công & Tăng Ca OT
- **Nhân viên tự chấm công**: Đầu ca chạm **Vào Ca** (Clock In), cuối ca chạm **Ra Ca** (Clock Out). Hệ thống tự tính số giờ làm thực tế với độ chính xác tuyệt đối.
- **Quản lý ghi nhận tăng ca**: Trong trường hợp quán đông khách cần làm thêm giờ, quản lý vào tab **Chấm Công** $\rightarrow$ Bấm **Ghi Nhận Ca** $\rightarrow$ Nhập giờ thường và giờ OT.

### 8.3. Tạm Ứng Lương & Trừ Sổ Quỹ Tự Động
- Khi nhân viên có nhu cầu tạm ứng tiền mặt giữa tháng:
  1. Chạm vào tên nhân viên $\rightarrow$ Bấm **Tạm Ứng**.
  2. Nhập số tiền tạm ứng (Ví dụ: `500.000 đ`).
  3. Bấm **Lưu Phiếu Tạm Ứng** $\rightarrow$ Hệ thống tự động ghi nhận phiếu chi tiền mặt vào **Sổ Quỹ** ca hiện tại và trừ trực tiếp vào số tiền mặt trong két.

### 8.4. Tính Lương Thực Lĩnh & Chi Lương 1-Chạm
- Cuối tháng, bấm nút **Tính Lương**:
  $$\text{Thực Lĩnh} = \text{Lương Cơ Bản / Giờ Công} + \text{Thưởng} - \text{Phạt} - \text{Tạm Ứng}$$
- Kiểm tra lại bảng lương $\rightarrow$ Bấm **Chi Lương**: Hệ thống tự động sinh phiếu chi lương vào Sổ Quỹ và làm mới công kỳ mới.

---

## 9. QUẢN LÝ KHÁCH HÀNG & SỔ NỢ CRM

Quản lý khách hàng thân thiết và theo dõi dòng tiền công nợ tại `/khach-hang`.

### 9.1. Quản Lý Danh Bạ & Hạn Mức Nợ
- Tạo hồ sơ khách hàng với Tên, Số điện thoại và Hạng thành viên (Thường, VIP).
- Thiết lập **Hạn Mức Nợ Tối Đa**: Ngăn chặn tình trạng nhân viên cho khách quen nợ vượt quá giới hạn an toàn của quán.

### 9.2. Thu Nợ Khách Quen & Gạch Nợ Tức Thời
1. Vào menu **Khách Hàng** (`/khach-hang`) $\rightarrow$ Danh sách hiển thị tổng tiền nợ của từng khách.
2. Khi khách đến thanh toán: Bấm vào tên khách $\rightarrow$ Bấm **Thu Nợ**.
3. Chọn phương thức:
   - **Tiền Mặt**: Nhập số tiền thu $\rightarrow$ Tự động cộng vào két tiền mặt ca hiện tại.
   - **Mã VietQR**: Khách quét mã chuyển khoản $\rightarrow$ Webhook ngân hàng tự động phát hiện và gạch nợ tức thời.

---

## 10. QUẢN LÝ KHO HÀNG & GIÁ VỐN YIELD COGS

Kiểm soát tồn kho nguyên vật liệu và bảo vệ biên lợi nhuận tại `/kho-hang`.

### 10.1. Nhập Kho Nguyên Liệu
- Vào menu **Kho Hàng** (`/kho-hang`) $\rightarrow$ Bấm **Nhập Kho**.
- Chọn nguyên vật liệu (Hạt cà phê, Trà đen, Sữa tươi, Đường, Siro...), nhập số lượng và đơn giá nhập thực tế.
- Tồn kho tự động tăng lên và cập nhật giá vốn bình quân gia quyền.

### 10.2. Tỷ Lệ Hao Hụt (Yield Rate) & Giá Vốn Thực Tế (Effective COGS)
- Trong ngành F&B, nguyên liệu luôn có tỷ lệ hao hụt khi sơ chế (nhặt rau, pha chế, cặn bột cà phê).
- Hệ thống tự động áp dụng công thức:
  $$\text{Effective COGS} = \frac{\text{Giá Nhập Gốc}}{\text{Yield Rate}}$$
- Đảm bảo báo cáo lợi nhuận phản ánh đúng 100% chi phí thực tế bỏ ra.

### 10.3. Cảnh Báo Giá Nhập Tăng Vọt (> 15%)
- Khi giá nhập một loại nguyên liệu tăng hơn 15% so với lần nhập trước, hệ thống hiển thị cảnh báo đỏ trên màn hình kho hàng và báo động cho Chủ Quán để kịp thời điều chỉnh giá bán hoặc tìm nhà cung cấp mới.

---

## 11. CÀI ĐẶT THƯƠNG HIỆU, BẢO MẬT PIN & BOT TELEGRAM

Toàn bộ cấu hình cửa hàng tập trung tại màn hình **Cài Đặt** (`/cai-dat`).

### 11.1. Tùy Biến Thương Hiệu & Mẫu In Hóa Đơn K80 / K58
- **Thông Tin Quán**: Nhập Tên quán, Slogan, Địa chỉ, Hotline, Tên WiFi và Mật khẩu WiFi.
- **Mẫu In Bill**:
  - Chọn khổ giấy K80 (80mm) cho quầy thu ngân chuẩn hoặc K58 (58mm) cho máy POS mini cầm tay.
  - Tùy biến hiển thị: Tên thu ngân, Giờ vào/Giờ ra, WiFi pass, Lời cảm ơn.
  - Xem trực tiếp mẫu hóa đơn qua khung xem trước thời gian thực (**Live Bill Preview**).

### 11.2. Khóa Hủy Món & Mã PIN Quản Trị
- **Đổi Mã PIN Chủ Quán**: Đổi mã PIN mặc định `9999` thành mã 4 số bí mật của riêng chủ quán.
- **Khóa Hủy Món Sau Gửi Bếp**: Bật công tắc này để nhân viên không thể tự ý xóa món ăn đã chuyển vào bếp/bar nếu không có quản lý nhập mã PIN.

### 11.3. Cấu Hình Bot Telegram Báo Động Gian Lận
- Nhập **Telegram Bot Token** và **Chat ID** của chủ quán.
- Bấm **Gửi Thử Tin Nhắn** để kiểm tra kết nối.
- Khi có các hành vi rủi ro (Hủy món sau in tạm tính, chiết khấu > 20%, lệch két giao ca, mở két thủ công), bot sẽ gửi cảnh báo ngay lập tức về điện thoại chủ quán.

### 11.4. Đăng Nhập Kiosk PIN Pad 4 Số & Bàn Giao Ca Nhanh
- Quầy thu ngân đông khách cần thay ca hoặc rời vị trí:
  1. Chạm vào tên nhân viên hoặc icon ổ khóa trên thanh Header $\rightarrow$ Khóa màn hình trong 0.1s.
  2. Nhân viên mới chỉ cần gõ **4 số PIN** trên bàn phím số Numpad cảm ứng để vào ca ngay.
  3. Mọi thao tác bán hàng, in bill, hủy món gắn chặt với ID nhân viên đó trong Audit Log.

### 11.5. Quản Lý Chuỗi Đa Chi Nhánh Cho Chủ Quán
- Dành cho chủ thương hiệu vận hành từ 2 cửa hàng trở lên:
  1. Vào menu **Cài Đặt** (`/cai-dat`) $\rightarrow$ Chọn mục **Quản Lý Chi Nhánh**.
  2. Xem danh sách chi nhánh kèm trạng thái kết nối và doanh số trong ngày.
  3. **Chuyển đổi góc nhìn 1-chạm**: Chạm vào chi nhánh cần xem để kiểm tra doanh thu, két tiền và tồn kho mà không cần đăng xuất tài khoản.
  4. **Đồng bộ thực đơn chuỗi**: Cập nhật giá món, thêm món mới và áp dụng cho toàn hệ thống chi nhánh chỉ với 1 nút bấm.

---

## 12. CÀI ĐẶT PHẦN CỨNG & MÁY IN NHIỆT ESC/POS

### 12.1. Kết Nối Máy In Nhiệt Qua Mạng LAN (Khuyên Dùng)
1. Cắm dây mạng LAN từ Router/Switch WiFi vào cổng mạng phía sau máy in K80/K58.
2. In giấy test của máy in để xem địa chỉ IP (Ví dụ: `192.168.1.200`).
3. Vào màn hình **Cài Đặt** (`/cai-dat`) trên POS:
   - Nhập IP máy in hóa đơn: `192.168.1.200`
   - Cổng kết nối TCP: `9100` (Cổng chuẩn ESC/POS trực tiếp)
   - Khổ giấy: Chọn `K80 (80mm)` hoặc `K58 (58mm)`
4. Bấm **In Thử Hóa Đơn**:
   - Máy in kêu tít và in ra phiếu in thử kiểm tra font tiếng Việt UTF-8.
   - Nếu két tiền có cắm cáp RJ11 vào máy in, bấm **Bật Két Thử** để kiểm tra lực kích 24V.

### 12.2. Kết Nối Màn Hình Phụ Khách Hàng (CFD)
1. Sử dụng một máy tính bảng hoặc màn hình phụ quay về phía khách thanh toán.
2. Mở trình duyệt web hoặc ứng dụng và truy cập route: `/cfd`.
3. Màn hình CFD tự động kết nối WebSocket với máy POS chính:
   - Khi thu ngân chọn món, giỏ hàng hiện realtime trên màn hình CFD.
   - Khi chọn thanh toán VietQR, mã QR lớn tự động xuất hiện cho khách quét.
   - Khi rảnh rỗi, hiển thị video / banner quảng cáo món mới của quán.

---

## 13. IN TEM DÁN LY TRÀ SỮA / CÀ PHÊ 50X30MM

Mô hình quán trà sữa, cà phê mang đi cần in tem dán trực tiếp lên từng ly để nhân viên pha chế đúng yêu cầu và giao đúng khách.

### 13.1. Cấu Hình Máy In Tem Dán Ly
1. Cắm máy in nhãn decal (máy in mã vạch TSPL) vào mạng LAN quán.
2. Vào **Cài Đặt** (`/cai-dat`) $\rightarrow$ Tab **Mẫu In Bill**.
3. Nhập IP máy in tem ly và cổng TCP `9100`.
4. Bấm **In Thử Tem Ly**: Máy in nhãn xuất ra tem mẫu có kích thước chuẩn 50x30mm.

### 13.2. Cơ Chế In Tem Tự Động Phân Tách Từng Ly
- Khi đơn hàng có nhiều ly cùng một món (Ví dụ: 3 Trà Sữa Trân Châu Size L):
  - Hệ thống tự động phân tách thành 3 tem in riêng biệt: `Ly 1/3`, `Ly 2/3`, `Ly 3/3`.
  - Trên mỗi tem hiển thị rõ: Tên món, Size, % Đường, % Đá, Topping ăn kèm và Mã hóa đơn để không bao giờ bị nhầm lẫn.

---

## 14. XỬ LÝ SỰ CỐ KHẨN CẤP THƯỜNG GẶP (TROUBLESHOOTING)

### 🚨 Sự Cố 1: Máy In Không In Ra Giấy Hoặc Bị Kẹt Giấy
1. Kiểm tra đèn báo trên mặt máy in:
   - Đèn **ERROR đỏ nhấp nháy**: Hết giấy hoặc nắp đậy chưa đóng chặt $\rightarrow$ Mở nắp, đặt lại cuộn giấy (mặt nhiệt úp xuống), đóng nắp nghe tiếng tách.
   - Đèn **POWER không sáng**: Kiểm tra lại adapter nguồn 24V phía sau máy.
2. Kiểm tra dây mạng LAN: Đèn xanh/cam ở cổng RJ45 phía sau máy in phải sáng và nhấp nháy.
3. Kiểm tra địa chỉ IP: Đảm bảo thiết bị POS và máy in đang kết nối chung một mạng WiFi / dải IP nội bộ.
4. Bấm nút **In Thử Bill** trong Cài đặt để kiểm tra lại kết nối socket 9100.

### 🚨 Sự Cố 2: Mất Kết Nối Mạng Internet Trong Giờ Cao Điểm
- OngChu Lean POS được thiết kế theo chuẩn **Offline-First**:
  - Khi mất Internet, toàn bộ tác vụ bán hàng, báo bếp, thanh toán tiền mặt, mở két và in bill K80 vẫn **hoạt động 100% bình thường** qua mạng LAN nội bộ.
  - Khi có Internet trở lại, dữ liệu tự động đồng bộ lên đám mây mà không mất mát bất kỳ hóa đơn nào.

### 🚨 Sự Cố 3: Khách Báo Đã Quét QR Nhưng Máy POS Chưa Báo Nhận (Cảnh Giác Bill Giả)
1. **Cảnh giác chiêu trò lừa đảo bill chuyển khoản giả mạo (Fake Bill)**:
   - Một số đối tượng sử dụng web/app tạo ảnh chụp biên lai ngân hàng giả có đầy đủ tên và số tiền như thật.
   - **Quy tắc vàng**: Chỉ tin tưởng khi (1) Màn hình POS tự động báo xanh "Đã Nhận Tiền" và tự in bill qua Webhook ngân hàng, HOẶC (2) Điện thoại của chủ quán có tin nhắn SMS / thông báo Notification tiền đã vào tài khoản.
2. Nếu do nghẽn mạng liên ngân hàng Napas: Chụp lại màn hình giao dịch của khách, xin lại Số điện thoại liên hệ, sau đó bấm nút **Xác Nhận Đã Nhận Tiền Thủ Công** và lưu hóa đơn ở trạng thái "Chờ đối soát".

### 🚨 Sự Cố 4: Nhân Viên Quên Mã PIN Hoặc Khóa Màn Hình
- Chủ quán hoặc Quản lý ca sử dụng mã PIN quản trị (`8888` hoặc `9999`) để mở khóa ngay lập tức.
- Vào menu **Nhân Sự** (`/nhan-su`) $\rightarrow$ Chọn tên nhân viên $\rightarrow$ Bấm **Cấp Lại PIN Mới**.

### 🚨 Sự Cố 5: Cơ Chế Đồng Bộ Hóa Offline & Khôi Phục Dữ Liệu
1. Khi mất mạng Internet hoặc đứt cáp, biểu tượng đám mây trên Header chuyển màu cam: `Offline (N đơn)`.
2. Mọi giao dịch được ghi nhận an toàn vào cơ sở dữ liệu SQLite cục bộ trên thiết bị, tuyệt đối không mất dữ liệu.
3. Khi có kết nối Internet trở lại, hệ thống chạy tiến trình đồng bộ ngầm tự động đẩy dữ liệu lên máy chủ máy chủ đám mây.
4. Biểu tượng chuyển sang màu xanh lá: `Đã đồng bộ 100%`. Chủ quán có thể vào **Cài Đặt** $\rightarrow$ Bấm **Đồng Bộ Ngay** để kích hoạt thủ công bất cứ lúc nào.

---
*OngChu Lean POS — Tinh gọn tối đa, tốc độ tối thượng, bảo vệ từng đồng lợi nhuận của bạn.*
