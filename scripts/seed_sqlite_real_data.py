import os

pub_dir = r"d:\duanpos-ongchu\github-public-repo"
docs_dir = os.path.join(pub_dir, "docs")
issues_dir = os.path.join(pub_dir, ".github", "ISSUE_TEMPLATE")

os.makedirs(docs_dir, exist_ok=True)
os.makedirs(issues_dir, exist_ok=True)

# 1. README.md
readme_content = """# 👑 OngChu POS — Hệ Thống Quản Lý Bán Hàng F&B Thực Chiến Vị Chủ Quán

<p align="center">
  <a href="https://ongchu.cloud"><img src="screenshots/00_login_kich_hoat.png" alt="OngChu POS Banner" width="800"/></a>
</p>

<p align="center">
  <a href="https://ongchu.cloud"><img src="https://img.shields.io/badge/Website-ongchu.cloud-b45309?style=for-the-badge" alt="Website"/></a>
  <a href="https://app.ongchu.cloud"><img src="https://img.shields.io/badge/Web_POS-Truy_Cap_Ngay-1c1917?style=for-the-badge" alt="Web App"/></a>
  <a href="https://github.com/ongchu-pos/ongchu-pos/releases"><img src="https://img.shields.io/badge/Downloads-Windows_%7C_Android-15803d?style=for-the-badge" alt="Releases"/></a>
  <img src="https://img.shields.io/badge/License-CC--BY--4.0-blue?style=for-the-badge" alt="License"/>
</p>

---

## 📖 Giới Thiệu
**OngChu POS** là hệ thống quản trị và bán hàng F&B chuyên sâu dành cho Quán Cafe, Trà Sữa, Quán Ăn, Nhà Hàng và Chuỗi F&B. Dự án được thiết kế xoay quanh triết lý **"Cái Tâm Vị Chủ Quán"** — cắt giảm 100% thủ tục rườm rà, tập trung tuyệt đối vào tốc độ phục vụ, an toàn dòng tiền và chống gian lận nội bộ.

- **🌐 Nền tảng Web POS**: [https://app.ongchu.cloud](https://app.ongchu.cloud) (Mở trình duyệt là bán hàng ngay).
- **💻 Bản Desktop Windows**: Siêu nhẹ ~12MB, không tốn RAM.
- **📱 Bản Mobile & Tablet**: Hoạt động mượt mà 60 FPS trên Android và iOS.

---

## 🌟 6 Trụ Cột Đột Phá

| # | Trụ Cột | Chi Tiết Nghiệp Vụ |
|---|---|---|
| 🛒 | **Bán Hàng 1-Chạm** | Gọi món, chuyển bàn, gộp bàn, tách hóa đơn, in tạm tính chỉ trong < 3 giây. |
| 🥬 | **Sổ Quỹ Chi Chợ 3s** | Nhập tiền mua đá, rau, thịt, ứng lương tức thì ngay trên POS. Tự động trừ vào két tiền ca. |
| 💵 | **Giao Ca Đếm Két 30s** | Đối soát tiền mặt thực tế và doanh thu hệ thống. Tự động phát hiện lệch két và cảnh báo. |
| 📊 | **3 Con Số Vàng P&L** | Báo cáo lợi nhuận thực: (1) Tiền mặt trong két, (2) Tiền chuyển khoản ngân hàng, (3) Lợi nhuận ròng. |
| 🖨️ | **In Nhiệt ESC/POS Direct** | Kết nối trực tiếp máy in mạng LAN K80/K58 (Port 9100) và két tiền RJ11 không cần cài driver. |
| 🚨 | **Báo Động Gian Lận Realtime** | Gửi tin nhắn tức thì về Telegram Chủ Quán khi hủy món sau in tạm tính, sửa hóa đơn hoặc mở két tay. |

---

## 📸 Giao Diện Trực Quan

<div align="center">
  <table>
    <tr>
      <td width="50%"><img src="screenshots/03_pos_so_do_ban.png" alt="Sơ đồ bàn"/><br/><b>Sơ đồ bàn & Đặt món trực quan</b></td>
      <td width="50%"><img src="screenshots/11_thanh_toan_tien_mat_numpad.png" alt="Thanh toán Numpad"/><br/><b>Thanh toán tiền mặt & Numpad đếm tiền</b></td>
    </tr>
    <tr>
      <td width="50%"><img src="screenshots/13_kds_tong_quan.png" alt="Màn hình Bếp KDS"/><br/><b>Màn hình điều phối Bếp / Pha chế (KDS)</b></td>
      <td width="50%"><img src="screenshots/21_bao_cao_3_con_so_vang.png" alt="Báo cáo Lợi nhuận"/><br/><b>Báo cáo 3 con số vàng Lợi Nhuận Thực</b></td>
    </tr>
  </table>
</div>

---

## 📥 Tải Bản Cài Đặt (Releases)

| Nền Tảng | Định Dạng | Tải Về | Hướng Dẫn |
|---|---|---|---|
| **Windows Desktop** | `.exe` (~12MB) | [Tải Bản Windows](https://github.com/ongchu-pos/ongchu-pos/releases/latest) | Chạy trực tiếp, không cần cài đặt |
| **Android Tablet & Phone** | `.apk` (~25MB) | [Tải Bản Android](https://github.com/ongchu-pos/ongchu-pos/releases/latest) | Cài đặt cho máy POS cầm tay / Tablet |
| **Trình Duyệt Web** | Web PWA | [Mở Web POS](https://app.ongchu.cloud) | Tương thích Chrome, Safari, Edge, Cốc Cốc |

---

## 📚 Tài Liệu Hướng Dẫn Vận Hành
- [01. Hướng Dẫn Bán Hàng & Gọi Món](docs/01_huong_dan_ban_hang.md)
- [02. Hướng Dẫn Sổ Quỹ Chi Chợ 3 Giây](docs/02_so_quy_chi_cho.md)
- [03. Hướng Dẫn Giao Ca Đếm Két 30 Giây](docs/03_giao_ca_dem_ket.md)
- [04. Kết Nối Máy In Hóa Đơn ESC/POS & Két Tiền](docs/04_ket_noi_may_in.md)
- [05. Cấu Hình Bot Telegram Báo Động Gian Lận](docs/05_chong_gian_lan_telegram.md)

---

## 🤝 Đóng Góp & Hỗ Trợ
- **Báo lỗi (Bug Report)**: [Mở Issue Báo Lỗi](https://github.com/ongchu-pos/ongchu-pos/issues/new?template=bug_report.md)
- **Đề xuất tính năng (Feature Request)**: [Góp Ý Tính Năng](https://github.com/ongchu-pos/ongchu-pos/issues/new?template=feature_request.md)
- **Website Chính Thức**: [https://ongchu.cloud](https://ongchu.cloud)
- **Hotline / Zalo**: `0392.387.165`

---
*Bản quyền tài liệu thuộc về OngChu POS Ecosystem (2026).*
"""
with open(os.path.join(pub_dir, "README.md"), "w", encoding="utf-8") as f:
    f.write(readme_content)

# 2. LICENSE
license_content = """Creative Commons Attribution 4.0 International (CC BY 4.0)

You are free to:
- Share — copy and redistribute the material in any medium or format.
- Adapt — remix, transform, and build upon the material for any purpose.

Under the following terms:
- Attribution — You must give appropriate credit to OngChu POS (https://ongchu.cloud).

Full text: https://creativecommons.org/licenses/by/4.0/legalcode
"""
with open(os.path.join(pub_dir, "LICENSE"), "w", encoding="utf-8") as f:
    f.write(license_content)

# 3. CHANGELOG.md
changelog_content = """# 📋 Nhật Ký Cập Nhật (CHANGELOG)

## [v1.0.0] - 2026-09-22
### ✨ Tính Năng Mới
- Ra mắt bộ giao diện POS Universal (Expo SDK 57 / React 19).
- Tích hợp Sổ Quỹ Chi Chợ 3s và Giao Ca Đếm Két 30s.
- Hỗ trợ in nhiệt ESC/POS Direct Socket TCP 9100.
- Ra mắt bản Windows Native Desktop Client siêu nhẹ ~12MB.
- Kết nối Màn hình Bếp KDS Realtime qua WebSocket Hub.
"""
with open(os.path.join(pub_dir, "CHANGELOG.md"), "w", encoding="utf-8") as f:
    f.write(changelog_content)

# 4. Docs 01 -> 05
doc1 = """# 01. Hướng Dẫn Bán Hàng & Gọi Món 1-Chạm

## 1. Mở Bàn & Chọn Món
1. Truy cập Web POS tại [https://app.ongchu.cloud](https://app.ongchu.cloud) hoặc mở App Desktop.
2. Tại màn hình **Sơ đồ bàn**, chạm vào bàn muốn phục vụ (ví dụ: Bàn 01).
3. Chọn danh mục (Cà phê, Trà sữa, Ăn vặt) và chạm món để đưa vào giỏ hàng.
4. Tùy chỉnh Topping, đường đá, ghi chú (nếu có).

## 2. Thao Tác Nhanh
- **Báo Bếp / Pha Chế**: Bấm nút **Báo Bếp**, đơn hàng lập tức hiển thị trên màn hình KDS.
- **In Tạm Tính**: Bấm **In Tạm Tính** để in phiếu kiểm đồ giao khách tại bàn.
- **Thanh Toán**: Bấm nút màu Cam Apple **Thanh Toán** để chuyển sang màn hình thu tiền.
"""
with open(os.path.join(docs_dir, "01_huong_dan_ban_hang.md"), "w", encoding="utf-8") as f:
    f.write(doc1)

doc2 = """# 02. Hướng Dẫn Sổ Quỹ Chi Chợ 3 Giây

## 1. Mục Đích
Ghi nhận các khoản chi đột xuất trong ngày (tiền mua đá lạnh, rau củ tươi, đồ gia vị, ứng lương nhân viên) để trừ trực tiếp vào tiền mặt trong két.

## 2. Các Bước Thực Hiện
1. Vào menu **Sổ Quỹ** (`/so-quy`).
2. Bấm nút **+ Chi Tiền**.
3. Chọn hạng mục: `Mua nguyên liệu`, `Chi đá lạnh`, `Tiện ích (Điện/Nước)`, `Khác`.
4. Nhập số tiền và ghi chú ngắn gọn (ví dụ: *Mua 2 bao đá bi*).
5. Bấm **Lưu Phiếu**. Số tiền lập tức được ghi sổ kế toán kép và khấu trừ vào két ca làm việc.
"""
with open(os.path.join(docs_dir, "02_so_quy_chi_cho.md"), "w", encoding="utf-8") as f:
    f.write(doc2)

doc3 = """# 03. Hướng Dẫn Giao Ca Đếm Két 30 Giây

## 1. Mở Ca Làm Việc
Đầu ca, thu ngân nhập **Tiền Đầu Ca** (ví dụ: 1.000.000 đ tiền lẻ thối).

## 2. Kết Thúc Ca (Giao Ca)
1. Vào mục **Giao Ca** (`/giao-ca`).
2. Sử dụng **Bảng Đếm Tiền Theo Mệnh Giá** (từ tờ 500k, 200k đến 1k, 2k).
3. Hệ thống tự động tính:
   `Tiền Lý Thuyết = Đầu Ca + Tiền Mặt Bán Hàng + Thu Khác - Chi Chợ`
4. Nếu có chênh lệch, hệ thống hiển thị rõ số tiền thừa/thiếu và ghi Audit Log.
5. Bấm **In Báo Cáo & Đóng Ca**.
"""
with open(os.path.join(docs_dir, "03_giao_ca_dem_ket.md"), "w", encoding="utf-8") as f:
    f.write(doc3)

doc4 = """# 04. Kết Nối Máy In Nhiệt ESC/POS Direct Socket

## 1. Thông Số Chuẩn
- **Cổng TCP**: `9100` (Raw Socket).
- **Khổ Giấy**: K80 (80mm) hoặc K58 (58mm).
- **Két Tiền**: Kết nối cổng RJ11 phía sau máy in bill.

## 2. Cấu Hình Trong Ứng Dụng
1. Vào **Cài Đặt** -> **Thiết Bị & Máy In**.
2. Nhập địa chỉ IP máy in mạng LAN (ví dụ: `192.168.1.200`).
3. Bấm **In Thử Nghiệm**. Máy in tự động cắt giấy và két tiền tự bật mở.
"""
with open(os.path.join(docs_dir, "04_ket_noi_may_in.md"), "w", encoding="utf-8") as f:
    f.write(doc4)

doc5 = """# 05. Cấu Hình Bot Telegram Báo Động Gian Lận

## 1. Các Tình Huống Báo Động Tức Thì
1. **Hủy món sau khi in tạm tính / gửi bếp**.
2. **Chiết khấu hóa đơn vượt ngưỡng > 20%**.
3. **Mở két tiền bằng tay** (không phát sinh hóa đơn).
4. **Lệch tiền đếm két khi giao ca**.

## 2. Kích Hoạt
1. Tạo Bot qua `@BotFather` trên Telegram và lấy **Bot Token**.
2. Lấy **Chat ID** của Chủ Quán.
3. Điền vào mục **Cài Đặt Bảo Mật** trên giao diện OngChu POS.
"""
with open(os.path.join(docs_dir, "05_chong_gian_lan_telegram.md"), "w", encoding="utf-8") as f:
    f.write(doc5)

# 5. Issue templates
bug_template = """---
name: Báo Lỗi (Bug Report)
about: Thông báo lỗi phần mềm để đội ngũ khắc phục
title: '[BUG] '
labels: bug
assignees: ''
---

**Mô tả lỗi:**
Mô tả chi tiết và ngắn gọn về lỗi gặp phải.

**Các bước tái hiện:**
1. Vào màn hình '...'
2. Bấm vào nút '....'
3. Thấy xuất hiện lỗi '....'

**Môi trường sử dụng:**
- Nền tảng: [Web Chrome / Windows Desktop / Android Tablet]
- Phiên bản: v1.0.0
"""
with open(os.path.join(issues_dir, "bug_report.md"), "w", encoding="utf-8") as f:
    f.write(bug_template)

feat_template = """---
name: Góp Ý Tính Năng (Feature Request)
about: Đề xuất ý tưởng hoặc tính năng mới cho OngChu POS
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

**Mô tả tính năng đề xuất:**
Mô tả tính năng bạn muốn có trong OngChu POS.

**Lợi ích thực tế cho Quán F&B:**
Tính năng này giúp giải quyết bài toán gì cho chủ quán hoặc nhân viên?
"""
with open(os.path.join(issues_dir, "feature_request.md"), "w", encoding="utf-8") as f:
    f.write(feat_template)

print("SUCCESS: Generated complete GitHub Public Repository Hub files!")

