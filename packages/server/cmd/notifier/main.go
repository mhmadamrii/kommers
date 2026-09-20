// notifier is a standalone consumer of the "orders" exchange. It currently
// only stubs sending an order-confirmation email (logs it), but it's the
// natural place to add real email/SMS/push dispatch later without touching
// the API server or blocking checkout on it.
package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/mhmadamrii/kommers/server/internal/broker"
	"github.com/mhmadamrii/kommers/server/internal/event"
)

func main() {
	// Same .env as cmd/server — missing file is expected outside local dev.
	if err := godotenv.Load(); err != nil {
		slog.Debug("no .env file found, using existing process environment")
	}

	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://kommers:kommers@localhost:5672/"
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	slog.Info("notifier starting")
	run(ctx, url)
	slog.Info("notifier stopped")
}

// run reconnects with backoff so the consumer survives broker restarts —
// it's meant to be a long-lived process, unlike the API server which treats
// the broker as optional.
func run(ctx context.Context, url string) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		if err := consume(ctx, url); err != nil {
			slog.Error("consumer stopped, retrying", "error", err)
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(5 * time.Second):
		}
	}
}

func consume(ctx context.Context, url string) error {
	conn, err := broker.Dial(url)
	if err != nil {
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	if err := broker.DeclareTopology(ch); err != nil {
		return err
	}
	if err := ch.Qos(10, 0, false); err != nil {
		return err
	}

	deliveries, err := ch.Consume(broker.QueueOrderCreated, "notifier", false, false, false, false, nil)
	if err != nil {
		return err
	}

	slog.Info("consuming order.created", "queue", broker.QueueOrderCreated)

	closed := conn.NotifyClose(make(chan *amqp.Error, 1))
	for {
		select {
		case <-ctx.Done():
			return nil
		case err := <-closed:
			return err
		case d, ok := <-deliveries:
			if !ok {
				return nil
			}
			handleDelivery(d)
		}
	}
}

func handleDelivery(d amqp.Delivery) {
	var evt event.OrderCreatedEvent
	if err := json.Unmarshal(d.Body, &evt); err != nil {
		slog.Error("bad order.created payload, dead-lettering", "error", err)
		d.Nack(false, false) // no requeue -> routed to the DLQ
		return
	}

	// Stub: real dispatch (SMTP/SES/etc.) would go here.
	slog.Info("order confirmation email sent (stub)",
		"order_id", evt.OrderID,
		"to", evt.UserEmail,
		"total_cents", evt.TotalCents,
	)

	d.Ack(false)
}
