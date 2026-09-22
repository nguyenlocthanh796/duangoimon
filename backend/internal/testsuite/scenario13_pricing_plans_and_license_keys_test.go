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
	"github.com/ongchu/pos-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestScenario13_Pricing_Plans_And_License_Keys(t *testing.T) {
	gin.SetMode(gin.TestMode)
	testDBFile := "test_plans_keys.db"
	_ = os.Remove(testDBFile)
	defer os.Remove(testDBFile)

	db, err := gorm.Open(sqlite.Open(testDBFile), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to open SQLite: %v", err)
	}

	err = db.AutoMigrate(
		&models.Tenant{},
		&models.TenantBranch{},
		&models.Branch{},
		&models.TenantDevice{},
		&models.SaaSInvoice{},
		&models.SaaSLicenseKey{},
		&models.SaaSPlanConfig{},
	)
	if err != nil {
		t.Fatalf("AutoMigrate failed: %v", err)
	}

	database.SeedInitialData(db)
	database.DB = db

	r := gin.New()
	saas := r.Group("/api/v1/saas")
	{
		saas.GET("/plans", handler.GetSaaSPricingPlans)
		saas.PUT("/plans/:planId", handler.UpdateSaaSPlanConfig)
		saas.POST("/plans/reset", handler.ResetSaaSPlanConfigs)
		saas.GET("/license-keys", handler.GetLicenseKeys)
		saas.POST("/license-keys", handler.CreateLicenseKey)
		saas.POST("/license-keys/redeem", handler.RedeemLicenseKey)
		saas.DELETE("/license-keys/:key", handler.DeleteLicenseKey)
	}

	// 1. Kiểm tra lấy bảng giá ban đầu
	req1, _ := http.NewRequest(http.MethodGet, "/api/v1/saas/plans", nil)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusOK {
		t.Fatalf("Expected 200 for GET plans, got %d", w1.Code)
	}

	// 2. Chỉnh sửa giá gói Pro lên 450.000đ và max 12 thiết bị
	newPrice := 450000.0
	newDevices := 12
	newAddons := "kds,cfd,telegram_fraud,pnl_reports,cash_shifts,multi_branch"
	updateBody, _ := json.Marshal(map[string]interface{}{
		"price_per_month": newPrice,
		"max_devices":    newDevices,
		"enabled_addons": newAddons,
	})
	req2, _ := http.NewRequest(http.MethodPut, "/api/v1/saas/plans/pro", bytes.NewBuffer(updateBody))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Fatalf("Expected 200 for PUT plans/pro, got %d: %s", w2.Code, w2.Body.String())
	}

	var checkPro models.SaaSPlanConfig
	db.Where("plan_id = ?", "pro").First(&checkPro)
	if checkPro.PricePerMonth != 450000 {
		t.Errorf("Expected pro price 450000, got %f", checkPro.PricePerMonth)
	}
	if checkPro.MaxDevices != 12 {
		t.Errorf("Expected pro max devices 12, got %d", checkPro.MaxDevices)
	}

	// 3. Khôi phục mặc định bảng giá
	req3, _ := http.NewRequest(http.MethodPost, "/api/v1/saas/plans/reset", nil)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Fatalf("Expected 200 for POST plans/reset, got %d", w3.Code)
	}
	db.Where("plan_id = ?", "pro").First(&checkPro)
	if checkPro.PricePerMonth != 399000 {
		t.Errorf("Expected pro price reset to 399000, got %f", checkPro.PricePerMonth)
	}

	// 4. Tạo License Key 7 ngày, 15 ngày, 30 ngày
	keyReqBody, _ := json.Marshal(map[string]interface{}{
		"plan":          "pro",
		"duration_days": 15,
		"note":          "Key test 15 ngày",
	})
	req4, _ := http.NewRequest(http.MethodPost, "/api/v1/saas/license-keys", bytes.NewBuffer(keyReqBody))
	req4.Header.Set("Content-Type", "application/json")
	w4 := httptest.NewRecorder()
	r.ServeHTTP(w4, req4)
	if w4.Code != http.StatusOK {
		t.Fatalf("Expected 200 for POST license-keys, got %d: %s", w4.Code, w4.Body.String())
	}

	var keyResp struct {
		Success bool                 `json:"success"`
		Key     models.SaaSLicenseKey `json:"key"`
	}
	_ = json.Unmarshal(w4.Body.Bytes(), &keyResp)
	createdKey := keyResp.Key.Key
	if createdKey == "" {
		t.Fatalf("Expected non-empty license key, got empty")
	}

	// 5. Kích hoạt (Redeem) License Key vào quán
	initialTenant := models.Tenant{
		ID:               "tenant_redeem_test",
		Name:             "Quán Test Nạp Key",
		Subdomain:        "testnapkey",
		SubscriptionPlan: "trial",
		IsActive:         true,
	}
	db.Create(&initialTenant)

	redeemBody, _ := json.Marshal(map[string]string{
		"tenant_id": "tenant_redeem_test",
		"key":       createdKey,
	})
	req5, _ := http.NewRequest(http.MethodPost, "/api/v1/saas/license-keys/redeem", bytes.NewBuffer(redeemBody))
	req5.Header.Set("Content-Type", "application/json")
	w5 := httptest.NewRecorder()
	r.ServeHTTP(w5, req5)
	if w5.Code != http.StatusOK {
		t.Fatalf("Expected 200 for redeem key, got %d: %s", w5.Code, w5.Body.String())
	}

	// Kiểm tra quán được nâng lên gói Pro và có hạn dùng +15 ngày
	var updatedTenant models.Tenant
	db.Where("id = ?", "tenant_redeem_test").First(&updatedTenant)
	if updatedTenant.SubscriptionPlan != "pro" {
		t.Errorf("Expected subscription_plan=pro, got %s", updatedTenant.SubscriptionPlan)
	}
	if updatedTenant.LicenseExpiresAt == nil || updatedTenant.LicenseExpiresAt.Before(time.Now().Add(14*24*time.Hour)) {
		t.Errorf("Expected expiry in ~15 days, got %v", updatedTenant.LicenseExpiresAt)
	}

	// 6. Thử kích hoạt lại Key đã dùng -> Phải báo lỗi
	req6, _ := http.NewRequest(http.MethodPost, "/api/v1/saas/license-keys/redeem", bytes.NewBuffer(redeemBody))
	req6.Header.Set("Content-Type", "application/json")
	w6 := httptest.NewRecorder()
	r.ServeHTTP(w6, req6)
	if w6.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request when redeeming already used key, got %d", w6.Code)
	}

	// 7. Thử xóa Key đã dùng -> Phải từ chối
	req7, _ := http.NewRequest(http.MethodDelete, "/api/v1/saas/license-keys/"+createdKey, nil)
	w7 := httptest.NewRecorder()
	r.ServeHTTP(w7, req7)
	if w7.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request when deleting used key, got %d", w7.Code)
	}

	// 8. Tạo key 7 ngày chưa dùng và xóa thành công
	key7Body, _ := json.Marshal(map[string]interface{}{
		"plan":          "standard",
		"duration_days": 7,
	})
	req8, _ := http.NewRequest(http.MethodPost, "/api/v1/saas/license-keys", bytes.NewBuffer(key7Body))
	req8.Header.Set("Content-Type", "application/json")
	w8 := httptest.NewRecorder()
	r.ServeHTTP(w8, req8)
	var key7Resp struct {
		Key models.SaaSLicenseKey `json:"key"`
	}
	_ = json.Unmarshal(w8.Body.Bytes(), &key7Resp)

	req9, _ := http.NewRequest(http.MethodDelete, "/api/v1/saas/license-keys/"+key7Resp.Key.Key, nil)
	w9 := httptest.NewRecorder()
	r.ServeHTTP(w9, req9)
	if w9.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for deleting unused key, got %d", w9.Code)
	}

	// 9. Kiểm tra GetPlanMaxQuotas phản ánh tức thì bảng giá động khi Super Admin chỉnh sửa
	updateBodyPro, _ := json.Marshal(map[string]interface{}{
		"max_branches": 5,
		"max_devices":  15,
	})
	req10, _ := http.NewRequest(http.MethodPut, "/api/v1/saas/plans/pro", bytes.NewBuffer(updateBodyPro))
	req10.Header.Set("Content-Type", "application/json")
	w10 := httptest.NewRecorder()
	r.ServeHTTP(w10, req10)
	if w10.Code != http.StatusOK {
		t.Fatalf("Expected 200 for PUT plans/pro, got %d: %s", w10.Code, w10.Body.String())
	}

	dynBranches, dynDevices := database.GetPlanMaxQuotas(db, "pro")
	if dynBranches != 5 || dynDevices != 15 {
		t.Errorf("GetPlanMaxQuotas dynamic quota mismatch: expected 5 branches, 15 devices, got %d branches, %d devices", dynBranches, dynDevices)
	}
}

