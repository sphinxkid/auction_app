package main

import (
	"log"

	"guild-loot-system/internal/api"
	"guild-loot-system/internal/config"
	"guild-loot-system/internal/database"
)

func main() {
	log.Println("Starting Guild Loot Queueing & Allocation API...")

	// 1. Load Configuration
	cfg := config.LoadConfig()

	// 2. Initialize Database Connection & Auto-Migrations
	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("Fatal: Database initialization failed: %v", err)
	}

	// 3. Seed Initial Guild Members & Raid Items
	if err := database.SeedDatabase(db); err != nil {
		log.Fatalf("Fatal: Database seeding failed: %v", err)
	}

	// 4. Instantiate & Launch HTTP Server
	server := api.NewServer(cfg, db)
	if err := server.Start(); err != nil {
		log.Fatalf("Fatal: Server failed to start: %v", err)
	}
}
