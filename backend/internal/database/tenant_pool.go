package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/ongchu/pos-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	tenantPoolMu sync.RWMutex
	tenantPool   = make(map[string]*gorm.DB)
	cleanIDRegex = regexp.MustCompile(`[^a-zA-Z0-9_\-]`)
)

// SanitizeTenantID làm sạch tenant_id để dùng làm tên tệp CSDL an toàn tuyệt đối
func SanitizeTenantID(tenantID string) string {
	clean := strings.TrimSpace(strings.ToLower(tenantID))
	clean = cleanIDRegex.ReplaceAllString(clean, "_")
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
	if clean == "banhmihp" || clean == "tenant_banhmi_hp" {
		return "tenant_banhmi_hp"
	}
	return clean
}

// GetTenantDB lấy kết nối CSDL được phân luồng riêng cho từng Quán (Tenant Shard)
// ponytail: Cache thread-safe connection pool per tenant SQLite file với AutoMigrate 0ms overhead
func GetTenantDB(tenantID string) *gorm.DB {
	// Nếu hệ thống đang dùng PostgreSQL, DB master chưa khởi tạo, hoặc không bật sharding riêng: dùng DB chính
	if DB == nil || os.Getenv("ENABLE_TENANT_SHARDS") != "true" {
		return DB
	}

	cleanID := SanitizeTenantID(tenantID)
	if cleanID == "tenant_ongchu" || cleanID == "master" {
		return DB
	}

	// 1. Kiểm tra cache Connection Pool (Read Lock)
	tenantPoolMu.RLock()
	if tdb, exists := tenantPool[cleanID]; exists {
		tenantPoolMu.RUnlock()
		return tdb
	}
	tenantPoolMu.RUnlock()

	// 2. Khởi tạo Shard DB mới cho Tenant (Write Lock)
	tenantPoolMu.Lock()
	defer tenantPoolMu.Unlock()

	// Double-check sau khi nhận Write Lock
	if tdb, exists := tenantPool[cleanID]; exists {
		return tdb
	}

	// Đảm bảo thư mục lưu trữ CSDL từng quán tồn tại
	tenantsDir := filepath.Join(".", "data", "tenants")
	if err := os.MkdirAll(tenantsDir, 0755); err != nil {
		_ = os.MkdirAll("tenants", 0755)
		tenantsDir = "tenants"
	}

	dbPath := filepath.Join(tenantsDir, fmt.Sprintf("%s.db", cleanID))
	sqliteDsn := fmt.Sprintf("%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=synchronous(NORMAL)", dbPath)

	tDB, err := gorm.Open(sqlite.Open(sqliteDsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Printf("⚠️ Không thể tạo Shard DB cho tenant %s (%s): %v. Fallback về Master DB.", cleanID, dbPath, err)
		return DB
	}

	// Cấu hình PRAGMA WAL Mode & Connection Pool cho Shard DB
	if sqlDB, err := tDB.DB(); err == nil {
		tDB.Exec("PRAGMA journal_mode = WAL;")
		tDB.Exec("PRAGMA busy_timeout = 5000;")
		tDB.Exec("PRAGMA synchronous = NORMAL;")
		tDB.Exec("PRAGMA foreign_keys = ON;")
		tDB.Exec("PRAGMA mmap_size = 67108864;") // 64MB Memory-Mapped I/O
		tDB.Exec("PRAGMA cache_size = -2000;")    // ~2MB RAM cache page
		tDB.Exec("PRAGMA temp_store = MEMORY;")   // Lưu bảng tạm trên RAM
		sqlDB.SetMaxIdleConns(5)
		sqlDB.SetMaxOpenConns(15)
		sqlDB.SetConnMaxLifetime(30 * time.Minute)
	}

	// Auto-Migrate schema cho Shard DB của Quán
	_ = tDB.AutoMigrate(
		&models.TenantBranch{},
		&models.Branch{},
		&models.User{},
		&models.Category{},
		&models.Product{},
		&models.Ingredient{},
		&models.RecipeItem{},
		&models.Area{},
		&models.DiningTable{},
		&models.Topping{},
		&models.Order{},
		&models.OrderItem{},
		&models.CashTransaction{},
		&models.CashShift{},
		&models.AuditLog{},
		&models.POSSettings{},
		&models.Customer{},
		&models.Vendor{},
		&models.PurchaseOrder{},
		&models.PurchaseOrderItem{},
		&models.InventoryAdjustment{},
		&models.Staff{},
		&models.StaffShift{},
		&models.StaffAdvance{},
		&models.StaffPayroll{},
		&models.RecurringExpense{},
		&models.TenantDevice{},
	)

	log.Printf("🏛️ Đã kích hoạt Shard Database riêng cho Quán [%s] -> %s (WAL Mode)", cleanID, dbPath)
	tenantPool[cleanID] = tDB
	return tDB
}

// CloseAllTenantDBs đóng an toàn toàn bộ connection pools khi tắt server
func CloseAllTenantDBs() {
	tenantPoolMu.Lock()
	defer tenantPoolMu.Unlock()

	for tenantID, tdb := range tenantPool {
		if sqlDB, err := tdb.DB(); err == nil {
			_ = sqlDB.Close()
		}
		delete(tenantPool, tenantID)
	}
}
