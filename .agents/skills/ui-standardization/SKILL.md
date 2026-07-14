---
name: ui-standardization
description: Skill dùng để kiểm tra, đánh giá và chuẩn hóa giao diện UI của bất kỳ màn hình nào theo chuẩn Edge-to-edge Flat Design, Minimalist Typography và Bright Theme.
---

# Kỹ năng Chuẩn hóa Giao diện (UI Standardization Skill)

Kỹ năng này cung cấp bộ quy tắc tuyệt đối để thiết kế và refactor UI trong dự án POSA. Bất cứ khi nào bạn được yêu cầu "chuẩn hóa giao diện" (standardize UI), hãy áp dụng nghiêm ngặt 3 triết lý dưới đây cho mọi component và screen (cả Mobile lẫn iPad).

## 1. Triết lý Bố cục (Flat Design & Edge-to-edge)

Giao diện phải hoàn toàn phẳng, rộng rãi và không có các khối hộp lềnh bềnh.

- **Edge-to-edge:** Các container chứa dữ liệu (danh sách, biểu đồ, thẻ thống kê) phải kéo dài chạm mép màn hình. Sử dụng `paddingHorizontal: 0` cho thẻ bọc ngoài.
- **Xóa bỏ Bo góc & Đổ bóng:** Tuyệt đối KHÔNG dùng `borderRadius`, KHÔNG dùng `boxShadow`, KHÔNG dùng `elevation` trên các khối dữ liệu chính (`borderRadius: 0`, `boxShadow: 'none'`).
- **Phân cách bằng viền 1px:** Dùng viền siêu mỏng trên và dưới (`borderTopWidth: 1`, `borderBottomWidth: 1`) với màu `colors.border.default` để ngăn cách các section. Không dùng viền trái/phải (`borderLeftWidth: 0`, `borderRightWidth: 0`).
- **Khoảng cách (Gap):** Giữ gap giữa các khối là `8px`. Nội dung bên trong khối dùng `padding: 6px` để tối ưu diện tích.
- **Nút bấm hành động (CTA):** Các nút bấm chính như "Bán hàng", "Thanh toán", "Lưu" phải có hình viên thuốc (Pill shape) với `borderRadius: 99` (hoặc 99px).

## 2. Triết lý Typography (Quy tắc 4 Cỡ Chữ)

Nghiêm cấm việc hardcode `fontSize`. Mọi text phải dùng token từ `lib/theme/typography.ts`. Hệ thống đã được thiết lập để tự động scale `1.25x` trên iPad.

Chỉ được dùng 4 cấp độ cỡ chữ:
1. **Small (12px):** `font.caption`, `font.micro`, `font.badge`, `font.tableHeader` -> Dành cho nhãn phụ, % tăng giảm, tiêu đề cột bảng.
2. **Base (14px):** `font.bodySmall`, `font.tableCell` -> Dành cho dữ liệu bảng, text bình thường, mô tả.
3. **Medium (16px):** `font.body`, `font.bodyBold`, `font.button` -> Dành cho nút bấm (CTA), tiêu đề phụ.
4. **Large (20px):** `font.sectionTitle`, `font.pageTitle`, `font.statNumber` -> Dành cho tiêu đề trang, con số tổng doanh thu, KPI cực lớn.

## 3. Triết lý Màu sắc (Bright & Clear Theme)

Môi trường xung quanh phải cực kỳ lạnh, sáng và trong suốt để tôn vinh màu Cam chủ đạo.

- **Nền ứng dụng:** Luôn dùng `colors.surface.app` (`#F8FAFC` - Xám ánh kim/Băng).
- **Nền thẻ/khối:** Dùng `colors.surface.card` (`#FFFFFF` - Trắng tinh khiết).
- **Viền phân cách:** Dùng `colors.border.default` (`#E2E8F0`).
- **Chữ chính:** Dùng `colors.text.primary` (`#0F172A` - Đen ngả xanh lạnh).
- **Chữ phụ:** Dùng `colors.text.muted` (`#64748B`).
- **Màu nhấn (Accent):** Màu Cam (`colors.brand.primary` / `#F97316`) là vị vua của giao diện. Chỉ dùng cam cho các thành phần mang tính kêu gọi hành động (CTA), trạng thái đang hoạt động (Active), hoặc biểu đồ doanh thu.

## Hướng dẫn thực thi (Execution Guide)
Khi chạy skill này trên một file code UI:
1. Đọc lướt (scan) file code để tìm các mã màu hardcode (như `#FAFAFA`, `#F0F0F0`, `#000000`). Thay thế bằng `colors.surface.app`, `colors.border.default`, v.v.
2. Tìm các giá trị `fontSize: xx` bị hardcode. Thay thế bằng token `font.*` tương ứng.
3. Tìm các container có `borderRadius: 12`, `boxShadow` và xóa bỏ chúng, thay bằng `borderTopWidth: 1`, `borderBottomWidth: 1`.
4. Tìm các thẻ bọc ngoài (Wrapper/ScrollView) và set `paddingHorizontal: 0`.
5. Đảm bảo UI thống nhất trên cả Mobile và iPad (không rẽ nhánh layout thành Card Design khi `isWide` là true).
