# tik back — SPEC

The contract for the rewritten `back/`. Derived 1:1 from the node build (`back-node-js/`,
v1.0.31) — every wire shape, key format and quirk below is **preserved behavior**, not a new
design. Implementation must satisfy this spec; deviations are listed in §11.

## 1. What this service is

An always-on SSE tick server. It holds named **pools** of long-lived SSE connections, advances
"playing" event entries with a single global 1-second timer, broadcasts each pool's state every
tick, merges event states collected from outer project backends (doro…), and provides admin
moderation (kick/ban). Long-lived state is in-memory only; the filesystem holds auth-token
files (written by other services) and a small response log.

Stack: node ≥ 20, `node:http`, **zero runtime dependencies** (global `fetch`, `node:crypto`).
Source in `src/`, compiled to `build/`, runs as a systemd service (`npm start`).

## 2. Environment

| var | required | default | purpose |
|---|---|---|---|
| `PORT` | yes (deploy) | 3000 | listen port (local dev 3202; unique per VDS service) |
| `PROJECT_ID` | yes | — | this service's id in the ecosystem, `tik@back` |
| `KEY_BACK_URL` | yes | — | key@back broker that mints cross-service tokens |
| `BASE_KEY` | yes | — | long key issued by key@back `POST /register` for (`PROJECT_ID`, deployed url) |
| `OUTER_EVENTS_BACK_URL` | no | `http://localhost:3201` | outer events back (was hardcoded in node build) |
| `OUTER_EVENTS_PROJECT_ID` | no | `doro@back` | its project id (was hardcoded) |
| `PROJECT_NAME`, `NAMESPACE` | no | — | debug response props only |

## 3. SSE stream protocol

`GET /sse/:poolId` — auth required (§6).

**The URL `:poolId` param does NOT select the pool.** The pool key is the `userHandler` value
from the validated token file. The URL param participates only in the ban fingerprint (§7).
This is preserved node-build behavior.

Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`,
`Connection: keep-alive`, `Access-Control-Allow-Origin: *`.

Frames (all plain `data:` unless noted):

1. **init** (on connect):
   ```json
   {"type":"init","value":<poolTime>,"config":<pool.config>,"poolId":"<id>","id":"<connectionId>"}
   ```
   `poolTime = (globalTimerValue + pool.offset) % 3600`, where `offset` = the global timer
   value at pool creation. `config` is the pool's current config (`"default"` until first set).
2. **tick** (every 1s, one identical frame per pool per tick):
   ```json
   {"config":<config-after-increment>}
   ```
3. **admin-kick** (named event, then the stream is closed):
   ```
   event: admin-kick
   data: {"event":"admin-kick","banned":<bool>,"reason":"<str>","reconnectAllowed":<bool>,"banDurationMs":<num>?}
   ```

## 4. Pool config model

`config` is either the string `"default"` or `Record<entryKey, {cur, len, stt}>`.

- **entryKey** = `` `${projectPrefix}__${entityType}_${id}` ``, e.g. `doro__e_329`
  (`projectPrefix` = target `projectId` before `@`; `entityType` currently only `e`).
- **stt** (eventProgress): `0` STOPPED, `1` PLAYING, `2` PAUSED, `3` COMPLETED.
- **tick increment**: for every entry with truthy `len` and `stt === PLAYING`:
  `cur < len` → `cur++`; `cur >= len` → fire-and-forget finish flow (§8). Entries are mutated
  in place; the tick frame carries the updated object.
- **mutations** go through config items carrying `tikAction`; only two values are legal:
  - `upsert` — set `entryKey` to the item **without** its `id` and `tikAction` fields
    (counted as `added` or `updated` in stats);
  - `delete` — remove `entryKey` if present; stats carry the deleted snapshot;
  - `add` / `update` / missing → throw (`DO NOT USE "add"…`, `no tik action in event`).
- Mutation stats shape: `{added[], addedCount, updated[], updatedCount, deleted[], deletedItems[], deletedCount}`.
- `updateConfigItem` replaces `"default"` with `{}` on first mutation.

## 5. HTTP endpoints

| method & path | auth | body | response |
|---|---|---|---|
| `GET /sse/:poolId` | §6 | — | SSE stream (§3) |
| `POST /pool/:poolId/config` | **none** (§11) | `{config}` | `{success:true}` — replaces the whole pool config |
| `POST /collectEventsState` | §6 | `{projectId, backendUrl}` | `{data:{success, receiverResponse}, debug:{…}}` (§8) |
| `POST /updateEventsState` | §6 | `{projectId, data: EventStateResItem[]}` | `{data:{success, desc, stat}}` |
| `POST /admin/cleanup` | none | — | `{cleanedPools}` |
| `POST /admin/kick` | none | `{poolId, connectionId, ban, reason?, banHours?}` | `{success, banned, message}` |
| `GET /admin/bans` | none | — | `BanRecord[]` |
| `DELETE /admin/bans/:fingerprint` | none | — | `{success}` |
| `GET /health` | none | — | `{globalTimerValue, isRunning, totalPools, totalConnections, pools:[{poolId, config, offset, connectionCount, lastActivity, connections:[{id, ip, userAgent, connectedAt, durationSec}]}]}` |
| `POST /logs` | none | — | last 10 `ResponseLogEntry[]` |
| `POST /save-temp/save` | none | `{path, fileName, data}` | `{success, message, storagePath}` |
| `POST /save-temp/check` | none | `{hostOrigin, data:{accessToken}}` | `{validationResult}` — file data \| `true` \| `false` |
| `OPTIONS *` | — | — | `204` CORS preflight; every response carries `Access-Control-Allow-Origin: *` |

`EventStateResItem` = `{id, cur, len, stt, tikAction?}`.

## 6. Auth — validateUserAccessToken

**Gate toggle:** `AUTH_ENABLED=false` (temporary dev mode, owner 2026-11-19) skips this whole
section — no Bearer/`x-web-host-url` on `/sse/*` and the events-state routes; the SSE URL
`:poolId` IS the pool key, and `/collectEventsState` / `/updateEventsState` require
`poolId` in the body (`400` when missing). Default (`true`/unset) = full gate below.
**Must be re-enabled before any deploy.** The ban gate (§7) applies in both modes.

1. `Authorization: Bearer <accessToken>` required → else `401 {error:'Bearer token required'}`.
2. `x-web-host-url` header required → else
   `400 {error:'Missing parameters', requires:['authorization: Bearer <token>','x-web-host-url']}`.
3. Lookup order: memory cache (`t_<safePath>_<hash>`, hit only if cached `accessToken` matches)
   → file `storage/<sanitize(encodeURIComponent(hostOrigin))>/<md5_16(accessToken)>.json`
   whose `.accessToken` equals the presented token → else `403 {error:'Invalid token'}`.
   Successful file reads populate the cache.
4. The file's `userHandler` becomes the pool key and is propagated as `X-User-Handler` /
   `x-user-handler` to outer calls.

## 7. Bans & fingerprints

- Join fingerprint = sha256 of `[user-agent, accept-language, sec-ch-ua, socket.remoteAddress, urlPoolId]` joined by `|` (empty parts dropped in the node build only where noted; empty strings kept otherwise).
- `verifyConnection` rejects banned fingerprints pre-handshake with
  `403 {error:'banned', reason: '<reason> until <iso> | (permanent)'}`.
- Kick with `ban` stores `BanRecord {fingerprint, reason, bannedAt, expiresAt?}`
  (`banHours*3600000` → `expiresAt`). Expiry is checked lazily on lookup; no timer.
- `GET /admin/bans` / `DELETE /admin/bans/:fingerprint` manage the list.

## 8. Outer integrations

**key@back** (token exchange, `attachApiToken`): before any call to another project's back —
`POST {KEY_BACK_URL}/get-token` body `{targetProject, targetUrl}` with headers
`X-Project-Id: PROJECT_ID`, `X-Project-Domain-Name: <this origin>`, `X-Api-Key: BASE_KEY`
→ `{apiKey, expiresAt}`. Missing `KEY_BACK_URL`/`PROJECT_ID`/`BASE_KEY` throws.
This origin = request's `x-forwarded-proto` (or socket) + `host`, and **must equal the URL
registered in key@back** for `BASE_KEY` to validate.

**collectEventsState**: token for `body.projectId` → `POST {backendUrl}/service/get-event-state`
(5s timeout) with `X-Api-Key`, `X-Requester-Project: PROJECT_ID`, `X-Web-Host-URL`,
`X-Requester-Url: <origin>`, `Authorization: <passthrough>` → response `data.data` items are
merged into the pool via `updateConfigItem` (prefix = `projectId` before `@`) → success shape
`{data:{success:true, receiverResponse}, debug:{"doro@back": items, "<PROJECT_NAME>@<NAMESPACE>": {request, response}}}`.
Any failure → `{data:{success:false}, error: <message>}`.

**finish flow** (entry reached `len` while PLAYING, from the tick loop): upsert the entry
locally with `stt=COMPLETED` → `POST {OUTER_EVENTS_BACK_URL}/service/set-event-state`
`{eventId, state: 3}` with `X-Api-Key` (token for `OUTER_EVENTS_PROJECT_ID`), `X-Requester-Project`,
`X-Requester-Url`, `X-User-Handler: <poolId>`; a `result[]` array in the response is upserted
into the pool (prefix from `OUTER_EVENTS_PROJECT_ID`). On failure: upsert `err_0`
`{cur:0, len:3600, stt:PAUSED}` and log — the original entry stays PLAYING, so the next tick
retries (a pending-set guards against concurrent duplicate calls). Both the outer exchange and
the response are recorded in the response log.

## 9. Storage & logs

- `storage/<safePath>/<safeName>` — `safePath` = sanitize(`encodeURIComponent(hostOrigin)`);
  file name = `md5_16(accessToken) + '.json'`. `save-temp/save` writes arbitrary
  `{path, fileName}` (sanitized) with pretty JSON; `storagePath` in the response is relative
  to `storage/`. Sanitizer: strip `..`, replace `[^\w\-.%]` with `_`, collapse slashes.
- `logs/response-log.json` — max 10 entries, loaded at boot, rewritten per add.
- Nothing else persists: pools, bans, token cache are lost on restart and rebuilt naturally.

## 10. Lifecycle

- Global 1s timer runs while ≥1 pool exists; stops when none. `globalTimerValue` increments
  per tick regardless of pools (only while running).
- A pool dies when its last client disconnects; `cleanup` (auto every 5 min, manual via
  `/admin/cleanup`) closes pools with `lastActivity` older than 5 min.
- `SIGTERM` → stop timer, close connections, exit (systemd `Restart=always` + `RestartSec`
  protect the box; per-service `MemoryMax`/`CPUQuota` set in the unit).

## 11. Known quirks preserved on purpose

1. `POST /pool/:poolId/config` has **no auth** (node parity — flag if you want it gated).
2. The SSE URL pool param is ignored for pool selection (§3).
3. A pool created without `?config=` holds the literal string `"default"` and broadcasts it
   until the first `updateConfigItem`.
4. Client `web/` posts configs to pool id `current_user_id` — which 500s (`Pool not found`)
   unless a token's `userHandler` is literally that. Known client quirk, not fixed server-side.
5. `banHours` (not ms) is the kick API's duration unit (README examples say ms — code wins).

## 12. Verification (smoke, scratch port)

Auth fixture in `storage/` → SSE connect shows init + ticks → `POST /pool/<userHandler>/config`
with a `len:2, stt:PLAYING` entry shows `cur` advancing and the finish-flow fallback
(`err_0` on unreachable outer back) → `/admin/kick` closes the stream with the named event →
`/admin/bans` lists and deletes → `/save-temp/save` + `/check` round-trip → `/health`,
`/logs` sane.
