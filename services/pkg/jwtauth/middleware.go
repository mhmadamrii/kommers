package jwtauth

import (
	"context"
	"net/http"
	"strings"
)

type claimsKey struct{}

// RequireRole gates a handler behind a valid access token carrying the given
// role. Missing/invalid tokens are 401; a valid token with the wrong role is
// 403. Verified claims land in the request context (see ClaimsFrom).
//
// If the JWKS endpoint is unreachable the request fails closed (401) — an
// admin surface that can't check credentials must not guess.
func RequireRole(v *Verifier, role string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		raw, ok := strings.CutPrefix(auth, "Bearer ")
		if !ok || raw == "" {
			http.Error(w, `{"error":"missing bearer token"}`, http.StatusUnauthorized)
			return
		}

		claims, err := v.Verify(r.Context(), raw)
		if err != nil {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}
		if claims.Role != role {
			http.Error(w, `{"error":"insufficient role"}`, http.StatusForbidden)
			return
		}

		next(w, r.WithContext(context.WithValue(r.Context(), claimsKey{}, claims)))
	}
}

// ClaimsFrom returns the verified claims stored by RequireRole, or nil.
func ClaimsFrom(ctx context.Context) *Claims {
	if c, ok := ctx.Value(claimsKey{}).(*Claims); ok {
		return c
	}
	return nil
}
