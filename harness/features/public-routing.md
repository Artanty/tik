# Feature: public routing (nginx /tik + PROXY_BUFFERING)

From the current DECISIONS.md [2026-11-23] — nginx route auto-ensure + PROXY_BUFFERING flag.

- **Public route LIVE**: nginx `location /tik/` → 127.0.0.1:3202 in
  /etc/nginx/sites-enabled/default (mirrors the /totp/ block + `proxy_buffering off` for
  SSE). Verified publicly: `/tik/health` returns the pool JSON; `/tik/sse/prodcheck` streams
  init + 1s ticks (buffering off works); :3202 stays firewall-filtered. Public URL =
  http://188.225.26.46/tik/… (no port).
- **serf auto-ensure**: both VDS variants of serf's generated workflow idempotently ensure
  `location ${API_PREFIX}/` → 127.0.0.1:$PORT after the service restart (backup → insert →
  `nginx -t` → reload; restore + fail on test failure; awk-based).
- **PROXY_BUFFERING**: new safe flag `PROXY_BUFFERING=off` adds `proxy_buffering off;` to the
  generated location — REQUIRED for tik (SSE); unset = omitted (totp/jump unchanged).
  Action needed: add it to safe for tik.

Related: `harness/core/deploy.md`, `harness/core/gotchas.md`.
