package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/service"
	"github.com/ongchu/pos-backend/internal/websocket"
	"gorm.io/gorm"
)

// GetIngredients trả về danh sách nguyên liệu và tồn kho thực tế
func GetIngredients(c *gin.Context) {
	tenantID := GetTenantID(c)
	branchID := c.Query("branch_id")

	if database.DB == nil {
		c.JSON(http.StatusOK, []models.Ingredient{})
		return
	}

	var ingredients []models.Ingredient
	query := ScopeTenant(database.DB.Model(&models.Ingredient{}), tenantID)
	if branchID != "" {
		query = query.Where("branch_id = ?", branchID)
	}

	if err := query.Order("name ASC").Find(&ingredients).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tải nguyên liệu: %v", err)})
		return
	}

	c.JSON(http.StatusOK, ingredients)
}

// CreateIngredientRequest payload tạo nguyên vật liệu / hàng hóa
type CreateIngredientRequest struct {
	SKU          string  `json:"sku"`
	Name         string  `json:"name" binding:"required"`
	Category     string  `json:"category"`
	Unit         string  `json:"unit" binding:"required"`
	CurrentStock float64 `json:"current_stock"`
	MinStock     float64 `json:"min_stock"`
	CostPrice    float64 `json:"cost_price"`
	SupplierName string  `json:"supplier_name"`
	BranchID     string  `json:"branch_id"`
}

// CreateIngredient thêm mới nguyên vật liệu/hàng tồn kho
func CreateIngredient(c *gin.Context) {
	tenantID := GetTenantID(c)
	var req CreateIngredientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu dữ liệu bắt buộc (Tên hoặc ĐVT)"})
		return
	}

	branchID := req.BranchID
	if branchID == "" {
		branchID = "main"
	}
	cat := req.Category
	if cat == "" {
		cat = "nguyen_lieu"
	}
	sku := req.SKU
	if sku == "" {
		sku = fmt.Sprintf("NL-%03d", time.Now().Unix()%1000)
	}

	ing := models.Ingredient{
		ID:                 uuid.New().String(),
		TenantID:           tenantID,
		BranchID:           branchID,
		SKU:                sku,
		Name:               req.Name,
		Category:           cat,
		Unit:               req.Unit,
		CurrentStock:       req.CurrentStock,
		MinStock:           req.MinStock,
		AvgCostPrice:       req.CostPrice,
		YieldRate:          100,
		EffectiveCostPrice: req.CostPrice,
		SupplierName:       req.SupplierName,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	if database.DB != nil {
		if err := database.DB.Create(&ing).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Không thể lưu nguyên liệu: %v", err)})
			return
		}
	}

	c.JSON(http.StatusCreated, ing)
}

// UpdateIngredient cập nhật nguyên vật liệu/hàng tồn kho
func UpdateIngredient(c *gin.Context) {
	tenantID := GetTenantID(c)
	id := c.Param("id")

	var req CreateIngredientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu cập nhật không hợp lệ"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}

	var ing models.Ingredient
	if err := ScopeTenant(database.DB, tenantID).First(&ing, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy mặt hàng trong kho"})
		return
	}

	updates := map[string]interface{}{
		"name":                 req.Name,
		"unit":                 req.Unit,
		"current_stock":        req.CurrentStock,
		"min_stock":            req.MinStock,
		"avg_cost_price":       req.CostPrice,
		"effective_cost_price": req.CostPrice,
		"supplier_name":        req.SupplierName,
		"updated_at":           time.Now(),
	}
	if req.SKU != "" {
		updates["sku"] = req.SKU
	}
	if req.Category != "" {
		updates["category"] = req.Category
	}

	if err := database.DB.Model(&ing).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Không thể cập nhật: %v", err)})
		return
	}

	c.JSON(http.StatusOK, ing)
}

// DeleteIngredient xóa nguyên vật liệu khỏi kho
func DeleteIngredient(c *gin.Context) {
	tenantID := GetTenantID(c)
	id := c.Param("id")

	if database.DB != nil {
		if err := ScopeTenant(database.DB, tenantID).Delete(&models.Ingredient{}, "id = ?", id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Không thể xóa mặt hàng: %v", err)})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã xóa mặt hàng"})
}

// GetLowStockIngredients cảnh báo các nguyên liệu đã chạm hoặc dưới ngưỡng an toàn (MinStock)
func GetLowStockIngredients(c *gin.Context) {
	tenantID := c.Query("tenant_id")
	branchID := c.Query("branch_id")

	if database.DB == nil {
		c.JSON(http.StatusOK, []models.Ingredient{})
		return
	}

	var ingredients []models.Ingredient
	query := database.DB.Where("current_stock <= min_stock")
	if tenantID != "" {
		query = query.Where("tenant_id = ?", tenantID)
	}
	if branchID != "" {
		query = query.Where("branch_id = ?", branchID)
	}

	if err := query.Order("current_stock ASC").Find(&ingredients).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tải nguyên liệu sắp hết: %v", err)})
		return
	}

	c.JSON(http.StatusOK, ingredients)
}

type CreatePurchaseOrderRequest struct {
	TenantID    string                    `json:"tenant_id" binding:"required"`
	BranchID    string                    `json:"branch_id" binding:"required"`
	Supplier    string                    `json:"supplier" binding:"required"`
	PaymentType string                    `json:"payment_type"`
	CreatedBy   string                    `json:"created_by" binding:"required"`
	Note        string                    `json:"note"`
	Items       []CreatePurchaseOrderItem `json:"items" binding:"required"`
}

type CreatePurchaseOrderItem struct {
	IngredientID string  `json:"ingredient_id" binding:"required"`
	Quantity     float64 `json:"quantity" binding:"required"`
	UnitPrice    float64 `json:"unit_price" binding:"required"`
}

// CreatePurchaseOrder ghi nhận phiếu nhập hàng từ nhà cung cấp và tự động tăng tồn kho nguyên liệu
func CreatePurchaseOrder(c *gin.Context) {
	var req CreatePurchaseOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phiếu nhập kho phải có ít nhất 1 nguyên liệu"})
		return
	}

	poID := uuid.New().String()
	poCode := fmt.Sprintf("PO-%s-%s", time.Now().Format("20060102"), poID[:4])

	var totalAmount float64
	poItems := make([]models.PurchaseOrderItem, 0, len(req.Items))

	for _, it := range req.Items {
		itemTotal := it.Quantity * it.UnitPrice
		totalAmount += itemTotal
		poItems = append(poItems, models.PurchaseOrderItem{
			ID:           uuid.New().String(),
			POID:         poID,
			IngredientID: it.IngredientID,
			Quantity:     it.Quantity,
			UnitPrice:    it.UnitPrice,
			TotalPrice:   itemTotal,
		})
	}

	paymentType := req.PaymentType
	if paymentType == "" {
		paymentType = "tien_mat"
	}

	tenantID := GetTenantID(c)
	if tenantID == "" {
		tenantID = req.TenantID
	}
	if tenantID == "" {
		tenantID = "tenant_ongchu"
	}

	po := models.PurchaseOrder{
		ID:          poID,
		TenantID:    tenantID,
		BranchID:    req.BranchID,
		POCode:      poCode,
		Supplier:    req.Supplier,
		TotalAmount: totalAmount,
		PaymentType: paymentType,
		CreatedBy:   req.CreatedBy,
		Note:        req.Note,
		CreatedAt:   time.Now(),
		Items:       poItems,
	}

	if database.DB != nil {
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			// Xác thực toàn bộ nguyên liệu thuộc đúng Tenant hiện tại (Chống Cross-Tenant FK Injection)
			for _, it := range req.Items {
				var ing models.Ingredient
				if err := tx.Where("id = ? AND tenant_id = ?", it.IngredientID, tenantID).First(&ing).Error; err != nil {
					return fmt.Errorf("nguyên liệu '%s' không tồn tại hoặc không thuộc quyền sở hữu của quán này", it.IngredientID)
				}
			}

			if err := tx.Create(&po).Error; err != nil {
				return err
			}

			// Tăng tồn kho nguyên liệu theo từng dòng phiếu nhập của đúng Tenant
			for _, it := range req.Items {
				if err := tx.Model(&models.Ingredient{}).
					Where("id = ? AND tenant_id = ?", it.IngredientID, tenantID).
					Update("current_stock", gorm.Expr("current_stock + ?", it.Quantity)).Error; err != nil {
					return err
				}
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, po)
}

type CreateAdjustmentRequest struct {
	TenantID     string   `json:"tenant_id" binding:"required"`
	BranchID     string   `json:"branch_id" binding:"required"`
	IngredientID string   `json:"ingredient_id" binding:"required"`
	Type         string   `json:"type" binding:"required"` // xuat_huy_hong, can_bang_kiem_ke, hao_hut
	Quantity     float64  `json:"quantity"`                // Lượng hủy hoặc lượng hao hụt
	ActualStock  *float64 `json:"actual_stock"`            // Tồn đếm thực tế khi kiểm kho
	Reason       string   `json:"reason" binding:"required"`
	PerformedBy  string   `json:"performed_by" binding:"required"`
}

// CreateInventoryAdjustment xuất hủy hoặc cân bằng tồn kho kiểm kê thực tế
func CreateInventoryAdjustment(c *gin.Context) {
	var req CreateAdjustmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adj := models.InventoryAdjustment{
		ID:           uuid.New().String(),
		TenantID:     req.TenantID,
		BranchID:     req.BranchID,
		IngredientID: req.IngredientID,
		Type:         req.Type,
		Reason:       req.Reason,
		PerformedBy:  req.PerformedBy,
		CreatedAt:    time.Now(),
	}

	if database.DB != nil {
		var ing models.Ingredient
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.First(&ing, "id = ?", req.IngredientID).Error; err != nil {
				return err
			}

			adj.SystemStock = ing.CurrentStock

			if req.ActualStock != nil {
				// Cân bằng kiểm kê: Tồn mới = Tồn đếm thực tế
				adj.ActualStock = *req.ActualStock
				adj.Quantity = *req.ActualStock - ing.CurrentStock // Diff (dương: dôi dư, âm: thất thoát)

				if err := tx.Model(&models.Ingredient{}).
					Where("id = ?", req.IngredientID).
					Update("current_stock", *req.ActualStock).Error; err != nil {
					return err
				}
				ing.CurrentStock = *req.ActualStock
			} else {
				// Xuất hủy / hao hụt thông thường: Trừ bớt tồn kho
				adj.ActualStock = ing.CurrentStock - req.Quantity
				adj.Quantity = req.Quantity

				if err := tx.Model(&models.Ingredient{}).
					Where("id = ?", req.IngredientID).
					Update("current_stock", gorm.Expr("current_stock - ?", req.Quantity)).Error; err != nil {
					return err
				}
				ing.CurrentStock -= req.Quantity
			}

			if err := tx.Create(&adj).Error; err != nil {
				return err
			}

			// Kiểm tra ngưỡng an toàn
			if ing.CurrentStock <= ing.MinStock {
				go service.GlobalTelegramAlert.SendAlert(
					"CẢNH BÁO NGUYÊN LIỆU SẮP HẾT",
					fmt.Sprintf("Nguyên liệu *%s* chỉ còn *%.2f %s* (Mức an toàn: %.2f %s)",
						ing.Name, ing.CurrentStock, ing.Unit, ing.MinStock, ing.Unit),
					"warning",
				)
				websocket.GlobalHub.BroadcastJSON(gin.H{
					"type":            "low_stock_alert",
					"ingredient_id":   ing.ID,
					"ingredient_name": ing.Name,
					"current_stock":   ing.CurrentStock,
					"unit":            ing.Unit,
					"min_stock":       ing.MinStock,
				})
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi điều chỉnh kho: %v", err)})
			return
		}
	}

	c.JSON(http.StatusCreated, adj)
}

// GetPurchaseOrders trả về danh sách lịch sử phiếu nhập hàng từ nhà cung cấp
func GetPurchaseOrders(c *gin.Context) {
	tenantID := c.Query("tenant_id")
	branchID := c.Query("branch_id")

	if database.DB == nil {
		c.JSON(http.StatusOK, []models.PurchaseOrder{})
		return
	}

	var pos []models.PurchaseOrder
	query := database.DB.Preload("Items").Model(&models.PurchaseOrder{})
	if tenantID != "" {
		query = query.Where("tenant_id = ?", tenantID)
	}
	if branchID != "" {
		query = query.Where("branch_id = ?", branchID)
	}

	if err := query.Order("created_at DESC").Find(&pos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tải phiếu nhập: %v", err)})
		return
	}

	c.JSON(http.StatusOK, pos)
}

