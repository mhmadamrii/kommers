package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port               string
	Env                string
	DatabaseURL        string
	JWTSecret          string
	JWTExpiry          time.Duration
	RabbitMQURL        string
	CORSAllowedOrigins []string
	CookieDomain       string
	CookieSecure       bool
	S3Endpoint         string
	S3AccessKeyID      string
	S3SecretAccessKey  string
	S3Bucket           string
	S3UseSSL           bool
	// S3PublicURL is the scheme+host a browser reaches the bucket at — may
	// differ from S3Endpoint (e.g. compose's internal "minio:9000" vs. the
	// host-exposed "localhost:9000").
	S3PublicURL string
	// StripeSecretKey empty disables Stripe entirely (Checkout 503s, same
	// down-dependency pattern as Storage/RabbitMQ) rather than crashing boot.
	StripeSecretKey     string
	StripeWebhookSecret string
	// FrontendURL builds the Checkout Session's success/cancel redirect
	// targets — never guessed from a request header.
	FrontendURL string
}

func Load() Config {
	expiryHours, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil {
		expiryHours = 24
	}

	env := getEnv("ENV", "development")
	cookieSecure := env != "development"
	if v := os.Getenv("COOKIE_SECURE"); v != "" {
		cookieSecure = v == "true"
	}

	return Config{
		Port:                getEnv("PORT", "8080"),
		Env:                 env,
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://amri@localhost:5432/kommers?sslmode=disable"),
		JWTSecret:           getEnv("JWT_SECRET", "dev-secret-change-me"),
		JWTExpiry:           time.Duration(expiryHours) * time.Hour,
		RabbitMQURL:         getEnv("RABBITMQ_URL", "amqp://kommers:kommers@localhost:5672/"),
		CORSAllowedOrigins:  splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")),
		CookieDomain:        getEnv("COOKIE_DOMAIN", ""),
		CookieSecure:        cookieSecure,
		S3Endpoint:          getEnv("S3_ENDPOINT", "localhost:9000"),
		S3AccessKeyID:       getEnv("S3_ACCESS_KEY_ID", "kommers"),
		S3SecretAccessKey:   getEnv("S3_SECRET_ACCESS_KEY", "kommers123"),
		S3Bucket:            getEnv("S3_BUCKET", "kommers"),
		S3UseSSL:            getEnv("S3_USE_SSL", "false") == "true",
		S3PublicURL:         getEnv("S3_PUBLIC_URL", "http://localhost:9000"),
		StripeSecretKey:     getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET", ""),
		FrontendURL:         getEnv("FRONTEND_URL", "http://localhost:3000"),
	}
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
