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
		Port:               getEnv("PORT", "8080"),
		Env:                env,
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://amri@localhost:5432/kommers?sslmode=disable"),
		JWTSecret:          getEnv("JWT_SECRET", "dev-secret-change-me"),
		JWTExpiry:          time.Duration(expiryHours) * time.Hour,
		RabbitMQURL:        getEnv("RABBITMQ_URL", "amqp://kommers:kommers@localhost:5672/"),
		CORSAllowedOrigins: splitCSV(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")),
		CookieDomain:       getEnv("COOKIE_DOMAIN", ""),
		CookieSecure:       cookieSecure,
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
