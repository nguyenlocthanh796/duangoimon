package handler

import (
	"encoding/json"
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

// GetCategories trả về danh sách các danh mục món ăn
func GetCategories(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant_ongchu")

	if database.DB == nil {
		c.JSON(http.StatusOK, []models.Category{})
		return
	}

	var categories []models.Category
	query := ScopeTenant(database.DB.Model(&models.Category{}), tenantID)

	if err := query.Order("sort_order ASC, name ASC").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tải danh mục: %v", err)})
		return
	}

	c.JSON(http.StatusOK, categories)
}

// GetProducts trả về danh sách món ăn kèm công thức định lượng
func GetProducts(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant_ongchu")
	categoryID := c.Query("category_id")
	station := c.Query("station")

	if database.DB == nil {
		c.JSON(http.StatusOK, []models.Product{})
		return
	}

	var products []models.Product
	query := ScopeTenant(database.DB.Preload("Recipes.Ingredient").Model(&models.Product{}), tenantID)
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}
	if station != "" {
		query = query.Where("station = ?", station)
	}

	if err := query.Order("sort_order ASC, name ASC").Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tải thực đơn: %v", err)})
		return
	}

	c.JSON(http.StatusOK, products)
}

type CreateProductRequest struct {
	ID           string                  `json:"id"`
	TenantID     string                  `json:"tenant_id"`
	CategoryID   *string                 `json:"category_id"`
	Code         string                  `json:"code"`
	Name         string                  `json:"name" binding:"required"`
	Unit         string                  `json:"unit"`
	CostPrice    float64                 `json:"cost_price"`
	SellingPrice float64                 `json:"selling_price" binding:"required"`
	ImageURL     string                  `json:"image_url"`
	Station      string                  `json:"station"` // bar, kitchen, snack
	IsCombo      bool                    `json:"is_combo"`
	ComboDetails string                  `json:"combo_details"`
	Sizes        []models.ModifierOption `json:"sizes"`
	Toppings     []models.ModifierOption `json:"toppings"`
	Recipes      []CreateRecipeItem      `json:"recipes"`
}

type CreateRecipeItem struct {
	IngredientID string  `json:"ingredient_id" binding:"required"`
	QuantityUsed float64 `json:"quantity_used" binding:"required"`
}

// CreateProduct tạo món ăn mới kèm công thức định lượng nguyên liệu
func CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.TenantID == "" {
		req.TenantID = GetTenantID(c, "tenant-default")
	}

	productID := req.ID
	if productID == "" {
		productID = uuid.New().String()
	}
	unit := req.Unit
	if unit == "" {
		unit = "Phần"
	}
	station := req.Station
	if station == "" {
		station = "bar"
	}

	var sizesJSON, toppingsJSON string
	if len(req.Sizes) > 0 {
		if b, err := json.Marshal(req.Sizes); err == nil {
			sizesJSON = string(b)
		}
	}
	if len(req.Toppings) > 0 {
		if b, err := json.Marshal(req.Toppings); err == nil {
			toppingsJSON = string(b)
		}
	}

	product := models.Product{
		ID:           productID,
		TenantID:     req.TenantID,
		CategoryID:   req.CategoryID,
		Code:         req.Code,
		Name:         req.Name,
		Unit:         unit,
		CostPrice:    req.CostPrice,
		SellingPrice: req.SellingPrice,
		ImageURL:     req.ImageURL,
		Station:      station,
		IsCombo:      req.IsCombo,
		ComboDetails: req.ComboDetails,
		SizesJSON:    sizesJSON,
		ToppingsJSON: toppingsJSON,
		IsActive:     true,
		IsOutOfStock: false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if database.DB != nil {
		err := database.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Create(&product).Error; err != nil {
				return err
			}

			for _, r := range req.Recipes {
				recipeItem := models.RecipeItem{
					ID:           uuid.New().String(),
					ProductID:    productID,
					IngredientID: r.IngredientID,
					QuantityUsed: r.QuantityUsed,
					CreatedAt:    time.Now(),
				}
				if err := tx.Create(&recipeItem).Error; err != nil {
					return err
				}
			}
			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tạo món ăn: %v", err)})
			return
		}
	}

	websocket.GlobalHub.BroadcastToTenant(product.TenantID, "product_created", product)
	c.JSON(http.StatusCreated, product)
}

// Toggle86 bật / tắt trạng thái hết món (86'd) tức thì
func Toggle86(c *gin.Context) {
	productID := c.Param("id")

	var product models.Product
	if database.DB != nil {
		if err := database.DB.First(&product, "id = ?", productID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy món ăn"})
			return
		}

		product.IsOutOfStock = !product.IsOutOfStock
		product.UpdatedAt = time.Now()
		if err := database.DB.Save(&product).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi cập nhật trạng thái món: %v", err)})
			return
		}
	} else {
		product.ID = productID
		product.IsOutOfStock = true
	}

	// Realtime broadcast cho đúng quán (Tenant)
	websocket.GlobalHub.BroadcastToTenant(product.TenantID, "product_86_toggled", gin.H{
		"product_id":      product.ID,
		"name":            product.Name,
		"is_out_of_stock": product.IsOutOfStock,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":         "Đã cập nhật trạng thái món",
		"product_id":      product.ID,
		"is_out_of_stock": product.IsOutOfStock,
	})
}

type UpdateProductPriceRequest struct {
	SellingPrice float64 `json:"selling_price" binding:"required"`
}

// UpdateProductPrice đổi giá bán nhanh trong 1 chạm
func UpdateProductPrice(c *gin.Context) {
	productID := c.Param("id")
	var req UpdateProductPriceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var product models.Product
	if database.DB != nil {
		if err := database.DB.First(&product, "id = ?", productID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy món ăn"})
			return
		}

		product.SellingPrice = req.SellingPrice
		product.UpdatedAt = time.Now()
		if err := database.DB.Save(&product).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi cập nhật giá: %v", err)})
			return
		}
	} else {
		product.ID = productID
		product.SellingPrice = req.SellingPrice
	}

	websocket.GlobalHub.BroadcastToTenant(product.TenantID, "product_price_updated", gin.H{
		"product_id":    product.ID,
		"selling_price": req.SellingPrice,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":       "Đổi giá thành công",
		"product_id":    product.ID,
		"selling_price": req.SellingPrice,
	})
}

// CreateCategory thêm danh mục mới
func CreateCategory(c *gin.Context) {
	var req struct {
		TenantID string `json:"tenant_id"`
		Name     string `json:"name" binding:"required"`
		Icon     string `json:"icon"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.TenantID == "" {
		req.TenantID = GetTenantID(c, "tenant-default")
	}
	if req.Icon == "" {
		req.Icon = "food-outline"
	}

	category := models.Category{
		ID:        uuid.New().String(),
		TenantID:  req.TenantID,
		Name:      req.Name,
		Icon:      req.Icon,
		IsActive:  true,
		CreatedAt: time.Now(),
	}

	if database.DB != nil {
		var maxSort int
		database.DB.Model(&models.Category{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxSort)
		category.SortOrder = maxSort + 1
		if err := database.DB.Create(&category).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	websocket.GlobalHub.BroadcastToTenant(category.TenantID, "category_created", category)
	c.JSON(http.StatusCreated, gin.H{"data": category, "message": "Thêm danh mục thành công"})
}

// UpdateCategory cập nhật danh mục
func UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name string `json:"name" binding:"required"`
		Icon string `json:"icon"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật danh mục"})
		return
	}

	var category models.Category
	if err := database.DB.First(&category, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy danh mục"})
		return
	}

	category.Name = req.Name
	if req.Icon != "" {
		category.Icon = req.Icon
	}
	if err := database.DB.Save(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(category.TenantID, "category_updated", category)
	c.JSON(http.StatusOK, gin.H{"data": category, "message": "Cập nhật danh mục thành công"})
}

// DeleteCategory xóa danh mục
func DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã xóa danh mục"})
		return
	}

	var category models.Category
	if err := database.DB.First(&category, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy danh mục"})
		return
	}

	if err := database.DB.Where("id = ?", id).Delete(&models.Category{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(category.TenantID, "category_deleted", gin.H{"id": id})
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa danh mục thành công"})
}

// ReorderCategories sắp xếp lại thứ tự danh mục
func ReorderCategories(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant_ongchu")
	var req struct {
		CategoryIDs []string `json:"category_ids"`
		IDs         []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ids := req.CategoryIDs
	if len(ids) == 0 {
		ids = req.IDs
	}
	if len(ids) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Danh sách ID danh mục không được để trống"})
		return
	}

	if database.DB != nil {
		_ = database.DB.Transaction(func(tx *gorm.DB) error {
			for i, catID := range ids {
				tx.Model(&models.Category{}).Where("id = ?", catID).Update("sort_order", i+1)
			}
			return nil
		})
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "categories_reordered", ids)
	c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật thứ tự danh mục"})
}

type UpdateProductRequest struct {
	Name         string                   `json:"name"`
	Code         string                   `json:"code"`
	CategoryID   *string                  `json:"category_id"`
	SellingPrice float64                  `json:"selling_price"`
	CostPrice    float64                  `json:"cost_price"`
	Unit         string                   `json:"unit"`
	Station      string                   `json:"station"`
	ImageURL     string                   `json:"image_url"`
	IsPinned     *bool                    `json:"is_pinned"`
	Sizes        *[]models.ModifierOption `json:"sizes"`
	Toppings     *[]models.ModifierOption `json:"toppings"`
}

// UpdateProduct cập nhật chi tiết món ăn
func UpdateProduct(c *gin.Context) {
	id := c.Param("id")
	var req UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật món"})
		return
	}

	var product models.Product
	if err := database.DB.First(&product, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy món"})
		return
	}

	if req.Name != "" {
		product.Name = req.Name
	}
	if req.Code != "" {
		product.Code = req.Code
	}
	if req.CategoryID != nil {
		product.CategoryID = req.CategoryID
	}
	if req.SellingPrice > 0 {
		product.SellingPrice = req.SellingPrice
	}
	if req.CostPrice >= 0 {
		product.CostPrice = req.CostPrice
	}
	if req.Unit != "" {
		product.Unit = req.Unit
	}
	if req.Station != "" {
		product.Station = req.Station
	}
	if req.ImageURL != "" {
		product.ImageURL = req.ImageURL
	}
	if req.IsPinned != nil {
		product.IsPinned = *req.IsPinned
	}
	if req.Sizes != nil {
		if b, err := json.Marshal(*req.Sizes); err == nil {
			product.SizesJSON = string(b)
		}
	}
	if req.Toppings != nil {
		if b, err := json.Marshal(*req.Toppings); err == nil {
			product.ToppingsJSON = string(b)
		}
	}
	product.UpdatedAt = time.Now()

	if err := database.DB.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(product.TenantID, "product_updated", product)
	c.JSON(http.StatusOK, gin.H{"data": product, "message": "Cập nhật món thành công"})
}

// DeleteProduct xóa món ăn
func DeleteProduct(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã xóa món"})
		return
	}

	var product models.Product
	if err := database.DB.First(&product, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy món"})
		return
	}

	if err := database.DB.Model(&models.Product{}).Where("id = ?", id).Update("is_active", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(product.TenantID, "product_deleted", gin.H{"id": id})
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa món ăn thành công"})
}

// ReorderProducts sắp xếp lại thứ tự món ăn
func ReorderProducts(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant_ongchu")
	var req struct {
		ProductIDs []string `json:"product_ids"`
		IDs        []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ids := req.ProductIDs
	if len(ids) == 0 {
		ids = req.IDs
	}
	if len(ids) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Danh sách ID món ăn không được để trống"})
		return
	}

	if database.DB != nil {
		_ = database.DB.Transaction(func(tx *gorm.DB) error {
			for i, prodID := range ids {
				tx.Model(&models.Product{}).Where("id = ?", prodID).Update("sort_order", i+1)
			}
			return nil
		})
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "products_reordered", ids)
	c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật thứ tự món ăn"})
}

// GetToppings danh sách topping
func GetToppings(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant_ongchu")

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"data": []models.Topping{}})
		return
	}

	var toppings []models.Topping
	query := ScopeTenant(database.DB.Where("is_active = ?", true).Model(&models.Topping{}), tenantID)
	if err := query.Order("sort_order asc, name asc").Find(&toppings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": toppings, "count": len(toppings)})
}

// CreateTopping thêm topping mới
func CreateTopping(c *gin.Context) {
	var req struct {
		TenantID   string  `json:"tenant_id"`
		Name       string  `json:"name" binding:"required"`
		PriceDelta float64 `json:"price_delta"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.TenantID == "" {
		req.TenantID = GetTenantID(c, "tenant-default")
	}

	topping := models.Topping{
		ID:         uuid.New().String(),
		TenantID:   req.TenantID,
		Name:       req.Name,
		PriceDelta: req.PriceDelta,
		IsActive:   true,
		CreatedAt:  time.Now(),
	}

	if database.DB != nil {
		var maxSort int
		database.DB.Model(&models.Topping{}).Select("COALESCE(MAX(sort_order), 0)").Scan(&maxSort)
		topping.SortOrder = maxSort + 1
		if err := database.DB.Create(&topping).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	websocket.GlobalHub.BroadcastToTenant(topping.TenantID, "topping_created", topping)
	c.JSON(http.StatusCreated, gin.H{"data": topping, "message": "Thêm topping thành công"})
}

// UpdateTopping cập nhật topping
func UpdateTopping(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Name       string  `json:"name" binding:"required"`
		PriceDelta float64 `json:"price_delta"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật topping"})
		return
	}

	var topping models.Topping
	if err := database.DB.First(&topping, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy topping"})
		return
	}

	topping.Name = req.Name
	topping.PriceDelta = req.PriceDelta
	if err := database.DB.Save(&topping).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(topping.TenantID, "topping_updated", topping)
	c.JSON(http.StatusOK, gin.H{"data": topping, "message": "Cập nhật topping thành công"})
}

// DeleteTopping xóa topping
func DeleteTopping(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Đã xóa topping"})
		return
	}

	var topping models.Topping
	if err := database.DB.First(&topping, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy topping"})
		return
	}

	if err := database.DB.Model(&models.Topping{}).Where("id = ?", id).Update("is_active", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(topping.TenantID, "topping_deleted", gin.H{"id": id})
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa topping thành công"})
}

// ReorderToppings sắp xếp lại thứ tự topping
func ReorderToppings(c *gin.Context) {
	tenantID := GetTenantID(c, "tenant_ongchu")
	var req struct {
		ToppingIDs []string `json:"topping_ids"`
		IDs        []string `json:"ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ids := req.ToppingIDs
	if len(ids) == 0 {
		ids = req.IDs
	}
	if len(ids) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Danh sách ID topping không được để trống"})
		return
	}

	if database.DB != nil {
		_ = database.DB.Transaction(func(tx *gorm.DB) error {
			for i, topID := range ids {
				tx.Model(&models.Topping{}).Where("id = ?", topID).Update("sort_order", i+1)
			}
			return nil
		})
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "toppings_reordered", ids)
	c.JSON(http.StatusOK, gin.H{"message": "Đã cập nhật thứ tự topping"})
}

