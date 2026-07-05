package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/0xfaidev3/kommers/services/auth/internal/domain"
	"github.com/0xfaidev3/kommers/services/auth/internal/security"
)

type contextKey string

const claimsContextKey contextKey = "claims"

// RequireAuth verifies the Bearer JWT on the request and injects its claims
// into the request context for downstream handlers (e.g. RequireRole).
func RequireAuth(jwt *security.JWTIssuer, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			http.Error(w, "missing bearer token", http.StatusUnauthorized)
			return
		}

		claims, err := jwt.Verify(token)
		if err != nil {
			http.Error(w, "invalid or expired token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), claimsContextKey, claims)
		next(w, r.WithContext(ctx))
	}
}

// RequireRole builds on RequireAuth's injected claims and rejects requests
// whose JWT role claim doesn't match. Call chain: RequireAuth then RequireRole.
func RequireRole(role domain.Role, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, ok := r.Context().Value(claimsContextKey).(*security.Claims)
		if !ok || claims.Role != role {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		next(w, r)
	}
}
