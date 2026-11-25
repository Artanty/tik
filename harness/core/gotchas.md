# Gotchas — tik back

(from the current DECISIONS.md)

- Slave step: the generated "Export .env to GitHub env" step runs `require('dotenv')` —
  a hidden assumption (dotenv is a devDependency of totp/jump, but tik is zero-dep).
  Fixed (2026-11-22): `dotenv` added as a devDependency in back/package.json.
- serf-generated unit: `ExecStart=node app.js` — matches the esbuild bundle at `back/app.js`.
- `storage/` and `logs/` anchored to the app root instead of cwd (deterministic under systemd).
- `API_PREFIX` support in the router (unset = root locally, `/tik` from safe in prod);
  `/tik/health` + `/tik/sse/...` verified in `harness/core/deploy.md`.
- `AUTH_ENABLED` gate toggle (temporary, 2026-11-19 — `harness/features/auth-gate-toggle.md`).
