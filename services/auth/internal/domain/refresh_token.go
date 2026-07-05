package domain

import (
	"time"

	"github.com/google/uuid"
)

// RefreshToken tracks one link in a rotation chain. Family groups every
// token ever issued from the same login; reuse of a Revoked token within a
// family signals theft and the whole family is revoked (see docs/auth-service.md).
type RefreshToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index"`
	Family    uuid.UUID `gorm:"type:uuid;not null;index"`
	TokenHash string    `gorm:"uniqueIndex;not null"`
	Revoked   bool      `gorm:"not null;default:false"`
	ExpiresAt time.Time `gorm:"not null"`
	CreatedAt time.Time
}
