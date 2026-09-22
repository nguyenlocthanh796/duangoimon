# 🎨 QUY CHUẨN GIAO DIỆN & CÔNG THÁI HỌC F&B (UI/UX ERGONOMICS)

Áp dụng cho toàn bộ dự án `duanpos-ongchu`. Thiết kế giao diện cho ngành F&B đòi hỏi tốc độ thao tác cực cao (thao tác 1-chạm), chống nhầm lẫn trong môi trường quán ăn đông đúc, ánh sáng phức tạp.

---

## 🎯 GIAI ĐOẠN TRỌNG TÂM: UI/UX FRONTEND FIRST
Mọi tác vụ phát triển trong giai đoạn này đều ưu tiên:
1. Trau chuốt thẩm mỹ, độ phân giải cao, độ tương phản màu sắc đạt chuẩn AAA.
2. Tối ưu hóa 60 FPS trên Shopify FlashList và các thao tác cảm ứng.
3. Rung phản hồi vật lý `Haptics` và âm thanh `playTapSound()` zero-latency.

---

## 🖐️ 1. NGUYÊN TẮC THIẾT KẾ CÔNG THÁI HỌC VỊ CHỦ QUÁN

### 1.1. Thao Tác 1-Chạm Siêu Tốc (1-Tap Workflows)
- **Thêm món nhanh**: Chạm trực tiếp vào ảnh hoặc tên món để thêm ngay 1 phần mặc định vào giỏ hàng trong **0.1 giây**, không bắt buộc chọn topping nếu khách không yêu cầu.
- **Tùy chỉnh Topping**: Bấm vào icon bánh răng hoặc giữ lâu thẻ món để mở `ModifierSheet`.
- **Chọn bàn & Bán hàng**: Chạm vào thẻ bàn trên `Sơ Đồ Bàn` sẽ tự động chuyển sang chế độ `Thực Đơn` của bàn đó ngay lập tức.
- **Thanh toán tiền mặt**: Cung cấp sẵn các nút mệnh giá tiền chẵn (`Đúng Tiền`, `50k`, `100k`, `200k`, `500k`) và gợi ý tiền lẻ thối chẵn để thu ngân không cần nhẩm tính hoặc bấm máy tính cầm tay.

### 1.2. Vùng Ngón Tay Cái (Thumb-Zone Ergonomics Trên Điện Thoại)
- Trên màn hình di động (`width < 744px`):
  - Tất cả các nút hành động chính (Thanh toán, Giỏ hàng, Gửi bếp, Quét QR) phải nằm ở **1/3 phía dưới màn hình**.
  - Thanh `BottomNavBar` và `MobileCartBar` neo cố định ở đáy (Fixed Bottom Dock) cách mép dưới an toàn (`useSafeAreaInsets().bottom`).
  - Modal và Sheet mở trượt từ dưới lên (Bottom Sheet) với tay cầm kéo (Drag Handle).

### 1.3. Bố Cục 2 Cột Đối Xứng Trên iPad & Desktop (`width >= 1024px`)
- **Cột Trái (Master - 60% chiều rộng)**:
  - Thanh tìm kiếm tích hợp nút quét mã QR.
  - Hàng chip danh mục cuộn ngang + Nút chuyển đổi giao diện `[ ⊞ Lưới ↔ ☰ Danh Sách ]`.
  - Lưới thực đơn FlashList (2 đến 4 cột tùy kích thước màn hình).
- **Cột Phải (Detail - 40% chiều rộng)**:
  - Header giỏ hàng hiển thị tên bàn, khu vực và nút `Tác vụ bàn`.
  - Danh sách món trong giỏ kèm nút tăng giảm số lượng (+/-) và nút hủy món (Void).
  - Khối tóm tắt tài chính (Tạm tính, Giảm giá, Tổng tiền).
  - Cụm nút hành động lớn: `GỬI BẾP`, `IN TẠM TÍNH`, `GIẢM GIÁ`, `THANH TOÁN (1-CHẠM)`, `VIETQR`.

---

## 🎯 2. QUY CHUẨN ĐỒNG BỘ DỮ LIỆU & TRỰC QUAN HÓA SƠ ĐỒ BÀN

### 2.1. Mã Màu Trạng Thái Bàn
- **Bàn Trống (`trong`)**:
  - Viền xám mờ, nền xám nhạt (`rgba(100, 116, 139, 0.04)` trong Dark mode / `rgba(148, 163, 184, 0.03)` trong Light mode).
  - Huy hiệu (Badge): Chữ `TRỐNG` màu xám.
- **Bàn Có Khách / Đang Phục Vụ (`co_khach` / `dang_su_dung`)**:
  - Viền và ánh sáng tỏa màu Ngọc lục bảo Jade (`#0D9488` / `#14B8A6`).
  - Hiển thị rõ số lượng món (`X món`), số khách (`Y khách`) và tổng tiền tạm tính hiện tại (`tabular-nums`).
- **Bàn Đã Đặt Trước (`da_dat`)**:
  - Viền màu Hổ phách Amber (`#D97706` / `#F59E0B`).

### 2.2. Hình Học Bàn Động Bằng SVG (`TableSvgBackdrop`)
Tự động dựng đồ họa vector SVG trực quan theo tên bàn và số lượng ghế:
- Chứa chữ "Mang về", "Takeaway", "Kiosk": Hiển thị túi giấy mang đi.
- Số ghế `>= 6` hoặc chứa chữ "VIP", "Dài", "Tiệc": Hiển thị bàn tiệc hình chữ nhật dài với 6-8 ghế bao quanh.
- Chứa chữ "Tròn", "Sân vườn": Hiển thị bàn tròn với 4 ghế đối xứng.
- Mặc định: Hiển thị bàn vuông với các ghế bo tròn tinh tế.

---

## 🌓 3. BẢNG MÀU INDOCHINE HERITAGE (GIẤY DÓ & GỖ MUN)

| Thành Phần Giao Diện | Light Mode (Giấy Dó & Gỗ Mun) | Dark Mode (Cà Phê & Gỗ Gụ) |
| :--- | :--- | :--- |
| **Nền Canvas Toàn Màn Hình** | `#F9F6F0` (Ngà Giấy Dó) | `#120E0B` (Nâu Đen Cà Phê) |
| **Nền Thẻ Card / Bảng Dữ Liệu** | `#FFFFFF` (Trắng Men Gốm) | `#1C1510` (Gỗ Gụ Đen) |
| **Nền Thanh Tiêu Đề / Sub-header** | `#FFFFFF` (hoặc `#F5EFE6` phân cách 8px) | `#17110C` (Thanh tiêu đề trầm) |
| **Đường Viền Kẻ Phân Cách** | `#E7E5E4` (Hairline Warm Stone 200) | `rgba(245, 245, 244, 0.12)` (Hairline ngà) |
| **Màu Chữ Chính (Headline, Body)** | `#1C1917` (Mực Gỗ Mun - AAA 15.8:1) | `#F5F5F4` (Trắng Ngà - AAA 18.5:1) |
| **Màu Chữ Phụ (Muted, Caption)** | `#57534E` (Xám Đá Mộc - AAA 7.2:1) | `#A8A29E` (Xám Mộc Nhạt) |
| **Màu Thương Hiệu (Brand Primary)** | `#1C1917` (Đen Gỗ Mun) | `#F5F5F4` (Trắng Ngà) |
| **Màu Điểm Nhấn (Active Tab / Badge)** | `#B45309` (Vàng Đồng Thau Phin) | `#F59E0B` (Vàng Đồng Ánh Kim) |
| **Màu Thành Công / Nút Tính Tiền** | `#15803D` (Xanh Lá Mộc) | `#22C55E` (Xanh Lá Chuối Non) |
| **Màu Cảnh Báo / Hủy Món** | `#DC2626` (Đỏ Chu Sa / Sơn Mài) | `#EF4444` (Đỏ Sơn Mài) |

---

## ✅ 4. CHECKLIST NGHIỆM THU UI THỰC CHIẾN (UI VERIFICATION CHECKLIST)
Trước khi hoàn tất bất kỳ màn hình hoặc component giao diện nào, bắt buộc rà soát checklist:
- [ ] **Tabular Nums**: 100% giá tiền, số lượng, thời gian, mã SKU đều có `tabularNums={true}` (hoặc `fontVariant: ['tabular-nums']`).
- [ ] **Typography Scale**: Tuân thủ chuẩn 7 cấp `xxs` đến `display` qua component `<AppText>`. Không dùng font size tùy tiện.
- [ ] **De-bolding**: 90% dùng `weight="normal"` (400) hoặc `medium` (500). Trần SemiBold 600.
- [ ] **Dual-Theme Indochine**: Nền Light Mode Ngà Giấy Dó (`#F9F6F0`), chữ Mực Gỗ Mun (`#1C1917`), tương phản AAA. Không hardcode màu hex ngoài palette.
- [ ] **2 Dãy Điều Hướng**: Dãy 1 Underline Tab Vàng Đồng Thau `#B45309`, Dãy 2 Capsule Pill Đồng Thau `#B45309`.
- [ ] **Nút Bấm 1-Chạm**: Nút Tính Tiền Xanh Lá Mộc `#15803D`, vùng chạm $\ge 44 \times 44\text{pt}$.
- [ ] **Hiệu năng cảm ứng**: FlashList cuộn mượt mà không giật khung hình, chạm là có rung `Haptics` và âm thanh `playTapSound()`.
- [ ] **Safe Area Insets**: Khoảng cách Top Header và Bottom Dock tự động thích ứng an toàn trên mọi dòng máy iPhone / Android qua `useSafeAreaInsets()`.
