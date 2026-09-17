# Agent instructions

- Do not use claude-in-chrome / browser automation tools unless the user explicitly asks for them.

Stack, layout, and API surface are documented in `README.md` — read that first. This file is only the stuff a fresh read of the code won't tell you: decisions, traps, and conventions that cost real time to rediscover once already.

## Gotchas

- **`QueryClient` is a factory (`createQueryClient()` in `lib/query-client.ts`), never a module singleton.** A shared instance leaks one visitor's cached queries (e.g. `me`) into another visitor's SSR render — confirmed live during dev, not theoretical. Call it fresh inside `App()`'s body; that's correct per-request on the server and once-per-session in the browser, no `isServer` branching needed.
- **`apiFetch` (`lib/api-client.ts`) forwards the incoming request's `Cookie` header via `getRequestEvent()` when `isServer`.** Without it every SSR render looks logged-out regardless of the visitor's real session — browser `fetch`'s `credentials:'include'` only covers client-side calls, SSR has no cookie jar to draw from.
- **`cva/config`, not `cva`, exports `defineConfig`** (`lib/cva.ts`). Its shape here is `{ cx: twMerge }`, not `{ hooks: { onComplete } }` — that's a different major version's API and throws at runtime, not compile time.
- **`ui/text-field.tsx`'s `TextFieldInput` needs explicit `w-full`.** Without it the native `<input>` sits at browser-default intrinsic width regardless of any wrapper sizing — a wrapper `flex-1`/`max-w-*` silently does nothing.
- **`ui/sonner.tsx`'s `Toaster` requires a `ColorModeProvider` we don't have wired (crashes on mount).** `app.tsx` uses `somoto`'s `Toaster` directly with a fixed `theme="light"` instead. There's no dark mode in this app yet.
- **`CartItem` deletes are `Unscoped()` (hard delete), not the usual soft delete.** The `(cart_id, product_id)` unique index doesn't know about `deleted_at`, so a soft-deleted row still occupies the slot and collides if the same product is re-added later.
- **Discounting only ever flows through a live `Campaign`** (`internal/pricing`) — there's no static per-product discount field anymore. `effective_price_cents`/`campaign_id`/`campaign_ends_at` on a product response are the only honest source for "is this on sale." Checkout re-derives the campaign fresh and row-locks it (same pattern as product stock) rather than trusting the cart's snapshot — a promo that sold out between cart and checkout falls back to base price, it doesn't block the order.
- **No rating/review/sold-count system exists.** Don't add star ratings or "X terjual" anywhere — those were fabricated dummy-data fields, deliberately removed once real data replaced the dummy set.
- **`swag init` needs `--parseDependency --parseInternal`** or it fails on any response type embedding `gorm.Model`.
- **`POST /api/v1/dev/seed`** is only mounted when `ENV=development` (see `router.go`) — idempotent, safe to re-run, creates `admin@kommers.dev` / `seller@kommers.dev` (password `password123`), 8 categories, 12 products, one demo Campaign.
- **Local Postgres runs via `brew services`, database `kommers`, role = your unix username** (not a `postgres` role — matches `DATABASE_URL`'s default in `.env.example`).
