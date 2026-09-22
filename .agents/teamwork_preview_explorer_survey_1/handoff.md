# BÁO CÁO KHẢO SÁT & ĐIỀU TRA CHUYÊN SÂU: R1 - CHUẨN HÓA TYPOGRAPHY 7 CẤP & TEXTINPUT >= 16PX (APPLE HIG)

- **Đơn vị thực hiện**: `teamwork_preview_explorer_survey_1` (Typography & TextInput Explorer)
- **Thời gian**: 2026-09-17T08:53:00Z
- **Phạm vi khảo sát**: `frontend/app` và `frontend/lib` (2,380 thẻ `<AppText>`, 143 thẻ `<TextInput>`, 33 màn hình `<AppHeader>`, hệ thống Theme Typography)
- **Trạng thái**: Điều tra chỉ đọc (Read-only Investigation) — Hoàn tất 100%

---

## 1. OBSERVATION (QUAN SÁT THỰC NGHIỆM CHI TIẾT)

### 1.1. Khảo Sát Hệ Thống Typography (`AppText.tsx` và `typography.ts`)
1. **Định nghĩa 7 cấp Typography trong `frontend/lib/theme/typography.ts`**:
   - Tệp: `frontend/lib/theme/typography.ts` (dòng 25–35):
     ```ts
     // Mobile (<744):       xxs 12, xs 14, sm 16, md 18, lg 22, xl 24, display 28
     // Tablet (744-1279):   xxs 13, xs 14, sm 16, md 18, lg 22, xl 28, display 32
     // Web Desktop (>=1280): xxs 13, xs 15, sm 17, md 19, lg 25, xl 30, display 38
     const xxs = isMobile ? 12 : 13;
     const xs = isWebDesktop ? 15 : 14;
     const sm = isWebDesktop ? 17 : 16;
     const md = isWebDesktop ? 19 : 18;
     const lg = isWebDesktop ? 25 : 22;
     const xl = isWebDesktop ? 30 : isMobile ? 24 : 28;
     const display = isWebDesktop ? 38 : isMobile ? 28 : 32;
     ```
   - **Line-height quan sát được**:
     - `xxs`: `lineHeight: isWebDesktop ? 19 : 18` (lệch chuẩn AGENTS.md yêu cầu `xxs 12px / lh 16px`).
     - `xs`: `lineHeight: isWebDesktop ? 22 : 20` (chuẩn 20px).
     - `sm`: `lineHeight: isWebDesktop ? 24 : 22` (chuẩn 22px).
     - `md`: `lineHeight: isWebDesktop ? 28 : 26` (chuẩn 26px).
     - `lg`: `lineHeight: isWebDesktop ? 34 : isMobile ? 29 : 32` (chuẩn 28–32px).
     - `xl`: `lineHeight: isWebDesktop ? 38 : isMobile ? 32 : 36` (chuẩn 32–36px).
     - `display`: `lineHeight: isWebDesktop ? 46 : isMobile ? 36 : 40` (chuẩn 36–40px).

2. **Cấu hình mặc định trong `frontend/lib/components/ui/AppText.tsx`**:
   - Dòng 62–64:
     ```tsx
     export const AppText: React.FC<AppTextProps> = ({
       variant = 'bodyMedium',
     ```
   - Giá trị mặc định là `'bodyMedium'` (thuộc hệ M3, định nghĩa tại `frontend/lib/theme/m3/typography.ts:99` với `fontSize: 14, lineHeight: 20`), **KHÔNG PHẢI** `variant="md"` (18px).
   - Tồn tại tàn dư của M3 variants trong `AppTextVariant`:
     - `frontend/lib/components/ui/AppHeader.tsx:248`: `<AppText variant="labelLarge" ...>`
     - `frontend/lib/components/ui/BottomNavBar.tsx:228`: `<AppText variant="labelSmall" ...>`
     - `frontend/lib/components/ui/Card.tsx:67`: `<AppText variant="titleMedium" ...>`

3. **Phân bổ tỷ lệ thực tế của 2,380 component `<AppText>` trong toàn bộ mã nguồn**:
   | Cỡ chữ (Variant) | Kích thước | Số lượng thực tế | Tỷ lệ (%) | Mục tiêu theo Quy Chuẩn | Đánh giá hiện trạng |
   | :--- | :--- | :--- | :--- | :--- | :--- |
   | **`xs`** | 14px | **1,362** | **57.23%** | Phụ đề, SKU, Badge, Chip | ⚠️ **Quá tải nghiêm trọng** (dùng lạm dụng cho cả nội dung chính) |
   | **`sm`** | 16px | **485** | **20.38%** | Tabs Cấp 1, Tiêu đề Card, Nút CTA | Bình thường |
   | **`md`** | 18px | **318** | **13.36%** | **Trục xương sống 85–90% nội dung POS** | ❌ **Vi phạm nặng** (chỉ chiếm 13.36%, cách xa mục tiêu 85–90%) |
   | **`xxs`** | 12px | **157** | **6.60%** | In nhiệt K58/K80, Topping tag | Đạt |
   | **`lg`** | 22px | **24** | **1.01%** | Tiêu đề Header chính | Đạt |
   | **`xl`** | 24px | **19** | **0.80%** | Tổng tiền, Hero KPI | Đạt |
   | **`display`** | 28px | **3** | **0.13%** | Numpad, Giờ KDS, CFD | Đạt |
   | **M3 / Dynamic** | N/A | **12** | **0.49%** | `labelLarge`, `labelSmall`, `titleMedium`, dynamic ternary | Cần chuyển hẳn về 7 cấp |
   | **Tổng cộng** | | **2,380** | **100%** | | |

4. **Kiểm tra tiêu đề chính `<AppHeader>`**:
   - Component gốc `frontend/lib/components/ui/AppHeader.tsx` (dòng 191–193):
     ```tsx
     <AppText variant="lg" weight="bold" color={theme.text.primary} numberOfLines={1}>
       {title}
     </AppText>
     ```
     -> Cấu hình mặc định của `<AppHeader>` tuân thủ chính xác `variant="lg"` (22px bold).
   - Quét toàn bộ 33 điểm gọi `<AppHeader>` trên 10 màn hình:
     - **31 / 33 điểm gọi** truyền prop `title="..."` trực tiếp -> Hiển thị chuẩn `variant="lg"` (22px bold).
     - **2 / 33 điểm gọi** (tại các modal con) tự định nghĩa cụm tiêu đề qua `leftCustom` và dùng `variant="md" weight="medium"` thay vì dùng prop `title`:
       1. `app/kho-hang/index.tsx:1346`: `<AppText variant="md" weight="medium" color={theme.text.primary}>{editingItem ? 'Sửa Mặt Hàng Kho' : 'Thêm Hàng Hóa Mới'}</AppText>`
       2. `app/thuc-don/_components/ProductFormModal.tsx:319`: `<AppText variant="md" weight="medium" color={theme.text.primary}>{itemToEdit ? 'Chỉnh Sửa Món' : 'Thêm Món Mới'}</AppText>`

---

### 1.2. Khảo Sát Toàn Diện 100% Thẻ `<TextInput>` (Chống Lỗi Auto-Zoom iOS WebKit)
- **Tổng số thẻ `<TextInput>` JSX thực tế**: **143 thành phần** (sau khi lọc bỏ các type annotation TypeScript `useRef<TextInput>`).
- **Tuân thủ chuẩn Apple HIG (`fontSize >= 16px`)**: **64 / 143 thẻ (44.75%)**.
  - `fontSize: 16px`: 61 thẻ
  - `fontSize: 18px`: 1 thẻ
  - `fontSize: 20px`: 1 thẻ
  - `fontSize: 22px`: 1 thẻ
- **Vi phạm chuẩn Apple HIG (`fontSize < 16px` hoặc thiếu `fontSize`)**: **79 / 143 thẻ (55.24%)**.

#### A. Danh Sách 5 Thẻ TextInput Thiếu Hoàn Toàn Thuộc Tính `fontSize` (Missing fontSize)
Các thẻ này không khai báo `fontSize` trực tiếp lẫn trong style class, khiến iOS WebKit tự động áp dụng cỡ chữ mặc định của hệ thống (~14px) và kích hoạt hành vi phóng to (auto-zoom) viewport làm vỡ giao diện:
1. `frontend/app/cai-dat/_components/OwnerAccountTab.tsx:590`:
   - Ô nhập mã PIN / Mã Cứu Hộ SaaS (`unbindCode`).
   - Style hiện tại: `[s.inputBox, { height: 42, backgroundColor: theme.surface.card, borderColor: theme.border.default, color: theme.text.primary }]`.
   - Lỗi: `s.inputBox` là container `ViewStyle`, không chứa `fontSize`. Cần bổ sung `fontSize: 16`.
2. `frontend/app/cai-dat/_components/OwnerAccountTab.tsx:706`:
   - Ô nhập xác nhận hủy tài khoản (`placeholder="XOA TAI KHOAN"`).
   - Style hiện tại: `[s.inputBox, { height: 42, backgroundColor: theme.surface.input, ... }]`.
   - Lỗi: Thiếu `fontSize`. Cần bổ sung `fontSize: 16`.
3. `frontend/app/cai-dat/_components/OwnerAccountTab.tsx:729`:
   - Ô nhập PIN Chủ Quán để xác thực xóa dữ liệu (`placeholder="PIN Chủ Quán..."`).
   - Style hiện tại: `[s.inputBox, { height: 42, backgroundColor: theme.surface.input, ... }]`.
   - Lỗi: Thiếu `fontSize`. Cần bổ sung `fontSize: 16`.
4. `frontend/app/giao-ca/index.tsx:272`:
   - Ô nhập Tên thu ngân trực ca trong Modal mở ca (`placeholder="Tên thu ngân..."`).
   - Style hiện tại: `[s.modalInput, { backgroundColor: theme.surface.header, color: theme.text.primary, borderColor: theme.border.subtle }]`.
   - Lỗi: `s.modalInput` (dòng 1591) chỉ có `height: 48, borderRadius: 10, paddingHorizontal: 12`, hoàn toàn thiếu `fontSize`. Cần bổ sung `fontSize: 16` trực tiếp vào `s.modalInput`.
5. `frontend/lib/components/ui/AppOmniSearch.tsx:223`:
   - Thanh tìm kiếm thông minh toàn ứng dụng (Omni-Search).
   - Style hiện tại: `[s.input, { color: theme.text.primary }]`.
   - Lỗi: `s.input` (dòng 421) chỉ có `flex: 1, padding: 0, margin: 0`. Cần bổ sung `fontSize: 16` vào `s.input`.

#### B. Danh Sách 74 Thẻ TextInput Có `fontSize < 16px` (Chi Tiết Theo Phân Hệ)
- **Phân bổ giá trị**:
  - `12px`: 1 thẻ
  - `13px`: 4 thẻ
  - `14px`: 68 thẻ
  - `15px`: 1 thẻ

Bảng tổng hợp chi tiết toàn bộ 74 vị trí:

| STT | Tệp tin (File Path) | Dòng | Cỡ chữ hiện tại | Nội dung / Placeholder | Đề xuất sửa |
| :---: | :--- | :---: | :---: | :--- | :---: |
| 1 | `app/cai-dat/_components/OperationsTab.tsx` | 656 | **12px** | URL máy in/backend `http://192.168.50.127:8080` | Đổi sang `16px` |
| 2 | `app/saas-admin/index.tsx` | 1160 | **13px** | Mã License SaaS `VD: OC-PRO-30D-8F2A-99B1` | Đổi sang `16px` |
| 3 | `app/saas-admin/index.tsx` | 3887 | **13px** | Ghi chú kích hoạt `Tặng quán, khuyến mãi...` | Đổi sang `16px` |
| 4 | `app/login/_components/SaaSAccountForm.tsx` | 614 | **13px** | Khóa bí mật SaaS 64 ký tự | Đổi sang `16px` |
| 5 | `app/login/index.tsx` | 594 | **13px** | Khóa khôi phục 64 ký tự | Đổi sang `16px` |
| 6 | `app/saas-admin/index.tsx` | 3394 | **15px** | Ô số lượng branch phụ | Đổi sang `16px` |
| 7 | `app/saas-admin/index.tsx` | 1543 | **14px** | Tên chi nhánh mới | Đổi sang `16px` |
| 8 | `app/saas-admin/index.tsx` | 1563 | **14px** | Địa chỉ chi nhánh | Đổi sang `16px` |
| 9 | `app/saas-admin/index.tsx` | 1584 | **14px** | Hotline chi nhánh | Đổi sang `16px` |
| 10 | `app/saas-admin/index.tsx` | 1605 | **14px** | Tên quản lý chi nhánh | Đổi sang `16px` |
| 11 | `app/saas-admin/index.tsx` | 2858 | **14px** | Thanh tìm kiếm tenant/subdomain | Đổi sang `16px` |
| 12 | `app/saas-admin/index.tsx` | 3082 | **14px** | Tên quán mới | Đổi sang `16px` |
| 13 | `app/saas-admin/index.tsx` | 3094 | **14px** | Subdomain tenant | Đổi sang `16px` |
| 14 | `app/saas-admin/index.tsx` | 3107 | **14px** | SĐT chủ quán | Đổi sang `16px` |
| 15 | `app/saas-admin/index.tsx` | 3120 | **14px** | Tên chủ quán | Đổi sang `16px` |
| 16 | `app/saas-admin/index.tsx` | 3457 | **14px** | Giới hạn chi nhánh | Đổi sang `16px` |
| 17 | `app/saas-admin/index.tsx` | 3502 | **14px** | Giới hạn thiết bị POS | Đổi sang `16px` |
| 18 | `app/kho-hang/index.tsx` | 406 | **14px** | Thanh tìm kiếm kho NVL | Đổi sang `16px` |
| 19 | `app/kho-hang/index.tsx` | 1107 | **14px** | Đơn giá kiểm kê | Đổi sang `16px` |
| 20 | `app/kho-hang/index.tsx` | 1124 | **14px** | Số lượng thực tế kiểm kê | Đổi sang `16px` |
| 21 | `app/kho-hang/index.tsx` | 1285 | **14px** | Ghi chú phiếu kho | Đổi sang `16px` |
| 22 | `app/kho-hang/index.tsx` | 1467 | **14px** | Mã SKU nguyên liệu | Đổi sang `16px` |
| 23 | `app/kho-hang/index.tsx` | 1480 | **14px** | Đơn vị tính (kg, lon, hộp) | Đổi sang `16px` |
| 24 | `app/kho-hang/index.tsx` | 1537 | **14px** | Giá vốn ước tính | Đổi sang `16px` |
| 25 | `app/kho-hang/index.tsx` | 1549 | **14px** | Tồn kho tối thiểu | Đổi sang `16px` |
| 26 | `app/kho-hang/index.tsx` | 1563 | **14px** | Tồn kho ban đầu | Đổi sang `16px` |
| 27 | `app/kho-hang/index.tsx` | 1580 | **14px** | Nhà cung cấp NVL | Đổi sang `16px` |
| 28 | `app/thuc-don/_components/CategoryManagementTab.tsx` | 310 | **14px** | Tên danh mục mới | Đổi sang `16px` |
| 29 | `app/thuc-don/_components/ProductFormModal.tsx` | 1127 | **14px** | Đơn vị tính tùy chỉnh | Đổi sang `16px` |
| 30 | `app/thuc-don/_components/ToppingManagementTab.tsx` | 293 | **14px** | Tên món topping mới | Đổi sang `16px` |
| 31 | `app/thuc-don/_components/ToppingManagementTab.tsx` | 313 | **14px** | Giá tiền topping | Đổi sang `16px` |
| 32 | `app/thanh-toan/_components/EInvoiceModal.tsx` | 169 | **14px** | Mã số thuế doanh nghiệp | Đổi sang `16px` |
| 33 | `app/thanh-toan/_components/EInvoiceModal.tsx` | 196 | **14px** | Tên công ty / Người mua hàng | Đổi sang `16px` |
| 34 | `app/thanh-toan/_components/EInvoiceModal.tsx` | 217 | **14px** | Địa chỉ xuất hóa đơn đỏ | Đổi sang `16px` |
| 35 | `app/thanh-toan/_components/EInvoiceModal.tsx` | 238 | **14px** | Email nhận hóa đơn điện tử | Đổi sang `16px` |
| 36 | `app/quan-ly-ban/index.tsx` | 949 | **14px** | Tìm kiếm bàn / khu vực | Đổi sang `16px` |
| 37 | `app/quan-ly-ban/index.tsx` | 1446 | **14px** | Tên bàn mới | Đổi sang `16px` |
| 38 | `app/quan-ly-ban/index.tsx` | 1608 | **14px** | Tên khu vực mới | Đổi sang `16px` |
| 39 | `app/khach-hang/components/CustomerFormModal.tsx` | 72 | **14px** | Tên khách hàng | Đổi sang `16px` |
| 40 | `app/khach-hang/components/CustomerFormModal.tsx` | 83 | **14px** | SĐT khách hàng | Đổi sang `16px` |
| 41 | `app/khach-hang/components/CustomerFormModal.tsx` | 95 | **14px** | Điểm tích lũy ban đầu | Đổi sang `16px` |
| 42 | `app/khach-hang/components/CustomerFormModal.tsx` | 107 | **14px** | Ghi chú sở thích khách | Đổi sang `16px` |
| 43 | `app/khach-hang/components/CustomerListView.tsx` | 248 | **14px** | Tìm kiếm khách hàng | Đổi sang `16px` |
| 44 | `app/khach-hang/components/SettleDebtModal.tsx` | 147 | **14px** | Số tiền trả nợ | Đổi sang `16px` |
| 45 | `app/khach-hang/components/SettleDebtModal.tsx` | 158 | **14px** | Ghi chú trả nợ | Đổi sang `16px` |
| 46 | `app/bao-cao-loi-nhuan/_components/ReportCustomDateModal.tsx` | 142 | **14px** | Từ ngày (YYYY-MM-DD) | Đổi sang `16px` |
| 47 | `app/bao-cao-loi-nhuan/_components/ReportCustomDateModal.tsx` | 162 | **14px** | Đến ngày (YYYY-MM-DD) | Đổi sang `16px` |
| 48 | `app/bao-cao-loi-nhuan/_components/ReportInvoicesTab.tsx` | 51 | **14px** | Tìm kiếm hóa đơn báo cáo | Đổi sang `16px` |
| 49 | `app/hoa-don/index.tsx` | 899 | **14px** | Tìm kiếm sổ hóa đơn đã bán | Đổi sang `16px` |
| 50 | `app/huong-dan/index.tsx` | 986 | **14px** | Tìm kiếm hướng dẫn sử dụng | Đổi sang `16px` |
| 51 | `app/login/_components/SaaSAccountForm.tsx` | 443 | **14px** | Số điện thoại tra cứu tenant | Đổi sang `16px` |
| 52 | `app/login/_components/StaffPinPad.tsx` | 473 | **14px** | Nhập chuỗi kích hoạt thiết bị | Đổi sang `16px` |
| 53 | `lib/components/pos/DiscountModal.tsx` | 523 | **14px** | Nhập mã voucher khuyến mãi | Đổi sang `16px` |
| 54 | `lib/components/nhan-su/StaffFormModal.tsx` | 156 | **14px** | Họ tên nhân viên | Đổi sang `16px` |
| 55 | `lib/components/nhan-su/StaffFormModal.tsx` | 170 | **14px** | SĐT nhân viên | Đổi sang `16px` |
| 56 | `lib/components/nhan-su/StaffFormModal.tsx` | 199 | **14px** | Mã PIN nhân viên | Đổi sang `16px` |
| 57 | `lib/components/nhan-su/StaffFormModal.tsx` | 301 | **14px** | Mức lương cơ bản | Đổi sang `16px` |
| 58 | `lib/components/nhan-su/StaffFormModal.tsx` | 316 | **14px** | Phụ cấp trách nhiệm | Đổi sang `16px` |
| 59 | `lib/components/nhan-su/StaffFormModal.tsx` | 331 | **14px** | Hệ số lương | Đổi sang `16px` |
| 60 | `lib/components/nhan-su/StaffListTab.tsx` | 79 | **14px** | Tìm kiếm nhân sự | Đổi sang `16px` |
| 61 | `lib/components/nhan-su/QuickShiftLogModal.tsx` | 201 | **14px** | Số giờ làm việc | Đổi sang `16px` |
| 62 | `lib/components/nhan-su/QuickShiftLogModal.tsx` | 215 | **14px** | Số giờ tăng ca OT | Đổi sang `16px` |
| 63 | `lib/components/nhan-su/QuickShiftLogModal.tsx` | 231 | **14px** | Ngày chấm công | Đổi sang `16px` |
| 64 | `lib/components/nhan-su/QuickShiftLogModal.tsx` | 245 | **14px** | Ghi chú ca trực | Đổi sang `16px` |
| 65 | `lib/components/nhan-su/ClockInOutModal.tsx` | 170 | **14px** | Giờ vào ca | Đổi sang `16px` |
| 66 | `lib/components/nhan-su/ClockInOutModal.tsx` | 202 | **14px** | Giờ ra ca | Đổi sang `16px` |
| 67 | `lib/components/nhan-su/ClockInOutModal.tsx` | 216 | **14px** | Ghi chú bàn giao ca | Đổi sang `16px` |
| 68 | `lib/components/nhan-su/BonusDeductionModal.tsx` | 100 | **14px** | Số tiền thưởng | Đổi sang `16px` |
| 69 | `lib/components/nhan-su/BonusDeductionModal.tsx` | 118 | **14px** | Số tiền phạt / khấu trừ | Đổi sang `16px` |
| 70 | `lib/components/nhan-su/BonusDeductionModal.tsx` | 133 | **14px** | Lý do thưởng phạt | Đổi sang `16px` |
| 71 | `lib/components/nhan-su/SalaryAdvanceModal.tsx` | 130 | **14px** | Số tiền tạm ứng | Đổi sang `16px` |
| 72 | `lib/components/nhan-su/SalaryAdvanceModal.tsx` | 191 | **14px** | Lý do tạm ứng lương | Đổi sang `16px` |
| 73 | `lib/components/nhan-su/PaySalaryModal.tsx` | 228 | **14px** | Ghi chú chi lương | Đổi sang `16px` |
| 74 | `lib/components/nhan-su/PayrollHistoryModal.tsx` | 81 | **14px** | Tìm kiếm lịch sử bảng lương | Đổi sang `16px` |

---

### 1.3. Khảo Sát Raw `<Text>` và Style Overrides trên `<AppText>`
1. **Kiểm tra thẻ `<Text>` nguyên bản của React Native**:
   - Số lượng tìm thấy trong `frontend/app` và `frontend/lib`: **0 thẻ**.
   - 100% các tệp `.tsx` đều import và sử dụng `<AppText>` thống nhất.
2. **Kiểm tra can thiệp style `fontSize` / `lineHeight` inline đè lên `<AppText>`**:
   - Số lượng inline `fontSize` hoặc `lineHeight` trong prop `style` của `<AppText>`: **0 vị trí**.
   - Số lượng style class trong `StyleSheet.create` chứa `fontSize`/`lineHeight` được truyền vào `<AppText>`: **0 vị trí**.
   - Cơ chế bảo vệ runtime tại `frontend/lib/components/ui/AppText.tsx` (dòng 131–141):
     ```tsx
     const sanitizeStyle = (s: TextStyle | (TextStyle | undefined)[] | undefined): any => {
       if (!s) return undefined;
       if (Array.isArray(s)) return s.map(sanitizeStyle);
       if (typeof s === 'object') {
         if ('fontSize' in s || 'lineHeight' in s) {
           const { fontSize: _fs, lineHeight: _lh, ...rest } = s as TextStyle;
           return rest;
         }
       }
       return s;
     };
     ```
     -> Hàm `sanitizeStyle` tự động loại bỏ bất kỳ `fontSize` hoặc `lineHeight` nào nếu bị lọt vào prop `style` trước khi đưa vào thẻ `<Text>` nguyên bản.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Từ Quan sát 1.1**:
   - `AppText` có giá trị fallback mặc định là `variant = 'bodyMedium'` (14px). Khi lập trình viên viết `<AppText>...</AppText>` mà không ghi rõ `variant`, component hiển thị ở 14px thay vì 18px (`md`).
   - Việc quy chuẩn AGENTS.md định vị `variant="md"` (18px) là trục xương sống gánh 85–90% nội dung POS chưa được thực thi triệt để trong tầng component. Thực tế có tới 57.23% văn bản đang dùng `variant="xs"` (14px). Các thông tin quan trọng như dòng nội dung sổ quỹ, tên món ăn trong modal chi tiết, nhãn chứng từ, nút bấm đang bị hạ xuống `xs` hoặc `sm`.
   - Hệ quả: Giao diện trên thiết bị di động trông bị vụn vặt, chữ nhỏ li ti, tạo cảm giác dày đặc khó chạm và tương phản thị giác kém khi quán đông khách.

2. **Từ Quan sát 1.2**:
   - Có tới 79 / 143 thẻ `TextInput` (55.24%) có `fontSize < 16px` hoặc không có `fontSize`.
   - Trên iOS Safari / WebKit (bao gồm PWA trên iPhone và Expo WebKit view), quy tắc của Apple là: Nếu bất kỳ `<input>` hoặc `<TextInput>` nào có `font-size < 16px`, khi người dùng chạm vào để gõ, trình duyệt sẽ **tự động phóng to (auto-zoom) viewport** khoảng 120–130% để hỗ trợ đọc.
   - Khi bị auto-zoom:
     - Toàn bộ layout cố định (header, dock giỏ hàng, bảng số liệu) bị tràn ra ngoài viền màn hình (overflow horizontal).
     - Người dùng phải dùng 2 ngón tay chụm lại (pinch-to-zoom) để đưa giao diện về ban đầu sau khi nhập liệu xong.
     - Đây là lỗi trải nghiệm rất khó chịu trong môi trường nhà hàng/quán cafe tốc độ cao.
   - 68 thẻ đang đặt cứng `fontSize: 14` (do thói quen viết form web trên desktop). Chỉ cần nâng đồng loạt lên `fontSize: 16` (`sm`) là giải quyết triệt để và an toàn 100% gốc rễ vấn đề mà không phá vỡ chiều cao của các input container (hầu hết container đã có `height: 42 - 48px`).

3. **Từ Quan sát 1.3**:
   - Nền tảng kiến trúc của dự án đã làm rất tốt việc triệt tiêu hoàn toàn thẻ `<Text>` nguyên bản (0 thẻ) và triệt tiêu inline `fontSize` trên `<AppText>` (0 thẻ).
   - Bộ lọc `sanitizeStyle` bảo vệ rất vững chắc, chứng minh hệ thống Design System đã sẵn sàng để đón nhận bước chuẩn hóa typography toàn diện.

---

## 3. CAVEATS (GIỚI HẠN & ĐIỀU KIỆN BIÊN)

1. **Phân hệ SaaS Admin (`app/saas-admin/index.tsx`)**:
   - Có 14 thẻ `TextInput` mang cỡ 13px, 14px và 15px. Phân hệ này là trang quản trị web desktop dành cho Super Admin (chủ dự án), ít khi thao tác trên điện thoại màn hình nhỏ. Tuy nhiên, để tuân thủ 100% quy chuẩn dự án và hỗ trợ iPad/Mobile Safari, toàn bộ 14 input này vẫn nên được nâng lên 16px.
2. **Kích thước container của các ô input**:
   - Đa số ô input có chiều cao container `height: 42 - 48px`, hoàn toàn đủ không gian chứa text `fontSize: 16px` (với line-height tự nhiên ~20–22px) mà không bị cắt rớt chữ (clipping). Tuy nhiên, cần lưu ý thuộc tính `paddingVertical: 0` trên Android để căn giữa hoàn hảo.
3. **Receipt Preview Modal K58/K80 (`ReceiptPreviewModal.tsx`)**:
   - Hiện tại có 91 thẻ `<AppText>` dùng `variant="xs"`. Theo AGENTS.md mục 3.1, mô phỏng in hóa đơn nhiệt K58/K80 nên dùng `xxs` (12px) để tạo cảm giác giấy in nhiệt chân thực và vừa khít khổ 58mm/80mm. Đây là khu vực đặc thù in nhiệt, không nên áp cứng tỷ lệ 85% `md` cho riêng hóa đơn in.

---

## 4. CONCLUSION (KẾT LUẬN & KIẾN NGHỊ HÀNH ĐỘNG CỤ THỂ)

Hệ thống Typography và Input của OngChu Lean POS có nền tảng rất sạch (0 raw `<Text>`, 0 inline font overrides, `<AppHeader>` chuẩn `variant="lg"` 22px bold). Tuy nhiên, **tồn tại 2 lỗ hổng lớn cần khắc phục ngay trong đợt triển khai R1**:

1. **Lỗ hổng 1: 55.24% TextInput vi phạm Apple HIG kích hoạt lỗi Auto-Zoom trên iOS**:
   - Cần sửa **79 vị trí** (74 vị trí `fontSize < 16` và 5 vị trí `missing fontSize`) nâng toàn bộ lên `fontSize: 16` (`sm`).
   - Cụ thể 5 vị trí thiếu fontSize:
     - `app/cai-dat/_components/OwnerAccountTab.tsx`: Bổ sung `fontSize: 16` vào các ô dòng 590, 706, 729.
     - `app/giao-ca/index.tsx`: Thêm `fontSize: 16` vào `modalInput` (dòng 1591).
     - `lib/components/ui/AppOmniSearch.tsx`: Thêm `fontSize: 16` vào `s.input` (dòng 421).
   - 74 vị trí còn lại: Thay `fontSize: 12`, `13`, `14`, `15` thành `fontSize: 16`.

2. **Lỗ hổng 2: Lệch pha tỷ trọng Typography POS (`variant="md"` chỉ đạt 13.36% thay vì 85–90%)**:
   - Thay đổi fallback mặc định trong `AppText.tsx:63` từ `variant = 'bodyMedium'` thành `variant = 'md'` để mọi text thông thường tự động hưởng cỡ chữ trục xương sống 18px.
   - Đồng bộ line-height của `xxs` trong `typography.ts:52` về chuẩn `lineHeight: 16` (thay vì 18/19).
   - Thay thế 3 tàn dư M3:
     - `AppHeader.tsx:248`: `variant="labelLarge"` -> `variant="md"` hoặc `variant="sm"`
     - `BottomNavBar.tsx:228`: `variant="labelSmall"` -> `variant="xs"`
     - `Card.tsx:67`: `variant="titleMedium"` -> `variant="md"`
   - Tinh chỉnh 2 modal (`kho-hang/index.tsx:1346` và `ProductFormModal.tsx:319`) từ `leftCustom` dùng `md` sang sử dụng trực tiếp prop `title` chuẩn của `<AppHeader>` để đạt `variant="lg"` (22px bold).
   - Nâng cấp các dòng dữ liệu danh sách giao dịch sổ quỹ (`so-quy/index.tsx`), dòng món ăn hóa đơn (`hoa-don/index.tsx`) từ `xs`/`sm` lên `md` (18px) để đạt chuẩn công thái học F&B vị chủ quán.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC MINH ĐỘC LẬP)

Để kiểm chứng độc lập các số liệu và kết luận trong báo cáo này, chạy các lệnh sau từ thư mục gốc dự án:

1. **Kiểm tra 100% không còn raw `<Text>`**:
   ```powershell
   cd d:\duanpos-ongchu\frontend
   # Quét tìm thẻ <Text không phải <AppText và không phải <TextInput
   git grep -n "<Text[ >/]" -- "app/*" "lib/*" ":!lib/components/ui/AppText.tsx"
   # Kết quả mong đợi: 0 dòng trả về.
   ```

2. **Kiểm tra các thẻ TextInput vi phạm `< 16px`**:
   ```powershell
   python d:/duanpos-ongchu/.agents/teamwork_preview_explorer_survey_1/filter_real_jsx_inputs.py
   # Kết quả mong đợi:
   # Total REAL JSX <TextInput elements: 143
   #   fontSize >= 16 : 64
   #   fontSize < 16  : 74
   #   missing fontSize: 5
   # Total violating  : 79
   ```

3. **Kiểm tra 3 vị trí M3 variants còn sót lại**:
   ```powershell
   git grep -n "variant=[\"']\(labelLarge\|labelSmall\|titleMedium\)[\"']" -- "app/*" "lib/*"
   # Kết quả:
   # lib/components/ui/AppHeader.tsx:248
   # lib/components/ui/BottomNavBar.tsx:228
   # lib/components/ui/Card.tsx:67
   ```

4. **Kiểm tra TypeScript không lỗi**:
   ```powershell
   cd d:\duanpos-ongchu\frontend
   npx tsc --noEmit
   # Kết quả mong đợi: Exit code 0 (0 errors).
   ```
