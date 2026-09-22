package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/config"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
)

func setupTestDBForBill(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := config.LoadConfig()
	database.InitDB(cfg)

	// Seed 1 order test
	order := models.Order{
		ID:             "order_test_bill_001",
		TenantID:       "tenant_ongchu",
		BranchID:       "branch_01",
		OrderCode:      "HD-9999",
		CashierName:    "Thu Ngân Test",
		CustomerName:   "Khách Hàng VIP",
		OrderType:      "dine_in",
		Status:         "da_thanh_toan",
		Subtotal:       85000,
		DiscountAmount: 10000,
		TotalAmount:    75000,
		PaymentMethod:  "chuyen_khoan_vietqr",
		PaidAmount:     75000,
		CreatedAt:      time.Now(),
	}

	database.DB.Where("order_id = ?", order.ID).Delete(&models.OrderItem{})
	database.DB.Where("id = ?", order.ID).Delete(&models.Order{})

	if err := database.DB.Create(&order).Error; err != nil {
		t.Fatalf("Failed to create test order: %v", err)
	}

	item1 := models.OrderItem{
		ID:           "item_bill_001",
		OrderID:      order.ID,
		ProductName:  "Trà Đào Cam Sả",
		UnitPrice:    45000,
		CostPrice:    18000, // Giá vốn bí mật (không được lộ ra JSON)
		Quantity:     1,
		SelectedSize: "L",
		TotalPrice:   45000,
	}
	item2 := models.OrderItem{
		ID:           "item_bill_002",
		OrderID:      order.ID,
		ProductName:  "Cà Phê Sữa Đá",
		UnitPrice:    40000,
		CostPrice:    12000,
		Quantity:     1,
		SelectedSize: "M",
		TotalPrice:   40000,
	}

	database.DB.Create(&item1)
	database.DB.Create(&item2)
}

func TestRenderPublicBill_Success(t *testing.T) {
	setupTestDBForBill(t)

	r := gin.New()
	r.GET("/b/:code", RenderPublicBill)

	req, _ := http.NewRequest("GET", "/b/HD-9999", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !bytes.Contains([]byte(body), []byte("HD-9999")) {
		t.Errorf("Expected body to contain order code HD-9999")
	}
	if !bytes.Contains([]byte(body), []byte("Trà Đào Cam Sả")) {
		t.Errorf("Expected body to contain item name")
	}
	if !bytes.Contains([]byte(body), []byte("75.000 đ")) {
		t.Errorf("Expected body to contain total amount 75.000 đ")
	}
	if !bytes.Contains([]byte(body), []byte("ĐÃ THANH TOÁN")) {
		t.Errorf("Expected body to contain paid status badge")
	}
}

func TestRenderPublicBill_NotFound(t *testing.T) {
	setupTestDBForBill(t)

	r := gin.New()
	r.GET("/b/:code", RenderPublicBill)

	req, _ := http.NewRequest("GET", "/b/HD-NON-EXISTENT", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", w.Code)
	}

	body := w.Body.String()
	if !bytes.Contains([]byte(body), []byte("Không tìm thấy hóa đơn")) {
		t.Errorf("Expected 404 page message")
	}
}

func TestGetPublicBillJSON_Sanitization(t *testing.T) {
	setupTestDBForBill(t)

	r := gin.New()
	r.GET("/api/v1/public/bills/:code", GetPublicBillJSON)

	req, _ := http.NewRequest("GET", "/api/v1/public/bills/HD-9999", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	var resp struct {
		Success bool               `json:"success"`
		Data    PublicBillResponse `json:"data"`
	}

	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to parse JSON: %v", err)
	}

	if !resp.Success {
		t.Errorf("Expected success to be true")
	}
	if resp.Data.OrderCode != "HD-9999" {
		t.Errorf("Expected order code HD-9999, got %s", resp.Data.OrderCode)
	}
	if len(resp.Data.Items) != 2 {
		t.Errorf("Expected 2 items, got %d", len(resp.Data.Items))
	}

	// Kiểm tra bảo mật: Không được chứa trường cost_price trong raw JSON
	rawJSON := w.Body.String()
	if bytes.Contains([]byte(rawJSON), []byte("cost_price")) {
		t.Errorf("SECURITY LEAK: Public bill JSON must NOT contain cost_price")
	}
}

func TestWriteESCPOSQRCode(t *testing.T) {
	var buf bytes.Buffer
	testURL := "https://ongchu.cloud/b/HD-001"
	WriteESCPOSQRCode(&buf, testURL)

	if buf.Len() == 0 {
		t.Errorf("Expected ESC/POS buffer to have data")
	}

	rawBytes := buf.Bytes()
	// Kiểm tra byte header GS ( k (\x1D\x28\x6B)
	if rawBytes[0] != 0x1D || rawBytes[1] != 0x28 || rawBytes[2] != 0x6B {
		t.Errorf("Expected GS ( k ESC/POS QR header, got %v", rawBytes[:3])
	}
}
