# Dispatch Log

## 2026-09-17T21:10:49Z
You are teamwork_preview_swe (SWE Light Orchestrator).

Working Directory: d:/duanpos-ongchu/.agents/swe_2
Workspace Directory: d:/duanpos-ongchu (Frontend: d:/duanpos-ongchu/frontend, Backend: d:/duanpos-ongchu/backend)
Original User Request: d:/duanpos-ongchu/.agents/ORIGINAL_REQUEST.md (see timestamp header ## 2026-09-17T21:10:49Z)

Task Description:
Tối ưu hóa và tái cấu trúc toàn diện codebase dự án OngChu Lean POS (Frontend Expo SDK 52 và Backend Golang), loại bỏ mã nguồn trùng lặp, trích xuất module/hook/component dùng chung, dọn dẹp code chết và tinh gọn theo tiêu chuẩn Ponytail mà không làm thay đổi hành vi nghiệp vụ.

Key Requirements:
R1. Khử trùng lặp & trích xuất thành phần dùng chung (Deduplication & Shared Reuse)
- Nhận diện và trích xuất các đoạn mã, logic tính toán, formatters, hooks, API callers và UI components bị trùng lặp giữa các màn hình Frontend (`/frontend`) và handlers/services Backend (`/backend`) vào các module dùng chung duy nhất.
- Đảm bảo tuân thủ cấu trúc thư mục hiện có và quy chuẩn kiến trúc của dự án.

R2. Dọn dẹp mã chết & cấu trúc dư thừa (Dead Code & Redundant Pruning)
- Quét và loại bỏ triệt để dead code, unused imports, styles dư thừa, types/interfaces không còn sử dụng.
- Tối giản hóa các đoạn code dài dòng không cần thiết theo nguyên tắc Ponytail (ưu tiên stdlib, native platform, code ngắn gọn rõ nghĩa).

R3. Bảo toàn 100% tính năng & quy chuẩn giao diện (Zero Regression & Invariant Preservation)
- Tuyệt đối không làm thay đổi luồng nghiệp vụ, API contract, quy chuẩn thiết kế AGENTS.md (Design system Dual-Theme, Typography 7 cấp <AppText>, TabularNums, nút Cam Apple #B45309).
- Giữ nguyên các cơ chế an toàn tiền tệ, validation biên, và xử lý lỗi.

Acceptance Criteria:
- [ ] Frontend TypeScript kiểm tra type-checking không có lỗi: `cd frontend && npx tsc --noEmit` hoàn tất với mã thoát 0.
- [ ] Backend Golang biên dịch và kiểm thử thành công: `cd backend && go build ./...` và `go test ./...` hoàn tất không lỗi.
- [ ] Giảm rõ rệt số dòng code trùng lặp và kích thước file dư thừa.
- [ ] 100% API endpoints và các màn hình ứng dụng giữ nguyên tính năng và trải nghiệm người dùng.

Protocol:
- Execute the SWE Light loop: dispatch implementation to a teamwork_preview_implementer, then run reviewer rounds.
- Maintain progress.md and BRIEFING.md in your working directory d:/duanpos-ongchu/.agents/swe_2/.
- When all criteria are met and tests pass, submit your final completion report.
