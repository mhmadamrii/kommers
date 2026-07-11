package cache

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

// deadClient points at nothing — every operation errors. The cache must
// treat that as a miss (fail-open), never propagate the failure.
func deadClient() *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:            "127.0.0.1:1", // nothing listens here
		DialTimeout:     50 * time.Millisecond,
		ReadTimeout:     50 * time.Millisecond,
		WriteTimeout:    50 * time.Millisecond,
		MaxRetries:      -1,
		PoolTimeout:     50 * time.Millisecond,
		MinIdleConns:    0,
		ConnMaxIdleTime: time.Millisecond,
	})
}

func silentLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func TestFailOpenWhenRedisDown(t *testing.T) {
	c := New(deadClient(), time.Minute, silentLogger())
	ctx := context.Background()

	if _, ok := c.Get(ctx, "k"); ok {
		t.Error("Get on dead Redis reported a hit")
	}
	// Set and Delete must not panic or block meaningfully — just log+count.
	c.Set(ctx, "k", []byte("v"))
	c.Delete(ctx, "k")
}

func TestDeleteNoKeysIsNoop(t *testing.T) {
	c := New(deadClient(), time.Minute, silentLogger())
	c.Delete(context.Background()) // must not call Redis with zero keys
}
