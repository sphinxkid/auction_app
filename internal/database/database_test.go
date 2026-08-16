package database_test

import (
	"path/filepath"
	"testing"

	"guild-loot-system/internal/config"
	"guild-loot-system/internal/database"
	"guild-loot-system/internal/models"
)

func TestInitDBAndSeeder(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_guild_loot.db")

	cfg := &config.Config{
		ServerAddress: "127.0.0.1:8080",
		DBDriver:      "sqlite",
		DBPath:        dbPath,
		Environment:   "test",
	}

	db, err := database.InitDB(cfg)
	if err != nil {
		t.Fatalf("InitDB failed: %v", err)
	}

	if err := database.PingDB(db); err != nil {
		t.Fatalf("PingDB failed: %v", err)
	}

	// Test Seeder
	if err := database.SeedDatabase(db); err != nil {
		t.Fatalf("SeedDatabase failed: %v", err)
	}

	var memberCount int64
	if err := db.Model(&models.GuildMember{}).Count(&memberCount).Error; err != nil {
		t.Fatalf("Failed to count members: %v", err)
	}
	if memberCount != 5 {
		t.Errorf("Expected 5 seeded members, got %d", memberCount)
	}

	var itemCount int64
	if err := db.Model(&models.Item{}).Count(&itemCount).Error; err != nil {
		t.Fatalf("Failed to count items: %v", err)
	}
	if itemCount != 3 {
		t.Errorf("Expected 3 seeded items, got %d", itemCount)
	}
}
