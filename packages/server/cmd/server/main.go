package main

import (
	"log/slog"
	"os"

	"github.com/mhmadamrii/kommers/server/internal/config"
	"github.com/mhmadamrii/kommers/server/internal/database"
	"github.com/mhmadamrii/kommers/server/internal/router"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("db connect failed", "error", err)
		os.Exit(1)
	}
	if err := database.Migrate(db); err != nil {
		slog.Error("db migrate failed", "error", err)
		os.Exit(1)
	}

	r := router.New()

	slog.Info("server starting", "port", cfg.Port, "env", cfg.Env)
	if err := r.Run(":" + cfg.Port); err != nil {
		slog.Error("server failed", "error", err)
	}
}
