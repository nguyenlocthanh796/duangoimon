# Dispatch Log

## 2026-09-16T09:52:24Z
You are teamwork_preview_swe (SWE Light Orchestrator).

Working Directory: d:/duanpos-ongchu/.agents/swe_1
Workspace Directory: d:/duanpos-ongchu/frontend (Project Root: d:/duanpos-ongchu)
Original User Request: d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (see timestamp header ## 2026-09-16T09:50:51Z)

Task Description:
Quét toàn bộ mã nguồn Frontend Expo SDK 52 và chuẩn hóa 100% các vùng hiển thị văn bản theo Quy Chuẩn Typography Apple HIG & Text System (San Francisco Scale) và Apple Touch Target 44x44pt.

Key Requirements:
R1. Triệt Tiêu Inline Font Overrides & Ép Chuẩn 7 Cấp AppText
- Rà soát toàn bộ các file `.tsx` trong `frontend/app` và `frontend/lib`.
- Xóa bỏ hoặc chuyển đổi các style `fontSize`, `lineHeight` inline gán trên `<AppText>` sang các variant chuẩn (`xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `display`).
- Đảm bảo 100% văn bản bọc trong `<AppText>` (không dùng thẻ `<Text>` nguyên bản của React Native).

R2. De-bolding & Chuẩn Hóa Màu Mực Món Ăn / Giá Tiền
- Dữ liệu hóa đơn, bảng kê, phân tích tài chính, phụ đề: dùng `weight="normal"` (400).
- Tab/Chip đang active: dùng `weight="medium"` (500).
- CTA chính và tổng tiền chốt: dùng `weight="bold"` (600). Tuyệt đối không dùng `700` hoặc `800`.
- Tên món ăn và giá tiền niêm yết: dùng `variant="md"` với màu mực `theme.text.primary` (không dùng màu cam/đỏ/sặc sỡ cho giá niêm yết).

R3. Tabular Nums Cho Số Liệu
- Toàn bộ số tiền (VND), số lượng, mã đơn, giờ phút phải có `tabularNums={true}` (hoặc kích hoạt qua cơ chế regex tự động của `AppText`).

R4. Chuẩn Hóa Vùng Chạm Apple HIG Tối Thiểu 44 × 44pt
- Các nút bấm, icon thao tác, ô checkbox (Apple Circle Checklist 26pt) phải đảm bảo vùng chạm tối thiểu 44 × 44pt (dùng `minWidth: 44, minHeight: 44` hoặc `hitSlop`).

Acceptance Criteria:
- [ ] Không còn inline `fontSize` hoặc `lineHeight` trên `<AppText>` trong `frontend/app` và `frontend/lib`.
- [ ] Không còn font weight `700`/`800` trên giao diện người dùng.
- [ ] Giá tiền và tên món dùng mực đen `theme.text.primary`.
- [ ] Bật `tabularNums` trên 100% số liệu tài chính, số lượng và mã đơn.
- [ ] Vùng chạm tương tác đạt tối thiểu 44 × 44pt.
- [ ] Lệnh kiểm tra TypeScript `npx tsc --noEmit` hoàn thành không có lỗi.

Protocol:
- Execute the SWE Light loop: dispatch implementation to a teamwork_preview_implementer, then run reviewer rounds.
- Maintain progress.md and BRIEFING.md in your working directory d:/duanpos-ongchu/.agents/swe_1/.
- When all criteria are met and tests pass, submit your final completion report.
