package broker

import (
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	ExchangeOrders    = "orders"
	ExchangeOrdersDLX = "orders.dlx"

	RoutingKeyOrderCreated = "order.created"

	QueueOrderCreated    = "notifications.order_created"
	QueueOrderCreatedDLQ = "notifications.order_created.dlq"
)

// Dial connects with a bounded timeout so a missing broker doesn't hang
// startup — the caller decides whether that's fatal.
func Dial(url string) (*amqp.Connection, error) {
	return amqp.DialConfig(url, amqp.Config{Dial: amqp.DefaultDial(5 * time.Second)})
}

// DeclareTopology sets up the orders exchange, its dead-letter exchange, and
// the order.created queue (+ DLQ). Idempotent — safe to call from both the
// publisher (API server) and the consumer (notifier), whichever starts first.
func DeclareTopology(ch *amqp.Channel) error {
	if err := ch.ExchangeDeclare(ExchangeOrders, amqp.ExchangeTopic, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.ExchangeDeclare(ExchangeOrdersDLX, amqp.ExchangeTopic, true, false, false, false, nil); err != nil {
		return err
	}

	if _, err := ch.QueueDeclare(QueueOrderCreatedDLQ, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(QueueOrderCreatedDLQ, "#", ExchangeOrdersDLX, false, nil); err != nil {
		return err
	}

	mainQueueArgs := amqp.Table{"x-dead-letter-exchange": ExchangeOrdersDLX}
	if _, err := ch.QueueDeclare(QueueOrderCreated, true, false, false, false, mainQueueArgs); err != nil {
		return err
	}
	if err := ch.QueueBind(QueueOrderCreated, RoutingKeyOrderCreated, ExchangeOrders, false, nil); err != nil {
		return err
	}

	return nil
}
