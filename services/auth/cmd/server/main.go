package main

import (
	"net/http"
	"os"

	"github.com/redis/go-redis/v9"

	"github.com/0xfaidev3/kommers/services/auth/internal/config"
	"github.com/0xfaidev3/kommers/services/auth/internal/handler"
	appmiddleware "github.com/0xfaidev3/kommers/services/auth/internal/middleware"
	"github.com/0xfaidev3/kommers/services/auth/internal/observability"
	"github.com/0xfaidev3/kommers/services/auth/internal/ratelimit"
	"github.com/0xfaidev3/kommers/services/auth/internal/repository"
	"github.com/0xfaidev3/kommers/services/auth/internal/security"
	"github.com/0xfaidev3/kommers/services/auth/internal/service"
)

func main() {
	cfg := config.Load()
	logger := observability.NewLogger("auth")

	db, err := repository.NewPostgres(cfg.DatabaseURL)
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}

	privateKey, err := security.LoadOrGenerateKeyPair(cfg.JWTPrivateKeyPath)
	if err != nil {
		logger.Error("failed to load JWT signing key", "error", err)
		os.Exit(1)
	}

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})

	metrics := observability.NewMetrics()
	health := handler.NewHealthHandler(db)

	jwtIssuer := security.NewJWTIssuer(privateKey, cfg.AccessTokenTTL)
	authService := service.NewAuthService(
		repository.NewUserRepo(db),
		repository.NewRefreshTokenRepo(db),
		jwtIssuer,
		cfg.BcryptCost,
		cfg.RefreshTokenTTL,
	)
	authHandler := handler.NewAuthHandler(authService)
	jwksHandler := handler.NewJWKSHandler(jwtIssuer)

	loginLimiter := ratelimit.NewLimiter(rdb, cfg.LoginRateLimit, cfg.RateLimitWindow)
	registerLimiter := ratelimit.NewLimiter(rdb, cfg.RegisterRateLimit, cfg.RateLimitWindow)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", health.Healthz)
	mux.HandleFunc("GET /readyz", health.Readyz)
	mux.Handle("GET /metrics", metrics.Handler())
	mux.HandleFunc("GET /.well-known/jwks.json", jwksHandler.ServeHTTP)

	mux.HandleFunc("POST /auth/register", appmiddleware.RateLimit(registerLimiter, "register", authHandler.Register))
	mux.HandleFunc("POST /auth/login", appmiddleware.RateLimit(loginLimiter, "login", authHandler.Login))
	mux.HandleFunc("POST /auth/refresh", authHandler.Refresh)
	mux.HandleFunc("POST /auth/logout", authHandler.Logout)

	logger.Info("starting server", "port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, metrics.Middleware(mux)); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
