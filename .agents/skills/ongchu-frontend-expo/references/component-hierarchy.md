# 🌲 CÂY PHÂN CẤP COMPONENT (COMPONENT HIERARCHY)

```
RootLayout (_layout.tsx)
 ├── ThemeProvider (Dual Theme Context)
 └── POSSettingsProvider (Store Info & Bank Settings)
      │
      ├── POSHomeScreen (index.tsx)
      │    ├── AppHeader / AppSidebar (Drawer Navigation)
      │    │
      │    ├── [VIEW 1: viewMode === 'tables']
      │    │    ├── TableOverviewBanner (Tổng số bàn, số khách, tổng tiền)
      │    │    ├── AreaFilter (Horizontal Scroll Chips)
      │    │    └── TableGridFlashList
      │    │         └── TableCard (Bọc TableSvgBackdrop + Badge trạng thái + Tabular Total)
      │    │
      │    ├── [VIEW 2: viewMode === 'pos']
      │    │    ├── MenuArea (Master Column - 60% on iPad/PC)
      │    │    │    ├── SearchBar (Tích hợp nút QRScannerModal)
      │    │    │    ├── CategoryAndToggleRow (Chips danh mục + Nút đổi [Lưới / Danh sách])
      │    │    │    └── ProductGridFlashList
      │    │    │         └── ProductCard (Dual-mode: Grid 1:1 hoặc List Row)
      │    │    │
      │    │    └── CartArea (Detail Column - 40% on iPad/PC)
      │    │         ├── CartHeaderBox (Tên bàn + Nút mở TableOperationsModal)
      │    │         ├── CartItemRow List (Số lượng, Topping, Ghi chú, Nút hủy món Void)
      │    │         └── CartSummary & Action Toolbar (Gửi bếp, In tạm tính, Giảm giá, Thanh toán)
      │    │
      │    ├── BottomNavBar (Mobile Morphing Dock) / MobileCartBar
      │    │
      │    └── Modals & Sheets:
      │         ├── ModifierSheet (Chọn Size, Đường, Đá, Topping nhiều lựa chọn)
      │         ├── FullScreenCartModal (Giỏ hàng toàn màn hình trên di động)
      │         ├── TableOperationsModal (Chuyển bàn, Gộp bàn, Tách bàn, In tạm tính, Hủy bàn)
      │         ├── DiscountModal (Voucher chiến dịch & Giảm giá % / tiền mặt)
      │         ├── VoidItemModal (Lý do hủy món an ninh)
      │         └── QRScannerModal (HUD Laser Scanner 60fps & Nhập mã SKU bàn phím)
      │
      ├── SoQuyScreen (/so-quy)
      ├── GiaoCaScreen (/giao-ca)
      ├── BaoCaoScreen (/bao-cao-loi-nhuan)
      ├── ThanhToanScreen (/thanh-toan)
      └── CFDScreen (/cfd)
```
