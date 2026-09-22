# Original User Request

## 2026-09-02T16:30:10Z

<USER_REQUEST>
Chuẩn hóa toàn diện luồng thao tác 1-chạm (UX Flow) và bộ từ vựng siêu súc tích (Microcopy: Nút <= 3 chữ, Toast <= 7 chữ) trên toàn bộ 10 màn hình của OngChu Lean POS (Expo SDK 52 React Native), đảm bảo ngôn ngữ gần gũi chuẩn quán F&B Việt Nam, không thao tác thừa và 0 lỗi TypeScript.

Working directory: d:/duanpos-ongchu
Integrity mode: development

---

## Bối Cảnh & Bộ Quy Chuẩn Đã Thống Nhất

Qua phỏng vấn trực tiếp (/grill-me), hệ thống thiết lập 3 quy chuẩn bất biến:
1. **Quy Chuẩn Độ Dài Microcopy**:
   - Mọi nút bấm hành động (CTA): Tối đa 3 chữ (ví dụ: Tính Tiền, Báo Bếp, Hết Món, In Lại, Đổi Giá, Đưa Đủ).
   - Mọi thông báo nổi (Toast): Tối đa 7 chữ (ví dụ: Đã báo bếp Bàn 01, Đã đổi giá thành 39k, Đã in lại bill HD-0012).
   - Nhãn dữ liệu tài chính: Tối đa 2 chữ (Tiền thừa, Đưa đủ, Tạm tính).
2. **Quy Chuẩn Luồng Thao Tác (UX Flow 1-Chạm)**:
   - Tác vụ an toàn: Chọn món, báo hết món, đổi giá, chuyển bàn, báo bếp, in bill -> Thực thi ngay trong 1 chạm (không có popup xác nhận "Bạn có chắc không?").
   - Tác vụ rủi ro thất thoát: Chiết khấu > 20%, Hủy món sau khi gửi bếp, Hủy hóa đơn đã thanh toán -> Hiện modal 1 chạm chọn lý do (Khách đổi ý, Pha nhầm, Khách phàn nàn, Khác) để lưu vết Audit Log.
3. **Phản hồi tức thì**: Rung xúc giác Haptics.Light và âm thanh click 0ms non-blocking cho mọi nút bấm.

---

## Requirements

### R1. Chuẩn Hóa Microcopy Trên Toàn Bộ 10 Màn Hình
- **Màn hình Bán Hàng POS (`/`)**:
  - `+ Món Ngoài` -> `+ Món khác`
  - `Gửi Bếp` -> `Báo Bếp`
  - `Thanh Toán` -> `Tính Tiền`
  - `VietQR` -> `Mã QR`
  - `🚫 Báo Hết Hàng (86'd)` -> `🚫 Báo Hết Món`
- **Màn hình Thanh Toán (`/thanh-toan`)**:
  - `HOÀN TẤT THANH TOÁN` -> `Xong & In Bill`
  - `Tiền thối lại` -> `Tiền thừa`
  - `Khách đưa đúng tiền` -> `Đưa đủ`
  - `Napas247 đúng số tiền còn lại` -> `Quét mã chuyển tiền`
- **Màn hình Bếp/Bar (`/kds`)**:
  - `Ticket View` -> `Theo Bàn`
  - `Gom Món Tổng Hợp` -> `Gom Món`
  - `ĐÃ XONG TẤT CẢ` -> `Xong Hết`
  - `Bắt đầu làm` -> `Làm món`
- **Màn hình Lịch Sử Đơn (`/hoa-don`)**:
  - `LỊCH SỬ HÓA ĐƠN` -> `Sổ Đơn Đã Bán`
  - `Hủy Hóa Đơn` -> `Hủy Đơn`
  - `In Phiếu K80` -> `In Lại`
- **Màn hình Thực Đơn (`/thuc-don`)**:
  - `QUẢN LÝ THỰC ĐƠN & HẾT MÓN` -> `Thực Đơn & Hết Món`
  - `CÒN HÀNG` / `HẾT MÓN` -> `Đang bán` / `Hết món`
  - `Điều Chỉnh Giá Bán` -> `Đổi Giá`
  - `Tạo Món Mới` -> `Thêm Món`
- **Màn hình Cài Đặt (`/cai-dat`)**:
  - `CẤU HÌNH HỆ THỐNG & THIẾT BỊ` -> `Cài Đặt Máy In & VietQR`
  - `Kiểm Tra In Thử Socket` -> `In Thử Bill`
  - `Kích Mở Két Tiền RJ11` -> `Bật Két`

### R2. Tinh Gọn Sidebar & Menu Điều Hướng (`AppSidebar.tsx`)
- Chuẩn hóa tiêu đề & phụ đề súc tích:
  - `Sơ Đồ Bàn & Bán Hàng` · Bán tại chỗ & Mang về
  - `Màn Hình Bếp / Bar` · Xem đơn & Báo xong
  - `Màn Hình Khách (CFD)` · Mã QR khách quét
  - `Sổ Đơn Đã Bán` · Tra cứu & in lại bill
  - `Thực Đơn & Hết Món` · Bật tắt món nhanh
  - `Sổ Quỹ Chi Chợ` · Mua đá, rau, ứng lương
  - `Giao Ca Đếm Két` · Kiểm tiền cuối ca
  - `Lợi Nhuận Bỏ Túi` · 3 con số vàng
  - `Cài Đặt & Máy In` · Máy in LAN, VietQR

---

## Acceptance Criteria

### Code Quality & TypeScript Compilation
- [ ] Lệnh kiểm tra TypeScript `cd frontend; npx tsc --noEmit` hoàn thành với **0 lỗi** (Exit code 0).
- [ ] Toàn bộ các component không bị lỗi kiểu dữ liệu hoặc thiếu props.
</USER_REQUEST>

## 2026-09-02T17:08:36Z

<USER_REQUEST>
Nâng cấp toàn diện ngôn ngữ thiết kế giao diện OngChu Lean POS theo phong cách Kính Mờ Cao Cấp (macOS Glassmorphism / Frosted Glass), tối ưu hóa hiệu năng render cho thiết bị di động (mát máy, tiết kiệm pin, 60 FPS mượt mà) và sắp xếp layout công thái học đơn giản, trực diện, chuẩn vị F&B.

Working directory: d:/duanpos-ongchu
Integrity mode: development

---

## Requirements

### R1. Ngôn Ngữ Thiết Kế Kính Mờ Kỹ Thuật Số (Lightweight Frosted Glass Engine)
- Triển khai hệ thống token màu kính mờ đa tầng (`theme.surface.glassCard`, `theme.surface.glassHeader`, `theme.surface.glassBorder`) sử dụng kỹ thuật Alpha Translucent kết hợp viền sáng vi điểm `1px` (`rgba(255,255,255,0.12)` ở Dark mode / `rgba(255,255,255,0.85)` ở Light mode).
- Tạo chiều sâu không gian 2.5D với hiệu ứng bóng đổ mờ tinh tế (subtle elevation glow), không dùng shader GPU nặng giúp thiết bị luôn mát lạnh, tiết kiệm pin tối đa và duy trì ổn định 60 FPS.

### R2. Tối Ưu Bố Cục Công Thái Học F&B Tập Trung (3-Zone Glass Architecture)
- Thiết lập bố cục 3 vùng tiêu chuẩn trên toàn bộ 10 màn hình:
  - **Vùng 1 (Top Glass Bar)**: Header kính mờ hiển thị thương hiệu, đồng hồ live, trạng thái kết nối máy in LAN / Két tiền và chuyển nhanh phân hệ.
  - **Vùng 2 (Center Grid Canvas)**: Thẻ Squircle bo tròn chuẩn macOS (`borderRadius: 16-20px`), kích thước nút chạm đạt chuẩn công thái học $\ge 48px$ chống ấn nhầm khi đông khách.
  - **Vùng 3 (Bottom Floating Glass Dock)**: Thanh điều hướng / Giỏ hàng nổi biến hình bán trong suốt, ôm trọn các nút hành động 1-chạm cực đại (`Tính Tiền`, `Báo Bếp`) trong tầm với ngón tay cái.

### R3. Tối Ưu Hiệu Năng Render Mobile & Tiết Kiệm Pin (Cool & Fast 60 FPS)
- Áp dụng `React.memo` và custom shallow comparator cho toàn bộ thẻ danh sách (`ProductCard`, `TableCard`, `CartItemRow`, `KdsTicketCard`).
- Giữ vững nguyên tắc `0ms non-blocking` cho `Haptics` và âm thanh `playTapSound()`.
- Đảm bảo toàn bộ hiệu ứng chuyển cảnh và thao tác chạm phản hồi tức thì trong khung thời gian $< 16ms$ (1-frame budget 60 FPS), không gây tràn bộ nhớ hay nóng máy khi chạy liên tục cả ngày.

---

## Acceptance Criteria

### Visual Polish & Glassmorphism Design
- [ ] 100% các màn hình hiển thị đồng bộ hiệu ứng Kính Mờ Đa Tầng (Lightweight Frosted Glass) với viền phản chiếu $1px$ và thẻ Squircle chuẩn macOS.
- [ ] Bố cục 3 vùng (Top Glass Bar, Canvas Grid, Bottom Glass Dock) hiển thị hoàn hảo trên cả điện thoại di động và iPad/Tablet.
- [ ] Tuân thủ nghiêm ngặt 3 quy tắc Microcopy (CTA $\le 3$ chữ, Toast $\le 7$ chữ, Tiền tệ $\le 2$ chữ) và `tabularNums` 100%.

### Performance & Code Quality
- [ ] Lệnh kiểm tra TypeScript `cd frontend; npx tsc --noEmit` hoàn thành với **0 lỗi** (Exit code 0).
- [ ] Bộ kiểm thử tự động `cd frontend; npx ts-node tests/run_all_tests.ts` đạt **146 / 146 Tests PASS (100%)** với thời gian chạy $< 100ms$.
- [ ] Không sử dụng các shader GPU blur nặng tùy tiện làm ảnh hưởng đến nhiệt độ máy và thời lượng pin.
</USER_REQUEST>

## 2026-09-03T08:25:56Z

<USER_REQUEST>
This is a single self-contained fix; keep it small and focused.

Tái cấu trúc và băm nhỏ các tệp component lớn trong phân hệ Bán hàng (cụ thể là `ProductCard.tsx` 573 dòng và `TableCard.tsx` 347 dòng) thành các sub-component độc lập dưới 200 dòng, giữ nguyên 100% logic, hành vi cảm ứng và giao diện macOS Sequoia Vibrant Glass, nhằm tiết kiệm token và tối ưu tốc độ bảo trì.

Working directory: d:/duanpos-ongchu/frontend
Integrity mode: development

## Requirements

### R1. Băm nhỏ ProductCard.tsx thành các sub-component độc lập
Tách `frontend/lib/components/pos/ProductCard.tsx` (573 dòng) thành các tệp chuyên biệt trong thư mục `frontend/lib/components/pos/product-card/`:
- Thành phần hiển thị ảnh món & badge số lượng/hết món.
- Thành phần chân thẻ kính mờ (Glass Footer) chế độ Lưới (Grid View) với text to rõ ràng (dishName sm, price md).
- Thành phần hiển thị dòng thẻ chế độ Danh sách (List View) với text to rõ ràng.
- Bộ so sánh `areProductCardPropsEqual` và tệp index bọc giữ nguyên component export `ProductCard`.

### R2. Băm nhỏ TableCard.tsx thành các sub-component độc lập
Tách `frontend/lib/components/pos/TableCard.tsx` (347 dòng) thành các tệp chuyên biệt trong thư mục `frontend/lib/components/pos/table-card/`:
- Header thẻ bàn (Tên bàn to rõ variant="md", số lượng khách, badge trạng thái).
- Center timer & item count indicator (thời gian phục vụ, số món đang gọi to rõ variant="sm").
- Footer tổng tiền hóa đơn variant="lg" tabularNums.
- Tệp index bọc giữ nguyên component export `TableCard`.

### R3. Bảo toàn 100% hợp đồng API và giao diện macOS Sequoia
Tất cả các exports, props, logic haptics, sound, memoization, và styling macOS Glass (frosted acrylic, 1px specular border, Cobalt Blue #007AFF) phải được bảo toàn nguyên vẹn, không làm thay đổi bất kỳ hành vi người dùng nào.

## Acceptance Criteria

### Toàn vẹn mã nguồn & Tối ưu kích thước tệp
- [ ] Không có tệp con nào trong các module mới vượt quá 200 dòng mã.
- [ ] Toàn bộ các import hiện có trong ứng dụng đến ProductCard và TableCard tiếp tục hoạt động trơn tru mà không cần sửa đổi đường dẫn import ở bên ngoài.
- [ ] Lệnh kiểm tra TypeScript `npx tsc --noEmit` trong thư mục `frontend` thực thi thành công với 0 lỗi (Exit code 0).

### Xác minh hiển thị và cảm ứng
- [ ] Màn hình Sơ đồ bàn hiển thị đầy đủ các bàn với đúng màu sắc, timer và số tiền.
- [ ] Màn hình Danh mục món ăn hiển thị chính xác cả 2 chế độ Lưới (Grid) và Danh sách (List), thao tác chạm thêm món hoạt động bình thường.
</USER_REQUEST>

## 2026-09-03T13:59:18Z

<USER_REQUEST>
Toàn diện chuẩn hóa 100% token cỡ chữ, mã màu Hex và nền giao diện trên cả 10 màn hình (/app) và toàn bộ các component/modal dùng chung (/lib/components) trong OngChu Lean POS, loại bỏ triệt để hardcoded hex/fontSize và đảm bảo tuân thủ nghiêm ngặt 4 cỡ chữ AppText và Dual-Theme tokens.

Working directory: d:/duanpos-ongchu/frontend
Integrity mode: development
Requested team: Nhóm đa tác tử toàn diện (Full team) — chia nhỏ theo từng màn hình chạy song song

## Requirements

### R1. Chuẩn Hóa Cỡ Chữ TextInput Về Design System (Typography Alignment)
Chuẩn hóa 25 vị trí `fontSize` cứng trong các ô nhập liệu `TextInput` (Search, Ghi chú bàn, Nhập tiền, Khuyến mãi, Tên món tùy chỉnh) về đúng thang đo 4 cấp tương ứng của `<AppText>`:
- `14` (tương đương `xs`/`sm` mobile input) cho search input phụ, discount percent.
- `16` (tương đương `sm`/`md` input tiêu chuẩn) cho form text input, tìm món.
- `22` (tương đương `lg` hero input) cho ô nhập tiền lớn (Giao ca, Sổ quỹ, Thanh toán).
- Tuyệt đối không dùng các cỡ lẻ không có trong thang đo như `9`, `11`, `13`, `15`, `18`.

### R2. Khử 100% Mã Màu Hex Gắn Cứng Sang Dual-Theme Tokens (Zero Hardcoded Hex)
Thay thế 332 vị trí mã Hex (`#FFFFFF`, `#D1D5DB`, `#0D9488`, `#EF4444`, `#10B981`, các màu tint mềm `#ECFDF5`, `#FFF7ED`, v.v.) bằng các semantic tokens từ `useTheme()`:
- Màu chữ tương phản trên nền thương hiệu/nút bấm: `theme.text.inverse` hoặc token chuẩn thay vì `#FFFFFF` cứng.
- Màu công tắc Switch `trackColor`: `theme.surface.switchTrack` và `theme.brand.primary` thay vì `#D1D5DB`.
- Màu tint trạng thái (Chờ làm, Đang làm, Bếp nóng, Quầy bar): bổ sung hoặc dùng trực tiếp token ngữ nghĩa từ theme (`theme.status.pendingBg`, `theme.status.cookingBg`, `theme.status.readyBg`).
- Màu hairline border: `theme.border.subtle` thay thế triệt để `#F3F4F6`, `#E2E8F0`, `#CBD5E1`.

### R3. Đảm Bảo Tương Thích Hoàn Hảo Cả 2 Chế Độ Sáng/Tối (Dual-Theme Compliance)
Mọi component sau khi khử mã cứng phải hiển thị tương phản đạt chuẩn AAA trên cả:
- **Light Mode**: Clean Slate High-Contrast (`#F8FAFC`, surface `#FFFFFF`).
- **Dark Mode**: Obsidian Dark Glass (`#0B0F19`, surface `#141E30`).
- Không gây vỡ layout, giật khung hoặc mất chữ khi người dùng bấm nút đảo Theme.

## Acceptance Criteria

### Automated & Static Verification
- [ ] Lệnh quét tĩnh `#[0-9a-fA-F]{3,8}` trên toàn bộ `frontend/app` và `frontend/lib/components` (ngoại trừ file khai báo gốc `theme/tokens.ts`) giảm về 0 vị trí mã màu tùy tiện.
- [ ] 100% thành phần hiển thị chữ sử dụng `<AppText>` (đạt 0 thẻ `<Text>` nguyên bản).
- [ ] Các thuộc tính `fontSize` trên `TextInput` chỉ nằm trong tập giá trị chuẩn: `[14, 16, 22]`.
- [ ] Lệnh kiểm tra TypeScript `npx tsc --noEmit` hoàn tất với 0 lỗi (`Found 0 errors`).

### Visual & Runtime Verification
- [ ] Chuyển đổi qua lại giữa Light Mode và Dark Mode trên toàn bộ 10 màn hình: Bán hàng POS (`/`), Thanh toán (`/thanh-toan`), KDS (`/kds`), Sổ đơn (`/hoa-don`), Thực đơn (`/thuc-don`), Cài đặt (`/cai-dat`), Sổ quỹ (`/so-quy`), Giao ca (`/giao-ca`), Báo cáo (`/bao-cao-loi-nhuan`), CFD (`/cfd`) không bị chìm chữ, mất viền hoặc lệch màu.
- [ ] Chụp ảnh kiểm thử thực tế trên Pixel 8 emulator cho kết quả độ tương phản cao, đúng quy chuẩn 3.1 & 3.3 trong `AGENTS.md`.
</USER_REQUEST>

## 2026-09-04T08:24:35Z

<USER_REQUEST>
Xây dựng hệ thống POS tinh gọn cho cửa hàng nhỏ: tối ưu luồng gọi món tức thời đa kênh, đồng bộ đơn offline, điều phối bếp/KDS realtime, quản lý định lượng kho nguyên liệu theo BOM và đối soát dòng tiền chuẩn xác theo ca trực.

Working directory: d:/duanpos-ongchu
Integrity mode: development

## Requirements

### R1. Bán hàng & Thanh toán đa kênh (POS & Offline-first)
- Cho phép tạo đơn tại bàn hoặc tại quầy; hỗ trợ thêm topping, chọn size, tách/ghép bàn và ghi chú biến thể món (độ ngọt, đá).
- Thanh toán linh hoạt (tiền mặt, thẻ, sinh mã VietQR động theo đúng số tiền hóa đơn); in bill nhanh qua mạng LAN/USB ESC/POS.
- Cơ chế offline-first: lưu trữ đơn hàng cục bộ khi mất mạng và tự động đồng bộ 2 chiều ngay khi có kết nối trở lại mà không mất mát hay trùng lặp.

### R2. Điều phối bếp & Trả món (KDS & In phiếu chế biến)
- Tự động phân luồng in vé chế biến (order ticket) hoặc đẩy đơn qua KDS thời gian thực riêng cho từng trạm quầy pha chế / bếp ngay khi bấm lưu.
- Cập nhật tiến độ món (chờ làm, đang làm, đã phục vụ) giúp nhân viên theo dõi sát sao, tránh sót đơn vào giờ cao điểm.

### R3. Quản lý thực đơn & Định lượng kho (BOM)
- Quản lý danh mục món, combo, giá theo khung giờ và nút bật/tắt nhanh trạng thái "hết hàng" (86) chống nhận nhầm món.
- Định lượng công thức (BOM): tự động trừ tồn kho nguyên liệu thô theo công thức món bán ra; phát cảnh báo khi nguyên liệu chạm ngưỡng tối thiểu.
- Quản lý phiếu nhập hàng từ nhà cung cấp, xuất tiêu hao nội bộ và đối soát tồn thực tế cuối ngày.

### R4. Ca làm việc, Dòng tiền & Chống thất thoát
- Quản lý ca trực: bàn giao số dư đầu ca, kiểm két và đối soát chênh lệch tiền mặt thực tế với doanh thu hệ thống trước khi đóng ca.
- Báo cáo kinh doanh thời gian thực: thống kê doanh thu, cơ cấu phương thức thanh toán và danh sách các món bán chạy nhất.
- Phân quyền 3 vai trò (Phục vụ, Thu ngân, Chủ quán); yêu cầu mã duyệt của quản lý khi hủy món, áp mã giảm giá hoặc in lại hóa đơn cũ.

## Acceptance Criteria

### Bán hàng, Thanh toán & Đồng bộ
- [ ] Luồng tạo đơn, thêm topping, chọn size và thanh toán hoàn tất thành công trong môi trường bình thường.
- [ ] Khi ngắt kết nối mạng: đơn hàng mới vẫn lưu trữ an toàn trong local storage, khi có mạng tự động push lên backend với mã đơn duy nhất không trùng lặp.
- [ ] Chuỗi VietQR sinh động chuẩn định dạng Napas 247 khớp đúng 100% số tiền của hóa đơn.

### Chế biến & KDS
- [ ] Đơn gửi bếp lập tức xuất hiện trên KDS hoặc sinh dữ liệu ticket in đúng trạm pha chế/bếp theo phân loại món.
- [ ] Cập nhật trạng thái món trên KDS phản hồi tức thời lên màn hình bán hàng và ngược lại.

### Kho định lượng BOM & Luồng hàng
- [ ] Mỗi đơn thanh toán thành công chứa món có định lượng BOM tự động giảm số lượng tồn kho nguyên liệu tương ứng.
- [ ] Cảnh báo tồn kho tối thiểu hiển thị rõ khi nguyên liệu chạm ngưỡng an toàn.
- [ ] Ghi nhận đầy đủ phiếu nhập kho NCC, xuất hủy và cập nhật số dư kho chính xác.

### Ca trực & Kiểm soát rủi ro
- [ ] Đóng ca tính đúng công thức: Số dư kỳ vọng = Số dư đầu ca + Tiền mặt bán hàng + Thu ngoài - Chi ngoài.
- [ ] Đối soát tiền mặt thực tế với kỳ vọng, ghi nhận chênh lệch thừa/thiếu và lưu vết audit log.
- [ ] Tác vụ hủy món đã báo bếp hoặc áp chiết khấu bắt buộc nhập mã duyệt của quản lý trước khi thực hiện.

### Kiểm thử tự động (Verification)
- [ ] Bộ test tự động (Go API tests / Integration test scripts) chạy thành công 100%, xác nhận toàn bộ luồng khép kín: Đặt món -> Bếp KDS -> Trừ kho BOM -> Thanh toán VietQR/Cash -> Giao ca đối soát két -> Báo cáo doanh thu.
</USER_REQUEST>

## 2026-09-04T08:52:53Z

<USER_REQUEST>
Xây dựng hệ thống POS tinh gọn cho cửa hàng nhỏ (F&B/Retail) tập trung 100% vào Vận hành thực tế (Operations) và Dòng tiền thực thu (Cashflow), loại bỏ hoàn toàn các nghiệp vụ kế toán phức tạp (định khoản Nợ/Có, khấu hao, chi phí dở dang, sổ cái).

Working directory: d:/duanpos-ongchu
Integrity mode: development

## Requirements

### R1. Phân hệ Bán hàng tại quầy (POS Terminal & Fast-Touch)
- Order trực quan: tìm kiếm món gõ phím/barcode/nhóm danh mục, ghim món bán chạy (fast-access).
- Modifiers & Biến thể: size (S/M/L), định mức đường/đá, topping, ghi chú riêng (không hành, ít cay...).
- Thao tác bàn/bill linh hoạt: chuyển/gộp bàn, tách món sang bill mới hoặc gộp nhiều bill, tạm lưu đơn mang về.
- Thanh toán tức thời: sinh mã VietQR động theo đúng số tiền đơn, gợi ý mệnh giá tiền mặt & tự tính tiền thối, hỗ trợ thanh toán hỗn hợp (tiền mặt + chuyển khoản).
- In ấn tức thì: in tạm tính cho khách kiểm tra, in hóa đơn thanh toán và in lệnh tách món ra quầy bar/bếp qua mạng LAN/USB ESC/POS.

### R2. Quản lý Doanh thu, Ca trực & Két tiền (Shift & Cashflow)
- Quản lý danh sách đơn hàng lọc theo trạng thái (*Đang phục vụ, Đã thanh toán, Đã hủy, Hoàn trả*) kèm chi tiết món, người tạo, phương thức thanh toán.
- Audit Log (Nhật ký thao tác): lưu vết nhân viên bấm hủy đơn/món kèm lý do bắt buộc để chống gian lận.
- Quản lý Ca trực & Két tiền (Shift Management):
  - Mở ca: nhập số dư tiền mặt đầu ca để thối tiền lẻ.
  - Trong ca: ghi nhận thu/chi vặt tại quầy (mua đá, túi nilon, phụ phí...).
  - Đóng ca: đếm tiền mặt thực tế trong két nhập vào hệ thống; phần mềm tự so khớp với doanh thu lý thuyết để tính **Chênh lệch thừa/thiếu** không cần kế toán.
- Báo cáo doanh thu thuần: theo ngày/tháng/năm/khung giờ cao điểm, cơ cấu tiền mặt vs chuyển khoản, top món bán chạy (Best-sellers) và món bán chậm.

### R3. Quản lý Sơ đồ Bàn & Khu vực (Floor & Table Plan)
- Cấu hình phân vùng/tầng (Tầng 1, Tầng 2, Ngoài trời, Máy lạnh), mã bàn (B01, B02...), số ghế tối đa.
- Sơ đồ trực quan cập nhật trạng thái thời gian thực 3 màu:
  - **Trống (Xanh lá):** Sẵn sàng đón khách.
  - **Đang có khách (Đỏ/Cam):** Hiển thị số món đã gọi, tổng tiền hiện tại và thời gian khách đã ngồi.
  - **Đã in tạm tính (Vàng):** Đang đợi khách thanh toán.

### R4. Quản lý Thực đơn & Trạng thái bán (Menu & Modifiers)
- Cấu trúc danh mục đa cấp, thông tin món (tên, hình ảnh, SKU, giá niêm yết, giá vốn ước tính để tính biên lợi nhuận gộp, thuộc tính size/topping).
- Quản lý trạng thái bán: bật/tắt nhanh nút "Hết hàng" (86) ngăn nhân viên nhận nhầm món.
- Cấu hình Combo/Set món với giá ưu đãi.

### R5. Quản lý Kho hàng & Định lượng Thực tế (Recipe / BOM & Stock Balance)
- Danh mục Nguyên vật liệu (NVL) và Quy đổi đơn vị tính (UoM) chuẩn xác (Bao/Hộp -> Gram/ml).
- Định lượng công thức món (Recipe / BOM): mỗi món bán ra tự động trừ chính xác lượng NVL thô tương ứng khỏi kho.
- Nhập kho đơn giản: lập phiếu nhập từ Nhà cung cấp (+ tồn kho ngay sau xác nhận).
- Kiểm kê kho & Cân bằng tồn: nhập tồn đếm thực tế, tính chênh lệch Thất thoát/Dôi dư và tạo phiếu cân bằng đưa tồn máy về thực tế.
- Cảnh báo hết hàng: hiển thị cảnh báo đỏ khi lượng tồn NVL chạm ngưỡng an toàn (Reorder Point).

### R6. Vận hành Bổ trợ: Phân quyền, CRM nhẹ & Nhà cung cấp
- Phân quyền 4 nhóm vai trò (*Thu ngân, Phục vụ, Quản lý, Chủ quán*); chỉ Quản lý/Chủ quán mới được hủy món sau báo bếp, chiết khấu hoặc xem báo cáo doanh thu tổng.
- CRM Khách hàng cơ bản: lưu tên, SĐT, ngày sinh; tích điểm (10.000đ = 1 điểm) cho phép trừ điểm trực tiếp vào bill lần sau.
- Quản lý Nhà cung cấp (Vendor): danh bạ NCC, lịch sử nhập hàng và biến động đơn giá nhập.

## Acceptance Criteria

### Bán hàng, Bàn & Thanh toán (R1, R3)
- [ ] Luồng tạo đơn, ghim món, chọn size, thêm topping, ghi chú thực hiện nhanh, mượt mà dưới 3 chạm.
- [ ] Chuyển bàn, gộp bàn và tách bill cập nhật chính xác số lượng món và tổng tiền tương ứng trên cả sơ đồ bàn.
- [ ] Sơ đồ bàn hiển thị chính xác trạng thái màu (Xanh: trống, Đỏ/Cam: có khách kèm thời gian ngồi & tổng tiền, Vàng: đã in tạm tính).
- [ ] Sinh mã VietQR động đúng định dạng Napas 247 khớp 100% số tiền hóa đơn và nội dung mã đơn.
- [ ] Tính năng thanh toán hỗn hợp chia chính xác số tiền tiền mặt và chuyển khoản, tính đúng tiền thối lại.

### Doanh thu, Ca trực & Két tiền (R2)
- [ ] Mở ca ghi nhận số tiền lẻ đầu ca; các bút toán chi vặt/thu vặt trong ca cập nhật tức thì vào số dư lý thuyết.
- [ ] Đóng ca tính đúng công thức: `Tiền lý thuyết = Số dư đầu + Tiền mặt bán hàng + Thu vặt - Chi vặt`.
- [ ] Hệ thống so khớp tiền đếm thực tế với tiền lý thuyết, hiển thị chính xác số tiền thừa/thiếu và ghi log.
- [ ] Mọi thao tác hủy món/hủy đơn ghi vết Audit Log đầy đủ nhân viên, thời gian và lý do hủy.

### Thực đơn, Định lượng Kho & Cân bằng tồn (R4, R5)
- [ ] Bật/tắt "Hết hàng" phản hồi tức thời trên giao diện bán hàng, ngăn không cho chọn món đã tắt.
- [ ] Thanh toán hóa đơn tự động trừ tồn kho NVL thô theo công thức BOM đã cài đặt và quy đổi đúng đơn vị tính (kg->g, lít->ml).
- [ ] NVL chạm ngưỡng tồn an toàn (Reorder Point) kích hoạt cảnh báo hết hàng trực quan.
- [ ] Phiếu cân bằng kiểm kê cập nhật tồn kho máy khớp 100% số lượng đếm thực tế ngoài kho.

### Vận hành Phân quyền, CRM & Nhà cung cấp (R6)
- [ ] Nhân viên Thu ngân/Phục vụ thao tác xóa món đã gửi bếp hoặc chiết khấu đơn bắt buộc phải nhập mã phê duyệt của Quản lý/Chủ quán.
- [ ] Khách hàng thanh toán tự động tích lũy điểm thưởng theo tỷ lệ cấu hình; áp dụng trừ điểm thành công vào tổng tiền hóa đơn tiếp theo.
- [ ] Lập phiếu nhập kho lưu vết Nhà cung cấp và cập nhật lịch sử giá nhập.

### Kiểm thử Tự động & Toàn vẹn (Verification)
- [ ] Bộ kiểm thử tự động (API / Integration test scripts) chạy đạt 100%, kiểm chứng trọn vẹn luồng khép kín: Nhập kho NVL -> Đặt món POS (size, topping) -> Trừ kho BOM -> Thanh toán hỗn hợp/VietQR -> Chi vặt tại quầy -> Chốt ca đếm két -> Báo cáo doanh thu & chênh lệch két.
</USER_REQUEST>

## 2026-09-11T13:39:22Z

<USER_REQUEST>
Xây dựng chiến lược SEO toàn diện và triển khai hệ thống nội dung, kỹ thuật tối ưu hóa công cụ tìm kiếm (Google Search) kết hợp tối ưu hóa tìm kiếm thế hệ mới (AI Search Engines: ChatGPT, Perplexity, Gemini, Claude) giúp OngChu POS (ongchu.cloud) thống trị vị trí Top 1 từ khóa ngành phần mềm quản lý bán hàng F&B miễn phí tại Việt Nam.

Working directory: d:/duanpos-ongchu/landing
Integrity mode: development

## Requirements

### R1. Bộ Ma Trận Từ Khóa & Định Danh Thực Thể (Keyword Matrix & Entity Authority - AEO/GEO)
- Nghiên cứu và xây dựng bộ ma trận từ khóa F&B đầy đủ (từ khóa hạt giống, từ khóa chuyển đổi cao, từ khóa câu hỏi/intent) xoay quanh các ngách: quán cafe, trà sữa, trà chanh, quán ăn gia đình, nhà hàng ăn uống, take-away.
- Xây dựng bản đồ thực thể (Entity Knowledge Graph) rõ ràng, xác định OngChu POS là giải pháp phần mềm quản lý bán hàng F&B vị chủ quán được tài trợ miễn phí 100% vĩnh viễn (0đ bản quyền, 0đ thuê bao, hỗ trợ qua Hotline/Zalo 0392.387.165).
- Chuẩn hóa và mở rộng tệp `llms.txt` theo đúng tiêu chuẩn llmstxt.org để các AI crawler (GPTBot, PerplexityBot, ClaudeBot, Google-Extended) trích xuất dữ liệu chuẩn xác, không bị ảo giác (hallucination).

### R2. Cụm Trang Chuyên Biệt Theo Từng Mô Hình Quán (Topical Cluster & Silo Architecture)
- Thiết kế và xuất bản cụm trang tĩnh chuyên biệt theo mô hình ngành:
  - Trang dành riêng cho Quán Cafe & Trà Sữa (`cafe.html` hoặc `/cafe`)
  - Trang dành riêng cho Quán Ăn & Nhà Hàng (`quan-an.html` hoặc `/quan-an`)
- Mỗi trang tuân thủ tuyệt đối chuẩn thiết kế: Single-Fold gọn gàng, phong cách kính mờ Apple iOS 17/18, tràn viền Edge-to-Edge, đệm an toàn text công thái học và hướng toàn bộ chuyển đổi về Zalo `0392387165`.
- Tích hợp tiêu đề H1-H3, thẻ Meta độc bản và lược đồ Schema.org JSON-LD riêng biệt cho từng mô hình.

### R3. Kiểm Toán Kỹ Thuật & Tự Động Hóa Dữ Liệu SEO (Technical SEO & Automated Audit)
- Tối ưu 100/100 điểm hiệu năng (Core Web Vitals): mã HTML/CSS siêu nhẹ, không phụ thuộc JS nặng, tải trang tức thì dưới 100ms.
- Cập nhật toàn diện `sitemap.xml` bao gồm toàn bộ các URL mới với ngày cập nhật và độ ưu tiên chuẩn.
- Cấu hình `robots.txt` cho phép index toàn bộ và phân luồng thân thiện cho AI crawlers.
- Viết script Python tự động kiểm toán toàn diện (`audit_seo_integrity.py`): kiểm tra độ dài title/meta description, sự tồn tại của thẻ canonical, OpenGraph, Twitter card, tính hợp lệ của Schema.org JSON-LD và trạng thái HTTP.

### R4. Kế Hoạch Xây Dựng Độ Tin Cậy & Tín Hiệu Xã Hội (Off-Page Trust & Authority Blueprint)
- Lập lộ trình hành động thực chiến chi tiết để phát triển tín hiệu uy tín bên ngoài:
  - Bản kế hoạch chia sẻ giá trị trong các cộng đồng khởi nghiệp F&B, chủ quán cafe/trà sữa tại Việt Nam.
  - Hướng dẫn thiết lập hồ sơ Google Business Profile (nếu cần), tạo backlink tự nhiên từ các thư viện phần mềm, diễn đàn công nghệ và trang danh bạ uy tín.
  - Kế hoạch đo lường và theo dõi thứ hạng từ khóa định kỳ.

## Acceptance Criteria

### Automated Verification
- [ ] Script kiểm toán `audit_seo_integrity.py` chạy thành công với 0 cảnh báo và 0 lỗi cho toàn bộ các trang.
- [ ] 100% các trang có đầy đủ thẻ Title (< 65 ký tự), Meta Description (120-160 ký tự), Canonical URL và OpenGraph tags.
- [ ] 100% các trang có cấu trúc Schema.org JSON-LD (`SoftwareApplication`, `Organization`, `FAQPage`, `WebSite`) hợp lệ không có lỗi cú pháp.
- [ ] File `sitemap.xml` và `robots.txt` chứa đầy đủ các endpoint mới và liên kết chính xác.
- [ ] File `llms.txt` chứa đầy đủ ngữ cảnh máy đọc được (machine-readable context) cho ít nhất 3 mô hình quán.

### Qualitative Expert Review
- [ ] Bộ ma trận từ khóa chi tiết tối thiểu 40+ từ khóa phân nhóm theo mục đích tìm kiếm (Commercial, Informational, Transactional) kèm phân tích đối thủ cạnh tranh.
- [ ] Các trang vệ tinh giữ vững phong cách thiết kế kính mờ iOS 17/18, không phát sinh lỗi vỡ layout trên mobile.
- [ ] Bản tài liệu kế hoạch hành động Off-page và chiến lược vượt đối thủ có tính khả thi thực tế cao, phân bổ theo các mốc thời gian 30 ngày - 60 ngày - 90 ngày.
</USER_REQUEST>

## 2026-09-13T06:29:56Z

<USER_REQUEST>
Kiểm duyệt toàn bộ 10 màn hình của hệ thống POS (Bán hàng, Sơ đồ bàn, Giỏ hàng/Thanh toán, KDS Bếp/Bar, Sổ đơn, Thực đơn, Sổ quỹ, Giao ca, Báo cáo P&L, Cài đặt) và nâng cấp UI/UX, CSS/StyleSheet, theme, layout theo tiêu chuẩn Apple Design Resources và Human Interface Guidelines (HIG), kèm bộ kịch bản kiểm tra tự động độc lập.

Working directory: d:/duanpos-ongchu/frontend
Integrity mode: development

Reference: https://developer.apple.com/design/resources/

## Requirements

### R1. Kiểm duyệt & Chuẩn hóa Đường viền và Bo góc Squircle (Retina Hairline & Curves)
- Toàn bộ đường kẻ phân cách, viền thẻ, ô nhập liệu và thanh dock trên cả 10 màn hình phải sử dụng `StyleSheet.hairlineWidth` thay cho `borderWidth: 1` thô ráp.
- Hệ thống bo góc chuẩn mực Apple: Controls (10-12px), Card/Container (14-16px), Modal Sheet (20-24px) kèm thanh vuốt `dragIndicator`.

### R2. Trợ năng VoiceOver & Nhãn Ngữ Nghĩa (Accessibility HIG)
- Tất cả các nút bấm icon và thành phần tương tác trên từng màn hình phải có `accessibilityRole` và `accessibilityLabel` tiếng Việt rõ nghĩa.
- Đảm bảo vùng chạm tối thiểu >= 44x44pt hoặc có `hitSlop` mở rộng đầy đủ.

### R3. Bố cục Kính mờ Phân tầng (Materials & Soft Elevation)
- Navigation Header và Bottom Dock sử dụng nền kính mờ `glassHeader` / `glassDock` kết hợp bóng đổ đa tầng nhẹ mềm mại (`shadowOpacity: 0.04 - 0.08`), triệt tiêu bóng đổ thô.
- 100% số liệu tài chính, mã đơn, giờ phục vụ và số lượng phải bật `tabularNums`.

### R4. Kịch Bản Kiểm Tra Tự Động (Automated Verification Script)
- Xây dựng script kiểm tra tự động quét qua toàn bộ 10 màn hình để xác nhận: không còn `borderWidth: 1` trên controls, 100% icon button có `accessibilityLabel`, và TypeScript đạt mã thoát 0.

## Acceptance Criteria

### iOS HIG Compliance
- [ ] 100% các màn hình vượt qua kiểm tra biên dịch `npx tsc --noEmit` không lỗi.
- [ ] Không còn bất kỳ thành phần nào bị cấn vướng Safe Area (Notch / Dynamic Island / Home Gesture Bar).
- [ ] Toàn bộ các nút bấm chính và stepper có nhãn `accessibilityLabel` và phản hồi Haptics xúc giác.
- [ ] Script kiểm tra tự động chạy thành công và xuất báo cáo pass 100% cho 10 màn hình.
</USER_REQUEST>

## 2026-09-16T09:50:51Z

<USER_REQUEST>
This is a single self-contained fix; keep it small and focused.
Quét toàn bộ mã nguồn Frontend Expo SDK 52 và chuẩn hóa 100% các vùng hiển thị văn bản theo Quy Chuẩn Typography Apple HIG & Text System (San Francisco Scale) và Apple Touch Target 44x44pt.

Working directory: d:/duanpos-ongchu/frontend
Integrity mode: development

## Requirements

### R1. Triệt Tiêu Inline Font Overrides & Ép Chuẩn 7 Cấp AppText
- Rà soát toàn bộ các file `.tsx` trong `frontend/app` và `frontend/lib`.
- Xóa bỏ hoặc chuyển đổi các style `fontSize`, `lineHeight` inline gán trên `<AppText>` sang các variant chuẩn (`xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `display`).
- Đảm bảo 100% văn bản bọc trong `<AppText>` (không dùng thẻ `<Text>` nguyên bản của React Native).

### R2. De-bolding & Chuẩn Hóa Màu Mực Món Ăn / Giá Tiền
- Dữ liệu hóa đơn, bảng kê, phân tích tài chính, phụ đề: dùng `weight="normal"` (400).
- Tab/Chip đang active: dùng `weight="medium"` (500).
- CTA chính và tổng tiền chốt: dùng `weight="bold"` (600). Tuyệt đối không dùng `700` hoặc `800`.
- Tên món ăn và giá tiền niêm yết: dùng `variant="md"` với màu mực `theme.text.primary` (không dùng màu cam/đỏ/sặc sỡ cho giá niêm yết).

### R3. Tabular Nums Cho Số Liệu
- Toàn bộ số tiền (VND), số lượng, mã đơn, giờ phút phải có `tabularNums={true}` (hoặc kích hoạt qua cơ chế regex tự động của `AppText`).

### R4. Chuẩn Hóa Vùng Chạm Apple HIG Tối Thiểu 44 × 44pt
- Các nút bấm, icon thao tác, ô checkbox (Apple Circle Checklist 26pt) phải đảm bảo vùng chạm tối thiểu 44 × 44pt (dùng `minWidth: 44, minHeight: 44` hoặc `hitSlop`).

## Acceptance Criteria

### Typography & Structure Compliance
- [ ] Không còn inline `fontSize` hoặc `lineHeight` trên `<AppText>` trong `frontend/app` và `frontend/lib`.
- [ ] Không còn font weight `700`/`800` trên giao diện người dùng.
- [ ] Giá tiền và tên món dùng mực đen `theme.text.primary`.
- [ ] Bật `tabularNums` trên 100% số liệu tài chính, số lượng và mã đơn.
- [ ] Vùng chạm tương tác đạt tối thiểu 44 × 44pt.
- [ ] Lệnh kiểm tra TypeScript `npx tsc --noEmit` hoàn thành không có lỗi.

</USER_REQUEST>

## 2026-09-16T10:19:35Z

<USER_REQUEST>
Kiểm duyệt, rà soát và chuẩn hóa 100% các thành phần giao diện, màn hình và component trên frontend Expo SDK 52 của dự án `duanpos-ongchu`, xóa bỏ toàn bộ mã màu hardcode cũ (Slate, Jade, Orange), đồng bộ sang hệ thống token Indochine Heritage (Ngà Giấy Dó, Mực Gỗ Mun, Đồng Thau, Men Gốm, Xanh Lá Mộc, Đỏ Chu Sa), tuân thủ nghiêm ngặt Apple HIG và Typography 7 cấp.

Working directory: d:/duanpos-ongchu/frontend
Integrity mode: development

## Requirements

### R1. Triệt Tiêu Hardcode Màu Cũ & Áp Dụng Chuẩn Token Indochine
- Quét và thay thế toàn bộ mã hex cũ (`#0D9488`, `#F8FAFC`, `#FF6B00`, `#0F172A`, `#475569`, v.v.) trong `frontend/app/`, `frontend/lib/components/` sang token `useTheme()` tương ứng.
- Đảm bảo toàn bộ thẻ món ăn, bàn ăn, giỏ hàng, hóa đơn, sổ quỹ, giao ca, cài đặt, báo cáo và modal sử dụng đúng:
  - Nền Light Canvas: Ngà Giấy Dó `theme.surface.app` (`#F9F6F0`)
  - Chữ chính: Mực Gỗ Mun `theme.text.primary` (`#1C1917` Light / `#F5F5F4` Dark)
  - Phụ đề / Caption: Xám Đá Mộc `theme.text.muted` (`#57534E` Light / `#A8A29E` Dark)
  - Đường phân cách: Hairline `theme.border.subtle` (`#E7E5E4`)
  - Điểm nhấn / Active Tab / Badge: Vàng Đồng Thau `theme.brand.accent` (`#B45309`)
  - Nút Tính Tiền / Thanh Toán / Báo Xong: Xanh Lá Mộc `theme.brand.success` (`#15803D`)
  - Hủy món / Báo động: Đỏ Chu Sa `theme.brand.danger` (`#DC2626`)

### R2. Chuẩn Hóa Hệ Thống 2 Dãy Điều Hướng & Nút Bấm Apple HIG
- Dãy 1 (Underline Tab Cấp 1): Chiều cao 46px, gạch chân đáy 3px màu Vàng Đồng Thau `#B45309`, icon & chữ active màu Đồng Thau (`weight="medium"`), inactive chữ Đen Gỗ Mun `#1C1917`.
- Dãy 2 (Capsule Pills Cấp 2): Chiều cao 36px, `borderRadius: 18px`, active nền Đồng Thau `#B45309` chữ trắng `#FFFFFF`, inactive nền `#FFFFFF` viền hairline `#E7E5E4`.
- 100% nút bấm, switch, checkbox có vùng chạm tối thiểu `44 × 44pt` (`hitSlop` hoặc layout padding). Nút CTA đạt chiều cao 50-52pt.

### R3. Kiểm Duyệt Typography 7 Cấp & Tabular Nums
- 100% text render qua `<AppText>` với 7 cấp: `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `display`.
- De-bolding: 90% dùng `weight="normal"` (400) hoặc `weight="medium"` (500), trần `weight="bold"` (600).
- 100% số tiền, số lượng, thời gian, mã đơn bật `tabularNums={true}`.

### R4. Cập Nhật & Vượt Qua Toàn Bộ Bộ Test
- Cập nhật các tệp test (`tests/adversarial_theme_tokens.test.ts`, `tests/tier1_feature_coverage.test.ts`, `tests/adversarial_m2_stress.ts`) đồng bộ với các token Indochine mới.
- Chạy kiểm tra TypeScript và xác minh không có lỗi biên dịch.

## Acceptance Criteria

### Mã Nguồn & Token Colors
- [ ] Không còn bất kỳ mã màu Hex cũ nào ngoài Indochine Palette nằm ngoài `frontend/lib/theme/`.
- [ ] Tất cả 10 màn hình POS và Modal đều đọc màu động từ `useTheme()`.

### Điều Hướng & Typography
- [ ] Dãy Tab Cấp 1 và Chip Lọc Cấp 2 hiển thị đúng gạch chân và màu Vàng Đồng Thau `#B45309`.
- [ ] 100% số tiền, số lượng, mã đơn có `tabularNums={true}`.
- [ ] Nút CTA `Tính Tiền` / `Thanh Toán` có nền Xanh Lá Mộc `#15803D`, kích thước tối thiểu 44pt.

### Kiểm Thử & Ổn Định
- [ ] Bộ test `tests/adversarial_theme_tokens.test.ts` và `tests/tier1_feature_coverage.test.ts` vượt qua 100%.
</USER_REQUEST>

## 2026-09-17T08:44:44Z

<USER_REQUEST>
Kế hoạch nâng cấp & quy chuẩn hóa toàn bộ dự án OngChu Lean POS về cỡ chữ (Typography 7 cấp) và Bảng màu Dual-Theme (Anti-Glare Dark Mode & Indochine Light Mode) theo đúng chuẩn Apple Human Interface Guidelines (HIG) và công thái học F&B di động.

Working directory: d:/duanpos-ongchu
Integrity mode: development

## Requirements

### R1. Chuẩn Hóa Typography 7 Cấp Cân Bằng (Apple HIG)
- Đảm bảo 100% giao diện POS tuân thủ thang đo Typography 7 cấp (xxs, xs, sm, md, lg, xl, display), trong đó variant="md" (18px) gánh 85–90% nội dung POS.
- Tiêu đề chính màn hình (<AppHeader>) sử dụng variant="lg" (22px bold).
- 100% TextInput đạt fontSize >= 16px chống iOS WebKit auto-zoom.

### R2. Chuẩn Hóa Bảng Màu Dual-Theme Indochine & Anti-Glare
- Tối ưu hóa bảng màu Light Mode (Giấy Dó #F9F6F0, Gỗ Mun #1C1917, Đồng Thau Phin #B45309).
- Dark Mode Anti-Glare (Cà Phê #14110E, Gỗ Gụ #1E1813, Trắng Ngà #F3EFEA, Vàng Đồng Thau #B45309 chống lóa mắt).
- Triệt tiêu hoàn toàn màu Hex hardcode trong các file .tsx.

### R3. Đồng Nhất Luồng Thanh Toán Cam Hổ Phách Apple (Apple Warm Orange Action Thread)
- Đồng nhất 100% các nút hành động chốt thanh toán [Gọi Món -> Giỏ Hàng -> Nghiệp Vụ -> Xong & In Bill] dùng Cam Hổ Phách #B45309 (theme.brand.accent) với chữ trắng theme.text.onBrand.

### R4. Cập Nhật Tài Liệu Quy Chuẩn Design System
- Bổ sung các quy chuẩn nâng cấp về Typography và Bảng màu Apple HIG vào file AGENTS.md và GEMINI.md.

## Acceptance Criteria

### Verification & Quality Bar
- [ ] 100% file .tsx trong /frontend tuân thủ component <AppText> và token useTheme().
- [ ] Biên dịch TypeScript cd frontend && npx tsc --noEmit đạt 0 lỗi (0 type errors).
- [ ] Kiểm thử hiển thị trên thiết bị thật Android qua ADB MCP Server (901SO).
- [ ] Cập nhật đầy đủ thông số trong AGENTS.md và GEMINI.md.
</USER_REQUEST>

## 2026-09-17T21:10:49Z

<USER_REQUEST>
This is a single self-contained refactor; keep it small and focused.

Tối ưu hóa và tái cấu trúc toàn diện codebase dự án OngChu Lean POS (Frontend Expo SDK 52 và Backend Golang), loại bỏ mã nguồn trùng lặp, trích xuất module/hook/component dùng chung, dọn dẹp code chết và tinh gọn theo tiêu chuẩn Ponytail mà không làm thay đổi hành vi nghiệp vụ.

Working directory: d:/duanpos-ongchu
Integrity mode: development

## Requirements

### R1. Khử trùng lặp & trích xuất thành phần dùng chung (Deduplication & Shared Reuse)
- Nhận diện và trích xuất các đoạn mã, logic tính toán, formatters, hooks, API callers và UI components bị trùng lặp giữa các màn hình Frontend (`/frontend`) và handlers/services Backend (`/backend`) vào các module dùng chung duy nhất.
- Đảm bảo tuân thủ cấu trúc thư mục hiện có và quy chuẩn kiến trúc của dự án.

### R2. Dọn dẹp mã chết & cấu trúc dư thừa (Dead Code & Redundant Pruning)
- Quét và loại bỏ triệt để dead code, unused imports, styles dư thừa, types/interfaces không còn sử dụng.
- Tối giản hóa các đoạn code dài dòng không cần thiết theo nguyên tắc Ponytail (ưu tiên stdlib, native platform, code ngắn gọn rõ nghĩa).

### R3. Bảo toàn 100% tính năng & quy chuẩn giao diện (Zero Regression & Invariant Preservation)
- Tuyệt đối không làm thay đổi luồng nghiệp vụ, API contract, quy chuẩn thiết kế [AGENTS.md](file:///d:/duanpos-ongchu/AGENTS.md) (Design system Dual-Theme, Typography 7 cấp `<AppText>`, TabularNums, nút Cam Apple `#B45309`).
- Giữ nguyên các cơ chế an toàn tiền tệ, validation biên, và xử lý lỗi.

## Acceptance Criteria

### Verification & Build Integrity
- [ ] Frontend TypeScript kiểm tra type-checking không có lỗi: `cd frontend && npx tsc --noEmit` hoàn tất với mã thoát 0.
- [ ] Backend Golang biên dịch và kiểm thử thành công: `cd backend && go build ./...` và `go test ./...` hoàn tất không lỗi.
- [ ] Giảm rõ rệt số dòng code trùng lặp và kích thước file dư thừa.
- [ ] 100% API endpoints và các màn hình ứng dụng giữ nguyên tính năng và trải nghiệm người dùng.
</USER_REQUEST>

## 2026-09-18T07:28:45Z

<USER_REQUEST>
This is a single self-contained refactor; keep it small and focused.

Nghiên cứu, trích xuất và tích hợp trọn bộ 6 Shared UI Components cốt lõi vào thư mục `frontend/lib/components/ui/` nhằm triệt tiêu boilerplate lặp lại, tối đa hóa khả năng tái sử dụng mã nguồn và chuẩn hóa trải nghiệm POS F&B Vị Chủ Quán theo triết lý Ponytail và quy chuẩn [AGENTS.md](file:///d:/duanpos-ongchu/AGENTS.md).

Working directory: d:/duanpos-ongchu
Integrity mode: development

## Requirements

### R1. Trích xuất & xây dựng trọn bộ 6 Shared Components chuẩn hóa (`frontend/lib/components/ui/`)
1. **`Tier2FilterChips.tsx`**: Thanh lọc cấp 2 Capsule Pills (cao 36–40px, touch target >= 44pt, hairline border dưới, fill active `#1C1917` hoặc `#B45309`, tự động hiển thị count badge `tabularNums` và icon).
2. **`AppModal.tsx`**: Khung Modal Dialog / Sheet chuẩn Vị Chủ Quán (tự động xử lý backdrop tap dismiss, `maxHeight: '85-88%'`, `ScrollView flexShrink: 1`, `ModalDragIndicator`, Title + Close button, sticky footer CTA nút Cam Apple `#B45309`, an toàn `safeAreaInsets` và keyboard).
3. **`AppFormField.tsx`**: Trường Form nhập liệu chuẩn hóa (gồm nhãn `<AppText variant="md" weight="bold">`, `TextInput` có `fontSize >= 16px` chống iOS WebKit zoom, `includeFontPadding: false`, hỗ trợ icon, nút Clear, định dạng tiền tệ và dòng báo lỗi `variant="xs"`).
4. **`AppNumpad.tsx`**: Bàn phím số Numpad cảm ứng POS (bố cục 3x4 / 4x4, phím 1–9, 0, 000, Clear, Backspace, vùng chạm >= 52pt, hiển thị số `variant="display"` 28px `tabularNums`, tích hợp sẵn `playTapSound()` và `Haptics`).
5. **`StatusDotBadge.tsx`**: Huy hiệu & chấm tròn trạng thái đa năng (tự động ánh xạ màu nền và chữ theo token `theme.status.*` cho Đơn hàng, Bàn ăn, Kho hàng, Nhân sự, Doanh thu).
6. **`ReceiptLayout.tsx`**: Khung cấu trúc hóa đơn K80/K58 chuẩn in nhiệt và xem trước (Header quán, mã HD, bảng dòng hàng tabularNums, VAT/chiết khấu, tổng tiền to rõ, mã VietQR và footer cảm ơn/wifi).
7. Xuất khẩu toàn bộ 6 components tại [`frontend/lib/components/ui/index.ts`](file:///d:/duanpos-ongchu/frontend/lib/components/ui/index.ts).

### R2. Tích hợp & Refactor trên các màn hình tương ứng
- Thay thế các đoạn code trùng lặp, inline filter pills, custom modal containers, scattered form fields, numpads thủ công trên các màn hình chính (`thuc-don`, `kho-hang`, `quan-ly-ban`, `so-quy`, `khach-hang`, `giao-ca`, `thanh-toan`, `nhan-su`, `bao-cao-loi-nhuan`, `cai-dat`) bằng các shared components mới.

### R3. Bảo toàn 100% quy chuẩn AGENTS.md & Không hồi quy (Zero Regression)
- Tuân thủ nghiêm ngặt Design System Dual-Theme, Typography 7 cấp `<AppText>`, TabularNums 100%, nút Cam Apple `#B45309` (`theme.brand.accent`).
- Giữ nguyên toàn bộ logic nghiệp vụ, tính toán tài chính và luồng xử lý dữ liệu hiện có.

## Acceptance Criteria

### Verification & Build Integrity
- [ ] TypeScript typecheck hoàn tất không lỗi: `cd frontend && npx tsc --noEmit` thoát mã 0.
- [ ] Toàn bộ test suite tự động vượt qua 100%: `npx ts-node tests/run_all_tests.ts` đạt kết quả PASS toàn bộ 470+ tests.
- [ ] Trọn bộ 6 shared components được triển khai hoàn chỉnh, có tài liệu props rõ ràng và xuất khẩu qua `frontend/lib/components/ui/index.ts`.
- [ ] Giảm rõ rệt số dòng code trùng lặp và nâng cao tính đồng bộ giao diện trên toàn bộ ứng dụng.
</USER_REQUEST>


## 2026-09-21T19:04:07Z

This is a focused codebase task: Rà soát toàn diện toàn bộ mã nguồn Frontend (Expo SDK 57 / React Native) và Backend (Golang Gin / GORM) của hệ thống OngChu Lean POS tại working directory d:/duanpos-ongchu. Phát hiện, loại bỏ 100% dữ liệu cứng (mock data, sample seeds, hardcoded strings) và chuyển đổi hoàn toàn sang nạp động từ CSDL thật (PostgreSQL 16 / SQLite Sharding). Đảm bảo không còn bất kỳ mock constants nào che lấp dữ liệu thật của quán 0392387165 và tài khoản saas_admin nguyenlocthanh291097. Sau khi rà soát và sửa đổi xong, chạy python scripts/deploy_frontend.py để kiểm thử và deploy lên VPS.
