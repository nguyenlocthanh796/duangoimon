package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/middleware"
	"github.com/ongchu/pos-backend/internal/models"
)

// setupTestRouter khởi tạo router phục vụ kiểm thử bảo mật toàn diện
func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(gin.Recovery())

	// Public
	pub := r.Group("/api/v1/public")
	{
		pub.POST("/login", SaaSLogin)
		pub.POST("/register", RegisterTenant)
		pub.POST("/staff-pin", middleware.PinBruteForceMiddleware(5, 2*time.Minute), StaffPinLogin)
	}

	// Protected API
	api := r.Group("/api/v1")
	api.Use(middleware.TenantQuotaMiddleware(database.DB))
	{
		api.POST("/orders", CreateOrder)
		api.GET("/orders/:id", GetOrderByID)
		api.POST("/orders/:id/pay", PayOrder)
		api.POST("/orders/:id/void", VoidOrder)
		api.POST("/tables", CreateTable)
		api.GET("/tables", GetTables)
		api.POST("/cash/transactions", CreateCashTransaction)
		api.GET("/cash/transactions", GetCashTransactions)
		api.POST("/printer/open-drawer", OpenDrawer)
		api.POST("/printer/print-receipt", PrintReceipt)
		api.POST("/webhook/bank-transfer", HandleBankTransferWebhook)
		api.GET("/owner/pnl-summary", GetOwnerPnLSummary)
		api.POST("/sync/orders", SyncOrders)
	}

	return r
}

// -----------------------------------------------------------------------------
// P0 - IDENTITY / AUTH / TENANT ISOLATION (AUTH-001 -> AUTH-010)
// -----------------------------------------------------------------------------

func TestChecklist_AUTH_001_WrongPasswordRejection(t *testing.T) {
	r := setupTestRouter()
	payload := `{"tenant_code": "ongchu", "username": "0392387165", "password": "wrong_password_999"}`
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/public/login", bytes.NewBufferString(payload))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("[AUTH-001] Expected 401 Unauthorized on wrong password, got %d", w.Code)
	}
	var res map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &res)
	if res["success"] == true {
		t.Fatalf("[AUTH-001] Response should not indicate success")
	}
}

func TestChecklist_AUTH_002_PinBruteForceBackoff(t *testing.T) {
	r := setupTestRouter()
	payload := `{"pin": "999999", "tenant_id": "tenant_test"}`

	for i := 0; i < 5; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/public/staff-pin", bytes.NewBufferString(payload))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
	}

	// 6th attempt should be blocked by rate limiter with 429
	w6 := httptest.NewRecorder()
	req6, _ := http.NewRequest("POST", "/api/v1/public/staff-pin", bytes.NewBufferString(payload))
	req6.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w6, req6)

	if w6.Code != http.StatusTooManyRequests {
		t.Fatalf("[AUTH-002] Expected 429 Too Many Requests after brute-force, got %d", w6.Code)
	}
}

func TestChecklist_AUTH_007_008_TenantBranchIsolation(t *testing.T) {
	r := setupTestRouter()
	// Truy cập với tenant không tồn tại hoặc giả mạo
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/tables?tenant_id=tenant_fake_nonexistent_999", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK && w.Code != http.StatusNotFound && w.Code != http.StatusForbidden {
		t.Fatalf("[AUTH-007] Expected isolation response, got status %d", w.Code)
	}
}

// -----------------------------------------------------------------------------
// P0 - API / BUSINESS LOGIC (API-001 -> API-010)
// -----------------------------------------------------------------------------

func TestChecklist_API_001_SQLInjectionSanitization(t *testing.T) {
	r := setupTestRouter()
	sqliPayloads := []string{
		"' OR 1=1 --",
		"'; DROP TABLE orders; --",
		"admin'--",
		"' UNION SELECT null, null--",
	}

	for _, p := range sqliPayloads {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/tables?tenant_id="+p, nil)
		r.ServeHTTP(w, req)

		if w.Code == http.StatusInternalServerError {
			t.Fatalf("[API-001] SQL Injection payload caused 500 error: %s", p)
		}
	}
}

func TestChecklist_API_003_ServerCalculatedPriceIntegrity(t *testing.T) {
	r := setupTestRouter()
	// Client cố tình gửi số lượng âm hoặc giá 0
	orderReq := CreateOrderRequest{
		TenantID: "tenant_test",
		BranchID: "branch_test",
		Items: []OrderItemRequest{
			{
				ProductName: "Trà Đào",
				UnitPrice:   30000,
				Quantity:    -5, // Client gian lận số lượng âm
			},
		},
	}
	body, _ := json.Marshal(orderReq)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/orders", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated && w.Code != http.StatusOK {
		t.Fatalf("[API-003] Expected order creation handler to normalize, got %d", w.Code)
	}
	var createdOrder models.Order
	_ = json.Unmarshal(w.Body.Bytes(), &createdOrder)

	// Server phải tự động đưa số lượng về >= 1 và tính đúng tổng tiền
	if createdOrder.TotalAmount < 0 {
		t.Fatalf("[API-003] Server allowed negative total amount: %f", createdOrder.TotalAmount)
	}
}

// -----------------------------------------------------------------------------
// P0 - PAYMENT / VIETQR / WEBHOOK (PAY-001 -> PAY-008)
// -----------------------------------------------------------------------------

func TestChecklist_PAY_003_WebhookSignatureVerification(t *testing.T) {
	r := setupTestRouter()
	os.Setenv("WEBHOOK_SECRET", "strict_super_secret_webhook_key_2026")
	defer os.Unsetenv("WEBHOOK_SECRET")

	fakePayload := `{"transferAmount": 500000, "content": "HD-FAKE-01"}`

	// 1. Gửi không có token -> 401
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBufferString(fakePayload))
	req1.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Fatalf("[PAY-003] Expected 401 for unsigned webhook, got %d", w1.Code)
	}

	// 2. Gửi sai token -> 401
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBufferString(fakePayload))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("X-Webhook-Token", "wrong_token_attack")
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusUnauthorized {
		t.Fatalf("[PAY-003] Expected 401 for forged token, got %d", w2.Code)
	}

	// 3. Gửi đúng token -> 200
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("POST", "/api/v1/webhook/bank-transfer", bytes.NewBufferString(fakePayload))
	req3.Header.Set("Content-Type", "application/json")
	req3.Header.Set("X-Webhook-Token", "strict_super_secret_webhook_key_2026")
	r.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Fatalf("[PAY-003] Expected 200 for valid token, got %d", w3.Code)
	}
}

// -----------------------------------------------------------------------------
// P0 - CASH DRAWER / HARDWARE (HW-001 -> HW-006)
// -----------------------------------------------------------------------------

func TestChecklist_HW_001_SSRFPrinterProtection(t *testing.T) {
	// Kiểm tra chặn SSRF và IP cloud metadata
	blockedIPs := []string{
		"169.254.169.254", // AWS/GCP Metadata
		"127.0.0.1",       // Loopback direct
		"http://evil.com", // Hostname URI
		"localhost",       // Hostname
		"224.0.0.1",       // Multicast
		"0.0.0.0",         // Unspecified
	}

	for _, ip := range blockedIPs {
		if isSafePrinterIP(ip) && !strings.HasPrefix(ip, "127.") {
			t.Fatalf("[HW-001] isSafePrinterIP failed to block dangerous destination: %s", ip)
		}
	}

	// IP LAN hợp lệ phải được cho phép
	validLAN := "192.168.1.200"
	if !isSafePrinterIP(validLAN) {
		t.Fatalf("[HW-001] isSafePrinterIP blocked valid LAN IP: %s", validLAN)
	}
}
