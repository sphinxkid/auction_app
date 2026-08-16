# Guild Loot Queueing & Allocation System

A Go backend system for managing predictable, repeatable guild raid loot via sequential auctions, three-tier priority queueing, explicit sequential integer re-ranking ($1..M$), and allocation history.

## Project Architecture

```text
├── cmd/
│   └── api/
│       └── main.go                  # Application entrypoint
├── internal/
│   ├── api/
│   │   ├── handlers/
│   │   │   ├── api_test.go          # REST API integration tests
│   │   │   ├── auction_handler.go   # Auction & intent HTTP handlers
│   │   │   ├── history_handler.go   # Allocation history HTTP handlers
│   │   │   ├── queue_handler.go     # Item queue rankings HTTP handler
│   │   │   ├── health.go            # /health HTTP handler
│   │   │   └── health_test.go       # Health unit tests
│   │   └── server.go                # Chi router & server lifecycle
│   ├── config/
│   │   └── config.go                # Environment configuration
│   ├── database/
│   │   ├── database.go              # GORM SQLite connection & auto-migration
│   │   ├── database_test.go         # Migration & seeder unit tests
│   │   └── seeder.go                # Idempotent data seeder
│   ├── models/
│   │   └── models.go                # Domain models (GuildMember, Item, Auction, etc.)
│   └── services/
│       ├── allocation.go            # Core 3-tier allocation engine service
│       └── allocation_test.go       # Allocation engine unit tests
├── go.mod                           # Module definition
└── README.md                        # System documentation
```

---

## RESTful API Endpoints (`/api/v1`)

### Auction Management
- `POST /api/v1/auctions`: Create a new auction.
  - Body: `{"title": "Sunwell Raid Loot", "auction_date": "2026-08-20T19:00:00Z"}`
- `POST /api/v1/auctions/:id/intents`: Submit member "Intent to Buy".
  - Body: `{"item_id": 1, "member_id": 2}`
- `POST /api/v1/auctions/:id/resolve`: Process allocation engine & update global ranks $1..M$.
  - Body: `{"item_id": 1, "quantity": 1}`

### Queue & History Views
- `GET /api/v1/items/:id/rankings`: Complete active queue ranking for an item (member name, rank, status, last won timestamp).
- `GET /api/v1/history/auctions/:id`: Allocation history by auction ID.
- `GET /api/v1/history/items/:id`: Allocation history by item ID.
- `GET /api/v1/history/members/:id`: Allocation history by guild member ID.

### System Health
- `GET /health`: DB connectivity status.

---

## How to Run & Test

```bash
# Build and run the server
go run ./cmd/api

# Run full unit & integration test suite
go test -v ./...
```
