package service

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/0xfaidev3/kommers/services/auth/internal/domain"
	"github.com/0xfaidev3/kommers/services/auth/internal/security"
)

type fakeUserRepo struct {
	byEmail map[string]*domain.User
	byID    map[uuid.UUID]*domain.User
}

func newFakeUserRepo() *fakeUserRepo {
	return &fakeUserRepo{byEmail: map[string]*domain.User{}, byID: map[uuid.UUID]*domain.User{}}
}

func (r *fakeUserRepo) Create(_ context.Context, u *domain.User) error {
	u.ID = uuid.New()
	r.byEmail[u.Email] = u
	r.byID[u.ID] = u
	return nil
}

func (r *fakeUserRepo) FindByEmail(_ context.Context, email string) (*domain.User, error) {
	if u, ok := r.byEmail[email]; ok {
		return u, nil
	}
	return nil, gorm.ErrRecordNotFound
}

func (r *fakeUserRepo) FindByID(_ context.Context, id uuid.UUID) (*domain.User, error) {
	if u, ok := r.byID[id]; ok {
		return u, nil
	}
	return nil, gorm.ErrRecordNotFound
}

type fakeRefreshTokenRepo struct {
	byHash map[string]*domain.RefreshToken
	byID   map[uuid.UUID]*domain.RefreshToken
}

func newFakeRefreshTokenRepo() *fakeRefreshTokenRepo {
	return &fakeRefreshTokenRepo{byHash: map[string]*domain.RefreshToken{}, byID: map[uuid.UUID]*domain.RefreshToken{}}
}

func (r *fakeRefreshTokenRepo) Create(_ context.Context, rt *domain.RefreshToken) error {
	rt.ID = uuid.New()
	r.byHash[rt.TokenHash] = rt
	r.byID[rt.ID] = rt
	return nil
}

func (r *fakeRefreshTokenRepo) FindByHash(_ context.Context, hash string) (*domain.RefreshToken, error) {
	if rt, ok := r.byHash[hash]; ok {
		return rt, nil
	}
	return nil, gorm.ErrRecordNotFound
}

func (r *fakeRefreshTokenRepo) Revoke(_ context.Context, id uuid.UUID) error {
	if rt, ok := r.byID[id]; ok {
		rt.Revoked = true
	}
	return nil
}

func (r *fakeRefreshTokenRepo) RevokeFamily(_ context.Context, family uuid.UUID) error {
	for _, rt := range r.byID {
		if rt.Family == family {
			rt.Revoked = true
		}
	}
	return nil
}

func newTestService(t *testing.T) (*AuthService, *fakeUserRepo, *fakeRefreshTokenRepo) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}

	users := newFakeUserRepo()
	tokens := newFakeRefreshTokenRepo()
	issuer := security.NewJWTIssuer(key, time.Minute)
	svc := NewAuthService(users, tokens, issuer, 4, time.Hour)
	return svc, users, tokens
}

func TestRegisterAndDuplicateEmail(t *testing.T) {
	svc, _, _ := newTestService(t)
	ctx := context.Background()

	user, err := svc.Register(ctx, "a@example.com", "password123")
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if user.Role != domain.RoleCustomer {
		t.Errorf("role = %q, want %q", user.Role, domain.RoleCustomer)
	}

	if _, err := svc.Register(ctx, "a@example.com", "password123"); !errors.Is(err, ErrEmailTaken) {
		t.Errorf("expected ErrEmailTaken, got %v", err)
	}
}

func TestLoginSuccessAndWrongPassword(t *testing.T) {
	svc, _, _ := newTestService(t)
	ctx := context.Background()

	if _, err := svc.Register(ctx, "a@example.com", "password123"); err != nil {
		t.Fatalf("register: %v", err)
	}

	pair, err := svc.Login(ctx, "a@example.com", "password123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Error("expected non-empty access and refresh tokens")
	}

	if _, err := svc.Login(ctx, "a@example.com", "wrong"); !errors.Is(err, ErrInvalidCredentials) {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}

	if _, err := svc.Login(ctx, "nobody@example.com", "password123"); !errors.Is(err, ErrInvalidCredentials) {
		t.Errorf("expected ErrInvalidCredentials for unknown email, got %v", err)
	}
}

func TestRefreshRotatesToken(t *testing.T) {
	svc, _, tokens := newTestService(t)
	ctx := context.Background()

	if _, err := svc.Register(ctx, "a@example.com", "password123"); err != nil {
		t.Fatalf("register: %v", err)
	}
	first, err := svc.Login(ctx, "a@example.com", "password123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	second, err := svc.Refresh(ctx, first.RefreshToken)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if second.RefreshToken == first.RefreshToken {
		t.Error("expected refresh to rotate to a new token")
	}

	oldHash := hashToken(first.RefreshToken)
	oldRow, ok := tokens.byHash[oldHash]
	if !ok || !oldRow.Revoked {
		t.Error("expected old refresh token to be marked revoked after rotation")
	}
}

func TestRefreshReuseDetectedRevokesFamily(t *testing.T) {
	svc, _, tokens := newTestService(t)
	ctx := context.Background()

	if _, err := svc.Register(ctx, "a@example.com", "password123"); err != nil {
		t.Fatalf("register: %v", err)
	}
	first, err := svc.Login(ctx, "a@example.com", "password123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	second, err := svc.Refresh(ctx, first.RefreshToken)
	if err != nil {
		t.Fatalf("first refresh: %v", err)
	}

	// Reuse the already-rotated-away token — simulates a stolen refresh token.
	if _, err := svc.Refresh(ctx, first.RefreshToken); !errors.Is(err, ErrTokenReuseDetected) {
		t.Errorf("expected ErrTokenReuseDetected, got %v", err)
	}

	// The whole family, including the second (still "valid") token, must now be revoked.
	newHash := hashToken(second.RefreshToken)
	newRow, ok := tokens.byHash[newHash]
	if !ok || !newRow.Revoked {
		t.Error("expected entire token family to be revoked after reuse detection")
	}

	if _, err := svc.Refresh(ctx, second.RefreshToken); err == nil {
		t.Error("expected refresh with revoked family token to fail")
	}
}

func TestRefreshExpiredToken(t *testing.T) {
	svc, _, tokens := newTestService(t)
	ctx := context.Background()

	if _, err := svc.Register(ctx, "a@example.com", "password123"); err != nil {
		t.Fatalf("register: %v", err)
	}
	pair, err := svc.Login(ctx, "a@example.com", "password123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	tokens.byHash[hashToken(pair.RefreshToken)].ExpiresAt = time.Now().Add(-time.Minute)

	if _, err := svc.Refresh(ctx, pair.RefreshToken); !errors.Is(err, ErrTokenExpired) {
		t.Errorf("expected ErrTokenExpired, got %v", err)
	}
}

func TestLogoutRevokesToken(t *testing.T) {
	svc, _, tokens := newTestService(t)
	ctx := context.Background()

	if _, err := svc.Register(ctx, "a@example.com", "password123"); err != nil {
		t.Fatalf("register: %v", err)
	}
	pair, err := svc.Login(ctx, "a@example.com", "password123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	if err := svc.Logout(ctx, pair.RefreshToken); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if !tokens.byHash[hashToken(pair.RefreshToken)].Revoked {
		t.Error("expected refresh token to be revoked after logout")
	}

	if err := svc.Logout(ctx, "not-a-real-token"); !errors.Is(err, ErrInvalidToken) {
		t.Errorf("expected ErrInvalidToken for unknown token, got %v", err)
	}
}
