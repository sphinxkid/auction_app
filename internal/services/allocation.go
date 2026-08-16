package services

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"sort"
	"time"

	"gorm.io/gorm"

	"guild-loot-system/internal/models"
)

var (
	ErrAuctionItemNotFound = errors.New("auction item not found")
	ErrAuctionItemResolved = errors.New("auction item is already resolved")
	ErrInvalidQuantity     = errors.New("quantity must be greater than 0")
)

// AllocationService handles per-item auction resolution and queue ranking calculations.
type AllocationService struct {
	db *gorm.DB
}

// NewAllocationService initializes a new AllocationService instance.
func NewAllocationService(db *gorm.DB) *AllocationService {
	return &AllocationService{db: db}
}

// ItemResolutionResult holds details about an auction item resolution execution.
type ItemResolutionResult struct {
	AuctionID             uint                       `json:"auction_id"`
	AuctionItemID         uint                       `json:"auction_item_id"`
	ItemID                uint                       `json:"item_id"`
	AllocatedQuantity     int                        `json:"allocated_quantity"`
	AuctionItemStatus     string                     `json:"auction_item_status"`
	AuctionStatus         string                     `json:"auction_status"`
	IsAuctionFullyResolved bool                      `json:"is_auction_fully_resolved"`
	Allocations           []models.AllocationHistory `json:"allocations"`
	UpdatedRankings       []models.ItemQueueRanking  `json:"updated_rankings"`
}

// ResolveAuctionItem resolves a single auction item within an auction and checks parent auction completion status.
func (s *AllocationService) ResolveAuctionItem(auctionItemID uint) (*ItemResolutionResult, error) {
	var result ItemResolutionResult

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Fetch & lock AuctionItem
		var auctionItem models.AuctionItem
		if err := tx.Preload("Auction").Preload("Item").First(&auctionItem, auctionItemID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAuctionItemNotFound
			}
			return err
		}

		if auctionItem.Status == models.AuctionItemStatusResolved {
			return ErrAuctionItemResolved
		}

		quantity := auctionItem.Quantity
		if quantity < 0 {
			quantity = 0
		}

		itemID := auctionItem.ItemID
		auctionID := auctionItem.AuctionID

		// 2. Fetch all IntentToBuy records for this AuctionItem
		var intents []models.IntentToBuy
		if err := tx.Where("auction_item_id = ?", auctionItemID).Find(&intents).Error; err != nil {
			return fmt.Errorf("failed to fetch intents to buy: %w", err)
		}

		// Collect member IDs who submitted intent
		intentMemberIDs := make([]uint, len(intents))
		for i, intent := range intents {
			intentMemberIDs[i] = intent.MemberID
		}

		// 3. Fetch existing ItemQueueRanking records for this ItemID
		var existingRankings []models.ItemQueueRanking
		if err := tx.Where("item_id = ?", itemID).Find(&existingRankings).Error; err != nil {
			return fmt.Errorf("failed to fetch item queue rankings: %w", err)
		}

		existingRankingMap := make(map[uint]*models.ItemQueueRanking)
		for i := range existingRankings {
			existingRankingMap[existingRankings[i].MemberID] = &existingRankings[i]
		}

		// 4. Partition intent submitters into 3 Tiers
		var tier1 []uint // Waiters (Status="WAITING"), sorted by current Rank ASC
		var tier2 []uint // New Applicants (no record in ItemQueueRanking), cryptographically shuffled
		var tier3 []uint // Past Winners (Status="PAST_WINNER"), sorted by LastWonAt ASC

		type waiterCandidate struct {
			memberID uint
			rank     int
		}
		var tier1Candidates []waiterCandidate

		type winnerCandidate struct {
			memberID  uint
			lastWonAt time.Time
		}
		var tier3Candidates []winnerCandidate

		for _, memberID := range intentMemberIDs {
			ranking, exists := existingRankingMap[memberID]
			if !exists {
				// Tier 2: New Applicant
				tier2 = append(tier2, memberID)
			} else if ranking.Status == models.QueueStatusWaiting {
				// Tier 1: Waiter
				tier1Candidates = append(tier1Candidates, waiterCandidate{
					memberID: memberID,
					rank:     ranking.Rank,
				})
			} else if ranking.Status == models.QueueStatusPastWinner {
				// Tier 3: Past Winner
				t := time.Time{}
				if ranking.LastWonAt != nil {
					t = *ranking.LastWonAt
				}
				tier3Candidates = append(tier3Candidates, winnerCandidate{
					memberID:  memberID,
					lastWonAt: t,
				})
			}
		}

		// Sort Tier 1 by Rank ASC
		sort.Slice(tier1Candidates, func(i, j int) bool {
			return tier1Candidates[i].rank < tier1Candidates[j].rank
		})
		for _, c := range tier1Candidates {
			tier1 = append(tier1, c.memberID)
		}

		// Cryptographically shuffle Tier 2 (New Applicants)
		if len(tier2) > 1 {
			if err := cryptoShuffle(tier2); err != nil {
				return fmt.Errorf("failed to shuffle new applicants: %w", err)
			}
		}

		// Sort Tier 3 by LastWonAt ASC (oldest winner first)
		sort.Slice(tier3Candidates, func(i, j int) bool {
			return tier3Candidates[i].lastWonAt.Before(tier3Candidates[j].lastWonAt)
		})
		for _, c := range tier3Candidates {
			tier3 = append(tier3, c.memberID)
		}

		// Merge into candidate order: [Tier 1] + [Tier 2] + [Tier 3]
		candidates := append([]uint{}, tier1...)
		candidates = append(candidates, tier2...)
		candidates = append(candidates, tier3...)

		// 5. Determine Winners & Create Allocations
		allocatedCount := quantity
		if len(candidates) < quantity {
			allocatedCount = len(candidates)
		}

		winners := candidates[:allocatedCount]
		winnerSet := make(map[uint]bool)
		for _, w := range winners {
			winnerSet[w] = true
		}

		now := time.Now().UTC()

		var allocations []models.AllocationHistory
		for _, winnerID := range winners {
			alloc := models.AllocationHistory{
				AuctionID:         auctionID,
				ItemID:            itemID,
				MemberID:          winnerID,
				AllocatedQuantity: 1,
				AllocatedAt:       now,
			}
			if err := tx.Create(&alloc).Error; err != nil {
				return fmt.Errorf("failed to save allocation history: %w", err)
			}
			allocations = append(allocations, alloc)
		}

		// 6. Update & Re-Index Full ItemQueueRanking for ItemID
		allMembersMap := make(map[uint]*models.ItemQueueRanking)
		for memberID, ranking := range existingRankingMap {
			r := *ranking
			allMembersMap[memberID] = &r
		}

		// Insert/update new applicants or winners
		for _, memberID := range intentMemberIDs {
			if _, exists := allMembersMap[memberID]; !exists {
				allMembersMap[memberID] = &models.ItemQueueRanking{
					ItemID:   itemID,
					MemberID: memberID,
					Status:   models.QueueStatusWaiting,
				}
			}
		}

		// Apply Allocation updates
		for memberID, ranking := range allMembersMap {
			if winnerSet[memberID] {
				ranking.Status = models.QueueStatusPastWinner
				t := now
				ranking.LastWonAt = &t
			} else {
				if ranking.ID == 0 {
					ranking.Status = models.QueueStatusWaiting
				}
			}
		}

		// Group all records for explicit re-ranking
		var waitingList []*models.ItemQueueRanking
		var winnerList []*models.ItemQueueRanking

		tier2OrderMap := make(map[uint]int)
		for idx, memberID := range tier2 {
			tier2OrderMap[memberID] = idx
		}

		for _, r := range allMembersMap {
			if r.Status == models.QueueStatusWaiting {
				waitingList = append(waitingList, r)
			} else {
				winnerList = append(winnerList, r)
			}
		}

		// Sort WAITING list
		sort.Slice(waitingList, func(i, j int) bool {
			rI := waitingList[i]
			rJ := waitingList[j]

			isNewI := rI.ID == 0
			isNewJ := rJ.ID == 0

			if !isNewI && !isNewJ {
				return rI.Rank < rJ.Rank
			}
			if isNewI && isNewJ {
				return tier2OrderMap[rI.MemberID] < tier2OrderMap[rJ.MemberID]
			}
			return !isNewI
		})

		// Sort PAST_WINNER list
		sort.Slice(winnerList, func(i, j int) bool {
			tI := time.Time{}
			if winnerList[i].LastWonAt != nil {
				tI = *winnerList[i].LastWonAt
			}
			tJ := time.Time{}
			if winnerList[j].LastWonAt != nil {
				tJ = *winnerList[j].LastWonAt
			}
			return tI.Before(tJ)
		})

		fullReRankedList := append([]*models.ItemQueueRanking{}, waitingList...)
		fullReRankedList = append(fullReRankedList, winnerList...)

		var updatedRankings []models.ItemQueueRanking
		for idx, ranking := range fullReRankedList {
			ranking.Rank = idx + 1
			ranking.UpdatedAt = now

			if err := tx.Save(ranking).Error; err != nil {
				return fmt.Errorf("failed to save queue ranking for member %d: %w", ranking.MemberID, err)
			}
			updatedRankings = append(updatedRankings, *ranking)
		}

		// 7. Update AuctionItem status to RESOLVED
		if err := tx.Model(&auctionItem).Updates(map[string]interface{}{
			"status":      models.AuctionItemStatusResolved,
			"resolved_at": now,
		}).Error; err != nil {
			return fmt.Errorf("failed to update auction item status: %w", err)
		}

		// 8. Auction State Verification Check: Check if all items in parent auction are RESOLVED
		var remainingPending int64
		if err := tx.Model(&models.AuctionItem{}).
			Where("auction_id = ? AND status != ?", auctionID, models.AuctionItemStatusResolved).
			Count(&remainingPending).Error; err != nil {
			return fmt.Errorf("failed to count pending auction items: %w", err)
		}

		auctionStatus := models.AuctionStatusActive
		isFullyResolved := false

		if remainingPending == 0 {
			auctionStatus = models.AuctionStatusResolved
			isFullyResolved = true
			if err := tx.Model(&models.Auction{}).
				Where("id = ?", auctionID).
				Update("status", models.AuctionStatusResolved).Error; err != nil {
				return fmt.Errorf("failed to update parent auction status: %w", err)
			}
		}

		result = ItemResolutionResult{
			AuctionID:             auctionID,
			AuctionItemID:         auctionItemID,
			ItemID:                itemID,
			AllocatedQuantity:     len(winners),
			AuctionItemStatus:     models.AuctionItemStatusResolved,
			AuctionStatus:         auctionStatus,
			IsAuctionFullyResolved: isFullyResolved,
			Allocations:           allocations,
			UpdatedRankings:       updatedRankings,
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &result, nil
}

// cryptoShuffle performs a cryptographically secure Fisher-Yates shuffle.
func cryptoShuffle[T any](slice []T) error {
	for i := len(slice) - 1; i > 0; i-- {
		nBig, err := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if err != nil {
			return err
		}
		j := nBig.Int64()
		slice[i], slice[j] = slice[j], slice[i]
	}
	return nil
}
