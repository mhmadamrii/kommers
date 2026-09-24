package model

import (
	"time"

	"gorm.io/gorm"
)

type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "pending"
	OrderStatusPaid       OrderStatus = "paid"
	OrderStatusProcessing OrderStatus = "processing"
	OrderStatusShipped    OrderStatus = "shipped"
	OrderStatusDelivered  OrderStatus = "delivered"
	OrderStatusCancelled  OrderStatus = "cancelled"
)

// shippingStatusOrder gives each post-payment status a forward-only rank so
// a seller can advance an order (paid -> processing -> shipped -> delivered,
// skipping steps allowed) but never move it backward or off a terminal
// Cancelled order. Statuses absent from this map (Pending, Cancelled) aren't
// valid targets for a seller's shipping update.
var shippingStatusOrder = map[OrderStatus]int{
	OrderStatusPaid:       0,
	OrderStatusProcessing: 1,
	OrderStatusShipped:    2,
	OrderStatusDelivered:  3,
}

// CanAdvanceShippingTo reports whether next is a valid forward shipping-status
// move from the order's current status — used by the seller shipping-update
// endpoint, not by the buyer-facing lifecycle (payment/cancellation).
func CanAdvanceShippingTo(current, next OrderStatus) bool {
	nextRank, ok := shippingStatusOrder[next]
	if !ok {
		return false
	}
	currentRank, ok := shippingStatusOrder[current]
	if !ok {
		return false
	}
	return nextRank > currentRank
}

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
	PaymentProvider string `gorm:"size:50"`
	PaymentRef      string `gorm:"size:255;index"`
	// Currency actually charged via Stripe — may fall back from the store's
	// nominal "idr" to "usd" if the Stripe account can't present IDR.
	Currency   string      `gorm:"size:3;not null;default:idr"`
	TotalCents int64       `gorm:"not null"`
	Items      []OrderItem `gorm:"foreignKey:OrderID"`
	// Shipping fields are seller-entered once Status reaches processing/shipped —
	// there's no carrier integration, this is a manually-updated tracking record.
	TrackingNumber string     `gorm:"size:100"`
	Courier        string     `gorm:"size:100"`
	ShippedAt      *time.Time
	DeliveredAt    *time.Time
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
