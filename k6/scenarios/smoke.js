// Quick sanity pass across the main surface — not a stress test. Run this
// first to confirm the target (BASE_URL) is actually up before running the
// heavier scenarios.
//
//   k6 run k6/scenarios/smoke.js -e BASE_URL=http://localhost:8080
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, jsonHeaders, registerAndLogin } from "../lib/client.js";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ["rate==0"],
  },
};

export default function () {
  check(http.get(`${BASE_URL}/healthz`), {
    "healthz: 200": (r) => r.status === 200,
  });
  check(http.get(`${BASE_URL}/readyz`), {
    "readyz: 200": (r) => r.status === 200,
  });

  check(http.get(`${BASE_URL}/api/v1/products`), {
    "products list: 200": (r) => r.status === 200,
  });
  check(http.get(`${BASE_URL}/api/v1/categories`), {
    "categories list: 200": (r) => r.status === 200,
  });

  const token = registerAndLogin("smoke");
  check(token, { "got a token": (t) => !!t });

  check(http.get(`${BASE_URL}/api/v1/me`, jsonHeaders(token)), {
    "me: 200": (r) => r.status === 200,
  });
  check(http.get(`${BASE_URL}/api/v1/cart`, jsonHeaders(token)), {
    "cart: 200": (r) => r.status === 200,
  });
  check(http.get(`${BASE_URL}/api/v1/orders`, jsonHeaders(token)), {
    "orders: 200": (r) => r.status === 200,
  });

  sleep(1);
}
