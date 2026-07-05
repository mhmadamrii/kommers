# Rate Limiting

How the `/auth/register` and `/auth/login` rate limiter works under the hood. For the *why* (brute-force protection, fail-closed on Redis outage), see `docs/auth-service.md` § Failure Cases. Implementation: `services/auth/internal/ratelimit/limiter.go` + `services/auth/internal/middleware/ratelimit.go`.

---

## What it guards against

Credential stuffing / brute-force against `/auth/login`, and account-creation spam against `/auth/register`. It does **not** protect a specific user account — it caps request volume from a single IP.

---

## Mechanism: Redis fixed-window counter

```
Request → middleware.RateLimit(scope, next)
              │
              ▼
   key = "ratelimit:{scope}:{ip}"
              │
              ▼
        Redis INCR key
              │
     ┌────────┴────────┐
     │                 │
 count == 1        count > 1
     │                 │
 Redis EXPIRE       (window already
 key, window          ticking)
     │                 │
     └────────┬────────┘
              ▼
     count <= limit ?
        │         │
       yes        no
        │         │
   call next()   429 Too Many Requests
```

- `scope` = `"login"` or `"register"` — each endpoint has its own budget.
- Key is per **IP + scope**, not per account/email. One IP hammering 1000 different emails still only gets `limit` attempts total.
- Window resets when the Redis key's TTL expires — a **fixed** window (not sliding/rolling). Counter starts at first request in that window, dies at `RATE_LIMIT_WINDOW` later, then starts fresh at 0.

Config (`services/auth/.env.example`):

```
LOGIN_RATE_LIMIT=5
REGISTER_RATE_LIMIT=5
RATE_LIMIT_WINDOW=1m
```

---

## Fail-closed on Redis error

If `INCR`/`EXPIRE` errors (Redis down, network partition), the limiter returns an error — the middleware treats that as **deny**, responding `503 Service Unavailable`, not "allow through."

Reasoning: the entire point of this limiter is brute-force protection. Failing open (allow everyone through when Redis is unreachable) defeats that purpose during exactly the kind of outage an attacker might exploit. Cost: a Redis outage blocks all logins/registers, not just rate-limit checks — acceptable since Postgres being down already blocks the same endpoints (see `docs/auth-service.md`).

---

## Known limitation: window-boundary burst

Fixed windows allow a burst at the boundary: 5 requests just before the window expires + 5 more right after reset ≈ 10 in a short span straddling two windows. A sliding-window log or token-bucket algorithm closes this gap, at the cost of more Redis ops per request (sorted sets instead of a single counter). Not implemented — acceptable for Phase 1 baseline; revisit if abuse patterns in practice actually exploit this.

---

## Verified behavior (smoke test, live Redis)

7 rapid bad-password attempts against `/auth/login`, same IP, `LOGIN_RATE_LIMIT=5`:

```
attempt 1-4: 401 (bad credentials, but allowed through)
attempt 5-7: 429 (limit hit)
```

Different IP → separate counter, unaffected.
