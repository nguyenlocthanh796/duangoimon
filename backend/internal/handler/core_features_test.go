package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestVerifyPin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/auth/verify-pin", VerifyPin)

	// Case 1: Hardcoded PIN 8888 must be BLOCKED (403)
	w1 := httptest.NewRecorder()
	body1 := `{"pin": "8888", "action": "void_item"}`
	req1, _ := http.NewRequest("POST", "/auth/verify-pin", bytes.NewBufferString(body1))
	req1.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusForbidden {
		t.Errorf("Expected status 403 for blocked PIN 8888, got %d", w1.Code)
	}

	// Case 2: Hardcoded PIN 9999 must be BLOCKED (403)
	w2 := httptest.NewRecorder()
	body2 := `{"pin": "9999", "action": "void_order"}`
	req2, _ := http.NewRequest("POST", "/auth/verify-pin", bytes.NewBufferString(body2))
	req2.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusForbidden {
		t.Errorf("Expected status 403 for blocked PIN 9999, got %d", w2.Code)
	}

	// Case 3: TestMode authorized PIN 123456 (200)
	wTest := httptest.NewRecorder()
	bodyTest := `{"pin": "123456", "action": "void_item"}`
	reqTest, _ := http.NewRequest("POST", "/auth/verify-pin", bytes.NewBufferString(bodyTest))
	reqTest.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wTest, reqTest)

	if wTest.Code != http.StatusOK {
		t.Errorf("Expected status 200 for Test PIN 123456, got %d", wTest.Code)
	}

	// Case 3: Invalid PIN
	w3 := httptest.NewRecorder()
	body3 := `{"pin": "1111", "action": "void_item"}`
	req3, _ := http.NewRequest("POST", "/auth/verify-pin", bytes.NewBufferString(body3))
	req3.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w3, req3)

	if w3.Code != http.StatusForbidden {
		t.Errorf("Expected status 403 for invalid PIN, got %d", w3.Code)
	}

	// Case 4: Missing PIN
	w4 := httptest.NewRecorder()
	body4 := `{"pin": "", "action": "void_item"}`
	req4, _ := http.NewRequest("POST", "/auth/verify-pin", bytes.NewBufferString(body4))
	req4.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w4, req4)

	if w4.Code != http.StatusBadRequest && w4.Code != http.StatusForbidden {
		t.Errorf("Expected status 400 or 403 for empty PIN, got %d", w4.Code)
	}
}

func TestTablesEndpointsWithoutDB(t *testing.T) {
	r := gin.New()
	r.GET("/tables", GetTables)
	r.POST("/tables/move", MoveTable)
	r.POST("/tables/merge", MergeTable)
	r.POST("/tables/split", SplitTable)

	// GET /tables
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/tables", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for GET /tables, got %d", w.Code)
	}

	// POST /tables/move same table error
	wMove := httptest.NewRecorder()
	bodyMove := `{"source_table_id": "tbl-1", "target_table_id": "tbl-1"}`
	reqMove, _ := http.NewRequest("POST", "/tables/move", bytes.NewBufferString(bodyMove))
	reqMove.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wMove, reqMove)
	if wMove.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 for identical source and target table, got %d", wMove.Code)
	}

	// POST /tables/split empty items error
	wSplit := httptest.NewRecorder()
	bodySplit := `{"source_table_id": "tbl-1", "target_table_id": "tbl-2", "item_ids": []}`
	reqSplit, _ := http.NewRequest("POST", "/tables/split", bytes.NewBufferString(bodySplit))
	reqSplit.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wSplit, reqSplit)
	if wSplit.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400 for empty split items, got %d", wSplit.Code)
	}
}

func TestKDSEndpointsWithoutDB(t *testing.T) {
	r := gin.New()
	r.GET("/kds/orders", GetKDSOrders)
	r.GET("/kds/items/grouped", GetKDSGroupedItems)
	r.PATCH("/kds/items/:id/status", UpdateKDSItemStatus)
	r.PATCH("/kds/orders/:id/status", UpdateKDSOrderStatus)

	// GET /kds/orders
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/kds/orders?station=bar", nil)
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for GET /kds/orders, got %d", w.Code)
	}

	// PATCH /kds/items/:id/status
	wItem := httptest.NewRecorder()
	bodyItem := `{"status": "dang_che_bien"}`
	reqItem, _ := http.NewRequest("PATCH", "/kds/items/item-1/status", bytes.NewBufferString(bodyItem))
	reqItem.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wItem, reqItem)
	if wItem.Code != http.StatusOK {
		t.Errorf("Expected status 200 for PATCH /kds/items/:id/status, got %d", wItem.Code)
	}
}

func TestMenuEndpointsWithoutDB(t *testing.T) {
	r := gin.New()
	r.GET("/categories", GetCategories)
	r.GET("/products", GetProducts)
	r.POST("/products/:id/toggle-86", Toggle86)
	r.PATCH("/products/:id/price", UpdateProductPrice)

	// GET /categories
	wC := httptest.NewRecorder()
	reqC, _ := http.NewRequest("GET", "/categories", nil)
	r.ServeHTTP(wC, reqC)
	if wC.Code != http.StatusOK {
		t.Errorf("Expected status 200 for GET /categories, got %d", wC.Code)
	}

	// GET /products
	wP := httptest.NewRecorder()
	reqP, _ := http.NewRequest("GET", "/products", nil)
	r.ServeHTTP(wP, reqP)
	if wP.Code != http.StatusOK {
		t.Errorf("Expected status 200 for GET /products, got %d", wP.Code)
	}

	// POST /products/:id/toggle-86
	w86 := httptest.NewRecorder()
	req86, _ := http.NewRequest("POST", "/products/prod-1/toggle-86", nil)
	r.ServeHTTP(w86, req86)
	if w86.Code != http.StatusOK {
		t.Errorf("Expected status 200 for POST /products/:id/toggle-86, got %d", w86.Code)
	}

	// PATCH /products/:id/price
	wPrice := httptest.NewRecorder()
	bodyPrice := `{"selling_price": 45000}`
	reqPrice, _ := http.NewRequest("PATCH", "/products/prod-1/price", bytes.NewBufferString(bodyPrice))
	reqPrice.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wPrice, reqPrice)
	if wPrice.Code != http.StatusOK {
		t.Errorf("Expected status 200 for PATCH /products/:id/price, got %d", wPrice.Code)
	}
}

func TestInventoryEndpointsWithoutDB(t *testing.T) {
	r := gin.New()
	r.GET("/inventory/ingredients", GetIngredients)
	r.GET("/inventory/low-stock", GetLowStockIngredients)

	// GET /inventory/ingredients
	wI := httptest.NewRecorder()
	reqI, _ := http.NewRequest("GET", "/inventory/ingredients", nil)
	r.ServeHTTP(wI, reqI)
	if wI.Code != http.StatusOK {
		t.Errorf("Expected status 200 for GET /inventory/ingredients, got %d", wI.Code)
	}

	// GET /inventory/low-stock
	wL := httptest.NewRecorder()
	reqL, _ := http.NewRequest("GET", "/inventory/low-stock", nil)
	r.ServeHTTP(wL, reqL)
	if wL.Code != http.StatusOK {
		t.Errorf("Expected status 200 for GET /inventory/low-stock, got %d", wL.Code)
	}
}

func TestSyncOrdersWithoutDB(t *testing.T) {
	r := gin.New()
	r.POST("/sync/orders", SyncOrders)

	w := httptest.NewRecorder()
	body := `{"orders": [{"client_order_id": "uuid-1", "order_code": "HD-01", "total_amount": 50000}]}`
	req, _ := http.NewRequest("POST", "/sync/orders", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200 for POST /sync/orders, got %d", w.Code)
	}

	var res map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	if res["synced_count"].(float64) != 1 {
		t.Errorf("Expected synced_count 1, got %v", res["synced_count"])
	}
}

func TestPrinterOpenDrawerAndKitchen(t *testing.T) {
	r := gin.New()
	r.POST("/printer/open-drawer", OpenDrawer)
	r.POST("/printer/print-kitchen", PrintKitchen)

	// OpenDrawer
	wD := httptest.NewRecorder()
	bodyD := `{"cashier_name": "Thu Ngan A"}`
	reqD, _ := http.NewRequest("POST", "/printer/open-drawer", bytes.NewBufferString(bodyD))
	reqD.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wD, reqD)

	if wD.Code != http.StatusOK {
		t.Errorf("Expected status 200 for OpenDrawer, got %d", wD.Code)
	}

	// PrintKitchen
	wK := httptest.NewRecorder()
	bodyK := `{
		"station": "bar",
		"table_name": "Ban 01",
		"order_code": "HD-12345",
		"items": [{"name": "Tra Sua Oolong", "qty": 2, "modifiers": "Size L, 50% Duong"}]
	}`
	reqK, _ := http.NewRequest("POST", "/printer/print-kitchen", bytes.NewBufferString(bodyK))
	reqK.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wK, reqK)

	if wK.Code != http.StatusOK {
		t.Errorf("Expected status 200 for PrintKitchen, got %d", wK.Code)
	}
}

func TestVoidOrderPinCheck(t *testing.T) {
	r := gin.New()
	r.POST("/orders/:id/void", VoidOrder)
	r.POST("/orders/:id/void-item", VoidOrderItem)

	// Void with invalid PIN
	wInvalid := httptest.NewRecorder()
	bodyInvalid := `{"pin": "0000", "reason": "Khách đổi ý"}`
	reqInvalid, _ := http.NewRequest("POST", "/orders/ord-1/void", bytes.NewBufferString(bodyInvalid))
	reqInvalid.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wInvalid, reqInvalid)

	if wInvalid.Code != http.StatusForbidden {
		t.Errorf("Expected status 403 for invalid PIN in VoidOrder, got %d", wInvalid.Code)
	}

	// Void item with invalid PIN
	wItemInvalid := httptest.NewRecorder()
	bodyItemInvalid := `{"item_id": "it-1", "pin": "0000", "reason": "Pha nhầm"}`
	reqItemInvalid, _ := http.NewRequest("POST", "/orders/ord-1/void-item", bytes.NewBufferString(bodyItemInvalid))
	reqItemInvalid.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wItemInvalid, reqItemInvalid)

	if wItemInvalid.Code != http.StatusForbidden {
		t.Errorf("Expected status 403 for invalid PIN in VoidOrderItem, got %d", wItemInvalid.Code)
	}

	// Void with valid PIN 8888 (without DB fallback)
	wValid := httptest.NewRecorder()
	bodyValid := `{"pin": "8888", "reason": "Khách đổi ý", "voided_by": "Quản lý"}`
	reqValid, _ := http.NewRequest("POST", "/orders/ord-1/void", bytes.NewBufferString(bodyValid))
	reqValid.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(wValid, reqValid)

	if wValid.Code != http.StatusOK {
		t.Errorf("Expected status 200 for valid PIN 8888 in VoidOrder, got %d", wValid.Code)
	}
}
