package middleware

import (
	"fmt"
	"net"
	"net/http"

	"github.com/0xfaidev3/kommers/services/auth/internal/ratelimit"
)

// RateLimit wraps a handler with a per-IP fixed-window limiter, scoped by
// name (e.g. "register", "login") so each endpoint has its own budget.
func RateLimit(limiter *ratelimit.Limiter, scope string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			ip = r.RemoteAddr
		}

		key := fmt.Sprintf("ratelimit:%s:%s", scope, ip)
		allowed, err := limiter.Allow(r.Context(), key)
		if err != nil {
			http.Error(w, "rate limiter unavailable", http.StatusServiceUnavailable)
			return
		}
		if !allowed {
			http.Error(w, "too many requests", http.StatusTooManyRequests)
			return
		}

		next(w, r)
	}
}
