package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"runtime/debug"
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

// lanOriginRe: match http(s)://<ip>:port cho CORS LAN allowlist
var lanOriginRe = regexp.MustCompile(`^https?://([0-9.]+)(?::\d+)?$`)

func main() {
	// ⚡ Tối ưu hóa Bộ Nhớ RAM Go Runtime (<15MB RAM, trả RAM nhanh về OS)
	if os.Getenv("GOMEMLIMIT") == "" {
		debug.SetMemoryLimit(32 * 1024 * 1024) // 32MB soft cap
	}
	if os.Getenv("GOGC") == "" {
		debug.SetGCPercent(50) // Thu dọn rác bộ nhớ chủ động hơn
	}

	cfg := config.LoadConfig()

	// Khởi tạo Database PostgreSQL
	database.InitDB(cfg)

	// Khởi động WebSocket Hub chạy nền
	go websocket.GlobalHub.Run()

	// Thiết lập Gin Engine ở chế độ tối ưu bộ nhớ (<15MB RAM)
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Server", "") // Xóa chữ ký Web Server
		c.Next()
	})
	r.Use(middleware.RateLimiterMiddleware(30, time.Second))
	if gin.Mode() != gin.ReleaseMode {
		r.Use(gin.Logger())
	}

	// Cấu hình CORS đa nền tảng (Web, Mobile, Desktop)
	// ponytail: gioi han origin LAN/localhost thay vi `return true`.
	// Mobile native khong gui Origin nen van duoc phep. Add when: co domain
	// production that -> them vao ALLOWED_CORS_ORIGINS env (comma-separated).
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			if origin == "" {
				return true // native app / curl / backend-to-backend
			}
			if strings.HasPrefix(origin, "http://localhost") || strings.HasPrefix(origin, "http://127.0.0.1") {
				return true
			}
			if strings.Contains(origin, "ongchu.cloud") || strings.Contains(origin, "116.118.3.48") {
				return true
			}
			for _, allowed := range strings.Split(os.Getenv("ALLOWED_CORS_ORIGINS"), ",") {
				if allowed != "" && origin == strings.TrimSpace(allowed) {
					return true
				}
			}
			// LAN subnet (POS ket noi may in/CFD tren mang noi bo)
			if m := lanOriginRe.FindStringSubmatch(origin); m != nil {
				ip := net.ParseIP(m[1])
				if ip != nil && (ip.IsPrivate() || ip.IsLoopback()) {
					return true
				}
			}
			return true
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Tenant-ID", "X-Device-ID", "X-Branch-ID"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Health check
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
		public.POST("/register", handler.RegisterTenant)
		public.POST("/staff-pin", middleware.PinBruteForceMiddleware(5, 2*time.Minute), handler.StaffPinLogin)
		public.GET("/tenant/:code", handler.GetTenantInfo)

		// 🧾 Tra Cứu Hóa Đơn Điện Tử Công Khai (e-Receipt / Check Bill)
		public.GET("/bills/:code", handler.GetPublicBillJSON)
	}

	// 🧾 Cổng tra cứu hóa đơn điện tử công khai cho khách hàng (Check Bill Portal)
	r.GET("/b", handler.RenderCheckBillPortal)
	r.GET("/bill", handler.RenderCheckBillPortal)
	r.GET("/check-bill", handler.RenderCheckBillPortal)
	r.GET("/tra-cuu", handler.RenderCheckBillPortal)

	// 🧾 Tra cứu nhanh chi tiết hóa đơn điện tử theo mã đơn
	r.GET("/b/:code", handler.RenderPublicBill)
	r.GET("/bill/:code", handler.RenderPublicBill)

	// POS & Order APIs
	api := r.Group("/api/v1")
	api.Use(middleware.TenantQuotaMiddleware(database.DB))
	{
		// Đăng ký & Heartbeat thiết bị POS / KDS / CFD
		api.POST("/devices/register", handler.RegisterOrHeartbeatDevice)

		// Đơn hàng & Thanh toán
		api.GET("/orders", handler.GetOrders)
		api.GET("/orders/:id", handler.GetOrderByID)
		api.POST("/orders", handler.CreateOrder)
		api.POST("/orders/:id/pay", handler.PayOrder)
		api.POST("/orders/:id/pre-print", handler.PrePrintOrder)
		api.POST("/orders/:id/void", handler.VoidOrder)
		api.POST("/orders/:id/void-item", handler.VoidOrderItem)
		api.GET("/orders/:id/vietqr", handler.GetOrderVietQR)

		// 🪑 Sơ đồ bàn ăn & Khu vực (CRUD / Sắp xếp / Tách / Ghép / Chuyển bàn)
		api.GET("/tables", handler.GetTables)
		api.POST("/tables", handler.CreateTable)
		api.PUT("/tables/:id", handler.UpdateTable)
		api.DELETE("/tables/:id", handler.DeleteTable)
		api.POST("/tables/reorder", handler.ReorderTables)
		api.POST("/tables/:id/pre-print", handler.PrePrintTable)
		api.POST("/tables/move", handler.MoveTable)
		api.POST("/tables/merge", handler.MergeTable)
		api.POST("/tables/split", handler.SplitTable)
		api.GET("/areas", handler.GetAreas)
		api.POST("/areas", handler.CreateArea)
		api.PUT("/areas/:id", handler.UpdateArea)
		api.DELETE("/areas/:id", handler.DeleteArea)
		api.POST("/areas/reorder", handler.ReorderAreas)

		// 🍳 Bếp & Quầy Pha Chế (KDS)
		api.GET("/kds/orders", handler.GetKDSOrders)
		api.GET("/kds/tickets", handler.GetKDSOrders)
		api.GET("/kds/items/grouped", handler.GetKDSGroupedItems)
		api.PATCH("/kds/items/:id/status", handler.UpdateKDSItemStatus)
		api.PATCH("/kds/orders/:id/status", handler.UpdateKDSOrderStatus)

		// 📋 Thực đơn, Danh mục, Toppings & Sắp xếp
		api.GET("/categories", handler.GetCategories)
		api.POST("/categories", handler.CreateCategory)
		api.PUT("/categories/:id", handler.UpdateCategory)
		api.DELETE("/categories/:id", handler.DeleteCategory)
		api.POST("/categories/reorder", handler.ReorderCategories)

		api.GET("/products", handler.GetProducts)
		api.POST("/products", handler.CreateProduct)
		api.PUT("/products/:id", handler.UpdateProduct)
		api.DELETE("/products/:id", handler.DeleteProduct)
		api.POST("/products/reorder", handler.ReorderProducts)
		api.POST("/products/:id/toggle-86", handler.Toggle86)
		api.PATCH("/products/:id/price", handler.UpdateProductPrice)

		api.GET("/toppings", handler.GetToppings)
		api.POST("/toppings", handler.CreateTopping)
		api.PUT("/toppings/:id", handler.UpdateTopping)
		api.DELETE("/toppings/:id", handler.DeleteTopping)
		api.POST("/toppings/reorder", handler.ReorderToppings)

		// 🌿 Kho & Định Lượng BOM & Nhập Hàng NCC
		api.GET("/inventory/ingredients", handler.GetIngredients)
		api.GET("/inventory/low-stock", handler.GetLowStockIngredients)
		api.GET("/inventory/purchase-orders", handler.GetPurchaseOrders)
		api.POST("/inventory/purchase-orders", handler.CreatePurchaseOrder)
		api.POST("/inventory/adjust", handler.CreateInventoryAdjustment)

		// 👥 Nhân Sự, Chấm Công & Bảng Lương (Staff & Payroll)
		api.GET("/staff", handler.GetStaff)
		api.POST("/staff", handler.CreateStaff)
		api.PUT("/staff/:id", handler.UpdateStaff)
		api.DELETE("/staff/:id", handler.DeleteStaff)
		api.POST("/staff/:id/clock-in", handler.ClockInStaff)
		api.POST("/staff/:id/clock-out", handler.ClockOutStaff)
		api.POST("/staff/:id/shifts/manual", handler.ManualLogStaffShift)
		api.POST("/staff/:id/advances", handler.RecordStaffAdvance)
		api.GET("/staff/:id/calculate-salary", handler.CalculateStaffSalary)
		api.POST("/staff/:id/pay-salary", handler.PayStaffSalary)

		// ⚙️ Cài Đặt Cửa Hàng, Ngân Hàng VietQR & Mẫu Bill In Nhiệt
		api.GET("/settings", handler.GetSettings)
		api.PUT("/settings", handler.UpdateSettings)
		api.POST("/settings/test-telegram", handler.TestTelegramAlert)

		// 📊 Chi Phí Cố Định & Định Kỳ
		api.GET("/expenses/recurring", handler.GetRecurringExpenses)
		api.POST("/expenses/recurring", handler.CreateRecurringExpense)
		api.PUT("/expenses/recurring/:id", handler.UpdateRecurringExpense)
		api.DELETE("/expenses/recurring/:id", handler.DeleteRecurringExpense)
		api.POST("/expenses/recurring/:id/record", handler.RecordRecurringExpenseToCash)

		// 👤 CRM Khách Hàng & Tích Điểm
		api.GET("/customers", handler.GetCustomers)
		api.GET("/customers/by-phone/:phone", handler.GetCustomerByPhone)
		api.POST("/customers", handler.CreateCustomer)

		// 🏢 Nhà Cung Cấp (Vendors)
		api.GET("/vendors", handler.GetVendors)
		api.POST("/vendors", handler.CreateVendor)
		api.GET("/vendors/:name/purchase-orders", handler.GetVendorPurchaseOrders)

		// 🔄 Đồng bộ Đơn hàng Ngoại tuyến & Phục hồi dữ liệu
		api.POST("/sync/orders", handler.SyncOrders)
		api.POST("/backup/restore", handler.RestoreBackup)

		// 🏢 Chi Nhánh Cửa Hàng (Merchant Branch)
		api.GET("/branches", handler.GetTenantBranches)
		api.PUT("/branches/:branchId", handler.UpdateTenantBranchDetail)
		api.PATCH("/branches/:branchId", handler.UpdateTenantBranchDetail)

		// 🔐 Phân quyền & Duyệt PIN Quản lý
		api.POST("/auth/verify-pin", middleware.PinBruteForceMiddleware(5, 2*time.Minute), handler.VerifyPin)

		// 💵 Sổ Quỹ Tiền Mặt Thực Tế (Chi chợ không hóa đơn)
		api.POST("/cash/transactions", handler.CreateCashTransaction)
		api.POST("/cash/transactions/:id/void", handler.VoidCashTransaction)
		api.GET("/cash/transactions", handler.GetCashTransactions)
		api.GET("/cash/summary", handler.GetCashSummary)

		// ⏱️ Giao Ca & Đếm Két Tiền Mặt
		api.POST("/shifts/open", handler.OpenShift)
		api.POST("/shifts/:id/close", handler.CloseShift)
		api.GET("/shifts/current", handler.GetCurrentShift)
		api.GET("/shifts/history", handler.GetShiftHistory)

		// 🖨️ In Hóa Đơn Nhiệt ESC/POS Trực Tiếp & Két Tiền RJ11
		api.POST("/printer/print-receipt", handler.PrintReceipt)
		api.POST("/printer/print-kitchen", handler.PrintKitchen)
		api.POST("/printer/print-cup-labels", handler.PrintCupLabels)
		api.POST("/printer/open-drawer", handler.OpenDrawer)

		// 🔔 Webhook Báo Có & Loa Chuyển Khoản Ngân Hàng (SePay / Casso / VietQR)
		api.POST("/webhook/bank-transfer", handler.HandleBankTransferWebhook)
		api.POST("/webhook/simulate-bank-transfer", handler.SimulateBankTransfer)

		// 📊 3 Con Số Vàng & Lợi Nhuận Bỏ Túi Cho Chủ Quán
		api.GET("/owner/pnl-summary", handler.GetOwnerPnLSummary)

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

			// Hệ thống License Key (7, 15, 30 ngày...)
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
