# k6 load tests

Not run yet — written ahead of time for when the VPS deployment is up (per `docs/deployment-checklist.md`). Requires the [k6](https://k6.io/) binary; not an npm package, so it's intentionally outside `packages/` and the pnpm workspace.

## Scenarios

| Script                 | What it tests                                                               |
| ------------------------ | ------------------------------------------------------------------------------- |
| `scenarios/smoke.js`     | 1 VU, 1 iteration — sanity check that the target is actually reachable          |
| `scenarios/products-read.js` | Product listing + search + category filter under ramping load (public, read-heavy) |
| `scenarios/auth-load.js` | Register + login throughput (bcrypt-bound, tests CPU headroom)                 |
| `scenarios/checkout-flow.js` | Full register → address → cart → checkout under concurrency, on a shared product's stock — checks the row-locked stock decrement holds up (409 on depletion is a pass, not a failure) |

## Running

Always run `smoke.js` first.

```bash
k6 run k6/scenarios/smoke.js -e BASE_URL=http://localhost:8080

k6 run k6/scenarios/products-read.js -e BASE_URL=http://localhost:8080
k6 run k6/scenarios/auth-load.js -e BASE_URL=http://localhost:8080
```

`checkout-flow.js` needs at least one active product to already exist (create one via the admin/seller product API first — the script reads it from `GET /api/v1/products`, it doesn't create its own):

```bash
k6 run k6/scenarios/checkout-flow.js -e BASE_URL=http://localhost:8080
```

Against the deployed domain instead of localhost:

```bash
k6 run k6/scenarios/products-read.js -e BASE_URL=https://kommers.store
```

## Notes

- Each VU/iteration registers a unique user (`<prefix>-<vu>-<iter>-<timestamp>@k6.test`) since email is a unique column — don't expect these to be cleaned up automatically, they'll accumulate in the `users` table across runs.
- `checkout-flow.js` will deplete whatever product's stock it's pointed at. Reset stock (or use a product with a large stock count) between runs if you want repeatable results.
- Thresholds in each script are starting guesses, not tuned numbers — adjust once there's a real baseline from the VPS.
