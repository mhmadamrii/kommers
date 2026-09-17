package model

import "gorm.io/gorm"

type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusPaid      OrderStatus = "paid"
	OrderStatusCancelled OrderStatus = "cancelled"
)

type PaymentStatus string

const (
	PaymentStatusPending PaymentStatus = "pending"
	PaymentStatusPaid    PaymentStatus = "paid"
	PaymentStatusFailed  PaymentStatus = "failed"
)

type Order struct {
	gorm.Model
	UserID        uint          `gorm:"not null;index"`
	User          User          `gorm:"foreignKey:UserID"`
	AddressID     uint          `gorm:"not null"`
	Address       Address       `gorm:"foreignKey:AddressID"`
	Status        OrderStatus   `gorm:"size:20;not null;default:pending"`
	PaymentStatus PaymentStatus `gorm:"size:20;not null;default:pending"`
	// PaymentProvider/PaymentRef stay empty until a payment gateway (e.g. Stripe) is
	// wired up: Provider will hold "stripe", Ref will hold the checkout session /
	// payment intent id so a webhook can look the order back up.
	PaymentProvider string      `gorm:"size:50"`
	PaymentRef      string      `gorm:"size:255;index"`
	TotalCents      int64       `gorm:"not null"`
	Items           []OrderItem `gorm:"foreignKey:OrderID"`
}

// OrderItem snapshots product name/price at purchase time so later product
// edits or deletions don't rewrite order history.
type OrderItem struct {
	gorm.Model
	OrderID     uint    `gorm:"not null;index"`
	ProductID   uint    `gorm:"not null"`
	Product     Product `gorm:"foreignKey:ProductID"`
	ProductName string  `gorm:"size:255;not null"`
	Quantity    int     `gorm:"not null"`
	PriceCents  int64   `gorm:"not null"`
	// CampaignID records which campaign (if any) discounted this line item,
	// for order-history audit — purely informational, checkout doesn't read
	// it back.
	CampaignID    *uint `gorm:"index"`
	SubtotalCents int64 `gorm:"not null"`
}
