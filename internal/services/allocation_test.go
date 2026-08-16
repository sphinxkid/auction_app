package services_test

import (
	"path/filepath"
	"testing"
	"time"

	"guild-loot-system/internal/config"
	"guild-loot-system/internal/database"
	"guild-loot-system/internal/models"
	"guild-loot-system/internal/services"
)

func TestAllocationEngine_PerItemResolutionAndAutoCompletion(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_per_item.db")

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

	// 1. Seed Members (1..6)
	members := []models.GuildMember{
		{Name: "Aeloria", DiscordID: "aeloria#0001"},
		{Name: "Vorn", DiscordID: "vorn#0002"},
		{Name: "Kaelen", DiscordID: "kaelen#0003"},
		{Name: "Sylas", DiscordID: "sylas#0004"},
		{Name: "Morrigan", DiscordID: "morrigan#0005"},
		{Name: "Thalor", DiscordID: "thalor#0006"},
	}
	if err := db.Create(&members).Error; err != nil {
		t.Fatalf("Failed to seed members: %v", err)
	}

	// 2. Seed Items (Primordial Essence & Dragon Scale)
	itemA := models.Item{Name: "Primordial Essence", Description: "Elemental reagent", IsRepeatable: true}
	itemB := models.Item{Name: "Dragon Scale", Description: "Drake boss scale", IsRepeatable: true}
	if err := db.Create(&itemA).Error; err != nil {
		t.Fatalf("Failed to seed item A: %v", err)
	}
	if err := db.Create(&itemB).Error; err != nil {
		t.Fatalf("Failed to seed item B: %v", err)
	}

	// 3. Create Parent Auction with 2 AuctionItems
	auction := models.Auction{
		Title:       "Raid Night - Molten Core",
		Status:      models.AuctionStatusActive,
		AuctionDate: time.Now().UTC(),
	}
	if err := db.Create(&auction).Error; err != nil {
		t.Fatalf("Failed to create auction: %v", err)
	}

	auctionItemA := models.AuctionItem{
		AuctionID: auction.ID,
		ItemID:    itemA.ID,
		Quantity:  2,
		Status:    models.AuctionItemStatusPending,
	}
	auctionItemB := models.AuctionItem{
		AuctionID: auction.ID,
		ItemID:    itemB.ID,
		Quantity:  1,
		Status:    models.AuctionItemStatusPending,
	}
	if err := db.Create(&auctionItemA).Error; err != nil {
		t.Fatalf("Failed to create auction item A: %v", err)
	}
	if err := db.Create(&auctionItemB).Error; err != nil {
		t.Fatalf("Failed to create auction item B: %v", err)
	}

	// 4. Submit Intents for Item A (Aeloria, Vorn, Kaelen) and Item B (Sylas, Morrigan)
	intentsItemA := []models.IntentToBuy{
		{AuctionItemID: auctionItemA.ID, MemberID: members[0].ID}, // Aeloria
		{AuctionItemID: auctionItemA.ID, MemberID: members[1].ID}, // Vorn
		{AuctionItemID: auctionItemA.ID, MemberID: members[2].ID}, // Kaelen
	}
	intentsItemB := []models.IntentToBuy{
		{AuctionItemID: auctionItemB.ID, MemberID: members[3].ID}, // Sylas
		{AuctionItemID: auctionItemB.ID, MemberID: members[4].ID}, // Morrigan
	}
	if err := db.Create(&intentsItemA).Error; err != nil {
		t.Fatalf("Failed to create intents for item A: %v", err)
	}
	if err := db.Create(&intentsItemB).Error; err != nil {
		t.Fatalf("Failed to create intents for item B: %v", err)
	}

	service := services.NewAllocationService(db)

	// STEP A: Resolve Item A (Quantity 2)
	resA, err := service.ResolveAuctionItem(auctionItemA.ID)
	if err != nil {
		t.Fatalf("ResolveAuctionItem for Item A failed: %v", err)
	}

	if resA.AllocatedQuantity != 2 {
		t.Errorf("Expected 2 allocated items for Item A, got %d", resA.AllocatedQuantity)
	}
	if resA.AuctionItemStatus != models.AuctionItemStatusResolved {
		t.Errorf("Expected Item A status RESOLVED, got %s", resA.AuctionItemStatus)
	}
	if resA.AuctionStatus != models.AuctionStatusActive {
		t.Errorf("Expected Parent Auction status ACTIVE after resolving 1/2 items, got %s", resA.AuctionStatus)
	}
	if resA.IsAuctionFullyResolved {
		t.Errorf("Expected IsAuctionFullyResolved to be false after 1/2 items resolved")
	}

	// STEP B: Resolve Item B (Quantity 1)
	resB, err := service.ResolveAuctionItem(auctionItemB.ID)
	if err != nil {
		t.Fatalf("ResolveAuctionItem for Item B failed: %v", err)
	}

	if resB.AllocatedQuantity != 1 {
		t.Errorf("Expected 1 allocated item for Item B, got %d", resB.AllocatedQuantity)
	}
	if resB.AuctionItemStatus != models.AuctionItemStatusResolved {
		t.Errorf("Expected Item B status RESOLVED, got %s", resB.AuctionItemStatus)
	}
	if resB.AuctionStatus != models.AuctionStatusResolved {
		t.Errorf("Expected Parent Auction status RESOLVED after resolving 2/2 items, got %s", resB.AuctionStatus)
	}
	if !resB.IsAuctionFullyResolved {
		t.Errorf("Expected IsAuctionFullyResolved to be true after 2/2 items resolved")
	}

	// Verify Parent Auction Record in Database
	var updatedAuction models.Auction
	if err := db.First(&updatedAuction, auction.ID).Error; err != nil {
		t.Fatalf("Failed to fetch updated auction: %v", err)
	}
	if updatedAuction.Status != models.AuctionStatusResolved {
		t.Errorf("DB Auction status expected RESOLVED, got %s", updatedAuction.Status)
	}
}
