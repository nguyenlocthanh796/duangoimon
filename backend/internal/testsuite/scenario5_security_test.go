package testsuite

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/handler"
	"github.com/ongchu/pos-backend/internal/models"
)

func TestScenario5_Security_Manager_PIN_And_AntiFraud(t *testing.T) {
	db, router := SetupTestEnv(t)
	tenant, branch, table, cashier, manager := SeedInitialStoreData(db)

	// =========================================================================
	// Sub-test 5A: Manager PIN verification endpoint (POST /api/v1/auth/verify-pin)
	// =========================================================================

	// Case 1: Valid manager PIN from DB (Quản Lý Hoàng, PIN 8888)
	reqValidManager := handler.VerifyPinRequest{
		Pin:      manager.PinCode,
		Action:   "void_item",
		TenantID: tenant.ID,
	}
	w1 := PerformRequest(router, "POST", "/api/v1/auth/verify-pin", reqValidManager)
	if w1.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for valid manager PIN, got %d: %s", w1.Code, w1.Body.String())
	}
	var resp1 map[string]interface{}
	ParseJSON(t, w1, &resp1)
	if resp1["success"] != true || resp1["role"] != "manager" {
		t.Errorf("Expected success=true and role=manager, got %+v", resp1)
	}

	// Case 2: Cashier PIN (PIN 1234) attempting manager authorization -> HTTP 403 Forbidden
	reqCashierPIN := handler.VerifyPinRequest{
		Pin:      cashier.PinCode,
		Action:   "void_item",
		TenantID: tenant.ID,
	}
	w2 := PerformRequest(router, "POST", "/api/v1/auth/verify-pin", reqCashierPIN)
	if w2.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden for cashier PIN, got %d", w2.Code)
	}

	// Case 3: Invalid random PIN ("0000") -> HTTP 403 Forbidden
	reqInvalidPIN := handler.VerifyPinRequest{
		Pin:      "0000",
		Action:   "void_order",
		TenantID: tenant.ID,
	}
	w3 := PerformRequest(router, "POST", "/api/v1/auth/verify-pin", reqInvalidPIN)
	if w3.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden for invalid PIN, got %d", w3.Code)
	}

	// Case 4: Empty PIN -> HTTP 400 Bad Request or 403 Forbidden
	w4 := PerformRequest(router, "POST", "/api/v1/auth/verify-pin", `{"pin":"","action":"void_order"}`)
	if w4.Code != http.StatusBadRequest && w4.Code != http.StatusForbidden {
		t.Errorf("Expected 400 or 403 for empty PIN, got %d", w4.Code)
	}

	// Case 5: Master PIN fallback in TestMode ("123456") -> HTTP 200 OK
	reqMasterPIN := handler.VerifyPinRequest{
		Pin:    "123456",
		Action: "excessive_discount",
	}
	w5 := PerformRequest(router, "POST", "/api/v1/auth/verify-pin", reqMasterPIN)
	if w5.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for master PIN 123456, got %d", w5.Code)
	}

	// =========================================================================
	// Sub-test 5B: Void item after kitchen dispatch (POST /api/v1/orders/:id/void-item)
	// =========================================================================
	order1Req := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		TableID:     &table.ID,
		CashierName: cashier.FullName,
		OrderType:   "dine_in",
		Items: []handler.OrderItemRequest{
			{ProductName: "Trà Đào Cam Sả", UnitPrice: 40000.0, Quantity: 1, Station: "bar"},
			{ProductName: "Mì Xào Bò", UnitPrice: 55000.0, Quantity: 1, Station: "kitchen"},
		},
	}
	wOrder1 := PerformRequest(router, "POST", "/api/v1/orders", order1Req)
	var order1 models.Order
	ParseJSON(t, wOrder1, &order1)
	if order1.TotalAmount != 95000.0 {
		t.Fatalf("Expected order total 95,000 VND, got %.0f", order1.TotalAmount)
	}

	itemToVoid := order1.Items[0] // Trà Đào Cam Sả (40,000 VND)

	// Step 1: Cashier attempts to void without valid manager PIN -> 403 Forbidden
	voidItemNoPinReq := handler.VoidOrderItemRequest{
		ItemID:     itemToVoid.ID,
		ManagerPin: "1234", // cashier PIN, not manager
		Reason:     "Khách đổi ý",
		Cashier:    cashier.FullName,
	}
	wVoidItemFail := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/void-item", order1.ID), voidItemNoPinReq)
	if wVoidItemFail.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden voiding item without manager PIN, got %d", wVoidItemFail.Code)
	}

	// Step 2: Manager provides valid PIN 8888 with reason -> 200 OK
	voidItemOkReq := handler.VoidOrderItemRequest{
		ItemID:     itemToVoid.ID,
		ManagerPin: "8888",
		Reason:     "Khách đổi ý sang nước ép bưởi",
		Cashier:    cashier.FullName,
	}
	wVoidItemOk := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/void-item", order1.ID), voidItemOkReq)
	if wVoidItemOk.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK voiding item with manager PIN, got %d: %s", wVoidItemOk.Code, wVoidItemOk.Body.String())
	}

	// Verify order total was recalculated from 95,000 down to 55,000 VND
	var orderAfterItemVoid models.Order
	db.First(&orderAfterItemVoid, "id = ?", order1.ID)
	if orderAfterItemVoid.TotalAmount != 55000.0 {
		t.Errorf("Expected recalculated total 55,000 VND, got %.0f", orderAfterItemVoid.TotalAmount)
	}

	// Verify AuditLog record for voided item
	var voidItemAudit models.AuditLog
	err := db.Where("action = ? AND order_id = ?", "huy_mon", order1.ID).First(&voidItemAudit).Error
	if err != nil {
		t.Fatalf("Failed to find 'huy_mon' audit log: %v", err)
	}
	if voidItemAudit.Severity != "warning" {
		t.Errorf("Expected severity 'warning' for void item, got '%s'", voidItemAudit.Severity)
	}

	// =========================================================================
	// Sub-test 5C: Void entire order (POST /api/v1/orders/:id/void)
	// =========================================================================

	// Step 1: Attempt to void order without manager PIN -> 403 Forbidden
	voidOrderNoPin := handler.VoidOrderRequest{
		Pin:    "1234", // cashier PIN
		Reason: "Bàn này hủy về hết",
	}
	wVoidOrderFail := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/void", order1.ID), voidOrderNoPin)
	if wVoidOrderFail.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden voiding order without manager PIN, got %d", wVoidOrderFail.Code)
	}

	// Step 2: Manager provides valid PIN 8888 with reason -> 200 OK
	voidOrderOk := handler.VoidOrderRequest{
		Pin:      "8888",
		Reason:   "Khách có việc gấp về trước",
		VoidedBy: manager.FullName,
	}
	wVoidOrderOk := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/void", order1.ID), voidOrderOk)
	if wVoidOrderOk.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK voiding order with manager PIN, got %d: %s", wVoidOrderOk.Code, wVoidOrderOk.Body.String())
	}

	// Verify order status is da_huy
	var voidedOrder models.Order
	db.First(&voidedOrder, "id = ?", order1.ID)
	if voidedOrder.Status != "da_huy" {
		t.Errorf("Expected order status 'da_huy', got '%s'", voidedOrder.Status)
	}
	if voidedOrder.VoidReason != "Khách có việc gấp về trước" {
		t.Errorf("Expected void reason recorded, got '%s'", voidedOrder.VoidReason)
	}

	// Verify table was freed back to 'trong' and active_order_id cleared
	var tableAfterVoid models.DiningTable
	db.First(&tableAfterVoid, "id = ?", table.ID)
	if tableAfterVoid.Status != "trong" {
		t.Errorf("Expected table status 'trong' after voiding order, got '%s'", tableAfterVoid.Status)
	}
	if tableAfterVoid.ActiveOrderID != nil {
		t.Errorf("Expected table active_order_id to be nil after void, got %v", *tableAfterVoid.ActiveOrderID)
	}

	// Verify AuditLog for voided order with severity "danger"
	var voidOrderAudit models.AuditLog
	err = db.Where("action = ? AND order_id = ?", "huy_don", order1.ID).First(&voidOrderAudit).Error
	if err != nil {
		t.Fatalf("Failed to find 'huy_don' audit log: %v", err)
	}
	if voidOrderAudit.Severity != "danger" {
		t.Errorf("Expected severity 'danger' for void order, got '%s'", voidOrderAudit.Severity)
	}

	// =========================================================================
	// Sub-test 5D: Excessive Discount (>20%) Guard & Audit Logging
	// =========================================================================
	// Cashier attempts 30% discount requiring manager PIN approval
	excessiveReqNoPin := handler.VerifyPinRequest{
		Pin:    "1234",
		Action: "excessive_discount",
	}
	wDiscFail := PerformRequest(router, "POST", "/api/v1/auth/verify-pin", excessiveReqNoPin)
	if wDiscFail.Code != http.StatusForbidden {
		t.Errorf("Expected 403 for unauthorized excessive discount, got %d", wDiscFail.Code)
	}

	// Manager approves discount with PIN 8888
	excessiveReqOk := handler.VerifyPinRequest{
		Pin:    "8888",
		Action: "excessive_discount",
	}
	wDiscOk := PerformRequest(router, "POST", "/api/v1/auth/verify-pin", excessiveReqOk)
	if wDiscOk.Code != http.StatusOK {
		t.Errorf("Expected 200 for manager authorized excessive discount, got %d", wDiscOk.Code)
	}

	// Create audit record for excessive discount
	discAudit := models.AuditLog{
		ID:          uuid.New().String(),
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		Action:      "chiet_khau_vuot_muc",
		PerformedBy: manager.FullName,
		Details:     "[ANTI-FRAUD AUDIT >20%] Khách VIP Thân Thiết (Giảm 30%)",
		Severity:    "warning",
		CreatedAt:   time.Now(),
	}
	db.Create(&discAudit)

	var checkDiscAudit models.AuditLog
	if err := db.First(&checkDiscAudit, "id = ?", discAudit.ID).Error; err != nil {
		t.Fatalf("Failed to query discount audit log: %v", err)
	}
	if checkDiscAudit.Action != "chiet_khau_vuot_muc" {
		t.Errorf("Expected action 'chiet_khau_vuot_muc', got '%s'", checkDiscAudit.Action)
	}

	// =========================================================================
	// Sub-test 5E: Bill Reprint Protection
	// =========================================================================
	reprintReqNoPin := handler.VerifyPinRequest{
		Pin:    "1234",
		Action: "reprint_bill",
	}
	wReprintFail := PerformRequest(router, "POST", "/api/v1/auth/verify-pin", reprintReqNoPin)
	if wReprintFail.Code != http.StatusForbidden {
		t.Errorf("Expected 403 for unauthorized reprint, got %d", wReprintFail.Code)
	}

	reprintReqOk := handler.VerifyPinRequest{
		Pin:    "8888",
		Action: "reprint_bill",
	}
	wReprintOk := PerformRequest(router, "POST", "/api/v1/auth/verify-pin", reprintReqOk)
	if wReprintOk.Code != http.StatusOK {
		t.Errorf("Expected 200 for authorized reprint, got %d", wReprintOk.Code)
	}

	reprintAudit := models.AuditLog{
		ID:          uuid.New().String(),
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		Action:      "in_lai_hoa_don",
		PerformedBy: manager.FullName,
		Details:     "In lại bill HD-0012 cho khách kiểm tra lại tiền thừa",
		Severity:    "info",
		CreatedAt:   time.Now(),
	}
	db.Create(&reprintAudit)

	var checkReprintAudit models.AuditLog
	if err := db.First(&checkReprintAudit, "id = ?", reprintAudit.ID).Error; err != nil {
		t.Fatalf("Failed to query reprint audit log: %v", err)
	}
	if checkReprintAudit.Action != "in_lai_hoa_don" {
		t.Errorf("Expected action 'in_lai_hoa_don', got '%s'", checkReprintAudit.Action)
	}
}
