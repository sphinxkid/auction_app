package config

import (
	"os"
)

// Config holds environment and server configuration options.
type Config struct {
	ServerAddress string
	DBDriver      string
	DBPath        string
	Environment   string
}

// LoadConfig retrieves configuration settings from environment variables with safe defaults.
func LoadConfig() *Config {
	serverAddr := getEnv("SERVER_ADDRESS", "127.0.0.1:8080")
	dbDriver := getEnv("DB_DRIVER", "sqlite")
	dbPath := getEnv("DB_PATH", "guild_loot.db")
	env := getEnv("ENVIRONMENT", "development")

	return &Config{
		ServerAddress: serverAddr,
		DBDriver:      dbDriver,
		DBPath:        dbPath,
		Environment:   env,
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	return fallback
}
