# Quy Tắc Giao Diện Flat Skills UI V2 & Flat Skills Layout V2 (Đồng Thuận /grill-me)

Mọi giao diện sub-mô-đun và màn hình trong hệ thống POS (`/quan-ly`, `/ke-toan`...) phải tuân thủ nghiêm ngặt các quy tắc UI/UX chuẩn hóa dưới đây:

## 1. Cấu Trúc Khung CardBox Độc Lập (`ss.sectionWrap`)
- Mỗi nhóm danh mục/phân đoạn dữ liệu (Thực đơn, Tồn kho, Khách hàng...) phải được đóng khung trong 1 **CardBox bo viền 8px sát màn hình**:
  - `borderRadius: 8`
  - `borderWidth: 1`
  - `borderColor: '#E5E9F0'`
  - `backgroundColor: '#FFFFFF'`
  - `overflow: 'hidden'`
  - `marginBottom: 8`

## 2. Tiêu Đề Nhóm (`ss.sectionHeader`)
- Thanh tiêu đề của từng CardBox:
  - `backgroundColor: '#F8FAFC'`
  - `paddingHorizontal: 10`
  - `paddingVertical: 8`
  - `borderBottomWidth: 1`
  - `borderColor: '#E5E9F0'`
  - Phông chữ BeVietnamPro_700Bold đậm cỡ text md (16px), màu `#1E293B`, kèm badge đếm số lượng nhã nhặn.

## 3. Padding Sát Viền Màn Hình (Edge-to-Edge 6px)
- `ScrollView` danh sách trên mobile/web thu gọn phải luôn cài đặt:
  - `contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, gap: 8, paddingBottom: 100 }}`

## 4. Thanh Thao Tác Đỉnh (`ss.topActionBar`)
- Ô tìm kiếm (`searchInputWrap`) & Nút thêm mới (`addBtn`):
  - Chiều cao 32px
  - Bo góc nhẹ 6px (`borderRadius: 6`)
  - Viền nhạt `#E5E9F0`, nền `#FFFFFF`
  - Phím bấm màu cam thương hiệu `#F97316` hoặc xanh xám nhã nhặn.

## 5. Bộ Lọc Nhóm (`ss.filterChip`)
- Các chip lọc dạng pill bo góc 6px, nền nhã nhặn `#F8FAFC`, viền nhạt `#E2E8F0`, màu chữ active nhã nhặn.

## 6. Hàng Món Ăn Tinh Gọn (Item Row `ss.listRow` & `ss.itemRow`)
- Đệm lề ngang: `paddingHorizontal: 10` thống nhất toàn bộ các màn hình sub-module.
- Mã món: Badge nền xám nhạt `#F1F5F9` bo góc 4px.
- Giá tiền: Màu nổi bật nhã nhặn `#0F172A`.
- Trạng thái: Badge bo 6px (`Đang bán`: xanh nhạt `#ECFDF5`, `Ngưng bán`: đỏ nhạt `#FEE2E2`).

## 7. Màn Hình Chi Tiết Mobile (`DetailModal`)
- Khi mở chi tiết dữ liệu ở bất kỳ sub-module nào, bắt buộc phải dùng `DetailModal` đặt ở cấp Root (`position: 'relative'`).
- `DetailModal` che phủ hoàn toàn: Ô tìm kiếm (`ss.topActionBar`), Thanh bộ lọc (`ss.filterChip`), và Thanh chuyển tab (`ModuleTabs`), xuất hiện ngay dưới Thanh Tiêu Đề chính.
- Sử dụng `ScreenHeader` chi tiết tích hợp sẵn: Tiêu đề dữ liệu, Phụ đề, Nút Quay lại (`showBack`) ở góc trái và các nút thao tác (`Sửa`, `Xóa`, `Đổi trạng thái`...) tích hợp ở góc phải Header (`ScreenHeader.right`). Loại bỏ hoàn toàn các thanh nút bấm rườm rà ở đáy màn hình.
- Trên iPad / Desktop (`isWide >= 768px`): Giữ nguyên giao diện chia 2 cột Master-Detail (58% Danh sách - 42% Chi tiết).

## 8. Layout Báo Cáo BI Analytics (Data-Dense Executive Layout)
- Báo cáo BI phải thiết kế theo chuẩn Data-dense dành cho Quản lý cấp cao:
  - 3 Thẻ KPI tổng quan: Doanh thu, Food Cost, Số đơn hàng kèm chỉ số phụ (AOV - Doanh thu trung bình/đơn, % Food Cost).
  - Trực quan hóa Biểu đồ (BarChart): CardBox chứa đồ thị trực quan xu hướng doanh thu & chi phí.
  - Bảng danh sách chi tiết: Badge thứ trong tuần (T2-CN), Ngày, Số đơn, AOV (k/đơn) và Doanh thu tổng.

## 9. Quy Tắc Typography Chuẩn Nút Bấm `md` & Iconography Tinh Gọn (Subtle Visual Hierarchy)
- **Nút Bấm Thao Tác Chuẩn `md` (16px)**: Tất cả nút bấm thao tác (`addBtn`, nút Lưu HĐ, nút Thanh toán, nút Xóa, nút Sửa, nút Chuyển bàn) bắt buộc cài đặt cỡ text `md` (`16px` / `variant="md"`), gia tăng tối đa thị giác giúp thu ngân dễ thao tác.
- **Tỉ Lệ Bao Phủ Text `md` Chủ Đạo Tối Ưu (~80% - 88%)**: Cỡ chữ `16px` (`md`) là chuẩn cỡ chữ chủ đạo toàn ứng dụng cho Tên món ăn, Giá tiền, Nội dung dòng, Nút bấm thao tác và Tiêu đề nhóm (`ss.sectionHeader`), trong khi cỡ `sm` (14px) ~10% dành riêng cho phụ đề/ghi chú nhỏ và `xs` (12px) ~1.5% cho badge/tag.
- **Không lạm dụng in đậm (`font-weight: 700`)**: Văn bản thường (tên ngày, tên sản phẩm, phụ đề, nhãn số lượng) sử dụng `BeVietnamPro_400Regular` màu nhã nhặn `#0F172A` hoặc `#64748B`. Chỉ in đậm (`BeVietnamPro_700Bold`) đối với Tiêu Đề Nhóm (`ss.sectionHeader`) và Con Số Tổng Doanh Thu.
- **Tiết chế Icon (Minimalist Iconography)**: Loại bỏ các biểu tượng/icon dư thừa trong hàng dữ liệu và bảng. Sử dụng badge màu nhạt nhã nhặn (`#F1F5F9`, `#ECFDF5`, `#FFF7ED`) thay vì chèn icon dày đặc gây rối mắt.

## 10. Quy Tắc Thanh Thao Tác Đáy & Home Bar Margin (Bottom Safe Area Offset 50%)
- **Đệm Đáy Home Bar (50% Bottom Inset)**: Tất cả thanh thao tác / footer cố định ở đáy màn hình (`MobileCartBar`, `CartPanel`, `PaymentScreen`, `SettingsScreen`, `ModifierSheet`) bắt buộc cài đặt padding đệm đáy bằng **50% `insets.bottom`**:
  `paddingBottom: Platform.OS === 'web' ? 6 : Math.max(Math.floor(insets.bottom * 0.5), 6)`
  giúp dải thanh thao tác ôm sát viền màn hình iPhone thật, vừa tầm mắt và không bị đệm thô cao.
- **Nút Bấm Đáy Thuần Phẳng (No CoreAnimation Overlay)**: Các hàng nút bấm thao tác ở đáy dùng `TouchableOpacity` phẳng (`width: '100%'`, `hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}`), tuyệt đối không bọc `Animated.View` `PressScale` lồng nhau gây lỗi GPU CoreAnimation layer đè nút trên Native iOS.




