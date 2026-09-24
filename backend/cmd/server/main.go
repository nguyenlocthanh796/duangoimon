package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/config"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/handler"
	"github.com/ongchu/pos-backend/internal/middleware"
	"github.com/ongchu/pos-backend/internal/websocket"
)

func main() {
	cfg := config.LoadConfig()

	// Khởi tạo CSDL Dual-Engine (PostgreSQL với SQLite WAL Fallback)
	database.InitDB(cfg)

	// Khởi động WebSocket Hub Goroutine
	go websocket.GlobalHub.Run()

	r := gin.Default()

	// Cấu hình CORS chặt chẽ theo Origin
	allowedOrigins := []string{
		"http://localhost:8080",
		"http://localhost:8081",
		"http://localhost:8082",
		"http://localhost:8085",
		"http://localhost:19006",
		"https://ongchu.cloud",
		"https://www.ongchu.cloud",
		"https://app.ongchu.cloud",
	}

	if customOrigins := os.Getenv("ALLOWED_CORS_ORIGINS"); customOrigins != "" {
		for _, o := range strings.Split(customOrigins, ",") {
			trimmed := strings.TrimSpace(o)
			if trimmed != "" {
				allowedOrigins = append(allowedOrigins, trimmed)
			}
		}
	}

	corsConfig := cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Tenant-ID", "X-Branch-ID", "X-Admin-Key", "X-Webhook-Token", "X-Device-ID"},
		ExposeHeaders:    []string{"Content-Length", "X-Total-Count"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	// Cho phép LAN IPs cho thiết bị POS nội bộ
	corsConfig.AllowOriginFunc = func(origin string) bool {
		if strings.HasPrefix(origin, "http://192.168.") ||
			strings.HasPrefix(origin, "http://10.") ||
			strings.HasPrefix(origin, "http://172.16.") ||
			strings.HasPrefix(origin, "http://localhost") ||
			strings.HasPrefix(origin, "http://127.0.0.1") {
			return true
		}
		for _, o := range allowedOrigins {
			if strings.EqualFold(origin, o) {
				return true
			}
		}
		return os.Getenv("GIN_MODE") != "release"
	}

	r.Use(cors.New(corsConfig))
	r.Use(middleware.RateLimiterMiddleware(30, 60))

	healthHandler := func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "OngChu POS — Cái Tâm Vị Chủ Quán",
			"version": "2.0.0",
		})
	}
	r.GET("/health", healthHandler)
	r.GET("/api/v1/health", healthHandler)

	// WebSocket Endpoint
	r.GET("/ws/pos", websocket.HandleWebSocket)

	// Public CFD, Web QR & SaaS Auth APIs
	public := r.Group("/api/v1/public")
	{
		public.GET("/orders/latest/active", handler.GetLatestActiveOrder)
		public.POST("/cfd-sync", handler.SyncCFDState)
		public.GET("/cfd-active", handler.GetCFDActiveState)

		// 🏢 SaaS Multi-Tenant Authentication & Self-Serve Registration
		public.POST("/login", handler.SaaSLogin)
		public.POST("/saas-login", handler.SaaSAdminLogin)
		public.POST("/register", handler.RegisterTenant)
		public.POST("/refresh-token", handler.RefreshToken)
		public.POST("/staff-pin", middleware.PinBruteForceMiddleware(5, 2*time.Minute), handler.StaffPinLogin)
		public.GET("/tenant/:code", handler.GetTenantInfo)

		// 🧾 Tra Cứu Hóa Đơn Điện Tử Công Khai (e-Receipt / Check Bill)
		public.GET("/bills/:code", handler.GetPublicBillJSON)
	}

	// 🧾 Cổng tra cứu hóa đơn điện tử công khai cho khách hàng
	r.GET("/b", handler.RenderCheckBillPortal)
	r.GET("/bill", handler.RenderCheckBillPortal)
	r.GET("/check-bill", handler.RenderCheckBillPortal)
	r.GET("/tra-cuu", handler.RenderCheckBillPortal)
	r.GET("/b/:code", handler.RenderPublicBill)
	r.GET("/bill/:code", handler.RenderPublicBill)

	// Webhook ngân hàng (Xác thực qua X-Webhook-Token độc lập)
	r.POST("/api/v1/webhook/bank-transfer", handler.HandleBankTransferWebhook)
	r.POST("/api/v1/webhook/simulate-bank-transfer", handler.SimulateBankTransfer)

	// Protected POS & Order APIs (Yêu cầu JWT Bearer Token + Quota Check)
	api := r.Group("/api/v1")
	api.Use(middleware.JWTAuthMiddleware())
	api.Use(middleware.TenantQuotaMiddleware(database.DB))
	{
		// Đăng xuất
		api.POST("/auth/logout", handler.Logout)

		// Đăng ký & Heartbeat thiết bị POS / KDS / CFD
		api.POST("/devices/register", handler.RegisterOrHeartbeatDevice)

		// Đơn hàng & Thanh toán
		api.GET("/orders", middleware.RequirePermission("orders.read"), handler.GetOrders)
		api.GET("/orders/:id", middleware.RequirePermission("orders.read"), handler.GetOrderByID)
		api.POST("/orders", middleware.RequirePermission("orders.create"), handler.CreateOrder)
		api.POST("/orders/:id/pay", middleware.RequirePermission("orders.pay"), handler.PayOrder)
		api.POST("/orders/:id/pre-print", handler.PrePrintOrder)
		api.POST("/orders/:id/void", middleware.RequirePermission("orders.void"), handler.VoidOrder)
		api.POST("/orders/:id/void-item", middleware.RequirePermission("orders.void"), handler.VoidOrderItem)
		api.GET("/orders/:id/vietqr", handler.GetOrderVietQR)

		// 🪑 Sơ đồ bàn ăn & Khu vực
		api.GET("/tables", handler.GetTables)
		api.POST("/tables", middleware.RequirePermission("tables.manage"), handler.CreateTable)
		api.PUT("/tables/:id", middleware.RequirePermission("tables.manage"), handler.UpdateTable)
		api.DELETE("/tables/:id", middleware.RequirePermission("tables.manage"), handler.DeleteTable)
		api.POST("/tables/reorder", middleware.RequirePermission("tables.manage"), handler.ReorderTables)
		api.POST("/tables/:id/pre-print", handler.PrePrintTable)
		api.POST("/tables/move", handler.MoveTable)
		api.POST("/tables/merge", handler.MergeTable)
		api.POST("/tables/split", handler.SplitTable)

		api.GET("/areas", handler.GetAreas)
		api.POST("/areas", middleware.RequirePermission("areas.manage"), handler.CreateArea)
		api.PUT("/areas/:id", middleware.RequirePermission("areas.manage"), handler.UpdateArea)
		api.DELETE("/areas/:id", middleware.RequirePermission("areas.manage"), handler.DeleteArea)
		api.POST("/areas/reorder", middleware.RequirePermission("areas.manage"), handler.ReorderAreas)

		// 🍳 Bếp & Quầy Pha Chế (KDS)
		api.GET("/kds/orders", handler.GetKDSOrders)
		api.GET("/kds/tickets", handler.GetKDSOrders)
		api.GET("/kds/items/grouped", handler.GetKDSGroupedItems)
		api.PATCH("/kds/items/:id/status", handler.UpdateKDSItemStatus)
		api.PATCH("/kds/orders/:id/status", handler.UpdateKDSOrderStatus)

		// 📋 Thực đơn, Danh mục, Toppings & Sắp xếp
		api.GET("/categories", handler.GetCategories)
		api.POST("/categories", middleware.RequirePermission("categories.manage"), handler.CreateCategory)
		api.PUT("/categories/:id", middleware.RequirePermission("categories.manage"), handler.UpdateCategory)
		api.DELETE("/categories/:id", middleware.RequirePermission("categories.manage"), handler.DeleteCategory)
		api.POST("/categories/reorder", middleware.RequirePermission("categories.manage"), handler.ReorderCategories)

		api.GET("/products", handler.GetProducts)
		api.POST("/products", middleware.RequirePermission("products.create"), handler.CreateProduct)
		api.PUT("/products/:id", middleware.RequirePermission("products.update"), handler.UpdateProduct)
		api.DELETE("/products/:id", middleware.RequirePermission("products.delete"), handler.DeleteProduct)
		api.POST("/products/reorder", middleware.RequirePermission("products.update"), handler.ReorderProducts)
		api.POST("/products/:id/toggle-86", handler.Toggle86)
		api.PATCH("/products/:id/price", middleware.RequirePermission("products.price.update"), handler.UpdateProductPrice)

		api.GET("/toppings", handler.GetToppings)
		api.POST("/toppings", middleware.RequirePermission("products.create"), handler.CreateTopping)
		api.PUT("/toppings/:id", middleware.RequirePermission("products.update"), handler.UpdateTopping)
		api.DELETE("/toppings/:id", middleware.RequirePermission("products.delete"), handler.DeleteTopping)
		api.POST("/toppings/reorder", middleware.RequirePermission("products.update"), handler.ReorderToppings)

		// 🌿 Kho & Định Lượng BOM & Nhập Hàng NCC
		api.GET("/inventory/ingredients", handler.GetIngredients)
		api.POST("/inventory/ingredients", handler.CreateIngredient)
		api.PUT("/inventory/ingredients/:id", handler.UpdateIngredient)
		api.DELETE("/inventory/ingredients/:id", handler.DeleteIngredient)
		api.GET("/inventory/low-stock", handler.GetLowStockIngredients)
		api.GET("/inventory/purchase-orders", handler.GetPurchaseOrders)
		api.POST("/inventory/purchase-orders", handler.CreatePurchaseOrder)
		api.POST("/inventory/adjust", middleware.RequirePermission("inventory.adjust"), handler.CreateInventoryAdjustment)

		// 👥 Nhân Sự, Chấm Công & Bảng Lương (Staff & Payroll)
		api.GET("/staff", middleware.RequirePermission("staff.manage"), handler.GetStaff)
		api.POST("/staff", middleware.RequireRole("owner", "manager"), handler.CreateStaff)
		api.PUT("/staff/:id", middleware.RequireRole("owner", "manager"), handler.UpdateStaff)
		api.DELETE("/staff/:id", middleware.RequireRole("owner"), handler.DeleteStaff)
		api.POST("/staff/:id/clock-in", handler.ClockInStaff)
		api.POST("/staff/:id/clock-out", handler.ClockOutStaff)
		api.POST("/staff/:id/shifts/manual", middleware.RequireRole("owner", "manager"), handler.ManualLogStaffShift)
		api.POST("/staff/:id/advances", middleware.RequireRole("owner", "manager"), handler.RecordStaffAdvance)
		api.GET("/staff/:id/calculate-salary", middleware.RequireRole("owner", "manager"), handler.CalculateStaffSalary)
		api.POST("/staff/:id/pay-salary", middleware.RequireRole("owner"), middleware.RequirePermission("staff.pay"), handler.PayStaffSalary)

		// ⚙️ Cài Đặt Cửa Hàng, Ngân Hàng VietQR & Mẫu Bill In Nhiệt
		api.GET("/settings", handler.GetSettings)
		api.PUT("/settings", middleware.RequireRole("owner"), middleware.RequirePermission("settings.update"), handler.UpdateSettings)
		api.POST("/settings/test-telegram", middleware.RequireRole("owner"), handler.TestTelegramAlert)

		// 📊 Chi Phí Cố Định & Định Kỳ
		api.GET("/expenses/recurring", handler.GetRecurringExpenses)
		api.POST("/expenses/recurring", middleware.RequireRole("owner", "manager"), handler.CreateRecurringExpense)
		api.PUT("/expenses/recurring/:id", middleware.RequireRole("owner", "manager"), handler.UpdateRecurringExpense)
		api.DELETE("/expenses/recurring/:id", middleware.RequireRole("owner"), handler.DeleteRecurringExpense)
		api.POST("/expenses/recurring/:id/record", middleware.RequireRole("owner", "manager"), handler.RecordRecurringExpenseToCash)

		// 👤 CRM Khách Hàng & Tích Điểm
		api.GET("/customers", handler.GetCustomers)
		api.GET("/customers/by-phone/:phone", handler.GetCustomerByPhone)
		api.POST("/customers", handler.CreateCustomer)

		// 🏢 Nhà Cung Cấp (Vendors)
		api.GET("/vendors", handler.GetVendors)
		api.POST("/vendors", handler.CreateVendor)
		api.GET("/vendors/:name/purchase-orders", handler.GetVendorPurchaseOrders)

		// 🔄 Đồng bộ Đơn hàng Ngoại tuyến & Phục hồi dữ liệu (Owner Only for Destructive Restore)
		api.POST("/sync/orders", handler.SyncOrders)
		api.POST("/backup/restore", middleware.RequireRole("owner"), middleware.RequirePermission("backup.restore"), handler.RestoreBackup)

		// 🏢 Chi Nhánh Cửa Hàng (Merchant Branch)
		api.GET("/branches", handler.GetTenantBranches)
		api.PUT("/branches/:branchId", middleware.RequireRole("owner"), handler.UpdateTenantBranchDetail)
		api.PATCH("/branches/:branchId", middleware.RequireRole("owner"), handler.UpdateTenantBranchDetail)

		// 🔐 Phân quyền & Duyệt PIN Quản lý
		api.POST("/auth/verify-pin", middleware.PinBruteForceMiddleware(5, 2*time.Minute), handler.VerifyPin)

		// 💵 Sổ Quỹ Tiền Mặt Thực Tế (Chi chợ không hóa đơn)
		api.POST("/cash/transactions", middleware.RequirePermission("cash.transaction.create"), handler.CreateCashTransaction)
		api.POST("/cash/transactions/:id/void", middleware.RequirePermission("cash.transaction.void"), handler.VoidCashTransaction)
		api.GET("/cash/transactions", handler.GetCashTransactions)
		api.GET("/cash/summary", middleware.RequirePermission("cash.summary.read"), handler.GetCashSummary)

		// ⏱️ Giao Ca & Đếm Két Tiền Mặt
		api.POST("/shifts/open", middleware.RequirePermission("shifts.manage"), handler.OpenShift)
		api.POST("/shifts/:id/close", middleware.RequirePermission("shifts.manage"), handler.CloseShift)
		api.GET("/shifts/current", handler.GetCurrentShift)
		api.GET("/shifts/history", handler.GetShiftHistory)

		// 🖨️ In Hóa Đơn Nhiệt ESC/POS Trực Tiếp & Két Tiền RJ11
		api.POST("/printer/print-receipt", handler.PrintReceipt)
		api.POST("/printer/print-kitchen", handler.PrintKitchen)
		api.POST("/printer/print-cup-labels", handler.PrintCupLabels)
		api.POST("/printer/open-drawer", middleware.RequirePermission("cash.drawer.open"), handler.OpenDrawer)

		// 📊 3 Con Số Vàng & Lợi Nhuận Bỏ Túi Cho Chủ Quán
		api.GET("/owner/pnl-summary", middleware.RequirePermission("reports.pnl.read"), handler.GetOwnerPnLSummary)

		// 🏢 SaaS Platform Landlord / Super Admin APIs
		saas := api.Group("/saas")
		saas.Use(middleware.SaaSAdminAuthMiddleware())
		{
			saas.GET("/overview", handler.GetSaaSOverview)
			saas.GET("/tenants", handler.GetSaaSTenants)
			saas.POST("/tenants", handler.CreateSaaSTenant)
			saas.DELETE("/tenants/:id", handler.DeleteSaaSTenant)
			saas.PATCH("/tenants/:id/status", handler.ToggleTenantStatus)
			saas.POST("/tenants/:id/renew", handler.RenewTenantLicense)
			saas.POST("/tenants/:id/rescue-pin", handler.ResetTenantPin)
			saas.GET("/tenants/:id/devices", handler.GetTenantDevices)
			saas.POST("/tenants/:id/devices/register", handler.RegisterOrHeartbeatDevice)
			saas.DELETE("/tenants/:id/devices/:deviceId", handler.UnbindTenantDevice)
			saas.GET("/tenants/:id/addons", handler.GetTenantAddons)
			saas.PUT("/tenants/:id/addons", handler.UpdateTenantAddon)
			saas.PATCH("/tenants/:id/addons/:addonCode", handler.UpdateTenantAddon)
			saas.GET("/tenants/:id/invoices", handler.GetTenantInvoices)
			saas.GET("/tenants/:id/branches", handler.GetTenantBranches)
			saas.POST("/tenants/:id/branches", handler.CreateTenantBranch)
			saas.PUT("/tenants/:id/branches/:branchId", handler.UpdateTenantBranchDetail)
			saas.PATCH("/tenants/:id/branches/:branchId", handler.UpdateTenantBranchDetail)
			saas.PATCH("/tenants/:id/branches/:branchId/status", handler.ToggleTenantBranchStatus)
			saas.PATCH("/tenants/:id/plan", handler.UpdateTenantPlan)

			// Bảng giá & Ma trận tính năng động
			saas.GET("/plans", handler.GetSaaSPricingPlans)
			saas.PUT("/plans/:planId", handler.UpdateSaaSPlanConfig)
			saas.POST("/plans/reset", handler.ResetSaaSPlanConfigs)

			// Hệ thống License Key
			saas.GET("/license-keys", handler.GetLicenseKeys)
			saas.POST("/license-keys", handler.CreateLicenseKey)
			saas.POST("/license-keys/redeem", handler.RedeemLicenseKey)
			saas.DELETE("/license-keys/:key", handler.DeleteLicenseKey)
		}
	}

	log.Printf("🚀 OngChu POS Merchant Engine starting on port :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
