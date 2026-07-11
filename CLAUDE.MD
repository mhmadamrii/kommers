# kommers — Development Process

> Project purpose, philosophy, and engineering priorities are defined in [`guides/guide.md`](./guides/guide.md). Read that first. This file defines *how* we execute against it: phases, scope per phase, and definition of done.
>
> System architecture layout is documented in [`guides/architecture.md`](./guides/architecture.md).

## Working Agreement

- Every service starts with a doc (`docs/<service>.md`) before code: Problem → Requirements (functional/non-functional) → Architecture → Tradeoffs → Failure Cases → Scaling Strategy. See guide.md § Documentation Requirements.
- No service is "done" without: health/readiness/liveness endpoints, structured logging, metrics, tracing hook, Dockerfile, config via env, unit tests.
- Frontend grows incrementally alongside each phase — thin UI to exercise the new backend capability, not a separate big-bang frontend build.
- Don't start a phase until the previous phase's service meets Definition of Done below.

## Definition of Done (per service)

- [ ] `docs/<service>.md` written and reviewed
- [ ] Health / readiness / liveness endpoints
- [ ] Structured logging w/ correlation IDs
- [ ] Prometheus metrics exposed
- [ ] OpenTelemetry tracing wired
- [ ] Dockerfile builds and runs
- [ ] Config via env vars (no hardcoded secrets/urls)
- [ ] Unit tests for core logic
- [ ] Tradeoffs documented (why this approach, what else was considered)

---

## Phase 0 — Foundations *(in progress)*

- [x] Monorepo scaffold: `services/` (Go, `go.work`) + `packages/` (pnpm workspace)
- [x] TypeScript project references wired (`packages/config/tsconfig`)
- [x] Prettier at root
- [x] `packages/web` scaffolded on TanStack Start, verified booting
- [ ] Root `docker-compose.yml`: Postgres, Redis, Kafka, MinIO, Prometheus, Grafana
- [ ] `.github/workflows`: base CI (lint + build), path-filtered per service
- [x] Shared Go libs decision: `services/pkg/` module created when Catalog (2nd service) needed the same middleware/observability — contains `observability` (logger/metrics/tracing stub), `httpmiddleware` (correlation/accesslog/CORS), `jwtauth` (JWKS client + role middleware, unit-tested). Consumed via go.work locally + `replace ../pkg` for container builds. **Auth still uses its internal copies — migrate to services/pkg in a dedicated refactor commit.**

## Phase 1 — Auth Service *(done)*

Scope: register, login, JWT issuance, refresh token rotation, RBAC.

Interesting topics to document: token rotation, session management, rate limiting.

Frontend: login/register forms in `packages/web`, token storage strategy.

Data layer decision: GORM (not sqlc/pgx) — lighter local toolchain, no extra CLI installs. RS256 JWT signing (asymmetric) so other services verify locally via JWKS, no callback to Auth Service per request. See `docs/auth-service.md` for full reasoning.

Progress:

- [x] `docs/auth-service.md` written
- [x] Service skeleton: `cmd/server/main.go`, config, GORM+Postgres wiring, `/healthz` + `/readyz`, structured logging (slog) w/ correlation IDs + access-log middleware, Prometheus metrics, Dockerfile — verified `go build`/`go vet` clean, verified via `podman build`/`podman run` against live Postgres+Redis
- [x] `internal/observability/tracing.go` — no-op stub only; real OTel SDK deferred to Phase 10, added once for all services
- [x] Runtime-verified against live Postgres + Redis (podman-compose) — register/login/jwks/refresh-rotate/reuse-detection/logout/rate-limit all smoke-tested, both via `go run` and the built container image
- [x] Register endpoint (bcrypt password hashing)
- [x] Login endpoint (JWT access + refresh token issuance)
- [x] Refresh endpoint (rotation + reuse-detection/revocation)
- [x] Logout endpoint (refresh token revocation)
- [x] RBAC middleware (role claim check) — `internal/middleware/auth.go`, not yet wired to a protected route (none exist yet in this service)
- [x] Rate limiting on `/register` + `/login` (Redis, fail-closed per docs/auth-service.md)
- [x] JWKS endpoint (`GET /.well-known/jwks.json`)
- [x] Unit tests for token issuance/rotation logic
- [x] `packages/web` login/register routes wired to real endpoints — `src/lib/auth-client.ts` (fetch client, `VITE_AUTH_API_URL`) + `src/lib/token-storage.ts` (localStorage) + TanStack Query mutations in the auth forms; required adding CORS middleware to the service (`internal/middleware/cors.go`, `CORS_ALLOWED_ORIGINS` env, unit-tested). Browser-verified end-to-end via headless Chromium: register→auto-login→tokens stored→redirect, fresh login, wrong-password error rendering, disallowed origins get no CORS headers

**Phase 1 Definition of Done met.** Phase 2 (Catalog Service) can start — begin with `docs/catalog-service.md` per Working Agreement.

Known limitation to revisit at Phase 10 (k8s): JWT signing key is generate-if-missing per instance (`internal/security/keys.go`) — fine for single-instance local dev, breaks the "stateless, N replicas" scaling claim for real multi-replica deployment unless the key is mounted/shared (see `docs/auth-service.md` Tradeoffs).

## Phase 2 — Catalog Service *(done)*

Scope: categories, variants, images (MinIO), search stub, Redis cache w/ explicit invalidation strategy, pagination, indexing.

Frontend: product listing + detail pages.

Key decisions (full reasoning in `docs/catalog-service.md`): GORM again for consistency; integer cents for money; keyset pagination (no OFFSET on public routes); cache-aside w/ delete-on-write + 10min TTL backstop, listing queries deliberately uncached in v1; Redis fail-open (opposite of auth's fail-closed limiter — cache vs abuse-protection); `display_stock` is a denormalized display value until Inventory (Phase 4) owns real stock; JWKS-verified admin routes (first consumer of Phase 1's RS256 decision).

Progress:

- [x] `docs/catalog-service.md` written and reviewed
- [x] Infra: MinIO added to `infra/docker-compose.yml`; `kommers_catalog` DB + `pg_trgm` added to `infra/postgres/init.sql` (note: init.sql only runs on a fresh volume — service migration also creates extensions idempotently, so existing volumes only need `CREATE DATABASE kommers_catalog`)
- [x] Service skeleton (health/readyz, logging, metrics, Dockerfile, config) — built on `services/pkg`; Dockerfile builds from repo root (`podman build -f services/catalog/Dockerfile .`), container runtime-verified against live infra
- [x] Categories CRUD + public list (delete guarded when category still has products)
- [x] Products CRUD + public list (keyset pagination, active-only, draft excluded) + detail by slug
- [x] Variants CRUD (jsonb attributes, nullable price override → base price fallback)
- [x] Image upload → MinIO (content-type sniffed server-side, public-read bucket, object key only in Postgres)
- [x] Search stub (`q=`, ILIKE + pg_trgm GIN index)
- [x] Redis cache-aside + invalidation (product detail + category list; delete-on-write incl. old slug on rename; fail-open verified)
- [x] JWKS auth middleware for `/admin/*` (`services/pkg/jwtauth`) — 401 no token, 403 wrong role, verified against live Auth Service
- [x] Unit tests: cursor roundtrip/tamper, cache fail-open, jwtauth (valid/expired/wrong-key/unknown-kid/role gate/JWKS-down fail-closed), CORS
- [x] Runtime-verified: 29-check API smoke suite (authz, CRUD, pagination overlap/last-page, search, cache hit+invalidation, slug-rename cache death, image upload → MinIO URL 200, 415 on fake image, 409s) + 17-check headless-browser suite against the real frontend
- [x] Frontend: product listing (infinite load-more) + detail (gallery, variants) + categories + search + home wired to real API; product/category mocks deleted; `VITE_CATALOG_API_URL` added

Phase 2 Definition of Done met. No admin UI yet — admin CRUD is API-only (JWT via curl); build an admin surface only if a later phase needs it.

Next concrete step: Phase 3 (Cart Service) — start with `docs/cart-service.md`.

## Phase 3 — Cart Service

Scope: add/remove item, quantity, coupons, Redis-backed, guest cart, merge-after-login, expiration.

Frontend: cart drawer/page.

## Phase 4 — Inventory Service

Scope: stock reservation, release, deduct. Document race conditions, overselling prevention, optimistic vs distributed locking choice.

## Phase 5 — Checkout + Payment

Scope: address, shipping, payment creation/retry/status, saga pattern across checkout → payment → inventory, compensation logic, idempotency keys, webhook handling.

This is the highest architectural-depth phase — expect it to take longest.

## Phase 6 — Order Service

Scope: create, cancel, refund, order lifecycle. Event sourcing / CQRS optional — only adopt if it solves a real problem surfaced by earlier phases, not by default.

## Phase 7 — Notification Service

Scope: Kafka consumer for order/payment events, email/push/SMS dispatch (can stub the actual send), retry + dead letter queue, scheduling.

## Phase 8 — Search Service

Scope: OpenSearch sync pipeline from Catalog, autocomplete, ranking, index rebuild strategy.

## Phase 9 — Recommendation Service *(optional)*

Scope: similar products, frequently bought together, trending. Only pursue after Phases 1–8 are solid — this is a bonus, not core.

## Phase 10 — Cross-Cutting Hardening

- API Gateway wiring all services together
- End-to-end observability: traces spanning services, dashboards in Grafana
- Kubernetes deployment (move off docker-compose)
- Load testing w/ k6: checkout latency, search latency, inventory throughput — document RPS/P95/P99/CPU/memory
- Security pass: rate limiting, input validation, secrets management audit across all services

## Phase 11 — Documentation & Portfolio Polish

- Finalize every `docs/<service>.md`
- Architecture diagrams updated to reflect actual (not planned) system
- Root README tying the system together
- Final check against guide.md § Success Criteria

---

## Notes

- Phases are sequential by default, but if a later phase's concern (e.g. distributed locking) becomes relevant early, pull the discussion forward — don't force artificial ordering purity.
- Update this file's checkboxes as work lands. Add new phases if scope genuinely expands; don't silently shrink scope without updating guide.md's intent.
