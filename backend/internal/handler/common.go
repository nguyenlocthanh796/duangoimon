package handler

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ongchu/pos-backend/internal/database"
	"gorm.io/gorm"
)

// GetDB trả về kết nối CSDL được phân luồng chuẩn xác cho từng Quán (hỗ trợ Shard DB)
func GetDB(c *gin.Context) *gorm.DB {
	tenantID := GetTenantID(c)
	tdb := database.GetTenantDB(tenantID)
	if tdb != nil {
		return tdb
	}
	return database.DB
}

// GetTenantID trích xuất tenant_id từ context (đã xác thực), header X-Tenant-ID, hoặc query param với giá trị mặc định (nếu có).
func GetTenantID(c *gin.Context, fallback ...string) string {
	tenantID := strings.TrimSpace(c.GetString("tenant_id"))
	if tenantID == "" {
		tenantID = strings.TrimSpace(c.GetHeader("X-Tenant-ID"))
	}
	if tenantID == "" {
		tenantID = strings.TrimSpace(c.Query("tenant_id"))
	}
	if tenantID == "" && len(fallback) > 0 {
		tenantID = fallback[0]
	}
	return tenantID
}

// CanonicalTenantID chuẩn hóa mã định danh quán về dạng chuẩn (Canonical), tránh lệch giữa alias và ID
func CanonicalTenantID(t string) string {
	clean := strings.TrimSpace(strings.ToLower(t))
	if clean == "" || clean == "tenant-default" || clean == "default" || clean == "tenant_ongchu" || clean == "ongchu" {
		return "tenant_ongchu"
	}
	if clean == "quanquan" || clean == "tenant_quanquan" {
		return "tenant_quanquan"
	}
	if clean == "trabong" || clean == "tenant_tra_bong" {
		return "tenant_tra_bong"
	}
	if clean == "phoco" || clean == "tenant_cafe_pho_co" {
		return "tenant_cafe_pho_co"
	}
	if clean == "phothin" || clean == "tenant_pho_thin" {
		return "tenant_pho_thin"
	}
	if clean == "quanchebuoiangiang" || clean == "tenant_87fb90f7" || clean == "tenant_quanchebuoiangiang" {
		return "tenant_87fb90f7"
	}
	if clean == "banhmihp" || clean == "tenant_banhmi_hp" {
		return "tenant_banhmi_hp"
	}
	return clean
}

// ScopeTenant áp dụng điều kiện lọc theo tenant_id (hỗ trợ gom toàn bộ alias ongchu / tenant_ongchu / default).
func ScopeTenant(query *gorm.DB, tenantID string, col ...string) *gorm.DB {
	column := "tenant_id"
	if len(col) > 0 && col[0] != "" {
		column = col[0]
	}
	clean := strings.TrimSpace(tenantID)
	if clean == "" {
		return query
	}
	canonical := CanonicalTenantID(clean)
	if canonical == "tenant_ongchu" {
		return query.Where(column+" IN ?", []string{"tenant_ongchu", "tenant-default", "default", "ongchu", clean})
	}
	if canonical != "" {
		return query.Where(column+" IN ?", []string{canonical, clean})
	}
	return query
}

// RespondError trả về response lỗi chuẩn format {"error": message}
func RespondError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

// RespondSuccess trả về response thành công dạng JSON
func RespondSuccess(c *gin.Context, status int, data any) {
	c.JSON(status, data)
}
