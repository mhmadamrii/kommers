package model

import (
	"time"

	"gorm.io/gorm"
)

// Voucher is a code a buyer types at checkout for money off their order. It
// stacks on top of any live Campaign price (campaign first, voucher second).
//
// Scope follows the owner: an admin-owned voucher is platform-wide and
// discounts the whole cart; a seller-owned voucher only discounts the lines
// whose product belongs to that seller.
type Voucher struct {
	gorm.Model
	Code    string `gorm:"size:40;not null;uniqueIndex"` // stored upper-case
	Name    string `gorm:"size:255;not null"`
	OwnerID uint   `gorm:"not null;index"`
	Owner   User   `gorm:"foreignKey:OwnerID"`

	DiscountType  DiscountType `gorm:"size:20;not null"`
	DiscountValue int64        `gorm:"not null"` // percent: 1-100; fixed: cents off
	// MaxDiscountCents caps a percent voucher ("10% up to Rp50.000"); nil = no cap.
	MaxDiscountCents *int64 `gorm:""`
	// MinSpendCents is checked against the eligible subtotal (post-campaign).
	MinSpendCents int64 `gorm:"not null;default:0"`

	// UsageLimit is the total redemption cap across all buyers (nil = unlimited).
	UsageLimit *int `gorm:""`
	UsedCount  int  `gorm:"not null;default:0"`
	// PerUserLimit is how many times one buyer may redeem it.
	PerUserLimit int `gorm:"not null;default:1"`

	StartsAt time.Time `gorm:"not null"`
	EndsAt   time.Time `gorm:"not null"`
	IsActive bool      `gorm:"not null;default:true"`
}

func (v Voucher) IsLive(now time.Time) bool {
	if !v.IsActive || now.Before(v.StartsAt) || now.After(v.EndsAt) {
		return false
	}
	if v.UsageLimit != nil && v.UsedCount >= *v.UsageLimit {
		return false
	}
	return true
}

// DiscountFor returns the cents off for an eligible subtotal, capped by
// MaxDiscountCents and never more than the subtotal itself.
func (v Voucher) DiscountFor(eligibleCents int64) int64 {
	var d int64
	if v.DiscountType == DiscountTypeFixed {
		d = v.DiscountValue
	} else {
		d = eligibleCents * v.DiscountValue / 100
		if v.MaxDiscountCents != nil && d > *v.MaxDiscountCents {
			d = *v.MaxDiscountCents
		}
	}
	if d > eligibleCents {
		d = eligibleCents
	}
	return d
}

// VoucherRedemption records one use of a voucher by a buyer on an order. It
// backs the per-user limit and is deleted when the order is cancelled so the
// voucher is given back.
type VoucherRedemption struct {
	gorm.Model
	VoucherID uint `gorm:"not null;index"`
	UserID    uint `gorm:"not null;index"`
	OrderID   uint `gorm:"not null;uniqueIndex"`
}
