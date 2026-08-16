package database

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"guild-loot-system/internal/config"
	"guild-loot-system/internal/models"
)

// InitDB initializes the database connection pool, applies PRAGMAs, and executes auto-migrations.
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	logLevel := logger.Info
	if cfg.Environment == "production" {
		logLevel = logger.Error
	}

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	}

	db, err := gorm.Open(sqlite.Open(cfg.DBPath), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Optimize connection pool for SQLite
	sqlDB.SetMaxOpenConns(1) // SQLite write lock single writer
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Enable Foreign Key constraints and WAL mode for performance & safety
	if err := db.Exec("PRAGMA foreign_keys = ON;").Error; err != nil {
		return nil, fmt.Errorf("failed to enable foreign_keys pragma: %w", err)
	}
	if err := db.Exec("PRAGMA journal_mode = WAL;").Error; err != nil {
		log.Printf("warning: failed to set WAL mode: %v", err)
	}

	// Execute AutoMigrations for core domain models
	err = db.AutoMigrate(
		&models.GuildClass{},
		&models.GuildMember{},
		&models.Item{},
		&models.Auction{},
		&models.AuctionItem{},
		&models.IntentToBuy{},
		&models.ItemQueueRanking{},
		&models.AllocationHistory{},
		&models.ItemRankHistory{},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to run auto migrations: %w", err)
	}

	// Ensure default quantity for any existing SQLite records
	_ = db.Exec("UPDATE intent_to_buys SET quantity = 1 WHERE quantity <= 0 OR quantity IS NULL;").Error

	log.Println("Database connection established and schema auto-migrated successfully.")
	return db, nil
}

// PingDB verifies connectivity to the underlying database instance.
func PingDB(db *gorm.DB) error {
	if db == nil {
		return fmt.Errorf("database connection instance is nil")
	}
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to retrieve sql.DB handle: %w", err)
	}
	return sqlDB.Ping()
}
