package event

import "time"

// OrderCreatedEvent is published to the "orders" exchange (routing key
// "order.created") whenever a checkout succeeds. Consumers (e.g. the
// notifier) use it to trigger side effects like order-confirmation emails
// without blocking the checkout request on them.
type OrderCreatedEvent struct {
	OrderID    uint      `json:"order_id"`
	UserID     uint      `json:"user_id"`
	UserEmail  string    `json:"user_email"`
	TotalCents int64     `json:"total_cents"`
	CreatedAt  time.Time `json:"created_at"`
}
