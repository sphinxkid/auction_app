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
)

// ItemQueueRankingView Response DTO
type ItemQueueRankingView struct {
	ID         uint       `json:"id"`
	ItemID     uint       `json:"item_id"`
	ItemName   string     `json:"item_name"`
	MemberID   uint       `json:"member_id"`
	MemberName string     `json:"member_name"`
	DiscordID  string     `json:"discord_id"`
	Rank       int        `json:"rank"`
	Status     string     `json:"status"`
	LastWonAt  *time.Time `json:"last_won_at,omitempty"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// GetItemQueueRankingsHandler handles GET /api/v1/items/{id}/rankings
func GetItemQueueRankingsHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		itemIDStr := chi.URLParam(r, "id")
		itemID, err := strconv.ParseUint(itemIDStr, 10, 32)
		if err != nil {
			http.Error(w, `{"error":"invalid item id"}`, http.StatusBadRequest)
			return
		}

		// Verify Item exists
		var item models.Item
		if err := db.First(&item, itemID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				http.Error(w, `{"error":"item not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
			return
		}

		// Query queue rankings with eager loaded GuildMember and Item, ordered by Rank ASC
		var rankings []models.ItemQueueRanking
		err = db.Preload("Member.Class").Preload("Item").
			Where("item_id = ?", itemID).
			Order("rank ASC").
			Find(&rankings).Error

		if err != nil {
			http.Error(w, `{"error":"failed to fetch queue rankings"}`, http.StatusInternalServerError)
			return
		}

		views := make([]ItemQueueRankingView, len(rankings))
		for i, r := range rankings {
			views[i] = ItemQueueRankingView{
				ID:         r.ID,
				ItemID:     r.ItemID,
				ItemName:   r.Item.Name,
				MemberID:   r.MemberID,
				MemberName: r.Member.Name,
				DiscordID:  r.Member.DiscordID,
				Rank:       r.Rank,
				Status:     r.Status,
				LastWonAt:  r.LastWonAt,
				UpdatedAt:  r.UpdatedAt,
			}
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(views)
	}
}
