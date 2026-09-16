// Stress the read path: product listing, name search, category filter.
// All public/unauthenticated — this is what most storefront traffic
// actually looks like, so it's the first thing worth knowing the P95/P99 of.
//
//   k6 run k6/scenarios/products-read.js -e BASE_URL=http://localhost:8080
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { BASE_URL } from "../lib/client.js";

const listDuration = new Trend("products_list_duration", true);
const searchDuration = new Trend("products_search_duration", true);

export const options = {
  scenarios: {
    ramping_read_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

const SEARCH_TERMS = ["laptop", "novel", "hub", "widget", "keyboard"];

export default function () {
  const listRes = http.get(`${BASE_URL}/api/v1/products?page=1&limit=20`);
  listDuration.add(listRes.timings.duration);
  check(listRes, { "list: 200": (r) => r.status === 200 });

  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const searchRes = http.get(`${BASE_URL}/api/v1/products?q=${term}`);
  searchDuration.add(searchRes.timings.duration);
  check(searchRes, { "search: 200": (r) => r.status === 200 });

  const categoryRes = http.get(`${BASE_URL}/api/v1/products?category_id=1`);
  check(categoryRes, { "category filter: 200": (r) => r.status === 200 });

  sleep(1);
}
