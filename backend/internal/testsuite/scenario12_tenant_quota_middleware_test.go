package testsuite

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/handler"
	"github.com/ongchu/pos-backend/internal/middleware"
	"github.com/ongchu/pos-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestScenario12_Tenant_Quota_Middleware_And_DB_Persistence(t *testing.T) {
	gin.SetMode(gin.TestMode)
	testDBFile := "test_quota_middleware.db"
	_ = os.Remove(testDBFile)
	defer os.Remove(testDBFile)

	db, err := gorm.Open(sqlite.Open(testDBFile), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to open SQLite: %v", err)
	}

	// 1. AutoMigrate bao gồm TenantBranch và TenantDevice
	err = db.AutoMigrate(
		&models.Tenant{},
		&models.TenantBranch{},
		&models.Branch{},
		&models.TenantDevice{},
		&models.User{},
		&models.Order{},
	)
	if err != nil {
		t.Fatalf("AutoMigrate failed: %v", err)
	}

	// Nạp Seed Data
	database.SeedInitialData(db)
	database.DB = db

	// Kiểm tra bảng tenant_branches và tenant_devices có dữ liệu seed
	var tbCount int64
	db.Model(&models.TenantBranch{}).Count(&tbCount)
	if tbCount == 0 {
		t.Errorf("Expected tenant_branches to be seeded, got 0")
	}

	var devCount int64
	db.Model(&models.TenantDevice{}).Count(&devCount)
	if devCount == 0 {
		t.Errorf("Expected tenant_devices to be seeded, got 0")
	}

	// 2. Thiết lập Gin Router với TenantQuotaMiddleware
	r := gin.New()
	r.Use(gin.Recovery())

	api := r.Group("/api/v1")
	api.Use(middleware.TenantQuotaMiddleware(db))
	{
		api.GET("/orders", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"success": true, "orders": []string{}})
		})
	}

	// Saas group không bị chặn bởi middleware
	saas := r.Group("/api/v1/saas")
	{
		saas.GET("/tenants/:id/branches", handler.GetTenantBranches)
		saas.POST("/tenants/:id/branches", handler.CreateTenantBranch)
		saas.PATCH("/tenants/:id/branches/:branchId/status", handler.ToggleTenantBranchStatus)
		saas.GET("/tenants/:id/devices", handler.GetTenantDevices)
	}

	// 3. Test: Truy cập hợp lệ với tenant_ongchu (còn hạn)
	req1, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	req1.Header.Set("X-Tenant-ID", "tenant_ongchu")
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for valid active tenant, got %d: %s", w1.Code, w1.Body.String())
	}

	// 4. Test: Quán bị khóa (is_active = false)
	futureDate := time.Now().Add(30 * 24 * time.Hour)
	lockedTenant := models.Tenant{
		ID:               "tenant_locked_test",
		Name:             "Quán Bị Khóa",
		Subdomain:        "khoaquan",
		SubscriptionPlan: "pro",
		LicenseExpiresAt: &futureDate,
	}
	db.Create(&lockedTenant)
	db.Model(&lockedTenant).Update("is_active", false)

	req2, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	req2.Header.Set("X-Tenant-ID", "tenant_locked_test")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden for suspended tenant, got %d: %s", w2.Code, w2.Body.String())
	}

	// 5. Test: Quán hết hạn bản quyền (LicenseExpiresAt < now)
	pastDate := time.Now().Add(-48 * time.Hour)
	expiredTenant := models.Tenant{
		ID:               "tenant_expired_test",
		Name:             "Quán Hết Hạn",
		Subdomain:        "hethan",
		SubscriptionPlan: "trial",
		LicenseExpiresAt: &pastDate,
		IsActive:         true,
	}
	db.Create(&expiredTenant)

	req3, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	req3.Header.Set("X-Tenant-ID", "tenant_expired_test")
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)

	if w3.Code != http.StatusPaymentRequired {
		t.Errorf("Expected 402 PaymentRequired for expired license, got %d: %s", w3.Code, w3.Body.String())
	}

	// 6. Test: Thiết bị mới vượt Quota gói Trial (Trial cho phép tối đa 1 máy)
	futureDate = time.Now().Add(30 * 24 * time.Hour)
	trialTenant := models.Tenant{
		ID:               "tenant_trial_test",
		Name:             "Quán Dùng Thử 1 Máy",
		Subdomain:        "trialtest",
		SubscriptionPlan: "trial",
		LicenseExpiresAt: &futureDate,
		IsActive:         true,
	}
	db.Create(&trialTenant)

	// Máy 1: Được phép kết nối và tự động lưu vào fleet
	req4, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	req4.Header.Set("X-Tenant-ID", "tenant_trial_test")
	req4.Header.Set("X-Device-ID", "device_trial_01")
	w4 := httptest.NewRecorder()
	r.ServeHTTP(w4, req4)

	if w4.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for 1st device on trial, got %d: %s", w4.Code, w4.Body.String())
	}

	// Máy 2: Vượt Quota (Trial max 1) -> Trả về 403 QUOTA_EXCEEDED
	req5, _ := http.NewRequest(http.MethodGet, "/api/v1/orders", nil)
	req5.Header.Set("X-Tenant-ID", "tenant_trial_test")
	req5.Header.Set("X-Device-ID", "device_trial_02")
	w5 := httptest.NewRecorder()
	r.ServeHTTP(w5, req5)

	if w5.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden for device exceeding trial quota, got %d: %s", w5.Code, w5.Body.String())
	}

	// 7. Test: Tạo chi nhánh bền vững lưu vào DB tenant_branches và kiểm tra Quota
	// Trial tenant chỉ được 1 chi nhánh
	db.Create(&models.TenantBranch{
		ID:        "tb_trial_01",
		TenantID:  "tenant_trial_test",
		Name:      "Chi Nhánh Chính",
		IsMain:    true,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	})

	// Thử tạo chi nhánh thứ 2 cho Trial tenant -> Phải bị từ chối
	createBranchBody, _ := json.Marshal(map[string]string{
		"name":         "Chi Nhánh Thứ 2",
		"address":      "Số 2 Đường ABC",
		"phone":        "0911223344",
		"manager_name": "Anh A",
	})
	req6, _ := http.NewRequest(http.MethodPost, "/api/v1/saas/tenants/tenant_trial_test/branches", bytes.NewBuffer(createBranchBody))
	req6.Header.Set("Content-Type", "application/json")
	w6 := httptest.NewRecorder()
	r.ServeHTTP(w6, req6)

	if w6.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request when exceeding branch quota, got %d: %s", w6.Code, w6.Body.String())
	}

	// Khóa chi nhánh qua Toggle cho tenant_quanquan
	req7, _ := http.NewRequest(http.MethodPatch, "/api/v1/saas/tenants/tenant_quanquan/branches/branch_qq_01/status", nil)
	w7 := httptest.NewRecorder()
	r.ServeHTTP(w7, req7)

	if w7.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for branch toggle, got %d", w7.Code)
	}

	// Đọc lại từ DB để kiểm tra tính bền vững
	var checkTB models.TenantBranch
	if err := db.Where("id = ?", "branch_qq_01").First(&checkTB).Error; err != nil {
		t.Fatalf("Failed to query branch_qq_01 from tenant_branches: %v", err)
	}
	if checkTB.IsActive != false {
		t.Errorf("Expected branch_qq_01 is_active=false after toggle, got %v", checkTB.IsActive)
	}
}
