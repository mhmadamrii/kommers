package jwtauth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const clockSkewLeeway = 30 * time.Second

// minRefetchInterval stops a flood of requests carrying an unknown (or
// garbage) `kid` from hammering the Auth Service JWKS endpoint.
const minRefetchInterval = 30 * time.Second

// Claims is the cross-service view of an access token: the registered
// claims plus the role Auth Service embeds at issuance.
type Claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// Verifier validates RS256 access tokens against public keys fetched from
// an Auth Service JWKS endpoint. Keys are cached in-process; an unknown
// `kid` triggers one rate-limited refetch so key rotation is tolerated
// without a restart. No call to Auth Service happens on the hot path —
// that's the point of the RS256/JWKS design (docs/auth-service.md).
type Verifier struct {
	jwksURL string
	client  *http.Client

	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey
	lastFetch time.Time
}

func NewVerifier(jwksURL string) *Verifier {
	return &Verifier{
		jwksURL: jwksURL,
		client:  &http.Client{Timeout: 5 * time.Second},
		keys:    map[string]*rsa.PublicKey{},
	}
}

// Verify parses and validates a raw token, returning its claims.
func (v *Verifier) Verify(ctx context.Context, raw string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodRS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %s", t.Method.Alg())
		}
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, fmt.Errorf("token missing kid header")
		}
		return v.publicKey(ctx, kid)
	}, jwt.WithLeeway(clockSkewLeeway))
	if err != nil {
		return nil, err
	}
	return claims, nil
}

func (v *Verifier) publicKey(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	key, ok := v.keys[kid]
	v.mu.RUnlock()
	if ok {
		return key, nil
	}

	if err := v.refetch(ctx); err != nil {
		return nil, fmt.Errorf("jwks refetch: %w", err)
	}

	v.mu.RLock()
	key, ok = v.keys[kid]
	v.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("no key for kid %q", kid)
	}
	return key, nil
}

func (v *Verifier) refetch(ctx context.Context) error {
	v.mu.Lock()
	defer v.mu.Unlock()
	if time.Since(v.lastFetch) < minRefetchInterval && len(v.keys) > 0 {
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	res, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks endpoint returned %d", res.StatusCode)
	}

	var doc struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(res.Body).Decode(&doc); err != nil {
		return err
	}

	keys := make(map[string]*rsa.PublicKey, len(doc.Keys))
	for _, k := range doc.Keys {
		if k.Kty != "RSA" {
			continue
		}
		pub, err := parseRSAKey(k)
		if err != nil {
			return fmt.Errorf("parse jwk %q: %w", k.Kid, err)
		}
		keys[k.Kid] = pub
	}
	if len(keys) == 0 {
		return fmt.Errorf("jwks document contained no usable RSA keys")
	}

	v.keys = keys
	v.lastFetch = time.Now()
	return nil
}

func parseRSAKey(k jwk) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, err
	}
	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: int(new(big.Int).SetBytes(eBytes).Int64()),
	}, nil
}
