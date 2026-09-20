# kommers

![kommers thumbnail](packages/web/public/thumbnail.png)

E-commerce backend + storefront built as a portfolio project. Go/Gin API with JWT auth, GORM/Postgres, and role-based product/seller/order flows, paired with a SolidStart + Tailwind frontend — all sitting behind Caddy and (eventually) Cloudflare.

## Stack

| Layer            | Choice                                                    |
| ----------------- | ---------------------------------------------------------- |
| API               | Go + [Gin](https://gin-gonic.com/)                          |
| ORM               | [GORM](https://gorm.io/) + PostgreSQL                        |
| Auth              | JWT (HS256), bcrypt password hashing                        |
| API docs          | Swagger (swaggo) — served at `/swagger/index.html`          |
| Object storage     | MinIO (S3-compatible) — provisioned, not yet wired into code |
| Message broker      | RabbitMQ — `order.created` events, async notification consumer |
| Frontend          | [SolidStart](https://start.solidjs.com/) + Tailwind CSS v4    |
| Reverse proxy      | Caddy (auto HTTPS)                                          |
| Edge / CDN         | Cloudflare (planned — DNS + proxy in front of the VPS)      |
| Containers         | Podman (docker-compose-compatible)                          |
| Monorepo tooling   | pnpm workspaces (JS/TS) + Go modules (Go)                    |

## Layout

```
packages/
  server/   Go API (Gin, GORM, JWT) — see packages/server
  web/      SolidStart + Tailwind storefront (currently a hello-world scaffold)
  config/   shared TypeScript config (tsconfig base)
docker-compose.yml   local infra: postgres, minio, rabbitmq, the API, notifier, caddy
Caddyfile             reverse proxy config
```

## API overview

All routes are prefixed `/api/v1`. Health checks (`/healthz`, `/readyz`) and `/swagger/*` sit outside the prefix.

| Resource   | Routes                                                                 | Auth                               |
| ---------- | ----------------------------------------------------------------------- | ------------------------------------ |
| Auth       | `POST /auth/register`, `POST /auth/login`                              | public                               |
| Products   | `GET /products` (filter `category_id`, search `q`), `GET /products/:slug` | public                               |
|            | `POST/PUT/DELETE /products...`, `POST /products/:id/images`, `DELETE /products/:id/images/:image_id` | admin, or the owning seller |
| Categories | `GET /categories`                                                       | public                               |
|            | `POST /categories`                                                      | admin only                           |
| Sellers    | `POST /sellers/apply` (accept terms → role flips to `seller`)          | any authenticated user               |
| Cart       | `GET /cart`, `POST /cart/items`, `PUT/DELETE /cart/items/:id`          | authenticated user (own cart)        |
| Profile    | `GET/PUT /me`                                                          | authenticated user                    |
| Addresses  | `GET/POST /me/addresses`, `PUT/DELETE /me/addresses/:id`               | authenticated user (own addresses)    |
| Checkout   | `POST /checkout` (cart → order, stock decremented transactionally, starts a Stripe Checkout Session) | authenticated user |
| Orders     | `GET /orders`, `GET /orders/:id`                                       | own orders, or any order if admin    |
| Stripe webhook | `POST /webhooks/stripe` (`checkout.session.completed` → mark paid; `checkout.session.expired` → cancel order, restore stock) | public, verified via `Stripe-Signature` |
| Reviews    | `GET /products/:slug/reviews`, `GET /products/:slug/reviews/eligibility` | public / authenticated user |
|            | `POST /products/:slug/reviews`, `POST /reviews/:id/images`             | authenticated user who purchased the product |

Roles: `customer` (default) → `seller` (self-serve via `/sellers/apply`) → `admin` (manual DB promotion only, no self-serve path).

Full interactive docs: run the server and open `http://localhost:8080/swagger/index.html`.

## Infra

### Local (docker-compose)

```
                 ┌────────┐
  :80/:443  ───▶ │ caddy  │  reverse proxy, auto HTTPS on a real domain
                 └───┬────┘
                      │ (internal network only)
                      ▼
                 ┌────────┐        ┌───────────┐
                 │ server │──────▶ │ postgres   │  app data
                 │ (Gin)  │        └───────────┘
                 └───┬────┘
                      ├──────────▶ ┌────────┐
                      │            │ minio  │  S3-compatible object storage
                      │            └────────┘
                      │ publish "order.created"
                      ▼
                 ┌──────────┐
                 │ rabbitmq │  topic exchange "orders" (+ DLX for failed deliveries)
                 └────┬─────┘
                      │ consume
                      ▼
                 ┌──────────┐
                 │ notifier │  separate process, stubs order-confirmation email
                 └──────────┘
```

- **postgres** (`postgres:16-alpine`) — single `kommers` database, all tables via GORM `AutoMigrate` on server boot.
- **minio** (`minio/minio:latest`) — S3 API on `:9000`, console on `:9001`. Provisioned for future product-image uploads; nothing in the Go code reads it yet, but the compose env vars (`S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_USE_SSL`) are already named for when it's wired in.
- **rabbitmq** (`rabbitmq:3-management-alpine`) — AMQP on `:5672`, management UI on `:15672`. Checkout publishes an `order.created` event (topic exchange `orders`) after the DB transaction commits — best-effort, a down broker never fails checkout. Failed deliveries dead-letter into `orders.dlx` → `notifications.order_created.dlq`.
- **server** — built from `packages/server/Dockerfile` (multi-stage: `golang:1.26-alpine` builder → static binary on `alpine:3.20`). Not published to the host directly — only reachable through Caddy (`expose`, not `ports`).
- **notifier** — separate process (`cmd/notifier`, same image, entrypoint overridden), consumes `order.created` and stubs sending a confirmation email (logs it). Reconnects with backoff if RabbitMQ restarts.
- **caddy** — fronts everything on `:80`/`:443`. Locally it's plain HTTP; pointing the `Caddyfile`'s `:80` at a real domain instead is the only change needed to get automatic Let's Encrypt HTTPS on a VPS.

Bring it up: `docker compose up -d` (or `podman compose up -d`).

RabbitMQ management UI: `http://localhost:15672` (`kommers` / `kommers`).

### Planned, not yet configured

- **Cloudflare** — DNS + proxy in front of the VPS (Caddy stays as the origin's TLS terminator/reverse proxy; Cloudflare adds edge caching, DDoS protection, and hides the origin IP). Not something expressible in this repo — configured in the Cloudflare dashboard once there's a real domain/VPS.
- **Firewall** (`ufw`/`nftables`) — host-level lockdown (only 80/443 open, SSH restricted) on the VPS itself once deployed. Not a repo concern.

## Local development

Prereqs: Go 1.26+, Node 20+, pnpm, Postgres running locally (or via compose).

```bash
# API
cd packages/server
go run ./cmd/server        # reads env vars below, migrates on boot

# Web
cd packages/web
pnpm install
pnpm dev                   # http://localhost:3000

# Full infra (postgres + minio + server + caddy)
docker compose up -d       # http://localhost (via Caddy)
```

### Server environment variables

| Var                | Default                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| `PORT`              | `8080`                                                                |
| `ENV`               | `development`                                                        |
| `DATABASE_URL`      | `postgres://amri@localhost:5432/kommers?sslmode=disable`             |
| `JWT_SECRET`        | `dev-secret-change-me` — **override in any non-local environment**    |
| `JWT_EXPIRY_HOURS`  | `24`                                                                  |
| `RABBITMQ_URL`      | `amqp://kommers:kommers@localhost:5672/` — optional, checkout skips event publishing if unreachable |
| `S3_ENDPOINT`       | `localhost:9000` — MinIO/S3 endpoint the server dials (no scheme needed; `http://`/`https://` prefixes are stripped if present) |
| `S3_ACCESS_KEY_ID`  | `kommers`                                                             |
| `S3_SECRET_ACCESS_KEY` | `kommers123`                                                       |
| `S3_BUCKET`         | `kommers` — created on boot if missing, with a public-read bucket policy |
| `S3_USE_SSL`        | `false`                                                               |
| `S3_PUBLIC_URL`     | `http://localhost:9000` — browser-facing scheme+host for image URLs; optional, image upload 503s if unreachable at boot |
| `STRIPE_SECRET_KEY` | empty — checkout 503s if unset, never fails server boot                |
| `STRIPE_WEBHOOK_SECRET` | empty — from `stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe --print-secret` for local dev |
| `FRONTEND_URL`      | `http://localhost:3000` — base for the Checkout Session's success/cancel redirect URLs |

`cmd/notifier` (the RabbitMQ consumer) reads the same `RABBITMQ_URL` and runs as its own process: `go run ./cmd/notifier`.

## Status

Auth, products, categories, seller onboarding, cart, profile/addresses, checkout, and buyer reviews are built and runtime-verified, frontend included. Product images (`ProductImage` gallery, `sort_order`/`is_primary`) and review photos both upload through the same MinIO-backed multipart flow, with matching upload UI on the seller product form and the review form respectively.

Payment is real, not stubbed: checkout creates the order (stock decremented transactionally, same as before) and starts a Stripe Checkout Session (hosted redirect, not embedded Elements). `POST /webhooks/stripe` verifies the `Stripe-Signature` header and reconciles the order — `checkout.session.completed` marks it paid, `checkout.session.expired` cancels it and restores stock (and any campaign `stock_used`). Currency defaults to `idr`; if the connected Stripe account can't present it, checkout falls back to `usd` on that one attempt only (detected via the error message, not a hardcoded account allowlist) — the amount is reused as-is, so this is a currency-label fallback for demo purposes, not a real FX conversion. Both the paid and expired paths are runtime-verified against a live Stripe test-mode account via a real Checkout Session and hand-signed webhook events.

The RabbitMQ producer/consumer (`order.created` → notifier) is built and compiles clean but **not yet runtime-verified against a live broker** — infra was written without spinning up podman/docker per instruction. Not yet built: admin UI (API-only for now).
