# Feature: auth gate toggle (AUTH_ENABLED — temporary)

From the current DECISIONS.md [2026-11-19] — owner decision, temporary.

`AUTH_ENABLED=false` skips Bearer + `x-web-host-url` for local first runs: SSE pool key =
URL `:poolId`; `/collectEventsState` and `/updateEventsState` take `poolId` in body
(400 without it). **Re-enable before any deploy** (`AUTH_ENABLED=true`). Auth code paths
untouched.
