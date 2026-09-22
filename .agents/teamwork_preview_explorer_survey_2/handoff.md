# Báo Cáo Khảo Sát Kỹ Thuật (R2): Chuẩn Hóa Bảng Màu Dual-Theme Indochine & Anti-Glare

## 1. Observation (Dữ Liệu Quan Sát Thực Tế)

### 1.1. Hiện Trạng Định Nghĩa Theme (`frontend/lib/theme/colors.ts`, `tokens.ts`, `index.tsx`)

#### Light Mode (`lightTheme`):
- `surface.app`: `#F9F6F0` (Ngà Giấy Dó — Đúng chuẩn)
- `surface.card`: `#FFFFFF` (Trắng Men Gốm — Đúng chuẩn)
- `surface.header`: `#FFFFFF`
- `text.primary`: `#1C1917` (Mực Gỗ Mun — Tương phản 15.8:1 AAA — Đúng chuẩn)
- `text.muted`: `#44403C` (Xám Đá Mộc Đậm Stone 700 — 8.5:1 AAA — Đúng chuẩn)
- `text.subtle`: `#57534E` (Xám Khói Trầm Stone 600 — 7.2:1 AAA — Đúng chuẩn)
- `text.onBrand`: `#FFFFFF` (Chữ trắng trên nút Đen Gỗ Mun)
- `border.default`: `#D6D3D1` (Viền nét mảnh Stone 300 — Đúng chuẩn)
- `border.subtle`: `#E7E5E4` (Hairline Warm Stone 200 — Đúng chuẩn)
- `brand.primary`: `#1C1917` (Đen Gỗ Mun — Đúng chuẩn)
- `brand.accent`: `#B45309` (Vàng Đồng Thau Phin — Đúng chuẩn)
- `brand.success`: `#15803D` (Xanh Lá Mộc — Đúng chuẩn)
- `brand.danger`: `#DC2626` (Đỏ Chu Sa — Đúng chuẩn)
- `brand.warning`: `#D97706` (Vàng Hổ Phách VIP — Đúng chuẩn)
- Bộ `status` Light Mode:
  - `pendingBg`: `#FFFBEB`, `pendingText`: `#B45309`, `pendingBorder`: `#FDE68A`
  - `cookingBg`: `#F0F9FF`, `cookingText`: `#0284C7`, `cookingBorder`: `#BAE6FD`
  - `readyBg`: `#ECFDF5`, `readyText`: `#15803D`, `readyBorder`: `#A7F3D0`
  - `dangerBg`: `#FEF2F2`, `dangerText`: `#DC2626`, `dangerBorder`: `#FECACA`
  - `warningBg`: `#FFFBEB`, `warningText`: `#B45309`, `warningBorder`: `#FDE68A`

#### Dark Mode Anti-Glare (`darkTheme`):
- `surface.app`: `#14110E` (Nâu Than Cà Phê Trầm Dịu Mắt — Đúng chuẩn Anti-Glare)
- `surface.card`: `#1E1813` (Gỗ Gụ Đen Ấm Nổi Khối — Đúng chuẩn Anti-Glare)
- `surface.header`: `#191410` (Khác nhẹ so với `#17120E` trong AGENTS.md line 185)
- `text.primary`: `#F3EFEA` (Trắng Ngà Gốm Sứ Dịu Mắt 15:1 AAA — Đúng chuẩn Anti-Glare)
- `text.muted`: `#A8A29E` (Xám Mộc Nhạt — Đúng chuẩn)
- `text.subtle`: `#78716C` (Xám Khói Trầm — Đúng chuẩn)
- `text.inverse`: `#14110E` (Đúng chuẩn)
- `text.onBrand`: `#FFFFFF` (Chữ trắng trên nút Vàng Đồng Thau — Đúng chuẩn)
- `border.default`: `#382E25` (Solid Dark Crisp Mộc — Đúng chuẩn)
- `border.subtle`: `rgba(243, 239, 234, 0.12)` (Hairline Trắng Ngà `#F3EFEA` — Đúng chuẩn)
- `brand.primary`: `#B45309` (Vàng Đồng Thau Phin — **Đã triệt tiêu hoàn toàn nút Trắng Tinh `#F5F5F4` gây chói lóa**)
- ⚠️ **Lệch chuẩn `brand.accent` trong Dark Mode**:
  - `colors.ts` line 105 đang định nghĩa: `accent: '#F59E0B'` (Vàng Amber quá chói).
  - Yêu cầu R2 trong USER_REQUEST: `Vàng Đồng Thau #B45309 (brand.primary & brand.accent - NO white #F5F5F4 brand.primary causing glare)`.
  - AGENTS.md line 192 ghi nhận: `#D97706` (Vàng Đồng Ánh Kim Hổ Phách).
- ⚠️ **Lệch chuẩn `brand.success` và `brand.danger` trong Dark Mode**:
  - `colors.ts` line 106: `brand.success: '#16A34A'`, trong khi `status.readyText: '#22C55E'`. AGENTS.md line 195 ghi: `#22C55E`.
  - `colors.ts` line 108: `brand.danger: '#DC2626'`, trong khi `status.dangerText: '#EF4444'`. AGENTS.md line 196 ghi: `#EF4444`.

---

### 1.2. 12 Điểm Mã Hex Gắn Cứng (Hardcoded Hexes) Còn Sót Lại Trong `.tsx`

Quét tĩnh tự động qua 154 tệp `app/`, `lib/components/`, `lib/store/` phát hiện chính xác 12 vị trí vi phạm:

| STT | Tệp | Dòng | Đoạn Mã Gốc | Mã Hex Vi Phạm | Token `useTheme()` Khuyến Nghị Thay Thế |
|:---|:---|:---|:---|:---|:---|
| 1 | `frontend/app/bao-cao-loi-nhuan/index.tsx` | 736 | `: '#F3EFEA',` | `#F3EFEA` | `theme.surface.header` hoặc `theme.surface.card` |
| 2 | `frontend/app/bao-cao-loi-nhuan/index.tsx` | 768 | `: '#F3EFEA',` | `#F3EFEA` | `theme.surface.header` hoặc `theme.surface.card` |
| 3 | `frontend/app/bao-cao-loi-nhuan/_components/ReportRevenueBarChart.tsx` | 134 | `backgroundColor: theme.isDark ? theme.surface.header : '#F5F3EF',` | `#F5F3EF` | `theme.isDark ? theme.surface.header : theme.surface.app` |
| 4 | `frontend/app/bao-cao-loi-nhuan/_components/ReportRevenueBarChart.tsx` | 205 | `? '#44403C'` | `#44403C` | `theme.text.muted` hoặc `theme.border.default` |
| 5 | `frontend/app/bao-cao-loi-nhuan/_components/ReportRevenueBarChart.tsx` | 206 | `: '#CBD5E1',` | `#CBD5E1` (Old Slate 300) | `theme.surface.switchTrack` hoặc `theme.border.subtle` (`#E7E5E4`) |
| 6 | `frontend/app/login/index.tsx` | 744 | `shadowColor: '#000',` | `#000` | `theme.surface.shadow` |
| 7 | `frontend/app/login/_components/SaaSAccountForm.tsx` | 896 | `shadowColor: '#000',` | `#000` | `theme.surface.shadow` |
| 8 | `frontend/app/login/_components/SaaSAccountForm.tsx` | 981 | `shadowColor: '#000',` | `#000` | `theme.surface.shadow` |
| 9 | `frontend/app/thanh-toan/_components/VietQRPaymentPane.tsx` | 104 | `style={[s.qrWrapper, { borderColor: theme.border.default, backgroundColor: '#FFFFFF' }]}` | `#FFFFFF` | `theme.surface.qrCanvas` hoặc `QR_CANVAS_COLOR` |
| 10 | `frontend/app/thanh-toan/_components/VietQRPaymentPane.tsx` | 115 | `<Icon name="magnify-plus-outline" size={12} color="#FFFFFF" />` | `#FFFFFF` | `theme.text.onBrand` hoặc `ON_BRAND_TEXT_COLOR` |
| 11 | `frontend/app/thanh-toan/_components/VietQRPaymentPane.tsx` | 116 | `<AppText variant="xxs" weight="medium" color="#FFFFFF">` | `#FFFFFF` | `theme.text.onBrand` hoặc `ON_BRAND_TEXT_COLOR` |
| 12 | `frontend/lib/components/pos/TablePickerModal.tsx` | 268 | `? (isDark ? 'rgba(34,197,94,0.22)' : '#DCFCE7')` | `#DCFCE7` (Old Emerald) | `theme.status.readyBg` |

---

### 1.3. Các Mã Màu Bảng Màu Cũ (Legacy Palettes) Đang Tồn Tại Dưới Dạng `rgba(...)`

1. **Cam Neon Cũ `#FF6B00` (`rgba(255, 107, 0, ...)`)**:
   - `frontend/lib/components/ui/BottomNavBar.tsx` (dòng 293):
     `const activeBg = isDark ? 'rgba(255, 107, 0, 0.18)' : 'rgba(255, 107, 0, 0.10)';`
     *Vi phạm nghiêm trọng*: Đang dùng màu cam neon cũ cho Tab đang chọn, trong khi `AppRailNav.tsx` đã dùng chuẩn Indochine: `isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(180, 83, 9, 0.12)'`.

2. **Xanh Ngọc Jade Cũ `#0D9488` (`rgba(13, 148, 136, ...)`)**:
   - `frontend/app/cfd/index.tsx` (dòng 129, 173): Badge số lượng & vòng tròn chào mừng dùng `rgba(13, 148, 136, 0.08)` và `rgba(13, 148, 136, 0.25)` kết hợp với icon `theme.brand.primary`. Nên chuyển sang `theme.brand.primaryBg`.
   - `frontend/app/kds/index.tsx` (dòng 693): Badge "Tự động dọn" dùng `rgba(13, 148, 136, 0.2)` kết hợp icon `theme.brand.primary`. Nên chuyển sang `theme.brand.primaryBg`.
   - `frontend/app/so-quy/index.tsx` (dòng 815): Card Nhận định vị chủ quán dùng nền `rgba(13, 148, 136, 0.14)` viền `theme.brand.primary`. Nên chuyển sang `theme.brand.primaryBg`.
   - `frontend/app/cai-dat/_components/BranchesTab.tsx` (dòng 601): `rgba(13, 148, 136, 0.2)`.
   - `frontend/lib/components/ui/RoleSwitcher.tsx` (dòng 173): `rgba(13, 148, 136, 0.08)`.
   - `frontend/app/saas-admin/index.tsx` (dòng 1755, 2135, 2196, 2301): `rgba(13, 148, 136, 0.12)`.

3. **Màu Slate Cũ (`rgba(15, 23, 42, ...)`, `rgba(30, 41, 59, ...)`, `rgba(241, 245, 249, ...)`, `rgba(148, 163, 184, ...)`)**:
   - `frontend/lib/components/ui/AppToast.tsx` (dòng 139):
     `backgroundColor: isDark ? 'rgba(30, 41, 59, 0.96)' : 'rgba(15, 23, 42, 0.94)',` (Slate-800 và Slate-900). Nên đổi về Nâu Than / Gỗ Mun `rgba(20, 17, 14, 0.96)` và `rgba(28, 25, 23, 0.94)`.
   - `frontend/lib/components/pos/product-card/ProductGlassFooter.tsx` (dòng 26, 28):
     `isOutOfStock ? isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(241, 245, 249, 0.95)'`
     `isDark ? 'rgba(11, 15, 25, 0.82)' : 'rgba(255, 255, 255, 0.88)'` (Chứa cả Slate 900, Slate 100 và Dark Obsidian `#0B0F19`).
   - `frontend/lib/components/pos/MobileCartBar.tsx` (dòng 53):
     `backgroundColor: theme.surface.glassDock || (isDark ? 'rgba(20, 30, 48, 0.92)' : 'rgba(15, 23, 42, 0.94)')` (Obsidian & Slate).
   - `frontend/lib/components/pos/table-card/TableCardFooter.tsx` (dòng 91):
     `borderTopColor: 'rgba(148, 163, 184, 0.20)'` (Slate 400). Nên dùng `theme.border.subtle`.
   - `frontend/lib/components/pos/table-ops/TableOpsHubView.tsx` (dòng 82, 114, 136, 156, 176, 196, 219, 239, 309): `rgba(15, 23, 42, 0.05)` và `rgba(15, 23, 42, 0.08)`. Nên dùng `theme.brand.primaryBg` và `theme.border.subtle`.
   - `frontend/lib/components/pos/ReceiptPreviewModal.tsx` (dòng 1188, 1191, 1202, 1203, 1272, 1290): `rgba(30, 41, 59, 0.6)` và `rgba(10, 15, 29, 0.95)`.

4. **Tàn dư Nền Nút Trắng Cũ `#F5F5F4` (`rgba(245, 245, 244, 0.15)`)**:
   - `frontend/lib/components/ui/AppSidebar.tsx` (dòng 94): `bgDark: 'rgba(245, 245, 244, 0.15)'`. Nên dùng `theme.brand.primaryBg`.
   - `frontend/lib/components/ui/AppRailNav.tsx` (dòng 773, 783): `bgDark: 'rgba(245, 245, 244, 0.15)'`. Nên dùng `theme.brand.primaryBg`.

5. **Hardcode Màu Tint Trạng Thái Thay Vì Dùng `theme.status.*`**:
   - **Xanh lá Emerald `rgba(16, 185, 129, ...)`**: Xuất hiện tại hơn 20 vị trí (`app/giao-ca/index.tsx:651,799,927,1006,1127`, `app/so-quy/index.tsx:541`, `app/thanh-toan/index.tsx:617,1706`, `app/cfd/index.tsx:241`, `app/kho-hang/index.tsx:629`, `app/quan-ly-ban/index.tsx:405,1199`, `lib/components/pos/FullScreenCartModal.tsx:160`, `lib/components/pos/CartItemRow.tsx:93`, `lib/components/pos/table-ops/TableOpsMoveView.tsx:108`, `lib/components/pos/table-ops/TableOpsSplitView.tsx:133`, `lib/components/pos/ReceiptPreviewModal.tsx:608`). **Giải pháp gốc: Thay thế toàn bộ bằng `theme.status.readyBg`**.
   - **Đỏ Chu Sa `rgba(239, 68, 68, ...)`**: Xuất hiện tại `app/giao-ca/index.tsx:802,930,1009,1130`, `app/so-quy/index.tsx:540`, `app/thanh-toan/index.tsx:828,1738,1744`, `app/thuc-don/_components/ToppingManagementTab.tsx:380`, `app/thuc-don/_components/CategoryManagementTab.tsx:401`, `app/thuc-don/_components/ProductFormModal.tsx:425,1047`, `lib/components/pos/table-ops/TableOpsVoidView.tsx:42,70`, `lib/components/pos/VoidItemModal.tsx:93,154`, `lib/components/pos/ReceiptPreviewModal.tsx:608`. **Giải pháp gốc: Thay thế toàn bộ bằng `theme.status.dangerBg`**.
   - **Vàng Hổ Phách `rgba(245, 158, 11, ...)`**: Xuất hiện tại `app/giao-ca/index.tsx:801,929,1008,1129`, `app/thuc-don/index.tsx:898`, `lib/components/pos/StockAlertBanner.tsx:43`, `lib/components/pos/VietQROffline.tsx:257`, `lib/components/pos/table-ops/TableOpsMoveView.tsx:109`, `lib/components/pos/table-ops/TableOpsSplitView.tsx:133`. **Giải pháp gốc: Thay thế toàn bộ bằng `theme.status.warningBg` (hoặc `warningBorder`)**.

---

### 1.4. Kiểm Tra Bộ Test Tự Động & Lệch Pha Khẳng Định (Test Suite Drift)

1. **Biên dịch TypeScript**:
   - Chạy lệnh: `cd frontend; npx tsc --noEmit`
   - Kết quả: **Exit code 0, 0 lỗi kiểu dữ liệu**.
2. **Kiểm thử Master Test Suite**:
   - Chạy lệnh: `npx ts-node tests/run_all_tests.ts`
   - Kết quả: **130 / 134 tests PASS (97%)**, 4 tests FAIL tập trung duy nhất ở `tier1_feature_coverage.test.ts`.
   - Nguyên nhân thất bại: File test đang lưu giữ các giá trị assert cũ của Dark Mode trước khi nâng cấp lên Anti-Glare:
     - Dòng 825: Assert `darkTheme.surface.app === '#120E0B'` (trong khi mã nguồn đã là `#14110E`).
     - Dòng 847: Assert `lightTheme.border.default === '#A8A29E'` (trong khi mã nguồn đã là `#D6D3D1`).
3. **Kiểm thử Theme Tokens (`adversarial_theme_tokens.test.ts`)**:
   - Chạy lệnh: `npx ts-node tests/adversarial_theme_tokens.test.ts`
   - Kết quả: **115 / 119 tests PASS**. 4 tests FAIL:
     - Dòng 88: Assert `darkTheme.text.inverse === '#120E0B'` (mã nguồn là `#14110E`).
     - Dòng 90: Assert `darkTheme.text.onBrand === '#120E0B'` (mã nguồn là `#FFFFFF` vì nút brand giờ là Vàng Đồng Thau `#B45309`).
     - Dòng 102: Assert `darkTheme.border.subtle === 'rgba(245, 245, 244, 0.12)'` (mã nguồn là `rgba(243, 239, 234, 0.12)` vì nền trắng ngà `#F3EFEA`).
     - Dòng 200+: Global zero-hex audit tìm thấy 12 mã hex ở Mục 1.2.

---

## 2. Logic Chain (Chuỗi Lập Luận Suy Diễn)

1. **Từ Quan sát 1.1**:
   - Light Mode đã triển khai hoàn chỉnh bộ màu Indochine Heritage (Giấy Dó `#F9F6F0`, Gỗ Mun `#1C1917`, Đồng Thau Phin `#B45309`, Xanh Lá Mộc `#15803D`).
   - Dark Mode đã chuyển sang Anti-Glare (Nâu Than Cà Phê `#14110E`, Gỗ Gụ `#1E1813`, Trắng Ngà `#F3EFEA`, Vàng Đồng Thau `#B45309`).
   - Tuy nhiên, `darkTheme.brand.accent` vẫn còn là `#F59E0B` (Bright Amber), không đồng nhất với `#B45309` được yêu cầu trong mục tiêu chuẩn hóa Anti-Glare (hoặc `#D97706` trong AGENTS.md). Cần chuẩn hóa `darkTheme.brand.accent` về `#B45309`.
2. **Từ Quan sát 1.2**:
   - Toàn bộ frontend chỉ còn 12 vị trí gán hex cứng.
   - Các vị trí này xuất phát từ việc:
     - Viết tắt bóng đổ (`#000` thay vì `theme.surface.shadow`).
     - Dùng hex tĩnh `#FFFFFF` cho mã QR và icon QR (thay vì `theme.surface.qrCanvas` và `theme.text.onBrand`).
     - Báo cáo lợi nhuận và chọn bàn dùng trực tiếp màu hex cho date pill và status pill thay vì gọi qua `theme.surface.*` và `theme.status.*`.
   - Khử 12 điểm này sẽ đưa chỉ số Hardcoded Hex về **0 vị trí tuyệt đối** trên 154 files.
3. **Từ Quan sát 1.3**:
   - Việc chuyển đổi giao diện trước đây chỉ mới khử mã hex `#...` mà chưa khử triệt để các mã màu `rgba(...)` tương đương thuộc các bảng màu cũ (Cam neon `#FF6B00`, Ngọc Jade `#0D9488`, Slate 900 `#0F172A`).
   - Đặc biệt, `BottomNavBar.tsx` (dòng 293) đang tạo ra trải nghiệm lệch pha khi thanh điều hướng mobile lại sáng màu cam neon `rgba(255, 107, 0, 0.10)` thay vì Vàng Đồng Thau Phin `rgba(180, 83, 9, 0.12)`.
   - Các màn hình `cfd`, `kds`, `so-quy` vẫn dùng tint Jade `rgba(13, 148, 136, ...)` kết hợp với text/icon Đen Gỗ Mun `theme.brand.primary`. Thay bằng `theme.brand.primaryBg` sẽ đồng bộ hóa 100% cảm quan Indochine.
   - Các màn hình `giao-ca`, `so-quy`, `thanh-toan`, `thuc-don` lặp lại ternary `isDark ? 'rgba(...)' : 'rgba(...)'` cho 3 màu xanh lá, đỏ, vàng cam. Thay bằng `theme.status.readyBg`, `theme.status.dangerBg`, `theme.status.warningBg` sẽ làm sạch mã nguồn (Ponytail standard: xóa hàng chục dòng lặp lại).
4. **Từ Quan sát 1.4**:
   - Mã nguồn thực tế đã đi trước các assertions trong test suite (`tests/tier1_feature_coverage.test.ts` và `tests/adversarial_theme_tokens.test.ts`).
   - Việc cập nhật các assertions trong 2 file test này khớp với thông số Anti-Glare chuẩn sẽ đưa test suite về **100% PASS (0 failures)**.

---

## 3. Caveats (Phạm Vi Chưa Khảo Sát & Giả Định)

1. **Modal Backdrops (`rgba(0, 0, 0, 0.55)`)**:
   - Trong các modal (`StaffFormModal`, `CustomerFormModal`, `ManagerPinModal`, `EInvoiceModal`), lớp phủ mờ backdrop đang dùng `rgba(0, 0, 0, 0.5 - 0.6)`. Trong `colors.ts`, token `theme.surface.backdrop` đã được định nghĩa (`rgba(28, 25, 23, 0.65)` cho Light và `rgba(0, 0, 0, 0.75)` cho Dark). Đây là điểm cải tiến mang lại cảm giác ấm áp Indochine nhất quán nhưng không làm gãy giao diện nếu giữ nguyên.
2. **CCTV Mock Viewport trong `ReceiptPreviewModal.tsx`**:
   - Khung mô phỏng camera an ninh CCTV chống gian lận dùng bảng màu màn hình CRT/camera riêng biệt (`rgba(10, 15, 29, 0.95)`, `rgba(7, 11, 20, 0.95)`). Đây là đặc trưng visual của phân hệ camera, không ảnh hưởng đến trải nghiệm POS cốt lõi.
3. **SVG Table Drawing trong `TableSvgBackdrop.tsx`**:
   - Các màu vẽ ghế và bàn SVG đang dùng mã RGBA tính toán theo trạng thái (Trống, Đang ngồi, Tạm tính). Giữ nguyên tính toán này hoặc ánh xạ về token Indochine đều khả thi.

---

## 4. Conclusion (Kết Luận & Kế Hoạch Triển Khai)

Hệ thống theme Indochine Heritage & Anti-Glare đã có nền tảng vững chắc trong `frontend/lib/theme/colors.ts`. Để hoàn thành trọn vẹn yêu cầu R2, kế hoạch triển khai gồm 4 nhóm tác vụ cụ thể:

### Tác Vụ 1: Chuẩn Hóa Khai Báo Trong `frontend/lib/theme/colors.ts`
1. Đổi `darkTheme.brand.accent` từ `'#F59E0B'` sang `'#B45309'` (chuẩn Vàng Đồng Thau Phin Anti-Glare, đồng bộ với Light Mode).
2. Chuẩn hóa `darkTheme.surface.header` thành `'#17120E'` (đồng bộ với AGENTS.md line 185).
3. Chuẩn hóa `darkTheme.brand.success` thành `'#22C55E'` và `darkTheme.brand.danger` thành `'#EF4444'` (đồng bộ với `readyText` và `dangerText`).

### Tác Vụ 2: Khử Triệt Để 12 Điểm Mã Hex Cứng
1. `app/bao-cao-loi-nhuan/index.tsx`:736, 768 -> `theme.surface.header` hoặc `theme.surface.card`.
2. `app/bao-cao-loi-nhuan/_components/ReportRevenueBarChart.tsx`:134, 205, 206 -> `theme.surface.app`, `theme.text.muted`, `theme.surface.switchTrack`.
3. `app/login/index.tsx`:744 và `app/login/_components/SaaSAccountForm.tsx`:896, 981 -> `theme.surface.shadow`.
4. `app/thanh-toan/_components/VietQRPaymentPane.tsx`:104, 115, 116 -> `theme.surface.qrCanvas`, `theme.text.onBrand`.
5. `lib/components/pos/TablePickerModal.tsx`:268 -> `theme.status.readyBg`.

### Tác Vụ 3: Khử Toàn Bộ Tàn Dư Legacy Palettes Trong `rgba(...)`
1. `lib/components/ui/BottomNavBar.tsx`:293 -> Đổi `rgba(255, 107, 0, ...)` thành `isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(180, 83, 9, 0.12)'`.
2. `lib/components/ui/AppToast.tsx`:139 -> Đổi Slate sang Nâu Than / Gỗ Mun `rgba(20, 17, 14, 0.96)` / `rgba(28, 25, 23, 0.94)`.
3. `lib/components/pos/product-card/ProductGlassFooter.tsx`:26, 28 -> Đổi Slate / Obsidian sang token `theme.surface.glassCard`.
4. Khử Jade `rgba(13, 148, 136, ...)` tại `app/cfd/index.tsx:129,173`, `app/kds/index.tsx:693`, `app/so-quy/index.tsx:815`, `app/cai-dat/_components/BranchesTab.tsx:601`, `lib/components/ui/RoleSwitcher.tsx:173` -> Chuyển sang `theme.brand.primaryBg`.
5. Đơn giản hóa các cụm ternary trạng thái tại `app/giao-ca/index.tsx`, `app/so-quy/index.tsx`, `app/thanh-toan/index.tsx`, `lib/components/pos/table-ops/TableOpsMoveView.tsx`, `lib/components/pos/table-ops/TableOpsSplitView.tsx`, `lib/components/pos/FullScreenCartModal.tsx` sang `theme.status.readyBg`, `theme.status.dangerBg`, `theme.status.warningBg`.

### Tác Vụ 4: Đồng Bộ Test Suite
1. Cập nhật `tests/tier1_feature_coverage.test.ts`: đồng bộ assertions với `darkTheme` Anti-Glare (`#14110E`, `#1E1813`, `#F3EFEA`, `#B45309`, `#D6D3D1`, `#382E25`).
2. Cập nhật `tests/adversarial_theme_tokens.test.ts`: đồng bộ assertions với `darkTheme.text.inverse` (`#14110E`), `darkTheme.text.onBrand` (`#FFFFFF`), `darkTheme.border.subtle`.

---

## 5. Verification Method (Phương Pháp Xác Minh Độc Lập)

Sau khi agent thực thi hoàn thành các tác vụ trên, người kiểm thử hoặc agent review có thể chạy độc lập các lệnh sau:

1. **Xác minh không còn mã hex tùy tiện (Global Zero-Hex Audit)**:
   ```bash
   cd frontend
   npx ts-node tests/adversarial_theme_tokens.test.ts
   ```
   *Điều kiện đạt*: Phần `--- 8. GLOBAL ZERO-HEX AUDIT ACROSS APP, COMPONENTS & STORE ---` báo `[PASS] Zero hardcoded hex colors across all app, component, and store files (actual: 0)`. Tổng số test pass đạt 119/119 (100%).

2. **Xác minh toàn bộ Test Suite của hệ thống**:
   ```bash
   cd frontend
   npx ts-node tests/run_all_tests.ts
   ```
   *Điều kiện đạt*: Đạt 134 / 134 tests PASS (100%), exit code 0.

3. **Kiểm tra biên dịch TypeScript**:
   ```bash
   cd frontend
   npx tsc --noEmit
   ```
   *Điều kiện đạt*: Exit code 0, 0 errors.

4. **Kiểm tra grep tĩnh không còn vết palette cũ**:
   ```bash
   # Không còn màu cam neon cũ
   git grep -n "255, 107, 0" frontend/
   # Không còn Slate 900 cũ trong UI components
   git grep -n "15, 23, 42" frontend/lib/components/ui/
   ```
   *Điều kiện đạt*: Không có kết quả nào được trả về trong các component giao diện người dùng.
