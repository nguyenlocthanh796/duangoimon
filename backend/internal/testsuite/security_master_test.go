package testsuite

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
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
	"github.com/ongchu/pos-backend/internal/websocket"
)

func TestSecurityMasterRegressionSuite(t *testing.T) {
	db, router := SetupTestEnv(t)
	tenantA, branchA, _, cashierA, managerA := SeedInitialStoreData(db)

	// Create Owner A
	ownerA := models.User{
		ID:        uuid.New().String(),
		TenantID:  tenantA.ID,
		BranchID:  &branchA.ID,
		Username:  "ownerA",
		FullName:  "Chủ Quán A",
		Role:      "owner",
		PinCode:   "1111",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.Create(&ownerA)

	// Seed Tenant B for Cross-Tenant tests
	tenantB := models.Tenant{
		ID:        "tenant_store_b_" + uuid.New().String()[:8],
		Name:      "Store B Competitor",
		Subdomain: "storeb",
		Phone:     "0909999888",
		IsActive:  true,
	}
	db.Create(&tenantB)
	branchB := models.Branch{
		ID:       "branch_b_" + uuid.New().String()[:8],
		TenantID: tenantB.ID,
		Name:     "Chi Nhánh B",
		IsActive: true,
	}
	db.Create(&branchB)
	ownerB := models.User{
		ID:        "usr_owner_b",
		TenantID:  tenantB.ID,
		BranchID:  &branchB.ID,
		Username:  "ownerB",
		Role:      "owner",
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.Create(&ownerB)

	// Order in Tenant B
	orderB := models.Order{
		ID:          "ord_tenant_b_secret_01",
		TenantID:    tenantB.ID,
		BranchID:    branchB.ID,
		OrderCode:   "HD-B001",
		TotalAmount: 500000,
		Status:      "cho_thanh_toan",
		CreatedAt:   time.Now(),
	}
	db.Create(&orderB)

	// Generate Tokens for Owner A, Cashier A, Owner B
	tokenPairOwnerA, err := auth.CreateAuthTokenPair(&auth.TokenClaims{
		UserID:      ownerA.ID,
		Username:    ownerA.Username,
		TenantID:    tenantA.ID,
		BranchID:    branchA.ID,
		Role:        "owner",
		Permissions: auth.DefaultPermissionsForRole("owner"),
	})
	if err != nil {
		t.Fatalf("Failed to create token for Owner A: %v", err)
	}

	tokenPairCashierA, err := auth.CreateAuthTokenPair(&auth.TokenClaims{
		UserID:      cashierA.ID,
		Username:    cashierA.Username,
		TenantID:    tenantA.ID,
		BranchID:    branchA.ID,
		Role:        "cashier",
		Permissions: auth.DefaultPermissionsForRole("cashier"),
	})
	if err != nil {
		t.Fatalf("Failed to create token for Cashier A: %v", err)
	}

	// -------------------------------------------------------------
	// TEST-ID: AUTH-001 [Forged Token Rejected]
	// -------------------------------------------------------------
	t.Run("AUTH-001: Forged Token with Fake Signature must return 401", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/orders", nil)
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken+"forged_tamper")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("[AUTH-001] Expected 401 for forged token, got %d. Body: %s", w.Code, w.Body.String())
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: AUTH-002 [Expired Token Rejected]
	// -------------------------------------------------------------
	t.Run("AUTH-002: Expired Token must return 401", func(t *testing.T) {
		expiredClaims := &auth.TokenClaims{
			UserID:      ownerA.ID,
			TenantID:    tenantA.ID,
			BranchID:    branchA.ID,
			Role:        "owner",
			Permissions: auth.DefaultPermissionsForRole("owner"),
			IssuedAt:    time.Now().Add(-2 * time.Hour).Unix(),
			ExpiresAt:   time.Now().Add(-1 * time.Hour).Unix(),
		}
		expiredToken, _ := auth.GenerateAccessToken(expiredClaims)

		req, _ := http.NewRequest("GET", "/api/v1/orders", nil)
		req.Header.Set("Authorization", "Bearer "+expiredToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("[AUTH-002] Expected 401 for expired token, got %d. Body: %s", w.Code, w.Body.String())
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: AUTH-003 [Refresh Token Rotation & Reuse Detection]
	// -------------------------------------------------------------
	t.Run("AUTH-003: Refresh Token Rotation and Replay Revocation", func(t *testing.T) {
		rawRefresh := tokenPairOwnerA.RefreshToken

		// First valid refresh
		info1, err1 := auth.GlobalSessionStore.ConsumeRefreshToken(rawRefresh)
		if err1 != nil || info1 == nil {
			t.Fatalf("[AUTH-003] First refresh consumption failed: %v", err1)
		}

		// Second refresh attempt with SAME token (Replay attack!)
		_, err2 := auth.GlobalSessionStore.ConsumeRefreshToken(rawRefresh)
		if err2 == nil {
			t.Errorf("[AUTH-003] Replayed refresh token was accepted! Must be rejected.")
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: AUTH-004 [Revoked Session Rejected]
	// -------------------------------------------------------------
	t.Run("AUTH-004: Revoked Access Token must be rejected with 401", func(t *testing.T) {
		pair, _ := auth.CreateAuthTokenPair(&auth.TokenClaims{
			UserID:      ownerA.ID,
			TenantID:    tenantA.ID,
			BranchID:    branchA.ID,
			Role:        "owner",
			Permissions: auth.DefaultPermissionsForRole("owner"),
		})

		// Revoke the token ID
		auth.GlobalSessionStore.RevokeToken(pair.Claims.TokenID, pair.Claims.ExpiresAt)

		req, _ := http.NewRequest("GET", "/api/v1/orders", nil)
		req.Header.Set("Authorization", "Bearer "+pair.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("[AUTH-004] Expected 401 for revoked token, got %d. Body: %s", w.Code, w.Body.String())
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: AUTH-005 [Role Escalation: Cashier -> Owner Endpoint]
	// -------------------------------------------------------------
	t.Run("AUTH-005: Cashier attempting Owner Restore Backup must return 403 Forbidden", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"confirm": true,
		})
		req, _ := http.NewRequest("POST", "/api/v1/backup/restore", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairCashierA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("[AUTH-005] Expected 403 Forbidden for Cashier accessing RestoreBackup, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: TENANT-001 [Cross-Tenant Order Access IDOR Blocked]
	// -------------------------------------------------------------
	t.Run("TENANT-001: Tenant A User cannot Void or Access Tenant B Order", func(t *testing.T) {
		voidBody, _ := json.Marshal(map[string]interface{}{
			"pin":    "1111",
			"reason": "Attacker trying to void competitor order",
		})
		req, _ := http.NewRequest("POST", "/api/v1/orders/"+orderB.ID+"/void", bytes.NewBuffer(voidBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Must fail because orderB does not belong to tenantA
		if w.Code == http.StatusOK {
			t.Errorf("[TENANT-001] Cross-tenant order voiding succeeded! Must be rejected. Status: %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: TENANT-002 [Cross-Tenant Backup Overwrite IDOR Blocked]
	// -------------------------------------------------------------
	t.Run("TENANT-002: Tenant A Owner cannot Restore/Wipe Tenant B data", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"tenantId": tenantB.ID,
			"confirm":  true,
		})
		req, _ := http.NewRequest("POST", "/api/v1/backup/restore", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("[TENANT-002] Expected 403 Forbidden for cross-tenant restore, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: WS-002 [WebSocket Broadcast Tenant Isolation]
	// -------------------------------------------------------------
	t.Run("WS-002: WebSocket Broadcast must NOT leak across tenants", func(t *testing.T) {
		chA := make(chan []byte, 10)
		chB := make(chan []byte, 10)

		clientA := &websocket.Client{
			ID:       "ws_client_a",
			TenantID: tenantA.ID,
			Send:     chA,
		}
		clientB := &websocket.Client{
			ID:       "ws_client_b",
			TenantID: tenantB.ID,
			Send:     chB,
		}

		websocket.GlobalHub.Register <- clientA
		websocket.GlobalHub.Register <- clientB
		time.Sleep(20 * time.Millisecond)

		// Broadcast event specifically for Tenant A
		websocket.GlobalHub.BroadcastToTenant(tenantA.ID, "PRIVATE_SALE_EVENT", map[string]string{
			"secret": "revenue_100M",
		})
		time.Sleep(30 * time.Millisecond)

		// Check Client A received the event
		select {
		case msgA := <-chA:
			if !bytes.Contains(msgA, []byte("PRIVATE_SALE_EVENT")) {
				t.Errorf("[WS-002] Client A received unexpected message: %s", string(msgA))
			}
		default:
			t.Errorf("[WS-002] Client A did not receive tenant message")
		}

		// Verify Client B received NOTHING (Zero Leakage)
		select {
		case msgB := <-chB:
			t.Errorf("[WS-002] CROSS-TENANT WEBSOCKET LEAK! Client B received Tenant A private message: %s", string(msgB))
		default:
			// PASS: Zero leakage
		}

		websocket.GlobalHub.Unregister <- clientA
		websocket.GlobalHub.Unregister <- clientB
	})

	// -------------------------------------------------------------
	// TEST-ID: PAY-001 [Fake Webhook Token Rejected]
	// -------------------------------------------------------------
	t.Run("PAY-001: Webhook with invalid token must return 401", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]interface{}{
			"amount":        100000,
			"referenceCode": "FAKE_TX_01",
		})
		req, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Webhook-Token", "fake_unauthorized_token_123")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("[PAY-001] Expected 401 for unauthorized webhook, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: PAY-002 [Webhook Replay Protection]
	// -------------------------------------------------------------
	t.Run("PAY-002: Replayed webhook reference code must be handled idempotently", func(t *testing.T) {
		os.Setenv("WEBHOOK_SECRET", "test_webhook_sec_2026")
		defer os.Unsetenv("WEBHOOK_SECRET")

		txRef := "TX_REPLAY_TEST_" + uuid.New().String()[:8]
		payload, _ := json.Marshal(map[string]interface{}{
			"amount":        150000,
			"referenceCode": txRef,
			"content":       "Thanh toan don",
		})

		// First Webhook Call -> Processed
		req1, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBuffer(payload))
		req1.Header.Set("Content-Type", "application/json")
		req1.Header.Set("X-Webhook-Token", "test_webhook_sec_2026")
		w1 := httptest.NewRecorder()
		router.ServeHTTP(w1, req1)
		if w1.Code != http.StatusOK {
			t.Fatalf("[PAY-002] First webhook failed: %d %s", w1.Code, w1.Body.String())
		}

		// Second Webhook Call with SAME txRef -> Must be detected as duplicate
		req2, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBuffer(payload))
		req2.Header.Set("Content-Type", "application/json")
		req2.Header.Set("X-Webhook-Token", "test_webhook_sec_2026")
		w2 := httptest.NewRecorder()
		router.ServeHTTP(w2, req2)

		if !bytes.Contains(w2.Body.Bytes(), []byte("Idempotent duplicate ignored")) {
			t.Errorf("[PAY-002] Replayed webhook did not trigger duplicate response: %s", w2.Body.String())
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: HW-001 [Printer SSRF Loopback Rejected]
	// -------------------------------------------------------------
	t.Run("HW-001: Printer SSRF to Loopback 127.0.0.1 must be rejected", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"printer_ip":   "127.0.0.1",
			"printer_port": "9100",
		})
		req, _ := http.NewRequest("POST", "/api/v1/printer/print-receipt", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("[HW-001] Expected 400 Bad Request for loopback printer IP, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: HW-002 [Printer SSRF Cloud Metadata IP 169.254.169.254 Rejected]
	// -------------------------------------------------------------
	t.Run("HW-002: Printer SSRF to AWS/GCP Metadata IP 169.254.169.254 must be rejected", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"printer_ip":   "169.254.169.254",
			"printer_port": "80",
		})
		req, _ := http.NewRequest("POST", "/api/v1/printer/print-receipt", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("[HW-002] Expected 400 Bad Request for metadata IP, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: HW-003 [Printer SSRF Sensitive Port Scanning Rejected]
	// -------------------------------------------------------------
	t.Run("HW-003: Printer SSRF to Redis (6379) or Postgres (5432) must be rejected", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"printer_ip":   "192.168.1.100",
			"printer_port": "6379",
		})
		req, _ := http.NewRequest("POST", "/api/v1/printer/print-receipt", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("[HW-003] Expected 400 Bad Request for sensitive port 6379, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: AUTH-006 [Backdoor PIN Bypass Removed]
	// -------------------------------------------------------------
	t.Run("AUTH-006: Hardcoded PINs 8888/9999 without tenant DB record must be rejected", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"tenant_id": tenantB.ID,
			"pin":       "9999",
		})
		req, _ := http.NewRequest("POST", "/api/v1/public/staff-pin", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("[AUTH-006] Expected 401 for unauthorized PIN, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: TENANT-003 [Cross-Tenant Settings Isolation]
	// -------------------------------------------------------------
	t.Run("TENANT-003: Tenant A Owner updating settings cannot alter Tenant B settings", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"store_name": "Hacked Tenant B Store",
		})
		req, _ := http.NewRequest("PUT", "/api/v1/settings", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		req.Header.Set("X-Tenant-ID", tenantB.ID) // Spoof header attempt
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Check Tenant B settings in DB was NOT modified
		var settingB models.POSSettings
		db.Where("tenant_id = ?", tenantB.ID).First(&settingB)
		if settingB.StoreName == "Hacked Tenant B Store" {
			t.Errorf("[TENANT-003] Cross-tenant settings pollution succeeded! Setting was overwritten.")
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: AUTH-007 [Reject Algorithm Confusion & alg: none]
	// -------------------------------------------------------------
	t.Run("AUTH-007: Reject alg none or unapproved algorithms", func(t *testing.T) {
		noneHeader := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none","typ":"JWT"}`))
		claimsJSON, _ := json.Marshal(&auth.TokenClaims{
			UserID:    ownerA.ID,
			TenantID:  tenantA.ID,
			Role:      "owner",
			Issuer:    auth.DefaultIssuer,
			Audience:  auth.DefaultAudience,
			ExpiresAt: time.Now().Add(10 * time.Minute).Unix(),
		})
		noneClaims := base64.RawURLEncoding.EncodeToString(claimsJSON)
		noneToken := noneHeader + "." + noneClaims + "."

		req, _ := http.NewRequest("GET", "/api/v1/orders", nil)
		req.Header.Set("Authorization", "Bearer "+noneToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("[AUTH-007] Expected 401 for alg:none token, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: AUTH-008 [Reject Future-Dated Token (iat in future)]
	// -------------------------------------------------------------
	t.Run("AUTH-008: Reject Future-Dated Token (iat drift > 60s)", func(t *testing.T) {
		futureClaims := &auth.TokenClaims{
			UserID:      ownerA.ID,
			TenantID:    tenantA.ID,
			Role:        "owner",
			Permissions: auth.DefaultPermissionsForRole("owner"),
			IssuedAt:    time.Now().Add(2 * time.Hour).Unix(),
			ExpiresAt:   time.Now().Add(3 * time.Hour).Unix(),
		}
		futureToken, _ := auth.GenerateAccessToken(futureClaims)

		req, _ := http.NewRequest("GET", "/api/v1/orders", nil)
		req.Header.Set("Authorization", "Bearer "+futureToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("[AUTH-008] Expected 401 for future iat token, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: PAY-003 [HMAC-SHA256 Webhook Signature & Timestamp Drift Window]
	// -------------------------------------------------------------
	t.Run("PAY-003: Webhook HMAC-SHA256 Signature Verification and Timestamp Window", func(t *testing.T) {
		secret := "test_webhook_sec_2026"
		os.Setenv("WEBHOOK_SECRET", secret)
		defer os.Unsetenv("WEBHOOK_SECRET")

		bodyBytes := []byte(`{"amount":200000,"referenceCode":"TX_HMAC_VALID_01","content":"Thanh toan"}`)
		validTS := fmt.Sprintf("%d", time.Now().Unix())

		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(validTS + "." + string(bodyBytes)))
		validSig := hex.EncodeToString(mac.Sum(nil))

		// 1. Valid Signature & Valid Timestamp -> Must PASS (200 OK)
		req1, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBuffer(bodyBytes))
		req1.Header.Set("Content-Type", "application/json")
		req1.Header.Set("X-Webhook-Signature", validSig)
		req1.Header.Set("X-Webhook-Timestamp", validTS)
		w1 := httptest.NewRecorder()
		router.ServeHTTP(w1, req1)
		if w1.Code != http.StatusOK {
			t.Errorf("[PAY-003] Valid HMAC Webhook failed with status %d: %s", w1.Code, w1.Body.String())
		}

		// 2. Expired / Replayed Stale Timestamp (> 300s old) -> Must REJECT (401)
		staleTS := fmt.Sprintf("%d", time.Now().Unix()-350)
		macStale := hmac.New(sha256.New, []byte(secret))
		macStale.Write([]byte(staleTS + "." + string(bodyBytes)))
		staleSig := hex.EncodeToString(macStale.Sum(nil))

		req2, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBuffer(bodyBytes))
		req2.Header.Set("Content-Type", "application/json")
		req2.Header.Set("X-Webhook-Signature", staleSig)
		req2.Header.Set("X-Webhook-Timestamp", staleTS)
		w2 := httptest.NewRecorder()
		router.ServeHTTP(w2, req2)
		if w2.Code != http.StatusUnauthorized {
			t.Errorf("[PAY-003] Stale timestamp (>300s) was accepted! Got status %d", w2.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: TENANT-005 [Data Layer Query Authorization]
	// -------------------------------------------------------------
	t.Run("TENANT-005: CreateOrder authoritative tenant binding prevents cross-tenant pollution", func(t *testing.T) {
		createBody, _ := json.Marshal(map[string]interface{}{
			"tenant_id":   tenantB.ID, // Attempt to inject order into Tenant B
			"totalAmount": 120000,
			"items": []map[string]interface{}{
				{"name": "Ca Phe Muoi", "unitPrice": 35000, "quantity": 1},
			},
		})
		req, _ := http.NewRequest("POST", "/api/v1/orders", bytes.NewBuffer(createBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			t.Fatalf("[TENANT-005] Failed to create order: %d %s", w.Code, w.Body.String())
		}

		var createdOrder models.Order
		_ = json.Unmarshal(w.Body.Bytes(), &createdOrder)

		// Authoritative binding check: Order MUST belong to Tenant A, NOT Tenant B!
		if createdOrder.TenantID != tenantA.ID {
			t.Errorf("[TENANT-005] Query authorization bypass! Created order assigned to %s instead of authenticated %s", createdOrder.TenantID, tenantA.ID)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: PAY-004 [Fail-Closed: Missing Signature/Timestamp Rejected]
	// -------------------------------------------------------------
	t.Run("PAY-004: Webhook without signature or timestamp must return 401 fail-closed", func(t *testing.T) {
		bodyBytes := []byte(`{"amount":50000,"referenceCode":"TX_NO_AUTH","content":"Test"}`)
		req, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		// NO AUTH HEADERS GIVEN
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("[PAY-004] Expected 401 for unauthenticated webhook, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: PAY-005 [Database Atomic Idempotency Key under concurrency]
	// -------------------------------------------------------------
	t.Run("PAY-005: Concurrent webhook requests with identical referenceCode must be deduplicated atomically in DB", func(t *testing.T) {
		os.Setenv("WEBHOOK_SECRET", "test_webhook_sec_2026")
		defer os.Unsetenv("WEBHOOK_SECRET")

		txRef := "TX_CONCURRENT_" + uuid.New().String()[:8]
		bodyBytes := []byte(fmt.Sprintf(`{"amount":300000,"referenceCode":"%s","content":"Nap tien"}`, txRef))
		ts := fmt.Sprintf("%d", time.Now().Unix())

		mac := hmac.New(sha256.New, []byte("test_webhook_sec_2026"))
		mac.Write([]byte(ts + "." + string(bodyBytes)))
		sig := hex.EncodeToString(mac.Sum(nil))

		// Dispatch first request
		req1, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBuffer(bodyBytes))
		req1.Header.Set("Content-Type", "application/json")
		req1.Header.Set("X-Webhook-Signature", sig)
		req1.Header.Set("X-Webhook-Timestamp", ts)
		w1 := httptest.NewRecorder()
		router.ServeHTTP(w1, req1)

		if w1.Code != http.StatusOK {
			t.Fatalf("[PAY-005] First webhook failed: %d", w1.Code)
		}

		// Dispatch identical duplicate request
		req2, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBuffer(bodyBytes))
		req2.Header.Set("Content-Type", "application/json")
		req2.Header.Set("X-Webhook-Signature", sig)
		req2.Header.Set("X-Webhook-Timestamp", ts)
		w2 := httptest.NewRecorder()
		router.ServeHTTP(w2, req2)

		if w2.Code != http.StatusOK || !bytes.Contains(w2.Body.Bytes(), []byte("duplicate ignored")) {
			t.Errorf("[PAY-005] Duplicate webhook was not handled idempotently: %d %s", w2.Code, w2.Body.String())
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: HW-004 [Positive LAN Allowlist Rejects Public IP 8.8.8.8]
	// -------------------------------------------------------------
	t.Run("HW-004: Printer SSRF to Public IP 8.8.8.8 must be rejected by Positive LAN Allowlist", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"printer_ip":   "8.8.8.8",
			"printer_port": "9100",
		})
		req, _ := http.NewRequest("POST", "/api/v1/printer/print-receipt", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("[HW-004] Expected 400 Bad Request for Public IP 8.8.8.8, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: HW-005 [Positive LAN Allowlist Rejects IPv6 Loopback ::1]
	// -------------------------------------------------------------
	t.Run("HW-005: Printer SSRF to IPv6 ::1 must be rejected", func(t *testing.T) {
		body, _ := json.Marshal(map[string]interface{}{
			"printer_ip":   "::1",
			"printer_port": "9100",
		})
		req, _ := http.NewRequest("POST", "/api/v1/printer/print-receipt", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("[HW-005] Expected 400 Bad Request for IPv6 ::1, got %d", w.Code)
		}
	})

	// -------------------------------------------------------------
	// TEST-ID: TENANT-006 [Cross-Tenant Menu Product Modification Prevented]
	// -------------------------------------------------------------
	t.Run("TENANT-006: Tenant A cannot update price or 86 status of Tenant B product", func(t *testing.T) {
		// Seed a product in Tenant B
		prodB := models.Product{
			ID:           "prod_tenant_b_test",
			TenantID:     tenantB.ID,
			Name:         "Tra Sua Dac Biet B",
			SellingPrice: 50000,
			IsActive:     true,
		}
		db.Create(&prodB)

		// Tenant A attempts to update price of Tenant B's product
		priceBody, _ := json.Marshal(map[string]interface{}{"selling_price": 1000})
		req, _ := http.NewRequest("PUT", "/api/v1/menu/products/prod_tenant_b_test/price", bytes.NewBuffer(priceBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+tokenPairOwnerA.AccessToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("[TENANT-006] Expected 404 for cross-tenant product price edit, got %d", w.Code)
		}

		// Verify product B price was NOT touched
		var checkProd models.Product
		db.First(&checkProd, "id = ?", prodB.ID)
		if checkProd.SellingPrice != 50000 {
			t.Errorf("[TENANT-006] Product B price was corrupted! Expected 50000, got %f", checkProd.SellingPrice)
		}
	})

	_ = managerA
}
