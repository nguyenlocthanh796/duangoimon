# 👑 Nhật Ký Thay Đổi & Phát Hành (CHANGELOG)

Tất cả các thay đổi đáng chú ý của dự án **OngChu Lean POS** sẽ được ghi chép chi tiết trong tệp này theo định dạng [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và tuân thủ nguyên tắc [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-production] - 2026-09-13

### 🌟 Tổng Quan Phát Hành (Release Highlights)
Phiên bản phát hành chính thức **v1.0.0-production** đánh dấu cột mốc hoàn thiện toàn diện hệ thống POS F&B Thực Chiến Vị Chủ Quán đa nền tảng (Go Backend 15MB + Expo SDK 52 Native + Sổ Quỹ Chi Chợ 3s + Giao Ca Đếm Két 30s + In Nhiệt ESC/POS Direct Socket).

Toàn bộ **10/10 Màn Hình FOH** đã hoàn thiện 100% về mặt thẩm mỹ, công thái học 1-chạm 0ms và vượt qua **395/395 automated test cases**.

---

### 🎨 Frontend UI/UX & Công Thái Học (Expo SDK 52 / React Native 0.76.6)
- **10/10 Màn hình FOH hoàn thiện chuẩn Apple Modern / Linear Minimalist**:
  1. **Bán Hàng POS (/)**: Quick-Add 0ms, Tabular Nums giá tiền, xúc giác Haptics vật lý phân biệt rõ rệt giữa món còn bán và món tạm hết (86).
  2. **Thanh Toán (/thanh-toan)**: Bàn phím số Numpad tiền mặt công thái học, cụm phím gợi ý tiền thông minh, VietQR động kèm logo ngân hàng, bóc tách tài chính phẳng tràn viền.
  3. **Bếp / Bar KDS (/kds)**: 1-chạm chuyển 4 trạng thái món/đơn (Chờ làm, Đang làm, Hoàn thành, Đã bưng), đồng hồ đếm giây display tabular-nums, header súc tích.
  4. **Sổ Đơn / Hóa Đơn (/hoa-don)**: Lọc hóa đơn 1-chạm, in lại bill K80/K58 tức thì, hoàn tiền và hủy món an toàn có lưu vết Audit Log.
  5. **Sơ Đồ Bàn**: Gạch xúc giác phẳng (Flat Tactile Tiles), gộp bàn / chuyển bàn / tách đơn 1-chạm với các nút CTA <= 3 chữ.
  6. **Sổ Quỹ Chi Chợ (/so-quy)**: Chi chợ 3s, xem chi tiết phiếu thu/chi nội tuyến (Zero-Modal Detail) tích hợp AppHeader showBack, phân tách hairline subtle.
  7. **Giao Ca Đếm Két (/giao-ca)**: Đếm két 30s với 9 mệnh giá tiền mặt VND, tự động tính chênh lệch két, cảnh báo lệch két qua màu sắc, nút CTA <= 3 chữ.
  8. **Báo Cáo Lợi Nhuận (/bao-cao-loi-nhuan)**: Hero KPI 3 Con Số Vàng (Lợi Nhuận Bỏ Túi, Tiền Mặt Két, Tiền VietQR), biểu đồ doanh thu và bảng bóc tách chi phí phẳng tràn viền.
  9. **Khách Hàng CRM & Sổ Nợ (/khach-hang)**: Xem hồ sơ và lịch sử mua hàng nội tuyến, thao tác Gạch Nợ 1-chạm, Docked Bottom Action Bar cố định đáy.
  10. **Quản Lý Thực Đơn (/thuc-don) & Cài Đặt Cửa Hàng (/cai-dat)**: Báo hết món (86) / mở bán lại chỉ trong 1 chạm 0ms, cấu hình thiết bị phần cứng với nút CTA In Thử, Bật Két.

- **Triệt tiêu hoàn toàn Modal cho màn hình chi tiết (Zero-Modal Detail)**:
  - Xem chi tiết hóa đơn, hồ sơ khách hàng, chi tiết phiếu thu chi, ca làm việc được render trực tiếp nội tuyến (Inline Sub-Screen Direct Render) kèm AppHeader showBack.
- **De-boxing Mobile & Flat Seamless Canvas**:
  - Triệt tiêu card bo góc lơ lửng co cụm trên điện thoại; giao diện trải dài full-bleed 100% với đường kẻ hairline tinh xảo.
- **De-bolding Cực Đoan (Minimalist Typography)**:
  - 90% nhãn dữ liệu, bảng số liệu, dòng bóc tách tài chính dùng font weight normal (400) thanh thoát; triệt tiêu font weight nặng 700/800.
- **Tabular Nums 100%**:
  - Toàn bộ số tiền VND, SKU, số lượng, mã đơn, thời gian bật tabularNums thẳng hàng tuyệt đối.

---

### 🏛️ Quản Trị Trạng Thái Zustand (Modularized Slices)
- Cắt lát Store nguyên khối 3,175 dòng thành kiến trúc Slice chuyên nghiệp (cartSlice, kdsSlice, crmSlice, inventorySlice, menuCatalogSlice, orderInvoiceSlice, shiftAccountingSlice).
- Giảm dung lượng file usePOSStore.ts từ 3,175 dòng xuống 1,347 dòng (~57% code boilerplate), bảo toàn 100% Facade Selectors.

---

### ⚡ Backend Engine (Golang 1.22+ Gin / Fiber)
- Khởi động siêu tốc ~0.05s, chiếm dụng bộ nhớ cực thấp (~15MB RAM).
- Bộ phát sinh byte lệnh ESC/POS in trực tiếp qua TCP Raw Socket (Cổng 9100) không qua Windows Spooler.
- Tự động kích mở ngăn kéo đựng tiền RJ11 và tự cắt giấy.
- WebSocket Hub đa kênh đồng bộ tức thì giữa Thu ngân, CFD và Màn hình Bếp KDS.
- Bot Telegram chạy goroutine cảnh báo gian lận khi hủy món sau in tạm tính, chiết khấu > 20%, mở két tay hoặc lệch két giao ca.

---

### 🧪 Báo Cáo Kiểm Thử Tự Động (Master Test Suite)
- Tổng số bài kiểm thử tự động: 395/395 PASS (100%) trong thời gian ~450-660ms.
- 34 Nhóm kiểm thử bao phủ toàn diện từ SaaS Auth, Kiosk, P&L, Debt, Apple Review đến UX Audit.
- Biên dịch tĩnh TypeScript: 0 lỗi (npx tsc --noEmit hoàn thành với exit code 0).
