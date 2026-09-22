# 🗄️ CẤU TRÚC CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)

CSDL chính: PostgreSQL 16 Alpine (hoặc SQLite cho môi trường Standalone nhúng).

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│    tenants    │──────<│   branches    │──────<│     users     │
└───────────────┘       └───────────────┘       └───────────────┘
                                │                       │
                                ▼                       ▼
                        ┌───────────────┐       ┌───────────────┐
                        │ dining_tables │       │  cash_shifts  │
                        └───────┬───────┘       └───────┬───────┘
                                │                       │
                                ▼                       ▼
                        ┌───────────────┐       ┌───────────────────┐
                        │    orders     │       │ cash_transactions │
                        └───────┬───────┘       └───────────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │  order_items  │
                        └───────┬───────┘
                                │
                                ▼
                        ┌───────────────┐
                        │   products    │───────┐
                        └───────────────┘       ▼
                                        ┌───────────────┐
                                        │ recipe_items  │
                                        └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │  ingredients  │
                                        └───────────────┘
```

## 1. BẢNG THỰC THỂ CỐT LÕI

- **`tenants` & `branches`**: Hỗ trợ chuỗi nhiều chi nhánh độc lập.
- **`users`**: Tài khoản nhân viên phân quyền theo vai trò (`owner`, `manager`, `cashier`, `waiter`, `kitchen`).
- **`categories` & `products`**: Danh mục và món ăn, mã SKU, giá bán, đường dẫn ảnh.
- **`ingredients` & `recipe_items`**: Định mức nguyên vật liệu (BOM) để tự động tính Food Cost chính xác đến từng gam đường, giọt sữa.
- **`dining_tables`**: Danh sách bàn theo khu vực (`area`), trạng thái (`trong`, `co_khach`, `da_dat`), số lượng khách và số tiền tạm tính.
- **`orders` & `order_items`**: Đơn hàng, các món đã gọi kèm Topping/Size, số tiền giảm giá, phương thức thanh toán (`tien_mat`, `chuyen_khoan_vietqr`).
- **`cash_transactions`**: Sổ quỹ tiền mặt Thu / Chi chợ.
- **`cash_shifts`**: Ca làm việc, đối soát tiền két thực tế và tiền lý thuyết.
- **`audit_logs`**: Nhật ký an ninh lưu vết toàn bộ hành vi hủy món, in tạm tính, mở két tay và lệch tiền giao ca.
- **`pos_settings`**: Cấu hình thông tin quán in trên hóa đơn, tài khoản nhận tiền VietQR Napas247.
