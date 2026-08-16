package models

import (
	"time"
)

// AuctionStatus constants
const (
	AuctionStatusDraft    = "DRAFT"
	AuctionStatusActive   = "ACTIVE"
	AuctionStatusResolved = "RESOLVED"
)

// AuctionItemStatus constants
const (
	AuctionItemStatusPending  = "PENDING"
	AuctionItemStatusResolved = "RESOLVED"
)

// QueueMemberStatus constants
const (
	QueueStatusWaiting    = "WAITING"
	QueueStatusPastWinner = "PAST_WINNER"
)

// GuildClass represents a character class in the guild (e.g. Warrior, Mage, Priest).
type GuildClass struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Color     string    `gorm:"type:varchar(30);default:'#A855F7';not null" json:"color"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// GuildMember represents a player/member of the guild.
type GuildMember struct {
	ID        uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string      `gorm:"type:varchar(100);not null" json:"name"`
	DiscordID string      `gorm:"type:varchar(100);uniqueIndex;not null" json:"discord_id"`
	ClassID   *uint       `gorm:"index" json:"class_id,omitempty"`
	Class     *GuildClass `gorm:"foreignKey:ClassID" json:"class,omitempty"`
	GvGBuild  string      `gorm:"type:varchar(150);default:''" json:"gvg_build"`
	CreatedAt time.Time   `gorm:"autoCreateTime" json:"created_at"`
}

// Item represents raid loot that can be auctioned or allocated.
type Item struct {
	ID           uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string `gorm:"type:varchar(150);not null" json:"name"`
	Description  string `gorm:"type:text" json:"description"`
	IsRepeatable bool   `gorm:"default:false;not null" json:"is_repeatable"`
}

// Auction represents a overall raid loot auction instance.
type Auction struct {
	ID           uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	Title        string        `gorm:"type:varchar(200);not null" json:"title"`
	Status       string        `gorm:"type:varchar(20);default:'ACTIVE';not null;index" json:"status"` // DRAFT, ACTIVE, RESOLVED
	AuctionDate  time.Time     `gorm:"not null;index" json:"auction_date"`
	CreatedTS    time.Time     `gorm:"autoCreateTime;index" json:"created_ts"`
	AuctionItems []AuctionItem `gorm:"foreignKey:AuctionID;constraint:OnDelete:CASCADE" json:"auction_items,omitempty"`
}

// AuctionItem represents a specific item up for bid within a parent auction with a specific quantity.
type AuctionItem struct {
	ID         uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	AuctionID  uint          `gorm:"not null;index" json:"auction_id"`
	ItemID     uint          `gorm:"not null;index" json:"item_id"`
	Quantity   int           `gorm:"not null;default:0" json:"quantity"`
	Status     string        `gorm:"type:varchar(20);default:'PENDING';not null;index" json:"status"` // PENDING, RESOLVED
	ResolvedAt *time.Time    `gorm:"index" json:"resolved_at,omitempty"`
	Auction    *Auction      `gorm:"foreignKey:AuctionID;constraint:OnDelete:CASCADE" json:"auction,omitempty"`
	Item       *Item         `gorm:"foreignKey:ItemID;constraint:OnDelete:CASCADE" json:"item,omitempty"`
	Intents    []IntentToBuy `gorm:"foreignKey:AuctionItemID;constraint:OnDelete:CASCADE" json:"intents,omitempty"`
}

// IntentToBuy records a guild member's intention to bid/buy a specific AuctionItem.
type IntentToBuy struct {
	ID            uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	AuctionItemID uint         `gorm:"not null;index:idx_auction_item_member,unique" json:"auction_item_id"`
	MemberID      uint         `gorm:"not null;index:idx_auction_item_member,unique" json:"member_id"`
	Quantity      int          `gorm:"not null;default:1" json:"quantity"`
	SubmittedAt   time.Time    `gorm:"autoCreateTime;index" json:"submitted_at"`
	AuctionItem   *AuctionItem `gorm:"foreignKey:AuctionItemID;constraint:OnDelete:CASCADE" json:"auction_item,omitempty"`
	Member        *GuildMember `gorm:"foreignKey:MemberID;constraint:OnDelete:CASCADE" json:"member,omitempty"`
}

// ItemQueueRanking tracks the sequential queue position and past win history for a specific item.
type ItemQueueRanking struct {
	ID        uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	ItemID    uint         `gorm:"not null;index:idx_item_member,unique" json:"item_id"`
	MemberID  uint         `gorm:"not null;index:idx_item_member,unique" json:"member_id"`
	Rank      int          `gorm:"not null;index" json:"rank"` // Sequential explicit integer rank (1..M)
	Status    string       `gorm:"type:varchar(20);default:'WAITING';not null;index" json:"status"` // WAITING, PAST_WINNER
	LastWonAt *time.Time   `gorm:"index" json:"last_won_at,omitempty"`
	UpdatedAt time.Time    `gorm:"autoUpdateTime" json:"updated_at"`
	Item      *Item        `gorm:"foreignKey:ItemID;constraint:OnDelete:CASCADE" json:"item,omitempty"`
	Member    *GuildMember `gorm:"foreignKey:MemberID;constraint:OnDelete:CASCADE" json:"member,omitempty"`
}

// AllocationHistory records the final item allocation result when an auction item resolves.
type AllocationHistory struct {
	ID                uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	AuctionID         uint         `gorm:"not null;index" json:"auction_id"`
	ItemID            uint         `gorm:"not null;index" json:"item_id"`
	MemberID          uint         `gorm:"not null;index" json:"member_id"`
	AllocatedQuantity int          `gorm:"not null;default:1" json:"allocated_quantity"`
	AllocatedAt       time.Time    `gorm:"autoCreateTime" json:"allocated_at"`
	Auction           *Auction     `gorm:"foreignKey:AuctionID;constraint:OnDelete:CASCADE" json:"auction,omitempty"`
	Item              *Item        `gorm:"foreignKey:ItemID;constraint:OnDelete:CASCADE" json:"item,omitempty"`
	Member            *GuildMember `gorm:"foreignKey:MemberID;constraint:OnDelete:CASCADE" json:"member,omitempty"`
}

// ItemRankHistory records historical queue rank placement per item, per auction, per member.
type ItemRankHistory struct {
	ID            uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	AuctionID     uint         `gorm:"not null;index" json:"auction_id"`
	AuctionItemID uint         `gorm:"not null;index" json:"auction_item_id"`
	ItemID        uint         `gorm:"not null;index" json:"item_id"`
	MemberID      uint         `gorm:"not null;index" json:"member_id"`
	Rank          int          `gorm:"not null;index" json:"rank"`
	Status        string       `gorm:"type:varchar(20);not null" json:"status"`
	RecordedAt    time.Time    `gorm:"autoCreateTime;index" json:"recorded_at"`
	Auction       *Auction     `gorm:"foreignKey:AuctionID;constraint:OnDelete:CASCADE" json:"auction,omitempty"`
	Item          *Item        `gorm:"foreignKey:ItemID;constraint:OnDelete:CASCADE" json:"item,omitempty"`
	Member        *GuildMember `gorm:"foreignKey:MemberID;constraint:OnDelete:CASCADE" json:"member,omitempty"`
}
