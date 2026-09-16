package model

import "gorm.io/gorm"

// Cart belongs to a logged-in user (UserID set) or a guest (SessionID set).
type Cart struct {
	gorm.Model
	UserID    *uint      `gorm:"index"`
	User      *User      `gorm:"foreignKey:UserID"`
	SessionID string     `gorm:"size:255;index"`
	Items     []CartItem `gorm:"foreignKey:CartID"`
}

type CartItem struct {
	gorm.Model
	CartID     uint    `gorm:"not null;uniqueIndex:idx_cart_product"`
	ProductID  uint    `gorm:"not null;uniqueIndex:idx_cart_product"`
	Product    Product `gorm:"foreignKey:ProductID"`
	Quantity   int     `gorm:"not null;default:1"`
	PriceCents int64   `gorm:"not null"`
}
