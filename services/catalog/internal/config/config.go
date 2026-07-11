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
	CacheTTL           time.Duration
	MinioEndpoint      string
	MinioAccessKey     string
	MinioSecretKey     string
	MinioBucket        string
	MinioUseSSL        bool
	MinioPublicURL     string
	AuthJWKSURL        string
	MaxImageBytes      int64
	CORSAllowedOrigins []string
}

func Load() Config {
	return Config{
		Port:               getEnv("PORT", "8081"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://kommers:kommers@localhost:5432/kommers_catalog?sslmode=disable"),
		RedisAddr:          getEnv("REDIS_ADDR", "localhost:6379"),
		CacheTTL:           getEnvDuration("CACHE_TTL", 10*time.Minute),
		MinioEndpoint:      getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey:     getEnv("MINIO_ACCESS_KEY", "kommers"),
		MinioSecretKey:     getEnv("MINIO_SECRET_KEY", "kommers-minio"),
		MinioBucket:        getEnv("MINIO_BUCKET", "product-images"),
		MinioUseSSL:        getEnvBool("MINIO_USE_SSL", false),
		MinioPublicURL:     getEnv("MINIO_PUBLIC_URL", "http://localhost:9000"),
		AuthJWKSURL:        getEnv("AUTH_JWKS_URL", "http://localhost:8080/.well-known/jwks.json"),
		MaxImageBytes:      int64(getEnvInt("MAX_IMAGE_BYTES", 5*1024*1024)),
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

func getEnvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
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
