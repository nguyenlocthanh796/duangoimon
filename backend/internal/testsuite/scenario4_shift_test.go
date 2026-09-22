package testsuite

import (
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/ongchu/pos-backend/internal/handler"
	"github.com/ongchu/pos-backend/internal/models"
)

func TestScenario4_Shift_Lifecycle_Cash_Flow_And_Reconciliation(t *testing.T) {
	db, router := SetupTestEnv(t)
	tenant, branch, table, cashier, _ := SeedInitialStoreData(db)

	// 1. Open Shift: POST /api/v1/shifts/open
	openReq := handler.OpenShiftRequest{
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		CashierID:    cashier.ID,
		CashierName:  cashier.FullName,
		ShiftName:    "Ca Sáng",
		StartingCash: 1000000.0,
	}
	wOpen := PerformRequest(router, "POST", "/api/v1/shifts/open", openReq)
	if wOpen.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created for open shift, got %d: %s", wOpen.Code, wOpen.Body.String())
	}
	var openResp map[string]interface{}
	ParseJSON(t, wOpen, &openResp)
	shiftData := openResp["shift"].(map[string]interface{})
	shiftID := shiftData["id"].(string)

	// Verify active shift returned by GET /api/v1/shifts/current
	wCurrent := PerformRequest(router, "GET", fmt.Sprintf("/api/v1/shifts/current?tenant_id=%s&branch_id=%s", tenant.ID, branch.ID), nil)
	if wCurrent.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for current shift, got %d: %s", wCurrent.Code, wCurrent.Body.String())
	}
	var currentResp map[string]interface{}
	ParseJSON(t, wCurrent, &currentResp)
	activeShift := currentResp["active_shift"].(map[string]interface{})
	if activeShift["id"].(string) != shiftID {
		t.Errorf("Expected current shift ID '%s', got '%s'", shiftID, activeShift["id"])
	}

	// 2. Complete Cash Orders in this shift:
	// Order A (200,000 VND)
	orderAReq := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		TableID:     &table.ID,
		CashierName: cashier.FullName,
		OrderType:   "dine_in",
		ShiftID:     &shiftID,
		Items: []handler.OrderItemRequest{
			{ProductName: "Lẩu Thái Hải Sản Nhỏ", UnitPrice: 200000.0, Quantity: 1, Station: "kitchen"},
		},
	}
	wOrderA := PerformRequest(router, "POST", "/api/v1/orders", orderAReq)
	var orderA models.Order
	ParseJSON(t, wOrderA, &orderA)
	wPayA := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", orderA.ID), handler.PayOrderRequest{
		PaymentMethod: "tien_mat",
		PaidAmount:    200000.0,
	})
	if wPayA.Code != http.StatusOK {
		t.Fatalf("Failed to pay Order A: %s", wPayA.Body.String())
	}

	// Order B (300,000 VND)
	orderBReq := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		TableID:     &table.ID,
		CashierName: cashier.FullName,
		OrderType:   "dine_in",
		ShiftID:     &shiftID,
		Items: []handler.OrderItemRequest{
			{ProductName: "Lẩu Thái Hải Sản Lớn", UnitPrice: 300000.0, Quantity: 1, Station: "kitchen"},
		},
	}
	wOrderB := PerformRequest(router, "POST", "/api/v1/orders", orderBReq)
	var orderB models.Order
	ParseJSON(t, wOrderB, &orderB)
	wPayB := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", orderB.ID), handler.PayOrderRequest{
		PaymentMethod: "tien_mat",
		PaidAmount:    300000.0,
	})
	if wPayB.Code != http.StatusOK {
		t.Fatalf("Failed to pay Order B: %s", wPayB.Body.String())
	}

	// Total cash sales = 200,000 + 300,000 = 500,000 VND

	// 3. Record Cash In (Thu ngoài): 150,000 VND (Bổ sung tiền thối lẻ)
	cashInReq := handler.CreateCashTransactionRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		ShiftID:     &shiftID,
		Type:        "thu",
		Category:    "thu_khac",
		Amount:      150000.0,
		Description: "Bổ sung tiền thối lẻ đầu ca",
		PerformedBy: cashier.FullName,
	}
	wCashIn := PerformRequest(router, "POST", "/api/v1/cash/transactions", cashInReq)
	if wCashIn.Code != http.StatusCreated {
		t.Fatalf("Expected 201 for Cash In, got %d: %s", wCashIn.Code, wCashIn.Body.String())
	}

	// 4. Record Cash Out (Chi chợ):
	// Chi mua đá: 40,000 VND
	cashOut1 := handler.CreateCashTransactionRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		ShiftID:     &shiftID,
		Type:        "chi",
		Category:    "chi_mua_da",
		Amount:      40000.0,
		Description: "Mua 2 bao đá bi ngoài đại lý",
		PerformedBy: cashier.FullName,
	}
	PerformRequest(router, "POST", "/api/v1/cash/transactions", cashOut1)

	// Chi mua rau chanh sả: 110,000 VND
	cashOut2 := handler.CreateCashTransactionRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		ShiftID:     &shiftID,
		Type:        "chi",
		Category:    "chi_mua_rau_cho",
		Amount:      110000.0,
		Description: "Mua 5kg chanh, sả, ớt chợ sớm",
		PerformedBy: cashier.FullName,
	}
	PerformRequest(router, "POST", "/api/v1/cash/transactions", cashOut2)

	// Total cash out = 40,000 + 110,000 = 150,000 VND

	// 5. Query Sổ Quỹ Cash Summary: GET /api/v1/cash/summary
	wSummary := PerformRequest(router, "GET", fmt.Sprintf("/api/v1/cash/summary?tenant_id=%s", tenant.ID), nil)
	if wSummary.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for cash summary, got %d: %s", wSummary.Code, wSummary.Body.String())
	}
	var summaryResp map[string]interface{}
	ParseJSON(t, wSummary, &summaryResp)
	if summaryResp["total_in"].(float64) != 150000.0 {
		t.Errorf("Expected total_in 150,000 VND, got %v", summaryResp["total_in"])
	}
	if summaryResp["total_out"].(float64) != 150000.0 {
		t.Errorf("Expected total_out 150,000 VND, got %v", summaryResp["total_out"])
	}
	if summaryResp["net_balance"].(float64) != 0.0 {
		t.Errorf("Expected net_balance 0 VND, got %v", summaryResp["net_balance"])
	}

	// 6. Close Shift (Balanced Case):
	// Expected Ending Cash = Starting (1,000,000) + Cash Sales (500,000) + Cash In (150,000) - Cash Out (150,000) = 1,500,000 VND
	// Counted cash = 1,500,000 VND -> diff = 0
	closeBalancedReq := handler.CloseShiftRequest{
		ActualEndingCash: 1500000.0,
		Note:             "Khớp tiền 100% không lệch đồng nào",
	}
	wCloseBalanced := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/shifts/%s/close", shiftID), closeBalancedReq)
	if wCloseBalanced.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK closing balanced shift, got %d: %s", wCloseBalanced.Code, wCloseBalanced.Body.String())
	}

	var closedShift models.CashShift
	db.First(&closedShift, "id = ?", shiftID)
	if closedShift.Status != "da_dong" {
		t.Errorf("Expected status 'da_dong', got '%s'", closedShift.Status)
	}
	if closedShift.ExpectedEndingCash != 1500000.0 {
		t.Errorf("ExpectedEndingCash: expected 1,500,000 VND, got %.0f", closedShift.ExpectedEndingCash)
	}
	if closedShift.ActualEndingCash != 1500000.0 {
		t.Errorf("ActualEndingCash: expected 1,500,000 VND, got %.0f", closedShift.ActualEndingCash)
	}
	if closedShift.DifferenceAmount != 0.0 {
		t.Errorf("DifferenceAmount: expected 0, got %.0f", closedShift.DifferenceAmount)
	}

	// Verify no audit log generated for 0 difference
	var auditCount int64
	db.Model(&models.AuditLog{}).Where("action = 'lech_ket_giao_ca' AND tenant_id = ?", tenant.ID).Count(&auditCount)
	if auditCount != 0 {
		t.Errorf("Should not create discrepancy audit log when diff == 0, count is %d", auditCount)
	}

	// 7. Sub-test: Shortage Case (Thiếu Két > 50,000 VND -> severity: danger)
	openReq2 := handler.OpenShiftRequest{
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		CashierID:    cashier.ID,
		CashierName:  cashier.FullName,
		ShiftName:    "Ca Chiều",
		StartingCash: 500000.0,
	}
	wOpen2 := PerformRequest(router, "POST", "/api/v1/shifts/open", openReq2)
	var openResp2 map[string]interface{}
	ParseJSON(t, wOpen2, &openResp2)
	shift2ID := openResp2["shift"].(map[string]interface{})["id"].(string)

	// Cash sale 300,000 VND -> Expected = 500,000 + 300,000 = 800,000 VND
	orderCReq := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		CashierName: cashier.FullName,
		OrderType:   "take_away",
		ShiftID:     &shift2ID,
		Items: []handler.OrderItemRequest{
			{ProductName: "Trà Trái Cây Size L", UnitPrice: 300000.0, Quantity: 1, Station: "bar"},
		},
	}
	wOrderC := PerformRequest(router, "POST", "/api/v1/orders", orderCReq)
	var orderC models.Order
	ParseJSON(t, wOrderC, &orderC)
	PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", orderC.ID), handler.PayOrderRequest{
		PaymentMethod: "tien_mat",
		PaidAmount:    300000.0,
	})

	// Cashier counts actual ending cash = 700,000 VND (Shortage of 100,000 VND)
	closeShortageReq := handler.CloseShiftRequest{
		ActualEndingCash: 700000.0,
		Note:             "Thiếu tiền lẻ thối nhầm cho khách",
	}
	wCloseShortage := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/shifts/%s/close", shift2ID), closeShortageReq)
	if wCloseShortage.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK closing shortage shift, got %d: %s", wCloseShortage.Code, wCloseShortage.Body.String())
	}

	var closedShift2 models.CashShift
	db.First(&closedShift2, "id = ?", shift2ID)
	if closedShift2.DifferenceAmount != -100000.0 {
		t.Fatalf("Expected difference -100,000 VND, got %.0f", closedShift2.DifferenceAmount)
	}

	// Verify Audit Log for shortage with severity "danger" (since diff < -50,000)
	var shortageLog models.AuditLog
	err := db.Where("action = ? AND tenant_id = ?", "lech_ket_giao_ca", tenant.ID).Order("created_at DESC").First(&shortageLog).Error
	if err != nil {
		t.Fatalf("Failed to find discrepancy audit log: %v", err)
	}
	if shortageLog.Severity != "danger" {
		t.Errorf("Expected audit log severity 'danger' for shortage of -100k, got '%s'", shortageLog.Severity)
	}
	if !strings.Contains(shortageLog.Details, "-100000") {
		t.Errorf("Audit log details should mention -100000: %s", shortageLog.Details)
	}
}
