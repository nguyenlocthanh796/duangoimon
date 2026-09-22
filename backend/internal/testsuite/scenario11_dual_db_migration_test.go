package testsuite

import (
	"os"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/ongchu/pos-backend/internal/config"
	"github.com/ongchu/pos-backend/internal/database"
	"github.com/ongchu/pos-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestScenario11_Dual_Database_Engine_And_AutoMigration(t *testing.T) {
	testDBFile := "test_offline_dual.db"
	_ = os.Remove(testDBFile)
	defer os.Remove(testDBFile)

	// 1. Kiểm tra cấu hình fallback sang SQLite khi không có PostgreSQL
	cfg := &config.Config{
		DatabaseURL: "", // Trống -> fallback SQLite
		Port:        "8080",
	}

	// Tạo DB instance SQLite độc lập để kiểm tra AutoMigrate & Seed
	db, err := gorm.Open(sqlite.Open(testDBFile), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("Failed to open standalone SQLite database: %v", err)
	}

	// 2. Kiểm tra AutoMigrate toàn bộ 25 models
	err = db.AutoMigrate(
		&models.Tenant{},
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
	)
	if err != nil {
		t.Fatalf("AutoMigrate 25 models failed: %v", err)
	}

	// 3. Kiểm tra Seed Data ban đầu
	database.SeedInitialData(db)

	var countSettings int64
	db.Model(&models.POSSettings{}).Count(&countSettings)
	if countSettings == 0 {
		t.Errorf("Expected POSSettings seeded, got %d", countSettings)
	}

	var countAreas int64
	db.Model(&models.Area{}).Count(&countAreas)
	if countAreas < 4 {
		t.Errorf("Expected at least 4 areas seeded, got %d", countAreas)
	}

	var countToppings int64
	db.Model(&models.Topping{}).Count(&countToppings)
	if countToppings < 5 {
		t.Errorf("Expected at least 5 toppings seeded, got %d", countToppings)
	}

	var countStaff int64
	db.Model(&models.Staff{}).Count(&countStaff)
	if countStaff < 3 {
		t.Errorf("Expected at least 3 staff seeded, got %d", countStaff)
	}

	var countExpenses int64
	db.Model(&models.RecurringExpense{}).Count(&countExpenses)
	if countExpenses < 3 {
		t.Errorf("Expected at least 3 recurring expenses seeded, got %d", countExpenses)
	}

	// 4. Kiểm tra InitDB không crash khi gọi
	initDbInstance := database.InitDB(cfg)
	if initDbInstance == nil {
		t.Fatalf("Expected non-nil DB instance from database.InitDB")
	}
}
