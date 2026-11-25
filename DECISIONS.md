# DECISIONS — tik back rewrite

## [2026-11-19] The one-timer design (the project's core knowhow, per the owner)

**One global timer drives everything** — not a timer per connection, not a timer per pool.
`setInterval(1s)` exists while ≥1 pool exists; each tick advances `globalTimerValue` once,
then every pool advances on that shared clock (`poolTime = (gt + pool.offset) % 3600`).

Why this is the load-bearing decision (kept 1:1 in the rewrite, `pool-manager.ts:
startGlobalTimerIfNeeded`):

1. **O(1) timer cost** — one wakeup/sec for the whole process regardless of pool/connection
   count; per-connection timers would make timer churn proportional to connects/disconnects
   (the most frequent event in the system) and invite the classic leaked-timer-keeps-pool-
   alive bug. Start/stop lifecycle is a single trivial invariant (pools empty → stop).
2. **Pools can never drift apart** — all pools read the same monotonic counter; a per-pool
   timer would accumulate independent jitter, and "tick N" comparisons across pools (or
   reconnects) would be meaningless. `pool.offset` anchors each pool into the global
   timeline instead.
3. **Serialize once, write many** — the single tick pass builds each pool's frame string
   once and writes the identical string to every client; per-client timers would serialize
   per client per wakeup.
4. **Consistent snapshots** — each tick is one synchronous pass over pools/configs; no
   mid-tick interleaving between pools.

Trade-off accepted: one global cadence (1s) for everything; clients wanting different
granularity diff hashes client-side (README's original design), not via server timers.

## [2026-11-19] Rewrite back as standalone, spec-first

**Context.** The node/Express build moved to `back-node-js/` (v1.0.31, kept as reference;
it leaves the deploy pipeline automatically — githooklib/serf only know `back/` and `web/`).
Language decision after weighing resource economy on the VDS: stay **node + TypeScript** but
lean — `node:http`, no Express/axios/uuid (node 20 global `fetch`, `crypto.randomUUID()`).
Go was the theoretical optimum (~30–40 MB less idle RSS) but adds a new language + a new serf
VDS branch; python async has no resource win, sync Flask cannot hold SSE streams.

**Spec-first rule for this project (user, 2026-11-19).** Write the spec, get it reviewed,
only then implement.

**Plan.**
1. `SPEC.md` — full behavioral contract ported from `back-node-js` (wire shapes, config item
   actions, auth/token files, key@ + outer integrations, quirks). ← done, awaiting review
2. Scaffold: `package.json` (v1.0.32, continues the node chain), `tsconfig.json`, `.env.example`,
   `.gitignore`. (tsconfig/.env.example/.gitignore written; package.json pending spec approval)
3. `src/` (~9 files, zero runtime deps):
   `types.ts` (shapes, eventProgress) · `env.ts` (.env loader) · `lib.ts` (dd, sendJson,
   readJsonBody, origin, ip, backendOrigin) · `storage.ts` (sanitize, md5_16,
   checkFileWithData, save-temp handlers) · `response-log.ts` · `key-client.ts`
   (attachApiToken) · `auth.ts` (validateUserAccessToken) · `pool-manager.ts` (pools, timer,
   tick increment, kick/bans) · `outer-events.ts` (collect/update/finish flow) ·
   `app.ts` (bootstrap, router, CORS, admin/health/log routes, cleanup interval).
4. Build (`tsc`), smoke test per SPEC §12 on a scratch port with fixture token file.

**Intentional deviations from the node build** (all listed here, nothing else):
- hardcodes `http://localhost:3201` / `doro@back` → envs `OUTER_EVENTS_BACK_URL` /
  `OUTER_EVENTS_PROJECT_ID` (same defaults);
- axios → global `fetch` (response log records the same fields);
- this-origin detection honors `x-forwarded-proto` (proxy-correct; pure node otherwise);
- dead code dropped: write-only `clientIdentifiers` map, unused `getClientFingerprint`,
  unused `config-validator`, `MemoryStorageService` class → plain Map;
- `storage/` and `logs/` anchored to the app root instead of cwd (deterministic under systemd).

**Auth gate toggle (owner, 2026-11-19 — temporary).** `AUTH_ENABLED=false` skips Bearer +
`x-web-host-url` for local first runs: SSE pool key = URL `:poolId`; `/collectEventsState`
and `/updateEventsState` take `poolId` in body (400 without it). Auth code paths untouched —
flip back by removing/setting `AUTH_ENABLED=true`. **Re-enable before any deploy.** Documented
in SPEC §6.

**Deploy readiness audit (2026-11-22).** serf: VDS slim case exists and fits (VDS+back+node
gate, TECH_STACK=node from package.json) BUT its generated unit hardcodes
`ExecStart=node app.js` while tik outputs `build/app.js` → crash-loop unless serf picks the
entry dynamically or tik bundles to root app.js. safe (DB read-only): project row 29 ok
(port 3202 unique, slave repo slot4 linked, hosting 39 VDS linked to slaveRepo ✓), but
MISSING hosting_data SERVICE_DOMAIN=VDS row on hosting 39 (hostToDomain(IP) returns the raw
IP → no serf gate matches → silent no-workflow deploy, same signature as the documented
incident); project_data carries copied junk (API_PREFIX=/totp, totp's JWT_SECRET) and
AUTH_ENABLED=false with EMPTY stage (= ships gate-off!); KEY_BACK_URL/BASE_KEY/OUTER_EVENTS_*
absent. flow: tik NOT in pushMasterIgnoredRepos ✓; GitHub App install unverifiable locally.
Pipeline gap: githooklib NOT installed in tik (no core.hooksPath/build/, zero tags) — root
build/ + githooklib required before any -d commit can tag. Repo: 11 commits unpushed, 47
paths uncommitted.

**First deploy attempt (2026-11-22, run 121958593007) — failed at slave step 6.** serf +
master side worked (tag pushed, safe resolved, workflow generated, slave run started,
npm ci ok). Slave "Export .env to GitHub env" crashed: `Cannot find module 'dotenv'` — the
generated step does `require('dotenv')`, a hidden assumption that holds for totp/jump
(dotenv is their runtime dep) but not for tik (own zero-dep loader). Fix: `dotenv` added as
devDependency (never imported by app code; `--omit=dev` keeps it off the box; verified
resolvable + build still green). Gotcha recorded in ../know/entries/deploy-slave.md.
Re-deploy = any new commit + `-d` (version auto-bumps to 1.0.35+).

**Resolutions (owner + agent, same day).** Owner fixed safe: SERVICE_DOMAIN=VDS hosting_data
row added; API_PREFIX → `/tik`; BASE_KEY added; agreed AUTH_ENABLED=false stays for the
FIRST deploy (gate-off, flip later); OUTER_EVENTS_* deferred until base funcs verified.
KEY_BACK_URL needs no row — flow passes it as serf input → slave .env (added to
../know/entries/deploy-slave.md). Agent adapted the code to serf's slim shape: build =
`tsc --noEmit && esbuild → single root app.js` (jump's exact shape, the unit's
`ExecStart=node app.js` now matches; start/main = app.js; app.js gitignored, old build/
dir gone); storage/logs anchored to `__dirname` directly (app.js sits at the app root in a
bundle); `API_PREFIX` support in the router (unset = root locally, `/tik` from safe in
prod; `/tik/health` + `/tik/sse/...` verified, unprefixed → 404); githooklib ^2.4.1
installed in root `build/` (core.hooksPath wired — first owner commit exercises the
bump+TAG_VERSION chain). Remaining before `-d`: commit all, push (incl. the 11 older
commits), confirm flow App installed on Artanty/tik; after deploy verify /tik/health on
http://188.225.26.46:3202.

## [2026-11-19] Deploy prep — safe rows for tik@back → VDS (ns back, stage DEPLOY)

`SSH_HOST=188.225.26.46`, `SSH_USER=root`, `USER_PASS=<root pass>` (VDS branch = password
auth, no SSH_PRIVATE_KEY), `REVERSED_PROXY_SLOT=tik` (new slot — `back` already exists on
the box), **unique `PORT`** (verify free with `ss -ltnp` on the VDS first), `KEY_BACK_URL`
(deployed key@), `OUTER_EVENTS_BACK_URL` (deployed doro@back) ± `OUTER_EVENTS_PROJECT_ID`,
`AUTH_ENABLED=true` (explicit). `BASE_KEY` filled LAST: register at key@
`{project:"tik@back", url:<final public origin>}` → paste returned baseKey → deploy;
re-register ⇒ update safe + redeploy together ("base key rotten" otherwise). Hosting record
`SERVICE_DOMAIN=VDS` whitespace-free; slave repo linked (GIT_* auto); flow App installed on
the repo. Drop from totp's set: TOTP_*, JWT_SECRET, API_PREFIX, SSH_PRIVATE_KEY; serf
auto-writes PROJECT_ID/NAMESPACE/STAT_URL/SLAVE_REPO — never manual rows.

**Progress.** SPEC approved by owner 2026-11-19 (+ AGENTS.md added per know rules, see
above). Implemented: `package.json` (v1.0.32), 10 src files, zero runtime deps — `tsc`
builds clean. Smoke test per SPEC §12 passed on :3299 with a fake key@ (token exchange ok,
outer back dead): init frame with `config:"default"` and poolId from the token (URL pool
param ignored ✓), 1s ticks ✓, `cur` 0→1→2 ✓, completion upsert `stt:3` ✓, `err_0` PAUSED
fallback on unreachable outer back ✓, kick+ban → `admin-kick` named event + stream closed ✓,
bans list/unban (+`banHours`→`expiresAt`) ✓, save-temp save (`sub/dir`→`sub_dir` sanitizer)
+ check true/false ✓, `/logs` ERROR entries ✓, auth 401/403 ✓. Test artifacts cleaned.

**Deploy LIVE + public routing (2026-11-23).** Second deploy (dotenv fix) succeeded: unit
`tik` active+enabled on the VDS, /root/tik with bundled app.js, listening :3202 (journal:
"Server running on port 3202"). Public access model confirmed: non-standard ports
(:3001, :3202) are firewall-filtered; port 80 = nginx with prefix routes (/totp → 3001
live; /tik/health on :80 → Express-style 404 from the default backend). So PORT stays in
safe (internal listener), public URL = http://188.225.26.46/tik/…, pending an nginx
location for /tik → 127.0.0.1:3202. Follow-up once proxied: BASE_KEY must be registered
for the origin the app reports behind nginx (Host header, likely http://188.225.26.46
without port) — re-register + update safe, or key@ /get-token 403s on URL mismatch
(only matters when collectEventsState / finish-flow get enabled).

**Public route LIVE (2026-11-23).** nginx `location /tik/` → 127.0.0.1:3202 added to
/etc/nginx/sites-enabled/default (mirrors the /totp/ block + `proxy_buffering off` for SSE;
inserted before the /totp/ anchor via python, idempotent guard, backup
`default.bak-20261123-182759`, nginx -t ok, reloaded — pre-existing pomi-doro.ru
duplicate-server-name warnings untouched). Verified publicly: /tik/health returns the
pool JSON; /tik/sse/prodcheck streams init + 1s ticks in realtime (buffering off works);
:3202 stays firewall-filtered. Public URL = http://188.225.26.46/tik/… (no port). Totp
research: NO pipeline automation for back nginx routes exists (totp's was one-time manual
per its DECISIONS.md; only its static web slot automates the pattern) — possible future
serf improvement: idempotent location-ensure in the VDS ssh scripts. Pending when outer
flows enable: re-register BASE_KEY for origin `http://188.225.26.46` (nginx Host has no
port) + update safe.

**serf: nginx route auto-ensure + PROXY_BUFFERING flag (2026-11-23).** Both VDS variants of
serf's generated workflow now idempotently ensure `location ${API_PREFIX}/` →
127.0.0.1:$PORT after the service restart (backup → insert → nginx -t → reload; restore +
fail on test failure; awk-based — a python heredoc breaks the YAML block scalar, hit in
dev). New safe flag: `PROXY_BUFFERING=off` adds `proxy_buffering off;` to the generated
location — REQUIRED for tik (SSE), unset = omitted (totp/jump unchanged). Fixture-tested
all four paths; deploy.yml YAML-validated; logged in serf/DECISIONS.md; NOT committed.
Action needed: add `PROXY_BUFFERING=off` (stage DEPLOY) to safe for tik; tik's existing
/tik/ route makes its next deploy a logged no-op.

**Ecosystem: safe api v2 (2026-11-23).** safe got per-project api_version (v1 default) +
snapshots + open /api/get-safe-api-version; flow routes v2 projects to serf's new
deploy_v2.yml; safe@web enforces PRJ_/HST_ naming (red keys, blocked saves) once the api
select is v2. For tik when migrating: PRJ_-rename its project_data rows (BASE_KEY→PRJ_BASE_KEY
etc.; SSH_*/REVERSED_PROXY_SLOT/API_PREFIX stay), hosting flag becomes
HST_NGINX_PROXY_BUFFERING (v2 workflow reads that name), snapshot before → flip → deploy
(-d, auto-routed) → verify → snapshot → compare. Full recipe: ../know/entries/safe-api-v2.md.

## [2026-11-25] Plan: migrate tik@back env keys to safe api v2 naming

Plan (per ../know/entries/safe-api-v2.md + safe/back/controllers/structuredController.ts,
which prefixes every derived key: projects PRJ_, hostings HST_, sources SRC_, avatars AVA_):

| old name | new name (v2) | files |
|---|---|---|
| PORT | HST_PORT | app.ts:11, back/.env, back/.env.example |
| API_PREFIX | HST_API_PREFIX | app.ts:29, back/.env.example |
| AUTH_ENABLED | PRJ_AUTH_ENABLED | app.ts:143, back/.env, back/.env.example |
| BASE_KEY | PRJ_BASE_KEY | key-client.ts:22, back/.env, back/.env.example |
| OUTER_EVENTS_BACK_URL | PRJ_OUTER_EVENTS_BACK_URL | outer-events.ts:18, back/.env, back/.env.example |
| OUTER_EVENTS_PROJECT_ID | PRJ_OUTER_EVENTS_PROJECT_ID | outer-events.ts:19, back/.env, back/.env.example |
| PROJECT_NAME | PRJ_PROJECT_NAME | outer-events.ts:63, back/.env.example |
| (kept — serf writes them unprefixed, serf/.github/workflows/deploy_v2.yml:297,299,954) KEY_BACK_URL, PROJECT_ID, NAMESPACE | | |

Then npm run build in back/ (rebuild app.js) and grep-verify no old names left in
back/src, app.js, .env, .env.example, SPEC.md.

**Result (2026-11-25, applied):** rename table executed. `app.ts` (PORT→HST_PORT,
API_PREFIX→HST_API_PREFIX, AUTH_ENABLED→PRJ_AUTH_ENABLED), `key-client.ts` (BASE_KEY→PRJ_BASE_KEY
plus the missing-env message), `outer-events.ts` (OUTER_EVENTS_BACK_URL→PRJ_OUTER_EVENTS_BACK_URL,
OUTER_EVENTS_PROJECT_ID→PRJ_OUTER_EVENTS_PROJECT_ID, PROJECT_NAME→PRJ_PROJECT_NAME).
`back/.env` + `back/.env.example` renamed in place (values untouched). SPEC.md §2/§6 updated
to the new names. Rebuilt `back/app.js` via `npm run build` in back/ (esbuild). Verified:
`grep -rhoE "process\.env\.[A-Za-z_]+" back/src app.js` → only HST_API_PREFIX, HST_PORT,
KEY_BACK_URL, NAMESPACE, PRJ_AUTH_ENABLED, PRJ_BASE_KEY, PRJ_OUTER_EVENTS_BACK_URL,
PRJ_OUTER_EVENTS_PROJECT_ID, PRJ_PROJECT_NAME, PROJECT_ID; old-name scan over
back/src, app.js, .env, .env.example, SPEC.md → 0 matches.
