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

// Readyz reports readiness — the service can actually serve traffic.
func (h *HealthHandler) Readyz(w http.ResponseWriter, r *http.Request) {
	sqlDB, err := h.db.DB()
	if err != nil || sqlDB.PingContext(r.Context()) != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)
}
