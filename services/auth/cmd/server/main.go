package main

import (
	"net/http"
	"os"

	"github.com/0xfaidev3/kommers/services/auth/internal/config"
	"github.com/0xfaidev3/kommers/services/auth/internal/handler"
	"github.com/0xfaidev3/kommers/services/auth/internal/observability"
	"github.com/0xfaidev3/kommers/services/auth/internal/repository"
)

func main() {
	cfg := config.Load()
	logger := observability.NewLogger("auth")

	db, err := repository.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}

	metrics := observability.NewMetrics()
	health := handler.NewHealthHandler(db)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", health.Healthz)
	mux.HandleFunc("GET /readyz", health.Readyz)
	mux.Handle("GET /metrics", metrics.Handler())

	logger.Info("starting server", "port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, metrics.Middleware(mux)); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
