# Deployment checklist — kommers.store

Domain: `kommers.store`. Follow in order — DNS/Cloudflare steps can happen before the VPS exists, everything else needs the VPS provisioned first.

## 1. Domain → Cloudflare

- [ ] Buy `kommers.store`
- [ ] Add `kommers.store` as a site in Cloudflare
- [ ] At the registrar, change nameservers to the two Cloudflare gives you
- [ ] Wait for Cloudflare to show the zone as "active" (can take a few minutes to ~24h)

## 2. VPS

- [ ] Provision VPS (2 vCPU / 4GB RAM / 40GB SSD, Debian 12)
- [ ] Note the VPS public IP

## 3. SSH access

- [ ] Generate a local SSH key if you don't have one: `ssh-keygen -t ed25519 -C "kommers-vps"`
- [ ] Add the public key at VPS creation, or after first login: append to `~/.ssh/authorized_keys`
- [ ] Confirm you can `ssh <user>@<vps-ip>`

## 4. Harden the box

- [ ] `apt update && apt upgrade -y`
- [ ] Create a non-root sudo user, stop using root for anything
- [ ] Disable root SSH login (`PermitRootLogin no` in `/etc/ssh/sshd_config`)
- [ ] Disable SSH password auth, keys only (`PasswordAuthentication no`)
- [ ] `systemctl restart sshd`

## 5. Firewall

- [ ] `ufw allow 22/tcp`
- [ ] `ufw allow 80/tcp`
- [ ] `ufw allow 443/tcp`
- [ ] `ufw enable`
- [ ] `ufw status` — confirm only those three are open

## 6. Podman

- [ ] Install podman (`apt install -y podman`)
- [ ] Confirm `podman compose` works (or install `podman-compose` separately if using an older podman)

## 7. Get the code onto the VPS

- [ ] Generate a fresh SSH keypair **on the VPS** (don't reuse your personal one): `ssh-keygen -t ed25519 -C "kommers-deploy"`
- [ ] Add the public half as a **read-only Deploy Key** on the GitHub repo (repo → Settings → Deploy keys)
- [ ] `git clone git@github.com:<you>/kommers.git`

## 8. Real secrets

`docker-compose.yml` currently has dev defaults — replace all of these before exposing anything publicly:

- [ ] `JWT_SECRET` (currently `dev-secret-change-me`)
- [ ] Postgres user/password (currently `kommers`/`kommers`)
- [ ] MinIO root user/password (currently `kommers`/`kommers123`)
- [ ] RabbitMQ user/password (currently `kommers`/`kommers`)

Easiest: move these into a `.env` file on the VPS (gitignored, never committed) and reference via `${VAR}` in compose, or edit the compose file directly on the VPS only.

## 9. Point the reverse proxy at the real domain

- [ ] Edit `Caddyfile`: replace `:80` with `api.kommers.store` (apex `kommers.store` is reserved for the web app on Cloudflare Pages — see §13)

## 10. DNS record

- [ ] In Cloudflare, add an `A` record: `api.kommers.store` → VPS IP
- [ ] Cloudflare SSL/TLS setting → **Full (strict)**, not Flexible (Flexible breaks Caddy's own HTTPS / causes redirect loops)

## 11. Bring it up

- [ ] `podman compose up -d`
- [ ] `podman compose logs -f caddy` — confirm it actually obtained a Let's Encrypt cert
- [ ] `podman compose ps` — confirm all services healthy

## 12. Verify end-to-end

- [ ] `curl https://api.kommers.store/healthz` from your own machine, off the VPS
- [ ] Check RabbitMQ management UI is **not** publicly exposed (only reachable inside the compose network / via SSH tunnel, not through Caddy)
- [ ] Run through register → login → checkout once against the real domain

## 13. Web (Cloudflare Pages)

Split deploy: API on the VPS (above), web on Cloudflare Pages — same pattern as Vercel, no VPS involvement for the frontend.

- [ ] In `packages/web/app.config.ts`, set the Nitro/vinxi server preset to Cloudflare: `server: { preset: "cloudflare_pages" }`
- [ ] Push to GitHub, connect the repo in Cloudflare Pages (build command `pnpm build`, output `packages/web/.output/public`, root directory `packages/web`)
- [ ] Add the custom domain `kommers.store` (apex) to the Pages project — Cloudflare manages the DNS record automatically since the zone's already on Cloudflare
- [ ] Point `packages/web`'s API client at `https://api.kommers.store`
- [ ] Confirm `kommers.store` serves the app and `api.kommers.store` still serves the API — they're two independent deploy targets sharing one domain

## 14. Security testing (optional, your own VPS only)

- [ ] Check the VPS provider's ToS/AUP for port-scanning/pentest policy first — some auto-flag scans as abuse even against your own instance
- [ ] To actually test the origin (not just Cloudflare's edge), temporarily un-proxy the DNS record (grey cloud) or scan the VPS's raw IP directly
- [ ] Scope any scan/tooling to the VPS's own IP only
