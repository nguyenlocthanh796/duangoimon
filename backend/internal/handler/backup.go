package handler

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
	"gorm.io/gorm"
)

type RestoreCategoryPayload struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Icon         string `json:"icon"`
	DisplayOrder int    `json:"displayOrder"`
}

type RestoreProductPayload struct {
	ID        string  `json:"id"`
	Code      string  `json:"code"`
	Name      string  `json:"name"`
	Price     float64 `json:"price"`
	CostPrice float64 `json:"costPrice"`
	Unit      string  `json:"unit"`
	Station   string  `json:"station"`
	Category  string  `json:"category"`
	Image     string  `json:"image"`
}

type RestoreTablePayload struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Area     string `json:"area"`
	Capacity int    `json:"capacity"`
	Status   string `json:"status"`
}

type RestoreAreaPayload struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DisplayOrder int    `json:"displayOrder"`
}

type RestoreBackupRequest struct {
	TenantID         string                   `json:"tenantId"`
	Confirm          bool                     `json:"confirm"`
	ConfirmOverwrite bool                     `json:"confirm_overwrite"`
	Categories       []RestoreCategoryPayload `json:"categories"`
	MenuItems        []RestoreProductPayload  `json:"menuItems"`
	Tables           []RestoreTablePayload    `json:"tables"`
	Areas            []RestoreAreaPayload     `json:"areas"`
	StoreSettings    map[string]interface{}   `json:"storeSettings"`
}

// RestoreBackup tiếp nhận bản sao lưu JSON từ client và đồng bộ toàn diện vào CSDL (Owner only + Step-up confirmation)
func RestoreBackup(c *gin.Context) {
	var req RestoreBackupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu JSON không hợp lệ: " + err.Error()})
		return
	}

	if !req.Confirm && !req.ConfirmOverwrite {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Tác vụ ghi đè toàn bộ dữ liệu quán yêu cầu xác nhận rõ ràng (confirm: true)",
			"code":  "CONFIRMATION_REQUIRED",
		})
		return
	}

	authTenant := GetTenantID(c)
	userRole := c.GetString("role")
	userName := c.GetString("username")

	tenantID := authTenant
	if req.TenantID != "" && req.TenantID != authTenant && userRole != "superadmin" && userRole != "saas_admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Không được phép phục hồi dữ liệu cho quán khác",
			"code":  "CROSS_TENANT_FORBIDDEN",
		})
		return
	}

	db := database.DB
	if db == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Cơ sở dữ liệu chưa sẵn sàng"})
		return
	}

	branchID := "branch-default"
	now := time.Now()

	err := db.Transaction(func(tx *gorm.DB) error {
		// 1. Đồng bộ Danh Mục (Categories)
		catNameToID := make(map[string]string)
		if len(req.Categories) > 0 {
			if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.Category{}).Error; err != nil {
				return fmt.Errorf("lỗi xóa danh mục cũ: %w", err)
			}
			for idx, cat := range req.Categories {
				cid := cat.ID
				if cid == "" {
					cid = fmt.Sprintf("cat_%d", idx+1)
				}
				sortOrder := cat.DisplayOrder
				if sortOrder == 0 {
					sortOrder = idx + 1
				}
				icon := cat.Icon
				if icon == "" {
					icon = "food-outline"
				}
				cModel := models.Category{
					ID:        cid,
					TenantID:  tenantID,
					Name:      cat.Name,
					Icon:      icon,
					SortOrder: sortOrder,
					IsActive:  true,
					CreatedAt: now,
				}
				if err := tx.Create(&cModel).Error; err != nil {
					return fmt.Errorf("lỗi tạo danh mục %s: %w", cat.Name, err)
				}
				catNameToID[strings.TrimSpace(strings.ToLower(cat.Name))] = cid
			}
		}

		// 2. Đồng bộ Khu Vực (Areas)
		areaNameToID := make(map[string]string)
		if len(req.Areas) > 0 {
			if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.Area{}).Error; err != nil {
				return fmt.Errorf("lỗi xóa khu vực cũ: %w", err)
			}
			for idx, ar := range req.Areas {
				aid := ar.ID
				if aid == "" {
					aid = fmt.Sprintf("area_%d", idx+1)
				}
				sortOrder := ar.DisplayOrder
				if sortOrder == 0 {
					sortOrder = idx + 1
				}
				aModel := models.Area{
					ID:        aid,
					TenantID:  tenantID,
					BranchID:  branchID,
					Name:      ar.Name,
					SortOrder: sortOrder,
					CreatedAt: now,
				}
				if err := tx.Create(&aModel).Error; err != nil {
					return fmt.Errorf("lỗi tạo khu vực %s: %w", ar.Name, err)
				}
				areaNameToID[strings.TrimSpace(strings.ToLower(ar.Name))] = aid
			}
		}

		// 3. Đồng bộ Bàn Ăn (Dining Tables)
		if len(req.Tables) > 0 {
			if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.DiningTable{}).Error; err != nil {
				return fmt.Errorf("lỗi xóa bàn ăn cũ: %w", err)
			}
			for idx, tb := range req.Tables {
				tid := tb.ID
				if tid == "" {
					tid = fmt.Sprintf("tbl_%d", idx+1)
				}
				cap := tb.Capacity
				if cap <= 0 {
					cap = 4
				}
				areaName := tb.Area
				if areaName == "" {
					areaName = "Trong Nhà"
				}
				var areaIDPtr *string
				if aid, exists := areaNameToID[strings.TrimSpace(strings.ToLower(areaName))]; exists {
					areaIDPtr = &aid
				}
				tModel := models.DiningTable{
					ID:        tid,
					TenantID:  tenantID,
					BranchID:  branchID,
					AreaID:    areaIDPtr,
					AreaName:  areaName,
					Name:      tb.Name,
					Capacity:  cap,
					SortOrder: idx + 1,
					Status:    "trong",
					CreatedAt: now,
				}
				if err := tx.Create(&tModel).Error; err != nil {
					return fmt.Errorf("lỗi tạo bàn ăn %s: %w", tb.Name, err)
				}
			}
		}

		// 4. Đồng bộ Món Ăn (Products)
		if len(req.MenuItems) > 0 {
			if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.Product{}).Error; err != nil {
				return fmt.Errorf("lỗi xóa món ăn cũ: %w", err)
			}
			for idx, prod := range req.MenuItems {
				pid := prod.ID
				if pid == "" {
					pid = fmt.Sprintf("prod_%d", idx+1)
				}
				var catIDPtr *string
				if cid, ok := catNameToID[strings.TrimSpace(strings.ToLower(prod.Category))]; ok {
					catIDPtr = &cid
				}
				station := prod.Station
				if station == "" {
					station = "bar"
				}
				unit := prod.Unit
				if unit == "" {
					unit = "Phần"
				}
				pModel := models.Product{
					ID:           pid,
					TenantID:     tenantID,
					CategoryID:   catIDPtr,
					Code:         prod.Code,
					Name:         prod.Name,
					Unit:         unit,
					CostPrice:    prod.CostPrice,
					SellingPrice: prod.Price,
					ImageURL:     prod.Image,
					Station:      station,
					SortOrder:    idx + 1,
					IsActive:     true,
					CreatedAt:    now,
					UpdatedAt:    now,
				}
				if err := tx.Create(&pModel).Error; err != nil {
					return fmt.Errorf("lỗi tạo món %s: %w", prod.Name, err)
				}
			}
		}

		// 5. Cập nhật Store Settings nếu có
		if len(req.StoreSettings) > 0 {
			var settings models.POSSettings
			storeName, _ := req.StoreSettings["storeName"].(string)
			storeAddress, _ := req.StoreSettings["address"].(string)
			storePhone, _ := req.StoreSettings["phone"].(string)
			slogan, _ := req.StoreSettings["slogan"].(string)
			bankCode, _ := req.StoreSettings["bankCode"].(string)
			bankName, _ := req.StoreSettings["bankName"].(string)
			bankAccNo, _ := req.StoreSettings["accountNumber"].(string)
			bankAccName, _ := req.StoreSettings["accountHolder"].(string)

			if err := tx.Where("tenant_id = ?", tenantID).First(&settings).Error; err == nil {
				updates := map[string]interface{}{}
				if storeName != "" {
					updates["store_name"] = storeName
				}
				if storeAddress != "" {
					updates["store_address"] = storeAddress
				}
				if storePhone != "" {
					updates["store_phone"] = storePhone
				}
				if slogan != "" {
					updates["slogan"] = slogan
				}
				if bankCode != "" {
					updates["bank_code"] = bankCode
				}
				if bankName != "" {
					updates["bank_name"] = bankName
				}
				if bankAccNo != "" {
					updates["bank_account_no"] = bankAccNo
				}
				if bankAccName != "" {
					updates["bank_account_name"] = bankAccName
				}
				updates["updated_at"] = now
				_ = tx.Model(&models.POSSettings{}).Where("tenant_id = ?", tenantID).Updates(updates).Error
			} else {
				newSettings := models.POSSettings{
					ID:              uuid.New().String(),
					TenantID:        tenantID,
					BranchID:        branchID,
					StoreName:       storeName,
					StoreAddress:    storeAddress,
					StorePhone:      storePhone,
					Slogan:          slogan,
					BankCode:        bankCode,
					BankName:        bankName,
					BankAccountNo:   bankAccNo,
					BankAccountName: bankAccName,
					CreatedAt:       now,
					UpdatedAt:       now,
				}
				_ = tx.Create(&newSettings).Error
			}
		}

		// Ghi nhật ký Audit Log
		audit := models.AuditLog{
			ID:          uuid.New().String(),
			TenantID:    tenantID,
			BranchID:    branchID,
			Action:      "restore_backup",
			PerformedBy: userName,
			Details:     fmt.Sprintf("Phục hồi toàn diện CSDL: %d danh mục, %d món, %d bàn", len(req.Categories), len(req.MenuItems), len(req.Tables)),
			Severity:    "danger",
			CreatedAt:   now,
		}
		_ = tx.Create(&audit)

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Phục hồi thất bại: " + err.Error()})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(tenantID, "catalog_refreshed", gin.H{
		"product_count": len(req.MenuItems),
		"table_count":   len(req.Tables),
	})

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"message":        "Đã phục hồi dữ liệu thành công!",
		"tenant_id":      tenantID,
		"category_count": len(req.Categories),
		"product_count":  len(req.MenuItems),
		"table_count":    len(req.Tables),
		"area_count":     len(req.Areas),
	})
}
