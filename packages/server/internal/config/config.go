package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port        string
	Env         string
	DatabaseURL string
	JWTSecret   string
	JWTExpiry   time.Duration
	RabbitMQURL string
}

func Load() Config {
	expiryHours, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil {
		expiryHours = 24
	}

	return Config{
		Port:        getEnv("PORT", "8080"),
		Env:         getEnv("ENV", "development"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://amri@localhost:5432/kommers?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "dev-secret-change-me"),
		JWTExpiry:   time.Duration(expiryHours) * time.Hour,
		RabbitMQURL: getEnv("RABBITMQ_URL", "amqp://kommers:kommers@localhost:5672/"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
