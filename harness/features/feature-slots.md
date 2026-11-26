# Feature slots (feat) — back loader v3 (tik-adapted)

Shared rules: `/Users/artyomantoshkin/server/know/entries/rules.md` (feat-naming rule 3,
shared rule 0: env names UPPER_SNAKE_CASE only). Specs:
`/Users/artyomantoshkin/server/feat/back/spec/backend-slots.md`.

## Backend (vendored)

- `back/features/loader.js` (+ `loader.d.ts`) — feat `backend-slots` v3:
  `mountBackendFeatures(app)` / `createFeatLoader()`; scans env for `FEAT_<ID>_SLOT`
  rows (the toggle — absent/empty = dormant), resolves modules local-first
  (`back/features/<id>/<id>.js` — the vendored pins; nothing is written to the repo),
  else remote via `FEAT_URL` (manifest latest → `js-node/<id>.js`, imported via a
  `data:` URL). Features export `kind='route'` + `defaultMount` + `routes`
  (`'GET /'` keys, mount-relative), or legacy `attach(app, settings)`.
  Failures are logged and skipped — a broken feature never breaks host boot.
- Re-vendor from feat on feature updates; never edit the vendored files.
- `back/features/package.json` — `{"type": "module"}` (the vendored files are ESM;
  the setting silences Node's typeless-package reparsing warning).
- get-updates was the first vendored feature (removed 2026-11-26 — see DECISIONS.md).

## tik-specific wiring (differs from safe/stat — they are Express)

Tik's back is raw `node:http`, so the loader's `app.get(path, handler)` calls and the
feature handlers (Express-shaped `res.status/set/json`) need an adapter in `app.ts`:

- `featHost` — object with `get/post/put/patch/delete/all` methods collecting into
  `featRoutes: Map<'METHOD /path', handler>`.
- `FeatRes` — Express-shaped response over raw `ServerResponse`.
- Mount: `void import('../features/loader.js').then((mod) =>
  mod.mountBackendFeatures(featHost, { vendoredDir: join(__dirname, 'features') }))`
  — esbuild inlines the ESM loader into the CJS bundle `back/app.js`, so `vendoredDir`
  is passed explicitly (the loader's `import.meta.url` default doesn't survive the
  CJS bundle).
- Dispatch: in `handle()`, `featRoutes.get(`${req.method} ${routePath}`)` before the
  built-in routes.

## Env rows (back/.env.example — local dev reference; prod: serf/safe rows)

- `FEAT_URL=<feat host>` — resolution base for not-vendored features.

## Slot registry (spec)

- `route` (built-in) — HTTP endpoints. Residents: none yet for tik (v3: new features
  with `FEAT_<ID>_SLOT=route` + a local pin or remote via `FEAT_URL`).
- `backend-thru` — HTTP-layer pass-through (feat `thru`, py — future).
