package security

import (
	"crypto/rand"
	"crypto/rsa"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/0xfaidev3/kommers/services/auth/internal/domain"
)

func testKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return key
}

func TestJWTIssueAndVerify(t *testing.T) {
	issuer := NewJWTIssuer(testKey(t), time.Minute)
	userID := uuid.New()

	token, err := issuer.Issue(userID, domain.RoleAdmin)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}

	claims, err := issuer.Verify(token)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.Subject != userID.String() {
		t.Errorf("subject = %q, want %q", claims.Subject, userID.String())
	}
	if claims.Role != domain.RoleAdmin {
		t.Errorf("role = %q, want %q", claims.Role, domain.RoleAdmin)
	}
}

func TestJWTVerifyRejectsExpired(t *testing.T) {
	issuer := NewJWTIssuer(testKey(t), -time.Minute)

	token, err := issuer.Issue(uuid.New(), domain.RoleCustomer)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}

	if _, err := issuer.Verify(token); err == nil {
		t.Error("expected verify to fail for expired token")
	}
}

func TestJWTVerifyRejectsWrongKey(t *testing.T) {
	signer := NewJWTIssuer(testKey(t), time.Minute)
	token, err := signer.Issue(uuid.New(), domain.RoleCustomer)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}

	verifier := NewJWTIssuer(testKey(t), time.Minute)
	if _, err := verifier.Verify(token); err == nil {
		t.Error("expected verify to fail when signed by a different key")
	}
}

func TestJWKSContainsPublicKey(t *testing.T) {
	issuer := NewJWTIssuer(testKey(t), time.Minute)
	jwks := issuer.JWKS()

	keys, ok := jwks["keys"]
	if !ok || len(keys) != 1 {
		t.Fatalf("expected exactly one key in jwks, got %+v", jwks)
	}
	if keys[0].Kid != KeyID || keys[0].Kty != "RSA" || keys[0].Alg != "RS256" {
		t.Errorf("unexpected jwk fields: %+v", keys[0])
	}
}
