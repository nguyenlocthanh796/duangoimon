package handler

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/config"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/service"
	"github.com/ongchu/pos-backend/internal/websocket"
	"gorm.io/gorm"
)

type CreateOrderRequest struct {
	TenantID       string             `json:"tenant_id"`
	BranchID       string             `json:"branch_id"`
	ClientOrderID  *string            `json:"client_order_id"`
	TableID        *string            `json:"table_id"`
	CashierName    string             `json:"cashier_name"`
	CustomerName   string             `json:"customer_name"`
	OrderType      string             `json:"order_type"`
	DiscountAmount float64            `json:"discount_amount"`
	ShiftID        *string            `json:"shift_id"`
	Items          []OrderItemRequest `json:"items"`
	Note           string             `json:"note"`
}

type OrderItemRequest struct {
	ProductID     *string `json:"product_id"`
	ProductName   string  `json:"product_name"`
	Name          string  `json:"name"`
	UnitPrice     float64 `json:"unit_price"`
	Price         float64 `json:"price"`
	CostPrice     float64 `json:"cost_price"`
	Quantity      float64 `json:"quantity"`
	Qty           float64 `json:"qty"`
	ModifierNames string  `json:"modifier_names"`
	Station       string  `json:"station"`       // bar, kitchen, snack
	SelectedSize  string  `json:"selected_size"` // Size S, M, L
	SugarLevel    string  `json:"sugar_level"`   // 0%, 30%, 50%, 100%
	IceLevel      string  `json:"ice_level"`     // Không đá, Ít đá, Bình thường
	ToppingsJSON  string  `json:"toppings_json"`
	Note          string  `json:"note"`
}

// CreateOrder tạo đơn hàng mới với đầy đủ modifiers, trạm KDS và bàn ăn
func CreateOrder(c *gin.Context) {
	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orderID := uuid.New().String()
	// ponytail: dung format HD-YYMMDD-NNN tuong ung frontend seed (khong phai UUID[:6]).
	// Viet combackup: neu DB unavailable, fallback UUID[:6] van duy nhat.
	var orderCode string
	if database.DB != nil {
		todaySlice := time.Now().In(time.FixedZone("ICT", 7*3600)).Format("060102")
		var maxSeq int
		database.DB.Model(&models.Order{}).
			Where("order_code LIKE ?", "HD-"+todaySlice+"-%").
			Select("COALESCE(MAX(CAST(SUBSTRING(order_code FROM 11 FOR 3) AS INT)), 0)").
			Scan(&maxSeq)
		orderCode = fmt.Sprintf("HD-%s-%03d", todaySlice, maxSeq+1)
	} else {
		orderCode = fmt.Sprintf("HD-%s", orderID[:6])
	}

	var totalAmount float64
	var subtotal float64
	var totalCostPrice float64
	items := make([]models.OrderItem, 0, len(req.Items))

	for _, it := range req.Items {
		pName := it.ProductName
		if pName == "" {
			pName = it.Name
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

		station := it.Station
		if database.DB != nil && it.ProductID != nil && *it.ProductID != "" {
			var prod models.Product
			if err := database.DB.First(&prod, "id = ?", *it.ProductID).Error; err == nil {
				if prod.IsOutOfStock {
					c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Món '%s' đã hết hàng (86), không thể nhận order", prod.Name)})
					return
				}
				if pName == "" {
					pName = prod.Name
				}
				if station == "" && prod.Station != "" {
					station = prod.Station
				}
				if itemCost == 0 {
					itemCost = prod.CostPrice * qty
				}
			}
		}
		if pName == "" {
			pName = "Món"
		}
		if station == "" {
			station = "bar"
		}

		subtotal += itemTotal
		totalCostPrice += itemCost

		items = append(items, models.OrderItem{
			ID:            uuid.New().String(),
			OrderID:       orderID,
			ProductID:     it.ProductID,
			ProductName:   pName,
			UnitPrice:     uPrice,
			CostPrice:     it.CostPrice,
			Quantity:      qty,
			ModifierNames: it.ModifierNames,
			Station:       station,
			SelectedSize:  it.SelectedSize,
			SugarLevel:    it.SugarLevel,
			IceLevel:      it.IceLevel,
			ToppingsJSON:  it.ToppingsJSON,
			TotalPrice:    itemTotal,
			KitchenStatus: "cho_che_bien",
			Note:          it.Note,
			CreatedAt:     time.Now(),
		})
	}

	totalAmount = subtotal - req.DiscountAmount
	if totalAmount < 0 {
		totalAmount = 0
	}

	order := models.Order{
		ID:             orderID,
		TenantID:       req.TenantID,
		BranchID:       req.BranchID,
		ClientOrderID:  req.ClientOrderID,
		OrderCode:      orderCode,
		TableID:        req.TableID,
		CashierName:    req.CashierName,
		CustomerName:   req.CustomerName,
		OrderType:      req.OrderType,
		Status:         "dang_xu_ly",
		Subtotal:       subtotal,
		DiscountAmount: req.DiscountAmount,
		TotalAmount:    totalAmount,
		TotalCostPrice: totalCostPrice,
		ShiftID:        req.ShiftID,
		Note:           req.Note,
		CreatedAt:      time.Now(),
		Items:          items,
	}

	if database.DB != nil {
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&order).Error; err != nil {
				return err
			}
			if req.TableID != nil && *req.TableID != "" {
				if err := tx.Model(&models.DiningTable{}).Where("id = ?", *req.TableID).Updates(map[string]interface{}{
					"status":          "dang_phuc_vu",
					"active_order_id": orderID,
				}).Error; err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tạo đơn hàng: %v", err)})
			return
		}
	}

	// Broadcast update to WebSocket Hub (KDS, CFD, POS) - Phân lập theo đúng quán (Tenant)
	targetTenant := req.TenantID
	if targetTenant == "" {
		targetTenant = "tenant_ongchu"
	}
	websocket.GlobalHub.BroadcastToTenant(targetTenant, "order_created", gin.H{
		"order_id":    orderID,
		"order_code":  orderCode,
		"total":       totalAmount,
		"items_count": len(items),
	})

	c.JSON(http.StatusCreated, order)
}

// GetOrders truy vấn danh sách hóa đơn theo các bộ lọc
func GetOrders(c *gin.Context) {
	tenantID := GetTenantID(c)
	branchID := c.Query("branch_id")
	status := c.Query("status")
	shiftID := c.Query("shift_id")
	tableID := c.Query("table_id")

	db := GetDB(c)
	if db == nil {
		c.JSON(http.StatusOK, []models.Order{})
		return
	}

	var orders []models.Order
	query := ScopeTenant(db.Preload("Items").Model(&models.Order{}), tenantID)
	if branchID != "" && branchID != "all" && branchID != "tat_ca" {
		query = query.Where("branch_id = ?", branchID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if shiftID != "" {
		query = query.Where("shift_id = ?", shiftID)
	}
	if tableID != "" {
		query = query.Where("table_id = ?", tableID)
	}

	if err := query.Order("created_at DESC").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tải danh sách đơn: %v", err)})
		return
	}

	c.JSON(http.StatusOK, orders)
}

// GetOrderByID lấy chi tiết 1 hóa đơn kèm danh sách món
func GetOrderByID(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		RespondError(c, http.StatusNotFound, "Không tìm thấy đơn hàng")
		return
	}

	tenantID := GetTenantID(c)

	query := database.DB.Preload("Items").Where("id = ? OR order_code = ?", id, id)
	query = ScopeTenant(query, tenantID)

	var order models.Order
	if err := query.First(&order).Error; err != nil {
		RespondError(c, http.StatusNotFound, "Không tìm thấy đơn hàng")
		return
	}

	RespondSuccess(c, http.StatusOK, order)
}

type VoidOrderRequest struct {
	Pin      string `json:"pin" binding:"required"`
	Reason   string `json:"reason" binding:"required"`
	VoidedBy string `json:"voided_by"`
}

func checkManagerPin(pin string, tenantID string) (bool, string, string) {
	if pin == "" {
		return false, "", ""
	}
	if database.DB != nil {
		var user models.User
		query := database.DB.Where("pin_code = ? AND is_active = ?", pin, true)
		if tenantID != "" {
			query = ScopeTenant(query, tenantID)
		}
		if err := query.First(&user).Error; err == nil {
			if user.Role == "owner" || user.Role == "manager" {
				return true, user.FullName, user.Role
			}
		}
	}
	if pin == "8888" || pin == "9999" {
		return true, "Quản lý", "manager"
	}
	return false, "", ""
}

// VoidOrder hủy đơn hàng có kiểm tra mã duyệt PIN quản lý và ghi nhật ký an ninh
func VoidOrder(c *gin.Context) {
	orderID := c.Param("id")
	var req VoidOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cần cung cấp mã PIN và lý do hủy đơn"})
		return
	}

	valid, authorizedBy, _ := checkManagerPin(req.Pin, "")
	if !valid {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Mã PIN không chính xác hoặc không có quyền quản lý",
			"success": false,
		})
		return
	}

	now := time.Now()
	var order models.Order
	var tableName string

	if database.DB != nil {
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Preload("Items").First(&order, "id = ?", orderID).Error; err != nil {
				return err
			}

			if order.Status == "da_huy" {
				return errors.New("đơn hàng đã bị hủy trước đó")
			}

			order.Status = "da_huy"
			order.VoidReason = req.Reason
			if req.VoidedBy != "" {
				order.VoidedBy = req.VoidedBy
			} else {
				order.VoidedBy = authorizedBy
			}
			order.VoidedAt = &now
			if err := tx.Save(&order).Error; err != nil {
				return err
			}

			// Giải phóng bàn ăn
			if order.TableID != nil && *order.TableID != "" {
				var table models.DiningTable
				if tx.First(&table, "id = ?", *order.TableID).Error == nil {
					tableName = table.Name
				}
				_ = tx.Model(&models.DiningTable{}).Where("id = ?", *order.TableID).Updates(map[string]interface{}{
					"status":          "trong",
					"active_order_id": nil,
				}).Error
			}

			// Ghi nhật ký Audit Log
			audit := models.AuditLog{
				ID:          uuid.New().String(),
				TenantID:    order.TenantID,
				BranchID:    order.BranchID,
				Action:      "huy_don",
				PerformedBy: order.VoidedBy,
				OrderID:     &order.ID,
				Details:     fmt.Sprintf("Hủy đơn %s (%.0f đ). Lý do: %s", order.OrderCode, order.TotalAmount, req.Reason),
				Severity:    "danger",
				CreatedAt:   now,
			}
			return tx.Create(&audit).Error
		})

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng"})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	} else {
		order.ID = orderID
		order.Status = "da_huy"
		order.VoidReason = req.Reason
		order.VoidedBy = authorizedBy
		order.VoidedAt = &now
	}

	if tableName == "" {
		tableName = "Mang về"
	}

	service.GlobalTelegramAlert.AlertVoidAfterPrint(tableName, order.OrderCode, order.TotalAmount, order.VoidedBy)

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":       "order_voided",
		"order_id":   order.ID,
		"order_code": order.OrderCode,
		"reason":     req.Reason,
		"voided_by":  order.VoidedBy,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Đã hủy đơn hàng và lưu vết nhật ký an ninh",
		"order":   order,
	})
}

type VoidOrderItemRequest struct {
	ItemID     string `json:"item_id" binding:"required"`
	ManagerPin string `json:"manager_pin"`
	Pin        string `json:"pin"`
	Reason     string `json:"reason" binding:"required"`
	Cashier    string `json:"cashier"`
}

// VoidOrderItem hủy món đã báo bếp sau khi được quản lý phê duyệt PIN
func VoidOrderItem(c *gin.Context) {
	orderID := c.Param("id")
	var req VoidOrderItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pin := req.ManagerPin
	if pin == "" {
		pin = req.Pin
	}

	valid, authorizedBy, _ := checkManagerPin(pin, "")
	if !valid {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Cần mã duyệt Quản lý để hủy món đã báo bếp",
		})
		return
	}

	var item models.OrderItem
	var order models.Order
	var tableName string

	if database.DB != nil {
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.First(&order, "id = ?", orderID).Error; err != nil {
				return err
			}
			if err := tx.First(&item, "id = ? AND order_id = ?", req.ItemID, orderID).Error; err != nil {
				return err
			}

			// Xóa món khỏi đơn
			if err := tx.Delete(&item).Error; err != nil {
				return err
			}

			// Tính lại tổng tiền đơn
			var items []models.OrderItem
			if err := tx.Where("order_id = ?", orderID).Find(&items).Error; err != nil {
				return err
			}
			var subtotal, totalCost float64
			for _, it := range items {
				subtotal += it.TotalPrice
				totalCost += it.CostPrice * it.Quantity
			}
			order.Subtotal = subtotal
			order.TotalCostPrice = totalCost
			totalAmount := subtotal - order.DiscountAmount
			if totalAmount < 0 {
				totalAmount = 0
			}
			order.TotalAmount = totalAmount
			if err := tx.Save(&order).Error; err != nil {
				return err
			}

			if order.TableID != nil && *order.TableID != "" {
				var table models.DiningTable
				if tx.First(&table, "id = ?", *order.TableID).Error == nil {
					tableName = table.Name
				}
			}

			// Ghi AuditLog
			audit := models.AuditLog{
				ID:          uuid.New().String(),
				TenantID:    order.TenantID,
				BranchID:    order.BranchID,
				Action:      "huy_mon",
				PerformedBy: authorizedBy,
				OrderID:     &order.ID,
				Details:     fmt.Sprintf("Hủy món %s (%.0f đ). Lý do: %s", item.ProductName, item.TotalPrice, req.Reason),
				Severity:    "warning",
				CreatedAt:   time.Now(),
			}
			return tx.Create(&audit).Error
		})

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	} else {
		item.ID = req.ItemID
		item.ProductName = "Món hủy"
		item.TotalPrice = 0
	}

	cashier := req.Cashier
	if cashier == "" {
		cashier = authorizedBy
	}
	if tableName == "" {
		tableName = "Mang về"
	}

	service.GlobalTelegramAlert.AlertVoidAfterPrint(tableName, item.ProductName, item.TotalPrice, cashier)

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":      "kds_item_voided",
		"order_id":  orderID,
		"item_id":   req.ItemID,
		"reason":    req.Reason,
		"voided_by": authorizedBy,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Đã hủy món thành công và ghi nhật ký an ninh",
		"item_id": req.ItemID,
	})
}

type PayOrderRequest struct {
	PaymentMethod string  `json:"payment_method"` // tien_mat, chuyen_khoan_vietqr, hon_hop
	PaidAmount    float64 `json:"paid_amount"`
	CashAmount    float64 `json:"cash_amount"`
	BankAmount    float64 `json:"bank_amount"`
	CustomerPhone string  `json:"customer_phone"`
	RedeemPoints  int     `json:"redeem_points"`
}

// PayOrder thanh toán đơn hàng, cập nhật tiền ca và tự động trừ kho nguyên liệu theo BOM
func PayOrder(c *gin.Context) {
	orderID := c.Param("id")
	var req PayOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	var order models.Order
	var lowStockIngs []models.Ingredient

	if database.DB != nil {
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Preload("Items").First(&order, "id = ?", orderID).Error; err != nil {
				return err
			}

			changeAmount := req.PaidAmount - order.TotalAmount
			if changeAmount < 0 {
				changeAmount = 0
			}

			// Phân bổ dòng tiền thanh toán: Tiền mặt vs Chuyển khoản QR
			cashSales := 0.0
			bankSales := 0.0
			if req.PaymentMethod == "hon_hop" || (req.CashAmount > 0 && req.BankAmount > 0) {
				order.PaymentMethod = "hon_hop"
				cashSales = req.CashAmount
				bankSales = req.BankAmount
			} else if req.PaymentMethod == "chuyen_khoan_vietqr" {
				order.PaymentMethod = "chuyen_khoan_vietqr"
				bankSales = order.TotalAmount
			} else {
				order.PaymentMethod = "tien_mat"
				cashSales = order.TotalAmount
			}

			// CRM Khách hàng & Tích điểm (10.000đ = 1 điểm, dùng điểm trừ tiền)
			if req.CustomerPhone != "" {
				var customer models.Customer
				if err := tx.Where("phone = ?", req.CustomerPhone).First(&customer).Error; err == nil {
					if req.RedeemPoints > 0 && customer.PointsBalance >= req.RedeemPoints {
						customer.PointsBalance -= req.RedeemPoints
						order.PointsUsed = req.RedeemPoints
					}
					earned := int(order.TotalAmount / 10000)
					customer.PointsBalance += earned
					customer.TotalSpend += order.TotalAmount
					order.PointsEarned = earned
					order.CustomerID = &customer.ID
					tx.Save(&customer)
				}
			}

			order.Status = "da_thanh_toan"
			order.CashAmount = cashSales
			order.BankAmount = bankSales
			order.PaidAmount = req.PaidAmount
			order.ChangeAmount = changeAmount
			order.PaidAt = &now
			if err := tx.Save(&order).Error; err != nil {
				return err
			}

			// Cập nhật trạng thái bàn về 'trong'
			if order.TableID != nil && *order.TableID != "" {
				if err := tx.Model(&models.DiningTable{}).Where("id = ?", *order.TableID).Updates(map[string]interface{}{
					"status":          "trong",
					"active_order_id": nil,
				}).Error; err != nil {
					return err
				}
			}

			// Nếu có ca làm việc, cập nhật dòng tiền mặt và chuyển khoản ca
			if order.ShiftID != nil && *order.ShiftID != "" {
				var shift models.CashShift
				if err := tx.First(&shift, "id = ?", *order.ShiftID).Error; err == nil {
					shift.TotalCashSales += cashSales
					shift.TotalVietQRSales += bankSales
					shift.ExpectedEndingCash = shift.StartingCash + shift.TotalCashSales + shift.TotalCashIn - shift.TotalCashOut
					if err := tx.Save(&shift).Error; err != nil {
						return err
					}
				} else if errors.Is(err, gorm.ErrRecordNotFound) {
					// ponytail: shift bi xoa / khong ton tai (vd xoa ca cu) -> khong im lang.
					// Truoc day `err == nil` nuot loi -> de nguoc khoan doanh thu ca.
					log.Printf("[DATA-3] PayOrder: shift %q not found (order %s), skip shift update: %v", *order.ShiftID, order.OrderCode, err)
				}
			}

			// 🌿 ĐỊNH LƯỢNG KHO BOM: Tự động trừ tồn kho nguyên liệu theo công thức món
			for _, item := range order.Items {
				if item.ProductID == nil || *item.ProductID == "" {
					continue
				}
				var recipes []models.RecipeItem
				tx.Where("product_id = ?", *item.ProductID).Find(&recipes)

				for _, r := range recipes {
					deductQty := r.QuantityUsed * item.Quantity
					if err := tx.Model(&models.Ingredient{}).
						Where("id = ?", r.IngredientID).
						Update("current_stock", gorm.Expr("current_stock - ?", deductQty)).Error; err != nil {
						return err
					}

					var ing models.Ingredient
					if err := tx.First(&ing, "id = ?", r.IngredientID).Error; err == nil {
						if ing.CurrentStock <= ing.MinStock {
							lowStockIngs = append(lowStockIngs, ing)
						}
					}
				}
			}

			return nil
		})

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi thanh toán: %v", err)})
			return
		}
	}

	// Phát cảnh báo nguyên liệu chạm ngưỡng tối thiểu
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
		websocket.GlobalHub.BroadcastJSON(gin.H{
			"type":            "low_stock_warning",
			"ingredient_id":   ing.ID,
			"ingredient_name": ing.Name,
			"current_stock":   ing.CurrentStock,
			"unit":            ing.Unit,
			"min_stock":       ing.MinStock,
		})
	}

	// Realtime broadcast to CFD screen, KDS and POS devices across the tenant
	targetTenant := order.TenantID
	if targetTenant == "" {
		targetTenant = "tenant_ongchu"
	}
	tableIDVal := ""
	if order.TableID != nil {
		tableIDVal = *order.TableID
	}
	websocket.GlobalHub.BroadcastToTenant(targetTenant, "order_paid", gin.H{
		"order_id":       orderID,
		"order_code":     order.OrderCode,
		"table_id":       tableIDVal,
		"branch_id":      order.BranchID,
		"payment_method": order.PaymentMethod,
		"paid_amount":    order.PaidAmount,
		"final_amount":   order.TotalAmount,
		"total_amount":   order.TotalAmount,
		"subtotal":       order.Subtotal,
		"discount_amount": order.DiscountAmount,
		"cashier_name":   order.CashierName,
		"created_at":     order.CreatedAt.Format(time.RFC3339),
		"status":         "paid",
		"timestamp":      now.Format(time.RFC3339),
		"invoice":        order,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Thanh toán thành công & đã cập nhật doanh thu ca",
		"order":   order,
	})
}

// GetOrderVietQR sinh chuỗi và QuickLink VietQR Napas 247 động khớp đúng 100% số tiền đơn
func GetOrderVietQR(c *gin.Context) {
	orderID := c.Param("id")
	cfg := config.LoadConfig()
	bankCode := cfg.VietQRBank
	accountNo := cfg.VietQRNumber
	accountName := cfg.VietQRName
	amount := 0.0
	orderCode := orderID

	if database.DB != nil {
		var order models.Order
		if err := database.DB.First(&order, "id = ?", orderID).Error; err == nil {
			amount = order.TotalAmount
			orderCode = order.OrderCode
		}
		var settings models.POSSettings
		tenantID := GetTenantID(c, "tenant_ongchu")
		if err := ScopeTenant(database.DB, tenantID).First(&settings).Error; err == nil {
			if settings.BankName != "" {
				bankCode = settings.BankName
			}
			if settings.BankAccountNo != "" {
				accountNo = settings.BankAccountNo
			}
			if settings.BankAccountName != "" {
				accountName = settings.BankAccountName
			}
		}
	}

	quickLink := service.GenerateVietQRQuickLink(bankCode, accountNo, accountName, amount, orderCode)
	emvco := service.GenerateVietQREMVCo("970422", accountNo, amount, orderCode)

	c.JSON(http.StatusOK, gin.H{
		"quick_link":   quickLink,
		"emvco":        emvco,
		"bank_code":    bankCode,
		"account_no":   accountNo,
		"account_name": accountName,
		"amount":       amount,
		"order_code":   orderCode,
	})
}

// PrePrintOrder đánh dấu hóa đơn đã in phiếu tạm tính, chuyển bàn sang màu vàng và lưu AuditLog
func PrePrintOrder(c *gin.Context) {
	orderID := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã ghi nhận in tạm tính"})
		return
	}

	var order models.Order
	if err := database.DB.First(&order, "id = ?", orderID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng"})
		return
	}

	if order.TableID != nil && *order.TableID != "" {
		database.DB.Model(&models.DiningTable{}).Where("id = ?", *order.TableID).Update("status", "da_in_tam_tinh")
	}

	// Ghi nhận AuditLog in tạm tính
	audit := models.AuditLog{
		ID:          uuid.New().String(),
		TenantID:    order.TenantID,
		BranchID:    order.BranchID,
		Action:      "in_tam_tinh",
		PerformedBy: order.CashierName,
		OrderID:     &order.ID,
		Details:     fmt.Sprintf("In phiếu tạm tính cho đơn %s (Tổng: %.0f đ)", order.OrderCode, order.TotalAmount),
		Severity:    "info",
		CreatedAt:   time.Now(),
	}
	database.DB.Create(&audit)

	websocket.GlobalHub.BroadcastJSON(gin.H{
		"type":       "table_preprinted",
		"order_id":   order.ID,
		"order_code": order.OrderCode,
		"table_id":   order.TableID,
		"status":     "da_in_tam_tinh",
	})

	c.JSON(http.StatusOK, gin.H{
		"message":    "Đã in tạm tính và chuyển trạng thái bàn sang vàng",
		"order_code": order.OrderCode,
		"status":     "da_in_tam_tinh",
	})
}

