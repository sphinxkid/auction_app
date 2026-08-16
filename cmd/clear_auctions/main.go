package main

import (
	"log"

	"guild-loot-system/internal/config"
	"guild-loot-system/internal/database"
)

func main() {
	cfg := config.LoadConfig()
	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("InitDB failed: %v", err)
	}

	tables := []string{
		"intent_to_buys",
		"item_rank_histories",
		"allocation_histories",
		"item_queue_rankings",
		"auction_items",
		"auctions",
	}

	for _, table := range tables {
		if err := db.Exec("DELETE FROM " + table).Error; err != nil {
			log.Printf("Failed to clear table %s: %v", table, err)
		} else {
			log.Printf("Successfully cleared table %s", table)
		}
	}

	log.Println("Auction data cleared successfully. Only members, items, and classes remain.")
}
