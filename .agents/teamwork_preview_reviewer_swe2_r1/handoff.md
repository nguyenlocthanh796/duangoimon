# 👑 BÁO CÁO ĐÁNH GIÁ & KHẮC PHỤC (SWE LIGHT ROUND 2 - REVIEW ROUND 1)
**Reviewer:** teamwork_preview_reviewer  
**Parent Agent:** `fafd018d-1f2e-49aa-b809-7b7378d53f9a`  
**Workspace:** `d:/duanpos-ongchu` (Frontend: Expo SDK 52, Backend: Golang Gin/GORM)  
**Quy chuẩn áp dụng:** AGENTS.md, GEMINI.md, Ponytail Review & Full Invariants  

---

## 1. NHỮNG KHIẾM KHUYẾT PHÁT HIỆN TỪ LẦN THỰC THI TRƯỚC (PRIOR ATTEMPT DEFECTS)

### Vấn đề 1: SQLite Connection Pool & PRAGMA Busy Timeout chưa gắn vào DSN
- **Input:** 50 - 100 goroutines đồng thời mở transaction ghi dữ liệu vào SQLite khi Connection Pool có `MaxOpenConns = 20`.
- **Expected:** Toàn bộ mọi connection trong connection pool đều kích hoạt `PRAGMA busy_timeout = 5000` và `journal_mode = WAL` để đợi lock nhả ra mà không văng lỗi `database is locked`.
- **Actual:** Mã nguồn cũ chỉ chạy `DB.Exec("PRAGMA busy_timeout = 5000;")` một lần duy nhất khi khởi tạo trên connection #1. Khi connection pool mở các kết nối #2..#20, các kết nối mới này có `busy_timeout = 0` (mặc định của SQLite), dẫn đến nguy cơ xung đột khóa và văng lỗi SQLITE_BUSY.
- **Root cause:** Trong Go `database/sql`, các lệnh `DB.Exec("PRAGMA ...")` chỉ áp dụng cho một connection được check-out tại thời điểm đó. Cần cấu hình trực tiếp các PRAGMA này trên chuỗi kết nối DSN để mọi kết nối mới tự động kế thừa.

### Vấn đề 2: `GetTenantID` bỏ qua context và `ScopeTenant` thiếu alias `default`
- **Input:** 
  1. Request qua Middleware (như `TenantQuotaMiddleware` hoặc JWT auth) đã xác thực và gán `c.Set("tenant_id", tenant.ID)` vào Gin Context nhưng không truyền Header `X-Tenant-ID` hay query param.
  2. Frontend hoặc client gọi `?tenant_id=default` (như websocket hub và shift handlers thường dùng).
- **Expected:**
  1. `GetTenantID` phải nhận diện được tenant ID đã xác thực trong context thay vì fallback nhầm về `tenant_ongchu`.
  2. `ScopeTenant` phải gom nhóm alias `default` cùng với `tenant_ongchu` và `tenant-default` để trả về đúng dữ liệu hạt giống ban đầu.
- **Actual:** `GetTenantID` chỉ kiểm tra query và header, bỏ qua context. `ScopeTenant` chỉ kiểm tra `tenant_ongchu` và `tenant-default`, khiến query với `tenant_id=default` trả về danh sách rỗng.
- **Root cause:** Thiếu kiểm tra `c.GetString("tenant_id")` trong `GetTenantID` và thiếu alias `"default"` trong danh sách tenant mặc định của `ScopeTenant`.

### Vấn đề 3: Bất đối xứng và nguy cơ runtime crash trong `parseCurrency`
- **Input:** 
  1. Chuỗi tiền tệ âm, ví dụ: `parseCurrency("-50,000")` hoặc `"-120000"`.
  2. Giá trị không phải kiểu số/chuỗi, ví dụ `parseCurrency(true as any)`.
- **Expected:**
  1. `parseCurrency("-50,000")` trả về `-50000` (giữ nguyên tính chất đối xứng với `parseCurrency(-50000)`).
  2. Giá trị boolean hoặc đối tượng không được văng unhandled TypeError.
- **Actual:**
  1. Hàm cũ dùng `val.replace(/\D/g, '')` làm mất dấu `-`, biến số âm thành số dương (`+50000`).
  2. Nếu truyền boolean `true`, gọi `.replace()` văng lỗi `TypeError: val.replace is not a function`.
- **Root cause:** Không kiểm tra dấu âm ở đầu chuỗi và không ép kiểu an toàn `String(val)`.

### Vấn đề 4: Thiếu Accessibility và `hitSlop` trên các touch target < 44pt
- **Input:** Thao tác chạm trên màn hình cảm ứng nhỏ (compact screen) đối với các chip chọn ca, ngày làm việc, và các tab điều hướng.
- **Expected:** Đạt quy chuẩn công thái học Apple Ergonomics: Touch target >= 44pt hoặc có `hitSlop` mở rộng vùng bấm, hỗ trợ accessibility attributes (`accessibilityRole`, `accessibilityState`).
- **Actual:** `Tier1Tabs.tsx`, `EmptyState.tsx`, `QuickShiftLogModal.tsx` (`staffPill`, `otChip`, `datePill`), và `ClockInOutModal.tsx` (`shiftCard`) có chiều cao 36-42pt nhưng chưa khai báo `hitSlop` và thiếu accessibility attributes.
- **Root cause:** Chưa gắn `hitSlop={{ top: 4..6, bottom: 4..6, left: 4, right: 4 }}` và thuộc tính trợ năng khi tạo component.

---

## 2. NHỮNG THAY ĐỔI ĐÃ THỰC HIỆN (CHANGES IMPLEMENTED)

1. **Backend Database (`backend/internal/database/database.go`)**:
   - Cập nhật DSN SQLite tích hợp sẵn PRAGMAs:
     `sqliteFile := "ongchu_pos.db?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=synchronous(NORMAL)"`
   - Đảm bảo 100% connection trong pool tự động nhận các PRAGMA này.
2. **Backend Handlers (`backend/internal/handler/`)**:
   - `common.go`: Nâng cấp `GetTenantID` kiểm tra theo thứ tự: Query -> Header -> Context (`c.GetString("tenant_id")`) -> Fallback. Nâng cấp `ScopeTenant` hỗ trợ alias `"default"`.
   - `expenses.go`, `settings.go`, `crm_vendor.go`, `shift.go`, `cash_flow.go`, `owner_pnl.go`: Loại bỏ hoàn toàn mã bóc tách tenant thủ công lặp lại; chuyển sang dùng `GetTenantID`, `ScopeTenant`, `RespondError`, và `RespondSuccess`. Dọn dẹp unused imports (`strings`).
3. **Backend Database Concurrency Tests (`backend/internal/database/sqlite_concurrency_test.go`)**:
   - Thêm `TestSQLiteDSNPragmas` và `TestSQLiteConcurrentWritesStress` kiểm thử 50 goroutines ghi đồng thời với transactions.
4. **Frontend Format Utils (`frontend/lib/utils/format.ts`)**:
   - Sửa `parseCurrency` xử lý chính xác số âm (`isNegative ? -parsed : parsed`) và ép kiểu an toàn `String(val)` chống crash.
5. **Frontend UI Components (`frontend/lib/components/ui/` & `frontend/lib/components/nhan-su/`)**:
   - `Tier1Tabs.tsx`: Thêm `accessible={true}`, `accessibilityRole="tab"`, `accessibilityState={{ selected: isSel }}`, `hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}`, và fallback màu nền chuẩn `theme.status.warningBg`.
   - `EmptyState.tsx`: Thêm Haptics feedback (`Haptics.selectionAsync()`), `accessibilityRole="button"`, và `hitSlop`.
   - `QuickShiftLogModal.tsx` & `ClockInOutModal.tsx`: Thêm `hitSlop` và accessibility cho `staffPill`, `otChip`, `datePill`, `shiftCard`.
6. **Frontend Test Suite (`frontend/tests/adversarial_swe2_reviewer.test.ts` & `run_all_tests.ts`)**:
   - Xây dựng bộ test đối kháng kiểm tra toàn diện 35 kịch bản biên cho `parseCurrency`, formatters, dates, và exports component.
   - Tích hợp vào Master Test Runner, nâng tổng số test lên 466/466 test cases.
   - Bổ sung mock subpath `@expo/vector-icons/MaterialCommunityIcons` trong `tests/setup_env.ts`.

---

## 3. TRẠNG THÁI SỔ THEO DÕI TỒN ĐỌNG (STATUS OF LEDGER ITEMS)

| STT | Nội dung mục tồn đọng | Trạng thái sau Round này | Chi tiết kiểm chứng |
|---|---|---|---|
| 1 | Chưa cắm máy in nhiệt vật lý ESC/POS cổng 9100 thật để in ra giấy | **OPEN** | Thiết bị mạng LAN 9100 chưa kết nối vật lý; kiểm tra thông qua socket TCP mock và driver generator byte hex. |
| 2 | Chưa mở ứng dụng trên thiết bị Android/iOS thực tế qua Expo Go để kiểm tra cảm giác vuốt chạm tab 46px | **OPEN** | Đã tối ưu hóa chiều cao 46px, bổ sung `hitSlop` và phản hồi xúc giác `Haptics.selectionAsync()`; cần kiểm thử thêm mắt nhìn trên thiết bị thật. |
| 3 | Nút phụ/chip trên modal cũ có chiều cao < 44pt chưa khai báo hitSlop | **RESOLVED** | Đã bổ sung `hitSlop` và accessibility cho `staffPill`, `otChip`, `datePill`, `shiftCard`, `EmptyState`, `Tier1Tabs`. |
| 4 | Hành vi cuộn ngang của tab bar trên màn hình hẹp (< 320px) | **OPEN** | ScrollView ngang `showsHorizontalScrollIndicator={false}` đã hoạt động; cần kiểm tra giao diện trên màn hình siêu nhỏ. |
| 5 | Chuyển đổi qua lại giữa các tab trong `so-quy` và `kho-hang` không bị reset state | **RESOLVED** | Đã phân tích và kiểm chứng: `filterType`, `selectedCategory`, `searchQuery` đều được lưu ở state màn hình cha độc lập với tab active. |
| 6 | Test stress đồng thời nhiều kết nối ghi trên SQLite backend (WAL & busy_timeout) | **RESOLVED** | Đã khắc phục việc truyền PRAGMA qua DSN và viết test `TestSQLiteConcurrentWritesStress` chạy 50 transaction ghi đồng thời PASS 100%. |

---

## 4. HỒ SƠ KIỂM CHỨNG TOÀN DIỆN (VERIFICATION RECORD)

- **Deep Verification (Đã chạy kiểm thử thực tế uncached):**
  1. `cd frontend && npx tsc --noEmit` -> **PASS (Exit code: 0, 0 errors)**
  2. `cd frontend && npx tsx tests/run_all_tests.ts` -> **PASS 466/466 tests passed (0 failed) in 583ms**
  3. `cd frontend && npx tsx tests/adversarial_theme_tokens.test.ts` -> **PASS 121/121 checks passed (0 failed)**
  4. `cd backend && & "D:\tools\go\bin\go.exe" build ./...` -> **PASS (Exit code: 0)**
  5. `cd backend && & "D:\tools\go\bin\go.exe" test -count=1 ./...` -> **PASS 100% (database: 0.62s, handler: 0.37s, service: 0.46s, testsuite: 1.88s, websocket: 0.39s)**
- **Shallow Verification (Kiểm tra bằng phân tích tĩnh & code inspection):**
  - Quét cấu trúc `so-quy/index.tsx` và `kho-hang/index.tsx` xác nhận việc duy trì state lọc không bị unmount hay re-initialize khi bấm chuyển đổi tab.
- **Unverified aspects:**
  - Máy in nhiệt vật lý ESC/POS 9100 thật (chưa cắm máy in vật lý).
  - Trực quan cảm ứng trên màn hình điện thoại 3.5 inch (< 320px).

---

## 5. CÁC VẤN ĐỀ ĐƯỢC GHI NHẬN (KNOWN ISSUES)
- `Minor Robustness Risk`: Màn hình cực hẹp (< 320px) có thể cần cuộn ngang nhiều hơn để thấy hết 3-4 tabs cấp 1. Đã có ScrollView horizontal hỗ trợ vuốt mượt.
- `Shallow Verification`: Các tác vụ in hóa đơn vật lý ra giấy in nhiệt K80 và mở ngăn kéo đựng tiền RJ11 hiện được xác thực qua luồng mã byte ESC/POS và unit test; chưa đưa vào máy in thật.

---

## 6. ĐÁNH GIÁ VÀ BƯỚC TIẾP THEO
Nhiệm vụ tái cấu trúc và tối ưu hóa codebase theo tiêu chuẩn Ponytail đã hoàn thành xuất sắc:
- Khử trùng lặp triệt để giữa các module backend và frontend.
- Cải thiện độ tin cậy và an toàn của SQLite dưới tải đồng thời.
- Sửa lỗi xử lý tiền tệ âm và ép kiểu trong utils.
- Nâng cao tính công thái học và khả năng tiếp cận (Accessibility & HitSlop).
Codebase sẵn sàng cho vòng đánh giá tiếp theo hoặc nghiệm thu chuyển giao.
