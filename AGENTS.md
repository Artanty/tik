# AGENTS.md — rules for agents working in this repo

rules:

Follow /Users/artyomantoshkin/server/know/entries/rules.md — the shared cross-project
rules (DECISIONS/harness workflow, knowledge layers, git & commit rules, naming). This
project's knowledge base lives in `harness/` (see `harness/INDEX.md`).

## feat features (2026-11-26)

tik's code knows only the slot call (`mountBackendFeatures` via the raw-http featHost
shim in src/app.ts). WHICH features run is decided by env rows — loader v4 vendored at
back/features/loader.js (the ONLY vendored feat file; modules are fetched from FEAT_URL
at boot). Current rows (back/.env.example): FEAT_URL + FEAT_GET_UPDATES_SLOT=route
(+ optional FEAT_GET_UPDATES_VERSION=v2 pin). Required envs are validated against the
feat host's /catalog.json before mounting (missing rows → feature skipped, boot clean).
Verified e2e locally: GET /get-updates served from feat :5477; v99 pin → skip+log.
