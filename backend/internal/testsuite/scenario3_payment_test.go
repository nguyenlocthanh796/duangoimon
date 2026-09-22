package testsuite

import (
	"bytes"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/handler"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/service"
)

func TestScenario3_Payment_VietQR_CashDrawer_ShiftSeparation(t *testing.T) {
	db, router := SetupTestEnv(t)
	tenant, branch, table, cashier, _ := SeedInitialStoreData(db)

	// Open a cashier shift with 1,000,000 VND starting cash
	shift := models.CashShift{
		ID:                 uuid.New().String(),
		TenantID:           tenant.ID,
		BranchID:           branch.ID,
		CashierID:          cashier.ID,
		CashierName:        cashier.FullName,
		ShiftName:          "Ca Sáng",
		StartingCash:       1000000.0,
		TotalCashSales:     0,
		TotalVietQRSales:   0,
		TotalCashIn:        0,
		TotalCashOut:       0,
		ExpectedEndingCash: 1000000.0,
		ActualEndingCash:   0,
		Status:             "dang_mo",
		OpenedAt:           time.Now(),
	}
	db.Create(&shift)

	// Save POS Settings for VietQR banking
	posSettings := models.POSSettings{
		ID:              uuid.New().String(),
		TenantID:        tenant.ID,
		BranchID:        branch.ID,
		StoreName:       "OngChu POS Flagship",
		BankName:        "MBBank",
		BankAccountNo:   "0987654321",
		BankAccountName: "NGUYEN LOC THANH",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	db.Create(&posSettings)

	// 1. Create Order with Subtotal = 150,000 VND, Discount = 15,000 VND -> Total = 135,000 VND
	orderReq := handler.CreateOrderRequest{
		TenantID:       tenant.ID,
		BranchID:       branch.ID,
		TableID:        &table.ID,
		CashierName:    cashier.FullName,
		OrderType:      "dine_in",
		DiscountAmount: 15000.0,
		ShiftID:        &shift.ID,
		Items: []handler.OrderItemRequest{
			{
				ProductName: "Cà Phê Muối Đặc Biệt",
				UnitPrice:   35000.0,
				Quantity:    2,
				Station:     "bar",
			},
			{
				ProductName: "Bánh Croissant Trứng Muối",
				UnitPrice:   40000.0,
				Quantity:    2,
				Station:     "snack",
			},
		},
	}
	wOrder := PerformRequest(router, "POST", "/api/v1/orders", orderReq)
	if wOrder.Code != http.StatusCreated {
		t.Fatalf("Expected 201 for order, got %d: %s", wOrder.Code, wOrder.Body.String())
	}
	var order1 models.Order
	ParseJSON(t, wOrder, &order1)

	if order1.Subtotal != 150000.0 {
		t.Errorf("Expected subtotal 150,000 VND, got %.0f", order1.Subtotal)
	}
	if order1.TotalAmount != 135000.0 {
		t.Errorf("Expected total amount 135,000 VND, got %.0f", order1.TotalAmount)
	}

	// 2. Sub-test 3A: Dynamic Napas 247 VietQR Validation
	// Test via service direct functions
	quickLink := service.GenerateVietQRQuickLink("970422", "0987654321", "NGUYEN LOC THANH", order1.TotalAmount, order1.OrderCode)
	if !strings.Contains(quickLink, "amount=135000") {
		t.Errorf("QuickLink does not contain exact amount 135000: %s", quickLink)
	}
	if !strings.Contains(quickLink, order1.OrderCode) {
		t.Errorf("QuickLink does not contain order code %s: %s", order1.OrderCode, quickLink)
	}

	emvco := service.GenerateVietQREMVCo("970422", "0987654321", order1.TotalAmount, order1.OrderCode)
	// Validate Napas 247 EMVCo standard tags
	if !strings.HasPrefix(emvco, "000201010212") {
		t.Errorf("EMVCo should start with Payload Format Indicator (000201) & Dynamic Method (010212): %s", emvco)
	}
	if !strings.Contains(emvco, "5303704") { // Tag 53: VND currency (704)
		t.Errorf("EMVCo missing Tag 53 Currency 704: %s", emvco)
	}
	if !strings.Contains(emvco, "5406135000") { // Tag 54: Amount 135000 (length 6)
		t.Errorf("EMVCo missing Tag 54 Amount 135000: %s", emvco)
	}
	if !strings.Contains(emvco, "5802VN") { // Tag 58: Country VN
		t.Errorf("EMVCo missing Tag 58 Country VN: %s", emvco)
	}
	if !strings.Contains(emvco, "A000000727") { // Napas AID / GUID
		t.Errorf("EMVCo missing Napas GUID A000000727: %s", emvco)
	}
	if !strings.Contains(emvco, "6304") { // Tag 63: CRC16 prefix
		t.Errorf("EMVCo missing Tag 63 CRC: %s", emvco)
	}

	// Test via HTTP endpoint GET /api/v1/orders/:id/vietqr
	wQR := PerformRequest(router, "GET", fmt.Sprintf("/api/v1/orders/%s/vietqr", order1.ID), nil)
	if wQR.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for VietQR endpoint, got %d: %s", wQR.Code, wQR.Body.String())
	}
	var qrResp map[string]interface{}
	ParseJSON(t, wQR, &qrResp)
	if qrResp["amount"].(float64) != 135000.0 {
		t.Errorf("Expected amount 135,000 in QR response, got %v", qrResp["amount"])
	}

	// 3. Sub-test 3B: Cash Payment & Hardware Drawer Kick
	// Customer pays 200,000 VND cash for 135,000 VND bill -> Change = 65,000 VND
	payCashReq := handler.PayOrderRequest{
		PaymentMethod: "tien_mat",
		PaidAmount:    200000.0,
	}
	wPayCash := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", order1.ID), payCashReq)
	if wPayCash.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for cash payment, got %d: %s", wPayCash.Code, wPayCash.Body.String())
	}

	var paidOrder1 models.Order
	db.First(&paidOrder1, "id = ?", order1.ID)
	if paidOrder1.Status != "da_thanh_toan" {
		t.Errorf("Expected status 'da_thanh_toan', got '%s'", paidOrder1.Status)
	}
	if paidOrder1.ChangeAmount != 65000.0 {
		t.Errorf("Expected change amount 65,000 VND, got %.0f", paidOrder1.ChangeAmount)
	}

	// Verify Shift has updated Cash Sales and Expected Ending Cash
	var shiftAfterOrder1 models.CashShift
	db.First(&shiftAfterOrder1, "id = ?", shift.ID)
	if shiftAfterOrder1.TotalCashSales != 135000.0 {
		t.Errorf("Expected shift TotalCashSales 135,000 VND, got %.0f", shiftAfterOrder1.TotalCashSales)
	}
	expectedEndingAfterOrder1 := 1000000.0 + 135000.0 // 1,135,000 VND
	if shiftAfterOrder1.ExpectedEndingCash != expectedEndingAfterOrder1 {
		t.Errorf("Expected shift ExpectedEndingCash %.0f, got %.0f", expectedEndingAfterOrder1, shiftAfterOrder1.ExpectedEndingCash)
	}

	// Verify Thermal Receipt ESC/POS bytes contain auto-cutter and drawer kick opcodes
	printReq := handler.PrintReceiptRequest{
		StoreName: posSettings.StoreName,
		TableName: table.Name,
		Cashier:   cashier.FullName,
		OrderCode: order1.OrderCode,
		Items: []handler.PrintItem{
			{Name: "Ca Phe Muoi Dac Biet", Qty: 2, UnitPrice: 35000, Amount: 70000},
			{Name: "Banh Croissant Trung Muoi", Qty: 2, UnitPrice: 40000, Amount: 80000},
		},
		Subtotal:  150000,
		Discount:  15000,
		Total:     135000,
		CashGiven: 200000,
		ChangeDue: 65000,
	}
	receiptBytes := handler.BuildESCPOSBytes(printReq)
	drawerKickOpcode := []byte{0x1B, 0x70, 0x00, 0x19, 0xFA} // ESC p 0 25 250 (\x1b\x70\x00\x19\xfa)
	autoCutOpcode := []byte{0x1D, 0x56, 0x41, 0x10}          // GS V 65 16 (\x1d\x56\x41\x10)

	if !bytes.Contains(receiptBytes, drawerKickOpcode) {
		t.Errorf("Receipt bytes missing RJ11 Drawer Kick opcode \\x1b\\x70\\x00\\x19\\xfa")
	}
	if !bytes.Contains(receiptBytes, autoCutOpcode) {
		t.Errorf("Receipt bytes missing Paper Auto-cut opcode \\x1d\\x56\\x41\\x10")
	}

	// 4. Sub-test 3C: VietQR Payment & Zero Cash Drawer Impact
	// Create second order for 80,000 VND
	order2Req := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		TableID:     &table.ID,
		CashierName: cashier.FullName,
		OrderType:   "take_away",
		ShiftID:     &shift.ID,
		Items: []handler.OrderItemRequest{
			{
				ProductName: "Trà Đào Cam Sả",
				UnitPrice:   40000.0,
				Quantity:    2,
				Station:     "bar",
			},
		},
	}
	wOrder2 := PerformRequest(router, "POST", "/api/v1/orders", order2Req)
	var order2 models.Order
	ParseJSON(t, wOrder2, &order2)

	// Pay order 2 via VietQR
	payQRReq := handler.PayOrderRequest{
		PaymentMethod: "chuyen_khoan_vietqr",
		PaidAmount:    80000.0,
	}
	wPayQR := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", order2.ID), payQRReq)
	if wPayQR.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for VietQR payment, got %d: %s", wPayQR.Code, wPayQR.Body.String())
	}

	// Invariant Check: VietQR sales increase TotalVietQRSales, but ExpectedEndingCash MUST NOT change!
	var shiftAfterOrder2 models.CashShift
	db.First(&shiftAfterOrder2, "id = ?", shift.ID)

	if shiftAfterOrder2.TotalVietQRSales != 80000.0 {
		t.Errorf("Expected shift TotalVietQRSales 80,000 VND, got %.0f", shiftAfterOrder2.TotalVietQRSales)
	}
	if shiftAfterOrder2.TotalCashSales != 135000.0 {
		t.Errorf("Shift TotalCashSales should remain 135,000 VND, got %.0f", shiftAfterOrder2.TotalCashSales)
	}
	if shiftAfterOrder2.ExpectedEndingCash != expectedEndingAfterOrder1 {
		t.Errorf("ExpectedEndingCash must not be affected by VietQR: expected %.0f, got %.0f",
			expectedEndingAfterOrder1, shiftAfterOrder2.ExpectedEndingCash)
	}
}
