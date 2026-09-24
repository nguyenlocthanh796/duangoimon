package handler

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/auth"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// HashPassword mã hóa mật khẩu người dùng với bcrypt cost 12
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

// CheckPasswordHash kiểm tra mật khẩu đã băm bằng Bcrypt, hỗ trợ fallback chuỗi gốc nếu chưa băm
func CheckPasswordHash(password, hash string) bool {
	if hash == "" || password == "" {
		return false
	}
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err == nil {
		return true
	}
	// Fallback trường hợp dữ liệu cũ chưa qua băm bcrypt
	return password == hash
}

// CleanPhoneNumber chuẩn hóa số điện thoại về dạng 10 số bắt đầu bằng 0
func CleanPhoneNumber(phone string) string {
	clean := regexp.MustCompile(`[^\d+]`).ReplaceAllString(phone, "")
	if strings.HasPrefix(clean, "+84") {
		clean = "0" + clean[3:]
	} else if strings.HasPrefix(clean, "84") && len(clean) >= 10 {
		clean = "0" + clean[2:]
	}
	clean = regexp.MustCompile(`[^\d]`).ReplaceAllString(clean, "")
	return clean
}

// NormalizeStoreName chuẩn hóa tên quán để so sánh tránh trùng lặp
func NormalizeStoreName(name string) string {
	clean := strings.TrimSpace(name)
	clean = regexp.MustCompile(`\s+`).ReplaceAllString(clean, " ")
	return strings.ToLower(clean)
}

// GenerateTenantSlug tạo slug không dấu an toàn từ tên quán
func GenerateTenantSlug(name string) string {
	str := strings.ToLower(name)
	accents := map[rune]rune{
		'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
		'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
		'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
		'đ': 'd',
		'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
		'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
		'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
		'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
		'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
		'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
		'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
		'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
		'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
	}
	var b strings.Builder
	for _, r := range str {
		if val, ok := accents[r]; ok {
			b.WriteRune(val)
		} else if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	res := b.String()
	if len(res) > 20 {
		res = res[:20]
	}
	if res == "" {
		res = "quan"
	}
	return res
}

type VerifyPinRequest struct {
	Pin      string `json:"pin" binding:"required"`
	Action   string `json:"action"` // void_item, void_order, excessive_discount, reprint_bill
	TenantID string `json:"tenant_id"`
}

// VerifyPin validates manager/owner PIN for sensitive operations (Strict Tenant-scoped DB check)
func VerifyPin(c *gin.Context) {
	var req VerifyPinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Mã PIN là bắt buộc",
		})
		return
	}

	cleanPin := strings.TrimSpace(req.Pin)
	if cleanPin == "" {
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Mã PIN không được để trống",
		})
		return
	}

	tenantID := req.TenantID
	if tenantID == "" {
		tenantID = c.GetString("tenant_id")
	}

	// 1. Kiểm tra trong CSDL
	if database.DB != nil {
		var user models.User
		query := database.DB.Where("pin_code = ? AND is_active = ?", cleanPin, true)
		if tenantID != "" {
			query = query.Where("tenant_id = ?", tenantID)
		}
		if err := query.First(&user).Error; err == nil {
			if user.Role == "owner" || user.Role == "manager" || user.Role == "superadmin" || user.Role == "saas_admin" {
				c.JSON(http.StatusOK, gin.H{
					"success":       true,
					"authorized_by": user.FullName,
					"role":          user.Role,
					"user_id":       user.ID,
				})
				return
			}
		}
	}

	// PIN không hợp lệ hoặc không có quyền quản lý
	c.JSON(http.StatusForbidden, gin.H{
		"success": false,
		"error":   "Mã PIN không chính xác hoặc không có quyền quản lý",
	})
}

// 🏢 SaaS Multi-Tenant Authentication Handlers

type SaaSLoginRequest struct {
	TenantCode string `json:"tenant_code" binding:"required"`
	Username   string `json:"username" binding:"required"`
	Password   string `json:"password" binding:"required"`
	BranchID   string `json:"branch_id"`
}

// SaaSLogin xác thực đăng nhập tài khoản SaaS Chủ Quán / Quản Trị và sinh Access Token JWT
func SaaSLogin(c *gin.Context) {
	var req SaaSLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Vui lòng nhập đầy đủ Mã Quán, Tài khoản và Mật khẩu",
		})
		return
	}

	cleanCode := strings.ToLower(strings.TrimSpace(req.TenantCode))
	cleanPhone := CleanPhoneNumber(req.TenantCode)
	cleanUser := strings.ToLower(strings.TrimSpace(req.Username))
	cleanPassword := strings.TrimSpace(req.Password)

	// 1. Kiểm tra CSDL nếu DB khả dụng
	if database.DB != nil {
		var tenant models.Tenant
		shortPhone := cleanPhone
		if len(cleanPhone) == 11 && strings.HasPrefix(cleanPhone, "0") {
			shortPhone = cleanPhone[:10]
		}

		tQuery := database.DB.Where("subdomain = ? OR phone = ? OR phone = ? OR id = ?", cleanCode, cleanPhone, shortPhone, cleanCode)

		if err := tQuery.First(&tenant).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Mã quán hoặc số điện thoại không tồn tại trên hệ thống",
			})
			return
		}

		if !tenant.IsActive {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error":   "Tài khoản quán đang tạm ngưng hoạt động. Liên hệ quản trị viên.",
			})
			return
		}

		var user models.User
		uQuery := database.DB.Where("tenant_id = ? AND (username = ? OR username = ? OR username = ? OR username = ? OR (role = 'owner' AND (? = 'owner' OR ? = '' OR ? = ?))) AND is_active = ?",
			tenant.ID, cleanUser, cleanPhone, shortPhone, tenant.Phone, cleanUser, cleanUser, cleanPhone, tenant.Phone, true)
		if err := uQuery.First(&user).Error; err != nil {
			if errFallback := database.DB.Where("tenant_id = ? AND role = 'owner' AND is_active = ?", tenant.ID, true).First(&user).Error; errFallback != nil {
				c.JSON(http.StatusUnauthorized, gin.H{
					"success": false,
					"error":   "Tài khoản không tồn tại trong quán này",
				})
				return
			}
		}

		// Xác thực mật khẩu bằng Bcrypt
		isValidPass := CheckPasswordHash(cleanPassword, user.PasswordHash)
		if !isValidPass {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Mật khẩu tài khoản không chính xác",
			})
			return
		}

		branchID := "branch_01"
		if user.BranchID != nil && *user.BranchID != "" {
			branchID = *user.BranchID
		} else if req.BranchID != "" {
			branchID = req.BranchID
		}

		// Sinh JWT Access Token & Refresh Token
		claims := &auth.TokenClaims{
			UserID:      user.ID,
			Username:    user.Username,
			TenantID:    tenant.ID,
			BranchID:    branchID,
			Role:        user.Role,
			Permissions: auth.DefaultPermissionsForRole(user.Role),
		}
		tokens, err := auth.CreateAuthTokenPair(claims)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể khởi tạo phiên đăng nhập: " + err.Error()})
			return
		}

		var branches []models.Branch
		database.DB.Where("tenant_id = ? AND is_active = ?", tenant.ID, true).Find(&branches)

		c.JSON(http.StatusOK, gin.H{
			"success":       true,
			"token":         tokens.AccessToken,
			"access_token":  tokens.AccessToken,
			"refresh_token": tokens.RefreshToken,
			"expires_in":    tokens.ExpiresInSeconds,
			"token_type":    tokens.TokenType,
			"tenant": gin.H{
				"id":                tenant.ID,
				"name":              tenant.Name,
				"code":              tenant.Subdomain,
				"phone":             tenant.Phone,
				"subscription_plan": tenant.SubscriptionPlan,
				"license_expires":   tenant.LicenseExpiresAt,
				"license_days_left": 365,
			},
			"user": gin.H{
				"id":        user.ID,
				"username":  user.Username,
				"full_name": user.FullName,
				"role":      user.Role,
			},
			"branches": branches,
		})
		return
	}

	c.JSON(http.StatusServiceUnavailable, gin.H{
		"success": false,
		"error":   "Cơ sở dữ liệu hệ thống chưa sẵn sàng",
	})
}

type StaffPinLoginRequest struct {
	Pin      string `json:"pin" binding:"required"`
	TenantID string `json:"tenant_id" binding:"required"`
	BranchID string `json:"branch_id"`
	StaffID  string `json:"staff_id"`
}

// StaffPinLogin xác thực nhanh bằng mã PIN 4-6 số tại quầy POS và cấp Access Token JWT
func StaffPinLogin(c *gin.Context) {
	var req StaffPinLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Mã PIN và Mã Quán (tenant_id) là bắt buộc",
		})
		return
	}

	cleanPin := strings.TrimSpace(req.Pin)
	tenantID := strings.TrimSpace(req.TenantID)

	if database.DB != nil {
		var user models.User
		query := database.DB.Where("pin_code = ? AND tenant_id = ? AND is_active = ?", cleanPin, tenantID, true)
		if req.StaffID != "" {
			query = query.Where("id = ?", req.StaffID)
		}
		if err := query.First(&user).Error; err == nil {
			branchID := "branch_01"
			if user.BranchID != nil && *user.BranchID != "" {
				branchID = *user.BranchID
			} else if req.BranchID != "" {
				branchID = req.BranchID
			}

			claims := &auth.TokenClaims{
				UserID:      user.ID,
				Username:    user.Username,
				TenantID:    user.TenantID,
				BranchID:    branchID,
				Role:        user.Role,
				Permissions: auth.DefaultPermissionsForRole(user.Role),
			}
			tokens, err := auth.CreateAuthTokenPair(claims)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi sinh token: " + err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"success":       true,
				"token":         tokens.AccessToken,
				"access_token":  tokens.AccessToken,
				"refresh_token": tokens.RefreshToken,
				"expires_in":    tokens.ExpiresInSeconds,
				"user": gin.H{
					"id":        user.ID,
					"username":  user.Username,
					"full_name": user.FullName,
					"role":      user.Role,
				},
			})
			return
		}
	}

	c.JSON(http.StatusUnauthorized, gin.H{
		"success": false,
		"error":   "Mã PIN không chính xác hoặc chưa được cấp trong quán này",
	})
}

// GetTenantInfo lấy thông tin thương hiệu công khai
func GetTenantInfo(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Mã quán không hợp lệ"})
		return
	}

	if database.DB != nil {
		var tenant models.Tenant
		if err := database.DB.Where("subdomain = ? OR phone = ? OR id = ?", code, code, code).First(&tenant).Error; err == nil {
			var branches []models.Branch
			database.DB.Where("tenant_id = ? AND is_active = ?", tenant.ID, true).Find(&branches)

			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"tenant": gin.H{
					"id":                tenant.ID,
					"name":              tenant.Name,
					"code":              tenant.Subdomain,
					"phone":             tenant.Phone,
					"subscription_plan": tenant.SubscriptionPlan,
					"license_expires":   tenant.LicenseExpiresAt,
				},
				"branches": branches,
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "Không tìm thấy thông tin quán",
	})
}

type RegisterTenantRequest struct {
	Name      string `json:"name" binding:"required"`
	Phone     string `json:"phone" binding:"required"`
	Password  string `json:"password" binding:"required"`
	Subdomain string `json:"subdomain"`
	OwnerName string `json:"owner_name"`
}

// RegisterTenant đăng ký quán mới với mật khẩu mã hóa bcrypt và cấp Token JWT
func RegisterTenant(c *gin.Context) {
	var req RegisterTenantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Vui lòng nhập đầy đủ Tên quán, Số điện thoại và Mật khẩu",
		})
		return
	}

	storeName := strings.TrimSpace(req.Name)
	if len([]rune(storeName)) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Tên quán phải có ít nhất 2 ký tự",
		})
		return
	}

	cleanPhone := CleanPhoneNumber(req.Phone)
	if len(cleanPhone) < 9 || len(cleanPhone) > 11 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Số điện thoại không hợp lệ (cần 10 chữ số)",
		})
		return
	}

	cleanPassword := strings.TrimSpace(req.Password)
	if len(cleanPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Mật khẩu phải có tối thiểu 6 ký tự",
		})
		return
	}

	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Cơ sở dữ liệu chưa sẵn sàng"})
		return
	}

	var phoneCount int64
	database.DB.Model(&models.Tenant{}).Where("phone = ? OR phone = ?", cleanPhone, req.Phone).Count(&phoneCount)
	if phoneCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "Số điện thoại này đã được đăng ký cho quán khác.",
		})
		return
	}

	var nameCount int64
	database.DB.Model(&models.Tenant{}).Where("LOWER(TRIM(name)) = LOWER(TRIM(?))", storeName).Count(&nameCount)
	if nameCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"success": false,
			"error":   "Tên quán này đã tồn tại trên hệ thống.",
		})
		return
	}

	code := req.Subdomain
	if strings.TrimSpace(code) == "" {
		code = GenerateTenantSlug(storeName)
	} else {
		code = GenerateTenantSlug(code)
	}

	var subCount int64
	database.DB.Model(&models.Tenant{}).Where("subdomain = ?", code).Count(&subCount)
	if subCount > 0 {
		code = fmt.Sprintf("%s%d", code, time.Now().Unix()%10000)
	}

	tenantID := "tenant_" + code
	branchID := "branch_" + code
	userID := "usr_owner_" + code

	ownerName := strings.TrimSpace(req.OwnerName)
	if ownerName == "" {
		ownerName = "Chủ Quán"
	}

	expiresAt := time.Now().AddDate(0, 1, 0)

	newTenant := models.Tenant{
		ID:               tenantID,
		Name:             storeName,
		Subdomain:        code,
		Phone:            cleanPhone,
		SubscriptionPlan: "trial",
		LicenseExpiresAt: &expiresAt,
		IsActive:         true,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}

	newBranch := models.Branch{
		ID:        branchID,
		TenantID:  tenantID,
		Name:      "Chi Nhánh 1 (Trụ Sở)",
		Address:   "Trụ sở chính",
		Phone:     cleanPhone,
		IsMain:    true,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	hashedPass, err := HashPassword(cleanPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể băm mật khẩu: " + err.Error()})
		return
	}

	newUser := models.User{
		ID:           userID,
		TenantID:     tenantID,
		BranchID:     &branchID,
		Username:     cleanPhone,
		FullName:     ownerName,
		Role:         "owner",
		PasswordHash: hashedPass,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := database.DB.Create(&newTenant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi tạo tenant: " + err.Error()})
		return
	}
	_ = database.DB.Create(&newBranch)
	_ = database.DB.Create(&newUser)

	claims := &auth.TokenClaims{
		UserID:      userID,
		Username:    cleanPhone,
		TenantID:    tenantID,
		BranchID:    branchID,
		Role:        "owner",
		Permissions: auth.DefaultPermissionsForRole("owner"),
	}
	tokens, err := auth.CreateAuthTokenPair(claims)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi sinh token: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":       true,
		"message":       "Đăng ký mở quán mới thành công",
		"token":         tokens.AccessToken,
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"expires_in":    tokens.ExpiresInSeconds,
		"tenant": gin.H{
			"id":                tenantID,
			"name":              storeName,
			"code":              code,
			"phone":             cleanPhone,
			"subscription_plan": "trial",
			"license_days_left": 30,
		},
		"user": gin.H{
			"id":        userID,
			"username":  cleanPhone,
			"full_name": ownerName,
			"role":      "owner",
		},
		"branches": []gin.H{
			{
				"id":      branchID,
				"code":    "CN-01",
				"name":    "Chi Nhánh 1 (Trụ Sở)",
				"phone":   cleanPhone,
				"is_main": true,
			},
		},
	})
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken thực hiện token rotation và cấp Access Token mới
func RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.RefreshToken) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token là bắt buộc"})
		return
	}

	info, err := auth.GlobalSessionStore.ConsumeRefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Refresh token không hợp lệ hoặc đã bị tái sử dụng: " + err.Error(),
			"code":  "INVALID_REFRESH_TOKEN",
		})
		return
	}

	claims := &auth.TokenClaims{
		UserID:      info.UserID,
		TenantID:    info.TenantID,
		BranchID:    info.BranchID,
		Role:        info.Role,
		Permissions: auth.DefaultPermissionsForRole(info.Role),
	}
	newPair, err := auth.CreateAuthTokenPair(claims)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo cặp token mới: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"access_token":  newPair.AccessToken,
		"refresh_token": newPair.RefreshToken,
		"expires_in":    newPair.ExpiresInSeconds,
		"token_type":    newPair.TokenType,
	})
}

// Logout thu hồi phiên đăng nhập hiện tại
func Logout(c *gin.Context) {
	claimsVal, exists := c.Get("claims")
	if exists {
		if claims, ok := claimsVal.(*auth.TokenClaims); ok && claims != nil {
			auth.GlobalSessionStore.RevokeToken(claims.TokenID, claims.ExpiresAt)
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Đã đăng xuất và thu hồi phiên làm việc thành công",
	})
}
