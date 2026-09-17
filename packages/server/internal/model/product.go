package model

import "gorm.io/gorm"

type Product struct {
	gorm.Model
	CategoryID  uint     `gorm:"not null;index"`
	Category    Category `gorm:"foreignKey:CategoryID"`
	OwnerID     uint     `gorm:"not null;index"`
	Owner       User     `gorm:"foreignKey:OwnerID"`
	Name        string   `gorm:"size:255;not null"`
	Slug        string   `gorm:"size:255;uniqueIndex;not null"`
	Description string   `gorm:"type:text"`
	PriceCents  int64    `gorm:"not null"`
	// OriginalPriceCents, when set and greater than PriceCents, means the
	// product is on sale — the difference is a display-only discount, not a
	// separate promotions/coupons system.
	OriginalPriceCents *int64 `gorm:""`
	Stock              int    `gorm:"not null;default:0"`
	ImageURL           string `gorm:"size:512"`
	IsActive           bool   `gorm:"not null;default:true"`
	Location           string `gorm:"size:255"`
	FreeShipping       bool   `gorm:"not null;default:false"`
}
