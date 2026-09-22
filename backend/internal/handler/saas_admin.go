package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"github.com/ongchu/pos-backend/internal/websocket"
)

// Pricing plan map (VND per month)
var planPriceMap = map[string]float64{
	"trial":      0,
	"standard":   199000,
	"pro":        399000,
	"enterprise": 799000,
}

// getPlanMonthlyPrice lấy giá tháng động từ bảng saas_plan_configs, fallback về map tĩnh
func getPlanMonthlyPrice(planID string) float64 {
	normPlan := strings.ToLower(strings.TrimSpace(planID))
	if database.DB != nil && normPlan != "" {
		var cfg models.SaaSPlanConfig
		if err := database.DB.Where("plan_id = ?", normPlan).First(&cfg).Error; err == nil {
			return cfg.PricePerMonth
		}
	}
	return planPriceMap[normPlan]
}

// TenantItemDTO định dạng trả về cho danh sách quán
type TenantItemDTO struct {
	ID               string     `json:"id"`
	Name             string     `json:"name"`
	Subdomain        string     `json:"subdomain"`
	Phone            string     `json:"phone"`
	OwnerName        string     `json:"owner_name"`
	SubscriptionPlan string     `json:"subscription_plan"`
	LicenseExpiresAt *time.Time `json:"license_expires_at"`
	LicenseDaysLeft  int        `json:"license_days_left"`
	IsActive         bool       `json:"is_active"`
	BranchCount      int64      `json:"branch_count"`
	DeviceCount      int64      `json:"device_count"`
	CreatedAt        time.Time  `json:"created_at"`
}

// GetSaaSOverview trả về số liệu tổng quan MRR, số quán, sắp hết hạn
func GetSaaSOverview(c *gin.Context) {
	if database.DB == nil {
		// Mock offline data
		c.JSON(http.StatusOK, gin.H{
			"total_tenants":    12,
			"active_tenants":   10,
			"expiring_tenants": 2,
			"total_mrr":        4390000,
			"renewal_rate":     92.5,
		})
		return
	}

	var tenants []models.Tenant
	database.DB.Where("id NOT IN ('saas_master', 'saas_root', 'tenant_saas')").Find(&tenants)

	var activeCount, expiringCount int
	var totalMRR float64
	now := time.Now()
	threshold := now.AddDate(0, 0, 30) // 30 ngày tới

	for _, t := range tenants {
		if t.IsActive {
			activeCount++
			totalMRR += getPlanMonthlyPrice(t.SubscriptionPlan)
		}
		if t.LicenseExpiresAt != nil && t.LicenseExpiresAt.After(now) && t.LicenseExpiresAt.Before(threshold) {
			expiringCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total_tenants":    len(tenants),
		"active_tenants":   activeCount,
		"expiring_tenants": expiringCount,
		"total_mrr":        totalMRR,
		"renewal_rate":     94.0,
	})
}

// GetSaaSTenants lấy danh sách toàn bộ khách thuê
func GetSaaSTenants(c *gin.Context) {
	search := strings.ToLower(strings.TrimSpace(c.Query("search")))
	status := c.Query("status")
	plan := c.Query("plan")

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"tenants": []TenantItemDTO{}})
		return
	}

	var tenants []models.Tenant
	query := database.DB.Model(&models.Tenant{}).Where("id NOT IN ('saas_master', 'saas_root', 'tenant_saas')")

	if search != "" {
		pattern := "%" + search + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(subdomain) LIKE ? OR phone LIKE ?", pattern, pattern, pattern)
	}
	if status == "active" {
		query = query.Where("is_active = ?", true)
	} else if status == "suspended" {
		query = query.Where("is_active = ?", false)
	}
	if plan != "" && plan != "all" {
		query = query.Where("subscription_plan = ?", plan)
	}

	query.Order("created_at desc").Find(&tenants)

	now := time.Now()
	result := make([]TenantItemDTO, 0, len(tenants))

	for _, t := range tenants {
		var branchCount int64
		database.DB.Model(&models.Branch{}).Where("tenant_id = ?", t.ID).Count(&branchCount)

		var deviceCount int64
		database.DB.Model(&models.TenantDevice{}).Where("tenant_id = ?", t.ID).Count(&deviceCount)

		daysLeft := 0
		if t.LicenseExpiresAt != nil {
			dur := t.LicenseExpiresAt.Sub(now)
			daysLeft = int(dur.Hours() / 24)
			if daysLeft < 0 {
				daysLeft = 0
			}
		}

		var owner models.User
		ownerName := "Chủ Quán"
		if err := database.DB.Where("tenant_id = ? AND role = ?", t.ID, "owner").First(&owner).Error; err == nil && owner.FullName != "" {
			ownerName = owner.FullName
		}

		result = append(result, TenantItemDTO{
			ID:               t.ID,
			Name:             t.Name,
			Subdomain:        t.Subdomain,
			Phone:            t.Phone,
			OwnerName:        ownerName,
			SubscriptionPlan: t.SubscriptionPlan,
			LicenseExpiresAt: t.LicenseExpiresAt,
			LicenseDaysLeft:  daysLeft,
			IsActive:         t.IsActive,
			BranchCount:      branchCount,
			DeviceCount:      deviceCount,
			CreatedAt:        t.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"tenants": result})
}

// CreateTenantRequest thông tin cấp quán mới
type CreateTenantRequest struct {
	Name             string `json:"name" binding:"required"`
	Subdomain        string `json:"subdomain" binding:"required"`
	Phone            string `json:"phone"`
	SubscriptionPlan string `json:"subscription_plan"` // trial, standard, pro, enterprise
	DurationMonths   int    `json:"duration_months"`   // 1, 3, 6, 12
	OwnerUsername    string `json:"owner_username"`
	OwnerPassword    string `json:"owner_password"`
	OwnerPin         string `json:"owner_pin"`
}

// CreateSaaSTenant cấp mới khách thuê phần mềm
func CreateSaaSTenant(c *gin.Context) {
	var req CreateTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Vui lòng điền đủ thông tin tên và mã quán"})
		return
	}

	cleanCode := strings.ToLower(strings.TrimSpace(req.Subdomain))
	if cleanCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Mã quán không được rỗng"})
		return
	}

	cleanName := strings.TrimSpace(req.Name)
	if cleanName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Tên quán không được để trống"})
		return
	}

	cleanPhone := CleanPhoneNumber(req.Phone)

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success":        true,
			"message":        "Đã tạo quán mới (demo)",
			"tenant_id":      "tenant_" + cleanCode,
			"tenant_code":    cleanCode,
			"owner_username": req.OwnerUsername,
			"owner_password": req.OwnerPassword,
			"owner_pin":      "9999",
		})
		return
	}

	// 1. Kiểm tra trùng Tên Quán
	var nameCount int64
	database.DB.Model(&models.Tenant{}).Where("LOWER(TRIM(name)) = LOWER(TRIM(?))", cleanName).Count(&nameCount)
	if nameCount > 0 {
		c.JSON(http.StatusConflict, gin.H{"success": false, "error": "Tên quán này đã tồn tại trên hệ thống"})
		return
	}

	// 2. Kiểm tra trùng Số Điện Thoại
	if cleanPhone != "" {
		var phoneCount int64
		database.DB.Model(&models.Tenant{}).Where("phone = ? OR phone = ?", cleanPhone, req.Phone).Count(&phoneCount)
		if phoneCount > 0 {
			c.JSON(http.StatusConflict, gin.H{"success": false, "error": "Số điện thoại này đã được đăng ký cho quán khác"})
			return
		}
	}

	// 3. Kiểm tra trùng mã subdomain
	var count int64
	database.DB.Model(&models.Tenant{}).Where("subdomain = ?", cleanCode).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"success": false, "error": "Mã quán này đã tồn tại trong hệ thống"})
		return
	}

	plan := req.SubscriptionPlan
	if plan == "" {
		plan = "standard"
	}
	months := req.DurationMonths
	if months <= 0 {
		months = 1
	}

	expiresAt := time.Now().AddDate(0, months, 0)
	tenantID := "tenant_" + uuid.New().String()[:8]

	newTenant := models.Tenant{
		ID:               tenantID,
		Name:             req.Name,
		Subdomain:        cleanCode,
		Phone:            req.Phone,
		SubscriptionPlan: plan,
		LicenseExpiresAt: &expiresAt,
		IsActive:         true,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	if err := database.DB.Create(&newTenant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Không thể lưu thông tin quán"})
		return
	}

	// Tự động tạo Chi Nhánh 1
	branchID := "branch_" + uuid.New().String()[:8]
	defaultBranch := models.Branch{
		ID:        branchID,
		TenantID:  tenantID,
		Name:      "Chi Nhánh 1",
		Address:   "Trụ sở chính",
		Phone:     req.Phone,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	database.DB.Create(&defaultBranch)

	// Tự động tạo tài khoản Owner
	username := strings.TrimSpace(req.OwnerUsername)
	if username == "" {
		if cleanPhone != "" {
			username = cleanPhone
		} else {
			username = "owner"
		}
	}
	defaultPass := strings.TrimSpace(req.OwnerPassword)
	if defaultPass == "" {
		defaultPass = "123456"
	}
	ownerPin := strings.TrimSpace(req.OwnerPin)
	if ownerPin == "" {
		ownerPin = "9999"
	}

	defaultUser := models.User{
		ID:           "usr_" + uuid.New().String()[:8],
		TenantID:     tenantID,
		BranchID:     &branchID,
		Username:     username,
		FullName:     "Chủ Quán " + req.Name,
		Role:         "owner",
		PinCode:      ownerPin,
		PasswordHash: defaultPass,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	database.DB.Create(&defaultUser)

	c.JSON(http.StatusOK, gin.H{
		"success":        true,
		"message":        "Cấp quán mới thành công!",
		"tenant":         newTenant,
		"branch":         defaultBranch,
		"user":           defaultUser,
		"tenant_code":    cleanCode,
		"owner_username": username,
		"owner_password": defaultPass,
		"owner_pin":      ownerPin,
	})
}

// ToggleTenantStatus khóa hoặc kích hoạt lại quán
func ToggleTenantStatus(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "ID quán không hợp lệ"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã cập nhật trạng thái quán"})
		return
	}

	var tenant models.Tenant
	if err := database.DB.First(&tenant, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy quán"})
		return
	}

	tenant.IsActive = !tenant.IsActive
	tenant.UpdatedAt = time.Now()
	database.DB.Save(&tenant)

	statusStr := "kích hoạt"
	if !tenant.IsActive {
		statusStr = "tạm khóa"
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   fmt.Sprintf("Đã %s quán thành công", statusStr),
		"is_active": tenant.IsActive,
	})
}

// DeleteSaaSTenant xóa vĩnh viễn dữ liệu quán và shard database của quán (Super Admin Only)
func DeleteSaaSTenant(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "ID quán không hợp lệ"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"message":   "Đã xóa quán thành công (demo)",
			"tenant_id": id,
		})
		return
	}

	cleanPhone := CleanPhoneNumber(id)
	var tenant models.Tenant
	if err := database.DB.Where("id = ? OR subdomain = ? OR phone = ? OR phone = ?", id, id, id, cleanPhone).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy quán cần xóa"})
		return
	}

	// 1. Dọn sạch toàn bộ bảng liên kết trong Master DB
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.Branch{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.TenantBranch{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.User{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.TenantDevice{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.TenantAddonConfig{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.SaaSInvoice{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.Customer{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.Vendor{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.Category{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.Product{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.DiningTable{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.Area{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.Topping{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.Order{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.OrderItem{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.CashTransaction{})
	database.DB.Where("tenant_id = ?", tenant.ID).Delete(&models.CashShift{})
	database.DB.Delete(&tenant)

	// 2. Xóa tệp SQLite Shard DB độc lập của tenant (nếu có)
	cleanID := database.SanitizeTenantID(tenant.ID)
	if cleanID != "tenant_ongchu" && cleanID != "master" {
		dbPath := filepath.Join(".", "data", "tenants", fmt.Sprintf("%s.db", cleanID))
		_ = os.Remove(dbPath)
		_ = os.Remove(dbPath + "-wal")
		_ = os.Remove(dbPath + "-shm")

		// Thử cả thư mục fallback tenants/
		altDbPath := filepath.Join(".", "tenants", fmt.Sprintf("%s.db", cleanID))
		_ = os.Remove(altDbPath)
		_ = os.Remove(altDbPath + "-wal")
		_ = os.Remove(altDbPath + "-shm")
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"message":   "Đã xóa vĩnh viễn quán và toàn bộ dữ liệu liên quan thành công",
		"tenant_id": tenant.ID,
		"name":      tenant.Name,
	})
}

// RenewLicenseRequest gia hạn thời gian thuê
type RenewLicenseRequest struct {
	Months int `json:"months" binding:"required"`
}

// RenewTenantLicense gia hạn bản quyền thêm số tháng
func RenewTenantLicense(c *gin.Context) {
	id := c.Param("id")
	var req RenewLicenseRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Months <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Số tháng gia hạn không hợp lệ"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": fmt.Sprintf("Đã gia hạn +%d tháng", req.Months)})
		return
	}

	var tenant models.Tenant
	if err := database.DB.First(&tenant, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy quán"})
		return
	}

	baseTime := time.Now()
	if tenant.LicenseExpiresAt != nil && tenant.LicenseExpiresAt.After(baseTime) {
		baseTime = *tenant.LicenseExpiresAt
	}

	newExpiry := baseTime.AddDate(0, req.Months, 0)
	tenant.LicenseExpiresAt = &newExpiry
	tenant.UpdatedAt = time.Now()
	database.DB.Save(&tenant)

	// Tự động sinh Hóa Đơn Thu Phí Bản Quyền (SaaS Invoice Record)
	monthlyFee := getPlanMonthlyPrice(tenant.SubscriptionPlan)
	var addonTotal float64
	var activeAddons []models.TenantAddonConfig
	database.DB.Where("tenant_id = ? AND is_enabled = ?", id, true).Find(&activeAddons)
	for _, a := range activeAddons {
		addonTotal += a.MonthlyFee
	}
	totalAmount := (monthlyFee + addonTotal) * float64(req.Months)

	invCode := fmt.Sprintf("INV-%d-%04d", time.Now().Year(), time.Now().Unix()%10000)
	invoice := models.SaaSInvoice{
		ID:            uuid.New().String(),
		TenantID:      tenant.ID,
		InvoiceCode:   invCode,
		Amount:        totalAmount,
		MonthsAdded:   req.Months,
		PaymentMethod: "vietqr",
		Note:          fmt.Sprintf("Gia hạn +%d tháng (%s)", req.Months, tenant.Name),
		CreatedAt:     time.Now(),
	}
	database.DB.Create(&invoice)

	c.JSON(http.StatusOK, gin.H{
		"success":            true,
		"message":            fmt.Sprintf("Đã gia hạn thành công +%d tháng", req.Months),
		"license_expires_at": newExpiry,
		"invoice":            invoice,
	})
}

// ResetTenantPin đặt lại PIN chủ quán hoặc cấp mã cứu hộ thiết bị
func ResetTenantPin(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "ID quán không hợp lệ"})
		return
	}

	// Mã cứu hộ SaaS khẩn cấp (Emergency Rescue Code)
	rescueCode := fmt.Sprintf("RESCUE-%d", time.Now().Unix()%1000000)

	if database.DB != nil {
		// Đặt lại PIN Owner về mặc định 9999
		database.DB.Model(&models.User{}).
			Where("tenant_id = ? AND role = ?", id, "owner").
			Update("pin_code", "9999")
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"message":     "Đã cấp mã cứu hộ và reset PIN Chủ Quán về 9999",
		"owner_pin":   "9999",
		"rescue_code": rescueCode,
	})
}

// GetTenantDevices lấy danh sách thiết bị POS/KDS/CFD của quán (Device Fleet)
func GetTenantDevices(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"devices": []models.TenantDevice{}})
		return
	}
	var devices []models.TenantDevice
	database.DB.Where("tenant_id = ?", id).Order("created_at asc").Find(&devices)
	c.JSON(http.StatusOK, gin.H{"devices": devices})
}

// UnbindTenantDevice gỡ thiết bị từ xa (Remote Unbind)
func UnbindTenantDevice(c *gin.Context) {
	id := c.Param("id")
	deviceId := c.Param("deviceId")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã gỡ thiết bị từ xa"})
		return
	}
	if err := database.DB.Where("tenant_id = ? AND id = ?", id, deviceId).Delete(&models.TenantDevice{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Không thể gỡ thiết bị"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã gỡ thiết bị từ xa thành công"})
}

// RegisterDeviceRequest thông tin khai báo thiết bị kết nối
type RegisterDeviceRequest struct {
	DeviceID   string `json:"device_id" binding:"required"`
	DeviceName string `json:"device_name" binding:"required"`
	DeviceRole string `json:"device_role"` // pos, kds, cfd, waiter
	BranchID   string `json:"branch_id"`
	Platform   string `json:"platform"` // android, ios, web
	AppVersion string `json:"app_version"`
	IPAddress  string `json:"ip_address"`
}

// RegisterOrHeartbeatDevice đăng ký thiết bị mới hoặc báo sống kèm kiểm tra quota gói cước
func RegisterOrHeartbeatDevice(c *gin.Context) {
	tenantID := c.Param("id")
	if tenantID == "" {
		tenantID = c.GetString("tenant_id")
	}
	var req RegisterDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Thiếu mã thiết bị hoặc tên thiết bị"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã ghi nhận thiết bị"})
		return
	}

	var tenant models.Tenant
	if err := database.DB.Where("id = ?", tenantID).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy quán"})
		return
	}

	// 1. Kiểm tra thiết bị đã tồn tại chưa
	var existing models.TenantDevice
	err := database.DB.Where("tenant_id = ? AND id = ?", tenantID, req.DeviceID).First(&existing).Error
	now := time.Now()

	if err == nil {
		// Đã tồn tại -> cập nhật báo sống
		existing.DeviceName = req.DeviceName
		if req.DeviceRole != "" {
			existing.DeviceRole = req.DeviceRole
		}
		if req.BranchID != "" {
			existing.BranchID = req.BranchID
		}
		if req.Platform != "" {
			existing.Platform = req.Platform
		}
		if req.AppVersion != "" {
			existing.AppVersion = req.AppVersion
		}
		if req.IPAddress != "" {
			existing.IPAddress = req.IPAddress
		}
		existing.IsOnline = true
		existing.LastActive = now
		database.DB.Save(&existing)
		c.JSON(http.StatusOK, gin.H{"success": true, "device": existing, "message": "Heartbeat thành công"})
		return
	}

	// 2. Thiết bị mới -> kiểm tra hạn mức gói cước
	var currentDevices int64
	database.DB.Model(&models.TenantDevice{}).Where("tenant_id = ?", tenantID).Count(&currentDevices)

	_, maxAllowed := database.GetPlanMaxQuotas(database.DB, tenant.SubscriptionPlan)

	if int(currentDevices) >= maxAllowed {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"code":    "QUOTA_EXCEEDED",
			"error":   fmt.Sprintf("Gói %s chỉ cho phép tối đa %d thiết bị. Hãy nâng cấp gói cước!", strings.ToUpper(tenant.SubscriptionPlan), maxAllowed),
		})
		return
	}

	newDev := models.TenantDevice{
		ID:         req.DeviceID,
		TenantID:   tenantID,
		BranchID:   req.BranchID,
		DeviceName: req.DeviceName,
		DeviceRole: req.DeviceRole,
		Platform:   req.Platform,
		AppVersion: req.AppVersion,
		IPAddress:  req.IPAddress,
		IsOnline:   true,
		LastActive: now,
		CreatedAt:  now,
	}
	if newDev.DeviceRole == "" {
		newDev.DeviceRole = "pos"
	}
	database.DB.Create(&newDev)

	c.JSON(http.StatusOK, gin.H{"success": true, "device": newDev, "message": "Đăng ký thiết bị thành công"})
}

// GetTenantAddons lấy cấu hình module tính năng mở rộng & phụ phí
func GetTenantAddons(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"addons": []models.TenantAddonConfig{}})
		return
	}
	var addons []models.TenantAddonConfig
	database.DB.Where("tenant_id = ?", id).Find(&addons)
	c.JSON(http.StatusOK, gin.H{"addons": addons})
}

// UpdateTenantAddonRequest payload bật/tắt module
type UpdateTenantAddonRequest struct {
	AddonCode  string   `json:"addon_code" binding:"required"`
	IsEnabled  bool     `json:"is_enabled"`
	MonthlyFee *float64 `json:"monthly_fee"`
}

// UpdateTenantAddon cập nhật bật/tắt module và phụ phí
func UpdateTenantAddon(c *gin.Context) {
	id := c.Param("id")
	var req UpdateTenantAddonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Thông tin không hợp lệ"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã cập nhật tính năng"})
		return
	}

	var addon models.TenantAddonConfig
	if err := database.DB.Where("tenant_id = ? AND addon_code = ?", id, req.AddonCode).First(&addon).Error; err != nil {
		addon = models.TenantAddonConfig{
			ID:        uuid.New().String(),
			TenantID:  id,
			AddonCode: req.AddonCode,
			AddonName: req.AddonCode,
			IsEnabled: req.IsEnabled,
			UpdatedAt: time.Now(),
		}
		if req.MonthlyFee != nil {
			addon.MonthlyFee = *req.MonthlyFee
		}
		database.DB.Create(&addon)
	} else {
		addon.IsEnabled = req.IsEnabled
		if req.MonthlyFee != nil {
			addon.MonthlyFee = *req.MonthlyFee
		}
		addon.UpdatedAt = time.Now()
		database.DB.Save(&addon)
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "addon": addon})
}

// GetTenantInvoices lấy lịch sử hóa đơn thu tiền bản quyền
func GetTenantInvoices(c *gin.Context) {
	id := c.Param("id")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"invoices": []models.SaaSInvoice{}})
		return
	}
	var invoices []models.SaaSInvoice
	database.DB.Where("tenant_id = ?", id).Order("created_at desc").Find(&invoices)
	c.JSON(http.StatusOK, gin.H{"invoices": invoices})
}

// TenantBranchDTO thông tin chi nhánh trả về cho SaaS Admin
type TenantBranchDTO struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	Name        string    `json:"name"`
	Address     string    `json:"address"`
	Phone       string    `json:"phone"`
	ManagerName string    `json:"manager_name"`
	IsMain      bool      `json:"is_main"`
	IsActive    bool      `json:"is_active"`
	DeviceCount int64     `json:"device_count"`
	CreatedAt   time.Time `json:"created_at"`
}

// GetTenantBranches lấy danh sách chi nhánh và số thiết bị gán theo từng chi nhánh
func GetTenantBranches(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		id = GetTenantID(c)
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"branches": []TenantBranchDTO{}})
		return
	}
	var branches []models.TenantBranch
	database.DB.Where("tenant_id = ?", id).Order("created_at asc").Find(&branches)

	// Fallback đọc từ Branch nếu tenant_branches chưa có
	if len(branches) == 0 {
		var oldBranches []models.Branch
		database.DB.Where("tenant_id = ?", id).Order("created_at asc").Find(&oldBranches)
		for _, ob := range oldBranches {
			branches = append(branches, models.TenantBranch{
				ID:          ob.ID,
				TenantID:    ob.TenantID,
				Name:        ob.Name,
				Address:     ob.Address,
				Phone:       ob.Phone,
				ManagerName: ob.ManagerName,
				IsMain:      ob.IsMain,
				IsActive:    ob.IsActive,
				CreatedAt:   ob.CreatedAt,
				UpdatedAt:   ob.UpdatedAt,
			})
		}
	}

	result := make([]TenantBranchDTO, 0, len(branches))
	for idx, b := range branches {
		var devCount int64
		database.DB.Model(&models.TenantDevice{}).Where("tenant_id = ? AND branch_id = ?", id, b.ID).Count(&devCount)
		result = append(result, TenantBranchDTO{
			ID:          b.ID,
			TenantID:    b.TenantID,
			Name:        b.Name,
			Address:     b.Address,
			Phone:       b.Phone,
			ManagerName: b.ManagerName,
			IsMain:      b.IsMain || idx == 0,
			IsActive:    b.IsActive,
			DeviceCount: devCount,
			CreatedAt:   b.CreatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"branches": result})
}

// CreateTenantBranchRequest thông tin tạo chi nhánh mới
type CreateTenantBranchRequest struct {
	Name        string `json:"name" binding:"required"`
	Address     string `json:"address"`
	Phone       string `json:"phone"`
	ManagerName string `json:"manager_name"`
}

// CreateTenantBranch tạo chi nhánh mới có kiểm tra hạn mức gói cước
func CreateTenantBranch(c *gin.Context) {
	id := c.Param("id")
	var req CreateTenantBranchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Tên chi nhánh không được để trống"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã tạo chi nhánh"})
		return
	}

	var tenant models.Tenant
	if err := database.DB.Where("id = ?", id).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy quán"})
		return
	}

	var currentCount int64
	database.DB.Model(&models.TenantBranch{}).Where("tenant_id = ?", id).Count(&currentCount)
	if currentCount == 0 {
		database.DB.Model(&models.Branch{}).Where("tenant_id = ?", id).Count(&currentCount)
	}

	maxAllowed, _ := database.GetPlanMaxQuotas(database.DB, tenant.SubscriptionPlan)

	if int(currentCount) >= maxAllowed {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Gói %s chỉ cho phép tối đa %d chi nhánh. Hãy nâng cấp gói cước!", strings.ToUpper(tenant.SubscriptionPlan), maxAllowed),
		})
		return
	}

	now := time.Now()
	tb := models.TenantBranch{
		ID:          uuid.New().String(),
		TenantID:    id,
		Name:        strings.TrimSpace(req.Name),
		Address:     strings.TrimSpace(req.Address),
		Phone:       strings.TrimSpace(req.Phone),
		ManagerName: strings.TrimSpace(req.ManagerName),
		IsMain:      currentCount == 0,
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	database.DB.Create(&tb)

	// Đồng bộ sang bảng Branch để tương thích ngược 100%
	b := models.Branch{
		ID:          tb.ID,
		TenantID:    tb.TenantID,
		Name:        tb.Name,
		Address:     tb.Address,
		Phone:       tb.Phone,
		ManagerName: tb.ManagerName,
		IsMain:      tb.IsMain,
		IsActive:    tb.IsActive,
		CreatedAt:   tb.CreatedAt,
		UpdatedAt:   tb.UpdatedAt,
	}
	database.DB.Create(&b)

	websocket.GlobalHub.BroadcastToTenant(id, "branch_created", gin.H{"branch": tb, "tenant_id": id})
	c.JSON(http.StatusOK, gin.H{"success": true, "branch": tb})
}

// UpdateTenantBranchDetailRequest thông tin cập nhật chi nhánh
type UpdateTenantBranchDetailRequest struct {
	Name        string `json:"name"`
	Address     string `json:"address"`
	Phone       string `json:"phone"`
	ManagerName string `json:"manager_name"`
	IsMain      *bool  `json:"is_main"`
}

// UpdateTenantBranchDetail cập nhật chi tiết chi nhánh
func UpdateTenantBranchDetail(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		id = GetTenantID(c)
	}
	branchId := c.Param("branchId")
	var req UpdateTenantBranchDetailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Dữ liệu không hợp lệ"})
		return
	}
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã cập nhật chi nhánh"})
		return
	}

	now := time.Now()
	var tb models.TenantBranch
	err := database.DB.Where("tenant_id = ? AND id = ?", id, branchId).First(&tb).Error
	if err == nil {
		if req.Name != "" {
			tb.Name = strings.TrimSpace(req.Name)
		}
		if req.Address != "" {
			tb.Address = strings.TrimSpace(req.Address)
		}
		if req.Phone != "" {
			tb.Phone = strings.TrimSpace(req.Phone)
		}
		if req.ManagerName != "" {
			tb.ManagerName = strings.TrimSpace(req.ManagerName)
		}
		if req.IsMain != nil {
			tb.IsMain = *req.IsMain
		}
		tb.UpdatedAt = now
		database.DB.Save(&tb)

		var b models.Branch
		if database.DB.Where("tenant_id = ? AND id = ?", id, branchId).First(&b).Error == nil {
			b.Name = tb.Name
			b.Address = tb.Address
			b.Phone = tb.Phone
			b.ManagerName = tb.ManagerName
			b.IsMain = tb.IsMain
			b.UpdatedAt = now
			database.DB.Save(&b)
		}
		websocket.GlobalHub.BroadcastToTenant(id, "branch_updated", gin.H{
			"tenant_id": id,
			"branch_id": branchId,
			"updates":   tb,
		})
		c.JSON(http.StatusOK, gin.H{"success": true, "branch": tb})
		return
	}

	var branch models.Branch
	if err := database.DB.Where("tenant_id = ? AND id = ?", id, branchId).First(&branch).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy chi nhánh"})
		return
	}
	if req.Name != "" {
		branch.Name = strings.TrimSpace(req.Name)
	}
	if req.Address != "" {
		branch.Address = strings.TrimSpace(req.Address)
	}
	if req.Phone != "" {
		branch.Phone = strings.TrimSpace(req.Phone)
	}
	if req.ManagerName != "" {
		branch.ManagerName = strings.TrimSpace(req.ManagerName)
	}
	if req.IsMain != nil {
		branch.IsMain = *req.IsMain
	}
	branch.UpdatedAt = now
	database.DB.Save(&branch)

	websocket.GlobalHub.BroadcastToTenant(id, "branch_updated", gin.H{
		"tenant_id": id,
		"branch_id": branchId,
		"updates":   branch,
	})
	c.JSON(http.StatusOK, gin.H{"success": true, "branch": branch})
}

// ToggleTenantBranchStatus khóa / mở hoạt động của chi nhánh
func ToggleTenantBranchStatus(c *gin.Context) {
	id := c.Param("id")
	branchId := c.Param("branchId")
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã cập nhật trạng thái chi nhánh"})
		return
	}

	var tb models.TenantBranch
	err := database.DB.Where("tenant_id = ? AND id = ?", id, branchId).First(&tb).Error
	now := time.Now()

	if err == nil {
		tb.IsActive = !tb.IsActive
		tb.UpdatedAt = now
		database.DB.Save(&tb)

		var b models.Branch
		if database.DB.Where("tenant_id = ? AND id = ?", id, branchId).First(&b).Error == nil {
			b.IsActive = tb.IsActive
			b.UpdatedAt = now
			database.DB.Save(&b)
		}
		websocket.GlobalHub.BroadcastToTenant(id, "branch_updated", gin.H{
			"tenant_id": id,
			"branch_id": branchId,
			"updates": gin.H{"is_active": tb.IsActive},
		})
		c.JSON(http.StatusOK, gin.H{"success": true, "new_status": tb.IsActive})
		return
	}

	// Fallback kiểm tra bảng Branch
	var branch models.Branch
	if err := database.DB.Where("tenant_id = ? AND id = ?", id, branchId).First(&branch).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy chi nhánh"})
		return
	}
	branch.IsActive = !branch.IsActive
	branch.UpdatedAt = now
	database.DB.Save(&branch)

	websocket.GlobalHub.BroadcastToTenant(id, "branch_updated", gin.H{
		"tenant_id": id,
		"branch_id": branchId,
		"updates": gin.H{"is_active": branch.IsActive},
	})
	c.JSON(http.StatusOK, gin.H{"success": true, "new_status": branch.IsActive})
}

// UpdateTenantPlanRequest thông tin chuyển đổi gói cước
type UpdateTenantPlanRequest struct {
	SubscriptionPlan string `json:"subscription_plan" binding:"required"`
}

// UpdateTenantPlan nâng cấp / hạ cấp gói cước kèm cảnh báo vượt hạn mức
func UpdateTenantPlan(c *gin.Context) {
	id := c.Param("id")
	var req UpdateTenantPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Gói cước không hợp lệ"})
		return
	}
	validPlans := map[string]bool{"trial": true, "standard": true, "pro": true, "enterprise": true}
	if !validPlans[req.SubscriptionPlan] {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Gói cước không tồn tại"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã đổi gói cước"})
		return
	}

	var tenant models.Tenant
	if err := database.DB.Where("id = ?", id).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy quán"})
		return
	}

	var branchCount int64
	database.DB.Model(&models.TenantBranch{}).Where("tenant_id = ?", id).Count(&branchCount)
	if branchCount == 0 {
		database.DB.Model(&models.Branch{}).Where("tenant_id = ?", id).Count(&branchCount)
	}

	var deviceCount int64
	database.DB.Model(&models.TenantDevice{}).Where("tenant_id = ?", id).Count(&deviceCount)

	maxBranches, maxDevices := database.GetPlanMaxQuotas(database.DB, req.SubscriptionPlan)

	var warningMsg string
	if int(branchCount) > maxBranches || int(deviceCount) > maxDevices {
		warningMsg = fmt.Sprintf("Cảnh báo: Quán hiện có %d CN, %d POS, vượt trần của gói %s (%d CN, %d POS)!", branchCount, deviceCount, strings.ToUpper(req.SubscriptionPlan), maxBranches, maxDevices)
	}

	tenant.SubscriptionPlan = req.SubscriptionPlan
	database.DB.Save(&tenant)

	c.JSON(http.StatusOK, gin.H{
		"success":           true,
		"subscription_plan": tenant.SubscriptionPlan,
		"warning":           warningMsg,
		"message":           fmt.Sprintf("Đã chuyển đổi sang gói %s thành công", strings.ToUpper(tenant.SubscriptionPlan)),
	})
}

// -----------------------------------------------------------------------------
// BẢNG GIÁ ĐỘNG & MA TRẬN TÍNH NĂNG (PRICING PLANS & FEATURE MATRIX)
// -----------------------------------------------------------------------------

// GetSaaSPricingPlans lấy danh sách bảng giá và ma trận tính năng động
func GetSaaSPricingPlans(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"plans": []models.SaaSPlanConfig{}})
		return
	}
	var plans []models.SaaSPlanConfig
	database.DB.Order("price_per_month asc").Find(&plans)
	c.JSON(http.StatusOK, gin.H{"plans": plans})
}

// UpdateSaaSPlanConfigRequest dữ liệu cập nhật gói cước
type UpdateSaaSPlanConfigRequest struct {
	PricePerMonth *float64 `json:"price_per_month"`
	MaxBranches   *int     `json:"max_branches"`
	MaxDevices    *int     `json:"max_devices"`
	EnabledAddons *string  `json:"enabled_addons"`
}

// UpdateSaaSPlanConfig chỉnh sửa giá tiền, hạn mức CN/thiết bị và ma trận tính năng của gói
func UpdateSaaSPlanConfig(c *gin.Context) {
	planId := c.Param("planId")
	var req UpdateSaaSPlanConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Dữ liệu không hợp lệ"})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã cập nhật gói cước"})
		return
	}

	var planCfg models.SaaSPlanConfig
	if err := database.DB.Where("plan_id = ?", planId).First(&planCfg).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy gói cước"})
		return
	}

	if req.PricePerMonth != nil {
		planCfg.PricePerMonth = *req.PricePerMonth
	}
	if req.MaxBranches != nil {
		planCfg.MaxBranches = *req.MaxBranches
	}
	if req.MaxDevices != nil {
		planCfg.MaxDevices = *req.MaxDevices
	}
	if req.EnabledAddons != nil {
		planCfg.EnabledAddons = *req.EnabledAddons
	}
	planCfg.UpdatedAt = time.Now()
	database.DB.Save(&planCfg)

	// Cập nhật lại planPriceMap bộ nhớ
	if req.PricePerMonth != nil {
		planPriceMap[planId] = *req.PricePerMonth
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "plan": planCfg, "message": "Đã lưu cấu hình gói cước thành công"})
}

// ResetSaaSPlanConfigs khôi phục bảng giá và ma trận tính năng về mặc định
func ResetSaaSPlanConfigs(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã khôi phục mặc định"})
		return
	}
	now := time.Now()
	defaults := []models.SaaSPlanConfig{
		{
			PlanID:        "trial",
			Name:          "Dùng Thử",
			PricePerMonth: 0,
			MaxBranches:   1,
			MaxDevices:    1,
			Tagline:       "Trải nghiệm 14 ngày không rủi ro",
			FeaturesJson:  `["1 Chi nhánh","1 Thiết bị POS","Hỗ trợ giờ hành chính","Đầy đủ tính năng POS"]`,
			EnabledAddons: "cash_shifts",
			UpdatedAt:     now,
		},
		{
			PlanID:        "standard",
			Name:          "Chuẩn (Gói Quán Đơn)",
			PricePerMonth: 199000,
			MaxBranches:   1,
			MaxDevices:    3,
			Tagline:       "Phù hợp quán cà phê, trà sữa 1 điểm",
			FeaturesJson:  `["1 Chi nhánh","3 Thiết bị POS/KDS","In nhiệt ESC/POS 9100","Sổ quỹ chi chợ & Giao ca 30s"]`,
			EnabledAddons: "cash_shifts,pnl_reports",
			UpdatedAt:     now,
		},
		{
			PlanID:        "pro",
			Name:          "Chuyên Nghiệp (Gói Hot)",
			PricePerMonth: 399000,
			MaxBranches:   3,
			MaxDevices:    10,
			Tagline:       "Tối ưu cho quán đông khách & 2-3 chi nhánh",
			FeaturesJson:  `["Tối đa 3 Chi nhánh","10 Thiết bị (POS + KDS + Order)","Bot Telegram cảnh báo gian lận","Báo cáo P&L 3 số vàng bỏ túi"]`,
			EnabledAddons: "kds,cfd,telegram_fraud,pnl_reports,cash_shifts,multi_branch",
			UpdatedAt:     now,
		},
		{
			PlanID:        "enterprise",
			Name:          "Doanh Nghiệp (Chuỗi Lớn)",
			PricePerMonth: 799000,
			MaxBranches:   9999,
			MaxDevices:    9999,
			Tagline:       "Toàn quyền chuỗi đa điểm không giới hạn",
			FeaturesJson:  `["Không giới hạn Chi nhánh","Không giới hạn Thiết bị","Máy chủ riêng biệt 99.9% Uptime","Hỗ trợ kỹ thuật 24/7 ưu tiên"]`,
			EnabledAddons: "kds,cfd,telegram_fraud,pnl_reports,cash_shifts,multi_branch",
			UpdatedAt:     now,
		},
	}

	for _, d := range defaults {
		database.DB.Save(&d)
		planPriceMap[d.PlanID] = d.PricePerMonth
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã khôi phục bảng giá và tính năng mặc định", "plans": defaults})
}

// -----------------------------------------------------------------------------
// HỆ THỐNG LICENSE KEY (7 NGÀY, 15 NGÀY, 30 NGÀY...)
// -----------------------------------------------------------------------------

// GetLicenseKeys lấy danh sách toàn bộ mã License Key
func GetLicenseKeys(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"keys": []models.SaaSLicenseKey{}})
		return
	}
	var keys []models.SaaSLicenseKey
	database.DB.Order("created_at desc").Find(&keys)
	c.JSON(http.StatusOK, gin.H{"keys": keys})
}

// CreateLicenseKeyRequest thông tin tạo License Key
type CreateLicenseKeyRequest struct {
	Plan         string `json:"plan" binding:"required"`          // trial, standard, pro, enterprise
	DurationDays int    `json:"duration_days" binding:"required"` // 7, 15, 30...
	Note         string `json:"note"`
}

// CreateLicenseKey tạo mới mã kích hoạt License Key
func CreateLicenseKey(c *gin.Context) {
	var req CreateLicenseKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Thiếu gói cước hoặc số ngày"})
		return
	}

	if req.DurationDays <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Số ngày kích hoạt phải lớn hơn 0"})
		return
	}

	validPlans := map[string]bool{"trial": true, "standard": true, "pro": true, "enterprise": true}
	if !validPlans[req.Plan] {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Gói cước không hợp lệ"})
		return
	}

	// Sinh mã Key định dạng OC-[PLAN]-[DAYS]D-[RANDOM]
	randomPart := strings.ToUpper(uuid.New().String()[:8])
	keyStr := fmt.Sprintf("OC-%s-%dD-%s-%s", strings.ToUpper(req.Plan[:3]), req.DurationDays, randomPart[:4], randomPart[4:])

	maxBranches, maxDevices := database.GetPlanMaxQuotas(database.DB, req.Plan)

	newKey := models.SaaSLicenseKey{
		Key:          keyStr,
		Plan:         req.Plan,
		DurationDays: req.DurationDays,
		MaxBranches:  maxBranches,
		MaxDevices:   maxDevices,
		IsUsed:       false,
		Note:         strings.TrimSpace(req.Note),
		CreatedAt:    time.Now(),
	}

	if database.DB != nil {
		database.DB.Create(&newKey)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"key":     newKey,
		"message": fmt.Sprintf("Đã tạo Key %d ngày gói %s thành công", req.DurationDays, strings.ToUpper(req.Plan)),
	})
}

// RedeemLicenseKeyRequest thông tin kích hoạt Key cho quán
type RedeemLicenseKeyRequest struct {
	TenantID string `json:"tenant_id" binding:"required"`
	Key      string `json:"key" binding:"required"`
}

// RedeemLicenseKey kích hoạt nạp mã License Key vào quán
func RedeemLicenseKey(c *gin.Context) {
	var req RedeemLicenseKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Thiếu mã quán hoặc mã License Key"})
		return
	}

	keyStr := strings.TrimSpace(strings.ToUpper(req.Key))
	tenantID := strings.TrimSpace(req.TenantID)

	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã kích hoạt License Key"})
		return
	}

	// 1. Kiểm tra Tenant
	var tenant models.Tenant
	if err := database.DB.Where("id = ? OR subdomain = ?", tenantID, tenantID).First(&tenant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy thông tin quán"})
		return
	}

	// 2. Kiểm tra License Key
	var licenseKey models.SaaSLicenseKey
	if err := database.DB.Where("key = ?", keyStr).First(&licenseKey).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Mã License Key không tồn tại hoặc sai cú pháp"})
		return
	}

	if licenseKey.IsUsed {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Mã Key này đã được sử dụng bởi %s", licenseKey.UsedByTenantName),
		})
		return
	}

	now := time.Now()
	// 3. Tính toán ngày hết hạn mới (cộng dồn nếu quán còn hạn, tính từ now nếu đã hết hạn)
	var newExpiry time.Time
	if tenant.LicenseExpiresAt != nil && tenant.LicenseExpiresAt.After(now) {
		newExpiry = tenant.LicenseExpiresAt.AddDate(0, 0, licenseKey.DurationDays)
	} else {
		newExpiry = now.AddDate(0, 0, licenseKey.DurationDays)
	}

	tenant.LicenseExpiresAt = &newExpiry
	tenant.SubscriptionPlan = licenseKey.Plan
	tenant.IsActive = true
	tenant.UpdatedAt = now
	database.DB.Save(&tenant)

	// 4. Đánh dấu License Key đã sử dụng
	licenseKey.IsUsed = true
	licenseKey.UsedByTenantID = tenant.ID
	licenseKey.UsedByTenantName = tenant.Name
	licenseKey.UsedAt = &now
	database.DB.Save(&licenseKey)

	// 5. Ghi nhận hóa đơn SaaS Invoice
	invCode := fmt.Sprintf("INV-KEY-%s", uuid.New().String()[:8])
	invoice := models.SaaSInvoice{
		ID:            uuid.New().String(),
		TenantID:      tenant.ID,
		InvoiceCode:   invCode,
		Amount:        0, // Kích hoạt qua Key
		MonthsAdded:   int(float64(licenseKey.DurationDays) / 30.0),
		PaymentMethod: "vietqr",
		Note:          fmt.Sprintf("Kích hoạt qua mã Key %s (%d ngày gói %s)", keyStr, licenseKey.DurationDays, strings.ToUpper(licenseKey.Plan)),
		CreatedAt:     now,
	}
	database.DB.Create(&invoice)

	c.JSON(http.StatusOK, gin.H{
		"success":            true,
		"message":            fmt.Sprintf("Kích hoạt thành công! Đã cộng thêm %d ngày gói %s", licenseKey.DurationDays, strings.ToUpper(tenant.SubscriptionPlan)),
		"subscription_plan":  tenant.SubscriptionPlan,
		"license_expires_at": tenant.LicenseExpiresAt,
	})
}

// DeleteLicenseKey xóa hủy mã Key chưa sử dụng
func DeleteLicenseKey(c *gin.Context) {
	keyStr := strings.TrimSpace(strings.ToUpper(c.Param("key")))
	if database.DB == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã xóa Key"})
		return
	}

	var lk models.SaaSLicenseKey
	if err := database.DB.Where("key = ?", keyStr).First(&lk).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Không tìm thấy mã Key"})
		return
	}

	if lk.IsUsed {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Không thể xóa Key đã được kích hoạt sử dụng"})
		return
	}

	database.DB.Delete(&lk)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Đã xóa License Key thành công"})
}

