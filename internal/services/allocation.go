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
	AuctionID              uint                       `json:"auction_id"`
	AuctionItemID          uint                       `json:"auction_item_id"`
	ItemID                 uint                       `json:"item_id"`
	AllocatedQuantity      int                        `json:"allocated_quantity"`
	AuctionItemStatus      string                     `json:"auction_item_status"`
	AuctionStatus          string                     `json:"auction_status"`
	IsAuctionFullyResolved bool                       `json:"is_auction_fully_resolved"`
	Allocations            []models.AllocationHistory `json:"allocations"`
	UpdatedRankings        []models.ItemQueueRanking  `json:"updated_rankings"`
	RankSnapshots          []models.ItemRankHistory   `json:"rank_snapshots"`
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

		if auctionItem.Quantity <= 0 {
			return fmt.Errorf("cannot resolve item auction when current drop quantity is 0")
		}

		quantity := auctionItem.Quantity

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

		// 3. Fetch existing ItemQueueRanking records for this ItemID ordered by Rank ASC
		var existingRankings []models.ItemQueueRanking
		if err := tx.Where("item_id = ?", itemID).Order("rank ASC").Find(&existingRankings).Error; err != nil {
			return fmt.Errorf("failed to fetch item queue rankings: %w", err)
		}

		existingRankingMap := make(map[uint]*models.ItemQueueRanking)
		maxRank := 0
		for i := range existingRankings {
			existingRankingMap[existingRankings[i].MemberID] = &existingRankings[i]
			if existingRankings[i].Rank > maxRank {
				maxRank = existingRankings[i].Rank
			}
		}

		// 4. Identify new applicants (members submitting intent who have no queue ranking entry yet)
		var newApplicantIDs []uint
		for _, memberID := range intentMemberIDs {
			if _, exists := existingRankingMap[memberID]; !exists {
				newApplicantIDs = append(newApplicantIDs, memberID)
			}
		}

		// Cryptographically shuffle new applicants if more than 1
		if len(newApplicantIDs) > 1 {
			if err := cryptoShuffle(newApplicantIDs); err != nil {
				return fmt.Errorf("failed to shuffle new applicants: %w", err)
			}
		}

		// Create queue ranking entries for new applicants at the END of the queue (preserving existing ranks)
		var fullQueue []*models.ItemQueueRanking
		for i := range existingRankings {
			fullQueue = append(fullQueue, &existingRankings[i])
		}

		for _, memberID := range newApplicantIDs {
			maxRank++
			newRanking := models.ItemQueueRanking{
				ItemID:    itemID,
				MemberID:  memberID,
				Rank:      maxRank,
				Status:    models.QueueStatusWaiting,
				UpdatedAt: time.Now().UTC(),
			}
			fullQueue = append(fullQueue, &newRanking)
			existingRankingMap[memberID] = &newRanking
		}

		// 5. Partition INTENT SUBMITTERS into Candidate Tiers for Winner Selection
		// Priority 1: WAITING candidates, ordered by current Rank ASC
		// Priority 2: PAST_WINNER candidates, ordered by LastWonAt ASC (oldest winner first; if equal, by Rank ASC)
		var waitingCandidates []*models.ItemQueueRanking
		var winnerCandidates []*models.ItemQueueRanking

		for _, memberID := range intentMemberIDs {
			ranking := existingRankingMap[memberID]
			if ranking.Status == models.QueueStatusWaiting {
				waitingCandidates = append(waitingCandidates, ranking)
			} else {
				winnerCandidates = append(winnerCandidates, ranking)
			}
		}

		// Sort WAITING candidates by Rank ASC
		sort.Slice(waitingCandidates, func(i, j int) bool {
			return waitingCandidates[i].Rank < waitingCandidates[j].Rank
		})

		// Sort PAST_WINNER candidates by LastWonAt ASC
		sort.Slice(winnerCandidates, func(i, j int) bool {
			tI := time.Time{}
			if winnerCandidates[i].LastWonAt != nil {
				tI = *winnerCandidates[i].LastWonAt
			}
			tJ := time.Time{}
			if winnerCandidates[j].LastWonAt != nil {
				tJ = *winnerCandidates[j].LastWonAt
			}
			if tI.Equal(tJ) {
				return winnerCandidates[i].Rank < winnerCandidates[j].Rank
			}
			return tI.Before(tJ)
		})

		// Merge candidates: WAITING candidates first, then PAST_WINNER candidates
		candidates := append([]*models.ItemQueueRanking{}, waitingCandidates...)
		candidates = append(candidates, winnerCandidates...)

		// 6. Multi-Round Fair Allocation Engine:
		// Round 1: Give 1 unit to each candidate member in priority order (up to available drop quantity).
		// Round 2+: Distribute excess items to members requesting > 1 unit, round-robin in priority order (1 additional unit per pass).
		requestedQtyMap := make(map[uint]int)
		for _, intent := range intents {
			qty := intent.Quantity
			if qty <= 0 {
				qty = 1
			}
			requestedQtyMap[intent.MemberID] = qty
		}

		allocatedMap := make(map[uint]int)
		remainingRequestMap := make(map[uint]int)
		for _, c := range candidates {
			allocatedMap[c.MemberID] = 0
			remainingRequestMap[c.MemberID] = requestedQtyMap[c.MemberID]
		}

		availableDrop := quantity

		// Round 1: Give 1 item to each candidate in priority order
		for _, c := range candidates {
			if availableDrop <= 0 {
				break
			}
			if remainingRequestMap[c.MemberID] > 0 {
				allocatedMap[c.MemberID]++
				remainingRequestMap[c.MemberID]--
				availableDrop--
			}
		}

		// Round 2+: Distribute excess items to members requesting > 1 unit, round robin in priority order
		for availableDrop > 0 {
			allocatedInThisPass := 0
			for _, c := range candidates {
				if availableDrop <= 0 {
					break
				}
				if remainingRequestMap[c.MemberID] > 0 {
					allocatedMap[c.MemberID]++
					remainingRequestMap[c.MemberID]--
					availableDrop--
					allocatedInThisPass++
				}
			}
			if allocatedInThisPass == 0 {
				break
			}
		}

		now := time.Now().UTC()

		// Save Allocation History & Track Winners
		winnerSet := make(map[uint]bool)
		allocations := []models.AllocationHistory{}
		totalItemsAllocated := 0

		for _, c := range candidates {
			allocQty := allocatedMap[c.MemberID]
			if allocQty > 0 {
				winnerSet[c.MemberID] = true
				totalItemsAllocated += allocQty

				alloc := models.AllocationHistory{
					AuctionID:         auctionID,
					ItemID:            itemID,
					MemberID:          c.MemberID,
					AllocatedQuantity: allocQty,
					AllocatedAt:       now,
				}
				if err := tx.Create(&alloc).Error; err != nil {
					return fmt.Errorf("failed to save allocation history: %w", err)
				}
				allocations = append(allocations, alloc)
			}
		}

		// 7. Update Winner Statuses & Re-Index Queue Ranks to Preserve Relative Order
		// Non-winners keep their relative queue order and shift up.
		// Winners are moved to the VERY END of the queue.
		var nonWinnersQueue []*models.ItemQueueRanking
		var winnersQueue []*models.ItemQueueRanking

		for _, ranking := range fullQueue {
			if winnerSet[ranking.MemberID] {
				ranking.Status = models.QueueStatusPastWinner
				t := now
				ranking.LastWonAt = &t
				winnersQueue = append(winnersQueue, ranking)
			} else {
				ranking.Status = models.QueueStatusWaiting
				nonWinnersQueue = append(nonWinnersQueue, ranking)
			}
		}

		// Sort winners by current Rank ASC before appending to end
		sort.Slice(winnersQueue, func(i, j int) bool {
			return winnersQueue[i].Rank < winnersQueue[j].Rank
		})

		// Combine: non-winners first, winners at the end
		reIndexedQueue := append([]*models.ItemQueueRanking{}, nonWinnersQueue...)
		reIndexedQueue = append(reIndexedQueue, winnersQueue...)

		updatedRankings := []models.ItemQueueRanking{}
		for idx, ranking := range reIndexedQueue {
			ranking.Rank = idx + 1
			ranking.UpdatedAt = now

			if err := tx.Save(ranking).Error; err != nil {
				return fmt.Errorf("failed to save queue ranking for member %d: %w", ranking.MemberID, err)
			}
			updatedRankings = append(updatedRankings, *ranking)
		}

		// 6b. Record ItemRankHistory snapshots for each member in the queue for this item
		rankSnapshots := []models.ItemRankHistory{}
		for _, ranking := range reIndexedQueue {
			snapshot := models.ItemRankHistory{
				AuctionID:     auctionID,
				AuctionItemID: auctionItemID,
				ItemID:        itemID,
				MemberID:      ranking.MemberID,
				Rank:          ranking.Rank,
				Status:        ranking.Status,
				RecordedAt:    now,
			}
			if err := tx.Create(&snapshot).Error; err != nil {
				return fmt.Errorf("failed to save rank history snapshot for member %d: %w", ranking.MemberID, err)
			}
			rankSnapshots = append(rankSnapshots, snapshot)
		}

		// 7. Update AuctionItem status to RESOLVED
		if err := tx.Model(&auctionItem).Updates(map[string]interface{}{
			"status":      models.AuctionItemStatusResolved,
			"resolved_at": now,
		}).Error; err != nil {
			return fmt.Errorf("failed to update auction item status: %w", err)
		}

		// 8. Auction State Verification Check: Count remaining pending items
		var remainingPending int64
		if err := tx.Model(&models.AuctionItem{}).
			Where("auction_id = ? AND status != ?", auctionID, models.AuctionItemStatusResolved).
			Count(&remainingPending).Error; err != nil {
			return fmt.Errorf("failed to count pending auction items: %w", err)
		}

		// Resolving each item drop does NOT automatically resolve/close the entire raid auction.
		// The parent auction remains ACTIVE until manually finalized by raid leader.
		auctionStatus := models.AuctionStatusActive
		isFullyResolved := (remainingPending == 0)

		result = ItemResolutionResult{
			AuctionID:              auctionID,
			AuctionItemID:          auctionItemID,
			ItemID:                 itemID,
			AllocatedQuantity:      totalItemsAllocated,
			AuctionItemStatus:      models.AuctionItemStatusResolved,
			AuctionStatus:          auctionStatus,
			IsAuctionFullyResolved: isFullyResolved,
			Allocations:            allocations,
			UpdatedRankings:        updatedRankings,
			RankSnapshots:          rankSnapshots,
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
