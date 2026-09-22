# OngChu POS — Lean F&B Point of Sale Platform

<p align="center">
  <img src="screenshots/hero_banner_trio.png" alt="OngChu POS Tri-Screen Showcase" width="920"/>
</p>

<p align="center">
  <a href="https://ongchu.cloud"><img src="https://img.shields.io/badge/Platform-Web%20%7C%20Windows%20%7C%20Android-1c1917?style=flat-square" alt="Platform"/></a>
  <a href="https://app.ongchu.cloud"><img src="https://img.shields.io/badge/Production%20App-app.ongchu.cloud-b45309?style=flat-square" alt="Live App"/></a>
  <a href="https://github.com/nguyenlocthanh796/duangoimon/releases"><img src="https://img.shields.io/badge/Release-v2.0.0-15803d?style=flat-square" alt="Release"/></a>
  <img src="https://img.shields.io/badge/Architecture-Dual--Theme%20Universal-44403c?style=flat-square" alt="Architecture"/>
  <img src="https://img.shields.io/badge/Hardware-Direct%20ESC%2FPOS%209100-b45309?style=flat-square" alt="Hardware"/>
</p>

---

## 1. Tổng Quan Hệ Thống (Executive Summary)

**OngChu POS** là hệ sinh thái quản lý và bán hàng điểm bán (Point-of-Sale) chuyên sâu dành riêng cho ngành F&B (Nhà hàng, Quán Cà Phê, Trà Sữa, Quán Ăn, Tiệm Bánh và Chuỗi Đa Chi Nhánh). 

Hệ thống được thiết kế theo triết lý **"Vị Chủ Quán (Zero-Gov & Lean Operator)"** — tối giản hóa thao tác, tốc độ cảm ứng dưới 50ms, kiểm soát dòng tiền chặt chẽ và phòng chống gian lận nội bộ tuyệt đối.

- **Web POS Trực Tiếp**: [https://app.ongchu.cloud](https://app.ongchu.cloud) (Sử dụng tức thì, không cần cài đặt)
- **Cổng Thông Tin Giải Pháp**: [https://ongchu.cloud](https://ongchu.cloud)
- **Bản Cài Đặt Desktop Windows**: Ứng dụng native siêu nhẹ ~12MB, RAM tiêu thụ <20MB
- **Bản Cài Đặt Android Native**: Tương thích mọi dòng máy POS cầm tay và Tablet Android

---

## 2. 6 Trụ Cột Kỹ Thuật & Vận Hành Bất Biến

| # | Trụ Cột | Hiện Thực Kỹ Thuật | Giá Trị Thực Chiến |
|---|---|---|---|
| **1** | **Bán Hàng 1-Chạm** | Máy trạng thái giỏ hàng đa bàn, chuyển bàn/gộp bàn tức thì | Tốc độ gọi món, in bếp và thanh toán dưới 3 giây |
| **2** | **Sổ Quỹ Chi Chợ 3s (`/so-quy`)** | Nhật ký dòng tiền chi nhanh, tự động trừ két tiền | Ghi nhận chi đá, rau, thịt, ứng lương nhân viên tức thì |
| **3** | **Giao Ca Đếm Két 30s (`/giao-ca`)** | Bảng đếm mệnh giá tiền mặt, đối soát lệch tiền tự động | Khóa ca chính xác, Telegram gửi cảnh báo khi lệch tiền |
| **4** | **Báo Cáo 3 Con Số Vàng (`/bao-cao-loi-nhuan`)** | Công thức: `Tiền Trong Két` + `Tiền Trong Bank` = `Lợi Nhuận Ròng` | Chủ quán nắm rõ tài chính tức thì, không cần đợi kế toán |
| **5** | **In Nhiệt Direct ESC/POS** | Raw TCP Socket (Port 9100) kích mở két RJ11 không cần driver | Tốc độ in bill K80/K58 tức thì, tự động cắt giấy |
| **6** | **Chống Gian Lận Độc Lập** | Goroutine kiểm soát ngầm, gửi cảnh báo Telegram tức thời | Báo động khi hủy món sau in tạm tính, chiết khấu >20%, mở két tay |

---

## 3. Bộ Ảnh Chụp Thực Tế & Hướng Dẫn Chi Tiết (Real Device Annotated Showcase)

Toàn bộ ảnh giao diện bên dưới được chụp trực tiếp từ thiết bị thật với các nhãn chỉ dẫn viền cam/đỏ trực quan:

<div align="center">
  <table>
    <tr>
      <td width="25%" align="center">
        <a href="screenshots/01_pos_table_overview.png"><img src="screenshots/01_pos_table_overview.png" alt="Sơ Đồ Bàn Ăn" width="100%"/></a><br/>
        <sub><b>1. Sơ Đồ Bàn Ăn Realtime</b></sub>
      </td>
      <td width="25%" align="center">
        <a href="screenshots/02_pos_menu_ordering.png"><img src="screenshots/02_pos_menu_ordering.png" alt="Thực Đơn & Món Ăn" width="100%"/></a><br/>
        <sub><b>2. Thực Đơn & Giá Vốn</b></sub>
      </td>
      <td width="25%" align="center">
        <a href="screenshots/03_pos_modifier_toppings.png"><img src="screenshots/03_pos_modifier_toppings.png" alt="Tùy Chọn Topping" width="100%"/></a><br/>
        <sub><b>3. Size & Topping Món</b></sub>
      </td>
      <td width="25%" align="center">
        <a href="screenshots/04_pos_cart_tray.png"><img src="screenshots/04_pos_cart_tray.png" alt="Giỏ Hàng Đa Bàn" width="100%"/></a><br/>
        <sub><b>4. Giỏ Hàng Đa Bàn</b></sub>
      </td>
    </tr>
    <tr>
      <td width="25%" align="center">
        <a href="screenshots/05_pos_numpad_cash.png"><img src="screenshots/05_pos_numpad_cash.png" alt="Numpad Tiền Mặt" width="100%"/></a><br/>
        <sub><b>5. Numpad Đếm Tiền Mặt</b></sub>
      </td>
      <td width="25%" align="center">
        <a href="screenshots/06_pos_dynamic_vietqr.png"><img src="screenshots/06_pos_dynamic_vietqr.png" alt="VietQR Động" width="100%"/></a><br/>
        <sub><b>6. Mã VietQR Động NAPAS</b></sub>
      </td>
      <td width="25%" align="center">
        <a href="screenshots/07_pos_kds_kitchen.png"><img src="screenshots/07_pos_kds_kitchen.png" alt="Bếp Bar KDS" width="100%"/></a><br/>
        <sub><b>7. Bếp / Bar KDS Vé Món</b></sub>
      </td>
      <td width="25%" align="center">
        <a href="screenshots/08_pos_invoices_history.png"><img src="screenshots/08_pos_invoices_history.png" alt="Sổ Đơn Hóa Đơn" width="100%"/></a><br/>
        <sub><b>8. Sổ Đơn & In Lại Bill</b></sub>
      </td>
    </tr>
    <tr>
      <td width="25%" align="center">
        <a href="screenshots/09_pos_cashflow_expenses.png"><img src="screenshots/09_pos_cashflow_expenses.png" alt="Sổ Quỹ Chi Chợ" width="100%"/></a><br/>
        <sub><b>9. Sổ Quỹ Chi Chợ 3s</b></sub>
      </td>
      <td width="25%" align="center">
        <a href="screenshots/10_pos_shift_handover.png"><img src="screenshots/10_pos_shift_handover.png" alt="Giao Ca Đếm Két" width="100%"/></a><br/>
        <sub><b>10. Giao Ca Két Tiền 30s</b></sub>
      </td>
      <td width="25%" align="center">
        <a href="screenshots/11_pos_pnl_report.png"><img src="screenshots/11_pos_pnl_report.png" alt="Báo Cáo Lợi Nhuận" width="100%"/></a><br/>
        <sub><b>11. Báo Cáo 3 Con Số Vàng</b></sub>
      </td>
      <td width="25%" align="center">
        <a href="screenshots/12_pos_settings_printer.png"><img src="screenshots/12_pos_settings_printer.png" alt="Cài Đặt Máy In" width="100%"/></a><br/>
        <sub><b>12. Máy In Nhiệt & Két Tiền</b></sub>
      </td>
    </tr>
  </table>
</div>

---

## 4. Tải Ứng Dụng & Cài Đặt (Releases)

| Nền Tảng | Định Dạng | Liên Kết Tải | Ghi Chú |
|---|---|---|---|
| **Windows Desktop** | `.exe` (~12MB) | [Tải Bản Windows](https://github.com/nguyenlocthanh796/duangoimon/releases/latest) | Bản Portable độc lập, không cần cài đặt môi trường |
| **Android Phone / Tablet** | `.apk` (~25MB) | [Tải Bản Android APK](https://github.com/nguyenlocthanh796/duangoimon/releases/latest) | Tương thích máy POS Sunmi, iMin, điện thoại Android 8.0+ |
| **Web POS Online** | PWA Cloud | [Mở Web POS](https://app.ongchu.cloud) | Đồng bộ dữ liệu đám mây tức thì |

---

## 5. Quy Trình Vận Hành Tiêu Chuẩn (SOP)

### 5.1. Quy Trình Bán Hàng & Tính Tiền
1. **Mở Bàn / Chọn Bàn**: Chạm vào bàn trống trên Sơ Đồ Bàn -> Chọn món ăn hoặc quét mã vạch SKU.
2. **Tùy Chọn Topping & Ghi Chú**: Chọn kích cỡ Ly (M/L/XL), lượng Đá/Đường và Topping thêm -> Bấm `Thêm Vào Giỏ`.
3. **Báo Bếp / Lưu Đơn**: Bấm `Lưu Đơn & Báo Bếp` -> Lệnh in tự động đẩy xuống máy in bếp hoặc màn hình KDS Barista.
4. **Thanh Toán**:
   - **Tiền Mặt**: Nhập số tiền khách đưa bằng phím Numpad -> Hệ thống tự tính tiền thối -> Bấm `Hoàn Tất & In Bill` (Két tiền RJ11 tự động bật mở).
   - **VietQR Động**: Chuyển sang tab VietQR -> Khách quét mã thanh toán -> Webhook tự động xác nhận trong 1s.

### 5.2. Quy Trình Chi Chợ & Giao Ca
1. **Ghi Chi Chợ 3s**: Mở menu `/so-quy` -> Chọn nhanh loại chi (Đá, Rau, Thịt, Ứng lương) -> Nhập số tiền -> Bấm `Lưu Phiếu Chi`.
2. **Giao Ca Đếm Két 30s**: Mở menu `/giao-ca` -> Nhập số lượng từng mệnh giá tiền trong két -> Bấm `Tổng Kết Ca`. Nếu có chênh lệch tiền, hệ thống tự động ghi nhật ký và gửi cảnh báo đến Telegram Chủ Quán.
3. **Xem Báo Cáo Cuối Ngày**: Mở menu `/bao-cao-loi-nhuan` để kiểm tra 3 Con Số Vàng: Tiền mặt trong két, Tiền chuyển khoản trong ngân hàng và Lợi nhuận ròng thực tế.

---

## 6. Bản Quyền & Liên Hệ Hỗ Trợ

- **Bản Quyền**: © 2026 OngChu POS. Mọi quyền được bảo lưu.
- **Website Chính Thức**: [https://ongchu.cloud](https://ongchu.cloud)
- **Hỗ Trợ Kỹ Thuật & Triển Khai**: `hotro@ongchu.cloud`
