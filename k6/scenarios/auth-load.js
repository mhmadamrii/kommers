// Stress register + login. bcrypt hashing is deliberately CPU-expensive, so
// this is really a test of how many concurrent auth ops the server's CPU
// budget can absorb before latency degrades — not a network/DB test.
//
//   k6 run k6/scenarios/auth-load.js -e BASE_URL=http://localhost:8080
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import { registerAndLogin } from "../lib/client.js";

const authDuration = new Trend("register_login_duration", true);

export const options = {
  scenarios: {
    ramping_auth_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 30 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  const start = Date.now();
  const token = registerAndLogin("authload");
  authDuration.add(Date.now() - start);

  check(token, { "got a token": (t) => !!t });

  sleep(1);
}
