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

func setupTestDB(t *testing.T) *services.AllocationService {
	t.Helper()
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_allocation.db")

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

	return services.NewAllocationService(db)
}

func TestAllocationEngine_ExplicitRankingAndRotation(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_alloc_1.db")

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

	// 1. Seed Members (1..5)
	members := []models.GuildMember{
		{Name: "Member 1", DiscordID: "m1#0001"},
		{Name: "Member 2", DiscordID: "m2#0002"},
		{Name: "Member 3", DiscordID: "m3#0003"},
		{Name: "Member 4", DiscordID: "m4#0004"},
		{Name: "Member 5", DiscordID: "m5#0005"},
	}
	if err := db.Create(&members).Error; err != nil {
		t.Fatalf("Failed to seed members: %v", err)
	}

	// 2. Seed Item & Auction
	item := models.Item{Name: "Warcrown of the Fallen King", Description: "Raid Helm", IsRepeatable: true}
	if err := db.Create(&item).Error; err != nil {
		t.Fatalf("Failed to seed item: %v", err)
	}

	auction := models.Auction{Title: "Raid Auction #101", Status: models.AuctionStatusActive, AuctionDate: time.Now()}
	if err := db.Create(&auction).Error; err != nil {
		t.Fatalf("Failed to seed auction: %v", err)
	}

	// 3. Seed Initial ItemQueueRankings
	// Member 1: WAITING, Rank 1
	// Member 2: WAITING, Rank 2
	// Member 3: PAST_WINNER, LastWonAt = 3 days ago, Rank 3
	// Member 4: PAST_WINNER, LastWonAt = 1 day ago, Rank 4
	// (Member 5 is a NEW APPLICANT with no record)
	threeDaysAgo := time.Now().Add(-72 * time.Hour)
	oneDayAgo := time.Now().Add(-24 * time.Hour)

	initialRankings := []models.ItemQueueRanking{
		{ItemID: item.ID, MemberID: members[0].ID, Rank: 1, Status: models.QueueStatusWaiting},
		{ItemID: item.ID, MemberID: members[1].ID, Rank: 2, Status: models.QueueStatusWaiting},
		{ItemID: item.ID, MemberID: members[2].ID, Rank: 3, Status: models.QueueStatusPastWinner, LastWonAt: &threeDaysAgo},
		{ItemID: item.ID, MemberID: members[3].ID, Rank: 4, Status: models.QueueStatusPastWinner, LastWonAt: &oneDayAgo},
	}
	if err := db.Create(&initialRankings).Error; err != nil {
		t.Fatalf("Failed to seed initial rankings: %v", err)
	}

	// 4. Seed Intents for Auction #101 (Members 1, 3, 4, 5 submit intents; Member 2 does not)
	intents := []models.IntentToBuy{
		{AuctionID: auction.ID, ItemID: item.ID, MemberID: members[0].ID}, // Member 1 (Tier 1 Waiter)
		{AuctionID: auction.ID, ItemID: item.ID, MemberID: members[4].ID}, // Member 5 (Tier 2 New Applicant)
		{AuctionID: auction.ID, ItemID: item.ID, MemberID: members[2].ID}, // Member 3 (Tier 3 Past Winner, 3d ago)
		{AuctionID: auction.ID, ItemID: item.ID, MemberID: members[3].ID}, // Member 4 (Tier 3 Past Winner, 1d ago)
	}
	if err := db.Create(&intents).Error; err != nil {
		t.Fatalf("Failed to seed intents: %v", err)
	}

	// 5. Resolve Auction for Quantity N = 1
	service := services.NewAllocationService(db)
	res, err := service.ResolveAuction(auction.ID, item.ID, 1)
	if err != nil {
		t.Fatalf("ResolveAuction failed: %v", err)
	}

	// VERIFICATION 1: Quantity Allocated
	if res.AllocatedQuantity != 1 {
		t.Fatalf("Expected 1 allocated item, got %d", res.AllocatedQuantity)
	}
	if len(res.Allocations) != 1 {
		t.Fatalf("Expected 1 allocation history record, got %d", len(res.Allocations))
	}
	if res.Allocations[0].MemberID != members[0].ID {
		t.Errorf("Expected winner to be Member 1 (ID %d), got Member ID %d", members[0].ID, res.Allocations[0].MemberID)
	}

	// VERIFICATION 2: Explicit Rank Integer Sequential Ordering (1..M)
	var finalRankings []models.ItemQueueRanking
	if err := db.Where("item_id = ?", item.ID).Order("rank ASC").Find(&finalRankings).Error; err != nil {
		t.Fatalf("Failed to fetch final rankings: %v", err)
	}

	if len(finalRankings) != 5 {
		t.Fatalf("Expected 5 queue ranking records, got %d", len(finalRankings))
	}

	// Verify exact 1..M sequential ranks
	for i, r := range finalRankings {
		expectedRank := i + 1
		if r.Rank != expectedRank {
			t.Errorf("Index %d: Expected Rank %d, got %d (Member %d)", i, expectedRank, r.Rank, r.MemberID)
		}
	}

	// VERIFICATION 3: Insertion of New Applicants between Waiters and Past Winners
	// Expected Order:
	// Rank 1: Member 2 (WAITING - non-bidding waiter)
	// Rank 2: Member 5 (WAITING - new applicant inserted after waiters)
	// Rank 3: Member 3 (PAST_WINNER - oldest past winner 3d ago)
	// Rank 4: Member 4 (PAST_WINNER - past winner 1d ago)
	// Rank 5: Member 1 (PAST_WINNER - allocated winner rotated to bottom of line!)

	if finalRankings[0].MemberID != members[1].ID || finalRankings[0].Status != models.QueueStatusWaiting {
		t.Errorf("Rank 1: Expected Member 2 (WAITING), got Member %d (%s)", finalRankings[0].MemberID, finalRankings[0].Status)
	}

	if finalRankings[1].MemberID != members[4].ID || finalRankings[1].Status != models.QueueStatusWaiting {
		t.Errorf("Rank 2: Expected Member 5 (New Applicant WAITING), got Member %d (%s)", finalRankings[1].MemberID, finalRankings[1].Status)
	}

	if finalRankings[2].MemberID != members[2].ID || finalRankings[2].Status != models.QueueStatusPastWinner {
		t.Errorf("Rank 3: Expected Member 3 (PAST_WINNER 3d ago), got Member %d (%s)", finalRankings[2].MemberID, finalRankings[2].Status)
	}

	if finalRankings[3].MemberID != members[3].ID || finalRankings[3].Status != models.QueueStatusPastWinner {
		t.Errorf("Rank 4: Expected Member 4 (PAST_WINNER 1d ago), got Member %d (%s)", finalRankings[3].MemberID, finalRankings[3].Status)
	}

	// VERIFICATION 4: Rotation of Allocated Winner to Highest Rank Number (Bottom of line)
	if finalRankings[4].MemberID != members[0].ID || finalRankings[4].Status != models.QueueStatusPastWinner {
		t.Errorf("Rank 5: Expected Member 1 (Winner Rotated to Bottom), got Member %d (%s)", finalRankings[4].MemberID, finalRankings[4].Status)
	}
	if finalRankings[4].LastWonAt == nil {
		t.Errorf("Expected rotated winner Member 1 to have non-nil LastWonAt timestamp")
	}
}

func TestAllocationEngine_MultipleWinnersAllocation(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_alloc_2.db")

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

	members := []models.GuildMember{
		{Name: "Member 1", DiscordID: "m1#0001"},
		{Name: "Member 2", DiscordID: "m2#0002"},
		{Name: "Member 3", DiscordID: "m3#0003"},
	}
	_ = db.Create(&members)

	item := models.Item{Name: "Tome of Arcane Secrets", IsRepeatable: true}
	_ = db.Create(&item)

	auction := models.Auction{Title: "Raid Auction #102", Status: models.AuctionStatusActive, AuctionDate: time.Now()}
	_ = db.Create(&auction)

	// All 3 members submit intents for Quantity N = 2
	intents := []models.IntentToBuy{
		{AuctionID: auction.ID, ItemID: item.ID, MemberID: members[0].ID},
		{AuctionID: auction.ID, ItemID: item.ID, MemberID: members[1].ID},
		{AuctionID: auction.ID, ItemID: item.ID, MemberID: members[2].ID},
	}
	_ = db.Create(&intents)

	service := services.NewAllocationService(db)
	res, err := service.ResolveAuction(auction.ID, item.ID, 2)
	if err != nil {
		t.Fatalf("ResolveAuction failed: %v", err)
	}

	if res.AllocatedQuantity != 2 {
		t.Fatalf("Expected 2 allocated items, got %d", res.AllocatedQuantity)
	}

	var finalRankings []models.ItemQueueRanking
	_ = db.Where("item_id = ?", item.ID).Order("rank ASC").Find(&finalRankings)

	if len(finalRankings) != 3 {
		t.Fatalf("Expected 3 queue records, got %d", len(finalRankings))
	}

	// Verify sequential 1..3
	for i, r := range finalRankings {
		if r.Rank != i+1 {
			t.Errorf("Expected Rank %d, got %d", i+1, r.Rank)
		}
	}
}
