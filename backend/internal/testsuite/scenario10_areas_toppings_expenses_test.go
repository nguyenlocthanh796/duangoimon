package testsuite

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ongchu/pos-backend/internal/models"
)

func TestScenario10_Areas_Toppings_And_Recurring_Expenses(t *testing.T) {
	db, router := SetupTestEnv(t)

	// 1. Quản lý Khu Vực Bàn Ăn (Areas)
	wArea := httptest.NewRecorder()
	bodyArea := `{"name": "Khu VIP Sân Thượng"}`
	reqArea, _ := http.NewRequest("POST", "/api/v1/areas", bytes.NewBufferString(bodyArea))
	reqArea.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wArea, reqArea)
	if wArea.Code != http.StatusCreated {
		t.Fatalf("Expected status 201 for creating area, got %d", wArea.Code)
	}

	var resArea struct {
		Data models.Area `json:"data"`
	}
	_ = json.Unmarshal(wArea.Body.Bytes(), &resArea)
	areaID := resArea.Data.ID

	// Cập nhật tên khu vực
	wAreaUp := httptest.NewRecorder()
	bodyAreaUp := `{"name": "Khu VIP Rooftop Bar"}`
	reqAreaUp, _ := http.NewRequest("PUT", "/api/v1/areas/"+areaID, bytes.NewBufferString(bodyAreaUp))
	reqAreaUp.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wAreaUp, reqAreaUp)
	if wAreaUp.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for updating area, got %d", wAreaUp.Code)
	}

	// Sắp xếp thứ tự khu vực (Reorder)
	wAreaReorder := httptest.NewRecorder()
	bodyAreaReorder := `{"area_ids": ["` + areaID + `"]}`
	reqAreaReorder, _ := http.NewRequest("POST", "/api/v1/areas/reorder", bytes.NewBufferString(bodyAreaReorder))
	reqAreaReorder.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wAreaReorder, reqAreaReorder)
	if wAreaReorder.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for reordering areas, got %d", wAreaReorder.Code)
	}

	// 2. Quản lý Topping / Modifier
	wTop := httptest.NewRecorder()
	bodyTop := `{"name": "Trân Châu Hoàng Gia Mới", "price_delta": 8000}`
	reqTop, _ := http.NewRequest("POST", "/api/v1/toppings", bytes.NewBufferString(bodyTop))
	reqTop.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wTop, reqTop)
	if wTop.Code != http.StatusCreated {
		t.Fatalf("Expected status 201 for creating topping, got %d", wTop.Code)
	}

	var resTop struct {
		Data models.Topping `json:"data"`
	}
	_ = json.Unmarshal(wTop.Body.Bytes(), &resTop)
	toppingID := resTop.Data.ID

	// Cập nhật giá topping
	wTopUp := httptest.NewRecorder()
	bodyTopUp := `{"name": "Trân Châu Hoàng Gia Mới", "price_delta": 10000}`
	reqTopUp, _ := http.NewRequest("PUT", "/api/v1/toppings/"+toppingID, bytes.NewBufferString(bodyTopUp))
	reqTopUp.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wTopUp, reqTopUp)
	if wTopUp.Code != http.StatusOK {
		t.Fatalf("Expected status 200 for updating topping, got %d", wTopUp.Code)
	}

	// 3. Quản lý Chi Phí Định Kỳ (Recurring Expenses)
	wExp := httptest.NewRecorder()
	bodyExp := `{
		"title": "Tiền thuê mặt bằng tháng 9",
		"category": "mat_bang",
		"amount": 18000000,
		"frequency": "monthly",
		"due_day": 5,
		"auto_record": false
	}`
	reqExp, _ := http.NewRequest("POST", "/api/v1/expenses/recurring", bytes.NewBufferString(bodyExp))
	reqExp.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wExp, reqExp)
	if wExp.Code != http.StatusCreated {
		t.Fatalf("Expected status 201 for creating recurring expense, got %d", wExp.Code)
	}

	var resExp struct {
		Data models.RecurringExpense `json:"data"`
	}
	_ = json.Unmarshal(wExp.Body.Bytes(), &resExp)
	expenseID := resExp.Data.ID

	// Ghi nhận chi phí vào Sổ Quỹ Tiền Mặt 1-chạm
	wRec := httptest.NewRecorder()
	bodyRec := `{"performed_by": "Chủ Quán", "note": "Thanh toán đợt 1"}`
	reqRec, _ := http.NewRequest("POST", "/api/v1/expenses/recurring/"+expenseID+"/record", bytes.NewBufferString(bodyRec))
	reqRec.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(wRec, reqRec)
	if wRec.Code != http.StatusCreated {
		t.Fatalf("Expected status 201 for recording expense to cash flow, got %d", wRec.Code)
	}

	// Kiểm tra xem phiếu chi tương ứng đã xuất hiện trong bảng cash_transactions chưa
	var cashTx models.CashTransaction
	if err := db.Where("amount = ? AND category = ?", 18000000, "mat_bang").First(&cashTx).Error; err != nil {
		t.Fatalf("Expected cash transaction for recurring expense to be created: %v", err)
	}
}
