# Architecture

Human-readable map of the system: how repo is laid out, how a service is structured internally, how services talk to each other. For *why* these choices, see [`guide.md`](./guide.md). For *when* each piece gets built, see [`../CLAUDE.MD`](../CLAUDE.MD).

---

## System Diagram (target)

```
                        API Gateway
                             │
        ┌────────────────────────────────────────┐
        │                                         │
   Auth Service                            User Service
        │                                         │
        ├─────────────────────────────────────────┤
        │                                         │
  Catalog Service                       Inventory Service
        │                                         │
        ├─────────────────────────────────────────┤
        │                                         │
   Cart Service                          Checkout Service
        │                                         │
        ├─────────────────────────────────────────┤
        │                                         │
  Payment Service                          Order Service
        │                                         │
        ├─────────────────────────────────────────┤
        │                                         │
Notification Service                      Search Service
        │
Recommendation Service (optional)
```

Communication:

- **REST** — public API, client (`packages/web`) → API Gateway
- **gRPC** — service-to-service synchronous calls (e.g. Checkout → Inventory to check stock)
- **Kafka** — asynchronous events (e.g. Order Created → Inventory Updated → Notification Sent)

Build order for these boxes follows `CLAUDE.MD`'s phases — not all exist yet. Check that file for current status.

---

## Repo Layout

```
kommers/
├── services/              # Go backend — one Go module per service
│   ├── auth/
│   ├── catalog/
│   ├── inventory/
│   ├── cart/
│   ├── checkout/
│   ├── payment/
│   ├── order/
│   ├── notification/
│   └── search/
├── go.work                # ties all services into one workspace for local `go build ./...`
├── packages/               # pnpm workspace — TS/JS side
│   ├── web/                # TanStack Start app (SSR React) — the only client for now
│   ├── api-client/         # generated TS client from OpenAPI/proto — shared typed API calls
│   ├── ui/                 # shared React components (only grows if actually reused)
│   └── config/             # shared tsconfig/eslint/prettier base configs
├── pnpm-workspace.yaml
├── proto/                  # shared gRPC contracts (.proto source + generated code)
├── infra/
│   ├── docker-compose.yml  # local Postgres/Redis/Kafka/etc
│   └── k8s/                # manifests, added once compose isn't enough
├── docs/                   # per-service docs — problem/reqs/architecture/tradeoffs/failure/scaling
├── guides/                 # this folder — guide.md (philosophy) + architecture.md (this file)
└── .github/workflows/      # CI, path-filtered per service
```

Rule: each `services/<name>` is a fully independent Go module (own `go.mod`, own DB, own deploy). Nothing reaches into another service's package directly — cross-service calls go over gRPC/REST/Kafka, never a Go import.

---

## Anatomy of a Service

Every Go service under `services/<name>/` follows the same internal shape once code lands (standard Go project layout, adapted):

```
services/auth/
├── go.mod
├── Dockerfile
├── cmd/
│   └── server/
│       └── main.go          # wires everything together, starts the HTTP/gRPC server
├── internal/
│   ├── config/               # env-based config loading
│   ├── domain/                # core business types + interfaces (no framework deps)
│   ├── handler/               # HTTP/gRPC handlers — thin, no business logic
│   ├── service/               # business logic (domain-driven naming, e.g. tokenservice)
│   ├── repository/            # Postgres/Redis access, implements domain interfaces
│   └── observability/         # logging, metrics, tracing setup
└── migrations/                # SQL migrations for this service's own DB
```

Why this shape: `handler` never talks to `repository` directly — always through `service` — so business logic is testable without spinning up HTTP or a DB. Matches guide.md's "Avoid business logic inside routes."

Every service, regardless of business purpose, exposes:

- `GET /healthz` — liveness
- `GET /readyz` — readiness (checks DB/Redis/Kafka connectivity)
- `/metrics` — Prometheus scrape endpoint
- Structured JSON logs w/ correlation ID propagated from the gateway

---

## Frontend Shape

`packages/web` (TanStack Start) is SSR React — routes live in `src/routes/`, file-based. It calls services only through `packages/api-client`, never hand-rolled fetch calls scattered across components. As each backend phase lands, `api-client` gets the new typed endpoints, then `web` gets the route/page consuming them.

---

## Data Flow Example — Order Creation (async)

```
Client → API Gateway → Checkout Service (saga starts)
                              │
                              ├─ gRPC → Inventory Service (reserve stock)
                              ├─ gRPC → Payment Service (charge)
                              │
                              └─ Kafka: OrderCreated
                                        │
                          ┌─────────────┼──────────────┐
                          ▼             ▼              ▼
                 Inventory Updated  Notification Sent  Analytics Updated
```

Checkout is synchronous where correctness matters immediately (stock reservation, payment charge — via gRPC, part of the saga). Everything downstream that doesn't block the customer's response (notification, analytics) goes over Kafka.

---

## Local Infra Access

Infra runs via `infra/docker-compose.yml` under podman (`podman-compose up -d` from `infra/`), not `brew services`. To reach a container's shell tools directly (equivalent of `brew services start postgresql` + `psql postgres`):

```sh
# Postgres — container is infra_postgres_1, creds/db match docker-compose.yml defaults
podman exec -it infra_postgres_1 psql -U kommers -d kommers_auth

# Redis — container is infra_redis_1
podman exec -it infra_redis_1 redis-cli
```

`-it` needs a real terminal — run these in your own shell, not through an automated/non-TTY session. Once inside `psql`: `\dt` lists tables, `\l` lists databases (one per service, per `infra/postgres/init.sql`).

---

## Current State

`services/auth` has real code (Phase 1, in progress — register/login/refresh/logout/JWKS wired, see `CLAUDE.MD` for the live checklist). All other `services/*` are still empty Go modules waiting their turn. `packages/web` is still just the TanStack Start scaffold, not yet wired to auth.
