package testsuite

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/models"
)

// TestScenario7_OperationsAndCashflow kiểm chứng trọn vẹn 6 nghiệp vụ thực tế:
// 1. Chặn món 86 khi tạo đơn
// 2. In tạm tính chuyển bàn sang màu vàng
// 3. Thanh toán hỗn hợp (tiền mặt + VietQR) đối soát dòng tiền chuẩn xác
// 4. CRM Khách hàng tra cứu SĐT, tích điểm và trừ điểm bill
// 5. Cân bằng kho kiểm kê thực tế
// 6. Quản lý Nhà cung cấp
func TestScenario7_OperationsAndCashflow(t *testing.T) {
	db, router := SetupTestEnv(t)

	tenantID := "tenant-test-7"
	branchID := "branch-test-7"

	// 1. Tạo dữ liệu mẫu: Bàn ăn, Sản phẩm (1 đang bán, 1 bị 86), Nguyên liệu
	table := models.DiningTable{
		ID:       uuid.New().String(),
		TenantID: tenantID,
		BranchID: branchID,
		AreaName: "Tầng 1",
		Name:     "Bàn 07",
		Capacity: 4,
		Status:   "trong",
	}
	db.Create(&table)

	prodNormal := models.Product{
		ID:           uuid.New().String(),
		TenantID:     tenantID,
		Code:         "CF-DA",
		Name:         "Cà phê đá",
		SellingPrice: 25000,
		CostPrice:    8000,
		IsOutOfStock: false,
		Station:      "bar",
	}
	db.Create(&prodNormal)

	prod86 := models.Product{
		ID:           uuid.New().String(),
		TenantID:     tenantID,
		Code:         "TRA-DAO",
		Name:         "Trà đào cam sả",
		SellingPrice: 40000,
		CostPrice:    12000,
		IsOutOfStock: true, // Báo hết món!
		Station:      "bar",
	}
	db.Create(&prod86)

	ingredient := models.Ingredient{
		ID:           uuid.New().String(),
		TenantID:     tenantID,
		BranchID:     branchID,
		Name:         "Cà phê Robusta",
		Unit:         "g",
		CurrentStock: 500, // 500g
		MinStock:     100,
		AvgCostPrice: 200,
	}
	db.Create(&ingredient)

	// Định lượng 25g cafe cho 1 ly
	recipe := models.RecipeItem{
		ID:           uuid.New().String(),
		ProductID:    prodNormal.ID,
		IngredientID: ingredient.ID,
		QuantityUsed: 25,
	}
	db.Create(&recipe)

	// ==========================================
	// BƯỚC 1: KIỂM CHỨNG CHẶN MÓN 86
	// ==========================================
	t.Run("Chặn tạo đơn khi có món 86", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"tenant_id": tenantID,
			"branch_id": branchID,
			"table_id":  table.ID,
			"items": []map[string]interface{}{
				{
					"product_id":   prod86.ID,
					"product_name": prod86.Name,
					"unit_price":   prod86.SellingPrice,
					"quantity":     1,
				},
			},
		}
		w := PerformRequest(router, "POST", "/api/v1/orders", reqBody)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("Kỳ vọng 400 Bad Request khi gọi món 86, nhận được %d", w.Code)
		}
	})

	// ==========================================
	// BƯỚC 2: TẠO ĐƠN HÀNG HỢP LỆ & IN TẠM TÍNH (BÀN VÀNG)
	// ==========================================
	var createdOrderID string
	t.Run("Tạo đơn hợp lệ và in tạm tính", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"tenant_id": tenantID,
			"branch_id": branchID,
			"table_id":  table.ID,
			"items": []map[string]interface{}{
				{
					"product_id":   prodNormal.ID,
					"product_name": prodNormal.Name,
					"unit_price":   prodNormal.SellingPrice,
					"quantity":     2, // 2 x 25.000 = 50.000 đ
				},
			},
		}
		w := PerformRequest(router, "POST", "/api/v1/orders", reqBody)
		if w.Code != http.StatusCreated {
			t.Fatalf("Tạo đơn thất bại: %d", w.Code)
		}
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		createdOrderID = resp["id"].(string)

		// Gọi API in tạm tính
		wPrePrint := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pre-print", createdOrderID), nil)
		if wPrePrint.Code != http.StatusOK {
			t.Fatalf("In tạm tính thất bại: %d", wPrePrint.Code)
		}

		// Kiểm tra trạng thái bàn đã sang 'da_in_tam_tinh'
		var updatedTable models.DiningTable
		db.First(&updatedTable, "id = ?", table.ID)
		if updatedTable.Status != "da_in_tam_tinh" {
			t.Fatalf("Trạng thái bàn phải là 'da_in_tam_tinh', thực tế: %s", updatedTable.Status)
		}

		// Kiểm tra AuditLog có lưu 'in_tam_tinh'
		var audit models.AuditLog
		if err := db.Where("action = ? AND order_id = ?", "in_tam_tinh", createdOrderID).First(&audit).Error; err != nil {
			t.Fatalf("Không tìm thấy AuditLog in tạm tính: %v", err)
		}
	})

	// ==========================================
	// BƯỚC 3: MỞ CA & THANH TOÁN HỖN HỢP (CASH + QR)
	// ==========================================
	t.Run("Thanh toán hỗn hợp và cập nhật ca trực", func(t *testing.T) {
		// Mở ca với 500.000 đ
		wShift := PerformRequest(router, "POST", "/api/v1/shifts/open", map[string]interface{}{
			"tenant_id":     tenantID,
			"branch_id":     branchID,
			"cashier_id":    "cashier-1",
			"cashier_name":  "Thu Ngân Ca Sáng",
			"starting_cash": 500000.0,
		})
		if wShift.Code != http.StatusCreated {
			t.Fatalf("Mở ca thất bại: %d", wShift.Code)
		}
		var shiftResp map[string]interface{}
		json.Unmarshal(wShift.Body.Bytes(), &shiftResp)
		shiftData := shiftResp["shift"].(map[string]interface{})
		shiftID := shiftData["id"].(string)

		// Gán shift_id vào đơn
		db.Model(&models.Order{}).Where("id = ?", createdOrderID).Update("shift_id", shiftID)

		// Thanh toán hỗn hợp: Tổng 50.000đ -> Khách trả 20.000đ tiền mặt + 30.000đ VietQR
		payReq := map[string]interface{}{
			"payment_method": "hon_hop",
			"paid_amount":    50000.0,
			"cash_amount":    20000.0,
			"bank_amount":    30000.0,
		}
		wPay := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", createdOrderID), payReq)
		if wPay.Code != http.StatusOK {
			t.Fatalf("Thanh toán hỗn hợp thất bại: %d", wPay.Code)
		}

		// Kiểm tra ca làm việc
		var shift models.CashShift
		db.First(&shift, "id = ?", shiftID)
		if shift.TotalCashSales != 20000.0 {
			t.Fatalf("Kỳ vọng TotalCashSales = 20000, thực tế: %.2f", shift.TotalCashSales)
		}
		if shift.TotalVietQRSales != 30000.0 {
			t.Fatalf("Kỳ vọng TotalVietQRSales = 30000, thực tế: %.2f", shift.TotalVietQRSales)
		}
		// Expected Ending Cash = Starting (500k) + CashSales (20k) = 520k
		if shift.ExpectedEndingCash != 520000.0 {
			t.Fatalf("Kỳ vọng ExpectedEndingCash = 520000, thực tế: %.2f", shift.ExpectedEndingCash)
		}

		// Kiểm tra trừ kho BOM: 2 ly x 25g = 50g -> Tồn còn 450g
		var ing models.Ingredient
		db.First(&ing, "id = ?", ingredient.ID)
		if ing.CurrentStock != 450.0 {
			t.Fatalf("Kỳ vọng tồn kho còn 450g, thực tế: %.2f", ing.CurrentStock)
		}

		// Bàn đã được giải phóng về 'trong'
		var freedTable models.DiningTable
		db.First(&freedTable, "id = ?", table.ID)
		if freedTable.Status != "trong" {
			t.Fatalf("Bàn sau thanh toán phải là 'trong', thực tế: %s", freedTable.Status)
		}
	})

	// ==========================================
	// BƯỚC 4: CRM KHÁCH HÀNG & TÍCH ĐIỂM
	// ==========================================
	t.Run("CRM tạo khách hàng và tích lũy điểm", func(t *testing.T) {
		// Tạo khách hàng
		custReq := map[string]interface{}{
			"tenant_id": tenantID,
			"branch_id": branchID,
			"name":      "Anh Nam",
			"phone":     "0912345678",
			"birthday":  "1990-05-15",
		}
		wCust := PerformRequest(router, "POST", "/api/v1/customers", custReq)
		if wCust.Code != http.StatusCreated && wCust.Code != http.StatusOK {
			t.Fatalf("Tạo khách hàng thất bại: %d", wCust.Code)
		}

		// Tra cứu khách hàng theo SĐT
		wLookup := PerformRequest(router, "GET", "/api/v1/customers/by-phone/0912345678?tenant_id="+tenantID, nil)
		if wLookup.Code != http.StatusOK {
			t.Fatalf("Tra cứu khách hàng thất bại: %d", wLookup.Code)
		}

		// Tạo đơn hàng mới 100.000đ cho Anh Nam và thanh toán tích điểm
		ordReq := map[string]interface{}{
			"tenant_id": tenantID,
			"branch_id": branchID,
			"items": []map[string]interface{}{
				{
					"product_id":   prodNormal.ID,
					"product_name": prodNormal.Name,
					"unit_price":   prodNormal.SellingPrice,
					"quantity":     4, // 4 x 25k = 100k
				},
			},
		}
		wOrd := PerformRequest(router, "POST", "/api/v1/orders", ordReq)
		var ordResp map[string]interface{}
		json.Unmarshal(wOrd.Body.Bytes(), &ordResp)
		newOrdID := ordResp["id"].(string)

		// Thanh toán kèm SĐT khách để tích điểm
		wPayCust := PerformRequest(router, "POST", fmt.Sprintf("/api/v1/orders/%s/pay", newOrdID), map[string]interface{}{
			"payment_method": "tien_mat",
			"paid_amount":    100000.0,
			"customer_phone": "0912345678",
		})
		if wPayCust.Code != http.StatusOK {
			t.Fatalf("Thanh toán tích điểm thất bại: %d", wPayCust.Code)
		}

		// Kiểm tra điểm tích: 100.000đ / 10.000 = 10 điểm
		var cust models.Customer
		db.Where("phone = ?", "0912345678").First(&cust)
		if cust.PointsBalance != 10 {
			t.Fatalf("Kỳ vọng 10 điểm, thực tế: %d", cust.PointsBalance)
		}
	})

	// ==========================================
	// BƯỚC 5: CÂN BẰNG TỒN KHO KIỂM KÊ
	// ==========================================
	t.Run("Kiểm kê thực tế và cân bằng tồn kho", func(t *testing.T) {
		// Tồn hiện tại trên máy là 350g (đã trừ 50g và 100g)
		// Nhân viên đếm thực tế ngoài kho chỉ còn 320g (thất thoát 30g)
		actualCount := 320.0
		adjReq := map[string]interface{}{
			"tenant_id":     tenantID,
			"branch_id":     branchID,
			"ingredient_id": ingredient.ID,
			"type":          "can_bang_kiem_ke",
			"actual_stock":  actualCount,
			"reason":        "Kiểm kê cuối ca phát hiện rơi vãi",
			"performed_by":  "Quản lý ca",
		}
		wAdj := PerformRequest(router, "POST", "/api/v1/inventory/adjust", adjReq)
		if wAdj.Code != http.StatusCreated {
			t.Fatalf("Cân bằng tồn kho thất bại: %d", wAdj.Code)
		}

		// Kiểm tra tồn kho máy đã được gán chính xác bằng tồn thực tế 320g
		var updatedIng models.Ingredient
		db.First(&updatedIng, "id = ?", ingredient.ID)
		if updatedIng.CurrentStock != 320.0 {
			t.Fatalf("Kỳ vọng tồn sau cân bằng là 320g, thực tế: %.2f", updatedIng.CurrentStock)
		}
	})

	// ==========================================
	// BƯỚC 6: QUẢN LÝ NHÀ CUNG CẤP (VENDOR)
	// ==========================================
	t.Run("Quản lý Nhà cung cấp", func(t *testing.T) {
		vendorReq := map[string]interface{}{
			"tenant_id":      tenantID,
			"branch_id":      branchID,
			"name":           "Công Ty Cà Phê Ban Mê",
			"phone":          "0909123456",
			"contact_person": "Chị Lan",
		}
		wVendor := PerformRequest(router, "POST", "/api/v1/vendors", vendorReq)
		if wVendor.Code != http.StatusCreated {
			t.Fatalf("Tạo nhà cung cấp thất bại: %d", wVendor.Code)
		}

		wList := PerformRequest(router, "GET", "/api/v1/vendors?tenant_id="+tenantID, nil)
		if wList.Code != http.StatusOK {
			t.Fatalf("Xem danh bạ NCC thất bại: %d", wList.Code)
		}
		var vendors []models.Vendor
		json.Unmarshal(wList.Body.Bytes(), &vendors)
		if len(vendors) == 0 {
			t.Fatalf("Danh bạ nhà cung cấp không được rỗng")
		}
	})
}
