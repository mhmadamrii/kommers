# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: an intentional shopper — knows roughly what they want, comes to search/filter/browse-by-category and buy quickly. Not a discovery-first/editorial-browsing audience.

Secondary: sellers — any registered customer can self-upgrade to seller (accept terms, no admin review/gatekeeping) and then create/manage their own product listings.

Tertiary: admin — manual DB promotion only, no self-serve path, no admin UI planned for this web app (API-only for now).

## Product Purpose

kommers is a multi-vendor e-commerce marketplace, modeled on mainstream Indonesian marketplaces (Tokopedia, Shopee, Blibli) rather than a single-brand DTC storefront. Independent sellers list products under shared categories; buyers search, filter, and purchase directly from whichever seller lists the item. Success = a buyer can find and buy a specific product quickly, and a customer can become a seller and list their own products with zero friction beyond accepting terms.

## Positioning

True multi-vendor bazaar, not a curated single-brand shop: any customer can become a seller instantly (self-serve terms-acceptance, no application review), and each product is owned by the seller who listed it — sellers manage only their own listings, admins can manage any. This zero-gatekeeping seller onboarding is the mechanism a single-brand DTC competitor couldn't copy without becoming a different kind of product.

## Operating Context

- **Buyer flow:** browse/search/filter products (public, no login required) → register/login → add to cart → add or select a saved address → checkout (creates an order, stock is decremented transactionally and can reject with "insufficient stock" under contention — an expected outcome, not an error state) → view order history.
- **Seller flow:** register as a customer → apply to become a seller (accept terms) → create/update/delete own product listings (ownership-enforced; a seller cannot touch another seller's products).
- **Admin flow:** exists at the API level (manage categories, any product, any order) but has no UI in this web app — out of scope here.
- Backend: Go/Gin REST API, JWT bearer auth, already implements all of the above end to end.

## Capabilities and Constraints

- Roles: `customer` (default) → `seller` (self-serve) → `admin` (manual only). No social/OAuth login, email+password only.
- A product belongs to exactly one category (not multi-category/tag-based).
- Cart is per logged-in user only — no guest cart yet.
- Checkout requires a saved address to exist first.
- **No payment gateway is wired up yet** (Stripe deliberately deferred) — checkout currently produces a `pending`-payment order with no real payment capture. The UI must never imply a real payment happened; "order placed, payment pending" is the honest state.
- No product-image upload yet — products carry a plain `image_url` string (object storage planned, not built). UI must degrade gracefully when it's empty.
- Currency: API stores integer "cents" (smallest unit); actual currency/locale is undecided. Given the Tokopedia/Shopee/Blibli reference, Indonesian Rupiah / Indonesian-market conventions are a reasonable working assumption, not a confirmed fact.
- Language/locale: undecided.

## Brand Commitments

- Domain purchased: `kommers.store`.
- No logo or visual identity established yet.
- `docs/HARDGOODS Storefront.dc.html` and `docs/Wireframes.dc.html` exist in the repo but are **confirmed unrelated** — an earlier, separate exploration (workwear/heritage-goods DTC brand). Do not treat them as reference or evidence for kommers.

## Evidence on Hand

- A working backend API (auth, products, categories, cart, checkout, orders, addresses, seller onboarding) — the real source of product truth for this app.
- The current web app is an unstyled SolidStart scaffold (hello-world only); no real UI exists yet.
- No real product photography, testimonials, or marketing copy on hand — do not fabricate any.

## Product Principles

1. Multi-vendor by default — becoming a seller is a first-class, frictionless in-app transition, not a separate signup product.
2. Intentional-shopper first — search and filtering are the primary discovery path; optimize for fast query-to-purchase over editorial browsing.
3. Stock truth lives on the server — "out of stock at checkout" is a graceful, expected UI state, never treated as a bug.
4. Payment isn't live — never present checkout as a completed purchase; be honest about "pending" until Stripe lands.
5. One app, two first-class flows — buyer (browse/cart/checkout/orders/addresses) and seller (apply/manage own listings) both live here, not split into separate products.
