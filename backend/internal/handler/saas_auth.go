package handler

import (
	"crypto/subtle"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/auth"
	"github.com/ongchu/pos-backend/internal/service"
)

type saasLoginAttempt struct {
	Count     int
	LockUntil time.Time
}

var (
	saasAttemptMutex sync.Mutex
	saasAttempts     = make(map[string]*saasLoginAttempt)
)

const (
	MaxSaasLoginAttempts = 3
	SaasLockDuration     = 15 * time.Minute
	DefaultMasterKey     = "ongchu_saas_master_root_key_202696febcef886f40d280e4a909a3a56085"
)

type SaaSAdminLoginRequest struct {
	Username  string `json:"username" binding:"required"`
	Password  string `json:"password" binding:"required"`
	MasterKey string `json:"master_key" binding:"required"`
}

// SaaSAdminLogin xác thực Root Super Admin trên Backend với Rate Limiting và Telegram Alert
func SaaSAdminLogin(c *gin.Context) {
	clientIP := c.ClientIP()

	// 1. Kiểm tra Rate Limiting chống Brute-Force
	saasAttemptMutex.Lock()
	attempt, exists := saasAttempts[clientIP]
	now := time.Now()
	if exists && now.Before(attempt.LockUntil) {
		saasAttemptMutex.Unlock()
		remaining := int(time.Until(attempt.LockUntil).Minutes()) + 1
		c.JSON(http.StatusTooManyRequests, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Hệ thống đã khóa tạm thời do nhập sai quá %d lần. Thử lại sau %d phút.", MaxSaasLoginAttempts, remaining),
		})
		return
	}
	if exists && now.After(attempt.LockUntil) && attempt.Count >= MaxSaasLoginAttempts {
		// Hết thời gian khóa -> reset
		delete(saasAttempts, clientIP)
	}
	saasAttemptMutex.Unlock()

	var req SaaSAdminLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Vui lòng nhập đầy đủ Tài khoản, Mật khẩu và Khóa Bảo Mật Root",
		})
		return
	}

	cleanUser := strings.ToLower(strings.TrimSpace(req.Username))
	cleanPass := strings.TrimSpace(req.Password)
	cleanKey := strings.TrimSpace(req.MasterKey)

	// Lấy thông tin cấu hình từ biến môi trường VPS (Server-Side Secrets)
	expectedUser := os.Getenv("SAAS_SUPER_ADMIN_USER")
	if expectedUser == "" {
		expectedUser = "nguyenlocthanh291097"
	}
	expectedPass := os.Getenv("SAAS_SUPER_ADMIN_PASSWORD")
	if expectedPass == "" {
		expectedPass = "Danh@!26062002"
	}
	expectedKey := os.Getenv("SAAS_ADMIN_KEY")
	if expectedKey == "" {
		expectedKey = DefaultMasterKey
	}

	// 2. So khớp hằng số thời gian (Constant-time comparison chống Timing Attack)
	validUser := cleanUser == strings.ToLower(expectedUser) || cleanUser == "saas_master" || cleanUser == "admin"
	validPass := subtle.ConstantTimeCompare([]byte(cleanPass), []byte(expectedPass)) == 1
	validKey := subtle.ConstantTimeCompare([]byte(cleanKey), []byte(expectedKey)) == 1

	if !validUser || !validPass || !validKey {
		saasAttemptMutex.Lock()
		att, ok := saasAttempts[clientIP]
		if !ok {
			att = &saasLoginAttempt{Count: 0}
			saasAttempts[clientIP] = att
		}
		att.Count++
		currentFails := att.Count
		if att.Count >= MaxSaasLoginAttempts {
			att.LockUntil = now.Add(SaasLockDuration)
		}
		saasAttemptMutex.Unlock()

		// Gửi Telegram Alert báo động gian lận
		go func(ip, user string, fails int) {
			msg := fmt.Sprintf("Phát hiện nhập sai thông tin Cổng Root SaaS!\n- IP Nguồn: `%s`\n- Tài khoản nhập: `%s`\n- Số lần sai: %d/%d\n- Thiết bị: %s",
				ip, user, fails, MaxSaasLoginAttempts, c.Request.UserAgent())
			if fails >= MaxSaasLoginAttempts {
				msg += fmt.Sprintf("\n🚨 IP NÀY ĐÃ BỊ KHÓA %d PHÚT!", int(SaasLockDuration.Minutes()))
			}
			service.GlobalTelegramAlert.SendAlert("CẢNH BÁO BẢO MẬT CỔNG SAAS ROOT", msg, "danger")
		}(clientIP, req.Username, currentFails)

		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Tài khoản, mật khẩu hoặc Khóa Bảo Mật Root không chính xác",
		})
		return
	}

	// 3. Đăng nhập thành công -> Reset đếm lỗi cho IP này
	saasAttemptMutex.Lock()
	delete(saasAttempts, clientIP)
	saasAttemptMutex.Unlock()

	// Gửi Telegram thông báo Chủ Quán vào hệ thống
	go func(ip string) {
		msg := fmt.Sprintf("Chủ Dự Án đã đăng nhập thành công Cổng Quản Trị Hệ Thống SaaS!\n- IP: `%s`\n- Thời gian: %s",
			ip, time.Now().Format("15:04:05 02/01/2006"))
		service.GlobalTelegramAlert.SendAlert("THÔNG BÁO ĐĂNG NHẬP SAAS MASTER", msg, "info")
	}(clientIP)

	// Sinh Token JWT có ký số HMAC-SHA256 với Role super_admin
	claims := &auth.TokenClaims{
		UserID:      "usr_super_admin",
		Username:    "nguyenlocthanh291097",
		TenantID:    "tenant_saas",
		BranchID:    "hq_system",
		Role:        "super_admin",
		Permissions: []string{"*"},
	}
	tokens, err := auth.CreateAuthTokenPair(claims)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Không thể khởi tạo token quản trị",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   tokens.AccessToken,
		"role":    "super_admin",
		"user": gin.H{
			"id":   "usr_super_admin",
			"name": "Nguyễn Lộc Thành (Chủ Dự Án)",
			"role": "super_admin",
		},
		"tenant": gin.H{
			"id":   "tenant_saas",
			"code": "saas",
			"name": "Cổng Quản Trị Hệ Thống SaaS",
		},
	})
}
