# Auth Service

Phase 1 of [`../CLAUDE.MD`](../CLAUDE.MD). See [`../guides/architecture.md`](../guides/architecture.md) for how this fits the wider system.

---

## Problem

Every other service needs to answer two questions on every request: *who is this* and *what are they allowed to do*. Without a single source of truth, each service would reimplement password storage, token issuance, and role logic independently — inconsistent security, duplicated bugs. Auth Service centralizes identity issuance; every other service trusts its tokens without calling back to it on every request.

---

## Requirements

### Functional

- Register with email + password
- Login → issues short-lived access token (JWT) + long-lived refresh token
- Refresh → exchanges a valid refresh token for a new access + refresh pair (rotation)
- Logout → revokes the refresh token
- RBAC → role (`customer`, `admin`) embedded in JWT claims; other services check role from the token, no callback needed
- Rate limiting on `/register` and `/login` (brute-force protection)
- Expose public signing key so other services can verify tokens locally

### Non-functional

- Passwords hashed with bcrypt (cost tunable via config)
- Access tokens must be verifiable by any other service **without a network call** to Auth Service — enables horizontal scaling of every downstream service independently of Auth Service load
- Refresh tokens must be revocable server-side (unlike access tokens, which just expire)
- p95 login latency target: under 150ms, hashing cost excluded from that budget in early load tests so we can isolate DB/network overhead from deliberate bcrypt cost
- Auth Service itself must be stateless at the process level (all state in Postgres/Redis) so it can run N replicas behind a load balancer

---

## Architecture

```
                     Client
                       │
                  API Gateway
                       │
                 Auth Service ──────► Postgres (kommers_auth)
                   │      │              ├─ users
                   │      │              └─ refresh_tokens
                   │      │
                   │      └───────────► Redis
                   │                     └─ login/register rate-limit counters
                   │
                   └──── GET /.well-known/jwks.json
                              │
              (other services fetch + cache the public key,
               verify JWTs locally — no call to Auth Service per request)
```

Data access: **GORM** over `gorm.io/driver/postgres`, `AutoMigrate` for schema (no separate `sqlc`/`migrate` CLI — deliberate choice, see Tradeoffs).

Token signing: **RS256** (asymmetric). Auth Service holds the private key; every other service only needs the public key, fetched from the JWKS endpoint and cached. This means a compromised downstream service can never forge tokens — only Auth Service can sign.

Endpoints:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /.well-known/jwks.json`
- `GET /healthz`, `GET /readyz`, `GET /metrics` (per Definition of Done)

---

## Tradeoffs

**GORM instead of pgx + sqlc.** sqlc/migrate need separate CLI installs and a codegen step; on constrained dev hardware (8GB RAM, limited disk) that's real cost for marginal benefit at this schema size (two tables). Tradeoff accepted: less control over generated SQL, GORM's N+1 footgun — mitigated by keeping the schema small and avoiding `Preload` chains. Revisit if a later service's query patterns genuinely need hand-tuned SQL.

**Stateless JWT access tokens instead of server-side sessions.** A session-lookup-per-request model would mean every service calls Auth Service (or a shared session store) on every authenticated request — that's a hard dependency and a scaling bottleneck. Stateless JWTs let downstream services scale independently. Cost: revoking an access token immediately isn't possible — mitigated with a short TTL (15 min) so a compromised token has a small blast radius.

**RS256 instead of HS256.** HS256 needs the same shared secret distributed to every service that verifies tokens — one leaked service leaks the ability to forge tokens for the whole system. RS256 keeps signing capability in one place.

**Refresh token rotation.** Every refresh call issues a new refresh token and invalidates the old one. If an old (already-rotated) refresh token is presented again, that's a signal of theft — the whole token family is revoked, forcing re-login. Adds bookkeeping (token family tracking) over a static long-lived refresh token, but it's the standard defense against stolen-refresh-token replay.

**Signing key: generate-if-missing, local dev only.** `internal/security/keys.go` generates a 2048-bit RSA key on first boot if `JWT_PRIVATE_KEY_PATH` doesn't exist, so `go run`/single-container dev works with zero setup. This is **not safe for the N-replica horizontal scaling this doc promises** — each replica would generate its own key and none could verify another's tokens. Any multi-replica deployment must mount the same key file (or inject it from a shared secret store, e.g. a Kubernetes Secret) so `JWT_PRIVATE_KEY_PATH` resolves to identical bytes on every instance. Revisit when Phase 10 introduces the API Gateway / k8s move.

---

## Failure Cases

- **Postgres down** — register/login/refresh fail (503, `Retry-After` header). Already-issued access tokens keep working elsewhere in the system since verification is local (stateless) — only auth-mutating actions are blocked, not the whole platform.
- **Redis down** — rate limiter has nothing to check against. Fail **closed** (reject with 503) on `/register` and `/login` rather than fail-open, since the entire point of that limiter is brute-force protection — allowing unlimited attempts during a Redis outage is the worse failure mode.
- **Refresh token reuse detected** — treat as compromise, revoke the entire token family, require full re-login.
- **Clock skew** — JWT `exp`/`iat` checks allow a small leeway window (30s) across services to tolerate minor clock drift instead of assuming perfectly synced NTP everywhere.

---

## Scaling Strategy

- **10 users** — single Auth Service instance, single Postgres, Redis optional (rate limiting could be in-memory) but kept from day one to avoid a later migration.
- **10,000 users** — Auth Service is stateless, so scale horizontally behind the API Gateway/LB with no code change. Postgres connection pool sized to replica count; write volume stays low (auth writes = registers/logins/refreshes, not the app's hot path).
- **1,000,000 users** — `refresh_tokens` table grows unbounded without cleanup; add a TTL-based expiry job, or move refresh token storage to Redis with native key expiry instead of Postgres. JWKS response gets cached at the API Gateway/CDN edge so the public key isn't re-fetched per downstream service instance.
