package handler

import (
	"encoding/json"
	"net/http"

	"github.com/0xfaidev3/kommers/services/auth/internal/security"
)

type JWKSHandler struct {
	jwt *security.JWTIssuer
}

func NewJWKSHandler(jwt *security.JWTIssuer) *JWKSHandler {
	return &JWKSHandler{jwt: jwt}
}

func (h *JWKSHandler) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(h.jwt.JWKS())
}
