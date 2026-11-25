# Deploy — tik

(from the current DECISIONS.md)

- Target: the VDS branch of the pipeline (githooklib → flow → serf → slave repo →
  hosting). `HST_PORT` must be unique in safe (AGENTS.md).
- Public routing (2026-11-23): nginx `location /tik/` → 127.0.0.1:3202 added to
  /etc/nginx/sites-enabled/default (mirrors the /totp/ block; inserted before the /totp/
  anchor via python, idempotent guard, backup `default.bak-20261123-182759`, `nginx -t` ok,
  reloaded). Public URL = http://188.225.26.46/tik/… ; the app ports (:3299, :3202) are
  firewall-filtered. Verified publicly: `/tik/health` returns the pool JSON, `/tik/sse/...`
  streams init + 1s ticks.
- Deploy context (moved from `tik/AGENTS.md`, 2026-11-26): the pipeline is documented in
  `../know/entries/deploy-slave.md`; this service's target is the VDS branch
  (unique `HST_PORT` is mandatory). Old node build kept as reference at `back-node-js/`
  — read-only, do not "fix" it.
- serf: both VDS variants of the generated workflow auto-ensure
  `location ${API_PREFIX}/` → 127.0.0.1:$PORT after the service restart (backup → insert →
  `nginx -t` → reload; restore + fail on test failure; awk-based).
- Safe flag: `PROXY_BUFFERING=off` adds `proxy_buffering off;` to the generated location —
  REQUIRED for tik (SSE); unset = omitted.
- First deploy attempt (2026-11-22, run 121958593007) failed at slave step 6 — recorded in
  `harness/core/gotchas.md`.
