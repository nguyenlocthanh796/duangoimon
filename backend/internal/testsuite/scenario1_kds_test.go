package testsuite

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/ongchu/pos-backend/internal/handler"
	"github.com/ongchu/pos-backend/internal/models"
)

func TestScenario1_KDS_Station_Routing_And_Lifecycle(t *testing.T) {
	db, router := SetupTestEnv(t)
	tenant, branch, table, cashier, _ := SeedInitialStoreData(db)

	// Subscribe test WS client to observe realtime events
	wsClient, wsCh := SubscribeTestWSClient()
	defer UnsubscribeTestWSClient(wsClient)

	// 1. Create order with 3 items targeting 3 distinct preparation stations
	createReq := handler.CreateOrderRequest{
		TenantID:    tenant.ID,
		BranchID:    branch.ID,
		TableID:     &table.ID,
		CashierName: cashier.FullName,
		OrderType:   "dine_in",
		Items: []handler.OrderItemRequest{
			{
				ProductName:   "Trà Sữa Oolong",
				UnitPrice:     45000,
				Quantity:      2,
				Station:       "bar",
				SelectedSize:  "L",
				SugarLevel:    "50%",
				IceLevel:      "70%",
				ToppingsJSON:  `[{"name":"Trân Châu Đen","price":5000}]`,
				ModifierNames: "Size L, 50% Đường, 70% Đá, Trân Châu Đen",
				Note:          "Ít ngọt chuẩn vị",
			},
			{
				ProductName: "Khoai Tây Chiên Phô Mai",
				UnitPrice:   35000,
				Quantity:    1,
				Station:     "snack",
				Note:        "Chiên giòn rụm",
			},
			{
				ProductName: "Cơm Bò Xào Sả Ớt",
				UnitPrice:   65000,
				Quantity:    1,
				Station:     "kitchen",
				Note:        "Ít cay nhiều rau",
			},
		},
	}

	wCreate := PerformRequest(router, "POST", "/api/v1/orders", createReq)
	if wCreate.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created for order, got %d: %s", wCreate.Code, wCreate.Body.String())
	}

	var createdOrder models.Order
	ParseJSON(t, wCreate, &createdOrder)

	// 2. Verify subtotal, item count and table status
	expectedSubtotal := (45000.0 * 2) + 35000.0 + 65000.0 // 190,000 VND
	if createdOrder.Subtotal != expectedSubtotal {
		t.Errorf("Expected subtotal %.0f, got %.0f", expectedSubtotal, createdOrder.Subtotal)
	}
	if createdOrder.TotalAmount != expectedSubtotal {
		t.Errorf("Expected total amount %.0f, got %.0f", expectedSubtotal, createdOrder.TotalAmount)
	}
	if len(createdOrder.Items) != 3 {
		t.Fatalf("Expected 3 items in created order, got %d", len(createdOrder.Items))
	}

	var updatedTable models.DiningTable
	if err := db.First(&updatedTable, "id = ?", table.ID).Error; err != nil {
		t.Fatalf("Failed to query dining table: %v", err)
	}
	if updatedTable.Status != "dang_phuc_vu" {
		t.Errorf("Expected table status 'dang_phuc_vu', got '%s'", updatedTable.Status)
	}
	if updatedTable.ActiveOrderID == nil || *updatedTable.ActiveOrderID != createdOrder.ID {
		t.Errorf("Expected table active_order_id '%s', got %v", createdOrder.ID, updatedTable.ActiveOrderID)
	}

	// 3. Verify item fields & station classification in database
	var barItem, snackItem, kitchenItem models.OrderItem
	for _, it := range createdOrder.Items {
		switch it.Station {
		case "bar":
			barItem = it
		case "snack":
			snackItem = it
		case "kitchen":
			kitchenItem = it
		}
	}

	if barItem.ID == "" || snackItem.ID == "" || kitchenItem.ID == "" {
		t.Fatalf("Failed to classify all 3 stations: bar=%+v, snack=%+v, kitchen=%+v", barItem, snackItem, kitchenItem)
	}
	if barItem.SelectedSize != "L" || barItem.SugarLevel != "50%" || barItem.IceLevel != "70%" {
		t.Errorf("Bar item modifier mismatch: size=%s, sugar=%s, ice=%s", barItem.SelectedSize, barItem.SugarLevel, barItem.IceLevel)
	}
	if barItem.KitchenStatus != "cho_che_bien" {
		t.Errorf("Expected initial kitchen_status 'cho_che_bien', got '%s'", barItem.KitchenStatus)
	}

	// 4. Query KDS orders filtered by station (Bar, Snack, Kitchen)
	// Query Bar station tickets
	wBar := PerformRequest(router, "GET", "/api/v1/kds/tickets?station=bar", nil)
	if wBar.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for KDS bar tickets, got %d: %s", wBar.Code, wBar.Body.String())
	}
	var barOrders []models.Order
	ParseJSON(t, wBar, &barOrders)
	if len(barOrders) != 1 {
		t.Fatalf("Expected 1 bar order, got %d", len(barOrders))
	}
	if len(barOrders[0].Items) != 1 || barOrders[0].Items[0].Station != "bar" {
		t.Errorf("Expected exactly 1 bar item in filtered response, got %d items", len(barOrders[0].Items))
	}

	// Query Kitchen station tickets
	wKitchen := PerformRequest(router, "GET", "/api/v1/kds/orders?station=kitchen", nil)
	if wKitchen.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for KDS kitchen orders, got %d: %s", wKitchen.Code, wKitchen.Body.String())
	}
	var kitchenOrders []models.Order
	ParseJSON(t, wKitchen, &kitchenOrders)
	if len(kitchenOrders) != 1 || len(kitchenOrders[0].Items) != 1 || kitchenOrders[0].Items[0].Station != "kitchen" {
		t.Errorf("Expected exactly 1 kitchen item in filtered response, got %+v", kitchenOrders)
	}

	// 5. Query KDS Grouped items (Gom Món)
	wGrouped := PerformRequest(router, "GET", "/api/v1/kds/items/grouped?station=bar", nil)
	if wGrouped.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for KDS grouped items, got %d: %s", wGrouped.Code, wGrouped.Body.String())
	}
	var groupedItems []handler.GroupedKDSItem
	ParseJSON(t, wGrouped, &groupedItems)
	if len(groupedItems) != 1 {
		t.Fatalf("Expected 1 grouped bar item, got %d", len(groupedItems))
	}
	if groupedItems[0].ProductName != "Trà Sữa Oolong" || groupedItems[0].TotalQuantity != 2 {
		t.Errorf("Grouped item mismatch: name=%s, qty=%.0f", groupedItems[0].ProductName, groupedItems[0].TotalQuantity)
	}

	// 6. Advance KDS Status: cho_che_bien -> dang_che_bien
	updateStatus1 := handler.UpdateKDSItemStatusRequest{Status: "dang_che_bien"}
	wStatus1 := PerformRequest(router, "PATCH", fmt.Sprintf("/api/v1/kds/items/%s/status", barItem.ID), updateStatus1)
	if wStatus1.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK updating item status, got %d: %s", wStatus1.Code, wStatus1.Body.String())
	}

	var itemInDB models.OrderItem
	if err := db.First(&itemInDB, "id = ?", barItem.ID).Error; err != nil {
		t.Fatalf("Failed to reload item from DB: %v", err)
	}
	if itemInDB.KitchenStatus != "dang_che_bien" {
		t.Errorf("Expected kitchen_status 'dang_che_bien', got '%s'", itemInDB.KitchenStatus)
	}

	// 7. Advance KDS Status: dang_che_bien -> da_xong
	updateStatus2 := handler.UpdateKDSItemStatusRequest{Status: "da_xong"}
	wStatus2 := PerformRequest(router, "PATCH", fmt.Sprintf("/api/v1/kds/items/%s/status", barItem.ID), updateStatus2)
	if wStatus2.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK updating item status to da_xong, got %d: %s", wStatus2.Code, wStatus2.Body.String())
	}
	db.First(&itemInDB, "id = ?", barItem.ID)
	if itemInDB.KitchenStatus != "da_xong" {
		t.Errorf("Expected kitchen_status 'da_xong', got '%s'", itemInDB.KitchenStatus)
	}

	// 8. Complete / Serve entire order: PATCH /api/v1/kds/orders/:id/status with "da_phuc_vu"
	updateOrderReq := handler.UpdateKDSOrderStatusRequest{Status: "da_phuc_vu"}
	wOrderStatus := PerformRequest(router, "PATCH", fmt.Sprintf("/api/v1/kds/orders/%s/status", createdOrder.ID), updateOrderReq)
	if wOrderStatus.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK updating order status, got %d: %s", wOrderStatus.Code, wOrderStatus.Body.String())
	}

	var allOrderItems []models.OrderItem
	db.Where("order_id = ?", createdOrder.ID).Find(&allOrderItems)
	for _, it := range allOrderItems {
		if it.KitchenStatus != "da_phuc_vu" {
			t.Errorf("Expected item '%s' status 'da_phuc_vu', got '%s'", it.ProductName, it.KitchenStatus)
		}
	}

	// 9. Verify WebSocket broadcast events were captured by client channel
	receivedEvents := make([]string, 0)
drainWS:
	for {
		select {
		case msg := <-wsCh:
			var event map[string]interface{}
			if err := json.Unmarshal(msg, &event); err == nil {
				if eventType, ok := event["type"].(string); ok {
					receivedEvents = append(receivedEvents, eventType)
				}
			}
		case <-time.After(50 * time.Millisecond):
			break drainWS
		}
	}

	hasItemUpdated := false
	hasOrderUpdated := false
	for _, ev := range receivedEvents {
		if ev == "kds_item_updated" || ev == "kds_status_updated" {
			hasItemUpdated = true
		}
		if ev == "kds_order_updated" {
			hasOrderUpdated = true
		}
	}
	if !hasItemUpdated {
		t.Errorf("Expected kds_item_updated / kds_status_updated in WS events, got: %v", receivedEvents)
	}
	if !hasOrderUpdated {
		t.Errorf("Expected kds_order_updated in WS events, got: %v", receivedEvents)
	}
}
