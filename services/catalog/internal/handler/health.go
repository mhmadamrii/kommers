package handler

import (
	"net/http"

	"gorm.io/gorm"
)

type HealthHandler struct {
	db *gorm.DB
}

func NewHealthHandler(db *gorm.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

// Healthz reports liveness — the process is up. No dependency checks.
func (h *HealthHandler) Healthz(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
}

// Readyz reports readiness. Only Postgres is fatal: Redis degrades to
// cache misses and MinIO only affects image bytes served directly by MinIO
// itself, so neither should pull this instance out of the load balancer
// (docs/catalog-service.md § Failure Cases).
func (h *HealthHandler) Readyz(w http.ResponseWriter, r *http.Request) {
	sqlDB, err := h.db.DB()
	if err != nil || sqlDB.PingContext(r.Context()) != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)
}
