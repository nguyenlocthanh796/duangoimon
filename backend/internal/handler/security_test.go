package handler

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/middleware"
)

func TestSaaSAdminAuthMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	os.Setenv("SAAS_ADMIN_KEY", "test_super_secret_admin_key_2026")
	defer os.Unsetenv("SAAS_ADMIN_KEY")

	r := gin.New()
	saas := r.Group("/saas")
	saas.Use(middleware.SaaSAdminAuthMiddleware())
	saas.GET("/overview", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Case 1: No Key -> 401 Unauthorized
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("GET", "/saas/overview", nil)
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for request without admin key, got %d", w1.Code)
	}

	// Case 2: Wrong Key -> 401 Unauthorized
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/saas/overview", nil)
	req2.Header.Set("X-Admin-Key", "wrong_key")
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for wrong admin key, got %d", w2.Code)
	}

	// Case 3: Correct Key in Header -> 200 OK
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("GET", "/saas/overview", nil)
	req3.Header.Set("X-Admin-Key", "test_super_secret_admin_key_2026")
	r.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Errorf("Expected 200 for correct admin key, got %d", w3.Code)
	}

	// Case 4: Correct Bearer Token -> 200 OK
	w4 := httptest.NewRecorder()
	req4, _ := http.NewRequest("GET", "/saas/overview", nil)
	req4.Header.Set("Authorization", "Bearer test_super_secret_admin_key_2026")
	r.ServeHTTP(w4, req4)
	if w4.Code != http.StatusOK {
		t.Errorf("Expected 200 for correct Bearer admin key, got %d", w4.Code)
	}
}

func TestWebhookSecurity(t *testing.T) {
	gin.SetMode(gin.TestMode)
	os.Setenv("WEBHOOK_SECRET", "test_webhook_secret_key_123")
	defer os.Unsetenv("WEBHOOK_SECRET")

	r := gin.New()
	r.POST("/webhook/bank-transfer", HandleBankTransferWebhook)

	// Case 1: No Token -> 401
	w1 := httptest.NewRecorder()
	body1 := `{"transferAmount": 50000, "content": "HD-123"}`
	req1, _ := http.NewRequest("POST", "/webhook/bank-transfer", bytes.NewBufferString(body1))
	req1.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for missing webhook token, got %d", w1.Code)
	}

	// Case 2: Wrong Token -> 401
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/webhook/bank-transfer", bytes.NewBufferString(body1))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("X-Webhook-Token", "wrong_token")
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401 for wrong webhook token, got %d", w2.Code)
	}

	// Case 3: Correct Token -> 200
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("POST", "/webhook/bank-transfer", bytes.NewBufferString(body1))
	req3.Header.Set("Content-Type", "application/json")
	req3.Header.Set("X-Webhook-Token", "test_webhook_secret_key_123")
	r.ServeHTTP(w3, req3)
	if w3.Code != http.StatusOK {
		t.Errorf("Expected 200 for valid webhook token, got %d", w3.Code)
	}
}

func TestSSRFPrinterProtection(t *testing.T) {
	// 169.254.169.254 (Cloud metadata) must be rejected
	if isSafePrinterIP("169.254.169.254") {
		t.Errorf("Expected 169.254.169.254 to be blocked as unsafe")
	}

	// Invalid string hostnames must be rejected
	if isSafePrinterIP("http://attacker.com") || isSafePrinterIP("localhost") {
		t.Errorf("Expected non-IP hostnames to be blocked")
	}

	// Valid LAN IP must be accepted
	if !isSafePrinterIP("192.168.1.200") {
		t.Errorf("Expected 192.168.1.200 to be accepted as safe printer IP")
	}
}

func TestPinBruteForceProtection(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/test/pin", middleware.PinBruteForceMiddleware(3, 10*time.Second), func(c *gin.Context) {
		var req struct {
			Pin string `json:"pin"`
		}
		_ = c.ShouldBindJSON(&req)
		if req.Pin != "correct_pin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "wrong pin"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	testIP := "198.51.100.42:12345"
	// Fail 3 times
	for i := 0; i < 3; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/test/pin", bytes.NewBufferString(`{"pin": "wrong"}`))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = testIP
		r.ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Errorf("Attempt %d: expected 403, got %d", i+1, w.Code)
		}
	}

	// 4th attempt must be blocked with 429 Too Many Requests
	w4 := httptest.NewRecorder()
	req4, _ := http.NewRequest("POST", "/test/pin", bytes.NewBufferString(`{"pin": "correct_pin"}`))
	req4.Header.Set("Content-Type", "application/json")
	req4.RemoteAddr = testIP
	r.ServeHTTP(w4, req4)
	if w4.Code != http.StatusTooManyRequests {
		t.Errorf("Expected 429 Too Many Requests after 3 failed attempts, got %d", w4.Code)
	}
}
