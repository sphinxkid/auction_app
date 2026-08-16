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

	// 0. Test GET /api/v1/classes
	classRes, err := http.Get(ts.URL + "/api/v1/classes")
	if err != nil {
		t.Fatalf("GET /api/v1/classes failed: %v", err)
	}
	if classRes.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", classRes.StatusCode)
	}
	var classes []models.GuildClass
	_ = json.NewDecoder(classRes.Body).Decode(&classes)
	classRes.Body.Close()
	if len(classes) != 9 {
		t.Errorf("Expected 9 seeded classes, got %d", len(classes))
	}

	// 0b. Test POST /api/v1/classes
	newClassReq := handlers.CreateClassRequest{Name: "Death Knight"}
	cBody, _ := json.Marshal(newClassReq)
	postCRes, err := http.Post(ts.URL+"/api/v1/classes", "application/json", bytes.NewBuffer(cBody))
	if err != nil || postCRes.StatusCode != http.StatusCreated {
		t.Fatalf("POST /api/v1/classes failed: %v", err)
	}
	postCRes.Body.Close()

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
	if len(members) != 16 {
		t.Errorf("Expected 16 seeded members, got %d", len(members))
	}

	// 1b. Test POST /api/v1/members with ClassID & GvGBuild
	warrClassID := classes[0].ID
	newMemReq := handlers.CreateMemberRequest{
		Name:      "Thrall",
		DiscordID: "thrall#9999",
		ClassID:   &warrClassID,
		GvGBuild:  "Shaman Burst / Windfury Spec",
	}
	memBody, _ := json.Marshal(newMemReq)
	postMemRes, err := http.Post(ts.URL+"/api/v1/members", "application/json", bytes.NewBuffer(memBody))
	if err != nil {
		t.Fatalf("POST /api/v1/members failed: %v", err)
	}
	if postMemRes.StatusCode != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", postMemRes.StatusCode)
	}
	postMemRes.Body.Close()

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
	if len(items) != 6 {
		t.Errorf("Expected 6 seeded items, got %d", len(items))
	}

	// 2b. Test POST /api/v1/items (Create new raid item)
	newItemReq := handlers.CreateItemRequest{
		Name:         "Atiesh, Greatstaff of the Guardian",
		Description:  "Legendary staff of Medivh.",
		IsRepeatable: true,
	}
	itemBody, _ := json.Marshal(newItemReq)
	postItemRes, err := http.Post(ts.URL+"/api/v1/items", "application/json", bytes.NewBuffer(itemBody))
	if err != nil {
		t.Fatalf("POST /api/v1/items failed: %v", err)
	}
	if postItemRes.StatusCode != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", postItemRes.StatusCode)
	}
	postItemRes.Body.Close()

	// 3. Test POST /api/v1/auctions (Create auction with 2 items)
	createReq := handlers.CreateAuctionRequest{
		Title:       "Molten Core - Raid Night",
		AuctionDate: "2026-08-16",
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

	if resolveBRes.AuctionStatus != models.AuctionStatusActive {
		t.Errorf("Expected Parent Auction status ACTIVE before finalization, got %s", resolveBRes.AuctionStatus)
	}

	// 10. Test POST /api/v1/auctions/:id/finalize
	finRes, err := http.Post(ts.URL+"/api/v1/auctions/"+strconvFormat(createdAuction.ID)+"/finalize", "application/json", nil)
	if err != nil || finRes.StatusCode != http.StatusOK {
		t.Fatalf("POST /api/v1/auctions/:id/finalize failed: %v", err)
	}
	var finalizedAuction models.Auction
	_ = json.NewDecoder(finRes.Body).Decode(&finalizedAuction)
	finRes.Body.Close()

	if finalizedAuction.Status != models.AuctionStatusResolved {
		t.Errorf("Expected finalized auction status RESOLVED, got %s", finalizedAuction.Status)
	}

	// 10. Test GET /api/v1/history/ranks/items/:id
	res, err = http.Get(ts.URL + "/api/v1/history/ranks/items/" + strconvFormat(items[0].ID))
	if err != nil {
		t.Fatalf("GET rank history failed: %v", err)
	}
	if res.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", res.StatusCode)
	}
	var rankHistory []handlers.ItemRankHistoryView
	_ = json.NewDecoder(res.Body).Decode(&rankHistory)
	res.Body.Close()
	if len(rankHistory) == 0 {
		t.Errorf("Expected recorded rank history snapshots, got 0")
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
