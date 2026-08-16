package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"guild-loot-system/internal/api"
	"guild-loot-system/internal/config"
	"guild-loot-system/internal/database"
	"guild-loot-system/internal/api/handlers"
	"guild-loot-system/internal/models"
)

func setupTestServer(t *testing.T) (*httptest.Server, *config.Config) {
	t.Helper()
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_api.db")

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

	if err := database.SeedDatabase(db); err != nil {
		t.Fatalf("SeedDatabase failed: %v", err)
	}

	server := api.NewServer(cfg, db)
	testServer := httptest.NewServer(server.GetRouter())
	return testServer, cfg
}

func TestAPI_AuctionAndIntentWorkflow(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_workflow.db")

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
	_ = database.SeedDatabase(db)

	server := api.NewServer(cfg, db)
	ts := httptest.NewServer(server.GetRouter())
	defer ts.Close()

	// 1. Test POST /api/v1/auctions (Create Auction)
	createReq := handlers.CreateAuctionRequest{
		Title: "Molten Core Raid Loot",
	}
	body, _ := json.Marshal(createReq)

	res, err := http.Post(ts.URL+"/api/v1/auctions", "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("POST /api/v1/auctions failed: %v", err)
	}
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", res.StatusCode)
	}

	var createdAuction models.Auction
	_ = json.NewDecoder(res.Body).Decode(&createdAuction)
	res.Body.Close()

	if createdAuction.ID == 0 || createdAuction.Title != "Molten Core Raid Loot" {
		t.Errorf("Unexpected auction created: %+v", createdAuction)
	}

	// 2. Test POST /api/v1/auctions/:id/intents (Submit Intent)
	intentReq := handlers.SubmitIntentRequest{
		ItemID:   1, // Warcrown of the Fallen King (seeded)
		MemberID: 1, // Aegis Shieldwall (seeded)
	}
	body, _ = json.Marshal(intentReq)

	res, err = http.Post(ts.URL+"/api/v1/auctions/1/intents", "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("POST /api/v1/auctions/1/intents failed: %v", err)
	}
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", res.StatusCode)
	}
	res.Body.Close()

	// Duplicate Intent should return 409 Conflict
	res, err = http.Post(ts.URL+"/api/v1/auctions/1/intents", "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("POST /api/v1/auctions/1/intents failed: %v", err)
	}
	if res.StatusCode != http.StatusConflict {
		t.Fatalf("Expected 409 Conflict for duplicate intent, got %d", res.StatusCode)
	}
	res.Body.Close()

	// 3. Test POST /api/v1/auctions/:id/resolve (Resolve Auction)
	resolveReq := handlers.ResolveAuctionRequest{
		ItemID:   1,
		Quantity: 1,
	}
	body, _ = json.Marshal(resolveReq)

	res, err = http.Post(ts.URL+"/api/v1/auctions/1/resolve", "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("POST /api/v1/auctions/1/resolve failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	res.Body.Close()

	// 4. Test GET /api/v1/items/:id/rankings (Item Queue Ranking View)
	res, err = http.Get(ts.URL + "/api/v1/items/1/rankings")
	if err != nil {
		t.Fatalf("GET /api/v1/items/1/rankings failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}

	var rankings []handlers.ItemQueueRankingView
	_ = json.NewDecoder(res.Body).Decode(&rankings)
	res.Body.Close()

	if len(rankings) == 0 {
		t.Errorf("Expected non-empty queue rankings, got 0")
	}

	// 5. Test GET /api/v1/history/auctions/:id
	res, err = http.Get(ts.URL + "/api/v1/history/auctions/1")
	if err != nil {
		t.Fatalf("GET /api/v1/history/auctions/1 failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}

	var auctionHistory []handlers.AllocationHistoryView
	_ = json.NewDecoder(res.Body).Decode(&auctionHistory)
	res.Body.Close()

	if len(auctionHistory) != 1 {
		t.Errorf("Expected 1 allocation history item, got %d", len(auctionHistory))
	}

	// 6. Test GET /api/v1/history/items/:id
	res, err = http.Get(ts.URL + "/api/v1/history/items/1")
	if err != nil {
		t.Fatalf("GET /api/v1/history/items/1 failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	res.Body.Close()

	// 7. Test GET /api/v1/history/members/:id
	res, err = http.Get(ts.URL + "/api/v1/history/members/1")
	if err != nil {
		t.Fatalf("GET /api/v1/history/members/1 failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	res.Body.Close()
}
