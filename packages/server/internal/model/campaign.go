package model

import (
	"time"

	"gorm.io/gorm"
)

type DiscountType string

const (
	DiscountTypePercent DiscountType = "percent"
	DiscountTypeFixed   DiscountType = "fixed"
)

// Campaign is a time-boxed promotion targeting either a whole category or a
// specific set of products (never both — enforced by the handler, not the
// schema). It replaces the old static Product.OriginalPriceCents field:
// every discount now flows through an active Campaign, one source of truth.
type Campaign struct {
	gorm.Model
	Name          string       `gorm:"size:255;not null"`
	OwnerID       uint         `gorm:"not null;index"`
	Owner         User         `gorm:"foreignKey:OwnerID"`
	DiscountType  DiscountType `gorm:"size:20;not null"`
	DiscountValue int64        `gorm:"not null"` // percent: 1-100; fixed: cents off
	StartsAt      time.Time    `gorm:"not null"`
	EndsAt        time.Time    `gorm:"not null"`
	// StockLimit is the campaign's own sale-stock cap (nil = unlimited),
	// separate from Product.Stock — "only 100 units at this price".
	StockLimit   *int      `gorm:""`
	StockUsed    int       `gorm:"not null;default:0"`
	FreeShipping bool      `gorm:"not null;default:false"`
	IsActive     bool      `gorm:"not null;default:true"`
	CategoryID   *uint     `gorm:"index"`
	Category     *Category `gorm:"foreignKey:CategoryID"`
	Products     []Product `gorm:"many2many:campaign_products;"`
}

func (c Campaign) IsLive(now time.Time) bool {
	if !c.IsActive {
		return false
	}
	if now.Before(c.StartsAt) || now.After(c.EndsAt) {
		return false
	}
	if c.StockLimit != nil && c.StockUsed >= *c.StockLimit {
		return false
	}
	return true
}

func (c Campaign) DiscountedPrice(priceCents int64) int64 {
	var discounted int64
	if c.DiscountType == DiscountTypeFixed {
		discounted = priceCents - c.DiscountValue
	} else {
		discounted = priceCents - (priceCents*c.DiscountValue)/100
	}
	if discounted < 0 {
		return 0
	}
	return discounted
}
