# harness/ — the working knowledge of this project

Layers (load only what a task needs):

- `core/` — always-true facts (architecture, deploy, gotchas, hard rules).
  Read the relevant one when a task touches that area.
- `features/` — one file per feature: what it does, where the code lives,
  the decisions behind it. Read before changing that feature.
- `incidents/` — one file per field bug (none recorded yet for tik).
- `tasks/` — queued tasks not yet started (none yet).
- The live session log is `harness/DECISIONS.md` (read it first; per AGENTS.md).

## core/
- `architecture.md` — layout, stack, boot order, route map, neighbors.
- `deploy.md` — VDS target, HST_PORT uniqueness, nginx /tik route, PROXY_BUFFERING.
- `gotchas.md` — backend / data traps.

## features/
- `one-timer-design.md` — the global tick, pools, offsets (back/src/pool-manager.ts).
- `public-routing.md` — nginx /tik route, PROXY_BUFFERING, firewall notes.
- `safe-api-v2.md` — v2 naming, migration checklist (HST_*, PRJ_*).
- `auth-gate-toggle.md` — the temporary AUTH_ENABLED=false local toggle.

## Cross-project
Shared rules (DECISIONS workflow, git/commits, naming):
`/Users/artyomantoshkin/server/know/entries/rules.md`.

## DECISIONS.md
- Root `DECISIONS.md` — the LIVE session log (plan → result per session).
