package model

import "gorm.io/gorm"

// WishlistItem is a customer's saved-for-later product — no quantity, no
// price snapshot (unlike CartItem): a wishlist entry just says "show me
// this product again", so it always reflects the product's current price
// and stock rather than a value captured at save time.
type WishlistItem struct {
	gorm.Model
	UserID    uint    `gorm:"not null;uniqueIndex:idx_user_product_wishlist"`
	User      User    `gorm:"foreignKey:UserID"`
	ProductID uint    `gorm:"not null;uniqueIndex:idx_user_product_wishlist"`
	Product   Product `gorm:"foreignKey:ProductID"`
}
