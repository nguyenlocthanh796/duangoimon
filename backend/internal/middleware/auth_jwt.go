package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/auth"
)

const (
	ContextUserID      = "user_id"
	ContextUsername    = "username"
	ContextTenantID    = "tenant_id"
	ContextBranchID    = "branch_id"
	ContextRole        = "role"
	ContextPermissions = "permissions"
	ContextClaims      = "claims"
)

// JWTAuthMiddleware bắt buộc request phải có Access Token JWT hợp lệ
func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		var tokenStr string

		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && (strings.EqualFold(parts[0], "Bearer") || strings.EqualFold(parts[0], "Token")) {
				tokenStr = strings.TrimSpace(parts[1])
			} else {
				tokenStr = authHeader
			}
		}

		if tokenStr == "" {
			// Cho phép lấy token từ query param (hỗ trợ WebSocket handshake hoặc EventSource)
			tokenStr = c.Query("token")
		}

		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Yêu cầu xác thực tài khoản (Thiếu Bearer Token)",
				"code":  "UNAUTHORIZED_MISSING_TOKEN",
			})
			return
		}

		claims, err := auth.VerifyAccessToken(tokenStr)
		if err != nil {
			status := http.StatusUnauthorized
			code := "INVALID_TOKEN"
			if err == auth.ErrExpiredToken {
				code = "TOKEN_EXPIRED"
			} else if err == auth.ErrRevokedToken {
				code = "TOKEN_REVOKED"
			}
			c.AbortWithStatusJSON(status, gin.H{
				"error": "Xác thực thất bại: " + err.Error(),
				"code":  code,
			})
			return
		}

		// Ghi đè context máy chủ với TenantID thẩm quyền từ Token (Authoritative Context)
		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextUsername, claims.Username)
		c.Set(ContextTenantID, claims.TenantID)
		c.Set(ContextBranchID, claims.BranchID)
		c.Set(ContextRole, claims.Role)
		c.Set(ContextPermissions, claims.Permissions)
		c.Set(ContextClaims, claims)

		c.Next()
	}
}

// RequirePermission yêu cầu người dùng phải có quyền cụ thể trong Token Claims
func RequirePermission(requiredPerm string) gin.HandlerFunc {
	return func(c *gin.Context) {
		permsVal, exists := c.Get(ContextPermissions)
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Không tìm thấy thông tin phân quyền của tài khoản",
				"code":  "FORBIDDEN_NO_PERMISSIONS",
			})
			return
		}

		perms, ok := permsVal.([]string)
		if !ok || !auth.HasPermission(perms, requiredPerm) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Tài khoản không có quyền thực hiện tác vụ này (" + requiredPerm + ")",
				"code":  "FORBIDDEN_INSUFFICIENT_PERMISSION",
			})
			return
		}

		c.Next()
	}
}

// RequireRole yêu cầu vai trò người dùng nằm trong danh sách được phép
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get(ContextRole)
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Không có thông tin vai trò",
				"code":  "FORBIDDEN_NO_ROLE",
			})
			return
		}

		userRole, ok := roleVal.(string)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Vai trò không hợp lệ",
				"code":  "FORBIDDEN_INVALID_ROLE",
			})
			return
		}

		for _, r := range allowedRoles {
			if strings.EqualFold(r, userRole) || strings.EqualFold(userRole, "superadmin") || strings.EqualFold(userRole, "owner") {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "Vai trò '" + userRole + "' không được phép truy cập chức năng này",
			"code":  "FORBIDDEN_ROLE_RESTRICTED",
		})
	}
}

// GetAuthenticatedTenantID lấy TenantID chuẩn thẩm quyền từ Context
func GetAuthenticatedTenantID(c *gin.Context) string {
	if t, exists := c.Get(ContextTenantID); exists {
		if s, ok := t.(string); ok && s != "" {
			return s
		}
	}
	// Fallback nếu route public chưa qua JWTAuthMiddleware
	return c.GetHeader("X-Tenant-ID")
}

// GetAuthenticatedUserID lấy UserID chuẩn từ Context
func GetAuthenticatedUserID(c *gin.Context) string {
	if u, exists := c.Get(ContextUserID); exists {
		if s, ok := u.(string); ok {
			return s
		}
	}
	return ""
}
