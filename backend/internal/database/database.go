package database

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/ongchu/pos-backend/internal/config"
	"github.com/ongchu/pos-backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) *gorm.DB {
	var err error
	isPostgres := false

	// 1. Thử kết nối PostgreSQL nếu URL được cấu hình và không trỏ tới SQLite
	if cfg.DatabaseURL != "" && !strings.HasPrefix(cfg.DatabaseURL, "sqlite") && !strings.HasSuffix(cfg.DatabaseURL, ".db") {
		DB, err = gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err == nil {
			if sqlDB, pingErr := DB.DB(); pingErr == nil && sqlDB.Ping() == nil {
				isPostgres = true
				log.Printf("🚀 Connected to PostgreSQL database: %s", cfg.DatabaseURL)
			} else {
				log.Printf("⚠️ PostgreSQL not reachable at %s. Switching to embedded SQLite...", cfg.DatabaseURL)
			}
		} else {
			log.Printf("⚠️ PostgreSQL error at %s: %v. Switching to embedded SQLite...", cfg.DatabaseURL, err)
		}
	}

	// 2. Chế độ Dual-Engine Fallback: Chạy SQLite CGO-Free cục bộ (ongchu_pos.db)
	if !isPostgres {
		sqliteFile := "ongchu_pos.db?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=synchronous(NORMAL)"
		DB, err = gorm.Open(sqlite.Open(sqliteFile), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err != nil {
			log.Fatalf("💥 Fatal: Cannot initialize SQLite database: %v", err)
			return nil
		}
		log.Printf("💡 Active Database Engine: Pure-Go SQLite (%s) - 100%% Offline-Ready!", sqliteFile)
	}

	// Cấu hình Connection Pool siêu tốc & SQLite WAL Mode
	if sqlDB, err := DB.DB(); err == nil {
		if isPostgres {
			sqlDB.SetMaxIdleConns(10)
			sqlDB.SetMaxOpenConns(50)
			sqlDB.SetConnMaxLifetime(60 * time.Minute)
		} else {
			// ⚡ PRAGMA tối ưu hóa hiệu năng cực đại & mmap I/O cho SQLite
			DB.Exec("PRAGMA journal_mode = WAL;")
			DB.Exec("PRAGMA busy_timeout = 5000;")
			DB.Exec("PRAGMA synchronous = NORMAL;")
			DB.Exec("PRAGMA foreign_keys = ON;")
			DB.Exec("PRAGMA mmap_size = 67108864;") // 64MB Memory-Mapped I/O (0ms disk read)
			DB.Exec("PRAGMA cache_size = -2000;")    // ~2MB RAM cache page
			DB.Exec("PRAGMA temp_store = MEMORY;")   // Lưu bảng tạm trên RAM
			sqlDB.SetMaxIdleConns(5)
			sqlDB.SetMaxOpenConns(20)
			sqlDB.SetConnMaxLifetime(30 * time.Minute)
		}
	}

	// 3. Auto-Migrate toàn bộ 25 Models chuẩn Trụ cột F&B Vị Chủ Quán
	err = DB.AutoMigrate(
		&models.Tenant{},
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
		&models.SaaSInvoice{},
		&models.TenantAddonConfig{},
		&models.SaaSLicenseKey{},
		&models.SaaSPlanConfig{},
		&models.PaymentIdempotencyKey{},
	)
	if err != nil {
		log.Printf("⚠️ AutoMigrate error: %v", err)
	} else {
		log.Println("✅ AutoMigrate (29 Merchant & SaaS Models) completed successfully!")
	}

	// 4. Seed Data ban đầu nếu cơ sở dữ liệu mới khởi tạo
	SeedInitialData(DB)

	return DB
}

// SeedInitialData khởi tạo cấu hình nền tảng SaaS & Super Admin
func SeedInitialData(db *gorm.DB) {
	if db == nil {
		return
	}

	// 1. Khởi tạo Bảng giá SaaS (SaaS Plan Configs) nếu bảng còn trống
	var countPlans int64
	db.Model(&models.SaaSPlanConfig{}).Count(&countPlans)
	if countPlans == 0 {
		now := time.Now()
		planConfigs := []models.SaaSPlanConfig{
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
		for _, pc := range planConfigs {
			db.Create(&pc)
		}
	}

	// 2. Đảm bảo tài khoản Super Admin quản trị SaaS luôn tồn tại
	EnsureSuperAdmin(db)
}

// EnsureSuperAdmin đảm bảo tài khoản quản trị tối cao SaaS tồn tại nếu được cấu hình
func EnsureSuperAdmin(db *gorm.DB) {
	if db == nil {
		return
	}
	initialPass := strings.TrimSpace(os.Getenv("SUPERADMIN_INITIAL_PASSWORD"))
	adminUser := strings.TrimSpace(os.Getenv("SUPERADMIN_USERNAME"))
	if adminUser == "" {
		adminUser = "saas_admin"
	}

	var existing models.User
	err := db.Where("username = ? OR id = 'usr_saas_superadmin'", adminUser).First(&existing).Error
	if err == gorm.ErrRecordNotFound && initialPass != "" {
		hash, errHash := bcrypt.GenerateFromPassword([]byte(initialPass), 12)
		if errHash == nil {
			now := time.Now()
			newAdmin := models.User{
				ID:           "usr_saas_superadmin",
				TenantID:     "saas_master",
				Username:     adminUser,
				FullName:     "Quản Trị Viên Hệ Thống",
				Role:         "saas_admin",
				PasswordHash: string(hash),
				IsActive:     true,
				CreatedAt:    now,
				UpdatedAt:    now,
			}
			_ = db.Create(&newAdmin).Error
		}
	} else if err == nil && initialPass != "" {
		hash, errHash := bcrypt.GenerateFromPassword([]byte(initialPass), 12)
		if errHash == nil {
			_ = db.Model(&existing).Updates(map[string]interface{}{
				"password_hash": string(hash),
				"is_active":     true,
			}).Error
		}
	}
}

// GetPlanMaxQuotas truy xuất hạn mức chi nhánh và thiết bị động từ bảng saas_plan_configs.
// Nếu bảng chưa có bản ghi hoặc lỗi kết nối, fallback về mặc định an toàn.
func GetPlanMaxQuotas(db *gorm.DB, planID string) (maxBranches int, maxDevices int) {
	normPlan := strings.ToLower(strings.TrimSpace(planID))
	if db != nil && normPlan != "" {
		var cfg models.SaaSPlanConfig
		if err := db.Where("plan_id = ?", normPlan).First(&cfg).Error; err == nil {
			mb := cfg.MaxBranches
			md := cfg.MaxDevices
			if mb <= 0 {
				mb = 1
			}
			if md <= 0 {
				md = 1
			}
			return mb, md
		}
	}
	// Fallback an toàn theo thiết kế gói cước
	switch normPlan {
	case "trial":
		return 1, 1
	case "standard":
		return 1, 2
	case "pro":
		return 3, 6
	case "enterprise":
		return 9999, 9999
	default:
		return 1, 1
	}
}

