---
name: ongchu-frontend-expo
description: Hướng dẫn kỹ thuật chuyên sâu về Frontend Universal Expo SDK 52 (React Native 0.76.6), Zustand multi-table cart engine, Shopify FlashList 60 FPS, Design system dual-theme, Công thái học F&B và Tối ưu hóa hiệu năng cảm ứng. (KỸ NĂNG ƯU TIÊN TRỌNG TÂM HÀNG ĐẦU).
---

# 📱 HƯỚNG DẪN KỸ THUẬT FRONTEND EXPO SDK 52 (PRIMARY FOCUS SKILL)

> 🌟 **KỸ NĂNG ƯU TIÊN HÀNG ĐẦU**: Toàn bộ dự án đang tập trung cao độ vào việc xây dựng, hoàn thiện và tối ưu hóa giao diện người dùng UI/UX Frontend trên nền tảng Expo SDK 52 / React Native.

Skill này cung cấp chi tiết cách tổ chức component, quản lý trạng thái giỏ hàng đa bàn, công thái học giao diện và nguyên tắc tối ưu hiệu năng 60 FPS trên thiết bị di động và tablet.

---

## 🧭 KHI NÀO SỬ DỤNG SKILL NÀY
- Phát triển, sửa đổi màn hình POS, Giỏ hàng, Sơ đồ bàn, Thanh toán, Sổ quỹ hoặc Báo cáo trong `frontend/app/`.
- Tối ưu hóa danh sách món ăn và bàn bằng `@shopify/flash-list` trong `frontend/lib/components/pos/`.
- Chỉnh sửa state management Zustand trong `frontend/lib/store/usePOSStore.ts`.
- Mở rộng design system hoặc tùy biến theme trong `frontend/lib/theme/`.
- Xử lý tương tác cảm ứng haptics hoặc âm thanh phản hồi `sound.ts`.

---

## 📁 DANH MỤC CẤU TRÚC 10 MÀN HÌNH FRONTEND
- **Màn hình App Router**: `frontend/app/`
  - `_layout.tsx`: Root Layout (GestureHandler, SafeArea, Theme, Toast, POSSettings, `<AppRailNav>` song song `Stack` router khi `isWide && pathname !== '/cfd'`)
  - `index.tsx`: Bán hàng POS & Sơ đồ bàn (Master-Detail, FlashList 60 FPS, `<AppHeader>`)
  - `thanh-toan/index.tsx`: Thanh toán đa kênh (Tiền mặt, VietQR, Hỗn hợp, Numpad, `<AppHeader>`)
  - `kds/index.tsx`: Màn hình Bếp / Bar Realtime (Theo Đơn & Gộp Món, `<AppHeader>` live clock)
  - `hoa-don/index.tsx`: Sổ đơn đã bán, tra cứu, in lại Bill K80, hủy đơn có audit log (`<AppHeader>`)
  - `thuc-don/index.tsx`: Quản lý thực đơn & bật/tắt Hết Món 1-chạm, đổi giá (`<AppHeader>`)
  - `cai-dat/index.tsx`: Cài đặt máy in nhiệt LAN ESC/POS TCP 9100 & VietQR Napas247 (`<AppHeader>`)
  - `so-quy/index.tsx`: Sổ quỹ chi chợ thực tế (Mua đá, rau, ứng lương 3s, `<AppHeader>`)
  - `giao-ca/index.tsx`: Giao ca & đếm 9 mệnh giá tiền mặt két 30s (`<AppHeader>`)
  - `bao-cao-loi-nhuan/index.tsx`: 3 Con số vàng P&L bỏ túi (`<AppHeader>`)
  - `cfd/index.tsx`: Màn hình phụ cho khách hàng (Customer Display, không có navbar)
- **State Store Atomic Selectors**: `frontend/lib/store/usePOSStore.ts`
  - `useTableList()`, `useMenuItems()`, `useOutOfStockProductIds()`, `useOrderHistory()`, `useKDSOrders()`, `useStoreSettings()`
- **Quy Chuẩn Microcopy 3-Rules**: Nút CTA $\le 3$ chữ (`Tính Tiền`, `Báo Bếp`, `Xong & In Bill`), Toast $\le 7$ chữ, Nhãn tiền $\le 2$ chữ.
- **Giao diện & Theme**: `frontend/lib/theme/` (Dual-Theme Indochine Heritage: Ngà Giấy Dó & Gỗ Mun, Đồng Thau Phin `#B45309`, Trắng Men Gốm `#FFFFFF`, Xanh Lá Mộc `#15803D`, Đỏ Chu Sa `#DC2626`)
- **Thành phần dùng chung**: `frontend/lib/components/ui/` (`AppText`, `AppToast`, `AppHeader`, `AppRailNav`, `BottomNavBar`, `AppSidebar`, `Button`)
- **Thành phần POS chuyên dụng**: `frontend/lib/components/pos/` (`ProductCard`, `ReceiptPreviewModal`, `MobileCartBar`, `FullScreenCartModal`)

---

## 📐 NGUYÊN TẮC THIẾT KẾ FLAT SEAMLESS CANVAS (DE-BOXING MOBILE)
- **Công thức De-boxing chuẩn**:
  ```tsx
  style={[
    s.container,
    {
      backgroundColor: theme.surface.card,
      borderColor: theme.border.subtle,
      marginHorizontal: isWide ? 16 : 0,
      marginTop: isWide ? 12 : 0,
      borderRadius: isWide ? 18 : 0,
      borderWidth: isWide ? 1 : 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border.subtle,
      elevation: 0,
    }
  ]}
  ```
- **Phân đoạn dữ liệu phẳng (Full-Bleed Sections)**:
  - Thay vì bọc trong card, dùng nhãn phân đoạn in hoa (`AppText variant="xs" weight="bold" color={theme.text.muted}`) đặt trước danh sách với `paddingHorizontal: 16`.
  - Các dòng phân cách nhau bằng `borderBottomWidth: StyleSheet.hairlineWidth` và `borderBottomColor: theme.border.subtle`.
- **Gạch xúc giác phẳng (Flat Tactile Tiles)**:
  - Bàn ăn (`TableCard`) & Sản phẩm (`ProductCard`): Nền màu nhẹ 6%, viền `hairlineWidth` `theme.border.subtle`, `elevation: 0`.

---

## 🛡️ VÙNG ĐỆM AN TOÀN (SAFE AREA) & DRAWER NỔI (FLOATING OVERLAY)
- **Safe Area Insets**:
  - Luôn dùng `const insets = useSafeAreaInsets()`.
  - Bottom padding cuộn tối thiểu: `paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 84 : 90)`.
  - System Bars: `StatusBar` và `NavigationBar` đặt trong suốt, không để viền đen hoặc lệch màu nền.
- **Drawer Sidebar Nổi**:
  - `<AppSidebar>` hiển thị với `position: 'absolute'`, `zIndex: 999`, không đẩy hoặc làm méo layout bên dưới khi mở ra.

---

## 🛑 QUY CHUẨN TOÀN MÀN HÌNH NỘI TUYẾN CHO CHI TIẾT (ZERO-MODAL DETAIL INVARIANT)
- **Triệt tiêu hoàn toàn thẻ `<Modal>` cho màn hình chi tiết**:
  - TUYỆT ĐỐI CẤM dùng thẻ `<Modal>` (kể cả `presentationStyle="fullScreen"`) cho các luồng xem chi tiết, phân tích số liệu hoặc tác vụ nghiệp vụ sâu (Chi tiết lương, Bóc tách thu nhập, Chi tiết nhân sự, Giỏ hàng đơn món, Cấu hình sâu).
  - Lý do: Thẻ `<Modal>` trên mobile tạo ra native dialog window riêng biệt làm gãy đệm vùng an toàn Status Bar, gây lệch màu header và tạo cảm giác "popup phóng to".
- **Bắt buộc dùng Màn Hình Con Nội Tuyến (Inline Sub-Screen Direct Render)**:
  - Sử dụng cơ chế render điều phối trực tiếp tại component: `{selectedItem ? <DetailView onBack={...} /> : <ListView />}`.
  - Tích hợp chuẩn `<AppHeader showBack onBack={...} title="..." subtitle="...">` nằm trực tiếp dưới Status Bar của cửa sổ chính, hòa màu 100% liền mạch và hỗ trợ phím Back vật lý Android (`BackHandler`).
- **Triệt để De-boxing (Flat Seamless Canvas)**:
  - CẤM bọc dữ liệu trong các card bo góc lơ lửng (`borderRadius: 14, borderWidth: 1`).
  - Dữ liệu trải rộng full-bleed 100% chiều ngang, phân tách các hàng bằng `StyleSheet.hairlineWidth` với token `theme.border.subtle`.
  - Phân đoạn bằng tiêu đề phụ in hoa (`xs`, `bold`, `text.muted`) kết hợp khoảng trắng.
- **Thanh Tác Vụ Cố Định Đáy (Docked Bottom Action Bar)**:
  - Cụm nút hành động (CTA) phải neo cố định sát đáy màn hình (`position: 'absolute', bottom: 0`), có đường kẻ hairline trên đỉnh, tự động đệm an toàn `insets.bottom` và chiều cao nút tối thiểu 46px chuẩn công thái học 1-chạm.
  - Trên màn hình rộng (`isWide >= 1024px`), tự động căn giữa với `maxWidth: 680px` để giữ tính thẩm mỹ cao cấp.

---

## 📚 TÀI LIỆU THAM KHẢO KÈM THEO
- component-hierarchy.md
- state-management.md
- ui-invariants.md
