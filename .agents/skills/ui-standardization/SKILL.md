---
name: ui-standardization
description: Skill dùng để kiểm tra, đánh giá và chuẩn hóa giao diện UI của bất kỳ màn hình nào theo chuẩn Edge-to-edge Flat Design, Minimalist Typography và Bright Theme.
---

# Kỹ năng Chuẩn hóa Giao diện (UI Standardization Skill)

Kỹ năng này cung cấp bộ quy tắc tuyệt đối để thiết kế và refactor UI trong dự án POSA. Bất cứ khi nào bạn được yêu cầu "chuẩn hóa giao diện" (standardize UI), hãy áp dụng nghiêm ngặt 3 triết lý dưới đây cho mọi component và screen (cả Mobile lẫn iPad).

## 1. Triết lý Bố cục (Flat Design & Edge-to-edge)

Giao diện phải hoàn toàn phẳng, rộng rãi và không có các khối hộp lềnh bềnh.

- **Edge-to-edge (Tận dụng không gian tuyệt đối):** Toàn bộ cấu trúc màn hình phải kéo dài chạm mép màn hình (chiếm 100% width) trên mọi thiết bị (đặc biệt là iPad/Desktop). TUYỆT ĐỐI KHÔNG dùng thuộc tính `maxWidth` (như `maxWidth: 1100`) để giới hạn nội dung ở giữa màn hình. CẤM TUYỆT ĐỐI sử dụng `marginHorizontal` hoặc padding trái/phải khổng lồ trên thẻ bọc ngoài (Container/Wrapper/ScrollView) làm hụt viền. Các khối dữ liệu phải dàn đều để tận dụng tối đa không gian màn hình lớn như thiết kế của trang Dashboard.
- **Lề nội dung (Inner Padding):** Tuy khung ngoài bám sát mép (Edge-to-edge), NHƯNG nội dung văn bản/icon bên trong các Section/Header TUYỆT ĐỐI KHÔNG được dính sát mép màn hình. Phải luôn có `paddingHorizontal: 12` (trên iPhone) hoặc `16` (trên iPad) ở các nội dung bên trong để tạo sự chuyên nghiệp.
- **Xóa bỏ Bo góc & Đổ bóng:** Tuyệt đối KHÔNG dùng `borderRadius`, KHÔNG dùng `boxShadow`, KHÔNG dùng `elevation` trên các khối dữ liệu chính (`borderRadius: 0`, `boxShadow: 'none'`).
- **Phân cách bằng viền 1px:** Dùng viền siêu mỏng trên và dưới (`borderTopWidth: 1`, `borderBottomWidth: 1`) với màu `colors.border.default` để ngăn cách các section. Không dùng viền trái/phải (`borderLeftWidth: 0`, `borderRightWidth: 0`).
- **Khoảng cách (Gap & Padding):** Giữ gap giữa các section/khối là `8px`. Padding tiêu chuẩn bên trong khối là `12px` (tránh dùng 6px quá chật chội).
- **Nút bấm & Điều hướng (Buttons, Tabs, Filters):** TẤT CẢ các thành phần có thể tương tác (Nút CTA "Lưu/Bán hàng", Thẻ Tab ngang "Điều hành/Báo cáo", Nút bộ lọc "Chi nhánh/7 ngày", Nút Icon) đều phải bo góc nhẹ với `borderRadius: 8` (vuông vức, nam tính). Cấm tuyệt đối dạng viên thuốc tròn xoe (`16px`, `99px`) và không được gọt phẳng lỳ (`0px`).
  - Kích thước chuẩn của các Tab/Nút chức năng ngang: `height: 36px`, `paddingHorizontal: 16px`, `gap: 6px` và chữ bên trong là cỡ `16px` (hoặc variant `medium`). Không được làm nhỏ hơn mức này để bảo đảm vùng bấm chuẩn trên cảm ứng.
- **Thẻ dữ liệu & Phần tử lưới (Data Cards / Grid Items):** Chỉ các khối chứa nội dung hiển thị (như `ProductCard`, `TableCard`, Bảng dữ liệu, Panel thống kê) mới áp dụng bề mặt phẳng tuyệt đối `borderRadius: 0` để trải dài hết các cạnh.
- **Dữ liệu liền mạch (Seamless Data):** TRÁNH dùng màu nền (background) đóng khung dạng thẻ (badge) cho các con số, số lượng bên trong Bảng dữ liệu hoặc danh sách. Thay vào đó, hãy để số đứng trơn và chỉ đổi màu chữ (VD: xanh, cam) để giao diện luôn liền mạch, không bị lổn nhổn khối hộp.

## 2. Triết lý Typography (Quy tắc 4 Cỡ Chữ)

**CẤM TUYỆT ĐỐI** việc sử dụng thẻ `<Text>` nguyên bản của React Native. Mọi văn bản phải được bọc trong component `<AppText>` (từ `lib/components/ui/AppText.tsx`). Hệ thống tự động scale `1.25x` trên iPad.

Chỉ được dùng thuộc tính `variant` để thay đổi kích thước chữ (không dùng `font.*` trực tiếp trong style):
1. **Small (12px):** `font.caption`, `font.micro`, `font.badge`, `font.tableHeader` -> Dành cho nhãn phụ, % tăng giảm, tiêu đề cột bảng.
2. **Base (14px):** `font.bodySmall`, `font.tableCell` -> Dành cho dữ liệu bảng, text bình thường, mô tả.
3. **Medium (16px):** `font.body`, `font.bodyBold`, `font.button` -> Dành cho nút bấm (CTA), tiêu đề phụ, và các con số thống kê (Stats Bar) ngang trên di động.
4. **Large (20px):** `font.sectionTitle`, `font.pageTitle`, `font.statNumber` -> Dành cho tiêu đề trang, KPI độc lập cực lớn. TUYỆT ĐỐI KHÔNG dùng cỡ Large cho các con số thống kê nằm sát nhau trên thanh ngang (Stats Bar 3 cột) để tránh rớt dòng hoặc tràn viền (overflow).

**Nguyên tắc Phân cấp Tiêu đề (Title Hierarchy):**
- **Tiêu đề Section chính:** Luôn dùng `<AppText variant="large" weight="bold">`.
- **Tiêu đề Khối/Bảng con (Sub-block):** Bắt buộc dùng `<AppText variant="medium" weight="bold">` (16px). Tuyệt đối KHÔNG gán `variant="small"` cho tiêu đề khối/bảng gây mất phân cấp.
- **Liên kết phụ ("Xem tất cả", v.v.):** Dùng `<AppText variant="small" color={colors.text.muted}>` (12px) để các nút này chìm nhẹ xuống dưới nền, không tranh giành sự chú ý với tiêu đề.

## 3. Triết lý Màu sắc (Bright & Clear Theme)

Môi trường xung quanh phải cực kỳ lạnh, sáng và trong suốt để tôn vinh màu Cam chủ đạo.

- **Nền ứng dụng:** Luôn dùng `colors.surface.app` (`#F8FAFC` - Xám ánh kim/Băng).
- **Nền thẻ/khối:** Dùng `colors.surface.card` (`#FFFFFF` - Trắng tinh khiết).
- **Viền phân cách:** Dùng `colors.border.default` (`#E2E8F0`).
- **Chữ chính:** Dùng `colors.text.primary` (`#0F172A` - Đen ngả xanh lạnh).
- **Chữ phụ:** Dùng `colors.text.muted` (`#64748B`).
- **Màu nhấn (Accent):** Màu Cam (`colors.brand.primary` / `#F97316`) là vị vua của giao diện. Chỉ dùng cam cho các thành phần mang tính kêu gọi hành động (CTA), trạng thái đang hoạt động (Active), hoặc biểu đồ doanh thu.

## 4. Triết lý Đa Nền Tảng (Responsive: iPhone & iPad)

Giao diện phải tự thích ứng thông minh thông qua hook `useResponsive` (`isWide`, `columns`).

- **iPhone (Mobile):** Ưu tiên xếp dọc (Vertical Stack). Các lưới KPI (StatCell) nên xếp 2 cột trên 1 hàng (`width: 50%` hoặc `flex: 1` trong row). Inner padding tiêu chuẩn là `12px`.
- **iPad / Desktop (Wide):** Tận dụng không gian ngang.
  - Chuyển các khối dọc thành xếp ngang (`flexDirection: 'row'`).
  - Lưới KPI nên dàn thành 4 cột (hoặc 3 cột) trên 1 hàng để tối ưu chiều rộng.
  - Các module / card nghiệp vụ dùng hàm `columns(180)` để tự động tính số lượng cột lưới.
- **Nhất quán kiến trúc:** Tuyệt đối KHÔNG thiết kế rẽ nhánh 2 giao diện khác hẳn nhau (VD: Mobile thì phẳng Edge-to-edge, còn iPad thì lại bọc trong Card/Box bị giới hạn width). Cả hai nền tảng đều phải tuân thủ tuyệt đối Edge-to-edge Flat Design, chỉ thay đổi luồng chảy (flow) và số cột (columns).

## 5. Quy trình Thực thi Chuẩn hóa (Standardization Pipeline)

Khi nhận yêu cầu chuẩn hóa một màn hình hoặc module, các Agent BẮT BUỘC thực hiện theo quy trình 4 bước sau để đảm bảo tốc độ và sự đồng nhất:

**Bước 1: Khảo sát và Phân tích Code (Read & Analyze)**
- Dùng công cụ `view_file` đọc toàn bộ source code của màn hình/module mục tiêu.
- Phân tích cấu trúc hiện tại: Thẻ bọc ngoài là gì? Component hiển thị số liệu đang viết tay hay dùng component chung? Có rẽ nhánh layout Mobile/iPad sai quy tắc không?

**Bước 2: Ánh xạ Thành phần Tiêu chuẩn (Component Mapping)**
- **Wrapper:** Ánh xạ thẻ `<View>`/`<ScrollView>` ngoài cùng thành `<SafeAreaView style={{ flex: 1, backgroundColor: colors.surface.app }}>`.
- **Header:** Đổi tiêu đề màn hình thành `<UnifiedHeader icon="..." title="..." />`.
- **Section Title:** Đổi các đoạn text làm tiêu đề mục thành `<SectionHeader icon="..." title="..." />`.
- **KPI / Thống kê:** Đổi các khối số liệu rời rạc thành component chuẩn như `<StatCell>` (icon bg vuông + value to) hoặc `<StatCard>`.
- **Văn bản:** Ánh xạ toàn bộ `<Text>` thành `<AppText variant="...">` chuẩn 4 cỡ chữ.

**Bước 3: Dọn dẹp Style & Tái cấu trúc (Refactor & Cleanup)**
- Xóa sổ `maxWidth` và các `marginHorizontal`/`paddingHorizontal` ở thẻ bọc ngoài (Wrapper) gây hụt viền.
- Đặt nền các khối dữ liệu (Card/Block) thành `backgroundColor: '#FFFFFF'` (Trắng tinh khiết).
- Gỡ bỏ hoàn toàn `borderRadius`, `boxShadow`, `elevation` trên các khối dữ liệu để tạo bề mặt phẳng (Flat).
- Bổ sung `paddingHorizontal: 12` (iPhone) hoặc `16` (iPad) CHO CÁC VIEW BÊN TRONG khối để văn bản/icon không dính mép.
- Thay thế toàn bộ mã màu hardcode (`#F0F0F0`, `#171717`, v.v.) bằng token hệ thống (`colors.border.default`, `colors.text.primary`).

**Bước 4: Kiểm tra Đa nền tảng & Lỗi (Verify)**
- Điều chỉnh Responsive: Dùng `isWide` để đổi luồng xếp dọc thành ngang (`flexDirection: 'row'`). Đảm bảo không rẽ nhánh ra 2 phong cách UI khác biệt.
- Chạy terminal `npx tsc --noEmit` để đảm bảo không vỡ Type.
- (Tùy chọn) Mở Playwright kiểm tra trực quan trên cả Viewport iPhone và iPad để xác nhận UI bám biên (Edge-to-edge), phẳng và chữ không dính mép.

## 6. Tiêu chuẩn Hiển thị Dữ liệu (Professional Data UI)

Giao diện dữ liệu trong phần mềm B2B/Enterprise cần ưu tiên hiệu suất đọc (Cognitive Load Reduction) và Mật độ dữ liệu (Data Density).

- **Bảng Dữ liệu (Enterprise DataTable) cho màn hình lớn:**
  - Bỏ viền dọc (Vertical borders) và viền ngoài cùng. Chỉ dùng viền ngang mảnh (hairline 1px, `colors.border.default`) để ngăn cách hàng.
  - Header bảng không có nền khác biệt (dùng `#FFFFFF`), font chữ in hoa, `variant="small"`, `colors.text.muted`, `weight="bold"`.
  - Tiền tệ/Số liệu luôn căn phải (Right-aligned). Mã/Tên luôn căn trái (Left-aligned).
  - Tích hợp Hover/Press state: Đổi màu nền siêu nhạt (VD: `#F9FAFB`) khi chọn hàng.

- **Danh sách (Continuous List / RowCard) cho iPhone:**
  - Không sử dụng thẻ (Card) nổi khối độc lập. Các dòng xếp nối tiếp nhau tràn viền ngang (Edge-to-edge), ngăn cách bởi 1 viền mỏng (`borderBottomWidth: 1`).
  - **Tối ưu không gian (Compact):** Giảm `paddingVertical` của mỗi dòng xuống `8px` để hiển thị được nhiều dữ liệu hơn mà vẫn giữ được cảm giác phân tách.
  - **Khoảng cách linh kiện (Tight Spacing):** Ép sát các thành phần phụ (như ô tick chọn, icon định danh) lại với nhau. Khoảng cách (margin/gap) từ icon đến text tiêu đề chỉ nên ở mức `6px` - `8px` để tạo thành một khối liền mạch.
  - **Không in đậm bừa bãi:** Tuyệt đối KHÔNG in đậm (`fontWeight: '600'`) tiêu đề hoặc phụ đề của các dòng giao dịch. Chỉ in đậm những số liệu quan trọng (như Tổng tiền, KPI) để tránh làm màn hình trở nên "nặng nề" khi có nhiều dữ liệu.
  - Sử dụng cử chỉ Vuốt (Swipe Actions) thay vì nhồi nhét nút bấm Sửa/Xóa.

- **Thanh Segmented Control (Bộ lọc ngang):**
  - Khi có các nút lọc ít lựa chọn (VD: Tất cả / Thu / Chi), hãy dùng thuộc tính `flex: 1` cho mỗi nút để chúng tự động kéo giãn và chia đều khoảng trống, lấp đầy 100% bề ngang màn hình một cách vuông vức, ăn khớp.

- **Lưới Thống kê KPI (StatCell / StatCard):**
  - **Liền mạch hoàn toàn (Seamless):** Tuyệt đối KHÔNG bọc khung viền (`borderRightWidth: 1`, `borderBottomWidth: 1`) cho các ô bên trong lưới KPI. Để các ô KPI đứng trơn tự nhiên trong `ResponsiveGrid`.
  - **Khoảng cách Icon:** Cự ly (`gap`) giữa Icon và con số bên trong khối thống kê chỉ ở mức `8px`.
  - **Chống tràn chữ:** Các con số lớn (VD: Doanh thu, Lợi nhuận) bên trong Lưới KPI BẮT BUỘC dùng cỡ chữ `Medium (16px)`, CẤM dùng cỡ `Large (20px)` để tránh rớt dòng (overflow).

- **Trạng thái Trống (Empty State):**
  - Không để chữ "Không có dữ liệu" trơn. Bắt buộc có Icon nhạt màu, phụ đề hướng dẫn và 1 nút Call-to-action (CTA).
