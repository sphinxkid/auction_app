package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"

	"guild-loot-system/internal/models"
	"guild-loot-system/internal/services"
)

// GetClassesHandler handles GET /api/v1/classes
func GetClassesHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var classes []models.GuildClass
		if err := db.Order("id ASC").Find(&classes).Error; err != nil {
			http.Error(w, `{"error":"failed to fetch guild classes"}`, http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(classes)
	}
}

type CreateClassRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

// CreateClassHandler handles POST /api/v1/classes
func CreateClassHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var req CreateClassRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}
		if req.Name == "" {
			http.Error(w, `{"error":"class name is required"}`, http.StatusBadRequest)
			return
		}
		color := req.Color
		if color == "" {
			color = "#A855F7"
		}
		gc := models.GuildClass{
			Name:  req.Name,
			Color: color,
		}
		if err := db.Create(&gc).Error; err != nil {
			http.Error(w, `{"error":"failed to create guild class or class name already exists"}`, http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(gc)
	}
}

// GetMembersHandler handles GET /api/v1/members
func GetMembersHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var members []models.GuildMember
		if err := db.Preload("Class").Order("id ASC").Find(&members).Error; err != nil {
			http.Error(w, `{"error":"failed to fetch members"}`, http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(members)
	}
}

type CreateMemberRequest struct {
	Name      string `json:"name"`
	DiscordID string `json:"discord_id"`
	ClassID   *uint  `json:"class_id"`
	GvGBuild  string `json:"gvg_build"`
}

// CreateMemberHandler handles POST /api/v1/members
func CreateMemberHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req CreateMemberRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		if req.Name == "" || req.DiscordID == "" {
			http.Error(w, `{"error":"name and discord_id are required"}`, http.StatusBadRequest)
			return
		}

		member := models.GuildMember{
			Name:      req.Name,
			DiscordID: req.DiscordID,
			ClassID:   req.ClassID,
			GvGBuild:  req.GvGBuild,
		}

		if err := db.Create(&member).Error; err != nil {
			http.Error(w, `{"error":"failed to create guild member or discord_id already exists"}`, http.StatusBadRequest)
			return
		}

		_ = db.Preload("Class").First(&member, member.ID)

		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(member)
	}
}

// GetItemsHandler handles GET /api/v1/items
func GetItemsHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var items []models.Item
		if err := db.Order("id ASC").Find(&items).Error; err != nil {
			http.Error(w, `{"error":"failed to fetch items"}`, http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(items)
	}
}

type CreateItemRequest struct {
	Name         string `json:"name"`
	Description  string `json:"description"`
	IsRepeatable bool   `json:"is_repeatable"`
}

// CreateItemHandler handles POST /api/v1/items
func CreateItemHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req CreateItemRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		if req.Name == "" {
			http.Error(w, `{"error":"item name is required"}`, http.StatusBadRequest)
			return
		}

		item := models.Item{
			Name:         req.Name,
			Description:  req.Description,
			IsRepeatable: req.IsRepeatable,
		}

		if err := db.Create(&item).Error; err != nil {
			http.Error(w, `{"error":"failed to create item"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(item)
	}
}

// CreateAuctionItemRequest inside CreateAuctionRequest
type CreateAuctionItemRequest struct {
	ItemID   uint `json:"item_id"`
	Quantity int  `json:"quantity"`
}

// CreateAuctionRequest payload
type CreateAuctionRequest struct {
	Title       string                     `json:"title"`
	AuctionDate string                     `json:"auction_date"`
	Items       []CreateAuctionItemRequest `json:"items"`
}

// CreateAuctionHandler handles POST /api/v1/auctions
func CreateAuctionHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var req CreateAuctionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
			return
		}

		if req.Title == "" {
			http.Error(w, `{"error":"title is required"}`, http.StatusBadRequest)
			return
		}

		if len(req.Items) == 0 {
			http.Error(w, `{"error":"at least one auction item is required"}`, http.StatusBadRequest)
			return
		}

		auctionDate := time.Now().UTC()
		if req.AuctionDate != "" {
			if parsed, err := time.Parse(time.RFC3339, req.AuctionDate); err == nil {
				auctionDate = parsed
			} else if parsedDate, err := time.Parse("2006-01-02T15:04", req.AuctionDate); err == nil {
				auctionDate = parsedDate
			} else if parsedDateOnly, err := time.Parse("2006-01-02", req.AuctionDate); err == nil {
				auctionDate = parsedDateOnly
			}
		}

		var createdAuction models.Auction
		err := db.Transaction(func(tx *gorm.DB) error {
			auction := models.Auction{
				Title:       req.Title,
				Status:      models.AuctionStatusActive,
				AuctionDate: auctionDate,
			}

			if err := tx.Create(&auction).Error; err != nil {
				return err
			}

			for _, itemReq := range req.Items {
				qty := itemReq.Quantity
				if qty < 0 {
					qty = 0
				}

				auctionItem := models.AuctionItem{
					AuctionID: auction.ID,
					ItemID:    itemReq.ItemID,
					Quantity:  qty,
					Status:    models.AuctionItemStatusPending,
				}
				if err := tx.Create(&auctionItem).Error; err != nil {
					return err
				}
			}

			// Preload for response
			if err := tx.Preload("AuctionItems.Item").Preload("AuctionItems.Intents.Member.Class").First(&createdAuction, auction.ID).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(createdAuction)
	}
}

// GetActiveAuctionHandler handles GET /api/v1/auctions/active
func GetActiveAuctionHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		var auction models.Auction
		err := db.Preload("AuctionItems.Item").
			Preload("AuctionItems.Intents.Member.Class").
			Where("status = ?", models.AuctionStatusActive).
			Order("auction_date DESC").
			First(&auction).Error

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Return 200 OK with null if no active auction
				w.WriteHeader(http.StatusOK)
				_, _ = w.Write([]byte("null"))
				return
			}
			http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auction)
	}
}

// SubmitItemIntentRequest payload
type SubmitItemIntentRequest struct {
	MemberID uint `json:"member_id"`
}

// SubmitAuctionItemIntentHandler handles POST /api/v1/auction-items/{id}/intents
func SubmitAuctionItemIntentHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		auctionItemIDStr := chi.URLParam(r, "id")
		auctionItemID, err := strconv.ParseUint(auctionItemIDStr, 10, 32)
		if err != nil {
			http.Error(w, `{"error":"invalid auction item id"}`, http.StatusBadRequest)
			return
		}

		var req SubmitItemIntentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
			return
		}

		if req.MemberID == 0 {
			http.Error(w, `{"error":"member_id is required"}`, http.StatusBadRequest)
			return
		}

		// Verify AuctionItem exists
		var auctionItem models.AuctionItem
		if err := db.First(&auctionItem, auctionItemID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				http.Error(w, `{"error":"auction item not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
			return
		}

		if auctionItem.Status == models.AuctionItemStatusResolved {
			http.Error(w, `{"error":"cannot submit intent for a resolved item"}`, http.StatusConflict)
			return
		}

		// Verify Member exists
		var member models.GuildMember
		if err := db.First(&member, req.MemberID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				http.Error(w, `{"error":"guild member not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
			return
		}

		// Check if intent already exists (toggle support: if exists, remove it; if not, add it)
		var existingIntent models.IntentToBuy
		err = db.Where("auction_item_id = ? AND member_id = ?", auctionItemID, req.MemberID).First(&existingIntent).Error

		if err == nil {
			// Intent exists: remove it (toggle off)
			if err := db.Delete(&existingIntent).Error; err != nil {
				http.Error(w, `{"error":"failed to remove intent"}`, http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "removed"})
			return
		}

		// Intent does not exist: create it (toggle on)
		intent := models.IntentToBuy{
			AuctionItemID: uint(auctionItemID),
			MemberID:      req.MemberID,
			SubmittedAt:   time.Now().UTC(),
		}

		if err := db.Create(&intent).Error; err != nil {
			http.Error(w, `{"error":"failed to submit intent"}`, http.StatusInternalServerError)
			return
		}

		// Preload member
		_ = db.Preload("Member").First(&intent, intent.ID)

		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(intent)
	}
}

// UpdateAuctionItemQuantityRequest payload
type UpdateAuctionItemQuantityRequest struct {
	Quantity int `json:"quantity"`
}

// UpdateAuctionItemQuantityHandler handles PATCH /api/v1/auction-items/{id}/quantity
func UpdateAuctionItemQuantityHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		auctionItemIDStr := chi.URLParam(r, "id")
		auctionItemID, err := strconv.ParseUint(auctionItemIDStr, 10, 32)
		if err != nil {
			http.Error(w, `{"error":"invalid auction item id"}`, http.StatusBadRequest)
			return
		}

		var req UpdateAuctionItemQuantityRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
			return
		}

		if req.Quantity < 0 {
			http.Error(w, `{"error":"quantity cannot be negative"}`, http.StatusBadRequest)
			return
		}

		var auctionItem models.AuctionItem
		if err := db.First(&auctionItem, auctionItemID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				http.Error(w, `{"error":"auction item not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
			return
		}

		if auctionItem.Status == models.AuctionItemStatusResolved {
			http.Error(w, `{"error":"cannot update quantity of a resolved auction item"}`, http.StatusConflict)
			return
		}

		if err := db.Model(&auctionItem).Update("quantity", req.Quantity).Error; err != nil {
			http.Error(w, `{"error":"failed to update auction item quantity"}`, http.StatusInternalServerError)
			return
		}

		// Reload updated record with relationships
		_ = db.Preload("Item").Preload("Intents.Member").First(&auctionItem, auctionItemID)

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auctionItem)
	}
}

// ResolveAuctionItemHandler handles POST /api/v1/auction-items/{id}/resolve
func ResolveAuctionItemHandler(db *gorm.DB) http.HandlerFunc {
	service := services.NewAllocationService(db)

	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		auctionItemIDStr := chi.URLParam(r, "id")
		auctionItemID, err := strconv.ParseUint(auctionItemIDStr, 10, 32)
		if err != nil {
			http.Error(w, `{"error":"invalid auction item id"}`, http.StatusBadRequest)
			return
		}

		result, err := service.ResolveAuctionItem(uint(auctionItemID))
		if err != nil {
			if errors.Is(err, services.ErrAuctionItemNotFound) {
				http.Error(w, `{"error":"auction item not found"}`, http.StatusNotFound)
				return
			}
			if errors.Is(err, services.ErrAuctionItemResolved) {
				http.Error(w, `{"error":"auction item is already resolved"}`, http.StatusConflict)
				return
			}
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(result)
	}
}

