# Catalog Service

Owns the product catalog: categories, products, variants, and product images. Read-heavy by design — this is the service every storefront page hits, so caching and pagination discipline matter more here than anywhere else so far.

---

## Problem

The storefront (`packages/web`) currently renders hardcoded mock data (`src/lib/mock/products.ts`, `categories.ts`). There is no source of truth for what's sellable, no way to add/edit products, no images, and no way for later services (Cart, Inventory, Order, Search) to reference a product by a stable ID.

The catalog must serve two very different audiences:

- **Shoppers** — high-volume anonymous reads: category listing, product listing, product detail, basic text search. Latency-sensitive, cacheable.
- **Admins** — low-volume authenticated writes: CRUD on categories/products/variants, image upload. Correctness-sensitive, not cacheable.

## Requirements

### Functional

- Category CRUD: name, slug, optional parent (flat now, tree-capable later)
- Product CRUD: name, slug, description, base price, category, status (`draft`/`active`/`archived`)
- Variant CRUD per product: SKU, price override, attributes (size/color/etc.), display stock
- Image upload per product (MinIO), ordered gallery, one primary image
- Public read API: list categories, list products (filter by category, paginated), product detail by slug
- Search stub: `GET /products?q=` substring/similarity match on name — placeholder until Phase 8 (OpenSearch)
- Writes restricted to `admin` role — first real consumer of Auth Service's JWKS

### Non-functional

- p95 product detail read under 50ms warm (cache hit), under 150ms cold
- Reads must survive a Redis outage (degrade to Postgres, never 5xx because the cache died)
- Pagination must stay correct and fast at 100k+ products (no deep `OFFSET` scans on public routes)
- Stateless process — all state in Postgres/Redis/MinIO, N replicas safe
- Standard Definition of Done: health endpoints, structured logging w/ correlation IDs, Prometheus metrics, tracing hook, Dockerfile, env config, unit tests

---

## Architecture

```
            Shopper (web)                Admin (web, later)
                 │ reads                      │ writes (JWT, role=admin)
                 ▼                            ▼
              Catalog Service ──────► Postgres (kommers_catalog)
                │       │                ├─ categories
                │       │                ├─ products
                │       │                ├─ product_variants
                │       │                └─ product_images
                │       │
                │       ├─────────────► Redis (cache-aside)
                │       │                ├─ product detail by slug
                │       │                └─ category list
                │       │
                │       └─────────────► MinIO (bucket: product-images)
                │                          object key stored in Postgres,
                │                          public read URL served to client
                │
                └──── JWT verification: public key from Auth JWKS,
                      cached in-process, refetched on unknown `kid`
```

Data access: **GORM + AutoMigrate**, same as Auth Service — same reasoning (small toolchain, schema still simple), revisit if query patterns outgrow it.

### Data model

- `categories` — id (uuid), name, slug (unique), parent_id (nullable, unused by UI for now)
- `products` — id, category_id (FK), name, slug (unique), description, base_price_cents (int — never float for money), status, timestamps
- `product_variants` — id, product_id (FK), sku (unique), price_cents (nullable → falls back to base), attributes (jsonb), display_stock (int)
- `product_images` — id, product_id (FK), object_key, position, is_primary

**Display stock is a lie we tell on purpose.** Authoritative stock arrives with Inventory Service (Phase 4). Until then `display_stock` is a denormalized display value owned by Catalog; when Phase 4 lands it becomes a periodically-synced projection (or is dropped from responses). Documented here so it doesn't fossilize into an accidental source of truth.

Prices are integer cents. Floats corrupt money; every later service (Cart, Checkout, Payment) inherits this convention.

### Endpoints

Public:

- `GET /categories`
- `GET /products?category=<slug>&q=<term>&limit=<n>&cursor=<token>`
- `GET /products/{slug}`

Admin (JWT, `role=admin`):

- `POST/PUT/DELETE /admin/categories/{id}`
- `POST/PUT/DELETE /admin/products/{id}`
- `POST/PUT/DELETE /admin/products/{id}/variants/{variantId}`
- `POST /admin/products/{id}/images` (multipart upload → MinIO), `DELETE .../images/{imageId}`

Ops: `GET /healthz`, `GET /readyz`, `GET /metrics` (readyz checks Postgres; Redis and MinIO are non-fatal, reported but not failing readiness — see Failure Cases).

### Pagination

Keyset (cursor) pagination on public product listing: `ORDER BY created_at DESC, id DESC`, cursor = opaque base64 of `(created_at, id)` of the last row. `OFFSET` gets slower linearly with depth and skips/duplicates rows when writes land mid-scroll; keyset is O(index seek) at any depth and stable under concurrent inserts. Cost: no "jump to page 7" — acceptable, storefronts scroll, they don't jump.

### Caching (Redis, cache-aside, explicit invalidation)

- Cached: product detail by slug (hot key per product page), full category list (small, hit on every page render)
- Read path: Redis GET → miss → Postgres → SET with TTL
- Write path: mutate Postgres, then **DELETE** the affected keys (never write-through — deleting is idempotent and can't race a concurrent reader into caching a half-updated aggregate)
- TTL 10 min as a safety net so any missed invalidation self-heals; explicit deletes are the primary mechanism, TTL is the backstop
- Product **listing** pages are deliberately *not* cached in v1: cursor+filter combinations explode the keyspace, invalidation becomes guesswork, and Postgres with proper indexes handles it fine at this scale. Revisit with real load data, not speculation.

Known-and-accepted race: DELETE-then-concurrent-read can re-cache stale data for one TTL window if a reader loaded the old row just before the write committed. Fixing this properly needs versioned keys or distributed locks — not worth it for catalog data where 10 minutes of staleness on a product description is harmless. This exact tradeoff is *not* acceptable for inventory/pricing-at-checkout, which is why those live in later services with different designs.

### Images

Admin uploads multipart to Catalog Service → service streams to MinIO (`product-images` bucket), stores only the object key. Clients get a URL assembled from a configured public base (`MINIO_PUBLIC_URL`), served directly by MinIO — image bytes never proxy through the service on read. Bucket is public-read (product images are public content; nothing presigned needed until private assets exist).

### Search stub

`q=` filters with Postgres `ILIKE '%term%'` backed by a `pg_trgm` GIN index on `products.name`. Good enough for a storefront search box at this catalog size; deliberately shaped so Phase 8 swaps the implementation (OpenSearch) behind the same query parameter without an API change.

### Indexes

- `products`: unique(slug), btree(category_id, created_at DESC, id DESC) — serves both category filtering and keyset pagination, GIN trgm(name)
- `categories`: unique(slug)
- `product_variants`: unique(sku), btree(product_id)
- `product_images`: btree(product_id, position)

### AuthN/AuthZ

Middleware verifies RS256 JWTs against Auth Service's JWKS: fetched at startup, cached in-process, refetched once on unknown `kid` (key rotation tolerance). No network call to Auth Service per request — this is the payoff of the Phase 1 RS256/JWKS decision. `role` claim must equal `admin` for `/admin/*` routes.

---

## Tradeoffs

**GORM again instead of sqlc/pgx.** Same constrained-hardware reasoning as Auth Service, and consistency across services keeps the codebase learnable. The catalog's queries (keyset pagination, trgm search) push GORM harder — where GORM's query builder fights the SQL, drop to `db.Raw()` with a comment rather than contorting the ORM. If a *third* service hits this wall, that's the signal to revisit the stack-wide decision.

**Keyset over offset pagination.** Covered above. Extra cost: cursors are opaque, so QA can't URL-hack to page N; accepted for correctness under concurrent writes.

**Cache-aside with delete-on-write over write-through.** Write-through caches the new value atomically-ish but races concurrent readers and caches things nobody may read. Delete is idempotent, simple to reason about, and misses just refill. Catalog reads tolerate the small stale window; TTL backstops missed deletes.

**Fail-open on Redis (opposite of Auth Service).** Auth's rate limiter fails closed because its job is abuse protection. The catalog cache's job is speed — failing closed would turn a cache outage into a storefront outage. Same dependency, opposite policy, both deliberate.

**Flat categories with a dormant `parent_id`.** Real category trees need recursive queries or materialized paths; the UI shows a flat grid. Carrying one nullable column now avoids a migration later without paying tree-query complexity today.

**MinIO public-read bucket instead of presigned GETs.** Product images are public marketing content; presigning every image URL adds latency and complexity for zero confidentiality gain. Presigned **PUT** uploads (client → MinIO direct) were also considered and rejected for now — routing uploads through the service keeps validation (file type, size) in one place at admin-scale volumes.

---

## Failure Cases

- **Postgres down** — reads that miss cache fail 503; cache hits keep serving until TTL. Writes fail. `readyz` goes red.
- **Redis down** — every read is a cache miss; serve from Postgres, log + increment a `cache_errors_total` metric, never 5xx. Latency degrades from ~5ms to ~50ms. `readyz` stays green (degraded, not down).
- **MinIO down** — image *uploads* fail 503; product reads keep working (URLs point at MinIO directly, so images 404/timeout in the browser but the API stays healthy). Accepted: broken images beat a dead storefront.
- **Auth JWKS unreachable at startup** — admin routes fail closed (401) until the key loads; public routes unaffected. Retry with backoff rather than crash-looping, since the public API has no auth dependency.
- **Cache invalidation bug** — worst case is TTL-bounded staleness (10 min), not corruption. Postgres is always the source of truth.
- **Slug collision on create** — unique index violation surfaces as 409, client retries with a different slug. No auto-suffixing magic (silent renames confuse admins).

---

## Scaling Strategy

- **10 users** — one instance, cache barely matters, everything above is still cheap to have from day one.
- **10,000 users** — reads dominate; Redis absorbs product-detail hotspots (a product going viral is one hot key, not a DB melt). Stateless service scales horizontally. Postgres read load stays modest because the hottest objects live in cache.
- **1,000,000 users** — add Postgres read replicas for listing queries (staleness tolerance already established); move category list + hottest product payloads to a CDN-cacheable edge via the API Gateway (Phase 10); listing-query cache revisited with real traffic shapes; image traffic is already fully offloaded to MinIO/CDN and never touches the service. Search load moves to OpenSearch in Phase 8 by design.
