# BÁO CÁO KHẢO SÁT CHUYÊN SÂU: R3 (APPLE WARM ORANGE ACTION THREAD), R4 (DESIGN SYSTEM DOC SYNC) & TÌNH TRẠNG TESTS

**Mã tác tử**: `teamwork_preview_explorer_survey_3`  
**Ngày thực hiện**: 2026-09-17  
**Phạm vi**: 
1. R3: Rà soát toàn diện 4 điểm chạm luồng thanh toán POS (Gọi Món, Giỏ Hàng, Nghiệp Vụ Bàn, Xong & In Bill), xác minh màu Cam Hổ Phách Apple `#B45309` (`theme.brand.accent`) vs Xanh Lá `#15803D` hoặc màu khác.
2. R4: Khảo sát đồng bộ tài liệu `AGENTS.md` và `GEMINI.md` về Typography 7 cấp, `md` 18px backbone, `TextInput` $\ge 16px$, và bảng màu Dual-Theme Anti-Glare.
3. TypeScript Build Status & Danh mục kịch bản kiểm thử trong `frontend/tests/`.

---

## 1. OBSERVATION (QUAN SÁT TRỰC TIẾP TỪ MÃ NGUỒN)

### 1.1. Khảo Sát R3: 4 Điểm Chạm Luồng Thanh Toán POS (Apple Warm Orange Action Thread)

#### Điểm chạm 1: Nút Số Tiền Gọi Món trong `frontend/lib/components/ui/BottomNavBar.tsx`
- **Tập tin**: `frontend/lib/components/ui/BottomNavBar.tsx`
- **Quan sát mã nguồn**:
  - Dòng 73: Chế độ giỏ hàng được kích hoạt khi:
    ```tsx
    const isCartMode = (pathname === '/' || pathname === '' || pathname === '/index') && viewMode === 'pos' && totalQty > 0;
    ```
  - Dòng 258–273: Khi `isCartMode === true`, dải Bottom Bar chuyển đổi trạng thái (morphing) sang dải thao tác giỏ hàng:
    ```tsx
    {/* 4. Nút Thanh Toán Màu Cam Chuẩn Apple Hiển Thị Số Tiền Trực Tiếp */}
    <PressableScale
      activeScale={0.96}
      haptic="step"
      playSound
      accessibilityRole="button"
      accessibilityLabel={`Thanh toán ${totalAmount.toLocaleString('vi-VN')} đồng`}
      onPress={handlePayPress}
      containerStyle={{ flex: 1.15 }}
      style={[s.payAmountBtn, { backgroundColor: theme.brand.accent }]}
    >
      <Icon name="cash-check" size={22} color={theme.text.onBrand} />
      <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
        {totalAmount.toLocaleString('vi-VN')} đ
      </AppText>
    </PressableScale>
    ```
  - Khi `isCartMode === false` (ở 5-tab bar tiêu chuẩn), tab 2 là `Gọi Món` (`key: 'pos'`) với `activeColor = theme.brand.accent`.
- **Kết luận Điểm 1**: ĐÃ ĐỒNG BỘ 100% sang `theme.brand.accent` (`#B45309`) với chữ và icon màu `theme.text.onBrand` (`#FFFFFF`).

---

#### Điểm chạm 2: Nút Giỏ Hàng trong `FullScreenCartModal.tsx`, `MobileCartBar.tsx`, và `TabletCartPane.tsx`
- **Tập tin 2.1**: `frontend/lib/components/pos/FullScreenCartModal.tsx`
  - Dòng 622–638:
    ```tsx
    {/* 3. Nút Thanh Toán Đồng Nhất Màu Cam Chuẩn Apple kèm số tiền to rõ 48px */}
    <PressableScale
      activeScale={0.96}
      haptic="step"
      playSound
      accessibilityRole="button"
      accessibilityLabel={`Thanh toán ${totalAmount.toLocaleString('vi-VN')} đồng`}
      onPress={onCheckout}
      containerStyle={{ flex: 1.15 }}
      style={[s.payAmountBtn, { backgroundColor: theme.brand.accent }]}
    >
      <Icon name="cash-check" size={22} color={theme.text.onBrand} />
      <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
        {totalAmount.toLocaleString('vi-VN')} đ
      </AppText>
    </PressableScale>
    ```
  - **Kết quả 2.1**: ĐÃ ĐỒNG BỘ 100% sang `theme.brand.accent` (`#B45309`) với chữ trắng `theme.text.onBrand`.

- **Tập tin 2.2**: `frontend/lib/components/pos/MobileCartBar.tsx`
  - Dòng 122–141:
    ```tsx
    <PressableScale
      activeScale={0.95}
      haptic="step"
      playSound
      accessibilityRole="button"
      accessibilityLabel="Tính tiền và thanh toán"
      onPress={onFastPay}
      style={[
        s.payButton,
        {
          backgroundColor: theme.brand.success, // ❌ VI PHẠM: ĐANG DÙNG XANH LÁ MỘC
        },
      ]}
    >
      <Icon name="cash-check" size={19} color={theme.text.onBrand} />
      <AppText variant="sm" weight="bold" color={theme.text.onBrand}>
        TÍNH TIỀN
      </AppText>
    </PressableScale>
    ```
  - **Kết quả 2.2 (VI PHẠM)**: Nút `TÍNH TIỀN` trong `MobileCartBar.tsx` vẫn đang dùng `backgroundColor: theme.brand.success` (Xanh Lá Mộc `#15803D`), vi phạm trực tiếp quy tắc cấm nút thanh toán xanh lá to trong `AGENTS.md`.

- **Tập tin 2.3**: `frontend/lib/components/pos-home/TabletCartPane.tsx` (Giỏ hàng Master-Detail bên phải trên Tablet/Desktop)
  - Dòng 391–400:
    ```tsx
    {/* Hàng 3: Nút Chốt Thanh Toán [Tính Tiền Hero CTA 52px 100% Rộng Rãi] */}
    <View style={{ marginTop: 8 }}>
      <Button
        variant="default" // ⚠️ LỆCH MÀU: variant="default" ánh xạ tới theme.brand.primary (Đen Gỗ Mun #1C1917)
        size="lg"
        title="Tính Tiền"
        disabled={cart.length === 0}
        leadingIcon={<Icon name="cash-check" size={24} color={theme.text.onBrand} />}
        style={{ width: '100%', height: 52, borderRadius: 10 }}
        onPress={onCheckout}
      />
    </View>
    ```
  - Kiểm tra component `Button.tsx` (dòng 39 & 44–46):
    - `variant="default"` đặt `backgroundColor = theme.brand.primary` (Đen Gỗ Mun `#1C1917` ở Light mode).
    - `variant="accent"` đặt `backgroundColor = theme.brand.accent` (Cam Hổ Phách `#B45309`).
  - **Kết quả 2.3 (BẤT CẬP)**: Trên Tablet/Desktop, nút `Tính Tiền` ở đáy giỏ hàng đang dùng `variant="default"` (màu Đen Gỗ Mun `#1C1917`) thay vì màu Cam Chuẩn Apple `variant="accent"` (`#B45309`).

---

#### Điểm chạm 3: Nút Nghiệp Vụ Bàn trong `TableOpsHubView.tsx` và các view nghiệp vụ bàn
- **Tập tin 3.1**: `frontend/lib/components/pos/table-ops/TableOpsHubView.tsx`
  - Dòng 287–296:
    ```tsx
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onGoToCheckout}
      style={[s.payBtnObsidian, { backgroundColor: theme.brand.accent }]}
    >
      <Icon name="cash-check" size={22} color={theme.text.onBrand} />
      <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
        THANH TOÁN ({appliedFinalTotal.toLocaleString('vi-VN')} đ)
      </AppText>
    </TouchableOpacity>
    ```
  - **Kết quả 3.1**: ĐÃ ĐỒNG BỘ 100% sang `theme.brand.accent` (`#B45309`) với chữ trắng `theme.text.onBrand`.

- **Các View Nghiệp Vụ Bàn Khác** (`TableOpsMoveView.tsx`, `TableOpsMergeView.tsx`, `TableOpsSplitView.tsx`, `TableOpsVoidView.tsx`, `TableOpsGuestNoteView.tsx`):
  - `TableOpsMoveView.tsx` (dòng 146): dùng `Button variant="default"` cho `Chuyển Bàn Ngay` (Màu Đen Gỗ Mun `theme.brand.primary` — đúng quy chuẩn nút quản trị).
  - `TableOpsMergeView.tsx`: dùng `Button variant="default"` cho `Gộp Bàn Ngay`.
  - `TableOpsSplitView.tsx` (dòng 159): dùng `Button variant="default"` cho `Tách Sang Bàn...`.
  - `TableOpsVoidView.tsx`: dùng `Button variant="destructive"` (`theme.brand.danger` `#DC2626` — đúng quy chuẩn nút hủy/xóa).
  - `TableOpsGuestNoteView.tsx`: dùng `Button variant="default"` cho `Lưu Ghi Chú & Khách`.
  - **Kết luận 3.2**: Các màn hình con này thực hiện tác vụ điều phối quản trị, không có nút chốt thanh toán tiền mặt trực tiếp nên việc dùng `theme.brand.primary` hoàn toàn tuân thủ quy chuẩn.

---

#### Điểm chạm 4: Nút Xong & In Bill trong `frontend/app/thanh-toan/index.tsx`
- **Tập tin**: `frontend/app/thanh-toan/index.tsx`
- **Chế độ Màn hình Rộng (Desktop / Tablet `isWide`)** — Dòng 1308–1335:
  ```tsx
  {/* NÚT HERO CHỐT ĐƠN 56PX */}
  <PressableScale
    activeScale={0.97}
    haptic="step"
    playSound
    onPress={handleConfirmCheckout}
    style={[
      s.heroCheckoutBtn,
      {
        backgroundColor:
          payMethod === 'ghi_no'
            ? theme.brand.danger
            : theme.brand.accent,
      },
    ]}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Icon
        name={payMethod === 'ghi_no' ? 'notebook-edit-outline' : 'check-circle'}
        size={24}
        color={theme.text.onBrand}
      />
      <AppText variant="md" weight="bold" color={theme.text.onBrand}>
        {payMethod === 'ghi_no' ? 'Xong & Ghi Nợ (F9)' : 'Xong & In Bill (F9)'}
      </AppText>
    </View>
    <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
      {totalAmount.toLocaleString('vi-VN')} đ
    </AppText>
  </PressableScale>
  ```
- **Chế độ Mobile (`!isWide`)** — Dòng 1462–1490:
  ```tsx
  <PressableScale
    activeScale={0.97}
    haptic="step"
    playSound
    onPress={handleConfirmCheckout}
    style={[
      s.checkoutBtn,
      {
        backgroundColor:
          payMethod === 'ghi_no'
            ? theme.brand.danger
            : theme.brand.accent,
      },
    ]}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon
        name={payMethod === 'ghi_no' ? 'notebook-edit-outline' : 'cash-check'}
        size={20}
        color={theme.text.onBrand}
      />
      <AppText variant="md" weight="bold" color={theme.text.onBrand}>
        {payMethod === 'ghi_no' ? 'Xong & Ghi Nợ' : 'Xong & In Bill'}
      </AppText>
    </View>
    <AppText variant="md" weight="bold" color={theme.text.onBrand} tabularNums>
      {totalAmount.toLocaleString('vi-VN')} đ
    </AppText>
  </PressableScale>
  ```
- **Kết quả Điểm 4**: Cả 2 giao diện Desktop và Mobile đều áp dụng `backgroundColor: payMethod === 'ghi_no' ? theme.brand.danger : theme.brand.accent`, chữ và số tiền đều là `theme.text.onBrand` (`#FFFFFF`). Đạt chuẩn 100%.

---

#### Tồn Dư Về Chú Thích Màu Xanh Lá Cũ trong `frontend/lib/theme/colors.ts`:
- Tại dòng 42 của `frontend/lib/theme/colors.ts`:
  ```ts
  success: '#15803D',    // Xanh Lá Mộc (Tính Tiền & Báo Xong)
  ```
  Chú thích này là tàn dư cũ khi dự án còn cho phép nút Tính Tiền màu xanh lá. Cần sửa comment thành: `// Xanh Lá Mộc (Chỉ dùng cho status dot, icon check ✓)`.

---

### 1.2. Khảo Sát R4: Đồng Bộ Tài Liệu Quy Chuẩn Design System (`AGENTS.md` & `GEMINI.md`)

Sau khi đối chiếu chi tiết giữa `AGENTS.md`, `GEMINI.md`, và các tệp khai báo theme trong `frontend/lib/theme/`, phát hiện các điểm xung đột và lỗi thời sau:

#### Xung đột 1: Quy định 4 cỡ chữ (cũ) vs Thang đo 7 cấp Apple HIG (mới)
- Tại `AGENTS.md` dòng 13:
  > `"2. Tuân thủ nghiêm ngặt Design System: Sử dụng chuẩn 4 cỡ chữ <AppText> (xs, sm, md, lg), tabularNums cho toàn bộ số liệu..."`
- **Mâu thuẫn**: Trong cùng tệp `AGENTS.md`, dòng 54 và Mục 3.1 (dòng 79) lại quy định:
  > `"Thang đo 7 cỡ chữ chuẩn: xxs đến display"` và liệt kê chi tiết 7 cấp: `xxs` (12px), `xs` (14px), `sm` (16px), `md` (18px), `lg` (22px), `xl` (24px), `display` (28px).
- `GEMINI.md` dòng 11 đã cập nhật chuẩn 7 cấp.
- Tại `frontend/lib/theme/tokens.ts` dòng 20–25: Khai báo `TYPOGRAPHY_TIERS` vẫn chỉ có 4 cấp (`xs`, `sm`, `md`, `lg`), hoàn toàn thiếu `xxs`, `xl`, và `display`.

#### Xung đột 2: Chuẩn `TextInput >= 16px` vs `TEXT_INPUT_FONT_SIZES`
- `AGENTS.md` (dòng 94) và `GEMINI.md` (dòng 11) quy định rõ:
  > `"Chuẩn Apple HIG Input 16px: 100% trường TextInput bắt buộc có fontSize >= 16px (sm 16px hoặc md 18px) để chống hiện tượng iOS WebKit tự động phóng to (auto-zoom) viewport..."`
- Nhưng tại `frontend/lib/theme/tokens.ts` (dòng 31):
  ```ts
  export const TEXT_INPUT_FONT_SIZES = [14, 16, 22] as const;
  ```
  Vẫn cho phép cỡ `14` (nhỏ hơn 16px).
- Quét thực tế codebase: Có **32 vị trí** gán cứng `fontSize: 14` cho ô `TextInput` trong các tệp modal (ví dụ: `ProductFormModal.tsx`, `CategoryManagementTab.tsx`, `EInvoiceModal.tsx`, `SettleDebtModal.tsx`, `StaffFormModal.tsx`...).

#### Xung đột 3: Giá trị màu Dark Mode Canvas (`#120E0B` vs `#14110E`)
- Tại `AGENTS.md` dòng 51 (Bảng 6 Trụ Cột): ghi `Dark Mode: Gỗ Gụ & Cà Phê Rang Đậm (#120E0B)`.
- Nhưng tại `AGENTS.md` dòng 119 (Mục 3.3 Token Dark Mode): ghi `theme.surface.app: #14110E`.
- `GEMINI.md` dòng 17: ghi `#14110E`.
- `frontend/lib/theme/colors.ts` dòng 73: `app: '#14110E'`.
- Tệp test `frontend/tests/tier1_feature_coverage.test.ts` (dòng 825) vẫn assert `#120E0B`, dẫn đến lỗi test fail!

#### Xung đột 4: Giá trị `darkTheme.brand.accent` (`#D97706` vs `#F59E0B`)
- Tại `AGENTS.md` dòng 127: ghi `theme.brand.accent: #D97706` (Vàng Đồng Ánh Kim Hổ Phách).
- Nhưng tại `frontend/lib/theme/colors.ts` dòng 105: `accent: '#F59E0B'` (Vàng Đồng Ánh Kim).

---

### 1.3. Khảo Sát Build TypeScript & Bộ Test Scripts (`frontend/tests/`)

#### 1.3.1. Kết quả kiểm tra biên dịch TypeScript
- Lệnh chạy: `cd frontend; npx tsc --noEmit`
- Kết quả: **Exit code 0** (0 errors).
- Đánh giá: 100% mã nguồn Frontend vượt qua type check nghiêm ngặt của TypeScript, không có lỗi kiểu dữ liệu.

#### 1.3.2. Danh mục các tệp kiểm thử trong `frontend/tests/` (Tổng cộng 61 tệp)
1. **Bộ Điều Phối & Khung Test (Runner & Harness)**:
   - `run_all_tests.ts`: Master test suite runner chính của toàn hệ thống.
   - `harness.ts`: Test harness runner, assertion functions (`strictEqual`, `deepStrictEqual`, `isDefined`...).
   - `setup_env.ts`: Mock môi trường React Native, Dimensions, Animated, Insets và Expo cho môi trường Node.js CLI.
   - `mock_data.ts`: Bộ hạt dữ liệu bàn, món, đơn hàng phục vụ test.
2. **5 Tiers Kiểm Thử Toàn Diện (5-Tier Core Test Suites)**:
   - `tier1_feature_coverage.test.ts` (48KB, 1119 dòng): Phủ 10 tính năng cốt lõi (Cart, Shift, KDS, ESC/POS, Theme, Anti-Fraud, Typography...).
   - `tier2_boundary_corner.test.ts` (26KB): Kiểm tra các ca biên cực hạn (giỏ rỗng, số tiền 0đ, chiết khấu > 100%, bàn không tồn tại...).
   - `tier3_cross_combinations.test.ts` (15KB): Kết hợp chéo các luồng nghiệp vụ (chuyển bàn khi đang có giảm giá, tách bàn có topping...).
   - `tier4_real_workloads.test.ts` (14KB): Tải thực tế với hàng trăm đơn hàng liên tục.
   - `tier5_m4_integration.test.ts` (23KB): Tích hợp toàn diện các phân hệ FOH, BOH, KDS, CFD, HĐĐT.
3. **Bộ Test Chuyên Biệt Theo Luồng Nghiệp Vụ (Feature Flow Suites - 25 tệp)**:
   - `audit_core_flows_ux.ts`: Rà soát thẻ `<Text>` nguyên bản và kiểm tra chuẩn hóa `<AppText>`.
   - `auth_branch_staff_passcode_security.test.ts`: Kiểm tra bảo mật mã PIN nhân viên và phân quyền chi nhánh.
   - `backend_contract_alignment.test.ts`: Đối soát hợp đồng payload giữa Expo và Go Backend.
   - `branch_management_flow.test.ts`: Luồng quản lý đa chi nhánh.
   - `customer_debt_flow.test.ts`: Luồng ghi nợ và gạch nợ CRM.
   - `five_devices_concurrent_store.test.ts`: Đồng bộ realtime 5 thiết bị đồng thời (POS, Tablet, KDS, CFD, Sổ quỹ).
   - `guide_and_documentation.test.ts`: Kiểm tra dữ liệu hướng dẫn vận hành.
   - `hold_order_and_cup_sticker_flow.test.ts`: Tạm lưu đơn và in tem dán ly.
   - `ios_flow_persistence.test.ts`: Tính bền vững dữ liệu giỏ hàng trên iOS.
   - `kiosk_login_scenarios.test.ts`: Kịch bản đăng nhập Kiosk POS.
   - `menu_and_table_management.test.ts`: Quản lý thực đơn, sơ đồ bàn và bật/tắt 86.
   - `microcopy_compliance.test.ts`: Kiểm duyệt độ dài CTA $\le 3$ chữ, Toast $\le 7$ chữ, Nhãn $\le 2$ chữ.
   - `multi_tenant_isolation.test.ts`: Cô lập dữ liệu giữa các chủ quán / chi nhánh.
   - `owner_credentials_lifecycle.test.ts`: Vòng đời thông tin đăng nhập chủ quán.
   - `quanquan_iphone_bootstrap.test.ts`: Khởi động ban đầu trên iPhone.
   - `real_data_engine.test.ts`: Bộ sinh dữ liệu mẫu thực tế.
   - `reorder_size_modifier_flow.test.ts`: Luồng chọn lại size/topping.
   - `report_date_range_metrics.test.ts`: Bộ lọc ngày và chỉ số 3 con số vàng P&L.
   - `saas_admin_platform.test.ts`: Nền tảng quản trị SaaS đa quán.
   - `saas_auth_login.test.ts`: Đăng nhập hệ thống SaaS.
   - `sidebar_architecture.test.ts`: Kiến trúc Drawer Sidebar và badge realtime.
   - `solo_staff_5_tables_flow.test.ts`: 1 nhân viên vận hành cùng lúc 5 bàn.
   - `staff_timekeeping_and_payroll.test.ts`: Chấm công và tính lương nhân sự.
   - `store_settings_and_bill_customization.test.ts`: Cấu hình cửa hàng và tùy biến mẫu bill.
   - `table_cart_selection_flow.test.ts`: Luồng chọn bàn và giỏ hàng.
   - `tax_and_surcharge_flow.test.ts`: Thuế VAT và phụ thu dịch vụ.
   - `three_phase_advanced_pos.test.ts`: POS nâng cao 3 giai đoạn.
   - `unconfigured_roles_flow.test.ts`: Xử lý khi vai trò chưa cấu hình.
   - `verify_saas_multi_account_branch_staff.ts` & `verify_saas_subdomain_and_branch_isolation.ts`: Cô lập subdomain và tài khoản.
4. **Bộ Test Thử Thách Cực Hạn & Kiểm Soát Hiệu Năng (Adversarial & Benchmark - 18 tệp)**:
   - `adversarial_card_refactoring.test.ts`: Kiểm chứng tính toàn vẹn sau khi băm nhỏ `ProductCard` và `TableCard`.
   - `adversarial_discount_guard.test.ts`: Kiểm thử bảo vệ chống gian lận chiết khấu > 20%.
   - `adversarial_kds_clock_isolation.test.ts`: Cô lập đồng hồ đếm KDS không gây re-render thẻ món.
   - `adversarial_theme_tokens.test.ts`: Quét tính đối xứng, rò rỉ mã Hex và hợp đồng token theme.
   - `apple_review_compliance.test.ts`: Kiểm duyệt tiêu chuẩn Apple App Store Review HIG.
   - `benchmark_speed_end_to_end.ts`: Đo tốc độ E2E (Mục tiêu: UI $\le 16ms$, Tính tiền $\le 5ms$).
   - `benchmark_render_resources.ts`: Đo mức tiêu thụ RAM và CPU khi render.
   - `challenger_apptext_stress.ts`: Thử thách bọc 100% text trong `<AppText>`.
   - `challenger_nav_hig.ts`: Kiểm tra vùng chạm $\ge 44pt$ của toàn bộ các thanh điều hướng.
   - `scan_adversarial.ts`: Quét tĩnh phát hiện vi phạm quy chuẩn dự án.
   - `test_realtime_sync.ts`: Kiểm tra đồng bộ WebSocket.

#### 1.3.3. Kết Quả Thực Thi Bộ Test (`npx ts-node tests/run_all_tests.ts`)
- Tổng số test chạy trong Tier 1: **134 tests**
- Số test PASS: **130 tests**
- Số test FAIL: **4 tests** (Tất cả đều nằm trong nhóm `Dual-Theme Tokens` của `tier1_feature_coverage.test.ts`):
  1. `Dark theme tokens: Indochine Cà Phê Rang Đậm and Gỗ Gụ brand` (chạy 2 lần):
     - Lỗi: `Assertion failed: Expected "#120E0B", got "#14110E"`
     - Nguyên nhân: Tệp test viết theo màu cũ `#120E0B`, trong khi `colors.ts` đã nâng cấp lên chuẩn Anti-Glare `#14110E`.
  2. `Semantic border tokens in Light and Dark themes` (chạy 2 lần):
     - Lỗi: `Assertion failed: Expected "#A8A29E", got "#D6D3D1"`
     - Nguyên nhân: Tệp test viết theo màu viền cũ `#A8A29E`, trong khi `colors.ts` đã nâng cấp lên chuẩn viền nét mảnh Stone 300 `#D6D3D1`.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Từ Quan Sát 1.1 (R3)**:
   - Trong luồng thao tác chính: `BottomNavBar.tsx` (dòng 267), `FullScreenCartModal.tsx` (dòng 631), `TableOpsHubView.tsx` (dòng 290), và `thanh-toan/index.tsx` (dòng 1319 & 1474) đều đã áp dụng triệt để `theme.brand.accent` (`#B45309`) với chữ trắng `theme.text.onBrand`.
   - Tuy nhiên, `MobileCartBar.tsx` (dòng 132) vẫn dùng `theme.brand.success` (nền nút màu xanh lá), tạo ra sự không đồng nhất về nhận diện thị giác khi thu ngân chuyển đổi giữa các màn hình.
   - Tương tự, `TabletCartPane.tsx` (dòng 392) sử dụng `Button variant="default"` dẫn đến nút `Tính Tiền` hiển thị màu Đen Gỗ Mun `#1C1917` thay vì Cam Hổ Phách Apple `#B45309`.
   - Vì vậy, để khép kín 100% sợi chỉ đỏ luồng thanh toán Apple Warm Orange, cần chỉnh sửa 2 vị trí này: đổi `MobileCartBar.tsx` sang `theme.brand.accent` và đổi `TabletCartPane.tsx` sang `variant="accent"`.

2. **Từ Quan Sát 1.2 (R4)**:
   - Có sự "lệch pha" tài liệu giữa quy chuẩn thời kỳ đầu (4 cỡ chữ) và quy chuẩn nâng cấp hiện tại (7 cấp Apple HIG): dòng 13 của `AGENTS.md` chưa được sửa đồng bộ với dòng 79 của chính nó và `GEMINI.md`.
   - `tokens.ts` đóng vai trò là "Single Source of Truth" cho tokens của code TypeScript, nhưng lại đang khai báo thiếu 3 variant (`xxs`, `xl`, `display`) và cho phép cỡ chữ `14` trong `TEXT_INPUT_FONT_SIZES`, đi ngược lại nguyên tắc chống auto-zoom WebKit $\ge 16px$.
   - Giá trị màu nền Dark Mode `#120E0B` tại Bảng Trụ Cột (dòng 51 `AGENTS.md`) là tàn dư cũ chưa sửa thành `#14110E`.
   - Tệp test `tier1_feature_coverage.test.ts` đang assert các giá trị cũ của theme trước khi có quy chuẩn Anti-Glare, làm cho suite test tổng bị rớt mặc dù mã nguồn app đã tuân thủ đúng theme mới.

3. **Từ Quan Sát 1.3 (TypeScript & Tests)**:
   - Bản thân mã nguồn TypeScript hoàn toàn trong sạch (`tsc --noEmit` đạt mã thoát 0).
   - Sự thất bại của 4 tests trong `run_all_tests.ts` không phải do lỗi runtime hay hỏng tính năng POS, mà thuần túy là do tệp test `tier1_feature_coverage.test.ts` và `adversarial_theme_tokens.test.ts` chưa được cập nhật khớp với bảng màu Indochine Anti-Glare mới (`#14110E`, `#D6D3D1`, `#B45309`).

---

## 3. CAVEATS (GIỚI HẠN & GIẢ ĐỊNH)

1. **Chế độ điều tra chỉ đọc (Read-only)**: Báo cáo này tuân thủ nghiêm ngặt nguyên tắc chỉ đọc của Explorer, không tự ý sửa đổi bất kỳ tệp mã nguồn nào trong `/frontend` hoặc tài liệu ngoài thư mục phân quyền của tác tử.
2. **Thiết bị chạy test**: Các kiểm thử tự động được thực thi trên môi trường Node.js giả lập (`setup_env.ts` trên Windows powershell). Để đảm bảo trải nghiệm cảm ứng và hiển thị thực tế không chói mắt, bước tiếp theo cần chạy trên thiết bị thật qua Android ADB MCP Server.
3. **Mã Hex rải rác còn lại**: `adversarial_theme_tokens.test.ts` báo cáo còn 12 vị trí chứa mã Hex rải rác trong `app/bao-cao-loi-nhuan/`, `app/login/`, `app/thanh-toan/` và `TablePickerModal.tsx`. Dù không gây crash app nhưng cần được dọn dẹp để đạt 100% token hóa.

---

## 4. CONCLUSION (KẾT LUẬN & KIẾN NGHỊ HÀNH ĐỘNG CỤ THỂ)

### Tóm tắt hiện trạng:
| Mục Khảo Sát | Trạng Thái | Chi Tiết |
| :--- | :---: | :--- |
| **R3: Luồng Cam Apple Gọi Món** | ✅ Đạt | `BottomNavBar.tsx` dùng `theme.brand.accent` (`#B45309`) |
| **R3: Luồng Cam Apple Giỏ Hàng Mobile Sheet** | ✅ Đạt | `FullScreenCartModal.tsx` dùng `theme.brand.accent` (`#B45309`) |
| **R3: Luồng Cam Apple Giỏ Hàng Mobile Bar** | ❌ Vi Phạm | `MobileCartBar.tsx:132` dùng `theme.brand.success` (`#15803D` Xanh Lá) |
| **R3: Luồng Cam Apple Giỏ Hàng Tablet/PC** | ⚠️ Lệch màu | `TabletCartPane.tsx:392` dùng `variant="default"` (Đen Gỗ Mun) |
| **R3: Luồng Cam Apple Nghiệp Vụ Bàn** | ✅ Đạt | `TableOpsHubView.tsx` dùng `theme.brand.accent` (`#B45309`) |
| **R3: Luồng Cam Apple Xong & In Bill** | ✅ Đạt | `thanh-toan/index.tsx` (cả 2 bản Web/Mobile) dùng `theme.brand.accent` |
| **R4: Typography 7 cấp trong docs** | ⚠️ Cần đồng bộ | `AGENTS.md:13` còn ghi "4 cỡ chữ", cần cập nhật thành 7 cấp |
| **R4: `TextInput >= 16px`** | ⚠️ Cần chuẩn hóa | `tokens.ts` còn chứa `14`; 32 file component còn để `fontSize: 14` |
| **R4: Bảng màu Anti-Glare Dark Mode** | ⚠️ Lệch nhẹ | `AGENTS.md:51` còn ghi `#120E0B`, cần đồng bộ về `#14110E` |
| **Build TypeScript (`tsc`)** | ✅ Đạt 100% | `npx tsc --noEmit` đạt 0 lỗi |
| **Bộ Test Tự Động (`run_all_tests`)** | ⚠️ 130/134 PASS | 4 test fail do file test assert giá trị theme cũ trước Anti-Glare |

### Đề xuất hành động cho tác tử triển khai (Implementer):
1. **Khắc phục R3**:
   - `frontend/lib/components/pos/MobileCartBar.tsx` (dòng 132): Sửa `backgroundColor: theme.brand.success` $\rightarrow$ `backgroundColor: theme.brand.accent`.
   - `frontend/lib/components/pos-home/TabletCartPane.tsx` (dòng 392): Sửa `variant="default"` $\rightarrow$ `variant="accent"`.
   - `frontend/lib/theme/colors.ts` (dòng 42): Sửa chú thích `// Xanh Lá Mộc (Tính Tiền & Báo Xong)` $\rightarrow$ `// Xanh Lá Mộc (Status Dot & Icon Check)`.
2. **Khắc phục R4**:
   - Trong `AGENTS.md`: Sửa dòng 13 từ "4 cỡ chữ" thành "7 cỡ chữ (`xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `display`)"; sửa dòng 51 mã nền Dark Mode từ `#120E0B` thành `#14110E`; sửa dòng 127 `theme.brand.accent` từ `#D97706` thành `#F59E0B`.
   - Trong `frontend/lib/theme/tokens.ts`: Cập nhật `TYPOGRAPHY_TIERS` đủ 7 cấp; cập nhật `TEXT_INPUT_FONT_SIZES = [16, 18, 22]` (loại bỏ 14).
3. **Đồng bộ hóa bộ Test (`frontend/tests/`)**:
   - Cập nhật `frontend/tests/tier1_feature_coverage.test.ts` (dòng 824–851): Thay thế các giá trị kỳ vọng cũ (`#120E0B`, `#1C1510`, `#F5F5F4`, `#A8A29E`, `#44403C`) bằng các token Anti-Glare Indochine mới (`#14110E`, `#1E1813`, `#F3EFEA`, `#B45309`, `#D6D3D1`, `#382E25`).
   - Cập nhật `frontend/tests/adversarial_theme_tokens.test.ts` (dòng 88–90) để pass 100% bộ test.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC MINH ĐỘC LẬP)

Để kiểm chứng độc lập các phát hiện và kết quả trong báo cáo này, chạy các lệnh sau từ thư mục gốc của dự án:

1. **Xác minh lỗi màu Xanh Lá trên nút Tính Tiền của MobileCartBar**:
   ```bash
   grep -n "brand.success" frontend/lib/components/pos/MobileCartBar.tsx
   ```
   *Kỳ vọng: Thấy dòng 132 chứa `backgroundColor: theme.brand.success`.*

2. **Xác minh nút Tính Tiền trên TabletCartPane dùng variant="default" (Đen)**:
   ```bash
   grep -n 'variant="default"' frontend/lib/components/pos-home/TabletCartPane.tsx
   ```
   *Kỳ vọng: Thấy dòng 392 chứa `variant="default"`.*

3. **Xác minh biên dịch TypeScript 0 lỗi**:
   ```bash
   cd frontend
   npx tsc --noEmit
   ```
   *Kỳ vọng: Exit code 0, không có type error nào.*

4. **Tái hiện 4 lỗi test trong bộ test tự động**:
   ```bash
   cd frontend
   npx ts-node tests/run_all_tests.ts
   ```
   *Kỳ vọng: 130 tests PASS, 4 tests FAIL tại nhóm `Dual-Theme Tokens` do so khớp `#120E0B` vs `#14110E` và `#A8A29E` vs `#D6D3D1`.*

5. **Xác minh các vị trí `fontSize: 14` trên TextInput**:
   ```bash
   git grep -n "fontSize: 14" frontend/app/ frontend/lib/
   ```
   *Kỳ vọng: Liệt kê 32 vị trí còn tồn tại `fontSize: 14`.*

---
*Báo cáo được lập hoàn tất bởi `teamwork_preview_explorer_survey_3`.*
