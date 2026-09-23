package testsuite

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/auth"
	"github.com/ongchu/pos-backend/internal/models"
)

// TestBlackboxSecuritySuite chạy độc lập các kịch bản Red Team nâng cao
func TestBlackboxSecuritySuite(t *testing.T) {
	db, router := SetupTestEnv(t)
	tenantA, branchA, _, _, _ := SeedInitialStoreData(db)
	tenantB, _, _, _, _ := SeedSecondaryStoreData(db)

	ownerA := models.User{
		ID:        uuid.New().String(),
		TenantID:  tenantA.ID,
		BranchID:  &branchA.ID,
		Username:  "blackbox_owner_a",
		Role:      "owner",
		IsActive:  true,
		CreatedAt: time.Now(),
	}
	db.Create(&ownerA)

	claims := &auth.TokenClaims{
		UserID:      ownerA.ID,
		Username:    ownerA.Username,
		TenantID:    ownerA.TenantID,
		BranchID:    branchA.ID,
		Role:        ownerA.Role,
		Permissions: auth.DefaultPermissionsForRole(ownerA.Role),
	}
	tokenPairOwnerA, err := auth.CreateAuthTokenPair(claims)
	if err != nil {
		t.Fatalf("Failed to generate token pair for Owner A: %v", err)
	}

	// -------------------------------------------------------------
	// TEST-ID: SEC-JWT-01 [JWT_SECRET Entropy & Length Validation]
	// -------------------------------------------------------------
	t.Run("SEC-JWT-01: JWT_SECRET < 32 bytes or weak must fail in release mode", func(t *testing.T) {
		// 1. Missing secret in release mode -> Fail
		errMissing := auth.ValidateJWTSecretPolicy("", true)
		if errMissing == nil {
			t.Errorf("[SEC-JWT-01] Expected error for missing JWT_SECRET in release mode, got nil")
		}

		// 2. Short secret (< 32 bytes) in release mode -> Fail
		errShort := auth.ValidateJWTSecretPolicy("short_secret_only_24_chars", true)
		if errShort == nil {
			t.Errorf("[SEC-JWT-01] Expected error for short JWT_SECRET (<32 bytes), got nil")
		}

		// 3. Weak password secret -> Fail
		errWeak := auth.ValidateJWTSecretPolicy("passwordpasswordpasswordpassword", true)
		if errWeak == nil {
			t.Errorf("[SEC-JWT-01] Expected error for weak JWT_SECRET, got nil")
		}

		// 4. Valid 32+ byte high-entropy secret -> Pass
		errValid := auth.ValidateJWTSecretPolicy("ongchu_prod_secure_random_key_64_bytes_entropy_token_2026_ok", true)
		if errValid != nil {
			t.Errorf("[SEC-JWT-01] Valid secret failed: %v", errValid)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: SEC-PRINTER-01 [Printer Registry Device Authorization]
	// -------------------------------------------------------------
	t.Run("SEC-PRINTER-01: RFC1918 IP not registered to tenant must be rejected 403", func(t *testing.T) {
		// Register a specific printer IP for Tenant A
		regDevice := models.TenantDevice{
			ID:         uuid.New().String(),
			TenantID:   tenantA.ID,
			DeviceName: "May In Bep 1",
			DeviceRole: "printer",
			IPAddress:  "192.168.1.150",
			IsOnline:   true,
			CreatedAt:  time.Now(),
		}
		db.Create(&regDevice)

		// 1. Send print request to Unregistered LAN IP (192.168.1.200) -> Must be Forbidden (403)
		bodyUnreg, _ := json.Marshal(map[string]interface{}{
			"printer_ip":   "192.168.1.200",
			"printer_port": "9100",
		})
		req1, _ := http.NewRequest("POST", "/api/v1/printer/print-receipt", bytes.NewBuffer(bodyUnreg))
		req1.Header.Set("Content-Type", "application/json")
		req1.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w1 := httptest.NewRecorder()
		router.ServeHTTP(w1, req1)

		if w1.Code != http.StatusForbidden {
			t.Errorf("[SEC-PRINTER-01] Expected 403 Forbidden for unregistered printer IP, got %d", w1.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: SEC-WEBHOOK-01 [Atomic DB Transaction & Financial State Consistency]
	// -------------------------------------------------------------
	t.Run("SEC-WEBHOOK-01: Idempotency Key & Order Paid Transition in 1 Atomic DB Transaction", func(t *testing.T) {
		secret := "blackbox_webhook_secret_2026_at_least_32_bytes_long"
		os.Setenv("WEBHOOK_SECRET", secret)
		defer os.Unsetenv("WEBHOOK_SECRET")

		// Create an unfulfilled order for Tenant A
		order := models.Order{
			ID:          uuid.New().String(),
			TenantID:    tenantA.ID,
			BranchID:    branchA.ID,
			OrderCode:   "HD-00101",
			TotalAmount: 150000,
			Status:      "dang_xu_ly",
			CreatedAt:   time.Now(),
		}
		db.Create(&order)

		txRef := "TX_ATOMIC_" + uuid.New().String()[:8]
		bodyBytes := []byte(fmt.Sprintf(`{"amount":150000,"referenceCode":"%s","content":"Thanh toan don HD-00101"}`, txRef))
		ts := fmt.Sprintf("%d", time.Now().Unix())

		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(ts + "." + string(bodyBytes)))
		sig := hex.EncodeToString(mac.Sum(nil))

		// 1. Dispatch Webhook
		req, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Webhook-Signature", sig)
		req.Header.Set("X-Webhook-Timestamp", ts)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("[SEC-WEBHOOK-01] Webhook request failed with %d: %s", w.Code, w.Body.String())
		}

		// 2. Verify Atomic DB State: Order Status MUST be updated to da_thanh_toan
		var updatedOrder models.Order
		db.First(&updatedOrder, "id = ?", order.ID)
		if updatedOrder.Status != "da_thanh_toan" {
			t.Errorf("[SEC-WEBHOOK-01] Order status was not updated to da_thanh_toan in atomic transaction! Got: %s", updatedOrder.Status)
		}

		// 3. Verify Idempotency Record in DB
		var idempRecord models.PaymentIdempotencyKey
		compositeKey := fmt.Sprintf("VietQR Napas247:%s:%s", tenantA.ID, txRef)
		if err := db.First(&idempRecord, "id = ?", compositeKey).Error; err != nil {
			t.Errorf("[SEC-WEBHOOK-01] PaymentIdempotencyKey record was not persisted to DB: %v", err)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: SEC-TENANT-01 [Cross-Tenant Data Isolation on Secondary Tenant]
	// -------------------------------------------------------------
	t.Run("SEC-TENANT-01: Tenant A cannot access or modify Tenant B tables", func(t *testing.T) {
		// Create table in Tenant B
		tableB := models.DiningTable{
			ID:        "tbl_tenant_b_secret",
			TenantID:  tenantB.ID,
			BranchID:  "branch_b",
			Name:      "Ban VIP B",
			Status:    "trong",
			CreatedAt: time.Now(),
		}
		db.Create(&tableB)

		// Tenant A attempts to update status of Tenant B table
		updateBody, _ := json.Marshal(map[string]interface{}{"status": "dang_dung"})
		req, _ := http.NewRequest("PUT", "/api/v1/tables/tbl_tenant_b_secret/status", bytes.NewBuffer(updateBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Must return 404 Not Found because the table is outside Tenant A's namespace
		if w.Code != http.StatusNotFound {
			t.Errorf("[SEC-TENANT-01] Expected 404 for cross-tenant table update, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: SEC-FK-01 [Cross-Tenant FK: Order with Tenant B TableID]
	// -------------------------------------------------------------
	t.Run("SEC-FK-01: Tenant A creating order with Tenant B TableID must be rejected with 400", func(t *testing.T) {
		tableB := models.DiningTable{
			ID:        "tbl_b_vip_" + uuid.New().String()[:8],
			TenantID:  tenantB.ID,
			BranchID:  "branch_b",
			Name:      "Bàn B VIP",
			Status:    "trong",
			CreatedAt: time.Now(),
		}
		db.Create(&tableB)

		initialCount := int64(0)
		db.Model(&models.Order{}).Count(&initialCount)

		body, _ := json.Marshal(map[string]interface{}{
			"order_type": "dine_in",
			"table_id":   tableB.ID,
			"items": []map[string]interface{}{
				{"product_name": "Trà Đào", "price": 35000, "quantity": 1},
			},
		})
		req, _ := http.NewRequest("POST", "/api/v1/orders", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("[SEC-FK-01] Expected 400 Bad Request for cross-tenant table order, got %d", w.Code)
		}

		// Verify Atomic Consistency: NO partial order record created
		var currentCount int64
		db.Model(&models.Order{}).Count(&currentCount)
		if currentCount != initialCount {
			t.Errorf("[SEC-FK-01] Data corruption: partial order was inserted despite FK violation! Before=%d, After=%d", initialCount, currentCount)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: SEC-FK-02 [Cross-Tenant FK: Order with Tenant B ProductID]
	// -------------------------------------------------------------
	t.Run("SEC-FK-02: Tenant A creating order with Tenant B ProductID must be rejected with 400", func(t *testing.T) {
		prodB := models.Product{
			ID:           "prod_b_special_" + uuid.New().String()[:8],
			TenantID:     tenantB.ID,
			Name:         "Phở Đặc Biệt B",
			SellingPrice: 85000,
			CreatedAt:    time.Now(),
		}
		db.Create(&prodB)

		body, _ := json.Marshal(map[string]interface{}{
			"order_type": "take_away",
			"items": []map[string]interface{}{
				{"product_id": prodB.ID, "quantity": 1},
			},
		})
		req, _ := http.NewRequest("POST", "/api/v1/orders", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("[SEC-FK-02] Expected 400 Bad Request for cross-tenant product order, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: SEC-FK-03 [Cross-Tenant FK: Purchase Order with Tenant B IngredientID]
	// -------------------------------------------------------------
	t.Run("SEC-FK-03: Tenant A PurchaseOrder with Tenant B IngredientID must rollback and reject 400", func(t *testing.T) {
		ingB := models.Ingredient{
			ID:           "ing_b_beef_" + uuid.New().String()[:8],
			TenantID:     tenantB.ID,
			BranchID:     "branch_b",
			Name:         "Thịt Bò Mỹ B",
			CurrentStock: 50.0,
			Unit:         "kg",
			CreatedAt:    time.Now(),
		}
		db.Create(&ingB)

		body, _ := json.Marshal(map[string]interface{}{
			"supplier": "NCC X",
			"items": []map[string]interface{}{
				{"ingredient_id": ingB.ID, "quantity": 10.0, "unit_price": 200000},
			},
		})
		req, _ := http.NewRequest("POST", "/api/v1/inventory/purchase-orders", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("[SEC-FK-03] Expected 400 Bad Request for cross-tenant purchase order, got %d", w.Code)
		}

		// Verify side effects: Tenant B's stock MUST NOT be modified
		var freshIngB models.Ingredient
		db.First(&freshIngB, "id = ?", ingB.ID)
		if freshIngB.CurrentStock != 50.0 {
			t.Errorf("[SEC-FK-03] Side effect detected! Tenant B stock was altered: expected 50.0, got %f", freshIngB.CurrentStock)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: SEC-FK-04 [Cross-Tenant FK: Cash Transaction with Tenant B ShiftID]
	// -------------------------------------------------------------
	t.Run("SEC-FK-04: Tenant A CashTransaction with Tenant B ShiftID must be rejected with 400", func(t *testing.T) {
		shiftB := models.CashShift{
			ID:                 "shift_b_" + uuid.New().String()[:8],
			TenantID:           tenantB.ID,
			BranchID:           "branch_b",
			CashierID:          "cashier_b01",
			CashierName:        "Thu Ngan B",
			ShiftName:          "Ca Sang",
			StartingCash:       1000000,
			ExpectedEndingCash: 1000000,
			Status:             "dang_mo",
			OpenedAt:           time.Now(),
		}
		db.Create(&shiftB)

		body, _ := json.Marshal(map[string]interface{}{
			"type":           "chi",
			"amount":         200000,
			"description":    "Mua rau",
			"shift_id":       shiftB.ID,
			"payment_method": "tien_mat",
		})
		req, _ := http.NewRequest("POST", "/api/v1/cash/transactions", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("[SEC-FK-04] Expected 400 Bad Request for cross-tenant shift transaction, got %d", w.Code)
		}

		// Verify side effect: Tenant B shift expected ending cash MUST remain 1,000,000
		var freshShiftB models.CashShift
		db.First(&freshShiftB, "id = ?", shiftB.ID)
		if freshShiftB.ExpectedEndingCash != 1000000 {
			t.Errorf("[SEC-FK-04] Side effect detected! Tenant B shift cash was altered: expected 1000000, got %f", freshShiftB.ExpectedEndingCash)
		}
	})
}
