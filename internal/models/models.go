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

// QueueMemberStatus constants
const (
	QueueStatusWaiting    = "WAITING"
	QueueStatusPastWinner = "PAST_WINNER"
)

// GuildMember represents a player/member of the guild.
type GuildMember struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	DiscordID string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"discord_id"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

// Item represents raid loot that can be auctioned or allocated.
type Item struct {
	ID           uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name         string `gorm:"type:varchar(150);not null" json:"name"`
	Description  string `gorm:"type:text" json:"description"`
	IsRepeatable bool   `gorm:"default:false;not null" json:"is_repeatable"`
}

// Auction represents a specific loot auction instance.
type Auction struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Title       string    `gorm:"type:varchar(200);not null" json:"title"`
	Status      string    `gorm:"type:varchar(20);default:'DRAFT';not null;index" json:"status"` // DRAFT, ACTIVE, RESOLVED
	AuctionDate time.Time `gorm:"not null;index" json:"auction_date"`
}

// IntentToBuy records a guild member's intention to bid/buy an item in an auction.
type IntentToBuy struct {
	ID          uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	AuctionID   uint        `gorm:"not null;index" json:"auction_id"`
	ItemID      uint        `gorm:"not null;index" json:"item_id"`
	MemberID    uint        `gorm:"not null;index" json:"member_id"`
	SubmittedAt time.Time   `gorm:"autoCreateTime;index" json:"submitted_at"`
	Auction     Auction     `gorm:"foreignKey:AuctionID;constraint:OnDelete:CASCADE" json:"auction,omitempty"`
	Item        Item        `gorm:"foreignKey:ItemID;constraint:OnDelete:CASCADE" json:"item,omitempty"`
	Member      GuildMember `gorm:"foreignKey:MemberID;constraint:OnDelete:CASCADE" json:"member,omitempty"`
}

// ItemQueueRanking tracks the sequential queue position and past win history for a specific item.
type ItemQueueRanking struct {
	ID        uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	ItemID    uint        `gorm:"not null;index:idx_item_member,unique" json:"item_id"`
	MemberID  uint        `gorm:"not null;index:idx_item_member,unique" json:"member_id"`
	Rank      int         `gorm:"not null;index" json:"rank"` // Sequential explicit integer rank (1..M)
	Status    string      `gorm:"type:varchar(20);default:'WAITING';not null;index" json:"status"` // WAITING, PAST_WINNER
	LastWonAt *time.Time  `gorm:"index" json:"last_won_at,omitempty"`
	UpdatedAt time.Time   `gorm:"autoUpdateTime" json:"updated_at"`
	Item      Item        `gorm:"foreignKey:ItemID;constraint:OnDelete:CASCADE" json:"item,omitempty"`
	Member    GuildMember `gorm:"foreignKey:MemberID;constraint:OnDelete:CASCADE" json:"member,omitempty"`
}

// AllocationHistory records the final item allocation result when an auction resolves.
type AllocationHistory struct {
	ID                uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	AuctionID         uint        `gorm:"not null;index" json:"auction_id"`
	ItemID            uint        `gorm:"not null;index" json:"item_id"`
	MemberID          uint        `gorm:"not null;index" json:"member_id"`
	AllocatedQuantity int         `gorm:"not null;default:1" json:"allocated_quantity"`
	AllocatedAt       time.Time   `gorm:"autoCreateTime" json:"allocated_at"`
	Auction           Auction     `gorm:"foreignKey:AuctionID;constraint:OnDelete:CASCADE" json:"auction,omitempty"`
	Item              Item        `gorm:"foreignKey:ItemID;constraint:OnDelete:CASCADE" json:"item,omitempty"`
	Member            GuildMember `gorm:"foreignKey:MemberID;constraint:OnDelete:CASCADE" json:"member,omitempty"`
}
