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

	// Auction resolution route
	r.Post("/auctions/{id}/resolve", handlers.ResolveAuctionHandler(db))

	return &Server{
		router: r,
		config: cfg,
		db:     db,
	}
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
