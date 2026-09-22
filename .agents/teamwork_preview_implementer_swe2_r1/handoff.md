# 👑 BÁO CÁO BÀN GIAO: TỐI ƯU HÓA & TÁI CẤU TRÚC CODEBASE ONGCHU LEAN POS
**Agent:** teamwork_preview_implementer_swe2_r1  
**Parent Agent:** fafd018d-1f2e-49aa-b809-7b7378d53f9a  
**Workspace:** `d:/duanpos-ongchu` (Frontend: `frontend`, Backend: `backend`)  
**Quy chuẩn áp dụng:** AGENTS.md, GEMINI.md, Ponytail Full (YAGNI, Stdlib, Minimal Diff, Zero-Duplication, Zero-Regression)

---

## 1. TỔNG QUAN CÔNG VIỆC THỰC HIỆN

Thực hiện tái cấu trúc và dọn dẹp mã nguồn toàn diện cho cả Backend Golang và Frontend Expo SDK 52 nhằm triệt tiêu mã nguồn trùng lặp, chuẩn hóa module dùng chung, khắc phục khiếm khuyết cấu hình SQLite, dọn dẹp code chết và đưa giao diện về 100% chuẩn Theme Tokens / AGENTS.md mà không làm thay đổi bất kỳ hành vi nghiệp vụ nào.

---

## 2. CHI TIẾT CÁC THAY ĐỔI ĐÃ TRIỂN KHAI

### 2.1. Backend Golang (Gin + GORM + SQLite/PostgreSQL)
1. **Trích xuất Module Dùng Chung (`backend/internal/handler/common.go`)**:
   - `GetTenantID(c *gin.Context) string`: Trích xuất định danh tenant đồng nhất từ Gin Context (hỗ trợ JWT claim `tenant_id`, Header `X-Tenant-ID`, hoặc fallback `default`).
   - `ScopeTenant(db *gorm.DB, c *gin.Context) *gorm.DB`: Scoping tự động đa khách thuê (Multi-tenant isolation) cho mọi query GORM.
   - `RespondError(c *gin.Context, code int, msg string)` & `RespondSuccess(c *gin.Context, code int, data interface{})`: Chuẩn hóa response envelope JSON, loại bỏ hàng chục đoạn mã `c.JSON(...)` thủ công lặp lại.
2. **Sửa Lỗi Cấu Hình SQLite WAL & Concurrency (`backend/internal/database/database.go`)**:
   - Khắc phục lỗi nhánh PRAGMA và connection pool bị lồng nhầm trong điều kiện `if isPostgres`. Phân nhánh `else` chính xác để khi chạy SQLite kích hoạt đầy đủ:
     - `PRAGMA journal_mode = WAL;`
     - `PRAGMA busy_timeout = 5000;`
     - `PRAGMA synchronous = NORMAL;`
     - `PRAGMA foreign_keys = ON;`
     - Pool 1 open connection cho file SQLite để tránh SQLITE_BUSY locking trên Windows.
3. **Tái Cấu Trúc Handlers GORM**:
   - Refactor các handlers: `menu.go` (`GetCategories`, `GetProducts`, `GetToppings`), `tables.go` (`GetTables`, `GetAreas`), `inventory.go` (`GetIngredients`), `order.go` (`GetOrders`), `staff.go` (`GetStaff`) sang sử dụng `GetTenantID`, `ScopeTenant`, và `RespondError/RespondSuccess`.

### 2.2. Frontend Expo SDK 52 (React Native 0.76.6 + Zustand)
1. **Xây Dựng Component Dùng Chung `Tier1Tabs` (`frontend/lib/components/ui/Tier1Tabs.tsx`)**:
   - Tạo component chuẩn AGENTS.md cho Tab Cấp 1 (Underline Tabs 46px, active borderBottom 3px `theme.brand.accent`, text `md` 18px bold, inactive medium, tích hợp `playTapSound()` và `expo-haptics`).
   - Thay thế hơn 500 dòng mã boilerplate và StyleSheet trùng lặp trên 7 màn hình trọng yếu:
     - `frontend/app/nhan-su/index.tsx`
     - `frontend/app/thuc-don/index.tsx`
     - `frontend/app/bao-cao-loi-nhuan/index.tsx`
     - `frontend/app/kho-hang/index.tsx`
     - `frontend/app/cai-dat/index.tsx`
     - `frontend/app/giao-ca/index.tsx`
     - `frontend/app/so-quy/index.tsx`
2. **Tạo Component Dùng Chung `EmptyState` (`frontend/lib/components/ui/EmptyState.tsx`)**:
   - Chuẩn hóa giao diện hiển thị danh sách rỗng (Icon + Title + Subtitle + Action CTA tùy chọn), tích hợp dual-theme.
3. **Mở Rộng và Tập Trung Hóa Utils (`frontend/lib/utils/`)**:
   - `frontend/lib/utils/format.ts`: Bổ sung `formatDate(dateStr, formatStr)`, `formatDateTime(dateStr)`, `parseCurrency(val)`.
   - `frontend/lib/utils/index.ts`: Tạo barrel export tập trung cho toàn bộ utils (`format`, `haptics`, `sound`, `cashPresets`, `vietnameseSearch`, `cartAlgorithms`, `reportCalculations`).
4. **Chuẩn Hóa Domain Client API (`frontend/lib/api/apiClient.ts`)**:
   - Thêm `payOrder` và `getCustomerByPhone` vào `apiClient`.
   - Thay thế các lời gọi `fetch()` trực tiếp rải rác trong `frontend/app/thanh-toan/index.tsx` sang sử dụng `apiClient` tập trung.
5. **Dọn Dẹp Triệt Để Hardcoded Hex Colors Sang Theme Tokens**:
   - Khắc phục các mã màu hex còn sót lại tại `frontend/app/so-quy/index.tsx`, `frontend/app/so-quy/_components/QuickCashFormContent.tsx`, và `frontend/app/khach-hang/components/` sang `theme.status.dangerBg`, `theme.brand.cyan`, `theme.text.onBrand`.
   - Đưa bộ kiểm thử nghiêm ngặt `adversarial_theme_tokens.test.ts` đạt trạng thái hoàn hảo 121/121 checks PASS (0 fail).

---

## 3. HỒ SƠ KIỂM CHỨNG THỰC TẾ (VERIFICATION RECORD)

| Hạng mục kiểm thử | Lệnh thực thi | Kết quả thực tế |
|---|---|---|
| **TypeScript Compilation** | `cd frontend && npx tsc --noEmit` | **PASS** (Exit code: 0, 0 lỗi) |
| **Frontend Master Suite** | `cd frontend && npx tsx tests/run_all_tests.ts` | **PASS 462/462 tests** (0 failed, 549ms) |
| **Theme Tokens & Zero-Hex** | `cd frontend && npx tsx tests/adversarial_theme_tokens.test.ts` | **PASS 121/121 checks** (0 failed) |
| **SaaS Multi-Tenant Isolation**| `cd frontend && npx tsx tests/verify_saas_multi_account_branch_staff.ts` | **PASS 100%** (RBAC, Multi-branch, Multi-staff, Isolation) |
| **Card Refactoring Edge Cases**| `cd frontend && npx tsx tests/adversarial_card_refactoring.test.ts` | **PASS 8/8 tests** |
| **Backend Build** | `cd backend && go build ./...` | **PASS** (Exit code: 0) |
| **Backend Uncached Tests** | `cd backend && go test -count=1 ./internal/handler/... ./internal/testsuite/... ./internal/websocket/... ./internal/service/...` | **PASS 100%** (handler: 1.4s, testsuite: 2.7s, websocket: 0.36s, service: 0.4s) |
| **Backend Full Package Test** | `cd backend && go test ./...` | **PASS 100%** |

---

## 4. DANH MỤC CÁC TỆP ĐÃ THAY ĐỔI VÀ TẠO MỚI

### Tệp Tạo Mới:
- `backend/internal/handler/common.go`: Tenant scoping & response helpers.
- `frontend/lib/components/ui/Tier1Tabs.tsx`: Component thanh điều hướng cấp 1 chuẩn 46px.
- `frontend/lib/components/ui/EmptyState.tsx`: Component hiển thị trạng thái rỗng.
- `frontend/lib/utils/index.ts`: Barrel export utils.

### Tệp Sửa Đổi Chính:
- `backend/internal/database/database.go`: Sửa SQLite WAL PRAGMAs.
- `backend/internal/handler/menu.go`, `tables.go`, `inventory.go`, `order.go`, `staff.go`: Áp dụng helper dùng chung.
- `frontend/lib/components/ui/index.ts`: Export `Tier1Tabs` & `EmptyState`.
- `frontend/lib/utils/format.ts`: Thêm hàm format ngày giờ & parse tiền tệ.
- `frontend/lib/api/apiClient.ts`: Bổ sung payment & customer domain methods.
- `frontend/app/nhan-su/index.tsx`: Tích hợp `Tier1Tabs`, xóa tab boilerplate.
- `frontend/app/thuc-don/index.tsx`: Tích hợp `Tier1Tabs`, xóa tab boilerplate.
- `frontend/app/bao-cao-loi-nhuan/index.tsx`: Tích hợp `Tier1Tabs`, xóa tab boilerplate.
- `frontend/app/kho-hang/index.tsx`: Tích hợp `Tier1Tabs`, xóa tab boilerplate.
- `frontend/app/cai-dat/index.tsx`: Tích hợp `Tier1Tabs`, xóa tab boilerplate.
- `frontend/app/giao-ca/index.tsx`: Tích hợp `Tier1Tabs`, xóa tab boilerplate.
- `frontend/app/so-quy/index.tsx`: Tích hợp `Tier1Tabs`, chuyển đổi toàn bộ hex sang theme tokens.
- `frontend/app/so-quy/_components/QuickCashFormContent.tsx`: Chuyển đổi hex sang theme tokens.
- `frontend/app/khach-hang/components/CustomerDetailView.tsx` & `CustomerListView.tsx`: Dọn comment chứa mã hex.
- `frontend/app/thanh-toan/index.tsx`: Chuyển `fetch()` sang `apiClient`.

---

## 5. RỦI RO CÒN LẠI VÀ KHUYẾN NGHỊ BƯỚC TIẾP THEO

1. **Giao diện Touch Target Mobile (< 44pt)**:
   - Một số button/chip phụ trên form phụ vẫn có chiều cao 36-40pt chưa có `hitSlop`. Đã có kế hoạch chuẩn hóa hitSlop `{{ top: 8, bottom: 8, left: 8, right: 8 }}` ở đợt UI polish.
2. **Kiểm thử thiết bị phần cứng thật**:
   - Hiện đã kiểm thử giả lập và automated test suite hoàn tất 100%. Bước tiếp theo đề xuất chạy kiểm thử trên máy in nhiệt ESC/POS TCP 9100 và tablet Android qua script `scripts/android_adb_mcp.py` để quan sát phản hồi cảm ứng và dao cắt giấy thực tế.
