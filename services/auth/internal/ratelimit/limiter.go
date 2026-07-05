package ratelimit

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// Limiter is a fixed-window counter backed by Redis. It is deliberately
// fail-closed: any Redis error is surfaced to the caller as "not allowed"
// rather than "allowed", because the whole point of rate limiting
// /register and /login is brute-force protection (see docs/auth-service.md
// § Failure Cases) — an outage should not silently disable that.
type Limiter struct {
	rdb    *redis.Client
	limit  int64
	window time.Duration
}

func NewLimiter(rdb *redis.Client, limit int64, window time.Duration) *Limiter {
	return &Limiter{rdb: rdb, limit: limit, window: window}
}

// Allow increments the counter for key and reports whether the caller is
// still within the window's limit. A non-nil error means Redis itself
// failed — callers must treat that as "deny", not "allow".
func (l *Limiter) Allow(ctx context.Context, key string) (bool, error) {
	count, err := l.rdb.Incr(ctx, key).Result()
	if err != nil {
		return false, err
	}
	if count == 1 {
		if err := l.rdb.Expire(ctx, key, l.window).Err(); err != nil {
			return false, err
		}
	}
	return count <= l.limit, nil
}
