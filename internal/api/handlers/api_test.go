package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"guild-loot-system/internal/api"
	"guild-loot-system/internal/api/handlers"
	"guild-loot-system/internal/config"
	"guild-loot-system/internal/database"
	"guild-loot-system/internal/models"
	"guild-loot-system/internal/services"
)

func TestAPI_Step3EndpointsWorkflow(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_api_step3.db")

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

	// 1. Test GET /api/v1/members
	res, err := http.Get(ts.URL + "/api/v1/members")
	if err != nil {
		t.Fatalf("GET /api/v1/members failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	var members []models.GuildMember
	_ = json.NewDecoder(res.Body).Decode(&members)
	res.Body.Close()
	if len(members) != 6 {
		t.Errorf("Expected 6 seeded members, got %d", len(members))
	}

	// 2. Test GET /api/v1/items
	res, err = http.Get(ts.URL + "/api/v1/items")
	if err != nil {
		t.Fatalf("GET /api/v1/items failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	var items []models.Item
	_ = json.NewDecoder(res.Body).Decode(&items)
	res.Body.Close()
	if len(items) != 10 {
		t.Errorf("Expected 10 seeded items, got %d", len(items))
	}

	// 3. Test POST /api/v1/auctions (Create auction with 2 items)
	createReq := handlers.CreateAuctionRequest{
		Title: "Molten Core - Raid Night",
		Items: []handlers.CreateAuctionItemRequest{
			{ItemID: items[0].ID, Quantity: 2}, // Primordial Essence Qty 2
			{ItemID: items[1].ID, Quantity: 1}, // Dragon Scale Qty 1
		},
	}
	body, _ := json.Marshal(createReq)

	res, err = http.Post(ts.URL+"/api/v1/auctions", "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("POST /api/v1/auctions failed: %v", err)
	}
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", res.StatusCode)
	}
	var createdAuction models.Auction
	_ = json.NewDecoder(res.Body).Decode(&createdAuction)
	res.Body.Close()

	if len(createdAuction.AuctionItems) != 2 {
		t.Fatalf("Expected 2 auction items created, got %d", len(createdAuction.AuctionItems))
	}

	auctionItemA := createdAuction.AuctionItems[0]
	auctionItemB := createdAuction.AuctionItems[1]

	// 4. Test GET /api/v1/auctions/active
	res, err = http.Get(ts.URL + "/api/v1/auctions/active")
	if err != nil {
		t.Fatalf("GET /api/v1/auctions/active failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	var activeAuction models.Auction
	_ = json.NewDecoder(res.Body).Decode(&activeAuction)
	res.Body.Close()
	if activeAuction.ID != createdAuction.ID {
		t.Errorf("Expected active auction ID %d, got %d", createdAuction.ID, activeAuction.ID)
	}

	// 5. Test PATCH /api/v1/auction-items/:id/quantity (Update Auction Item Quantity)
	updateQtyReq := handlers.UpdateAuctionItemQuantityRequest{Quantity: 5}
	body, _ = json.Marshal(updateQtyReq)

	req, _ := http.NewRequest(http.MethodPatch, ts.URL+"/api/v1/auction-items/"+strconvFormat(auctionItemA.ID)+"/quantity", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	res, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PATCH quantity failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK for quantity update, got %d", res.StatusCode)
	}
	var updatedItemA models.AuctionItem
	_ = json.NewDecoder(res.Body).Decode(&updatedItemA)
	res.Body.Close()
	if updatedItemA.Quantity != 5 {
		t.Errorf("Expected quantity 5, got %d", updatedItemA.Quantity)
	}

	// 6. Test POST /api/v1/auction-items/:id/intents (Submit Intent to Buy)
	intentReq := handlers.SubmitItemIntentRequest{MemberID: members[0].ID} // Aeloria
	body, _ = json.Marshal(intentReq)

	res, err = http.Post(ts.URL+"/api/v1/auction-items/"+strconvFormat(auctionItemA.ID)+"/intents", "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("Submit intent failed: %v", err)
	}
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", res.StatusCode)
	}
	res.Body.Close()

	// 6. Test POST /api/v1/auction-items/:id/resolve (Resolve Item A)
	res, err = http.Post(ts.URL+"/api/v1/auction-items/"+strconvFormat(auctionItemA.ID)+"/resolve", "application/json", nil)
	if err != nil {
		t.Fatalf("Resolve item A failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	res.Body.Close()

	// 7. Test GET /api/v1/items/:id/rankings
	res, err = http.Get(ts.URL + "/api/v1/items/" + strconvFormat(items[0].ID) + "/rankings")
	if err != nil {
		t.Fatalf("GET rankings failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	res.Body.Close()

	// 8. Test GET /api/v1/history/items/:id
	res, err = http.Get(ts.URL + "/api/v1/history/items/" + strconvFormat(items[0].ID))
	if err != nil {
		t.Fatalf("GET history failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	res.Body.Close()

	// 9. Resolve Item B to test Auto-Completion of parent Auction
	intentReqB := handlers.SubmitItemIntentRequest{MemberID: members[3].ID} // Sylas
	body, _ = json.Marshal(intentReqB)
	_, _ = http.Post(ts.URL+"/api/v1/auction-items/"+strconvFormat(auctionItemB.ID)+"/intents", "application/json", bytes.NewBuffer(body))

	res, err = http.Post(ts.URL+"/api/v1/auction-items/"+strconvFormat(auctionItemB.ID)+"/resolve", "application/json", nil)
	if err != nil {
		t.Fatalf("Resolve item B failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	var resolveBRes services.ItemResolutionResult
	_ = json.NewDecoder(res.Body).Decode(&resolveBRes)
	res.Body.Close()

	if resolveBRes.AuctionStatus != models.AuctionStatusResolved {
		t.Errorf("Expected Parent Auction status RESOLVED after resolving item B, got %s", resolveBRes.AuctionStatus)
	}
}

func strconvFormat(n uint) string {
	var buf [20]byte
	i := len(buf)
	for n >= 10 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	i--
	buf[i] = byte('0' + n)
	return string(buf[i:])
}
