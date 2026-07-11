package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/0xfaidev3/kommers/services/pkg/httpmiddleware"
	"github.com/0xfaidev3/kommers/services/pkg/jwtauth"
	"github.com/0xfaidev3/kommers/services/pkg/observability"

	"github.com/0xfaidev3/kommers/services/catalog/internal/cache"
	"github.com/0xfaidev3/kommers/services/catalog/internal/config"
	"github.com/0xfaidev3/kommers/services/catalog/internal/handler"
	"github.com/0xfaidev3/kommers/services/catalog/internal/repository"
	"github.com/0xfaidev3/kommers/services/catalog/internal/storage"
)

func main() {
	cfg := config.Load()
	logger := observability.NewLogger("catalog")

	db, err := repository.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	appCache := cache.New(rdb, cfg.CacheTTL, logger)

	images, err := storage.NewImageStore(
		cfg.MinioEndpoint, cfg.MinioAccessKey, cfg.MinioSecretKey,
		cfg.MinioBucket, cfg.MinioPublicURL, cfg.MinioUseSSL,
	)
	if err != nil {
		logger.Error("failed to build minio client", "error", err)
		os.Exit(1)
	}
	// Best-effort: MinIO being down must not block the Postgres-backed API.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	images.EnsureBucket(ctx, logger)
	cancel()

	metrics := observability.NewMetrics()
	health := handler.NewHealthHandler(db)

	categoryRepo := repository.NewCategoryRepo(db)
	productRepo := repository.NewProductRepo(db)
	categoryHandler := handler.NewCategoryHandler(categoryRepo, appCache)
	productHandler := handler.NewProductHandler(productRepo, categoryRepo, appCache, images, cfg.MaxImageBytes)

	verifier := jwtauth.NewVerifier(cfg.AuthJWKSURL)
	admin := func(next http.HandlerFunc) http.HandlerFunc {
		return jwtauth.RequireRole(verifier, "admin", next)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", health.Healthz)
	mux.HandleFunc("GET /readyz", health.Readyz)
	mux.Handle("GET /metrics", metrics.Handler())

	mux.HandleFunc("GET /categories", categoryHandler.List)
	mux.HandleFunc("GET /products", productHandler.List)
	mux.HandleFunc("GET /products/{slug}", productHandler.GetBySlug)

	mux.HandleFunc("POST /admin/categories", admin(categoryHandler.Create))
	mux.HandleFunc("PUT /admin/categories/{id}", admin(categoryHandler.Update))
	mux.HandleFunc("DELETE /admin/categories/{id}", admin(categoryHandler.Delete))

	mux.HandleFunc("POST /admin/products", admin(productHandler.Create))
	mux.HandleFunc("PUT /admin/products/{id}", admin(productHandler.Update))
	mux.HandleFunc("DELETE /admin/products/{id}", admin(productHandler.Delete))

	mux.HandleFunc("POST /admin/products/{id}/variants", admin(productHandler.CreateVariant))
	mux.HandleFunc("PUT /admin/products/{id}/variants/{variantId}", admin(productHandler.UpdateVariant))
	mux.HandleFunc("DELETE /admin/products/{id}/variants/{variantId}", admin(productHandler.DeleteVariant))

	mux.HandleFunc("POST /admin/products/{id}/images", admin(productHandler.UploadImage))
	mux.HandleFunc("DELETE /admin/products/{id}/images/{imageId}", admin(productHandler.DeleteImage))

	root := httpmiddleware.CORS(cfg.CORSAllowedOrigins,
		httpmiddleware.CorrelationID(httpmiddleware.AccessLog(logger, metrics.Middleware(mux))))

	logger.Info("starting server", "port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, root); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
