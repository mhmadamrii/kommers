package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/0xfaidev3/kommers/services/auth/internal/domain"
	"github.com/0xfaidev3/kommers/services/auth/internal/security"
)

var (
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidToken       = errors.New("invalid refresh token")
	ErrTokenExpired       = errors.New("refresh token expired")
	ErrTokenReuseDetected = errors.New("refresh token reuse detected")
)

type UserRepository interface {
	Create(ctx context.Context, u *domain.User) error
	FindByEmail(ctx context.Context, email string) (*domain.User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
}

type RefreshTokenRepository interface {
	Create(ctx context.Context, rt *domain.RefreshToken) error
	FindByHash(ctx context.Context, hash string) (*domain.RefreshToken, error)
	Revoke(ctx context.Context, id uuid.UUID) error
	RevokeFamily(ctx context.Context, family uuid.UUID) error
}

type AuthService struct {
	users         UserRepository
	refreshTokens RefreshTokenRepository
	jwt           *security.JWTIssuer
	bcryptCost    int
	refreshTTL    time.Duration
}

func NewAuthService(users UserRepository, refreshTokens RefreshTokenRepository, jwt *security.JWTIssuer, bcryptCost int, refreshTTL time.Duration) *AuthService {
	return &AuthService{
		users:         users,
		refreshTokens: refreshTokens,
		jwt:           jwt,
		bcryptCost:    bcryptCost,
		refreshTTL:    refreshTTL,
	}
}

func (s *AuthService) Register(ctx context.Context, email, password string) (*domain.User, error) {
	if _, err := s.users.FindByEmail(ctx, email); err == nil {
		return nil, ErrEmailTaken
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hash, err := security.HashPassword(password, s.bcryptCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{Email: email, PasswordHash: hash, Role: domain.RoleCustomer}
	if err := s.users.Create(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

// TokenPair is the access + refresh token result of a successful login or rotation.
type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*TokenPair, error) {
	user, err := s.users.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !security.VerifyPassword(user.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}

	return s.issuePair(ctx, user, uuid.New())
}

// Refresh exchanges a valid refresh token for a new pair, rotating the
// token. Presenting an already-rotated (Revoked) token is treated as theft:
// the entire family is revoked and the caller must force a full re-login.
func (s *AuthService) Refresh(ctx context.Context, rawToken string) (*TokenPair, error) {
	hash := hashToken(rawToken)
	stored, err := s.refreshTokens.FindByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidToken
		}
		return nil, err
	}

	if stored.Revoked {
		if err := s.refreshTokens.RevokeFamily(ctx, stored.Family); err != nil {
			return nil, err
		}
		return nil, ErrTokenReuseDetected
	}

	if time.Now().After(stored.ExpiresAt) {
		return nil, ErrTokenExpired
	}

	user, err := s.users.FindByID(ctx, stored.UserID)
	if err != nil {
		return nil, err
	}

	if err := s.refreshTokens.Revoke(ctx, stored.ID); err != nil {
		return nil, err
	}

	return s.issuePair(ctx, user, stored.Family)
}

func (s *AuthService) Logout(ctx context.Context, rawToken string) error {
	stored, err := s.refreshTokens.FindByHash(ctx, hashToken(rawToken))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrInvalidToken
		}
		return err
	}
	return s.refreshTokens.Revoke(ctx, stored.ID)
}

func (s *AuthService) issuePair(ctx context.Context, user *domain.User, family uuid.UUID) (*TokenPair, error) {
	access, err := s.jwt.Issue(user.ID, user.Role)
	if err != nil {
		return nil, err
	}

	raw, err := generateRawToken()
	if err != nil {
		return nil, err
	}

	rt := &domain.RefreshToken{
		UserID:    user.ID,
		Family:    family,
		TokenHash: hashToken(raw),
		ExpiresAt: time.Now().Add(s.refreshTTL),
	}
	if err := s.refreshTokens.Create(ctx, rt); err != nil {
		return nil, err
	}

	return &TokenPair{AccessToken: access, RefreshToken: raw}, nil
}

func generateRawToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
