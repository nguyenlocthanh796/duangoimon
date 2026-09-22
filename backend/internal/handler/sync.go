package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/service"
	"github.com/ongchu/pos-backend/internal/websocket"
	"gorm.io/gorm"
)

type SyncOrdersRequest struct {
	Orders []SyncOrderPayload `json:"orders" binding:"required"`
}

type SyncOrderPayload struct {
	ClientOrderID  string             `json:"client_order_id"`
	IdempotencyKey string             `json:"idempotency_key"` // Fallback alias
	TenantID       string             `json:"tenant_id"`
	BranchID       string             `json:"branch_id"`
	OrderCode      string             `json:"order_code"`
	TableID        *string            `json:"table_id"`
	CashierName    string             `json:"cashier_name"`
	CustomerName   string             `json:"customer_name"`
	OrderType      string             `json:"order_type"`
	Status         string             `json:"status"` // dang_xu_ly, da_thanh_toan
	Subtotal       float64            `json:"subtotal"`
	DiscountAmount float64            `json:"discount_amount"`
	TotalAmount    float64            `json:"total_amount"`
	PaymentMethod  string             `json:"payment_method"` // tien_mat, chuyen_khoan_vietqr
	PaidAmount     float64            `json:"paid_amount"`
	ShiftID        *string            `json:"shift_id"`
	CreatedAt      *time.Time         `json:"created_at"`
	Items          []OrderItemRequest `json:"items"`
	Note           string             `json:"note"`
}

type SyncOrderResult struct {
	ClientOrderID string `json:"client_order_id"`
	ServerOrderID string `json:"server_order_id"`
	Status        string `json:"status"` // synced, duplicate, error
}

// SyncOrders tiếp nhận lô đơn hàng tạo ngoại tuyến từ client khi có mạng trở lại, đảm bảo Idempotency không trùng lặp
func SyncOrders(c *gin.Context) {
	var req SyncOrdersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := GetTenantID(c)
	db := GetDB(c)

	syncedCount := 0
	duplicateCount := 0
	results := make([]SyncOrderResult, 0, len(req.Orders))

	for _, ord := range req.Orders {
		if ord.TenantID == "" {
			ord.TenantID = tenantID
		}
		clientKey := ord.ClientOrderID
		if clientKey == "" {
			clientKey = ord.IdempotencyKey
		}
		if clientKey == "" {
			clientKey = uuid.New().String()
		}

		if db == nil {
			// In-memory or dummy sync
			syncedCount++
			results = append(results, SyncOrderResult{
				ClientOrderID: clientKey,
				ServerOrderID: uuid.New().String(),
				Status:        "synced",
			})
			continue
		}

		// 1. Kiểm tra Idempotency: đơn hàng đã được đồng bộ trước đó chưa?
		var existingOrder models.Order
		if err := db.Where("client_order_id = ?", clientKey).First(&existingOrder).Error; err == nil {
			// Đơn đã tồn tại -> Bỏ qua không chèn lại
			duplicateCount++
			results = append(results, SyncOrderResult{
				ClientOrderID: clientKey,
				ServerOrderID: existingOrder.ID,
				Status:        "duplicate",
			})
			continue
		}

		// 2. Chèn mới đơn hàng trong Transaction ACID
		serverOrderID := uuid.New().String()
		orderCode := ord.OrderCode
		if orderCode == "" {
			orderCode = fmt.Sprintf("HD-%s", serverOrderID[:6])
		}

		createdAt := time.Now()
		if ord.CreatedAt != nil {
			createdAt = *ord.CreatedAt
		}

		orderStatus := ord.Status
		if orderStatus == "" {
			orderStatus = "da_thanh_toan"
		}

		var subtotal float64
		var totalCost float64
		items := make([]models.OrderItem, 0, len(ord.Items))

		for _, it := range ord.Items {
			pName := it.ProductName
			if pName == "" {
				pName = it.Name
			}
			if pName == "" && it.ProductID != nil && *it.ProductID != "" {
				var prod models.Product
				if err := db.First(&prod, "id = ?", *it.ProductID).Error; err == nil && prod.Name != "" {
					pName = prod.Name
				}
			}
			if pName == "" {
				pName = "Món ăn / Đồ uống"
			}

			uPrice := it.UnitPrice
			if uPrice == 0 && it.Price > 0 {
				uPrice = it.Price
			}
			qty := it.Quantity
			if qty == 0 && it.Qty > 0 {
				qty = it.Qty
			}
			if qty <= 0 {
				qty = 1
			}

			itemTotal := uPrice * qty
			itemCost := it.CostPrice * qty
			subtotal += itemTotal
			totalCost += itemCost

			items = append(items, models.OrderItem{
				ID:            uuid.New().String(),
				OrderID:       serverOrderID,
				ProductID:     it.ProductID,
				ProductName:   pName,
				UnitPrice:     uPrice,
				CostPrice:     it.CostPrice,
				Quantity:      qty,
				ModifierNames: it.ModifierNames,
				TotalPrice:    itemTotal,
				KitchenStatus: "da_phuc_vu",
				Note:          it.Note,
				CreatedAt:     createdAt,
			})
		}

		totalAmount := ord.TotalAmount
		if totalAmount <= 0 {
			totalAmount = subtotal - ord.DiscountAmount
			if totalAmount < 0 {
				totalAmount = 0
			}
		}

		newOrder := models.Order{
			ID:             serverOrderID,
			TenantID:       ord.TenantID,
			BranchID:       ord.BranchID,
			ClientOrderID:  &clientKey,
			OrderCode:      orderCode,
			TableID:        ord.TableID,
			CashierName:    ord.CashierName,
			CustomerName:   ord.CustomerName,
			OrderType:      ord.OrderType,
			Status:         orderStatus,
			Subtotal:       subtotal,
			DiscountAmount: ord.DiscountAmount,
			TotalAmount:    totalAmount,
			TotalCostPrice: totalCost,
			PaymentMethod:  ord.PaymentMethod,
			PaidAmount:     ord.PaidAmount,
			ShiftID:        ord.ShiftID,
			Note:           ord.Note,
			CreatedAt:      createdAt,
			Items:          items,
		}

		var lowStockIngs []models.Ingredient

		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&newOrder).Error; err != nil {
				return err
			}

			// Nếu đơn đã thanh toán: Cập nhật dòng tiền ca và trừ kho BOM
			if orderStatus == "da_thanh_toan" {
				// Cập nhật ca
				if ord.ShiftID != nil && *ord.ShiftID != "" {
					var shift models.CashShift
					if err := tx.First(&shift, "id = ?", *ord.ShiftID).Error; err == nil {
						if ord.PaymentMethod == "tien_mat" {
							shift.TotalCashSales += totalAmount
						} else {
							shift.TotalVietQRSales += totalAmount
						}
						shift.ExpectedEndingCash = shift.StartingCash + shift.TotalCashSales + shift.TotalCashIn - shift.TotalCashOut
						_ = tx.Save(&shift).Error
					}
				}

				// Trừ kho nguyên liệu BOM
				for _, it := range items {
					if it.ProductID == nil || *it.ProductID == "" {
						continue
					}
					var recipes []models.RecipeItem
					tx.Where("product_id = ?", *it.ProductID).Find(&recipes)
					for _, r := range recipes {
						deductQty := r.QuantityUsed * it.Quantity
						tx.Model(&models.Ingredient{}).
							Where("id = ?", r.IngredientID).
							Update("current_stock", gorm.Expr("current_stock - ?", deductQty))

						var ing models.Ingredient
						if tx.First(&ing, "id = ?", r.IngredientID).Error == nil {
							if ing.CurrentStock <= ing.MinStock {
								lowStockIngs = append(lowStockIngs, ing)
							}
						}
					}
				}
			}

			return nil
		})

		if err != nil {
			results = append(results, SyncOrderResult{
				ClientOrderID: clientKey,
				Status:        "error",
			})
			continue
		}

		// Cảnh báo tồn kho nếu có
		for _, ing := range lowStockIngs {
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

		syncedCount++
		results = append(results, SyncOrderResult{
			ClientOrderID: clientKey,
			ServerOrderID: serverOrderID,
			Status:        "synced",
		})
	}

	if syncedCount > 0 {
		websocket.GlobalHub.BroadcastToTenant(tenantID, "orders_synced", gin.H{
			"synced_count": syncedCount,
			"timestamp":    time.Now().Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"synced":          syncedCount,
		"duplicates":      duplicateCount,
		"synced_count":    syncedCount,
		"duplicate_count": duplicateCount,
		"results":         results,
	})
}
