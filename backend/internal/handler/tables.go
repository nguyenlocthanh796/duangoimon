package handler

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
	"gorm.io/gorm"
)

// GetTables trả về sơ đồ bàn ăn kèm trạng thái
func GetTables(c *gin.Context) {
	tenantID := GetTenantID(c)
	branchID := c.Query("branch_id")

	if database.DB == nil {
		c.JSON(http.StatusOK, []models.DiningTable{})
		return
	}

	var tables []models.DiningTable
	query := ScopeTenant(database.DB.Model(&models.DiningTable{}), tenantID)
	if branchID != "" {
		query = query.Where("branch_id = ?", branchID)
	}

	if err := query.Order("sort_order ASC, name ASC").Find(&tables).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tải sơ đồ bàn: %v", err)})
		return
	}

	// Nạp thông tin tổng tiền, số món, thời gian ngồi của đơn đang phục vụ (Batch query 1 lần, triệt tiêu N+1 loop)
	orderIDs := make([]string, 0, len(tables))
	for i := range tables {
		if tables[i].ActiveOrderID != nil && *tables[i].ActiveOrderID != "" {
			orderIDs = append(orderIDs, *tables[i].ActiveOrderID)
		}
	}

	if len(orderIDs) > 0 {
		var orders []models.Order
		if err := database.DB.Preload("Items").Where("id IN ?", orderIDs).Find(&orders).Error; err == nil {
			orderMap := make(map[string]models.Order, len(orders))
			for _, ord := range orders {
				orderMap[ord.ID] = ord
			}
			for i := range tables {
				if tables[i].ActiveOrderID != nil {
					if ord, exists := orderMap[*tables[i].ActiveOrderID]; exists {
						tables[i].ActiveOrderTotal = ord.TotalAmount
						tables[i].ActiveOrderItemCount = len(ord.Items)
						t := ord.CreatedAt
						tables[i].OccupiedSince = &t
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, tables)
}

// PrePrintTable chuyển bàn sang trạng thái 'da_in_tam_tinh' (Màu vàng)
func PrePrintTable(c *gin.Context) {
	tableID := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã ghi nhận in tạm tính"})
		return
	}

	var table models.DiningTable
	if err := database.DB.First(&table, "id = ?", tableID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy bàn"})
		return
	}

	table.Status = "da_in_tam_tinh"
	database.DB.Save(&table)

	// Ghi nhận AuditLog
	audit := models.AuditLog{
		ID:          uuid.New().String(),
		TenantID:    table.TenantID,
		BranchID:    table.BranchID,
		Action:      "in_tam_tinh",
		PerformedBy: "Thu ngân",
		OrderID:     table.ActiveOrderID,
		Details:     fmt.Sprintf("In phiếu tạm tính cho bàn %s (%s)", table.Name, table.AreaName),
		Severity:    "info",
		CreatedAt:   time.Now(),
	}
	database.DB.Create(&audit)

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":     "table_preprinted",
		"table_id": table.ID,
		"status":   "da_in_tam_tinh",
	})

	c.JSON(http.StatusOK, gin.H{
		"message":  "Đã in tạm tính và chuyển trạng thái bàn sang vàng",
		"table_id": table.ID,
		"status":   "da_in_tam_tinh",
	})
}

type MoveTableRequest struct {
	SourceTableID string `json:"source_table_id" binding:"required"`
	TargetTableID string `json:"target_table_id" binding:"required"`
}

// MoveTable chuyển toàn bộ đơn hàng từ Bàn A sang Bàn B trống
func MoveTable(c *gin.Context) {
	var req MoveTableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.SourceTableID == req.TargetTableID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bàn nguồn và bàn đích không được trùng nhau"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã chuyển bàn thành công (offline/memory mode)"})
		return
	}

	var orderID string
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var srcTable models.DiningTable
		if err := tx.First(&srcTable, "id = ?", req.SourceTableID).Error; err != nil {
			return fmt.Errorf("không tìm thấy bàn nguồn: %w", err)
		}

		if srcTable.ActiveOrderID == nil || *srcTable.ActiveOrderID == "" {
			return errors.New("bàn nguồn không có đơn hàng đang phục vụ")
		}
		orderID = *srcTable.ActiveOrderID

		var dstTable models.DiningTable
		if err := tx.First(&dstTable, "id = ?", req.TargetTableID).Error; err != nil {
			return fmt.Errorf("không tìm thấy bàn đích: %w", err)
		}

		if dstTable.Status == "dang_phuc_vu" && dstTable.ActiveOrderID != nil {
			return errors.New("bàn đích đang có khách, vui lòng sử dụng chức năng gộp bàn")
		}

		// Chuyển Order sang bàn đích
		if err := tx.Model(&models.Order{}).Where("id = ?", orderID).Update("table_id", req.TargetTableID).Error; err != nil {
			return err
		}

		// Cập nhật bàn nguồn về 'trong'
		if err := tx.Model(&models.DiningTable{}).Where("id = ?", req.SourceTableID).Updates(map[string]interface{}{
			"status":          "trong",
			"active_order_id": nil,
		}).Error; err != nil {
			return err
		}

		// Cập nhật bàn đích sang 'dang_phuc_vu'
		if err := tx.Model(&models.DiningTable{}).Where("id = ?", req.TargetTableID).Updates(map[string]interface{}{
			"status":          "dang_phuc_vu",
			"active_order_id": orderID,
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":            "table_moved",
		"source_table_id": req.SourceTableID,
		"target_table_id": req.TargetTableID,
		"order_id":        orderID,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":         "Chuyển bàn thành công",
		"source_table_id": req.SourceTableID,
		"target_table_id": req.TargetTableID,
		"order_id":        orderID,
	})
}

type MergeTableRequest struct {
	SourceTableID string `json:"source_table_id" binding:"required"`
	TargetTableID string `json:"target_table_id" binding:"required"`
}

// MergeTable gộp đơn hàng từ Bàn A vào Bàn B
func MergeTable(c *gin.Context) {
	var req MergeTableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.SourceTableID == req.TargetTableID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bàn nguồn và bàn đích không được trùng nhau"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã gộp bàn thành công (offline/memory mode)"})
		return
	}

	var targetOrderID string
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var srcTable models.DiningTable
		if err := tx.First(&srcTable, "id = ?", req.SourceTableID).Error; err != nil {
			return fmt.Errorf("không tìm thấy bàn nguồn: %w", err)
		}

		if srcTable.ActiveOrderID == nil || *srcTable.ActiveOrderID == "" {
			return errors.New("bàn nguồn không có đơn hàng đang phục vụ")
		}
		srcOrderID := *srcTable.ActiveOrderID

		var dstTable models.DiningTable
		if err := tx.First(&dstTable, "id = ?", req.TargetTableID).Error; err != nil {
			return fmt.Errorf("không tìm thấy bàn đích: %w", err)
		}

		// Nếu bàn đích chưa có khách, biến thành thao tác chuyển bàn
		if dstTable.ActiveOrderID == nil || *dstTable.ActiveOrderID == "" {
			targetOrderID = srcOrderID
			if err := tx.Model(&models.Order{}).Where("id = ?", srcOrderID).Update("table_id", req.TargetTableID).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.DiningTable{}).Where("id = ?", req.SourceTableID).Updates(map[string]interface{}{
				"status":          "trong",
				"active_order_id": nil,
			}).Error; err != nil {
				return err
			}
			if err := tx.Model(&models.DiningTable{}).Where("id = ?", req.TargetTableID).Updates(map[string]interface{}{
				"status":          "dang_phuc_vu",
				"active_order_id": targetOrderID,
			}).Error; err != nil {
				return err
			}
			return nil
		}

		targetOrderID = *dstTable.ActiveOrderID

		// Chuyển toàn bộ OrderItem từ srcOrderID sang targetOrderID
		if err := tx.Model(&models.OrderItem{}).Where("order_id = ?", srcOrderID).Update("order_id", targetOrderID).Error; err != nil {
			return err
		}

		// Tính toán lại tổng tiền cho targetOrder
		var items []models.OrderItem
		if err := tx.Where("order_id = ?", targetOrderID).Find(&items).Error; err != nil {
			return err
		}

		var subtotal float64
		var totalCost float64
		for _, it := range items {
			subtotal += it.TotalPrice
			totalCost += it.CostPrice * it.Quantity
		}

		var dstOrder models.Order
		if err := tx.First(&dstOrder, "id = ?", targetOrderID).Error; err != nil {
			return err
		}

		totalAmount := subtotal - dstOrder.DiscountAmount
		if totalAmount < 0 {
			totalAmount = 0
		}

		dstOrder.Subtotal = subtotal
		dstOrder.TotalAmount = totalAmount
		dstOrder.TotalCostPrice = totalCost
		if err := tx.Save(&dstOrder).Error; err != nil {
			return err
		}

		// Đóng hoặc hủy đơn bàn nguồn và giải phóng bàn nguồn
		now := time.Now()
		if err := tx.Model(&models.Order{}).Where("id = ?", srcOrderID).Updates(map[string]interface{}{
			"status":      "da_huy",
			"void_reason": fmt.Sprintf("Gộp vào bàn %s (%s)", dstTable.Name, dstOrder.OrderCode),
			"voided_at":   &now,
		}).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.DiningTable{}).Where("id = ?", req.SourceTableID).Updates(map[string]interface{}{
			"status":          "trong",
			"active_order_id": nil,
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":            "table_merged",
		"source_table_id": req.SourceTableID,
		"target_table_id": req.TargetTableID,
		"target_order_id": targetOrderID,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":         "Gộp bàn thành công",
		"source_table_id": req.SourceTableID,
		"target_table_id": req.TargetTableID,
		"target_order_id": targetOrderID,
	})
}

type SplitTableRequest struct {
	SourceTableID string   `json:"source_table_id" binding:"required"`
	TargetTableID string   `json:"target_table_id" binding:"required"`
	ItemIDs       []string `json:"item_ids" binding:"required"`
}

// SplitTable tách các món chỉ định từ Bàn A sang Bàn B trống
func SplitTable(c *gin.Context) {
	var req SplitTableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.ItemIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Danh sách món cần tách không được rỗng"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã tách bàn thành công (offline/memory mode)"})
		return
	}

	var newOrderID string
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var srcTable models.DiningTable
		if err := tx.First(&srcTable, "id = ?", req.SourceTableID).Error; err != nil {
			return fmt.Errorf("không tìm thấy bàn nguồn: %w", err)
		}
		if srcTable.ActiveOrderID == nil || *srcTable.ActiveOrderID == "" {
			return errors.New("bàn nguồn không có đơn hàng đang phục vụ")
		}
		srcOrderID := *srcTable.ActiveOrderID

		var dstTable models.DiningTable
		if err := tx.First(&dstTable, "id = ?", req.TargetTableID).Error; err != nil {
			return fmt.Errorf("không tìm thấy bàn đích: %w", err)
		}
		if dstTable.Status == "dang_phuc_vu" && dstTable.ActiveOrderID != nil {
			return errors.New("bàn đích đang có khách, vui lòng chọn bàn trống để tách")
		}

		var srcOrder models.Order
		if err := tx.First(&srcOrder, "id = ?", srcOrderID).Error; err != nil {
			return err
		}

		// Tạo đơn hàng mới cho bàn đích
		newOrderID = uuid.New().String()
		newOrderCode := fmt.Sprintf("HD-%s", newOrderID[:6])

		// Chuyển các món chỉ định sang đơn mới
		if err := tx.Model(&models.OrderItem{}).Where("id IN ? AND order_id = ?", req.ItemIDs, srcOrderID).Update("order_id", newOrderID).Error; err != nil {
			return err
		}

		// Kiểm tra xem bàn nguồn còn món nào không
		var remainingItems []models.OrderItem
		if err := tx.Where("order_id = ?", srcOrderID).Find(&remainingItems).Error; err != nil {
			return err
		}
		if len(remainingItems) == 0 {
			return errors.New("không thể tách tất cả món, vui lòng sử dụng chức năng chuyển bàn")
		}

		// Tính lại tiền bàn nguồn
		var srcSubtotal, srcCost float64
		for _, it := range remainingItems {
			srcSubtotal += it.TotalPrice
			srcCost += it.CostPrice * it.Quantity
		}
		srcTotal := srcSubtotal - srcOrder.DiscountAmount
		if srcTotal < 0 {
			srcTotal = 0
		}
		srcOrder.Subtotal = srcSubtotal
		srcOrder.TotalAmount = srcTotal
		srcOrder.TotalCostPrice = srcCost
		if err := tx.Save(&srcOrder).Error; err != nil {
			return err
		}

		// Tính tiền đơn mới bàn đích
		var splitItems []models.OrderItem
		if err := tx.Where("order_id = ?", newOrderID).Find(&splitItems).Error; err != nil {
			return err
		}
		var dstSubtotal, dstCost float64
		for _, it := range splitItems {
			dstSubtotal += it.TotalPrice
			dstCost += it.CostPrice * it.Quantity
		}

		newOrder := models.Order{
			ID:             newOrderID,
			TenantID:       srcOrder.TenantID,
			BranchID:       srcOrder.BranchID,
			OrderCode:      newOrderCode,
			TableID:        &req.TargetTableID,
			CashierName:    srcOrder.CashierName,
			CustomerName:   srcOrder.CustomerName,
			OrderType:      srcOrder.OrderType,
			Status:         "dang_xu_ly",
			Subtotal:       dstSubtotal,
			DiscountAmount: 0,
			TotalAmount:    dstSubtotal,
			TotalCostPrice: dstCost,
			ShiftID:        srcOrder.ShiftID,
			CreatedAt:      time.Now(),
		}
		if err := tx.Create(&newOrder).Error; err != nil {
			return err
		}

		// Cập nhật bàn đích sang 'dang_phuc_vu'
		if err := tx.Model(&models.DiningTable{}).Where("id = ?", req.TargetTableID).Updates(map[string]interface{}{
			"status":          "dang_phuc_vu",
			"active_order_id": newOrderID,
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":            "table_split",
		"source_table_id": req.SourceTableID,
		"target_table_id": req.TargetTableID,
		"new_order_id":    newOrderID,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":         "Tách bàn thành công",
		"source_table_id": req.SourceTableID,
		"target_table_id": req.TargetTableID,
		"new_order_id":    newOrderID,
	})
}

// GetAreas danh sách khu vực bàn ăn
func GetAreas(c *gin.Context) {
	tenantID := GetTenantID(c)

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"data": []models.Area{}})
		return
	}

	var areas []models.Area
	query := ScopeTenant(database.DB.Model(&models.Area{}), tenantID)
	if err := query.Order("sort_order asc, name asc").Find(&areas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": areas, "count": len(areas)})
}

// CreateArea thêm khu vực mới
func CreateArea(c *gin.Context) {
	var req struct {
		TenantID string `json:"tenant_id"`
		BranchID string `json:"branch_id"`
		Name     string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.TenantID == "" {
		req.TenantID = GetTenantID(c, "tenant-default")
	}
	if req.BranchID == "" {
		req.BranchID = c.GetHeader("X-Branch-ID")
	}
	if req.BranchID == "" {
		req.BranchID = "branch-default"
	}

	area := models.Area{
		ID:        uuid.New().String(),
		TenantID:  req.TenantID,
		BranchID:  req.BranchID,
		Name:      req.Name,
		CreatedAt: time.Now(),
	}

	if database.DB != nil {
		var maxSort int
		database.DB.Model(&models.Area{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxSort)
		area.SortOrder = maxSort + 1
		if err := database.DB.Create(&area).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	websocket.GlobalHub.BroadcastToTenant(area.TenantID, "area_created", area)
	c.JSON(http.StatusCreated, gin.H{"data": area, "message": "Thêm khu vực thành công"})
}

// UpdateArea cập nhật khu vực
func UpdateArea(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật khu vực"})
		return
	}

	var area models.Area
	if err := database.DB.First(&area, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy khu vực"})
		return
	}

	oldName := area.Name
	area.Name = req.Name
	if err := database.DB.Save(&area).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Cập nhật tên khu vực trong các bàn liên quan
	database.DB.Model(&models.DiningTable{}).Where("area_id = ? OR area_name = ?", id, oldName).Update("area_name", req.Name)

	websocket.GlobalHub.BroadcastToTenant(area.TenantID, "area_updated", area)
	c.JSON(http.StatusOK, gin.H{"data": area, "message": "Cập nhật khu vực thành công"})
}

// DeleteArea xóa khu vực
func DeleteArea(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã xóa khu vực"})
		return
	}

	var area models.Area
	if err := database.DB.First(&area, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy khu vực"})
		return
	}

	if err := database.DB.Where("id = ?", id).Delete(&models.Area{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(area.TenantID, "area_deleted", gin.H{"id": id})
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa khu vực thành công"})
}

// ReorderAreas sắp xếp lại thứ tự khu vực
func ReorderAreas(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant_ongchu")
	var req struct {
		AreaIDs []string `json:"area_ids"`
		IDs     []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ids := req.AreaIDs
	if len(ids) == 0 {
		ids = req.IDs
	}
	if len(ids) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Danh sách ID khu vực không được để trống"})
		return
	}

	if database.DB != nil {
		_ = database.DB.Transaction(func(tx *gorm.DB) error {
			for i, areaID := range ids {
				tx.Model(&models.Area{}).Where("id = ?", areaID).Update("sort_order", i+1)
			}
			return nil
		})
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "areas_reordered", ids)
	c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật thứ tự khu vực"})
}

// CreateTable thêm bàn mới
func CreateTable(c *gin.Context) {
	var req struct {
		TenantID string  `json:"tenant_id"`
		BranchID string  `json:"branch_id"`
		AreaID   *string `json:"area_id"`
		AreaName string  `json:"area_name"`
		Name     string  `json:"name" binding:"required"`
		Capacity int     `json:"capacity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.TenantID == "" {
		req.TenantID = GetTenantID(c, "tenant-default")
	}
	if req.BranchID == "" {
		req.BranchID = c.GetHeader("X-Branch-ID")
	}
	if req.BranchID == "" {
		req.BranchID = "branch-default"
	}
	if req.AreaName == "" {
		req.AreaName = "Tầng 1"
	}
	if req.Capacity <= 0 {
		req.Capacity = 4
	}

	table := models.DiningTable{
		ID:        uuid.New().String(),
		TenantID:  req.TenantID,
		BranchID:  req.BranchID,
		AreaID:    req.AreaID,
		AreaName:  req.AreaName,
		Name:      req.Name,
		Capacity:  req.Capacity,
		Status:    "trong",
		CreatedAt: time.Now(),
	}

	if database.DB != nil {
		var maxSort int
		database.DB.Model(&models.DiningTable{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxSort)
		table.SortOrder = maxSort + 1
		if err := database.DB.Create(&table).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	websocket.GlobalHub.BroadcastToTenantBranch(table.TenantID, table.BranchID, "table_created", table)
	c.JSON(http.StatusCreated, gin.H{"data": table, "message": "Thêm bàn thành công"})
}

// UpdateTable cập nhật bàn
func UpdateTable(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name     string  `json:"name"`
		AreaID   *string `json:"area_id"`
		AreaName string  `json:"area_name"`
		Capacity int     `json:"capacity"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật bàn"})
		return
	}

	var table models.DiningTable
	if err := database.DB.First(&table, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy bàn"})
		return
	}

	if req.Name != "" {
		table.Name = req.Name
	}
	if req.AreaID != nil {
		table.AreaID = req.AreaID
	}
	if req.AreaName != "" {
		table.AreaName = req.AreaName
	}
	if req.Capacity > 0 {
		table.Capacity = req.Capacity
	}

	if err := database.DB.Save(&table).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenantBranch(table.TenantID, table.BranchID, "table_updated", table)
	c.JSON(http.StatusOK, gin.H{"data": table, "message": "Cập nhật bàn thành công"})
}

// DeleteTable xóa bàn
func DeleteTable(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã xóa bàn"})
		return
	}

	var table models.DiningTable
	if err := database.DB.First(&table, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy bàn"})
		return
	}

	if err := database.DB.Where("id = ?", id).Delete(&models.DiningTable{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenantBranch(table.TenantID, table.BranchID, "table_deleted", gin.H{"id": id})
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa bàn thành công"})
}

// ReorderTables sắp xếp lại thứ tự bàn
func ReorderTables(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant_ongchu")
	var req struct {
		TableIDs []string `json:"table_ids"`
		IDs      []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ids := req.TableIDs
	if len(ids) == 0 {
		ids = req.IDs
	}
	if len(ids) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Danh sách ID bàn không được để trống"})
		return
	}

	if database.DB != nil {
		_ = database.DB.Transaction(func(tx *gorm.DB) error {
			for i, tblID := range ids {
				tx.Model(&models.DiningTable{}).Where("id = ?", tblID).Update("sort_order", i+1)
			}
			return nil
		})
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "tables_reordered", ids)
	c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật thứ tự bàn"})
}

