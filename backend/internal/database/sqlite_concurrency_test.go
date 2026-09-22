package database_test

import (
	"fmt"
	"os"
	"sync"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type TestItem struct {
	ID    uint   `gorm:"primaryKey"`
	Title string `gorm:"size:100"`
	Count int
}

func TestSQLiteDSNPragmas(t *testing.T) {
	dbFile := "test_dsn_pragma.db"
	dsn := dbFile + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=synchronous(NORMAL)"
	_ = os.Remove(dbFile)
	defer os.Remove(dbFile)

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open sqlite with DSN pragma: %v", err)
	}

	var journalMode string
	db.Raw("PRAGMA journal_mode;").Scan(&journalMode)
	if journalMode != "wal" {
		t.Errorf("expected wal, got %s", journalMode)
	}

	var busyTimeout int
	db.Raw("PRAGMA busy_timeout;").Scan(&busyTimeout)
	if busyTimeout != 5000 {
		t.Errorf("expected 5000, got %d", busyTimeout)
	}
}

func TestSQLiteConcurrentWritesStress(t *testing.T) {
	dbFile := "test_concurrent_stress.db"
	dsn := dbFile + "?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=synchronous(NORMAL)"
	_ = os.Remove(dbFile)
	_ = os.Remove(dbFile + "-wal")
	_ = os.Remove(dbFile + "-shm")
	defer func() {
		_ = os.Remove(dbFile)
		_ = os.Remove(dbFile + "-wal")
		_ = os.Remove(dbFile + "-shm")
	}()

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("failed to get sqlDB: %v", err)
	}
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetMaxOpenConns(20)

	if err := db.AutoMigrate(&TestItem{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}

	var wg sync.WaitGroup
	errCh := make(chan error, 50)

	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			err := db.Transaction(func(tx *gorm.DB) error {
				item := TestItem{Title: fmt.Sprintf("Item-%d", idx), Count: idx}
				if err := tx.Create(&item).Error; err != nil {
					return err
				}
				item.Count += 1
				return tx.Save(&item).Error
			})
			if err != nil {
				errCh <- fmt.Errorf("worker %d failed: %w", idx, err)
			}
		}(i)
	}

	wg.Wait()
	close(errCh)

	var errors []error
	for err := range errCh {
		errors = append(errors, err)
	}

	if len(errors) > 0 {
		t.Fatalf("Experienced %d concurrent write errors: %v", len(errors), errors)
	}
}
