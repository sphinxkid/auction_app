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

// AllocationHistoryView Response DTO
type AllocationHistoryView struct {
	ID                uint               `json:"id"`
	AuctionID         uint               `json:"auction_id"`
	AuctionTitle      string             `json:"auction_title"`
	ItemID            uint               `json:"item_id"`
	ItemName          string             `json:"item_name"`
	MemberID          uint               `json:"member_id"`
	MemberName        string             `json:"member_name"`
	DiscordID         string             `json:"discord_id"`
	MemberClass       *models.GuildClass `json:"member_class,omitempty"`
	AllocatedQuantity int                `json:"allocated_quantity"`
	AllocatedAt       time.Time          `json:"allocated_at"`
}

func mapAllocationHistoryViews(records []models.AllocationHistory) []AllocationHistoryView {
	views := make([]AllocationHistoryView, len(records))
	for i, r := range records {
		views[i] = AllocationHistoryView{
			ID:                r.ID,
			AuctionID:         r.AuctionID,
			AuctionTitle:      r.Auction.Title,
			ItemID:            r.ItemID,
			ItemName:          r.Item.Name,
			MemberID:          r.MemberID,
			MemberName:        r.Member.Name,
			DiscordID:         r.Member.DiscordID,
			MemberClass:       r.Member.Class,
			AllocatedQuantity: r.AllocatedQuantity,
			AllocatedAt:       r.AllocatedAt,
		}
	}
	return views
}

// GetAuctionHistoryHandler handles GET /api/v1/history/auctions/{id}
func GetAuctionHistoryHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		auctionIDStr := chi.URLParam(r, "id")
		auctionID, err := strconv.ParseUint(auctionIDStr, 10, 32)
		if err != nil {
			http.Error(w, `{"error":"invalid auction id"}`, http.StatusBadRequest)
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

		var histories []models.AllocationHistory
		err = db.Preload("Auction").Preload("Item").Preload("Member.Class").
			Where("auction_id = ?", auctionID).
			Order("allocated_at DESC").
			Find(&histories).Error

		if err != nil {
			http.Error(w, `{"error":"failed to fetch auction history"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(mapAllocationHistoryViews(histories))
	}
}

// GetItemHistoryHandler handles GET /api/v1/history/items/{id}
func GetItemHistoryHandler(db *gorm.DB) http.HandlerFunc {
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

		var histories []models.AllocationHistory
		err = db.Preload("Auction").Preload("Item").Preload("Member.Class").
			Where("item_id = ?", itemID).
			Order("allocated_at DESC").
			Find(&histories).Error

		if err != nil {
			http.Error(w, `{"error":"failed to fetch item allocation history"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(mapAllocationHistoryViews(histories))
	}
}

// GetMemberHistoryHandler handles GET /api/v1/history/members/{id}
func GetMemberHistoryHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		memberIDStr := chi.URLParam(r, "id")
		memberID, err := strconv.ParseUint(memberIDStr, 10, 32)
		if err != nil {
			http.Error(w, `{"error":"invalid member id"}`, http.StatusBadRequest)
			return
		}

		// Verify GuildMember exists
		var member models.GuildMember
		if err := db.First(&member, memberID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				http.Error(w, `{"error":"guild member not found"}`, http.StatusNotFound)
				return
			}
			http.Error(w, `{"error":"database error"}`, http.StatusInternalServerError)
			return
		}

		var histories []models.AllocationHistory
		err = db.Preload("Auction").Preload("Item").Preload("Member.Class").
			Where("member_id = ?", memberID).
			Order("allocated_at DESC").
			Find(&histories).Error

		if err != nil {
			http.Error(w, `{"error":"failed to fetch member allocation history"}`, http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(mapAllocationHistoryViews(histories))
	}
}

// ItemRankHistoryView Response DTO
type ItemRankHistoryView struct {
	ID            uint               `json:"id"`
	AuctionID     uint               `json:"auction_id"`
	AuctionTitle  string             `json:"auction_title"`
	AuctionItemID uint               `json:"auction_item_id"`
	ItemID        uint               `json:"item_id"`
	ItemName      string             `json:"item_name"`
	MemberID      uint               `json:"member_id"`
	MemberName    string             `json:"member_name"`
	DiscordID     string             `json:"discord_id"`
	MemberClass   *models.GuildClass `json:"member_class,omitempty"`
	Rank          int                `json:"rank"`
	Status        string             `json:"status"`
	RecordedAt    time.Time          `json:"recorded_at"`
}

// GetItemRankHistoryHandler handles GET /api/v1/history/ranks/items/{id}
func GetItemRankHistoryHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		itemIDStr := chi.URLParam(r, "id")
		itemID, err := strconv.ParseUint(itemIDStr, 10, 32)
		if err != nil {
			http.Error(w, `{"error":"invalid item id"}`, http.StatusBadRequest)
			return
		}

		var records []models.ItemRankHistory
		err = db.Preload("Auction").Preload("Item").Preload("Member.Class").
			Where("item_id = ?", itemID).
			Order("recorded_at DESC, rank ASC").
			Find(&records).Error

		if err != nil {
			http.Error(w, `{"error":"failed to fetch item rank history"}`, http.StatusInternalServerError)
			return
		}

		views := make([]ItemRankHistoryView, len(records))
		for i, r := range records {
			views[i] = ItemRankHistoryView{
				ID:            r.ID,
				AuctionID:     r.AuctionID,
				AuctionTitle:  r.Auction.Title,
				AuctionItemID: r.AuctionItemID,
				ItemID:        r.ItemID,
				ItemName:      r.Item.Name,
				MemberID:      r.MemberID,
				MemberName:    r.Member.Name,
				DiscordID:     r.Member.DiscordID,
				MemberClass:   r.Member.Class,
				Rank:          r.Rank,
				Status:        r.Status,
				RecordedAt:    r.RecordedAt,
			}
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(views)
	}
}
