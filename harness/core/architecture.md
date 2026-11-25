# Architecture — tik back

(from the current DECISIONS.md, 2026-11-19)

- `back/` — Node + TypeScript, zero runtime deps. Build (`npm run build` in back/):
  `tsc --noEmit && esbuild src/app.ts --bundle --platform=node --format=cjs --outfile=app.js`;
  output is `back/app.js` (gitignored — serf's generated unit matches: `ExecStart=node app.js`).
  - `src/app.ts` — bootstrap, router, health route, SSE tick stream (`/sse/...`).
  - `src/types.ts` — shapes (eventProgress etc.).
  - `src/env.ts` — .env loader.
  - `src/lib.ts` — dd, sendJson, readJsonBody, origin, ip, backendOrigin.
  - `src/storage.ts` — sanitize, md5_16, checkFileWithData, save-temp handlers.
  - `src/response-log.ts` — /logs ERROR entries.
  - `src/key-client.ts` — attachApiToken.
  - `src/auth.ts` — validateUserAccessToken.
  - `src/pool-manager.ts` — pools, the global timer, tick increment, kick/bans.
  - `src/outer-events.ts` — collect/update/finish flow to the outer back.
- `web/` — Angular dashboard (see `harness/core/frontend.md` in projects that have one).
- `build/` — githooklib (version bump + `-d` deploy tags; see `harness/core/deploy.md`).
- `back-node-js/` — the OLD node build kept as reference — read-only.

Related: `harness/core/deploy.md`, `harness/features/one-timer-design.md`.
