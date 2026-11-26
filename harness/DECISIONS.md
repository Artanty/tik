# DECISIONS — tik back rewrite

<!-- History lives in harness/DECISIONS_archive.md (rotated 2026-11-26). -->

## [2026-11-26] Restructure: DECISIONS.md → harness/DECISIONS.md; drop the Spec-first rule (2026-11-26)

User: "1. move this [the 'tik specifics' block incl. the Spec-first rule] to harness/core;
2. move DECISIONS.md to the harness folder; 3. spec.md in back folder not necessary now —
all needed info save as core and features in harness; 4. remove this rule [Spec-first]."

### Planned steps
1. Check where spec.md actually lives: `ls tik/`, `ls tik/back/` (expected: `SPEC.md` at repo root, none in back/).
2. `mv tik/DECISIONS.md tik/harness/DECISIONS.md`; append this session's plan.
3. `harness/core/deploy.md` — add the moved "Deploy context" rule.
4. `harness/core/hard-rules.md` — remove the Spec-first rule (contract info kept in `harness/core/architecture.md`).
5. `harness/INDEX.md` — live log is now `harness/DECISIONS.md`; create `harness/DECISIONS_archive.md` stub.
6. `tik/AGENTS.md` — drop the tik specifics (moved to harness core).
7. Fix stale `DECISIONS.md` refs inside the moved log; append Progress (done).
8. Verify: `ls harness/`, `wc -l` of the log (rotation at ~250), grep for stale root-DECISIONS refs.

### Progress (done)
1. Moved `tik/DECISIONS.md` → `tik/harness/DECISIONS.md` (plain `mv`, no commit).
2. `harness/core/deploy.md` — added the Deploy context rule (pipeline in `../know/entries/deploy-slave.md`; target = VDS branch; `HST_PORT` mandatory; `back-node-js/` read-only).
3. `harness/core/hard-rules.md` — Spec-first rule removed; "tik specifics:" → "tik rules:".
4. `harness/core/architecture.md` — unchanged; SPEC.md still referenced as the repo-root contract.
5. `harness/INDEX.md` — live session log at `harness/DECISIONS.md`.
6. `tik/AGENTS.md` — rewritten to just the shared-rules pointer.
7. `harness/DECISIONS_archive.md` — created stub.
8. Nothing committed.

## [2026-11-26] Remove root SPEC.md; clean SPEC refs in harness (2026-11-26)

User: "remove spec.md in root, safe in core and feature all that needed"

### Planned steps
1. Append this plan to `harness/DECISIONS.md`.
2. `rm SPEC.md` — repo root.
3. `harness/core/architecture.md` — drop the SPEC.md contract line (line 21).
4. `harness/features/auth-gate-toggle.md` — drop "Documented in SPEC §6."
5. `harness/features/safe-api-v2.md` — drop "SPEC.md →" from the verified line (15).
6. `back/README.md:3` — drop "Contract: ../SPEC.md".
7. Leave `harness/DECISIONS_archive.md` and the log itself as history.
8. Append Progress (done).

### Progress (done)
1. `rm /Users/artyomantoshkin/server/tik/SPEC.md` — root clean (`ls tik/*.md` → AGENTS.md, README.md).
2. `harness/core/architecture.md` — SPEC contract line (21) removed.
3. `harness/features/auth-gate-toggle.md` — "Documented in SPEC §6." removed.
4. `harness/features/safe-api-v2.md` — "SPEC.md →" dropped from the verified line.
5. `back/README.md:3` — "SSE tick/pool server. Decisions log: `../harness/DECISIONS.md`."
6. Nothing committed.

## [2026-11-26] Delete harness/core/hard-rules.md — its rules are duplicated elsewhere (2026-11-26)

User: "why do we have hard-rules file? it repeats AGENTS.md. also it repeats know rule 2:
- NEVER commit unless the user explicitly asks… — delete it."

### Findings (the "why")
- `harness/core/hard-rules.md` currently = "Shared rules: ../know/entries/rules.md" pointer +
  2 bullets: (1) the commit rules (NEVER commit unless asked; plain imperative subject;
  NEVER `-d` — triggers deploy pipeline, deploy decisions are the user's), duplicated by
  shared rule 2 of `/Users/artyomantoshkin/server/know/entries/rules.md` (which AGENTS.md
  already points to); (2) `back-node-js/` read-only, duplicated in `harness/core/deploy.md:16`.
- Only reference to the file: `harness/INDEX.md:17` (`- hard-rules.md — the rules that must not be broken.`).

### Planned steps
1. Append this plan to `harness/DECISIONS.md`.
2. `rm harness/core/hard-rules.md`; remove the `hard-rules.md` line from `harness/INDEX.md` core/ list.
3. Verify: `ls harness/core/`, grep `hard-rules` repo-wide.
### Progress (done)
1. `rm harness/core/hard-rules.md` — deleted (its rules: commit rules → shared rules.md, already in AGENTS.md via know rule 2; read-only rule → in `harness/core/deploy.md`).
2. `harness/INDEX.md` — `hard-rules.md` removed from the core/ list.
3. `harness/features/auth-gate-toggle.md` — dangling Related line removed.
4. Verified: no live references left (only historical mentions in the DECISIONS log/archive, which stay as history).
5. Nothing committed.

## [2026-11-26] Implement back feature slots (loader v3) + get-updates, smoke-test (2026-11-26)

User: "read about feature slots in ../know. implement feature slots structure in this
project. add get-updates feature here."

### Context read
- `know/entries/feature-slots.md` (back slots, loader v3, 2026-11-16/22) + `feat/back/spec/backend-slots.md`.
- Consumer pattern (express apps): `import { mountBackendFeatures } from './features/loader.js'; await mountBackendFeatures(app);` (safe, stat).
- Vendored features (spec: consumers carry NO copy; local pin optional): safe/back/features/{loader.js, loader.d.ts, req/}; stat/back/features/loader.js.
- Reference features: `feat/back/features/loader/v3/js-node/{loader.js, loader.d.ts}`, `feat/back/features/get-updates/v2/js-node/{get-updates.js, get-updates.d.ts, index.js}`; spec `feat/back/spec/get-updates.md`.
- Tik is CJS (no `"type": "module"`, esbuild `--format=cjs`, tsc NodeNext) → loader is ESM → dynamic import needed (test empirically).

### Planned steps
1. Append this plan to `harness/DECISIONS.md`.
2. Vendor `back/features/loader.js` + `loader.d.ts` (feat v3 verbatim).
3. Vendor `back/features/get-updates/get-updates.js` + `get-updates.d.ts` (feat v2; skip index.js — feat-router entry, not needed by the loader).
4. `back/src/app.ts`: featHost adapter (collects `app.get/post/...` from the loader), FeatRes adapter (loader handlers are Express-shaped; tik host is raw node:http), dynamic import of the loader + mount (fire-and-forget before `server.listen`), dispatch in `handle()` on `featRoutes` before the built-in routes.
5. `back/src/app.ts` — dispatch in `handle()` on `featRoutes` before the built-in routes.
6. `back/.env.example` — add the FEAT_ block (FEAT_GET_UPDATES_SLOT=route, _MOUNT=true, FEAT_URL comment), mirroring stat/safe .env.example.
7. `harness/features/feature-slots.md` (mirror safe's; note: tik = CJS host + FeatRes adapter + vendored get-updates pin); add to `harness/INDEX.md` features list.
8. Smoke test: `cd back && npm run build` + run the server (HST_PORT=3299) + `curl /health` + `curl /get-updates`; kill.
9. Append Progress (done); note the deviation (CJS/esm loader interop, node>=20.19/22.12 for require(esm), not enabled in `back/.env` — deploy decision).
10. Nothing committed.

### Progress (done)
1. Vendored `back/features/loader.js` + `loader.d.ts` (feat `feat/back/features/loader/v3/js-node/` verbatim).
2. Vendored `back/features/get-updates/get-updates.js` + `get-updates.d.ts` (feat `feat/back/features/get-updates/v2/js-node/`; index.js skipped — feat-router entry, not needed by the loader).
3. `back/src/app.ts` — `featHost` adapter (collects `app.get/post/put/patch/delete/all` into `featRoutes`), `FeatRes` adapter (Express-shaped `status/set/json` over raw `ServerResponse`), mount via `void import('../features/loader.js').then((mod) => mod.mountBackendFeatures(featHost, {vendoredDir: join(__dirname, 'features')}))`, dispatch in `handle()` on `featRoutes` before the built-in routes.
4. Fixes found while building/testing: import path `../features/loader.js` (app.ts lives in `src/`); `FeatRouteHandler` res typed `any`; `vendoredDir` passed explicitly (esbuild inlines the ESM loader into CJS `back/app.js`, so the loader's `import.meta.url` default breaks).
5. `back/features/package.json` — `{"type": "module"}` added (silences Node's typeless-package reparsing warning for the vendored files).
6. `back/.env.example` — FEAT_ block added (FEAT_GET_UPDATES_SLOT=route, _MOUNT=true comment, FEAT_URL comment).
7. Smoke: `npm run build` green; `HST_PORT=3299 FEAT_GET_UPDATES_SLOT=route node app.js` — log `backend-slots: mounted features: get-updates`; `GET /health` 200 (unchanged); `GET /get-updates` 200 — version 1.0.39, project_id tik@back, packages (tik-back deps+devDeps), features ["get-updates"], envs presence map (values never reported); no Node warnings.
8. `harness/features/feature-slots.md` written; `harness/INDEX.md` updated.
9. Deviations logged: tik host is CJS/raw-http → FeatRes adapter (loader is ESM, esbuild inlines it); enabling is config-only — not enabled in `back/.env` (add `FEAT_GET_UPDATES_SLOT=route` to safe row/back/.env when ready — deploy decision).
10. Nothing committed.

## [2026-11-26] Add the owner principle to know/entries/feature-slots.md (2026-11-26)

User: "add to feature-slot know file that consumers(projects) should not know about
what features are there in their code. they just give places for them."

### Planned steps
1. Append this plan to `harness/DECISIONS.md`.
2. `know/entries/feature-slots.md` — add the principle after the Concept section: consumers declare only mount points (`<FeatureSlot slot="…"/>` places, back: slot names); what fills them (feature id, version, baseUrl, element) is data — config rows, back: `FEAT_<ID>_SLOT` env rows.
3. Append Progress (done).
4. Nothing committed.

### Progress (done)
1. Added to `/Users/artyomantoshkin/server/know/entries/feature-slots.md` right after the Concept paragraph: "**Principle (owner): a project's code must not know what its slots contain.** Consumers declare only the mount points (`<FeatureSlot slot="…"/>` places, back: slot names/positions in host code); what fills them — the feat feature id, version, baseUrl, element — is data (config rows, and on the back, `FEAT_<ID>_SLOT` env rows)."
4. Nothing else changed.
5. Nothing committed.

## [2026-11-26] Remove get-updates from tik (keep the feature-slots structure) (2026-11-26)

User: "so remove from current project get-updates. do u understand now?" — yes: the
feature-slots STRUCTURE stays (loader + app.ts wiring), the get-updates FEATURE goes.

### Planned steps
1. Append this plan to `harness/DECISIONS.md`.
2. `rm -r back/features/get-updates/`.
3. `back/.env.example` — remove the FEAT_GET_UPDATES_SLOT block.
4. `harness/features/feature-slots.md` — drop get-updates mentions (title, backend bullets, featRoutes example, Env rows, slot registry residents).
5. `harness/INDEX.md` — feature-slots.md line updated.
6. `npm run build` in back/ → green.
7. Append Progress (done).
8. Nothing committed.

### Progress (done)
1. `rm -r /Users/artyomantoshkin/server/tik/back/features/get-updates/` — vendored feature gone.
2. `back/.env.example` — FEAT block removed (nothing was enabled in `back/.env` anyway).
3. `harness/features/feature-slots.md` — updated (loader kept; get-updates mentions dropped; residents = none yet; removal noted).
4. `harness/INDEX.md` — feature-slots line updated.
5. `npm run build` in back/ — green.
6. Nothing committed.
