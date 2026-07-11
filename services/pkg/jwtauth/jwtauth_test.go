package jwtauth

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testKid = "test-key-1"

func newKeyAndJWKS(t *testing.T) (*rsa.PrivateKey, *httptest.Server) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}

	jwks := map[string][]map[string]string{
		"keys": {{
			"kty": "RSA",
			"use": "sig",
			"kid": testKid,
			"alg": "RS256",
			"n":   base64.RawURLEncoding.EncodeToString(key.PublicKey.N.Bytes()),
			"e":   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.PublicKey.E)).Bytes()),
		}},
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(jwks)
	}))
	t.Cleanup(srv.Close)
	return key, srv
}

func sign(t *testing.T, key *rsa.PrivateKey, kid, role string, ttl time.Duration) string {
	t.Helper()
	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, Claims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user-1",
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	})
	token.Header["kid"] = kid
	raw, err := token.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}

func TestVerifyValidToken(t *testing.T) {
	key, srv := newKeyAndJWKS(t)
	v := NewVerifier(srv.URL)

	claims, err := v.Verify(t.Context(), sign(t, key, testKid, "admin", time.Minute))
	if err != nil {
		t.Fatalf("Verify() error = %v", err)
	}
	if claims.Role != "admin" || claims.Subject != "user-1" {
		t.Errorf("claims = %+v", claims)
	}
}

func TestVerifyRejects(t *testing.T) {
	key, srv := newKeyAndJWKS(t)
	otherKey, _ := rsa.GenerateKey(rand.Reader, 2048)
	v := NewVerifier(srv.URL)

	for name, raw := range map[string]string{
		"expired":     sign(t, key, testKid, "admin", -2*time.Minute),
		"wrong key":   sign(t, otherKey, testKid, "admin", time.Minute),
		"unknown kid": sign(t, key, "no-such-kid", "admin", time.Minute),
		"garbage":     "not.a.token",
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := v.Verify(t.Context(), raw); err == nil {
				t.Error("Verify() = nil error, want rejection")
			}
		})
	}
}

func TestRequireRole(t *testing.T) {
	key, srv := newKeyAndJWKS(t)
	v := NewVerifier(srv.URL)
	next := func(w http.ResponseWriter, r *http.Request) {
		if ClaimsFrom(r.Context()) == nil {
			t.Error("claims missing from context in next handler")
		}
		w.WriteHeader(http.StatusOK)
	}
	protected := RequireRole(v, "admin", next)

	cases := []struct {
		name   string
		header string
		want   int
	}{
		{"no header", "", http.StatusUnauthorized},
		{"not bearer", "Basic abc", http.StatusUnauthorized},
		{"invalid token", "Bearer garbage", http.StatusUnauthorized},
		{"wrong role", "Bearer " + sign(t, key, testKid, "customer", time.Minute), http.StatusForbidden},
		{"admin", "Bearer " + sign(t, key, testKid, "admin", time.Minute), http.StatusOK},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/admin/x", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			rec := httptest.NewRecorder()
			protected(rec, req)
			if rec.Code != tc.want {
				t.Errorf("status = %d, want %d", rec.Code, tc.want)
			}
		})
	}
}

func TestFailsClosedWhenJWKSDown(t *testing.T) {
	key, _ := rsa.GenerateKey(rand.Reader, 2048)
	v := NewVerifier("http://127.0.0.1:1/jwks.json") // nothing listens here

	if _, err := v.Verify(t.Context(), sign(t, key, testKid, "admin", time.Minute)); err == nil {
		t.Error("Verify() with unreachable JWKS = nil error, want fail-closed rejection")
	}
}
