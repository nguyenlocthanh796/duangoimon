package handler

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
)

// GetKDSOrders lấy danh sách các đơn hàng đang chờ hoặc đang chế biến cho màn hình Bếp / Bar
func GetKDSOrders(c *gin.Context) {
	station := c.Query("station") // bar, kitchen, snack
	tenantID := GetTenantID(c)
	branchID := c.Query("branch_id")

	if database.DB == nil {
		RespondSuccess(c, http.StatusOK, []models.Order{})
		return
	}

	var orders []models.Order
	query := database.DB.Preload("Items").Where("status = ?", "dang_xu_ly")
	query = ScopeTenant(query, tenantID)
	if branchID != "" {
		query = query.Where("branch_id = ?", branchID)
	}

	if err := query.Order("created_at ASC").Find(&orders).Error; err != nil {
		RespondError(c, http.StatusInternalServerError, fmt.Sprintf("Lỗi tải đơn KDS: %v", err))
		return
	}

	// Nếu có lọc theo station, lọc các item theo trạm
	if station != "" {
		filteredOrders := make([]models.Order, 0, len(orders))
		for _, o := range orders {
			stationItems := make([]models.OrderItem, 0)
			for _, it := range o.Items {
				if it.Station == station {
					stationItems = append(stationItems, it)
				}
			}
			if len(stationItems) > 0 {
				o.Items = stationItems
				filteredOrders = append(filteredOrders, o)
			}
		}
		c.JSON(http.StatusOK, filteredOrders)
		return
	}

	c.JSON(http.StatusOK, orders)
}

type UpdateKDSItemStatusRequest struct {
	Status string `json:"status" binding:"required"` // cho_che_bien, dang_che_bien, da_xong, da_phuc_vu
}

// UpdateKDSItemStatus cập nhật trạng thái chế biến của một món (cho_che_bien -> dang_che_bien -> da_xong -> da_phuc_vu)
func UpdateKDSItemStatus(c *gin.Context) {
	itemID := c.Param("id")
	var req UpdateKDSItemStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var item models.OrderItem
	if database.DB != nil {
		if err := database.DB.First(&item, "id = ?", itemID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy món ăn trong đơn"})
			return
		}

		item.KitchenStatus = req.Status
		if err := database.DB.Save(&item).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi cập nhật trạng thái: %v", err)})
			return
		}
	} else {
		item.ID = itemID
		item.KitchenStatus = req.Status
	}

	// WebSocket broadcast thông báo trạng thái mới tới các màn hình POS và KDS
	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":       "kds_item_updated",
		"item_id":    item.ID,
		"order_id":   item.OrderID,
		"station":    item.Station,
		"status":     req.Status,
	})
	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":       "kds_status_updated",
		"item_id":    item.ID,
		"order_id":   item.OrderID,
		"station":    item.Station,
		"status":     req.Status,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Cập nhật trạng thái món thành công",
		"item":    item,
	})
}

type UpdateKDSOrderStatusRequest struct {
	Status string `json:"status" binding:"required"` // cho_che_bien, dang_che_bien, da_xong, da_phuc_vu
}

// UpdateKDSOrderStatus cập nhật trạng thái chế biến của toàn bộ món trong đơn (Xong Hết / Báo Bưng)
func UpdateKDSOrderStatus(c *gin.Context) {
	orderID := c.Param("id")
	var req UpdateKDSOrderStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB != nil {
		var order models.Order
		if err := database.DB.First(&order, "id = ?", orderID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng"})
			return
		}

		if err := database.DB.Model(&models.OrderItem{}).Where("order_id = ?", orderID).Update("kitchen_status", req.Status).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi cập nhật: %v", err)})
			return
		}
	}

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":     "kds_order_updated",
		"order_id": orderID,
		"status":   req.Status,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":  "Đã cập nhật trạng thái chế biến toàn đơn",
		"order_id": orderID,
		"status":   req.Status,
	})
}

type GroupedKDSItem struct {
	ProductName   string  `json:"product_name"`
	Station       string  `json:"station"`
	TotalQuantity float64 `json:"total_quantity"`
	ModifierNames string  `json:"modifier_names"`
	KitchenStatus string  `json:"kitchen_status"`
}

// GetKDSGroupedItems gom các món giống nhau để đầu bếp / pha chế làm cùng một mẻ (Gom Món)
func GetKDSGroupedItems(c *gin.Context) {
	station := c.Query("station")
	tenantID := GetTenantID(c)

	if database.DB == nil {
		RespondSuccess(c, http.StatusOK, []GroupedKDSItem{})
		return
	}

	type Result struct {
		ProductName   string  `json:"product_name"`
		Station       string  `json:"station"`
		TotalQuantity float64 `json:"total_quantity"`
		ModifierNames string  `json:"modifier_names"`
		KitchenStatus string  `json:"kitchen_status"`
	}

	var results []Result
	query := database.DB.Table("order_items").
		Select("product_name, station, SUM(quantity) as total_quantity, modifier_names, kitchen_status").
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status = ? AND order_items.kitchen_status IN ?", "dang_xu_ly", []string{"cho_che_bien", "dang_che_bien"})

	query = ScopeTenant(query, tenantID, "orders.tenant_id")
	if station != "" {
		query = query.Where("order_items.station = ?", station)
	}

	if err := query.Group("product_name, station, modifier_names, kitchen_status").
		Order("total_quantity DESC").
		Scan(&results).Error; err != nil {
		RespondError(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, results)
}
