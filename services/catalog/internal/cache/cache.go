package cache

import (
	"context"
	stderrors "errors"
	"log/slog"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/go-redis/v9"
)

const (
	KeyCategories    = "catalog:categories"
	productKeyPrefix = "catalog:product:"
)

func ProductKey(slug string) string { return productKeyPrefix + slug }

// Cache is a fail-open cache-aside wrapper around Redis: every Redis error
// is logged, counted, and treated as a miss. The cache's job is speed — a
// Redis outage must degrade latency, never take the storefront down. (The
// exact opposite policy from Auth's fail-closed rate limiter, deliberately —
// see docs/catalog-service.md § Tradeoffs.)
type Cache struct {
	rdb    *redis.Client
	ttl    time.Duration
	logger *slog.Logger
	errors prometheus.Counter
}

func New(rdb *redis.Client, ttl time.Duration, logger *slog.Logger) *Cache {
	errors := prometheus.NewCounter(prometheus.CounterOpts{
		Name: "cache_errors_total",
		Help: "Redis operations that failed and fell through to Postgres.",
	})
	if err := prometheus.Register(errors); err != nil {
		var are prometheus.AlreadyRegisteredError
		if stderrors.As(err, &are) {
			errors = are.ExistingCollector.(prometheus.Counter)
		}
	}
	return &Cache{rdb: rdb, ttl: ttl, logger: logger, errors: errors}
}

func (c *Cache) Get(ctx context.Context, key string) ([]byte, bool) {
	b, err := c.rdb.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil, false
	}
	if err != nil {
		c.fail("get", key, err)
		return nil, false
	}
	return b, true
}

func (c *Cache) Set(ctx context.Context, key string, val []byte) {
	if err := c.rdb.Set(ctx, key, val, c.ttl).Err(); err != nil {
		c.fail("set", key, err)
	}
}

// Delete is the write-path invalidation: idempotent, can't race a concurrent
// reader into caching a half-updated aggregate the way write-through can.
// The TTL on Set backstops any key this misses.
func (c *Cache) Delete(ctx context.Context, keys ...string) {
	if len(keys) == 0 {
		return
	}
	if err := c.rdb.Del(ctx, keys...).Err(); err != nil {
		c.fail("delete", keys[0], err)
	}
}

func (c *Cache) fail(op, key string, err error) {
	c.errors.Inc()
	c.logger.Warn("cache_error", "op", op, "key", key, "error", err.Error())
}
