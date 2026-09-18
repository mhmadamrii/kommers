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
	// PriceCents is the base price. Any discount is computed dynamically
	// from an active Campaign (internal/pricing) — never stored here.
	PriceCents int64          `gorm:"not null"`
	Stock      int            `gorm:"not null;default:0"`
	Images     []ProductImage `gorm:"foreignKey:ProductID"`
	IsActive   bool           `gorm:"not null;default:true"`
	Location   string         `gorm:"size:255"`
	// FreeShipping is the seller's standing shipping rule. A live campaign's
	// own FreeShipping flag can additionally grant it during the sale.
	FreeShipping bool `gorm:"not null;default:false"`
}
