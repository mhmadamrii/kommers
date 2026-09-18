package model

import "gorm.io/gorm"

// Review is only creatable against a product the reviewing user actually
// has an order for (see handler.ReviewHandler.Create) — no unverified
// reviews, and the uniqueIndex caps it at one review per buyer per product.
type Review struct {
	gorm.Model
	ProductID uint          `gorm:"not null;uniqueIndex:idx_review_product_user"`
	UserID    uint          `gorm:"not null;uniqueIndex:idx_review_product_user"`
	User      User          `gorm:"foreignKey:UserID"`
	Rating    int           `gorm:"not null"`
	Comment   string        `gorm:"type:text"`
	Images    []ReviewImage `gorm:"foreignKey:ReviewID"`
}
