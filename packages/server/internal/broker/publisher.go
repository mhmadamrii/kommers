package broker

import (
	"context"
	"encoding/json"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/mhmadamrii/kommers/server/internal/event"
)

type Publisher struct {
	conn *amqp.Connection
	ch   *amqp.Channel
}

// Connect dials the broker, opens a channel, and declares the topology.
// Returns an error if the broker is unreachable — the caller decides
// whether that's fatal or whether to run without event publishing.
func Connect(url string) (*Publisher, error) {
	conn, err := Dial(url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	if err := DeclareTopology(ch); err != nil {
		ch.Close()
		conn.Close()
		return nil, err
	}

	return &Publisher{conn: conn, ch: ch}, nil
}

func (p *Publisher) Close() {
	p.ch.Close()
	p.conn.Close()
}

func (p *Publisher) PublishOrderCreated(ctx context.Context, evt event.OrderCreatedEvent) error {
	body, err := json.Marshal(evt)
	if err != nil {
		return err
	}

	return p.ch.PublishWithContext(ctx, ExchangeOrders, RoutingKeyOrderCreated, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Body:         body,
	})
}
