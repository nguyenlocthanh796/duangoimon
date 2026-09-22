# 📱 Báo Cáo Kiểm Thử UI Toàn Diện (Sony Xperia 5 II - 901SO)

> Ngày: 2026-09-15 · App: OngChu POS (Expo Go) · Device: Sony 901SO 1080×2520
> Phương pháp: `adb dump` (uiautomator) + adb CLI · Kiểm tra **toàn bộ 16 màn hình + 12 tab con**

---

## 🔴 P0 — Nghiêm Trọng (6)

| # | Màn hình | Vấn đề | Chi tiết |
|---|---|---|---|
| 1 | **Bếp/Bar (KDS)** | **Tab BottomNav không chuyển** | Tap Bếp/Bar → vẫn Gọi Món. Badge `2` hiện đúng nhưng tab chết. |
| 2 | **Sidebar Drawer** | **Hamburger không mở Drawer** | Tap hamburger không phản hồi, swipe cũng không. Drawer chỉ tự mở lần đầu load. Chặn truy cập 10+ màn Drawer. |
| 8 | **Báo Cáo P&L** | **Sai số liệu bảng đếm** | Đầu ca 500k + TM +2.450k = 2.780k, nhưng doanh thu thực 198k → số liệu拢 không khớp. |
| 9 | **Báo Cáo P&L** | **VietQR lệch giữa 2 màn** | P&L: VietQR `0đ` · Giao Ca: VietQR `1.850.000đ` — không đồng bộ. |
| 13 | **Deep Link** | **`/cfd`, `/kds` không navigate** | Từ stack sâu (Báo Cáo) → link kẹt. Phải HOME trước. Expo Go deep link bug. |
| 14 | **CFD** | **Hiện hamburger menu** | CFD cấm navbar/sidebar (AGENTS.md 3.4) — hamburger vẫn hiện. |

## 🟡 P1 — Trung Bình (10)

| # | Màn hình | Vấn đề | Chi tiết |
|---|---|---|---|
| 3 | **Sơ Đồ Bàn** | **Thiếu chip "Sân Vườn"** | 8 bàn gồm Sân Vườn Bàn 07 Tròn — chip chỉ: Tất Cả(8), Tầng Trệt(4), Lầu 1(2). |
| 4 | **Sổ Đơn** | **Món không gộp** | Trà Chanh 3 dòng `1x,1x,2x` thay vì gộp `4x`. |
| 5 | **Sổ Đơn** | **Khoảng trắng thừa** | Sau 1 đơn, phần dưới trống rỗng, không empty state. |
| 15 | **Thanh Toán** | **CTA đè nhau** | `In hóa đơn K80` [2293] + `Xong & In Bill` [2367] — cách 21px, vi phạm HIG 44pt. |
| 16 | **Kho Hàng** | **Cảnh báo sai item** | Header: "Sắp hết: Bột Sữa Béo Almer" — item không hiện trong danh sách. |
| 17 | **Nhân Sự** | **Empty state dù có NV** | Giao Ca: Nguyễn Thị Lan (Thu Ngân) đang ca → Nhân Sự: "Không có nhân sự phù hợp". |
| 22 | **Thực Đơn/Topping** | **Bounds nghịch đảo item cuối** | Thạch Nha Đam Tươi: subtitle `+7.000đ` y1=2372 > y2=2324 — bị cắt dưới màn hình. |
| 24 | **Cài Đặt/Tài Khoản** | **PIN form bị cắt đáy** | "MÃ PIN CHỦ QUÁN" label `[132,2350]` — đè lên BottomNav `[2347]`, form không scroll. |
| 25 | **Sổ Quỹ (3 tab)** | **Summary duplicate** | "Thu ngoài/Chi chợ/Tồn quỹ" xuất hiện 2 lần (y=201 & y=464) trên cả 3 tab Lập Phiếu/Ca Của Tôi/Sổ Thu Chi. |
| 26 | **Giao Ca tab** | **Tab "Bảng Đếm Tờ (9)" chết** | Tap không chuyển, vẫn ở tab Ca Hiện Tại. Lỗi tương tự P0 #1. |

## 🟢 P2 — Nhẹ (6)

| # | Màn hình | Vấn đề | Chi tiết |
|---|---|---|---|
| 6 | **Gọi Món** | **Item cuối render lỗi** | Matcha Latte (MC01): giá `[0,0][0,0]` — layout tràn. |
| 7 | **Gọi Món** | **Header nhầm lẫn** | "Chưa Chọn Bàn / Chạm để gán bàn" — nhầm khi mới mở tab. |
| 10 | **Báo Cáo/Tổng Quan** | **Item #3 bị che BottomNav** | Trà Sữa Hoàng Gia `[2476][2478]` — chỉ 2px. |
| 11 | **Báo Cáo/Tổng Quan** | **Summary phụ trùng** | "Đã thu/Món xuất/Tiền két" 2 lần ở `[195]` & `[676]`. |
| 12 | **Sổ Quỹ** | **Summary block trùng** | Doanh thu/Tiền két hiện 2 lần (liên quan #25). |
| 19 | **Khách Hàng** | **Nợ tràn bounds** | "Tổng nợ 1.030.000đ" bounds `[667,548]` cao hơn card. |
| 20 | **Quản Lý Bàn** | **Icon render sai font** | Ký tự `&#983363;` — font icon không render. |
| 23 | **Cài Đặt/Chi Nhánh** | **Giãn cách thừa** | Sau CN1 Sửa `[1068]` → Lưu `[1737]` trống ~670px. |

## ✅ Màn Hình & Tab Chạy Tốt

| Màn | Tab/State | Ghi chú |
|---|---|---|
| Bàn Ăn | Chính | 8 bàn 2 cột, badge + Mở bàn OK |
| Gọi Món | Chính | FlashList mượt, size pills, customize |
| Sổ Đơn | Chính | Summary + chip lọc OK |
| KDS | — | **Chỉ truy cập được qua deep link `/kds`** (BottomNav chết) |
| Thanh Toán | State rỗng | Tiền Mặt/VietQR/Khác, mệnh giá nhanh |
| Sổ Quỹ | Ca Của Tôi | Ca Sáng · Két 1.698k · TOP 3 |
| Sổ Quỹ | Lập Phiếu | Chi/Thu toggle, mẫu 50k, mệnh giá nhanh |
| Sổ Quỹ | Sổ Thu Chi | Empty state đẹp + shortcut Giao Ca/P&L |
| Giao Ca | Ca Hiện Tại | Đầu ca + Bóc tách + KIỂM KÉT + Nhập tiền + Chốt Ca |
| Báo Cáo | Tổng Quan | P&L 3 số vàng + biểu đồ + Top Món |
| Báo Cáo | Hóa Đơn (1) | Filter Todos/TM/VietQR + danh sách HĐ |
| Báo Cáo | Món Bán (6) | Filter nhóm + sort Số Lượng/Doanh Thu |
| Thực Đơn | Món Ăn (22) | FlashList, toggle BẬT, search |
| Thực Đơn | Danh Mục (6) | Di chuyển + Thêm Nhóm |
| Thực Đơn | Topping (8) | Di chuyển + Sửa/Xóa + Thêm Topping |
| Cài Đặt | Cửa Hàng | Tên/Slogan/Địa chỉ/WiFi/Hotline |
| Cài Đặt | Chi Nhánh | Gói Pro 1/3 CN, Sửa CN |
| Cài Đặt | Tài Khoản | Hồ sơ SaaS + Đổi MK + PIN |
| Nhân Sự | Tất Cả | Search + filter 4 role + Thêm NV |
| Khách Hàng | Tất Cả | 4 khách · Nợ 1.030k · VIP filter |
| Quản Lý Bàn | Tất cả | 8 bàn, Di chuyển lên/xuống |
| Hướng Dẫn | Tất Cả | 4 filter pills + 8 cards |
| CFD | Chính | Đồng hồ realtime · VietQR · WiFi |
| Login | PIN pad | 10 phím, 4 role, Quên PIN |

---

**Tổng: 22 vấn đề** (6 P0 · 10 P1 · 6 P2) · **30+ tab/state chạy tốt**

> Patterns cần fix: (1) Tab switching chết ở BottomNav Bếp/Bar + Giao Ca tabs → gốc chung có thể ở zustand tab index hoặc expo-router guards. (2) Duplicate render xuyên suốt Sổ Quỹ/Báo Cáo → component summary render 2 lần (sticky header + scroll content?). (3) Deep link stuck Expo Go → known RNW stack bug.
