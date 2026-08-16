# Guild Loot Queueing & Allocation System (Step 1 Foundation)

A Go backend system for managing predictable, repeatable guild raid loot via sequential auctions and three-tier priority queueing.

## Project Architecture

```text
├── cmd/
│   └── api/
│       └── main.go              # Application entrypoint
├── internal/
│   ├── api/
│   │   ├── handlers/
│   │   │   ├── health.go        # /health HTTP handler
│   │   │   └── health_test.go   # Health handler unit tests
│   │   └── server.go            # Chi router & server lifecycle
│   ├── config/
│   │   └── config.go            # Environment configuration
│   ├── database/
│   │   ├── database.go          # GORM SQLite connection & auto-migration
│   │   ├── database_test.go     # Migration & seeder unit tests
│   │   └── seeder.go            # Idempotent data seeder
│   └── models/
│       └── models.go            # Domain models (GuildMember, Item, Auction, etc.)
├── go.mod                       # Module definition
└── README.md                    # System documentation
```

## Data Models

1. **GuildMember**: Guild player profile (`ID`, `Name`, `DiscordID`, `CreatedAt`).
2. **Item**: Raid loot item (`ID`, `Name`, `Description`, `IsRepeatable`).
3. **Auction**: Raid loot auction instance (`ID`, `Title`, `Status`, `AuctionDate`).
4. **IntentToBuy**: Bid submission record (`ID`, `AuctionID`, `ItemID`, `MemberID`, `SubmittedAt`).
5. **ItemQueueRanking**: Sequential priority queue position (`ID`, `ItemID`, `MemberID`, `Rank`, `Status`, `LastWonAt`, `UpdatedAt`).
6. **AllocationHistory**: Resolved loot allocation history (`ID`, `AuctionID`, `ItemID`, `MemberID`, `AllocatedQuantity`, `AllocatedAt`).

---

## How to Run

### Prerequisites
- Go 1.22+

### Running the API Server

```bash
# Build and run the server
go run ./cmd/api

# Or set custom server address / DB file:
SERVER_ADDRESS=127.0.0.1:8080 DB_PATH=guild_loot.db go run ./cmd/api
```

Upon startup, the system will:
1. Initialize the SQLite database connection (`guild_loot.db`).
2. Run GORM Auto-Migrations for all domain entities.
3. Automatically seed 5 guild members and 3 repeatable raid items.
4. Start the HTTP server listening on `http://127.0.0.1:8080`.

---

## Verifying Health Endpoint

In a separate terminal, query the `/health` endpoint:

```bash
curl -i http://127.0.0.1:8080/health
```

Expected JSON response (`200 OK`):
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-08-16T13:25:00Z"
}
```

---

## Running Unit Tests

```bash
go test -v ./...
```
