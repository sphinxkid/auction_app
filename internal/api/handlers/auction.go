package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"

	"guild-loot-system/internal/services"
)

// ResolveAuctionRequest payload for resolving an auction.
type ResolveAuctionRequest struct {
	ItemID   uint `json:"item_id"`
	Quantity int  `json:"quantity"`
}

// ResolveAuctionHandler handles POST /auctions/{id}/resolve
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
