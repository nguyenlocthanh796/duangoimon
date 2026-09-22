# Dispatch Log

## 2026-09-18T07:28:45Z
You are teamwork_preview_swe (SWE Light Orchestrator).

Working Directory: d:/duanpos-ongchu/.agents/swe_3
Workspace Directory: d:/duanpos-ongchu (Frontend: d:/duanpos-ongchu/frontend)
Original User Request: d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (see timestamp header ## 2026-09-18T07:28:45Z)

Task Description:
Nghiên cứu, trích xuất và tích hợp trọn bộ 6 Shared UI Components cốt lõi vào thư mục `frontend/lib/components/ui/` nhằm triệt tiêu boilerplate lặp lại, tối đa hóa khả năng tái sử dụng mã nguồn và chuẩn hóa trải nghiệm POS F&B Vị Chủ Quán theo triết lý Ponytail và quy chuẩn AGENTS.md.

Key Requirements:
R1. Trích xuất & xây dựng trọn bộ 6 Shared Components chuẩn hóa (`frontend/lib/components/ui/`)
1. Tier2FilterChips.tsx: Thanh lọc cấp 2 Capsule Pills (cao 36–40px, touch target >= 44pt, hairline border dưới, fill active #1C1917 hoặc #B45309, tự động hiển thị count badge tabularNums và icon).
2. AppModal.tsx: Khung Modal Dialog / Sheet chuẩn Vị Chủ Quán (tự động xử lý backdrop tap dismiss, maxHeight: '85-88%', ScrollView flexShrink: 1, ModalDragIndicator, Title + Close button, sticky footer CTA nút Cam Apple #B45309, an toàn safeAreaInsets và keyboard).
3. AppFormField.tsx: Trường Form nhập liệu chuẩn hóa (gồm nhãn <AppText variant="md" weight="bold">, TextInput có fontSize >= 16px chống iOS WebKit zoom, includeFontPadding: false, hỗ trợ icon, nút Clear, định dạng tiền tệ và dòng báo lỗi variant="xs").
4. AppNumpad.tsx: Bàn phím số Numpad cảm ứng POS (bố cục 3x4 / 4x4, phím 1–9, 0, 000, Clear, Backspace, vùng chạm >= 52pt, hiển thị số variant="display" 28px tabularNums, tích hợp sẵn playTapSound() và Haptics).
5. StatusDotBadge.tsx: Huy hiệu & chấm tròn trạng thái đa năng (tự động ánh xạ màu nền và chữ theo token theme.status.* cho Đơn hàng, Bàn ăn, Kho hàng, Nhân sự, Doanh thu).
6. ReceiptLayout.tsx: Khung cấu trúc hóa đơn K80/K58 chuẩn in nhiệt và xem trước (Header quán, mã HD, bảng dòng hàng tabularNums, VAT/chiết khấu, tổng tiền to rõ, mã VietQR và footer cảm ơn/wifi).
7. Xuất khẩu toàn bộ 6 components tại `frontend/lib/components/ui/index.ts`.

R2. Tích hợp & Refactor trên các màn hình tương ứng
- Thay thế các đoạn code trùng lặp, inline filter pills, custom modal containers, scattered form fields, numpads thủ công trên các màn hình chính (`thuc-don`, `kho-hang`, `quan-ly-ban`, `so-quy`, `khach-hang`, `giao-ca`, `thanh-toan`, `nhan-su`, `bao-cao-loi-nhuan`, `cai-dat`) bằng các shared components mới.

R3. Bảo toàn 100% quy chuẩn AGENTS.md & Không hồi quy (Zero Regression)
- Tuân thủ nghiêm ngặt Design System Dual-Theme, Typography 7 cấp <AppText>, TabularNums 100%, nút Cam Apple #B45309 (theme.brand.accent).
- Giữ nguyên toàn bộ logic nghiệp vụ, tính toán tài chính và luồng xử lý dữ liệu hiện có.

Acceptance Criteria:
- [ ] TypeScript typecheck hoàn tất không lỗi: `cd frontend && npx tsc --noEmit` thoát mã 0.
- [ ] Toàn bộ test suite tự động vượt qua 100%: `npx ts-node tests/run_all_tests.ts` đạt kết quả PASS toàn bộ 470+ tests.
- [ ] Trọn bộ 6 shared components được triển khai hoàn chỉnh, có tài liệu props rõ ràng và xuất khẩu qua `frontend/lib/components/ui/index.ts`.
- [ ] Giảm rõ rệt số dòng code trùng lặp và nâng cao tính đồng bộ giao diện trên toàn bộ ứng dụng.

Protocol:
- Execute the SWE Light loop: dispatch implementation to a teamwork_preview_implementer, then run reviewer rounds.
- Maintain progress.md and BRIEFING.md in your working directory d:/duanpos-ongchu/.agents/swe_3/.
- When all criteria are met and tests pass, submit your final completion report.
