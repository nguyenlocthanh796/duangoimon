package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"gorm.io/gorm"
)

// TenantQuotaMiddleware kiểm tra hạn bản quyền và hạn mức thiết bị của quán
func TenantQuotaMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Bỏ qua các đường dẫn công khai, hệ thống hoặc saas landlord
		path := c.Request.URL.Path
		if path == "/health" ||
			strings.HasPrefix(path, "/ws") ||
			strings.HasPrefix(path, "/api/v1/public") ||
			strings.HasPrefix(path, "/api/v1/saas") {
			c.Next()
			return
		}

		if db == nil {
			c.Next()
			return
		}

		// 1. Nhận diện Tenant ID
		tenantID := strings.TrimSpace(c.GetHeader("X-Tenant-ID"))
		if tenantID == "" {
			tenantID = strings.TrimSpace(c.Query("tenant_id"))
		}
		if tenantID == "" {
			tenantID = c.GetString("tenant_id")
		}

	// Chế độ DEV/Tương thích ngược: Nếu không truyền tenantID, dùng mặc định
	// ponytail: ENFORCE_TENANT_HEADER=1 (production) bat buoc header, tranh nham tenant
	if tenantID == "" {
		if os.Getenv("ENFORCE_TENANT_HEADER") == "1" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"success": false,
				"code":    "TENANT_REQUIRED",
				"error":   "Thiếu X-Tenant-ID",
			})
			return
		}
		tenantID = "tenant_ongchu"
	}
		// 2. Kiểm tra tồn tại và trạng thái quán
		var tenant models.Tenant
		cleanTenantKey := strings.TrimSpace(tenantID)
		trimmedPrefix := strings.TrimPrefix(cleanTenantKey, "tenant_")

		if err := db.Where("id = ? OR subdomain = ? OR subdomain = ? OR id = ? OR phone = ? OR phone = ?",
			cleanTenantKey, cleanTenantKey, trimmedPrefix, "tenant_"+cleanTenantKey, cleanTenantKey, trimmedPrefix).First(&tenant).Error; err != nil {
			// Chỉ cấp tài khoản hệ thống saas_master nếu DB chưa có
			if tenantID == "saas_master" {
				now := time.Now()
				exp := time.Date(2099, 12, 31, 23, 59, 59, 0, time.Local)
				tenant = models.Tenant{
					ID:               "saas_master",
					Name:             "OngChu SaaS Master Portal",
					Subdomain:        "saas",
					Phone:            "0392387166",
					SubscriptionPlan: "enterprise",
					LicenseExpiresAt: &exp,
					IsActive:         true,
					CreatedAt:        now,
					UpdatedAt:        now,
				}
				db.FirstOrCreate(&tenant, models.Tenant{ID: "saas_master"})
			} else {
				c.AbortWithStatusJSON(http.StatusNotFound, gin.H{
					"success": false,
					"code":    "TENANT_NOT_FOUND",
					"error":   "Quán không tồn tại trên hệ thống",
				})
				return
			}
		}

		// Kiểm tra trạng thái khóa quán
		if !tenant.IsActive {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"success": false,
				"code":    "TENANT_SUSPENDED",
				"error":   "Tài khoản quán đã bị tạm khóa. Hãy liên hệ bộ phận hỗ trợ kỹ thuật!",
			})
			return
		}

		// Kiểm tra hạn sử dụng bản quyền
		now := time.Now()
		if tenant.LicenseExpiresAt != nil && now.After(*tenant.LicenseExpiresAt) {
			c.AbortWithStatusJSON(http.StatusPaymentRequired, gin.H{
				"success": false,
				"code":    "PAYMENT_REQUIRED",
				"error":   "Gói cước của quán đã hết hạn. Hãy gia hạn gói để tiếp tục sử dụng!",
			})
			return
		}

		// 3. Kiểm tra hạn mức thiết bị kết nối (X-Device-ID)
		deviceID := strings.TrimSpace(c.GetHeader("X-Device-ID"))
		if deviceID != "" {
			var dev models.TenantDevice
			err := db.Where("tenant_id = ? AND id = ?", tenant.ID, deviceID).First(&dev).Error
			if err != nil {
				// Thiết bị chưa đăng ký -> Kiểm tra hạn mức số máy của gói cước
				var currentDevices int64
				db.Model(&models.TenantDevice{}).Where("tenant_id = ?", tenant.ID).Count(&currentDevices)

				_, maxAllowed := database.GetPlanMaxQuotas(db, tenant.SubscriptionPlan)

				if int(currentDevices) >= maxAllowed {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
						"success": false,
						"code":    "QUOTA_EXCEEDED",
						"error":   fmt.Sprintf("Gói %s chỉ cho phép tối đa %d thiết bị. Hãy nâng cấp gói cước!", strings.ToUpper(tenant.SubscriptionPlan), maxAllowed),
					})
					return
				}

				// Tự động ghi nhận thiết bị hợp lệ vào Fleet
				newDev := models.TenantDevice{
					ID:         deviceID,
					TenantID:   tenant.ID,
					BranchID:   c.GetHeader("X-Branch-ID"),
					DeviceName: "POS Device " + deviceID,
					DeviceRole: "pos",
					Platform:   "android",
					AppVersion: "v1.2.0",
					IPAddress:  c.ClientIP(),
					IsOnline:   true,
					LastActive: now,
					CreatedAt:  now,
				}
				db.Create(&newDev)
			} else {
				// Thiết bị đã có -> cập nhật nhịp tim LastActive và IP
				dev.LastActive = now
				dev.IsOnline = true
				if dev.IPAddress == "" {
					dev.IPAddress = c.ClientIP()
				}
				db.Save(&dev)
			}
		}

		// Lưu context cho các controller phía sau
		c.Set("tenant", tenant)
		c.Set("tenant_id", tenant.ID)
		c.Set("subscription_plan", tenant.SubscriptionPlan)

		c.Next()
	}
}
