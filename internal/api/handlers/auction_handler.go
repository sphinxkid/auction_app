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

// CreateAuctionRequest payload
type CreateAuctionRequest struct {
	Title       string     `json:"title"`
	AuctionDate *time.Time `json:"auction_date,omitempty"`
	Status      string     `json:"status,omitempty"`
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

		auctionDate := time.Now().UTC()
		if req.AuctionDate != nil && !req.AuctionDate.IsZero() {
			auctionDate = req.AuctionDate.UTC()
		}

		status := models.AuctionStatusActive
		if req.Status != "" {
			if req.Status != models.AuctionStatusDraft && req.Status != models.AuctionStatusActive && req.Status != models.AuctionStatusResolved {
				http.Error(w, `{"error":"invalid auction status"}`, http.StatusBadRequest)
				return
			}
			status = req.Status
		}

		auction := models.Auction{
			Title:       req.Title,
			Status:      status,
			AuctionDate: auctionDate,
		}

		if err := db.Create(&auction).Error; err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(auction)
	}
}

// SubmitIntentRequest payload
type SubmitIntentRequest struct {
	ItemID   uint `json:"item_id"`
	MemberID uint `json:"member_id"`
}

// SubmitIntentHandler handles POST /api/v1/auctions/{id}/intents
func SubmitIntentHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		auctionIDStr := chi.URLParam(r, "id")
		auctionID, err := strconv.ParseUint(auctionIDStr, 10, 32)
		if err != nil {
			http.Error(w, `{"error":"invalid auction id"}`, http.StatusBadRequest)
			return
		}

		var req SubmitIntentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
			return
		}

		if req.ItemID == 0 || req.MemberID == 0 {
			http.Error(w, `{"error":"item_id and member_id are required"}`, http.StatusBadRequest)
			return
		}

		// Verify Auction exists
		var auction models.Auction
		if err := db.First(&auction, auctionID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				http.Error(w, `{"error":"auction not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
			return
		}

		if auction.Status == models.AuctionStatusResolved {
			http.Error(w, `{"error":"cannot submit intent to a resolved auction"}`, http.StatusConflict)
			return
		}

		// Verify Item exists
		var item models.Item
		if err := db.First(&item, req.ItemID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				http.Error(w, `{"error":"item not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
			return
		}

		// Verify GuildMember exists
		var member models.GuildMember
		if err := db.First(&member, req.MemberID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				http.Error(w, `{"error":"guild member not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
			return
		}

		// Check duplicate intent
		var existingCount int64
		db.Model(&models.IntentToBuy{}).
			Where("auction_id = ? AND item_id = ? AND member_id = ?", auctionID, req.ItemID, req.MemberID).
			Count(&existingCount)

		if existingCount > 0 {
			http.Error(w, `{"error":"intent to buy already submitted for this item in this auction"}`, http.StatusConflict)
			return
		}

		intent := models.IntentToBuy{
			AuctionID:   uint(auctionID),
			ItemID:      req.ItemID,
			MemberID:    req.MemberID,
			SubmittedAt: time.Now().UTC(),
		}

		if err := db.Create(&intent).Error; err != nil {
			http.Error(w, `{"error":"failed to create intent"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(intent)
	}
}

// ResolveAuctionRequest payload
type ResolveAuctionRequest struct {
	ItemID   uint `json:"item_id"`
	Quantity int  `json:"quantity"`
}

// ResolveAuctionHandler handles POST /api/v1/auctions/{id}/resolve
func ResolveAuctionHandler(db *gorm.DB) http.HandlerFunc {
	service := services.NewAllocationService(db)

	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		auctionIDStr := chi.URLParam(r, "id")
		auctionID, err := strconv.ParseUint(auctionIDStr, 10, 32)
		if err != nil {
			http.Error(w, `{"error":"invalid auction id"}`, http.StatusBadRequest)
			return
		}

		var req ResolveAuctionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request payload"}`, http.StatusBadRequest)
			return
		}

		if req.ItemID == 0 || req.Quantity <= 0 {
			http.Error(w, `{"error":"item_id and positive quantity are required"}`, http.StatusBadRequest)
			return
		}

		result, err := service.ResolveAuction(uint(auctionID), req.ItemID, req.Quantity)
		if err != nil {
			if errors.Is(err, services.ErrAuctionNotFound) {
				http.Error(w, `{"error":"auction not found"}`, http.StatusNotFound)
				return
			}
			if errors.Is(err, services.ErrAuctionResolved) {
				http.Error(w, `{"error":"auction is already resolved"}`, http.StatusConflict)
				return
			}
			if errors.Is(err, services.ErrInvalidQuantity) {
				http.Error(w, `{"error":"invalid quantity"}`, http.StatusBadRequest)
				return
			}
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(result)
	}
}
