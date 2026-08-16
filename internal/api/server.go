package api

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"gorm.io/gorm"

	"guild-loot-system/internal/api/handlers"
	"guild-loot-system/internal/config"
)

// Server encapsulates the HTTP router and configuration.
type Server struct {
	router *chi.Mux
	config *config.Config
	db     *gorm.DB
}

// NewServer initializes routes, middleware, and handlers.
func NewServer(cfg *config.Config, db *gorm.DB) *Server {
	r := chi.NewRouter()

	// Built-in Chi middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Set header defaults
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			next.ServeHTTP(w, r)
		})
	})

	// Health check route
	r.Get("/health", handlers.HealthHandler(db))

	// RESTful API v1 Routes
	r.Route("/api/v1", func(r chi.Router) {
		// Domain Queries & Management
		r.Get("/classes", handlers.GetClassesHandler(db))
		r.Post("/classes", handlers.CreateClassHandler(db))
		r.Get("/members", handlers.GetMembersHandler(db))
		r.Post("/members", handlers.CreateMemberHandler(db))
		r.Get("/items", handlers.GetItemsHandler(db))
		r.Post("/items", handlers.CreateItemHandler(db))

		// Auction Management
		r.Post("/auctions", handlers.CreateAuctionHandler(db))
		r.Get("/auctions/active", handlers.GetActiveAuctionHandler(db))

		// AuctionItem Quantity, Intents & Resolution
		r.Patch("/auction-items/{id}/quantity", handlers.UpdateAuctionItemQuantityHandler(db))
		r.Post("/auction-items/{id}/intents", handlers.SubmitAuctionItemIntentHandler(db))
		r.Post("/auction-items/{id}/resolve", handlers.ResolveAuctionItemHandler(db))

		// Queue & Ranking Views
		r.Get("/items/{id}/rankings", handlers.GetItemQueueRankingsHandler(db))

		// Allocation & Rank History Views
		r.Get("/history/auctions/{id}", handlers.GetAuctionHistoryHandler(db))
		r.Get("/history/items/{id}", handlers.GetItemHistoryHandler(db))
		r.Get("/history/members/{id}", handlers.GetMemberHistoryHandler(db))
		r.Get("/history/ranks/items/{id}", handlers.GetItemRankHistoryHandler(db))
	})

	// Serve Static Single-Page React App (if web/dist exists)
	distDir := "./web/dist"
	if _, err := os.Stat(distDir); err == nil {
		fileServer := http.FileServer(http.Dir(distDir))
		r.Handle("/*", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := distDir + r.URL.Path
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, r, distDir+"/index.html")
				return
			}
			fileServer.ServeHTTP(w, r)
		}))
	}

	return &Server{
		router: r,
		config: cfg,
		db:     db,
	}
}

// GetRouter returns the underlying Chi router instance (useful for testing).
func (s *Server) GetRouter() *chi.Mux {
	return s.router
}

// Start launches the HTTP server with graceful shutdown handling.
func (s *Server) Start() error {
	srv := &http.Server{
		Addr:         s.config.ServerAddress,
		Handler:      s.router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	serverCtx, serverStopCtx := context.WithCancel(context.Background())

	// Listen for interrupt/termination signals for graceful shutdown
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sig
		log.Println("Shutting down server gracefully...")

		shutdownCtx, cancel := context.WithTimeout(serverCtx, 10*time.Second)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Fatalf("Server forced shutdown error: %v", err)
		}
		serverStopCtx()
	}()

	log.Printf("Guild Loot Queue API listening on http://%s (Env: %s)", s.config.ServerAddress, s.config.Environment)
	err := srv.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	<-serverCtx.Done()
	log.Println("Server stopped cleanly.")
	return nil
}
