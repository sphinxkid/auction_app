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

// GetMembersHandler handles GET /api/v1/members
func GetMembersHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var members []models.GuildMember
		if err := db.Order("id ASC").Find(&members).Error; err != nil {
			http.Error(w, `{"error":"failed to fetch members"}`, http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(members)
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

// CreateAuctionItemRequest inside CreateAuctionRequest
type CreateAuctionItemRequest struct {
	ItemID   uint `json:"item_id"`
	Quantity int  `json:"quantity"`
}

// CreateAuctionRequest payload
type CreateAuctionRequest struct {
	Title string                     `json:"title"`
	Items []CreateAuctionItemRequest `json:"items"`
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

		var createdAuction models.Auction
		err := db.Transaction(func(tx *gorm.DB) error {
			auction := models.Auction{
				Title:       req.Title,
				Status:      models.AuctionStatusActive,
				AuctionDate: time.Now().UTC(),
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
			if err := tx.Preload("AuctionItems.Item").Preload("AuctionItems.Intents.Member").First(&createdAuction, auction.ID).Error; err != nil {
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
			Preload("AuctionItems.Intents.Member").
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

