# Guild Loot Queueing & Allocation System

A Full-Stack Go + React/TypeScript application for managing predictable, repeatable guild raid loot via granular item-by-item auction resolutions, three-tier priority queueing, explicit sequential integer re-ranking ($1..M$), and automated parent auction completion checks.

## Project Architecture

```text
├── cmd/
│   └── api/
│       └── main.go                  # Application entrypoint
├── internal/
│   ├── api/
│   │   ├── handlers/
│   │   │   ├── api_test.go          # REST API integration tests
│   │   │   ├── auction_handler.go   # Auction & item intent HTTP handlers
│   │   │   ├── history_handler.go   # Allocation history HTTP handlers
│   │   │   ├── queue_handler.go     # Item queue rankings HTTP handler
│   │   │   ├── health.go            # /health HTTP handler
│   │   │   └── health_test.go       # Health unit tests
│   │   └── server.go                # Chi router & static SPA server lifecycle
│   ├── config/
│   │   └── config.go                # Environment configuration
│   ├── database/
│   │   ├── database.go              # GORM SQLite connection & auto-migration
│   │   ├── database_test.go         # Migration & seeder unit tests
│   │   └── seeder.go                # Idempotent data seeder (6 members, 2 items)
│   ├── models/
│   │   └── models.go                # Domain models (GuildMember, Item, Auction, AuctionItem, etc.)
│   └── services/
│       ├── allocation.go            # Per-item 3-tier allocation engine & completion check
│       └── allocation_test.go       # Allocation engine unit tests
├── web/                             # Single-Page React + TypeScript + Tailwind Test Console
│   ├── src/
│   │   ├── components/
│   │   │   └── LootQueueConsole.tsx # Modern dark-mode test console
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── dist/                        # Compiled production frontend SPA
│   ├── package.json
│   └── vite.config.ts
├── go.mod                           # Go module definition
└── README.md                        # System documentation
```

---

## Seed Data

- **6 Guild Members**: Aeloria, Vorn, Kaelen, Sylas, Morrigan, Thalor.
- **2 Repeatable Items**: "Primordial Essence" and "Dragon Scale".

---

## RESTful API Endpoints (`/api/v1`)

### Domain Queries
- `GET /api/v1/members`: List all guild members.
- `GET /api/v1/items`: List all available raid items.

### Auction Management
- `POST /api/v1/auctions`: Create auction with nested item quantities.
  - Body: `{"title": "Raid Night - Molten Core", "items": [{"item_id": 1, "quantity": 2}, {"item_id": 2, "quantity": 1}]}`
- `GET /api/v1/auctions/active`: Get active auction with nested `AuctionItems`, intent lists, and status.
- `POST /api/v1/auction-items/:id/intents`: Toggle member intent to buy (`{"member_id": 1}`).
- `POST /api/v1/auction-items/:id/resolve`: Resolve single item, allocate loot, update queue ranks $1..M$, and check parent auction completion.

### Queue & History Views
- `GET /api/v1/items/:id/rankings`: Complete active queue ranking for an item.
- `GET /api/v1/history/items/:id`: Allocation history for an item.

---

## How to Run

```bash
# 1. Build the React frontend
cd web && npm install && npm run build

# 2. Start the Go backend server (serves API & SPA on http://127.0.0.1:8080)
go run ./cmd/api

# 3. Run full Go backend unit test suite
go test -v ./...
```
