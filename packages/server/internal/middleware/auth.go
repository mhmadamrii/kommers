package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/mhmadamrii/kommers/server/internal/model"
	"github.com/mhmadamrii/kommers/server/internal/token"
)

const (
	CtxUserID = "userID"
	CtxRole   = "role"

	// CookieName is where the JWT lives for browser clients (httpOnly).
	// API clients (curl, k6, mobile) keep using the Authorization header —
	// checked first below, so both work.
	CookieName = "kommers_token"
)

func RequireAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := extractToken(c)
		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}

		claims, err := token.Parse(secret, tokenStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxRole, claims.Role)
		c.Next()
	}
}

func extractToken(c *gin.Context) string {
	if header := c.GetHeader("Authorization"); strings.HasPrefix(header, "Bearer ") {
		return strings.TrimPrefix(header, "Bearer ")
	}
	if cookie, err := c.Cookie(CookieName); err == nil {
		return cookie
	}
	return ""
}

func RequireRole(roles ...model.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get(CtxRole)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}

		role, _ := roleVal.(model.Role)
		for _, r := range roles {
			if role == r {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
	}
}
