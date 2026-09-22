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

func TestClosedLoop_EndToEnd_Integration(t *testing.T) {
	db, router := SetupTestEnv(t)
	tenant, branch, _, cashier, _ := SeedInitialStoreData(db)

	now := time.Now()

	// =========================================================================
	// Phase 1: Open Cashier Shift
	// =========================================================================
	openShiftReq := handler.OpenShiftRequest{
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		CashierID:    cashier.ID,
		CashierName:  cashier.FullName,
		ShiftName:    "Ca Sáng Trọng Điểm",
		StartingCash: 1500000.0, // 1,500,000 VND
	}
	wOpen := PerformRequest(router, "POST", "/api/v1/shifts/open", openShiftReq)
	if wOpen.Code != http.StatusCreated {
		t.Fatalf("Phase 1 Failed: Open shift returned %d: %s", wOpen.Code, wOpen.Body.String())
	}
	var openResp map[string]interface{}
	ParseJSON(t, wOpen, &openResp)
	shiftData := openResp["shift"].(map[string]interface{})
	shiftID := shiftData["id"].(string)

	// =========================================================================
	// Phase 2: Master Data Setup (Table, BOM Ingredients, Recipes)
	// =========================================================================
	table5 := models.DiningTable{
		ID:        uuid.New().String(),
		TenantID:  tenant.ID,
		BranchID:  branch.ID,
		AreaName:  "Khu Sân Vườn",
		Name:      "Bàn 05",
		Capacity:  4,
		Status:    "trong",
		CreatedAt: now,
	}
	db.Create(&table5)

	// Ingredients:
	// Coffee: 2000g, 120 VND/g
	ingCoffee := models.Ingredient{
		ID:           uuid.New().String(),
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		Name:         "Hạt Cà Phê Robusta Buôn Ma Thuột",
		Unit:         "g",
		CurrentStock: 2000.0,
		MinStock:     500.0,
		AvgCostPrice: 120.0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	db.Create(&ingCoffee)

	// Condensed Milk: 1500g, 40 VND/g
	ingCondMilk := models.Ingredient{
		ID:           uuid.New().String(),
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		Name:         "Sữa Đặc Ông Thọ",
		Unit:         "g",
		CurrentStock: 1500.0,
		MinStock:     300.0,
		AvgCostPrice: 40.0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	db.Create(&ingCondMilk)

	// Fresh Milk: 2000ml, 30 VND/ml
	ingFreshMilk := models.Ingredient{
		ID:           uuid.New().String(),
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		Name:         "Sữa Tươi Đà Lạt Milk",
		Unit:         "ml",
		CurrentStock: 2000.0,
		MinStock:     500.0,
		AvgCostPrice: 30.0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	db.Create(&ingFreshMilk)

	// Products:
	// 1. Bạc Xỉu Sài Gòn (Selling: 35,000 VND; Cost: 20*120 + 30*40 + 80*30 = 2400 + 1200 + 2400 = 6,000 VND; Station: bar)
	prodBacXiu := models.Product{
		ID:           uuid.New().String(),
		TenantID:     tenant.ID,
		Code:         "CF-BACXIU",
		Name:         "Bạc Xỉu Sài Gòn",
		Unit:         "Ly",
		CostPrice:    6000.0,
		SellingPrice: 35000.0,
		Station:      "bar",
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	db.Create(&prodBacXiu)

	db.Create(&models.RecipeItem{
		ID:           uuid.New().String(),
		ProductID:    prodBacXiu.ID,
		IngredientID: ingCoffee.ID,
		QuantityUsed: 20.0,
		CreatedAt:    now,
	})
	db.Create(&models.RecipeItem{
		ID:           uuid.New().String(),
		ProductID:    prodBacXiu.ID,
		IngredientID: ingCondMilk.ID,
		QuantityUsed: 30.0,
		CreatedAt:    now,
	})
	db.Create(&models.RecipeItem{
		ID:           uuid.New().String(),
		ProductID:    prodBacXiu.ID,
		IngredientID: ingFreshMilk.ID,
		QuantityUsed: 80.0,
		CreatedAt:    now,
	})

	// 2. Mì Xào Bò Rau Cải (Selling: 55,000 VND; Cost: 20,000 VND; Station: kitchen)
	prodMiXao := models.Product{
		ID:           uuid.New().String(),
		TenantID:     tenant.ID,
		Code:         "MON-MI-XAO",
		Name:         "Mì Xào Bò Rau Cải",
		Unit:         "Đĩa",
		CostPrice:    20000.0,
		SellingPrice: 55000.0,
		Station:      "kitchen",
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	db.Create(&prodMiXao)

	// =========================================================================
	// Phase 3: Create Order 1 (Dine-in on Bàn 05)
	// =========================================================================
	order1Req := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		TableID:     &table5.ID,
		CashierName: cashier.FullName,
		OrderType:   "dine_in",
		ShiftID:     &shiftID,
		Items: []handler.OrderItemRequest{
			{
				ProductID:     &prodBacXiu.ID,
				ProductName:   prodBacXiu.Name,
				UnitPrice:     prodBacXiu.SellingPrice,
				CostPrice:     prodBacXiu.CostPrice,
				Quantity:      2,
				Station:       "bar",
				SelectedSize:  "M",
				SugarLevel:    "50%",
				IceLevel:      "Ít đá",
				ModifierNames: "Size M, 50% Ngọt, Ít đá",
			},
			{
				ProductID:   &prodMiXao.ID,
				ProductName: prodMiXao.Name,
				UnitPrice:   prodMiXao.SellingPrice,
				CostPrice:   prodMiXao.CostPrice,
				Quantity:    1,
				Station:     "kitchen",
				Note:        "Nhiều rau cải xanh",
			},
		},
	}
	wOrder1 := PerformRequest(router, "POST", "/api/v1/orders", order1Req)
	if wOrder1.Code != http.StatusCreated {
		t.Fatalf("Phase 3 Failed: Create Order 1 returned %d: %s", wOrder1.Code, wOrder1.Body.String())
	}
	var order1 models.Order
	ParseJSON(t, wOrder1, &order1)

	expectedOrder1Subtotal := (35000.0 * 2) + 55000.0 // 125,000 VND
	expectedOrder1Cost := (6000.0 * 2) + 20000.0      // 32,000 VND
	if order1.TotalAmount != expectedOrder1Subtotal {
		t.Errorf("Order 1 Total: expected %.0f, got %.0f", expectedOrder1Subtotal, order1.TotalAmount)
	}
	if order1.TotalCostPrice != expectedOrder1Cost {
		t.Errorf("Order 1 Cost Price: expected %.0f, got %.0f", expectedOrder1Cost, order1.TotalCostPrice)
	}

	// Verify table status is now "dang_phuc_vu"
	var checkTable models.DiningTable
	db.First(&checkTable, "id = ?", table5.ID)
	if checkTable.Status != "dang_phuc_vu" {
		t.Errorf("Expected table status 'dang_phuc_vu', got '%s'", checkTable.Status)
	}

	// =========================================================================
	// Phase 4: KDS Dispatch & Status Progression
	// =========================================================================
	// Verify KDS Bar ticket
	wKdsBar := PerformRequest(router, "GET", "/api/v1/kds/tickets?station=bar", nil)
	var kdsBarOrders []models.Order
	ParseJSON(t, wKdsBar, &kdsBarOrders)
	if len(kdsBarOrders) != 1 || len(kdsBarOrders[0].Items) != 1 {
		t.Fatalf("Phase 4 Failed: Expected 1 bar ticket item, got %d", len(kdsBarOrders))
	}
	barItemID := kdsBarOrders[0].Items[0].ID

	// Advance Bar Item: cho_che_bien -> dang_che_bien -> da_xong
	PerformRequest(router, "PATCH", fmt.Sprintf("/api/v1/kds/items/%s/status", barItemID), handler.UpdateKDSItemStatusRequest{Status: "dang_che_bien"})
	PerformRequest(router, "PATCH", fmt.Sprintf("/api/v1/kds/items/%s/status", barItemID), handler.UpdateKDSItemStatusRequest{Status: "da_xong"})

	// Serve entire order
	wServe := PerformRequest(router, "PATCH", fmt.Sprintf("/api/v1/kds/orders/%s/status", order1.ID), handler.UpdateKDSOrderStatusRequest{Status: "da_phuc_vu"})
	if wServe.Code != http.StatusOK {
		t.Fatalf("Phase 4 Failed: Serve order returned %d", wServe.Code)
	}

	// =========================================================================
	// Phase 5: Payment via Cash (150,000 VND for 125,000 VND bill -> Change: 25,000 VND)
	// =========================================================================
	pay1Req := handler.PayOrderRequest{
		PaymentMethod: "tien_mat",
		PaidAmount:    150000.0,
	}
	wPay1 := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", order1.ID), pay1Req)
	if wPay1.Code != http.StatusOK {
		t.Fatalf("Phase 5 Failed: Pay Order 1 returned %d: %s", wPay1.Code, wPay1.Body.String())
	}

	var paidOrder1 models.Order
	db.First(&paidOrder1, "id = ?", order1.ID)
	if paidOrder1.Status != "da_thanh_toan" {
		t.Errorf("Expected paid order status 'da_thanh_toan', got '%s'", paidOrder1.Status)
	}
	if paidOrder1.ChangeAmount != 25000.0 {
		t.Errorf("Expected change 25,000 VND, got %.0f", paidOrder1.ChangeAmount)
	}

	// Verify table freed back to "trong"
	db.First(&checkTable, "id = ?", table5.ID)
	if checkTable.Status != "trong" || checkTable.ActiveOrderID != nil {
		t.Errorf("Expected table status 'trong' and nil active order, got status='%s', order=%v", checkTable.Status, checkTable.ActiveOrderID)
	}

	// =========================================================================
	// Phase 6: Verify Automatic BOM Inventory Reduction for Order 1
	// =========================================================================
	// Coffee: 2000 - (20 * 2) = 1960.0 g
	// Cond Milk: 1500 - (30 * 2) = 1440.0 g
	// Fresh Milk: 2000 - (80 * 2) = 1840.0 ml
	var checkCoffee, checkCondMilk, checkFreshMilk models.Ingredient
	db.First(&checkCoffee, "id = ?", ingCoffee.ID)
	db.First(&checkCondMilk, "id = ?", ingCondMilk.ID)
	db.First(&checkFreshMilk, "id = ?", ingFreshMilk.ID)

	if checkCoffee.CurrentStock != 1960.0 {
		t.Errorf("BOM Coffee Stock: expected 1960.0g, got %.2f", checkCoffee.CurrentStock)
	}
	if checkCondMilk.CurrentStock != 1440.0 {
		t.Errorf("BOM Condensed Milk Stock: expected 1440.0g, got %.2f", checkCondMilk.CurrentStock)
	}
	if checkFreshMilk.CurrentStock != 1840.0 {
		t.Errorf("BOM Fresh Milk Stock: expected 1840.0ml, got %.2f", checkFreshMilk.CurrentStock)
	}

	// =========================================================================
	// Phase 7: Order 2 (Takeaway - Paid via VietQR for 35,000 VND)
	// =========================================================================
	order2Req := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		CashierName: cashier.FullName,
		OrderType:   "take_away",
		ShiftID:     &shiftID,
		Items: []handler.OrderItemRequest{
			{
				ProductID:   &prodBacXiu.ID,
				ProductName: prodBacXiu.Name,
				UnitPrice:   prodBacXiu.SellingPrice,
				CostPrice:   prodBacXiu.CostPrice,
				Quantity:    1,
				Station:     "bar",
			},
		},
	}
	wOrder2 := PerformRequest(router, "POST", "/api/v1/orders", order2Req)
	var order2 models.Order
	ParseJSON(t, wOrder2, &order2)

	// Pay via VietQR
	pay2Req := handler.PayOrderRequest{
		PaymentMethod: "chuyen_khoan_vietqr",
		PaidAmount:    35000.0,
	}
	wPay2 := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", order2.ID), pay2Req)
	if wPay2.Code != http.StatusOK {
		t.Fatalf("Phase 7 Failed: Pay Order 2 returned %d: %s", wPay2.Code, wPay2.Body.String())
	}

	// Verify additional BOM deduction for 1 cup of Bac Xiu:
	// Coffee: 1960 - 20 = 1940.0 g
	// Cond Milk: 1440 - 30 = 1410.0 g
	// Fresh Milk: 1840 - 80 = 1760.0 ml
	db.First(&checkCoffee, "id = ?", ingCoffee.ID)
	db.First(&checkCondMilk, "id = ?", ingCondMilk.ID)
	db.First(&checkFreshMilk, "id = ?", ingFreshMilk.ID)

	if checkCoffee.CurrentStock != 1940.0 || checkCondMilk.CurrentStock != 1410.0 || checkFreshMilk.CurrentStock != 1760.0 {
		t.Errorf("BOM deduction after Order 2 incorrect: Coffee=%.1f, Cond=%.1f, Fresh=%.1f",
			checkCoffee.CurrentStock, checkCondMilk.CurrentStock, checkFreshMilk.CurrentStock)
	}

	// =========================================================================
	// Phase 8: Record Sổ Quỹ Tiền Mặt (Chi chợ 50,000 VND, Thu ngoài 10,000 VND)
	// =========================================================================
	// Chi 1: Mua đá bi 30,000 VND
	PerformRequest(router, "POST", "/api/v1/cash/transactions", handler.CreateCashTransactionRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		ShiftID:     &shiftID,
		Type:        "chi",
		Category:    "chi_mua_da",
		Amount:      30000.0,
		Description: "Mua đá bi ca sáng",
		PerformedBy: cashier.FullName,
	})

	// Chi 2: Mua rau thơm 20,000 VND
	PerformRequest(router, "POST", "/api/v1/cash/transactions", handler.CreateCashTransactionRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		ShiftID:     &shiftID,
		Type:        "chi",
		Category:    "chi_mua_rau_cho",
		Amount:      20000.0,
		Description: "Mua rau thơm ngoài chợ",
		PerformedBy: cashier.FullName,
	})

	// Thu 1: Tiền hoàn ứng thừa 10,000 VND
	PerformRequest(router, "POST", "/api/v1/cash/transactions", handler.CreateCashTransactionRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		ShiftID:     &shiftID,
		Type:        "thu",
		Category:    "thu_khac",
		Amount:      10000.0,
		Description: "Hoàn ứng tiền mua đồ thừa",
		PerformedBy: cashier.FullName,
	})

	// Total Cash Out = 30,000 + 20,000 = 50,000 VND
	// Total Cash In = 10,000 VND

	// =========================================================================
	// Phase 9: Close Shift with Cash Reconciliation
	// =========================================================================
	// Formula:
	// Expected = Starting (1,500,000) + Cash Sales (125,000) + Cash In (10,000) - Cash Out (50,000) = 1,585,000 VND
	closeReq := handler.CloseShiftRequest{
		ActualEndingCash: 1585000.0,
		Note:             "Ca sáng khớp tiền hoàn hảo",
	}
	wClose := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/shifts/%s/close", shiftID), closeReq)
	if wClose.Code != http.StatusOK {
		t.Fatalf("Phase 9 Failed: Close shift returned %d: %s", wClose.Code, wClose.Body.String())
	}

	var closedShift models.CashShift
	db.First(&closedShift, "id = ?", shiftID)
	if closedShift.Status != "da_dong" {
		t.Errorf("Expected shift status 'da_dong', got '%s'", closedShift.Status)
	}
	if closedShift.TotalCashSales != 125000.0 {
		t.Errorf("Shift TotalCashSales: expected 125,000 VND, got %.0f", closedShift.TotalCashSales)
	}
	if closedShift.TotalVietQRSales != 35000.0 {
		t.Errorf("Shift TotalVietQRSales: expected 35,000 VND, got %.0f", closedShift.TotalVietQRSales)
	}
	if closedShift.ExpectedEndingCash != 1585000.0 {
		t.Errorf("Shift ExpectedEndingCash: expected 1,585,000 VND, got %.0f", closedShift.ExpectedEndingCash)
	}
	if closedShift.DifferenceAmount != 0.0 {
		t.Errorf("Shift DifferenceAmount: expected 0, got %.0f", closedShift.DifferenceAmount)
	}

	// =========================================================================
	// Phase 10: Verify Owner P&L 3 Golden Numbers Report (GET /api/v1/owner/pnl-summary)
	// =========================================================================
	// Total Revenue = 125,000 + 35,000 = 160,000 VND
	// Total Cost of Goods = Order 1 Cost (32,000) + Order 2 Cost (6,000) = 38,000 VND
	// Total Cash Expenses = 50,000 VND
	//
	// 3 Con Số Vàng:
	// 1. Tiền mặt trong két = Total Cash Sales (125,000) - Total Cash Expenses (50,000) = 75,000 VND
	// 2. Tiền VietQR về tài khoản = 35,000 VND
	// 3. Lợi nhuận ròng đút túi = Revenue (160,000) - COGS (38,000) - Expenses (50,000) = 72,000 VND
	wPnL := PerformRequest(router, "GET", fmt.Sprintf("/api/v1/owner/pnl-summary?tenant_id=%s", tenant.ID), nil)
	if wPnL.Code != http.StatusOK {
		t.Fatalf("Phase 10 Failed: PnL summary returned %d: %s", wPnL.Code, wPnL.Body.String())
	}

	var pnlResp map[string]interface{}
	ParseJSON(t, wPnL, &pnlResp)

	golden := pnlResp["three_golden_numbers"].(map[string]interface{})
	cashInDrawer := golden["cash_in_drawer"].(float64)
	vietqrBankTotal := golden["vietqr_bank_total"].(float64)
	realNetProfit := golden["real_net_profit"].(float64)

	if cashInDrawer != 75000.0 {
		t.Errorf("Golden #1 Cash in Drawer: expected 75,000 VND, got %.0f", cashInDrawer)
	}
	if vietqrBankTotal != 35000.0 {
		t.Errorf("Golden #2 VietQR Bank Total: expected 35,000 VND, got %.0f", vietqrBankTotal)
	}
	if realNetProfit != 72000.0 {
		t.Errorf("Golden #3 Real Net Profit: expected 72,000 VND, got %.0f", realNetProfit)
	}

	breakdown := pnlResp["breakdown"].(map[string]interface{})
	if breakdown["total_revenue"].(float64) != 160000.0 {
		t.Errorf("Breakdown Total Revenue: expected 160,000 VND, got %v", breakdown["total_revenue"])
	}
	if breakdown["total_cost_of_goods"].(float64) != 38000.0 {
		t.Errorf("Breakdown Total COGS: expected 38,000 VND, got %v", breakdown["total_cost_of_goods"])
	}
	if breakdown["total_cash_expenses"].(float64) != 50000.0 {
		t.Errorf("Breakdown Cash Expenses: expected 50,000 VND, got %v", breakdown["total_cash_expenses"])
	}
}
