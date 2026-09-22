# ⚡ QUẢN LÝ TRẠNG THÁI POS ZUSTAND (STATE MANAGEMENT)

Tập trung tại: `frontend/lib/store/usePOSStore.ts`

---

## 1. CẤU TRÚC STATE CHÍNH

```typescript
interface POSState {
  tables: TableItem[];
  selectedTable: TableItem;
  activeArea: string;
  viewMode: 'pos' | 'tables';
  tableCarts: Record<string, CartItem[]>;       // Key: tableId -> Giỏ hàng riêng từng bàn
  tableDiscounts: Record<string, DiscountData>;  // Key: tableId -> Chiết khấu riêng từng bàn
}
```

---

## 2. CÁC ACTION NGHIỆP VỤ CỐT LÕI

| Action | Mô Tả Nghiệp Vụ |
| :--- | :--- |
| `selectTable(table)` | Chọn bàn làm việc hiện tại, tự động cập nhật giỏ hàng tương ứng |
| `setViewMode(mode)` | Chuyển đổi giữa chế độ `'tables'` (Sơ đồ bàn) và `'pos'` (Thực đơn) |
| `addToCart(data)` | Thêm món mới hoặc tăng số lượng món đã có cùng modifier vào giỏ bàn hiện tại |
| `updateCartItem(cartItemId, data)` | Chỉnh sửa Size, Topping hoặc Ghi chú của một món trong giỏ |
| `updateCartQty(cartItemId, delta)` | Tăng (+1) hoặc Giảm (-1) số lượng món |
| `removeCartItem(cartItemId)` | Xóa món khỏi giỏ hàng trước khi gửi bếp |
| `voidItem(cartItemId, reason, qty)` | Hủy món an ninh sau khi đã gửi bếp, lưu vết lý do |
| `applyDiscount(discount)` | Áp dụng mã giảm giá voucher hoặc % chiết khấu cho bàn hiện tại |
| `sendToKitchen()` | Đổi cờ `sentToKitchen: true`, cập nhật trạng thái bàn sang `co_khach` và phát âm thanh thành công |
| `moveTable(targetTableId)` | Chuyển toàn bộ giỏ hàng từ bàn hiện tại sang bàn trống mới |
| `mergeTable(targetTableId)` | Gộp giỏ hàng của bàn hiện tại vào bàn đích đã có khách |
| `splitTable(targetTableId, items)` | Tách một số món sang bàn mới |
| `checkoutSuccess(totalAmount)` | Xóa giỏ hàng của bàn, trả trạng thái bàn về `trong`, sẵn sàng đón khách mới |
