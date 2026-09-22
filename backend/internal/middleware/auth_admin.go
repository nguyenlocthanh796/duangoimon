package middleware

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

const DefaultSaasMasterKey = "ongchu_saas_master_root_key_202696febcef886f40d280e4a909a3a56085"

// SaaSAdminAuthMiddleware bảo vệ toàn bộ nhóm endpoint /api/v1/saas/*
// Yêu cầu Header X-Admin-Key hoặc Authorization: Bearer <SAAS_ADMIN_KEY>
func SaaSAdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		adminKey := strings.TrimSpace(os.Getenv("SAAS_ADMIN_KEY"))
		if adminKey == "" {
			adminKey = DefaultSaasMasterKey
		}

		// Lấy token từ header
		reqKey := strings.TrimSpace(c.GetHeader("X-Admin-Key"))
		if reqKey == "" {
			authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
			if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
				reqKey = strings.TrimSpace(authHeader[7:])
			} else if strings.HasPrefix(strings.ToLower(authHeader), "apikey ") {
				reqKey = strings.TrimSpace(authHeader[7:])
			}
		}

		// Constant-time comparison chống Timing Attack
		if reqKey == "" || subtle.ConstantTimeCompare([]byte(reqKey), []byte(adminKey)) != 1 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Truy cập bị từ chối: Yêu cầu khóa quản trị SaaS Admin hợp lệ",
			})
			return
		}

		c.Next()
	}
}
