# tik back

SSE tick/pool server. Decisions log: `../harness/DECISIONS.md`.
Deployed on the VDS (188.225.26.46) via the serf pipeline (VDS slim variant), internal
port **3202**, public URL **`http://188.225.26.46/tik/…`** (port 80 via nginx).


## nginx: route setup on the server

**The deploy pipeline now does this automatically** (serf, since 2026-11-23): every VDS
deploy ensures `location /tik/` → `127.0.0.1:3202` exists in
`/etc/nginx/sites-enabled/default` — idempotent (skips when present), backup → insert →
`nginx -t` → reload, restore + loud failure if the test fails. It requires the safe rows
`API_PREFIX=/tik` and `PORT=3202`, and emits `proxy_buffering off;` when the safe row
`PROXY_BUFFERING=off` is set (SSE needs it — see notes below). The route below is what it
generates; keep this as the manual fallback/reference for a first setup or a rebuild of
the config by hand:

```nginx
location /tik/ {
    proxy_pass http://127.0.0.1:3202;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_buffering off;
}
```

Then:

```bash
cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.bak-$(date +%Y%m%d-%H%M%S)
nginx -t                    # must pass before reload; restore the backup if not
systemctl reload nginx
```

Verify: `curl http://188.225.26.46/tik/health` → pool JSON; `curl -N
http://188.225.26.46/tik/sse/check` → init frame + 1-second ticks.

### Notes

- **`proxy_buffering off` is mandatory** — nginx buffers proxied responses by default,
  which batches the 1s SSE tick frames into bursts. Ticks must reach clients in realtime.
- The block is idempotent to re-run: skip insertion if `grep -qF 'location /tik/'` already
  matches (the original insertion was done this way, 2026-11-23, backup
  `default.bak-20261123-182759`).
- The app reads `API_PREFIX=/tik` (safe row) and serves all routes under it — nginx does
  **no** path rewriting (`proxy_pass` without a URI suffix preserves `/tik/…`).
- Behind nginx the app's self-reported origin becomes `http://188.225.26.46` (Host header,
  no port). When `collectEventsState` / outer-events flows get enabled, `BASE_KEY` must be
  re-registered at key@ for exactly that origin (and updated in safe), or `/get-token`
  403s with a URL mismatch.
