package testsuite

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/handler"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	hubStartOnce sync.Once
	testEnvMu    sync.Mutex
)

// SetupTestEnv initializes an isolated in-memory SQLite database,
// executes AutoMigrate for all models, sets database.DB, and starts the test router.
func SetupTestEnv(t *testing.T) (*gorm.DB, *gin.Engine) {
	testEnvMu.Lock()
	defer testEnvMu.Unlock()

	// Ensure WebSocket Hub background worker is running strictly once
	hubStartOnce.Do(func() {
		go websocket.GlobalHub.Run()
	})

	gin.SetMode(gin.TestMode)

	// Create a unique in-memory SQLite database per invocation
	dbURI := fmt.Sprintf("file:mem_%d?mode=memory&cache=shared", time.Now().UnixNano())
	db, err := gorm.Open(sqlite.Open(dbURI), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to initialize in-memory SQLite: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("Failed to get underlying sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)

	// Auto-migrate all models
	err = db.AutoMigrate(
		&models.Tenant{},
		&models.Branch{},
		&models.User{},
		&models.Category{},
		&models.Product{},
		&models.Ingredient{},
		&models.RecipeItem{},
		&models.DiningTable{},
		&models.Order{},
		&models.OrderItem{},
		&models.CashTransaction{},
		&models.CashShift{},
		&models.AuditLog{},
		&models.POSSettings{},
		&models.PurchaseOrder{},
		&models.PurchaseOrderItem{},
		&models.InventoryAdjustment{},
		&models.Customer{},
		&models.Vendor{},
		&models.Area{},
		&models.Topping{},
		&models.Staff{},
		&models.StaffShift{},
		&models.StaffAdvance{},
		&models.StaffPayroll{},
		&models.RecurringExpense{},
	)
	if err != nil {
		t.Fatalf("AutoMigrate failed: %v", err)
	}

	// Assign global DB pointer for handlers
	database.DB = db

	router := SetupTestRouter()
	return db, router
}

// SetupTestRouter configures a Gin test router with all /api/v1 endpoints
func SetupTestRouter() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())

	// Health & WS
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "service": "OngChu POS Test Suite"})
	})
	r.GET("/ws/pos", websocket.HandleWebSocket)

	// Public APIs
	public := r.Group("/api/v1/public")
	{
		public.GET("/orders/latest/active", handler.GetLatestActiveOrder)
		public.POST("/cfd-sync", handler.SyncCFDState)
		public.GET("/cfd-active", handler.GetCFDActiveState)
	}

	// Main API group
	api := r.Group("/api/v1")
	{
		// Orders
		api.GET("/orders", handler.GetOrders)
		api.GET("/orders/:id", handler.GetOrderByID)
		api.POST("/orders", handler.CreateOrder)
		api.POST("/orders/:id/pay", handler.PayOrder)
		api.POST("/orders/:id/pre-print", handler.PrePrintOrder)
		api.POST("/orders/:id/void", handler.VoidOrder)
		api.POST("/orders/:id/void-item", handler.VoidOrderItem)
		api.GET("/orders/:id/vietqr", handler.GetOrderVietQR)

		// Tables & Areas
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

		// KDS
		api.GET("/kds/orders", handler.GetKDSOrders)
		api.GET("/kds/tickets", handler.GetKDSOrders) // KDS station tickets alias
		api.GET("/kds/items/grouped", handler.GetKDSGroupedItems)
		api.PATCH("/kds/items/:id/status", handler.UpdateKDSItemStatus)
		api.PATCH("/kds/orders/:id/status", handler.UpdateKDSOrderStatus)

		// Menu, Categories, Toppings
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

		// Staff & Payroll
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

		// Settings
		api.GET("/settings", handler.GetSettings)
		api.PUT("/settings", handler.UpdateSettings)
		api.POST("/settings/test-telegram", handler.TestTelegramAlert)

		// Recurring Expenses
		api.GET("/expenses/recurring", handler.GetRecurringExpenses)
		api.POST("/expenses/recurring", handler.CreateRecurringExpense)
		api.PUT("/expenses/recurring/:id", handler.UpdateRecurringExpense)
		api.DELETE("/expenses/recurring/:id", handler.DeleteRecurringExpense)
		api.POST("/expenses/recurring/:id/record", handler.RecordRecurringExpenseToCash)

		// Inventory & BOM
		api.GET("/inventory/ingredients", handler.GetIngredients)
		api.GET("/inventory/low-stock", handler.GetLowStockIngredients)
		api.GET("/inventory/purchase-orders", handler.GetPurchaseOrders)
		api.POST("/inventory/purchase-orders", handler.CreatePurchaseOrder)
		api.POST("/inventory/adjust", handler.CreateInventoryAdjustment)

		// CRM Customers
		api.GET("/customers", handler.GetCustomers)
		api.GET("/customers/by-phone/:phone", handler.GetCustomerByPhone)
		api.POST("/customers", handler.CreateCustomer)

		// Vendors
		api.GET("/vendors", handler.GetVendors)
		api.POST("/vendors", handler.CreateVendor)
		api.GET("/vendors/:name/purchase-orders", handler.GetVendorPurchaseOrders)

		// Offline sync
		api.POST("/sync/orders", handler.SyncOrders)

		// Auth & PIN security
		api.POST("/auth/verify-pin", handler.VerifyPin)

		// Cash flow & Sổ quỹ
		api.POST("/cash/transactions", handler.CreateCashTransaction)
		api.GET("/cash/transactions", handler.GetCashTransactions)
		api.GET("/cash/summary", handler.GetCashSummary)

		// Cash shifts & Giao ca
		api.POST("/shifts/open", handler.OpenShift)
		api.POST("/shifts/:id/close", handler.CloseShift)
		api.GET("/shifts/current", handler.GetCurrentShift)

		// Hardware & Printer
		api.POST("/printer/print-receipt", handler.PrintReceipt)
		api.POST("/printer/print-kitchen", handler.PrintKitchen)
		api.POST("/printer/open-drawer", handler.OpenDrawer)

		// PnL 3 Golden Numbers
		api.GET("/owner/pnl-summary", handler.GetOwnerPnLSummary)
	}

	return r
}

// PerformRequest dispatches an HTTP request against a handler
func PerformRequest(r http.Handler, method, path string, body interface{}) *httptest.ResponseRecorder {
	var reqBody *bytes.Buffer
	if body != nil {
		if str, ok := body.(string); ok {
			reqBody = bytes.NewBufferString(str)
		} else {
			data, _ := json.Marshal(body)
			reqBody = bytes.NewBuffer(data)
		}
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	req, _ := http.NewRequest(method, path, reqBody)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ParseJSON decodes the recorder body into target struct
func ParseJSON(t *testing.T, w *httptest.ResponseRecorder, v interface{}) {
	t.Helper()
	err := json.Unmarshal(w.Body.Bytes(), v)
	if err != nil {
		t.Fatalf("Failed to parse JSON response (%s): %v", w.Body.String(), err)
	}
}

// SeedInitialStoreData creates standard tenant, branch, dining table, and users
func SeedInitialStoreData(db *gorm.DB) (tenant models.Tenant, branch models.Branch, table models.DiningTable, cashier models.User, manager models.User) {
	now := time.Now()
	tenant = models.Tenant{
		ID:        uuid.New().String(),
		Name:      "OngChu Lean POS Demo",
		Subdomain: fmt.Sprintf("store-%s", uuid.New().String()[:8]),
		Phone:     "0901234567",
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}
	db.Create(&tenant)

	branch = models.Branch{
		ID:        uuid.New().String(),
		TenantID:  tenant.ID,
		Name:      "Chi Nhánh Quận 1",
		Address:   "123 Nguyễn Huệ, Q.1, TP.HCM",
		Phone:     "0901234567",
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}
	db.Create(&branch)

	table = models.DiningTable{
		ID:        uuid.New().String(),
		TenantID:  tenant.ID,
		BranchID:  branch.ID,
		AreaName:  "Tầng 1",
		Name:      "Bàn 01",
		Capacity:  4,
		Status:    "trong",
		CreatedAt: now,
	}
	db.Create(&table)

	cashier = models.User{
		ID:        uuid.New().String(),
		TenantID:  tenant.ID,
		BranchID:  &branch.ID,
		Username:  "cashier01",
		FullName:  "Thu Ngân Mai",
		Role:      "cashier",
		PinCode:   "1234",
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}
	db.Create(&cashier)

	manager = models.User{
		ID:        uuid.New().String(),
		TenantID:  tenant.ID,
		BranchID:  &branch.ID,
		Username:  "manager01",
		FullName:  "Quản Lý Hoàng",
		Role:      "manager",
		PinCode:   "8888",
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}
	db.Create(&manager)

	return
}

// SubscribeTestWSClient creates a test WebSocket client connected to the GlobalHub
func SubscribeTestWSClient() (*websocket.Client, chan []byte) {
	ch := make(chan []byte, 100)
	client := &websocket.Client{
		ID:   uuid.New().String(),
		Send: ch,
	}
	websocket.GlobalHub.Register <- client
	time.Sleep(10 * time.Millisecond)
	return client, ch
}

// UnsubscribeTestWSClient removes the client from GlobalHub
func UnsubscribeTestWSClient(client *websocket.Client) {
	websocket.GlobalHub.Unregister <- client
	time.Sleep(10 * time.Millisecond)
}
