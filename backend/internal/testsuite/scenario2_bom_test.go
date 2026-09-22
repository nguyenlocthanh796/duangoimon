package testsuite

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/handler"
	"github.com/ongchu/pos-backend/internal/models"
)

func TestScenario2_BOM_Recipe_Inventory_Deduction_And_Alerts(t *testing.T) {
	db, router := SetupTestEnv(t)
	tenant, branch, table, cashier, _ := SeedInitialStoreData(db)

	wsClient, wsCh := SubscribeTestWSClient()
	defer UnsubscribeTestWSClient(wsClient)

	// 1. Configure 3 Ingredients in DB
	now := time.Now()
	ingTea := models.Ingredient{
		ID:           uuid.New().String(),
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		Name:         "Cốt Trà Oolong",
		Unit:         "ml",
		CurrentStock: 1000.0,
		MinStock:     300.0,
		AvgCostPrice: 50.0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	db.Create(&ingTea)

	ingMilk := models.Ingredient{
		ID:           uuid.New().String(),
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		Name:         "Sữa Tươi Thanh Trùng",
		Unit:         "ml",
		CurrentStock: 600.0,
		MinStock:     200.0,
		AvgCostPrice: 30.0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	db.Create(&ingMilk)

	ingBoba := models.Ingredient{
		ID:           uuid.New().String(),
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		Name:         "Trân Châu Đen",
		Unit:         "g",
		CurrentStock: 250.0,
		MinStock:     100.0,
		AvgCostPrice: 40.0,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	db.Create(&ingBoba)

	// 2. Configure Product and its Recipe Items
	// Cost per cup = (150*50) + (100*30) + (50*40) = 7500 + 3000 + 2000 = 12,500 VND
	prodOolong := models.Product{
		ID:           uuid.New().String(),
		TenantID:     tenant.ID,
		Code:         "SP-OOLONG",
		Name:         "Trà Sữa Oolong Đậm Vị",
		Unit:         "Ly",
		CostPrice:    12500.0,
		SellingPrice: 45000.0,
		Station:      "bar",
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	db.Create(&prodOolong)

	recipes := []models.RecipeItem{
		{
			ID:           uuid.New().String(),
			ProductID:    prodOolong.ID,
			IngredientID: ingTea.ID,
			QuantityUsed: 150.0,
			CreatedAt:    now,
		},
		{
			ID:           uuid.New().String(),
			ProductID:    prodOolong.ID,
			IngredientID: ingMilk.ID,
			QuantityUsed: 100.0,
			CreatedAt:    now,
		},
		{
			ID:           uuid.New().String(),
			ProductID:    prodOolong.ID,
			IngredientID: ingBoba.ID,
			QuantityUsed: 50.0,
			CreatedAt:    now,
		},
	}
	for _, r := range recipes {
		db.Create(&r)
	}

	// 3. Create Order 1: 2 cups of Trà Sữa Oolong
	order1Req := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		TableID:     &table.ID,
		CashierName: cashier.FullName,
		OrderType:   "dine_in",
		Items: []handler.OrderItemRequest{
			{
				ProductID:   &prodOolong.ID,
				ProductName: prodOolong.Name,
				UnitPrice:   prodOolong.SellingPrice,
				CostPrice:   prodOolong.CostPrice,
				Quantity:    2,
				Station:     "bar",
			},
		},
	}

	wOrder1 := PerformRequest(router, "POST", "/api/v1/orders", order1Req)
	if wOrder1.Code != http.StatusCreated {
		t.Fatalf("Expected 201 for Order 1, got %d: %s", wOrder1.Code, wOrder1.Body.String())
	}
	var order1 models.Order
	ParseJSON(t, wOrder1, &order1)

	// Pre-payment: verify stock has NOT yet decremented
	var checkTea models.Ingredient
	db.First(&checkTea, "id = ?", ingTea.ID)
	if checkTea.CurrentStock != 1000.0 {
		t.Fatalf("Stock should not decrement before payment, got %.1f", checkTea.CurrentStock)
	}

	// 4. Pay Order 1: Cash payment of 100,000 VND
	pay1Req := handler.PayOrderRequest{
		PaymentMethod: "tien_mat",
		PaidAmount:    100000.0,
	}
	wPay1 := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", order1.ID), pay1Req)
	if wPay1.Code != http.StatusOK {
		t.Fatalf("Expected 200 for Pay Order 1, got %d: %s", wPay1.Code, wPay1.Body.String())
	}

	// 5. Inspect database stock levels post-payment for Order 1
	// Tea: 1000 - (150 * 2) = 700.0 ml
	// Milk: 600 - (100 * 2) = 400.0 ml
	// Boba: 250 - (50 * 2) = 150.0 g
	var teaAfter1, milkAfter1, bobaAfter1 models.Ingredient
	db.First(&teaAfter1, "id = ?", ingTea.ID)
	db.First(&milkAfter1, "id = ?", ingMilk.ID)
	db.First(&bobaAfter1, "id = ?", ingBoba.ID)

	if teaAfter1.CurrentStock != 700.0 {
		t.Errorf("Expected tea stock 700.0 ml, got %.2f", teaAfter1.CurrentStock)
	}
	if milkAfter1.CurrentStock != 400.0 {
		t.Errorf("Expected milk stock 400.0 ml, got %.2f", milkAfter1.CurrentStock)
	}
	if bobaAfter1.CurrentStock != 150.0 {
		t.Errorf("Expected boba stock 150.0 g, got %.2f", bobaAfter1.CurrentStock)
	}

	// 6. Create & Pay Order 2: 2 more cups (requiring 100g boba)
	// Boba stock will drop to 150 - 100 = 50.0 g (MinStock is 100.0 g)
	order2Req := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		TableID:     &table.ID,
		CashierName: cashier.FullName,
		OrderType:   "dine_in",
		Items: []handler.OrderItemRequest{
			{
				ProductID:   &prodOolong.ID,
				ProductName: prodOolong.Name,
				UnitPrice:   prodOolong.SellingPrice,
				CostPrice:   prodOolong.CostPrice,
				Quantity:    2,
				Station:     "bar",
			},
		},
	}
	wOrder2 := PerformRequest(router, "POST", "/api/v1/orders", order2Req)
	var order2 models.Order
	ParseJSON(t, wOrder2, &order2)

	pay2Req := handler.PayOrderRequest{
		PaymentMethod: "tien_mat",
		PaidAmount:    90000.0,
	}
	wPay2 := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", order2.ID), pay2Req)
	if wPay2.Code != http.StatusOK {
		t.Fatalf("Expected 200 for Pay Order 2, got %d: %s", wPay2.Code, wPay2.Body.String())
	}

	// Verify Boba is now 50.0 g (critical low stock)
	var bobaAfter2 models.Ingredient
	db.First(&bobaAfter2, "id = ?", ingBoba.ID)
	if bobaAfter2.CurrentStock != 50.0 {
		t.Fatalf("Expected boba stock 50.0 g, got %.2f", bobaAfter2.CurrentStock)
	}

	// 7. Verify low stock alert broadcast in WebSocket events
	time.Sleep(50 * time.Millisecond)
	foundLowStockEvent := false
drainWS:
	for {
		select {
		case msg := <-wsCh:
			var event map[string]interface{}
			if err := json.Unmarshal(msg, &event); err == nil {
				if event["type"] == "low_stock_warning" || event["type"] == "low_stock_alert" {
					if event["ingredient_id"] == ingBoba.ID {
						foundLowStockEvent = true
					}
				}
			}
		case <-time.After(50 * time.Millisecond):
			break drainWS
		}
	}
	if !foundLowStockEvent {
		t.Errorf("Expected low_stock_warning/low_stock_alert event for Boba (%s)", ingBoba.Name)
	}

	// 8. Query GET /api/v1/inventory/low-stock endpoint
	wLowStock := PerformRequest(router, "GET", fmt.Sprintf("/api/v1/inventory/low-stock?tenant_id=%s", tenant.ID), nil)
	if wLowStock.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for low stock endpoint, got %d: %s", wLowStock.Code, wLowStock.Body.String())
	}
	var lowStockList []models.Ingredient
	ParseJSON(t, wLowStock, &lowStockList)

	foundBobaInList := false
	for _, ing := range lowStockList {
		if ing.ID == ingBoba.ID {
			foundBobaInList = true
			if ing.CurrentStock != 50.0 {
				t.Errorf("Expected current_stock 50.0 in low stock list, got %.2f", ing.CurrentStock)
			}
		}
	}
	if !foundBobaInList {
		t.Errorf("Expected Boba in low stock list, list contains: %+v", lowStockList)
	}

	// 9. Goods Receipt: Purchase Order to restock Boba (+500g)
	poReq := handler.CreatePurchaseOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		Supplier:    "Nhà Cung Cấp Trà & Trân Châu Long Hưng",
		PaymentType: "tien_mat",
		CreatedBy:   cashier.FullName,
		Note:        "Nhập khẩn cấp trân châu",
		Items: []handler.CreatePurchaseOrderItem{
			{
				IngredientID: ingBoba.ID,
				Quantity:     500.0,
				UnitPrice:    38.0,
			},
		},
	}
	wPO := PerformRequest(router, "POST", "/api/v1/inventory/purchase-orders", poReq)
	if wPO.Code != http.StatusCreated {
		t.Fatalf("Expected 201 for Purchase Order, got %d: %s", wPO.Code, wPO.Body.String())
	}

	// Verify Boba stock incremented to 50 + 500 = 550.0 g
	var bobaRestocked models.Ingredient
	db.First(&bobaRestocked, "id = ?", ingBoba.ID)
	if bobaRestocked.CurrentStock != 550.0 {
		t.Errorf("Expected boba stock 550.0 g after PO, got %.2f", bobaRestocked.CurrentStock)
	}

	// 10. Inventory Adjustment (Wastage / Xuất hủy do làm rơi 50g)
	adjReq := handler.CreateAdjustmentRequest{
		TenantID:     tenant.ID,
		BranchID:     branch.ID,
		IngredientID: ingBoba.ID,
		Type:         "xuat_huy_hong",
		Quantity:     50.0,
		Reason:       "Làm đổ bịch trân châu khi nấu",
		PerformedBy:  cashier.FullName,
	}
	wAdj := PerformRequest(router, "POST", "/api/v1/inventory/adjust", adjReq)
	if wAdj.Code != http.StatusCreated {
		t.Fatalf("Expected 201 for Inventory Adjustment, got %d: %s", wAdj.Code, wAdj.Body.String())
	}

	var bobaAfterAdj models.Ingredient
	db.First(&bobaAfterAdj, "id = ?", ingBoba.ID)
	if bobaAfterAdj.CurrentStock != 500.0 {
		t.Errorf("Expected boba stock 500.0 g after adjustment, got %.2f", bobaAfterAdj.CurrentStock)
	}
}
