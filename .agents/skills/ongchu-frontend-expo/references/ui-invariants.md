# 🔒 CÁC BẤT BIẾN GIAO DIỆN (UI INVARIANTS)

1. **Typography Xương Sống (`md` 18px) & Apple HIG Input**:
   - Cỡ chữ `md` (`18px`, line-height `26px`) là trục xương sống gánh 85–90% nội dung POS (Món, Giá niêm yết, Dòng dữ liệu hóa đơn, Sổ quỹ, Đếm két, Tên mục Menu).
   - `sm` (`16px`) cho Tabs/CTA; `xs` (`14px`) cho SKU/ĐVT/giờ/trạng thái; `xxs` (`12px`) cho mô phỏng in nhiệt/topping.
   - 100% `TextInput` bắt buộc có `fontSize >= 16px` để triệt tiêu lỗi auto-zoom viewport trên iOS WebKit.
2. **Tabular Nums Bắt Buộc**:
   - Mọi số tiền, số lượng, thời gian, mã hóa đơn bắt buộc bật `tabularNums={true}`.
3. **Quy Chuẩn Đồng Nhất Màu Sắc Tuyệt Đối (Unified System Palette - CẤM Phân Mảng)**:
   - Dùng hook `useTheme()` và các token `theme.surface.*`, `theme.brand.*`, `theme.text.*`.
   - **Luồng Thanh Toán Màu Cam Chuẩn Apple Xuyên Suốt (Apple Warm Orange Action Thread)**: 100% nút thanh toán trong toàn bộ luồng POS (`Gọi Món` -> `Giỏ Hàng` -> `Nghiệp Vụ Bàn` -> `Xong & In Bill`) đồng nhất 100% dùng màu **Cam Chuẩn Apple (`theme.brand.accent` #B45309)** với chữ trắng `theme.text.onBrand`.
   - Nút quản trị thứ cấp (`Lưu Ca`, `Lưu Phiếu`, `Lưu Cài Đặt`) dùng màu `theme.brand.primary` (Đen Gỗ Mun `#1C1917` Light / Vàng Đồng Thau `#B45309` Dark).
   - CẤM dùng nút xanh lá to làm nền nút bấm; màu xanh lá chỉ làm chỉ báo trạng thái nhỏ (`● Bàn trống`, `✓ Đã xong`).
   - Dark Mode: Nền Nâu Than Cà Phê `#14110E`, Gỗ Gụ `#1E1813`, Trắng Ngà Dịu Mắt `#F3EFEA`, `brand.primary` Vàng Đồng Thau `#B45309` (CẤM dùng Trắng Tinh gây hiện tượng Optical Glare đau mắt).
4. **Không Thao Tác Trực Tiếp Bỏ Qua Safe Area**:
   - Luôn sử dụng `useSafeAreaInsets()` cho thanh trên (Top Header) và thanh đáy (Bottom Dock).
5. **FlashList Bắt Buộc Cho Danh Sách Dữ Liệu**:
   - Danh sách món ăn và sơ đồ bàn luôn dùng `@shopify/flash-list` với `estimatedItemSize` chính xác.
6. **Âm Thanh & Rung Phản Hồi 100%**:
   - Mọi nút bấm tác động vào giỏ hàng hoặc điều hướng đều gọi `Haptics.impactAsync` và `playTapSound()`.
7. **Toàn Màn Hình Nội Tuyến (Zero-Modal Detail Invariant)**:
   - Tuyệt đối cấm dùng thẻ `<Modal>` (kể cả `presentationStyle="fullScreen"`) cho màn hình chi tiết, phân tích số liệu hoặc drill-down nghiệp vụ sâu. Bắt buộc dùng Inline Sub-Screen Direct Render `{selectedItem ? <DetailView onBack={...} /> : <ListView />}` với `<AppHeader showBack>` liền mạch 100% dưới Status Bar.
8. **Triệt Để De-boxing & Thanh Tác Vụ Cố Định Đáy**:
   - Cấm bọc card trong card. Dữ liệu trải rộng full-bleed 100% chiều ngang, phân tách bằng hairline `StyleSheet.hairlineWidth`. Cụm nút CTA neo cố định sát đáy (`docked bottom bar`) có đệm an toàn `insets.bottom` và chiều cao tối thiểu 46px.
9. **Hệ Thống 2 Dãy Điều Hướng (Tab Cấp 1 Màu Chân & Chip Lọc Cấp 2 Đồng Thau Capsule)**:
   - **Dãy 1 (Tab Cấp 1 Màu Chân Rộng Rãi)**: Dạng Underline Tabs phẳng thoáng đãng, chiều cao chuẩn `46px` ($\ge 44\text{pt}$ Apple HIG), đường gạch chân đáy `3px` màu Đồng Thau `theme.brand.accent` (`#B45309`), icon & text Đồng Thau `weight="medium"`.
   - **Dãy 2 (Chip Lọc Cấp 2 Capsule)**: Dạng viên thuốc Apple Capsule bo tròn (`height: 36px`, `borderRadius: 18px`, `paddingHorizontal: 14px`), khi chọn nền Đồng Thau `#B45309` chữ trắng. Tích hợp `hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}` mở rộng vùng chạm vật lý lên $48\text{pt} \ge 44\text{pt}$.
   - **Chống xén mép (No-Clipping)**: Container thanh cuộn dùng `minHeight: 50, paddingVertical: 6`, cấm gán cứng `height: 48` trên `contentContainerStyle`. Luôn cố định dưới `<AppHeader>` và chỉ trượt ngang (`horizontal={true}`).
10. **Hành Động Header Theo Ngữ Cảnh & Triệt Tiêu Thanh Bar Phụ (Contextual Header Action & Zero-Redundant Sub-Bar)**:
    - **Header là trung tâm hành động cấp cao nhất**: Nút bấm chính trên `<AppHeader rightCustom>` và phụ đề `subtitle` BẮT BUỘC tự động biến đổi linh hoạt theo Tab/Phân hệ đang chọn (`+ Thêm Món` / `+ Thêm Nhóm` / `+ Thêm Topping`).
    - **Triệt tiêu thanh bar phụ kép**: CẤM tạo thêm các thanh ngang phụ (`topBar`, `actionBar`) lặp lại bên trong các component tab con chỉ để chứa 1 nút thêm mới; gom toàn bộ về `<AppHeader>` và render danh sách con dạng Flat Seamless Canvas để bảo toàn tối đa chiều cao màn hình (Zero-Waste Vertical Space).
11. **Mobile Drawer Zero-Truncation Invariant**:
    - Trên Mobile Drawer (`<AppSidebar>`), triệt tiêu toàn bộ text phụ tĩnh dài dòng (`Thu/Chi 3s`, `Két 30s`...) để giải phóng bề ngang.
    - Nâng nhãn tên mục menu lên `md` (18px) hiển thị trọn vẹn 1 dòng không bao giờ cắt dấu 3 chấm `...`, kết hợp Realtime Dynamic Badges tròn đếm số liệu thực.
