# 02 — COMPLETE API INVENTORY & SECURITY CONTROLS

Toàn bộ 65+ API endpoints thực tế được trích xuất trực tiếp từ `backend/cmd/server/main.go` và các handler tương ứng:

| # | METHOD | PATH | HANDLER | AUTH REQ | ROLE REQ | TENANT REQ | BRANCH REQ | RATE LIMIT | AUDIT LOG | DB ACCESS | SENSITIVE DATA |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | GET | `/health` | inline | NO | NONE | NO | NO | Global (30/s) | NO | None | None |
| 2 | GET | `/api/v1/health` | inline | NO | NONE | NO | NO | Global (30/s) | NO | None | None |
| 3 | GET | `/ws/pos` | `HandleWebSocket` | NO | NONE | Query (Untrusted) | Query (Untrusted) | Global | NO | None | Order, Cart, Price, Shift data |
| 4 | GET | `/api/v1/public/orders/latest/active` | `GetLatestActiveOrder` | NO | NONE | NO | NO | Global | NO | Read `orders` | Customer name, order items |
| 5 | POST | `/api/v1/public/cfd-sync` | `SyncCFDState` | NO | NONE | NO | NO | Global | NO | None | Live cart state |
| 6 | GET | `/api/v1/public/cfd-active` | `GetCFDActiveState` | NO | NONE | NO | NO | Global | NO | None | Live cart state |
| 7 | POST | `/api/v1/public/login` | `SaaSLogin` | NO | NONE | Body (`tenant_code`) | NO | Global | NO | Read `tenants`, `users` | User credentials, Token |
| 8 | POST | `/api/v1/public/register` | `RegisterTenant` | NO | NONE | Auto-gen | Auto-gen | Global | NO | Write `tenants`, `users`, `branches` | Phone, Store name, Hash |
| 9 | POST | `/api/v1/public/staff-pin` | `StaffPinLogin` | NO | NONE | Body (`tenant_id`) | NO | 5/2min (IP) | NO | Read `users` | PIN Code, Token |
| 10 | GET | `/api/v1/public/tenant/:code` | `GetTenantInfo` | NO | NONE | Param (`code`) | NO | Global | NO | Read `tenants`, `branches` | Store phone, Subscription |
| 11 | GET | `/api/v1/public/bills/:code` | `GetPublicBillJSON` | NO | NONE | Param (`code`) | NO | Global | NO | Read `orders`, `order_items` | Full bill details, Cashier, Amount |
| 12 | GET | `/b`, `/bill`, `/check-bill`, `/tra-cuu` | `RenderCheckBillPortal` | NO | NONE | NO | NO | Global | NO | None | None |
| 13 | GET | `/b/:code`, `/bill/:code` | `RenderPublicBill` | NO | NONE | Param (`code`) | NO | Global | NO | Read `orders` | Customer receipt HTML |
| 14 | POST | `/api/v1/devices/register` | `RegisterOrHeartbeatDevice` | Header `X-Tenant-ID` | NONE | Header | Header | Global | NO | Write `tenant_devices` | IP address, Device ID |
| 15 | GET | `/api/v1/orders` | `GetOrders` | Header `X-Tenant-ID` | NONE | Header | Query | Global | NO | Read `orders`, `order_items` | Financial sales records |
| 16 | GET | `/api/v1/orders/:id` | `GetOrderByID` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Read `orders`, `order_items` | Financial sales records |
| 17 | POST | `/api/v1/orders` | `CreateOrder` | Header `X-Tenant-ID` | NONE | Body/Header | Body | Global | NO | Write `orders`, `order_items`, `tables` | Financial sales transaction |
| 18 | POST | `/api/v1/orders/:id/pay` | `PayOrder` | Header `X-Tenant-ID` | NONE | Header | NO | Global | Partial | Write `orders`, `tables`, `shifts` | Payment amount, Method |
| 19 | POST | `/api/v1/orders/:id/pre-print` | `PrePrintOrder` | Header `X-Tenant-ID` | NONE | Header | NO | Global | YES | Write `audit_logs`, `tables` | Audit log |
| 20 | POST | `/api/v1/orders/:id/void` | `VoidOrder` | Body PIN | Manager PIN | Header | NO | Global | YES | Write `orders`, `tables`, `audit_logs` | Void reason, PIN |
| 21 | POST | `/api/v1/orders/:id/void-item` | `VoidOrderItem` | Body PIN | Manager PIN | Header | NO | Global | YES | Write `order_items`, `audit_logs` | Item void reason, PIN |
| 22 | GET | `/api/v1/orders/:id/vietqr` | `GetOrderVietQR` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Read `orders`, `pos_settings` | VietQR string & Bank Acc |
| 23 | GET | `/api/v1/tables` | `GetTables` | Header `X-Tenant-ID` | NONE | Header | Query | Global | NO | Read `dining_tables` | Table layout |
| 24 | POST | `/api/v1/tables` | `CreateTable` | Header `X-Tenant-ID` | NONE | Header | Body | Global | NO | Write `dining_tables` | Table config |
| 25 | PUT | `/api/v1/tables/:id` | `UpdateTable` | Header `X-Tenant-ID` | NONE | Header | Body | Global | NO | Write `dining_tables` | Table config |
| 26 | DELETE | `/api/v1/tables/:id` | `DeleteTable` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Delete `dining_tables` | Table deletion |
| 27 | POST | `/api/v1/tables/reorder` | `ReorderTables` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `dining_tables` | Layout order |
| 28 | POST | `/api/v1/tables/:id/pre-print` | `PrePrintTable` | Header `X-Tenant-ID` | NONE | Header | NO | Global | YES | Write `tables`, `audit_logs` | Audit log |
| 29 | POST | `/api/v1/tables/move` | `MoveTable` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `dining_tables`, `orders` | Table transfer |
| 30 | POST | `/api/v1/tables/merge` | `MergeTable` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `dining_tables`, `orders` | Table merge |
| 31 | POST | `/api/v1/tables/split` | `SplitTable` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `dining_tables`, `orders` | Table split |
| 32 | GET | `/api/v1/areas` | `GetAreas` | Header `X-Tenant-ID` | NONE | Header | Query | Global | NO | Read `areas` | Area names |
| 33 | POST | `/api/v1/areas` | `CreateArea` | Header `X-Tenant-ID` | NONE | Header | Body | Global | NO | Write `areas` | Area names |
| 34 | PUT | `/api/v1/areas/:id` | `UpdateArea` | Header `X-Tenant-ID` | NONE | Header | Body | Global | NO | Write `areas` | Area names |
| 35 | DELETE | `/api/v1/areas/:id` | `DeleteArea` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Delete `areas` | Area deletion |
| 36 | POST | `/api/v1/areas/reorder` | `ReorderAreas` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `areas` | Layout order |
| 37 | GET | `/api/v1/kds/orders` | `GetKDSOrders` | Header `X-Tenant-ID` | NONE | Header | Query | Global | NO | Read `orders`, `order_items` | Kitchen tickets |
| 38 | GET | `/api/v1/kds/tickets` | `GetKDSOrders` | Header `X-Tenant-ID` | NONE | Header | Query | Global | NO | Read `orders`, `order_items` | Kitchen tickets |
| 39 | GET | `/api/v1/kds/items/grouped` | `GetKDSGroupedItems` | Header `X-Tenant-ID` | NONE | Header | Query | Global | NO | Read `order_items` | Kitchen items |
| 40 | PATCH | `/api/v1/kds/items/:id/status` | `UpdateKDSItemStatus` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `order_items` | Kitchen item status |
| 41 | PATCH | `/api/v1/kds/orders/:id/status` | `UpdateKDSOrderStatus` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `orders`, `order_items` | Kitchen order status |
| 42 | GET | `/api/v1/categories` | `GetCategories` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Read `categories` | Menu categories |
| 43 | POST | `/api/v1/categories` | `CreateCategory` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `categories` | Menu categories |
| 44 | PUT | `/api/v1/categories/:id` | `UpdateCategory` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `categories` | Menu categories |
| 45 | DELETE | `/api/v1/categories/:id` | `DeleteCategory` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Delete `categories` | Menu categories |
| 46 | POST | `/api/v1/categories/reorder` | `ReorderCategories` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `categories` | Menu categories |
| 47 | GET | `/api/v1/products` | `GetProducts` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Read `products` | Product catalog & Cost price |
| 48 | POST | `/api/v1/products` | `CreateProduct` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `products` | Product catalog |
| 49 | PUT | `/api/v1/products/:id` | `UpdateProduct` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `products` | Product catalog |
| 50 | DELETE | `/api/v1/products/:id` | `DeleteProduct` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Delete `products` | Product catalog |
| 51 | POST | `/api/v1/products/reorder` | `ReorderProducts` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `products` | Menu order |
| 52 | POST | `/api/v1/products/:id/toggle-86` | `Toggle86` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `products` | Stock toggle |
| 53 | PATCH | `/api/v1/products/:id/price` | `UpdateProductPrice` | Header `X-Tenant-ID` | NONE | Header | NO | Global | YES | Write `products`, `audit_logs` | Price changes |
| 54 | GET | `/api/v1/staff` | `GetStaff` | Header `X-Tenant-ID` | NONE | Header | Query | Global | NO | Read `staff` | Staff phone, wage rate, info |
| 55 | POST | `/api/v1/staff` | `CreateStaff` | Header `X-Tenant-ID` | NONE | Header | Body | Global | NO | Write `staff` | Staff wage, salary rate |
| 56 | POST | `/api/v1/staff/:id/pay-salary` | `PayStaffSalary` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `staff_payrolls`, `cash_transactions` | Salary payment, Cash transaction |
| 57 | GET | `/api/v1/settings` | `GetSettings` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Read `pos_settings` | WiFi password, Bank Acc, Telegram token |
| 58 | PUT | `/api/v1/settings` | `UpdateSettings` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Write `pos_settings` | WiFi password, Bank Acc, Telegram token |
| 59 | POST | `/api/v1/settings/test-telegram` | `TestTelegramAlert` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Read `pos_settings` | Telegram Bot token |
| 60 | POST | `/api/v1/auth/verify-pin` | `VerifyPin` | Header `X-Tenant-ID` | NONE | Body/Header | NO | 5/2min (IP) | NO | Read `users` | Manager PIN code |
| 61 | POST | `/api/v1/cash/transactions` | `CreateCashTransaction` | Header `X-Tenant-ID` | NONE | Header | Body | Global | NO | Write `cash_transactions` | Cash transaction, amount |
| 62 | POST | `/api/v1/cash/transactions/:id/void` | `VoidCashTransaction` | Header `X-Tenant-ID` | NONE | Header | NO | Global | YES | Write `cash_transactions` | Void reason |
| 63 | GET | `/api/v1/cash/summary` | `GetCashSummary` | Header `X-Tenant-ID` | NONE | Header | Query | Global | NO | Read `cash_transactions`, `orders` | Total cash in drawer |
| 64 | POST | `/api/v1/shifts/open` | `OpenShift` | Header `X-Tenant-ID` | NONE | Header | Body | Global | NO | Write `cash_shifts` | Starting cash |
| 65 | POST | `/api/v1/shifts/:id/close` | `CloseShift` | Header `X-Tenant-ID` | NONE | Header | NO | Global | YES | Write `cash_shifts`, `audit_logs` | Actual ending cash, Difference |
| 66 | POST | `/api/v1/printer/print-receipt` | `PrintReceipt` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | None (Raw TCP 9100) | Order financial summary |
| 67 | POST | `/api/v1/printer/open-drawer` | `OpenDrawer` | Header `X-Tenant-ID` | NONE | Header | NO | Global | YES | None (Raw TCP 9100) | Cash drawer kick signal |
| 68 | POST | `/api/v1/webhook/bank-transfer` | `HandleBankTransferWebhook` | Token Header | NONE | NO | NO | Global | NO | None (Broadcast WS) | Bank account, Transaction amount |
| 69 | POST | `/api/v1/backup/restore` | `RestoreBackup` | Header `X-Tenant-ID` | NONE | Header | NO | Global | NO | Bulk Delete & Create | Entire menu & store config |
| 70 | POST | `/api/v1/sync/orders` | `SyncOrders` | Header `X-Tenant-ID` | NONE | Body/Header | Body | Global | NO | Write `orders`, `cash_shifts`, `ingredients` | Batch sales data |
| 71 | GET | `/api/v1/owner/pnl-summary` | `GetOwnerPnLSummary` | Header `X-Tenant-ID` | NONE | Header | Query | Global | NO | Read `orders`, `cash_transactions` | Net profit, Revenue, COGS |
| 72 | ALL | `/api/v1/saas/*` (20 endpoints) | `saas_admin.go` | `X-Admin-Key` Header | SaaS Admin | Landlord | NO | Global | NO | Full SaaS Platform CSDL | Tenant licenses, Pricing, Devices |
