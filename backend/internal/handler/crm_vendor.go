package handler

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
)

// ==========================================
// 👤 CRM KHÁCH HÀNG & TÍCH ĐIỂM
// ==========================================

type CreateCustomerRequest struct {
	TenantID string `json:"tenant_id" binding:"required"`
	BranchID string `json:"branch_id" binding:"required"`
	Name     string `json:"name" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
	Birthday string `json:"birthday"`
}

// GetCustomers danh sách khách hàng
func GetCustomers(c *gin.Context) {
	tenantID := GetTenantID(c)
	branchID := c.Query("branch_id")
	search := c.Query("search")

	if database.DB == nil {
		RespondSuccess(c, http.StatusOK, []models.Customer{})
		return
	}

	var customers []models.Customer
	query := ScopeTenant(database.DB.Model(&models.Customer{}), tenantID)
	if branchID != "" {
		query = query.Where("branch_id = ?", branchID)
	}
	if search != "" {
		query = query.Where("phone LIKE ? OR name LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Order("total_spend DESC").Find(&customers).Error; err != nil {
		RespondError(c, http.StatusInternalServerError, fmt.Sprintf("Lỗi tải khách hàng: %v", err))
		return
	}

	RespondSuccess(c, http.StatusOK, customers)
}

// GetCustomerByPhone tra cứu khách hàng nhanh theo số điện thoại
func GetCustomerByPhone(c *gin.Context) {
	phone := c.Param("phone")
	tenantID := GetTenantID(c)

	if database.DB == nil {
		RespondError(c, http.StatusNotFound, "Chưa kết nối CSDL")
		return
	}

	var customer models.Customer
	query := ScopeTenant(database.DB.Where("phone = ?", phone), tenantID)
	if err := query.First(&customer).Error; err != nil {
		RespondError(c, http.StatusNotFound, "Khách hàng chưa tồn tại")
		return
	}

	RespondSuccess(c, http.StatusOK, customer)
}

// CreateCustomer thêm mới khách hàng
func CreateCustomer(c *gin.Context) {
	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusCreated, gin.H{"id": uuid.New().String(), "name": req.Name, "phone": req.Phone})
		return
	}

	tenantID := GetTenantID(c)
	if tenantID == "" {
		tenantID = req.TenantID
	}
	if tenantID == "" {
		tenantID = "tenant_ongchu"
	}

	// Kiểm tra xem số điện thoại đã tồn tại chưa trong Tenant này
	var existing models.Customer
	if err := database.DB.Where("tenant_id = ? AND phone = ?", tenantID, req.Phone).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing)
		return
	}

	customer := models.Customer{
		ID:            uuid.New().String(),
		TenantID:      tenantID,
		BranchID:      req.BranchID,
		Name:          req.Name,
		Phone:         req.Phone,
		Birthday:      req.Birthday,
		PointsBalance: 0,
		TotalSpend:    0,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := database.DB.Create(&customer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tạo khách hàng: %v", err)})
		return
	}

	websocket.GlobalHub.BroadcastToTenant(customer.TenantID, "customer_created", customer)
	c.JSON(http.StatusCreated, customer)
}

// ==========================================
// 🏢 NHÀ CUNG CẤP (VENDOR DIRECTORY)
// ==========================================

type CreateVendorRequest struct {
	TenantID      string `json:"tenant_id" binding:"required"`
	BranchID      string `json:"branch_id" binding:"required"`
	Name          string `json:"name" binding:"required"`
	Phone         string `json:"phone"`
	Address       string `json:"address"`
	ContactPerson string `json:"contact_person"`
	Notes         string `json:"notes"`
}

// GetVendors danh bạ nhà cung cấp
func GetVendors(c *gin.Context) {
	tenantID := GetTenantID(c)
	branchID := c.Query("branch_id")

	if database.DB == nil {
		RespondSuccess(c, http.StatusOK, []models.Vendor{})
		return
	}

	var vendors []models.Vendor
	query := ScopeTenant(database.DB.Model(&models.Vendor{}), tenantID)
	if branchID != "" {
		query = query.Where("branch_id = ?", branchID)
	}

	if err := query.Order("name ASC").Find(&vendors).Error; err != nil {
		RespondError(c, http.StatusInternalServerError, fmt.Sprintf("Lỗi tải nhà cung cấp: %v", err))
		return
	}

	RespondSuccess(c, http.StatusOK, vendors)
}

// CreateVendor tạo mới nhà cung cấp
func CreateVendor(c *gin.Context) {
	var req CreateVendorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tenantID := GetTenantID(c)
	if tenantID == "" {
		tenantID = req.TenantID
	}
	if tenantID == "" {
		tenantID = "tenant_ongchu"
	}

	vendor := models.Vendor{
		ID:            uuid.New().String(),
		TenantID:      tenantID,
		BranchID:      req.BranchID,
		Name:          req.Name,
		Phone:         req.Phone,
		Address:       req.Address,
		ContactPerson: req.ContactPerson,
		Notes:         req.Notes,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if database.DB != nil {
		if err := database.DB.Create(&vendor).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Lỗi tạo nhà cung cấp: %v", err)})
			return
		}
	}

	websocket.GlobalHub.BroadcastToTenant(vendor.TenantID, "vendor_created", vendor)
	c.JSON(http.StatusCreated, vendor)
}

// GetVendorPurchaseOrders xem lịch sử các lần nhập hàng từ NCC
func GetVendorPurchaseOrders(c *gin.Context) {
	vendorName := c.Param("name")
	tenantID := GetTenantID(c)

	if database.DB == nil {
		RespondSuccess(c, http.StatusOK, []models.PurchaseOrder{})
		return
	}

	var pos []models.PurchaseOrder
	query := database.DB.Preload("Items").Where("supplier = ?", vendorName)
	query = ScopeTenant(query, tenantID)

	if err := query.Order("created_at DESC").Find(&pos).Error; err != nil {
		RespondError(c, http.StatusInternalServerError, fmt.Sprintf("Lỗi tải lịch sử nhập hàng: %v", err))
		return
	}

	RespondSuccess(c, http.StatusOK, pos)
}
