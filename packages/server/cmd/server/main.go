package main

import (
	"log/slog"
	"os"

	_ "github.com/mhmadamrii/kommers/server/docs"
	"github.com/mhmadamrii/kommers/server/internal/broker"
	"github.com/mhmadamrii/kommers/server/internal/config"
	"github.com/mhmadamrii/kommers/server/internal/database"
	"github.com/mhmadamrii/kommers/server/internal/handler"
	"github.com/mhmadamrii/kommers/server/internal/router"
	"github.com/mhmadamrii/kommers/server/internal/storage"
)

// @title						Kommers API
// @version					1.0
// @description				E-commerce backend API for kommers.
// @BasePath					/
// @securityDefinitions.apikey	BearerAuth
// @in							header
// @name						Authorization
// @description				Type "Bearer" followed by a space and the JWT token.
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

	// Order events are best-effort: a down/unreachable broker must never
	// block server startup or break checkout.
	var eventPublisher handler.OrderEventPublisher
	publisher, err := broker.Connect(cfg.RabbitMQURL)
	if err != nil {
		slog.Warn("rabbitmq unavailable, order events disabled", "error", err)
	} else {
		defer publisher.Close()
		eventPublisher = publisher
	}

	// Product image uploads are best-effort: unreachable object storage
	// must never block server startup — the upload endpoint just 503s.
	storageClient, err := storage.New(cfg)
	if err != nil {
		slog.Warn("object storage unavailable, product image upload disabled", "error", err)
		storageClient = nil
	}

	r := router.New(db, cfg, eventPublisher, storageClient)

	slog.Info("server starting", "port", cfg.Port, "env", cfg.Env)
	if err := r.Run(":" + cfg.Port); err != nil {
		slog.Error("server failed", "error", err)
	}
}
