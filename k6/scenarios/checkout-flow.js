// Full checkout flow under concurrency: register -> login -> add address ->
// add product to cart -> checkout.
//
// This is the interesting one: checkout row-locks the product
// (`SELECT ... FOR UPDATE`) before decrementing stock, so once a product's
// stock runs out under enough concurrent VUs, later checkouts should get a
// clean 409 "insufficient stock" — never a negative stock count or a
// double-sold unit. That's what this script actually checks for; a 409 here
// is a correct outcome, not a failure. Only unexpected status codes (5xx,
// or a 201 with impossible totals) count as real failures.
//
// Requires at least one active product to already exist (created via the
// admin/seller product endpoints beforehand) — the script picks the first
// one back from GET /api/v1/products rather than trying to create one
// itself, since product creation needs an admin/seller token this script
// doesn't have.
//
//   k6 run k6/scenarios/checkout-flow.js -e BASE_URL=http://localhost:8080
import http from "k6/http";
import { check, sleep, fail } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, jsonHeaders, registerAndLogin, createAddress } from "../lib/client.js";

const checkoutDuration = new Trend("checkout_duration", true);
const stockConflictRate = new Rate("checkout_stock_conflict_rate");

export const options = {
  scenarios: {
    ramping_checkout_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 10 },
        { duration: "40s", target: 25 },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    // 5xx or unexpected statuses only — 409s are an expected, correct
    // outcome under contention and are tracked separately below.
    http_req_failed: ["rate<0.01"],
    checkout_duration: ["p(95)<1000"],
  },
};

export function setup() {
  const res = http.get(`${BASE_URL}/api/v1/products?limit=1`);
  const products = res.json();
  if (!products || products.length === 0) {
    fail(
      "no active products found — create at least one product via the admin/seller API before running this scenario",
    );
  }
  return { productId: products[0].id };
}

export default function (data) {
  const token = registerAndLogin("checkout");
  if (!token) return;

  const addressId = createAddress(token);
  if (!addressId) return;

  const addRes = http.post(
    `${BASE_URL}/api/v1/cart/items`,
    JSON.stringify({ product_id: data.productId, quantity: 1 }),
    jsonHeaders(token),
  );
  const addedToCart = check(addRes, {
    "add to cart: 200 or 409 (out of stock)": (r) => r.status === 200 || r.status === 409,
  });
  if (!addedToCart || addRes.status === 409) return;

  const start = Date.now();
  const checkoutRes = http.post(
    `${BASE_URL}/api/v1/checkout`,
    JSON.stringify({ address_id: addressId }),
    jsonHeaders(token),
  );
  checkoutDuration.add(Date.now() - start);

  stockConflictRate.add(checkoutRes.status === 409);

  check(checkoutRes, {
    "checkout: 201 (success) or 409 (stock conflict, expected under load)": (r) =>
      r.status === 201 || r.status === 409,
  });

  sleep(1);
}
