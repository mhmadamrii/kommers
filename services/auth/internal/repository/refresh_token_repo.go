package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/0xfaidev3/kommers/services/auth/internal/domain"
)

type RefreshTokenRepo struct {
	db *gorm.DB
}

func NewRefreshTokenRepo(db *gorm.DB) *RefreshTokenRepo {
	return &RefreshTokenRepo{db: db}
}

func (r *RefreshTokenRepo) Create(ctx context.Context, rt *domain.RefreshToken) error {
	return r.db.WithContext(ctx).Create(rt).Error
}

func (r *RefreshTokenRepo) FindByHash(ctx context.Context, hash string) (*domain.RefreshToken, error) {
	var rt domain.RefreshToken
	if err := r.db.WithContext(ctx).Where("token_hash = ?", hash).First(&rt).Error; err != nil {
		return nil, err
	}
	return &rt, nil
}

func (r *RefreshTokenRepo) Revoke(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&domain.RefreshToken{}).
		Where("id = ?", id).Update("revoked", true).Error
}

// RevokeFamily revokes every token descended from the same login — used
// when a rotated-away token is presented again (reuse/theft signal).
func (r *RefreshTokenRepo) RevokeFamily(ctx context.Context, family uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&domain.RefreshToken{}).
		Where("family = ? AND revoked = ?", family, false).Update("revoked", true).Error
}
