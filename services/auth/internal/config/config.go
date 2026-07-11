package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port               string
	DatabaseURL        string
	RedisAddr          string
	JWTPrivateKeyPath  string
	BcryptCost         int
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	LoginRateLimit     int64
	RegisterRateLimit  int64
	RateLimitWindow    time.Duration
	CORSAllowedOrigins []string
}

func Load() Config {
	return Config{
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://kommers:kommers@localhost:5432/kommers_auth?sslmode=disable"),
		RedisAddr:          getEnv("REDIS_ADDR", "localhost:6379"),
		JWTPrivateKeyPath:  getEnv("JWT_PRIVATE_KEY_PATH", "./keys/private.pem"),
		BcryptCost:         getEnvInt("BCRYPT_COST", 12),
		AccessTokenTTL:     getEnvDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:    getEnvDuration("REFRESH_TOKEN_TTL", 30*24*time.Hour),
		LoginRateLimit:     int64(getEnvInt("LOGIN_RATE_LIMIT", 5)),
		RegisterRateLimit:  int64(getEnvInt("REGISTER_RATE_LIMIT", 5)),
		RateLimitWindow:    getEnvDuration("RATE_LIMIT_WINDOW", time.Minute),
		CORSAllowedOrigins: strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000"), ","),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
