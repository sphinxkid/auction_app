package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"gorm.io/gorm"

	"guild-loot-system/internal/database"
)

// HealthResponse represents the JSON payload for health checks.
type HealthResponse struct {
	Status    string    `json:"status"`
	Database  string    `json:"database"`
	Timestamp time.Time `json:"timestamp"`
}

// HealthHandler returns an http.HandlerFunc that verifies database connectivity and system status.
func HealthHandler(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		
		dbStatus := "connected"
		statusCode := http.StatusOK
		statusText := "ok"

		if err := database.PingDB(db); err != nil {
			dbStatus = "disconnected"
			statusCode = http.StatusServiceUnavailable
			statusText = "degraded"
		}

		response := HealthResponse{
			Status:    statusText,
			Database:  dbStatus,
			Timestamp: time.Now().UTC(),
		}

		w.WriteHeader(statusCode)
		_ = json.NewEncoder(w).Encode(response)
	}
}
