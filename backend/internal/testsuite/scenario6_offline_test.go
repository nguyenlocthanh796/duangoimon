package testsuite

import (
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/handler"
	"github.com/ongchu/pos-backend/internal/models"
)

func TestScenario6_Offline_Batch_Order_Sync_And_Idempotency(t *testing.T) {
	db, router := SetupTestEnv(t)
	tenant, branch, table, cashier, _ := SeedInitialStoreData(db)

	// Open a shift for recording offline synced sales
	shift := models.CashShift{
		ID:                 uuid.New().String(),
		TenantID:           tenant.ID,
		BranchID:           branch.ID,
		CashierID:          cashier.ID,
		CashierName:        cashier.FullName,
		ShiftName:          "Ca Chiều Offline",
		StartingCash:       500000.0,
		TotalCashSales:     0,
		TotalVietQRSales:   0,
		ExpectedEndingCash: 500000.0,
		Status:             "dang_mo",
		OpenedAt:           time.Now(),
	}
	db.Create(&shift)

	// 1. Generate 3 offline orders with unique client-side UUIDs
	clientKey1 := uuid.New().String()
	clientKey2 := uuid.New().String()
	clientKey3 := uuid.New().String()

	offlineBatch := handler.SyncOrdersRequest{
		Orders: []handler.SyncOrderPayload{
			{
				ClientOrderID: clientKey1,
				TenantID:      tenant.ID,
				BranchID:      branch.ID,
				TableID:       &table.ID,
				CashierName:   cashier.FullName,
				OrderType:     "dine_in",
				Status:        "da_thanh_toan",
				PaymentMethod: "tien_mat",
				PaidAmount:    100000.0,
				TotalAmount:   100000.0,
				ShiftID:       &shift.ID,
				Items: []handler.OrderItemRequest{
					{ProductName: "Trà Đào Cam Sả", UnitPrice: 50000.0, Quantity: 2, Station: "bar"},
				},
			},
			{
				ClientOrderID: clientKey2,
				TenantID:      tenant.ID,
				BranchID:      branch.ID,
				CashierName:   cashier.FullName,
				OrderType:     "take_away",
				Status:        "da_thanh_toan",
				PaymentMethod: "chuyen_khoan_vietqr",
				PaidAmount:    150000.0,
				TotalAmount:   150000.0,
				ShiftID:       &shift.ID,
				Items: []handler.OrderItemRequest{
					{ProductName: "Cà Phê Muối", UnitPrice: 50000.0, Quantity: 3, Station: "bar"},
				},
			},
			{
				ClientOrderID: clientKey3,
				TenantID:      tenant.ID,
				BranchID:      branch.ID,
				TableID:       &table.ID,
				CashierName:   cashier.FullName,
				OrderType:     "dine_in",
				Status:        "da_thanh_toan",
				PaymentMethod: "tien_mat",
				PaidAmount:    80000.0,
				TotalAmount:   80000.0,
				ShiftID:       &shift.ID,
				Items: []handler.OrderItemRequest{
					{ProductName: "Bánh Mì Chảo", UnitPrice: 80000.0, Quantity: 1, Station: "kitchen"},
				},
			},
		},
	}

	// 2. First Sync submission: All 3 orders should be created successfully
	wSync1 := PerformRequest(router, "POST", "/api/v1/sync/orders", offlineBatch)
	if wSync1.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for first sync, got %d: %s", wSync1.Code, wSync1.Body.String())
	}

	var syncResp1 map[string]interface{}
	ParseJSON(t, wSync1, &syncResp1)

	syncedCount1 := int(syncResp1["synced_count"].(float64))
	duplicateCount1 := int(syncResp1["duplicate_count"].(float64))
	if syncedCount1 != 3 || duplicateCount1 != 0 {
		t.Fatalf("Expected 3 synced, 0 duplicates, got: synced=%d, duplicates=%d", syncedCount1, duplicateCount1)
	}

	// Verify database contains 3 orders with client keys
	var orderCountInDB int64
	db.Model(&models.Order{}).Where("tenant_id = ?", tenant.ID).Count(&orderCountInDB)
	if orderCountInDB != 3 {
		t.Errorf("Expected exactly 3 orders in DB, got %d", orderCountInDB)
	}

	// 3. Retry Submission (Idempotency Check): Resubmit identical batch
	wSync2 := PerformRequest(router, "POST", "/api/v1/sync/orders", offlineBatch)
	if wSync2.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for duplicate sync retry, got %d: %s", wSync2.Code, wSync2.Body.String())
	}

	var syncResp2 map[string]interface{}
	ParseJSON(t, wSync2, &syncResp2)

	syncedCount2 := int(syncResp2["synced_count"].(float64))
	duplicateCount2 := int(syncResp2["duplicate_count"].(float64))
	if syncedCount2 != 0 || duplicateCount2 != 3 {
		t.Fatalf("Expected 0 synced, 3 duplicates on retry, got: synced=%d, duplicates=%d", syncedCount2, duplicateCount2)
	}

	// Verify database STILL has exactly 3 orders (no double-counting or duplication)
	db.Model(&models.Order{}).Where("tenant_id = ?", tenant.ID).Count(&orderCountInDB)
	if orderCountInDB != 3 {
		t.Errorf("Expected still 3 orders in DB after retry, got %d", orderCountInDB)
	}

	// 4. Mixed Batch Submission (1 existing + 1 new)
	clientKey4 := uuid.New().String()
	mixedBatch := handler.SyncOrdersRequest{
		Orders: []handler.SyncOrderPayload{
			offlineBatch.Orders[0], // clientKey1 (already synced)
			{
				ClientOrderID: clientKey4,
				TenantID:      tenant.ID,
				BranchID:      branch.ID,
				CashierName:   cashier.FullName,
				OrderType:     "take_away",
				Status:        "da_thanh_toan",
				PaymentMethod: "tien_mat",
				PaidAmount:    60000.0,
				TotalAmount:   60000.0,
				ShiftID:       &shift.ID,
				Items: []handler.OrderItemRequest{
					{ProductName: "Nước Ép Ổi Hồng", UnitPrice: 60000.0, Quantity: 1, Station: "bar"},
				},
			},
		},
	}

	wSync3 := PerformRequest(router, "POST", "/api/v1/sync/orders", mixedBatch)
	if wSync3.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK for mixed sync, got %d: %s", wSync3.Code, wSync3.Body.String())
	}

	var syncResp3 map[string]interface{}
	ParseJSON(t, wSync3, &syncResp3)

	syncedCount3 := int(syncResp3["synced_count"].(float64))
	duplicateCount3 := int(syncResp3["duplicate_count"].(float64))
	if syncedCount3 != 1 || duplicateCount3 != 1 {
		t.Errorf("Expected 1 synced, 1 duplicate in mixed batch, got: synced=%d, duplicates=%d", syncedCount3, duplicateCount3)
	}

	db.Model(&models.Order{}).Where("tenant_id = ?", tenant.ID).Count(&orderCountInDB)
	if orderCountInDB != 4 {
		t.Errorf("Expected exactly 4 orders in DB after mixed sync, got %d", orderCountInDB)
	}

	// 5. Concurrent Stress Test: 10 goroutines submit identical clientKey5 simultaneously
	clientKey5 := uuid.New().String()
	concurrentPayload := handler.SyncOrdersRequest{
		Orders: []handler.SyncOrderPayload{
			{
				ClientOrderID: clientKey5,
				TenantID:      tenant.ID,
				BranchID:      branch.ID,
				CashierName:   cashier.FullName,
				OrderType:     "take_away",
				Status:        "da_thanh_toan",
				PaymentMethod: "tien_mat",
				PaidAmount:    50000.0,
				TotalAmount:   50000.0,
				ShiftID:       &shift.ID,
				Items: []handler.OrderItemRequest{
					{ProductName: "Bạc Xỉu Đá", UnitPrice: 50000.0, Quantity: 1, Station: "bar"},
				},
			},
		},
	}

	var wg sync.WaitGroup
	concurrentCount := 10
	for i := 0; i < concurrentCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			w := PerformRequest(router, "POST", "/api/v1/sync/orders", concurrentPayload)
			if w.Code != http.StatusOK && w.Code != http.StatusBadRequest {
				t.Errorf("Unexpected concurrent status: %d", w.Code)
			}
		}()
	}
	wg.Wait()

	// Invariant: Exactly 1 order with clientKey5 exists in database
	var countKey5 int64
	db.Model(&models.Order{}).Where("client_order_id = ?", clientKey5).Count(&countKey5)
	if countKey5 != 1 {
		t.Errorf("Expected exactly 1 order with key %s, found %d", clientKey5, countKey5)
	}
}
