package services_test

import (
	"fmt"
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
	if resB.AuctionStatus != models.AuctionStatusActive {
		t.Errorf("Expected Parent Auction status ACTIVE before manual finalization, got %s", resB.AuctionStatus)
	}
	if !resB.IsAuctionFullyResolved {
		t.Errorf("Expected IsAuctionFullyResolved to be true after 2/2 items resolved")
	}

	// Verify Parent Auction Record remains ACTIVE until manual finalization
	var updatedAuction models.Auction
	if err := db.First(&updatedAuction, auction.ID).Error; err != nil {
		t.Fatalf("Failed to fetch updated auction: %v", err)
	}
	if updatedAuction.Status != models.AuctionStatusActive {
		t.Errorf("DB Auction status expected ACTIVE, got %s", updatedAuction.Status)
	}
}

func TestAllocationEngine_ZeroQuantityResolution(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_zero_qty.db")

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

	item := models.Item{Name: "Thunderfury", Description: "Legendary sword", IsRepeatable: true}
	_ = db.Create(&item)

	auction := models.Auction{Title: "Zero Qty Raid", Status: models.AuctionStatusActive, AuctionDate: time.Now().UTC()}
	_ = db.Create(&auction)

	// 1. Verify resolving with Quantity = 0 returns error
	auctionItemZero := models.AuctionItem{
		AuctionID: auction.ID,
		ItemID:    item.ID,
		Quantity:  0, // Zero Quantity
		Status:    models.AuctionItemStatusPending,
	}
	_ = db.Create(&auctionItemZero)

	service := services.NewAllocationService(db)
	_, err = service.ResolveAuctionItem(auctionItemZero.ID)
	if err == nil {
		t.Fatalf("Expected ResolveAuctionItem to fail for 0 qty, but it succeeded")
	}

	// 2. Verify resolving with Quantity = 1 and 0 candidates succeeds with 0 allocations
	auctionItemNoCandidates := models.AuctionItem{
		AuctionID: auction.ID,
		ItemID:    item.ID,
		Quantity:  1,
		Status:    models.AuctionItemStatusPending,
	}
	_ = db.Create(&auctionItemNoCandidates)

	res, err := service.ResolveAuctionItem(auctionItemNoCandidates.ID)
	if err != nil {
		t.Fatalf("ResolveAuctionItem failed for 0 candidates: %v", err)
	}

	if res.AllocatedQuantity != 0 {
		t.Errorf("Expected 0 allocated quantity for 0 candidates, got %d", res.AllocatedQuantity)
	}
	if res.AuctionItemStatus != models.AuctionItemStatusResolved {
		t.Errorf("Expected item status RESOLVED, got %s", res.AuctionItemStatus)
	}
}

func TestAllocationEngine_RankPreservationAndShift(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_rank_preservation.db")

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

	// Create 9 members
	members := make([]models.GuildMember, 9)
	for i := 0; i < 9; i++ {
		members[i] = models.GuildMember{Name: fmt.Sprintf("Member %d", i+1), DiscordID: fmt.Sprintf("m%d#0000", i+1)}
	}
	db.Create(&members)

	item := models.Item{Name: "Sulfuras", Description: "Hammer of Ragnaros", IsRepeatable: true}
	db.Create(&item)

	// Pre-seed 5 queue rankings:
	// Ranks 1..4: WAITING (members 1..4)
	// Rank 5: Member A (members[4]), PAST_WINNER
	now := time.Now().UTC()
	for i := 0; i < 4; i++ {
		db.Create(&models.ItemQueueRanking{
			ItemID:   item.ID,
			MemberID: members[i].ID,
			Rank:     i + 1,
			Status:   models.QueueStatusWaiting,
		})
	}
	memA := members[4]
	db.Create(&models.ItemQueueRanking{
		ItemID:    item.ID,
		MemberID:  memA.ID,
		Rank:      5,
		Status:    models.QueueStatusPastWinner,
		LastWonAt: &now,
	})

	// Create auction with Quantity = 3
	auction := models.Auction{Title: "Raid Night", Status: models.AuctionStatusActive, AuctionDate: now}
	db.Create(&auction)

	auctionItem := models.AuctionItem{
		AuctionID: auction.ID,
		ItemID:    item.ID,
		Quantity:  3,
		Status:    models.AuctionItemStatusPending,
	}
	db.Create(&auctionItem)

	// All 9 members submit intent to buy (including 4 brand new applicants: members 5..8)
	for _, m := range members {
		db.Create(&models.IntentToBuy{
			AuctionItemID: auctionItem.ID,
			MemberID:      m.ID,
			Quantity:      1,
			SubmittedAt:   now,
		})
	}

	service := services.NewAllocationService(db)
	res, err := service.ResolveAuctionItem(auctionItem.ID)
	if err != nil {
		t.Fatalf("ResolveAuctionItem failed: %v", err)
	}

	if res.AllocatedQuantity != 3 {
		t.Fatalf("Expected 3 allocated items, got %d", res.AllocatedQuantity)
	}

	// Verify Member A (memA) is now ranked #2 (since 3 members ahead won and moved to the end)!
	var memARanking models.ItemQueueRanking
	if err := db.Where("item_id = ? AND member_id = ?", item.ID, memA.ID).First(&memARanking).Error; err != nil {
		t.Fatalf("Failed to fetch Member A ranking: %v", err)
	}

	if memARanking.Rank != 2 {
		t.Errorf("Expected Member A to be ranked 2 after 3 winners resolved, got rank %d", memARanking.Rank)
	}

	if memARanking.Status != models.QueueStatusWaiting {
		t.Errorf("Expected Member A status to revert to WAITING after new auction resolution, got %s", memARanking.Status)
	}
}
