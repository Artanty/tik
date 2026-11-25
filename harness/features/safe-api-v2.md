# Feature: safe api v2 migration

From the current DECISIONS.md [2026-11-23] + plan [2026-11-25] (result applied 2026-11-25).

- safe has per-project `api_version` (v1 default) + snapshots + open `/api/get-safe-api-version`;
  flow routes v2 projects to serf's new `deploy_v2.yml`; safe@web enforces PRJ_/HST_ naming on v2 rows.
- tik's env keys renamed to v2 naming (applied 2026-11-25):
  PORT→HST_PORT, API_PREFIX→HST_API_PREFIX, AUTH_ENABLED→PRJ_AUTH_ENABLED,
  BASE_KEY→PRJ_BASE_KEY, OUTER_EVENTS_BACK_URL→PRJ_OUTER_EVENTS_BACK_URL,
  OUTER_EVENTS_PROJECT_ID→PRJ_OUTER_EVENTS_PROJECT_ID, PROJECT_NAME→PRJ_PROJECT_NAME.
  KEY_BACK_URL, PROJECT_ID, NAMESPACE stay (serf writes them unprefixed).
- Verified: `grep -rhoE "process\.env\.[A-Za-z_]+" back/src app.js` → only HST_API_PREFIX,
  HST_PORT, KEY_BACK_URL, NAMESPACE, PRJ_AUTH_ENABLED, PRJ_BASE_KEY, PRJ_OUTER_EVENTS_BACK_URL,
  PRJ_OUTER_EVENTS_PROJECT_ID, PRJ_PROJECT_NAME, PROJECT_ID; old-name scan over
  back/src, app.js, .env, .env.example → 0 matches.
- Recipe: `/Users/artyomantoshkin/server/know/entries/safe-api-v2.md`.

Related: `harness/features/public-routing.md`.
