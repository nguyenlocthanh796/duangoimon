package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestCreateOrderValidation(t *testing.T) {
	r := gin.New()
	r.POST("/orders", CreateOrder)

	// Test invalid JSON
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/orders", bytes.NewBufferString("invalid-json"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 for invalid JSON, got %d", w.Code)
	}
}

func TestCreateCashTransactionValidation(t *testing.T) {
	r := gin.New()
	r.POST("/cash/transactions", CreateCashTransaction)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/cash/transactions", bytes.NewBufferString("not-json"))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

func TestGetCashSummaryWithoutDB(t *testing.T) {
	r := gin.New()
	r.GET("/cash/summary", GetCashSummary)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/cash/summary?tenant_id=test", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var res map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	if _, ok := res["net_balance"]; !ok {
		t.Error("Response missing net_balance field")
	}
}

func TestGetOwnerPnLSummaryWithoutDB(t *testing.T) {
	r := gin.New()
	r.GET("/owner/pnl-summary", GetOwnerPnLSummary)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/owner/pnl-summary?tenant_id=test", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var res map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	if _, ok := res["three_golden_numbers"]; !ok {
		t.Error("Response missing three_golden_numbers field")
	}
}

func TestCommonHandlerHelpers(t *testing.T) {
	// 1. Context takes precedence over Header & Query
	{
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request, _ = http.NewRequest("GET", "/test?tenant_id=query_val", nil)
		c.Request.Header.Set("X-Tenant-ID", "header_val")
		c.Set("tenant_id", "context_val")
		if tid := GetTenantID(c); tid != "context_val" {
			t.Errorf("Expected context_val, got %s", tid)
		}
	}

	// 2. Header takes precedence over Query when Context is empty
	{
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request, _ = http.NewRequest("GET", "/test?tenant_id=query_val", nil)
		c.Request.Header.Set("X-Tenant-ID", "header_val")
		if tid := GetTenantID(c); tid != "header_val" {
			t.Errorf("Expected header_val, got %s", tid)
		}
	}

	// 3. Query is used when Context and Header are empty
	{
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request, _ = http.NewRequest("GET", "/test?tenant_id=query_val", nil)
		if tid := GetTenantID(c); tid != "query_val" {
			t.Errorf("Expected query_val, got %s", tid)
		}
	}

	// 4. Fallback is used when all are empty
	{
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request, _ = http.NewRequest("GET", "/test", nil)
		if tid := GetTenantID(c, "my_fallback"); tid != "my_fallback" {
			t.Errorf("Expected my_fallback, got %s", tid)
		}
	}

	// 5. Empty string returned when all are empty and no fallback
	{
		c, _ := gin.CreateTestContext(httptest.NewRecorder())
		c.Request, _ = http.NewRequest("GET", "/test", nil)
		if tid := GetTenantID(c); tid != "" {
			t.Errorf("Expected empty string, got %s", tid)
		}
	}

	// 6. Test RespondError & RespondSuccess
	{
		wErr := httptest.NewRecorder()
		cErr, _ := gin.CreateTestContext(wErr)
		RespondError(cErr, http.StatusBadRequest, "Lỗi kiểm tra")
		if wErr.Code != http.StatusBadRequest {
			t.Errorf("Expected 400, got %d", wErr.Code)
		}
		if !bytes.Contains(wErr.Body.Bytes(), []byte("Lỗi kiểm tra")) {
			t.Errorf("Expected response to contain 'Lỗi kiểm tra', got %s", wErr.Body.String())
		}

		wOk := httptest.NewRecorder()
		cOk, _ := gin.CreateTestContext(wOk)
		RespondSuccess(cOk, http.StatusOK, gin.H{"status": "ok"})
		if wOk.Code != http.StatusOK {
			t.Errorf("Expected 200, got %d", wOk.Code)
		}
	}
}
