# POSA Mock Server v1.0

Mock RESTful API server cho hệ thống POSA — quản lý nhà hàng, kế toán, và thuế HKD.

## Quick Start

```bash
# 1. Install dependencies (lần đầu)
cd mock-server
npm install

# 2. Start server
node server.cjs

# Hoặc từ frontend:
cd frontend
npm run mock
```

## API Endpoints

### Module quản lý (quan-ly)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/quan-ly/dashboard` | Dashboard tổng quan |
| GET | `/api/v1/quan-ly/exec-dashboard` | Dashboard điều hành |
| GET | `/api/v1/quan-ly/audit-logs` | Audit logs |
| GET | `/api/v1/quan-ly/branches` | Danh sách chi nhánh |
| POST | `/api/v1/quan-ly/branches` | Thêm chi nhánh |
| PUT | `/api/v1/quan-ly/branches/:id` | Sửa chi nhánh |
| DELETE | `/api/v1/quan-ly/branches/:id` | Xóa chi nhánh |
| GET | `/api/v1/quan-ly/stations` | Danh sách trạm bếp |
| GET | `/api/v1/quan-ly/suppliers` | Danh sách nhà cung cấp |
| GET | `/api/v1/quan-ly/raw-materials` | Nguyên liệu / tồn kho |
| GET | `/api/v1/quan-ly/products` | Menu sản phẩm |
| GET | `/api/v1/quan-ly/recipes` | Công thức chế biến |
| GET | `/api/v1/quan-ly/customers` | Khách hàng |
| GET | `/api/v1/quan-ly/booking` | Đặt bàn |
| GET | `/api/v1/quan-ly/membership/tiers` | Hạng thành viên |
| GET | `/api/v1/quan-ly/shifts` | Danh sách ca |
| GET | `/api/v1/quan-ly/shifts/active` | Ca đang làm |
| POST | `/api/v1/quan-ly/shifts/start` | Bắt đầu ca |
| POST | `/api/v1/quan-ly/shifts/end` | Kết thúc ca |
| GET | `/api/v1/quan-ly/users` | Người dùng |
| GET | `/api/v1/quan-ly/tables` | Bàn ăn |
| GET | `/api/v1/quan-ly/purchase-orders` | Đơn đặt hàng |
| GET | `/api/v1/quan-ly/menu-eng/matrix` | Ma trận menu engineering |
| GET | `/api/v1/quan-ly/reports/bi/revenue` | Báo cáo doanh thu |
| GET | `/api/v1/quan-ly/reports/sales` | Báo cáo bán hàng |
| GET | `/api/v1/quan-ly/forecast/demand` | Dự báo nhu cầu |

### Module kế toán (ke-toan)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/ke-toan/transactions` | Giao dịch thu chi |
| POST | `/api/v1/ke-toan/transactions/bulk-delete` | Xóa hàng loạt |
| GET | `/api/v1/ke-toan/invoices` | Hóa đơn |
| GET | `/api/v1/ke-toan/orders/paid` | Đơn hàng đã thanh toán |

### Module thuế (thue — HKD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/thue/profiles/:branchId` | Hồ sơ thuế HKD |
| PATCH | `/api/v1/thue/profiles/:id` | Cập nhật hồ sơ |
| POST | `/api/v1/thue/profiles` | Tạo hồ sơ mới |
| GET | `/api/v1/thue/bank-accounts/:branchId` | Tài khoản ngân hàng |
| GET | `/api/v1/thue/deadlines/:branchId` | Hạn nộp tờ khai |
| GET | `/api/v1/thue/report/:branchId` | Sổ sách kế toán |
| GET | `/api/v1/thue/declaration/:form/:branchId` | XML tờ khai |
| POST | `/api/v1/thue/declaration/submit` | Nộp tờ khai |
| POST | `/api/v1/thue/legacy-inventory/checklist/:branchId` | Kiểm kê tồn kho |

## WebSocket

```
ws://localhost:8000/ws/inventory
```

Real-time inventory data. Tự động gửi danh sách nguyên liệu khi client kết nối.

## Utility

```bash
# Reset dữ liệu về seed ban đầu
curl -X POST http://localhost:8000/api/v1/reset

# Xem trạng thái
curl http://localhost:8000/api/v1/status
```

## Seed Data

Server có sẵn 203 records tiếng Việt:

- 3 chi nhánh (Trung Tâm, Sân Bay, Phú Mỹ Hưng)
- 10 món ăn (Phở Bò, Bún Chả, Cà Phê Sữa Đá...)
- 7 khách hàng với lịch sử chi tiêu
- 50 audit logs
- 30 giao dịch thu chi
- 20 hóa đơn
- + nhiều dữ liệu khác
