package security

import (
	"crypto/rsa"
	"encoding/base64"
	"fmt"
	"math/big"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/0xfaidev3/kommers/services/auth/internal/domain"
)

// KeyID identifies the single active signing key. Rotate by generating a new
// key file and changing this constant once multi-key JWKS support is needed.
const KeyID = "auth-key-1"

const clockSkewLeeway = 30 * time.Second

type Claims struct {
	Role domain.Role `json:"role"`
	jwt.RegisteredClaims
}

type JWTIssuer struct {
	key *rsa.PrivateKey
	ttl time.Duration
}

func NewJWTIssuer(key *rsa.PrivateKey, accessTTL time.Duration) *JWTIssuer {
	return &JWTIssuer{key: key, ttl: accessTTL}
}

func (j *JWTIssuer) Issue(userID uuid.UUID, role domain.Role) (string, error) {
	now := time.Now()
	claims := Claims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(j.ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = KeyID
	return token.SignedString(j.key)
}

func (j *JWTIssuer) Verify(raw string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodRS256.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %s", t.Method.Alg())
		}
		return &j.key.PublicKey, nil
	}, jwt.WithLeeway(clockSkewLeeway))
	if err != nil {
		return nil, err
	}
	return claims, nil
}

// JWK is the JSON Web Key representation of the RSA public key, served at
// /.well-known/jwks.json so other services can verify tokens without ever
// contacting Auth Service's signing key directly.
type JWK struct {
	Kty string `json:"kty"`
	Use string `json:"use"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (j *JWTIssuer) JWKS() map[string][]JWK {
	pub := j.key.PublicKey
	jwk := JWK{
		Kty: "RSA",
		Use: "sig",
		Kid: KeyID,
		Alg: "RS256",
		N:   base64.RawURLEncoding.EncodeToString(pub.N.Bytes()),
		E:   base64.RawURLEncoding.EncodeToString(big.NewInt(int64(pub.E)).Bytes()),
	}
	return map[string][]JWK{"keys": {jwk}}
}
