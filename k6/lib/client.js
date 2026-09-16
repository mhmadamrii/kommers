import http from "k6/http";
import { check } from "k6";

export const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

export function jsonHeaders(token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return { headers };
}

// registerAndLogin creates a unique user per VU/iteration and returns its JWT.
// Uniqueness matters: k6 runs many VUs/iterations in parallel and the email
// column is unique, so anything less specific than VU+iter+time collides.
export function registerAndLogin(emailPrefix) {
  const email = `${emailPrefix}-${__VU}-${__ITER}-${Date.now()}@k6.test`;
  const password = "password123";

  const registerRes = http.post(
    `${BASE_URL}/api/v1/auth/register`,
    JSON.stringify({ email, password, full_name: "K6 Load Test" }),
    jsonHeaders(),
  );
  check(registerRes, { "register: status 201": (r) => r.status === 201 });

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    jsonHeaders(),
  );
  check(loginRes, { "login: status 200": (r) => r.status === 200 });

  return loginRes.json("token");
}

export function createAddress(token) {
  const res = http.post(
    `${BASE_URL}/api/v1/me/addresses`,
    JSON.stringify({
      recipient: "K6 Load Test",
      phone: "080000000",
      line1: "Jl. Load Test 1",
      city: "Jakarta",
      postal_code: "12345",
      country: "ID",
    }),
    jsonHeaders(token),
  );
  check(res, { "create address: status 201": (r) => r.status === 201 });
  return res.json("id");
}
