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
	ErrAuctionNotFound = errors.New("auction not found")
	ErrAuctionResolved = errors.New("auction is already resolved")
	ErrInvalidQuantity = errors.New("quantity must be greater than 0")
)

// AllocationService handles auction resolution and queue ranking calculations.
type AllocationService struct {
	db *gorm.DB
}

// NewAllocationService initializes a new AllocationService instance.
func NewAllocationService(db *gorm.DB) *AllocationService {
	return &AllocationService{db: db}
}

// ResolutionResult holds details about an auction resolution execution.
type ResolutionResult struct {
	AuctionID         uint                       `json:"auction_id"`
	ItemID            uint                       `json:"item_id"`
	AllocatedQuantity int                        `json:"allocated_quantity"`
	Allocations       []models.AllocationHistory `json:"allocations"`
	UpdatedRankings   []models.ItemQueueRanking  `json:"updated_rankings"`
}

// ResolveAuction resolves an auction for a specific item with quantity N.
func (s *AllocationService) ResolveAuction(auctionID uint, itemID uint, quantity int) (*ResolutionResult, error) {
	if quantity <= 0 {
		return nil, ErrInvalidQuantity
	}

	var result ResolutionResult

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Fetch & lock Auction
		var auction models.Auction
		if err := tx.First(&auction, auctionID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrAuctionNotFound
			}
			return err
		}

		if auction.Status == models.AuctionStatusResolved {
			return ErrAuctionResolved
		}

		// 2. Fetch all IntentToBuy records for this auction and item
		var intents []models.IntentToBuy
		if err := tx.Where("auction_id = ? AND item_id = ?", auctionID, itemID).Find(&intents).Error; err != nil {
			return fmt.Errorf("failed to fetch intents to buy: %w", err)
		}

		// Collect member IDs who submitted intent
		intentMemberIDs := make([]uint, len(intents))
		intentMemberSet := make(map[uint]bool)
		for i, intent := range intents {
			intentMemberIDs[i] = intent.MemberID
			intentMemberSet[intent.MemberID] = true
		}

		// 3. Fetch existing ItemQueueRanking records for this item
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
		// Ensure every active queue member (existing + new intent submitters) has a record
		allMembersMap := make(map[uint]*models.ItemQueueRanking)
		for memberID, ranking := range existingRankingMap {
			// Clone struct to modify in-memory
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
				// Unallocated new applicants get Status = WAITING
				if ranking.ID == 0 {
					ranking.Status = models.QueueStatusWaiting
				}
			}
		}

		// Group all records for explicit re-ranking
		// Group A: WAITING members
		// Group B: PAST_WINNER members
		var waitingList []*models.ItemQueueRanking
		var winnerList []*models.ItemQueueRanking

		// Track new applicants' shuffle order
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

		// Sort WAITING list:
		// Existing waiters ordered by current Rank ASC; Tier 2 new applicants placed after existing waiters in shuffled order
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
			// Existing waiters come before new applicants
			return !isNewI
		})

		// Sort PAST_WINNER list:
		// Ordered by LastWonAt ASC (oldest winner first; newest winner with NOW() at bottom)
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

		// Combine into full re-ranked list: [WAITING list] + [PAST_WINNER list]
		fullReRankedList := append([]*models.ItemQueueRanking{}, waitingList...)
		fullReRankedList = append(fullReRankedList, winnerList...)

		var updatedRankings []models.ItemQueueRanking

		// Assign explicit sequential ranks (1..M) and save to DB
		for idx, ranking := range fullReRankedList {
			ranking.Rank = idx + 1
			ranking.UpdatedAt = now

			if err := tx.Save(ranking).Error; err != nil {
				return fmt.Errorf("failed to save queue ranking for member %d: %w", ranking.MemberID, err)
			}
			updatedRankings = append(updatedRankings, *ranking)
		}

		// Mark auction as RESOLVED
		if err := tx.Model(&auction).Update("status", models.AuctionStatusResolved).Error; err != nil {
			return fmt.Errorf("failed to update auction status: %w", err)
		}

		result = ResolutionResult{
			AuctionID:         auctionID,
			ItemID:            itemID,
			AllocatedQuantity: len(winners),
			Allocations:       allocations,
			UpdatedRankings:   updatedRankings,
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
