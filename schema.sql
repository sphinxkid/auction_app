-- Guild Loot Queue System - Database Schema SQL
-- Target Database: SQLite / PostgreSQL / MySQL compliant ANSI SQL

-- 1. Guild Classes Table
CREATE TABLE IF NOT EXISTS guild_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(30) NOT NULL DEFAULT '#A855F7',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_classes_name ON guild_classes(name);

-- 2. Guild Members Table
CREATE TABLE IF NOT EXISTS guild_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    discord_id VARCHAR(100) NOT NULL UNIQUE,
    class_id INTEGER NULL,
    gvg_build VARCHAR(150) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES guild_classes(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_members_discord_id ON guild_members(discord_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_class_id ON guild_members(class_id);

-- 3. Items Catalog Table
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_repeatable BOOLEAN NOT NULL DEFAULT 0
);

-- 4. Auctions Table
CREATE TABLE IF NOT EXISTS auctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    auction_date DATETIME NOT NULL,
    created_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_auctions_auction_date ON auctions(auction_date);
CREATE INDEX IF NOT EXISTS idx_auctions_created_ts ON auctions(created_ts);

-- 5. Auction Items Table
CREATE TABLE IF NOT EXISTS auction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    resolved_at DATETIME NULL,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auction_items_auction_id ON auction_items(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_items_item_id ON auction_items(item_id);
CREATE INDEX IF NOT EXISTS idx_auction_items_status ON auction_items(status);
CREATE INDEX IF NOT EXISTS idx_auction_items_resolved_at ON auction_items(resolved_at);

-- 6. Intent To Buy Table
CREATE TABLE IF NOT EXISTS intent_to_buys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_item_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_item_id) REFERENCES auction_items(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES guild_members(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auction_item_member ON intent_to_buys(auction_item_id, member_id);
CREATE INDEX IF NOT EXISTS idx_intent_to_buys_submitted_at ON intent_to_buys(submitted_at);

-- 7. Item Queue Rankings Table
CREATE TABLE IF NOT EXISTS item_queue_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    last_won_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES guild_members(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_member ON item_queue_rankings(item_id, member_id);
CREATE INDEX IF NOT EXISTS idx_item_queue_rankings_rank ON item_queue_rankings(rank);
CREATE INDEX IF NOT EXISTS idx_item_queue_rankings_status ON item_queue_rankings(status);
CREATE INDEX IF NOT EXISTS idx_item_queue_rankings_last_won_at ON item_queue_rankings(last_won_at);

-- 8. Allocation History Table
CREATE TABLE IF NOT EXISTS allocation_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    allocated_quantity INTEGER NOT NULL DEFAULT 1,
    allocated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES guild_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_allocation_histories_auction_id ON allocation_histories(auction_id);
CREATE INDEX IF NOT EXISTS idx_allocation_histories_item_id ON allocation_histories(item_id);
CREATE INDEX IF NOT EXISTS idx_allocation_histories_member_id ON allocation_histories(member_id);

-- 9. Item Rank History Table
CREATE TABLE IF NOT EXISTS item_rank_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auction_id INTEGER NOT NULL,
    auction_item_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
    FOREIGN KEY (auction_item_id) REFERENCES auction_items(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES guild_members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_rank_histories_auction_id ON item_rank_histories(auction_id);
CREATE INDEX IF NOT EXISTS idx_item_rank_histories_auction_item_id ON item_rank_histories(auction_item_id);
CREATE INDEX IF NOT EXISTS idx_item_rank_histories_item_id ON item_rank_histories(item_id);
CREATE INDEX IF NOT EXISTS idx_item_rank_histories_member_id ON item_rank_histories(member_id);
CREATE INDEX IF NOT EXISTS idx_item_rank_histories_rank ON item_rank_histories(rank);
CREATE INDEX IF NOT EXISTS idx_item_rank_histories_recorded_at ON item_rank_histories(recorded_at);
