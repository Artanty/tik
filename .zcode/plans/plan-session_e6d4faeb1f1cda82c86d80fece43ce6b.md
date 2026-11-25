API-surface move: ALL deploy-placement envs → HST_ (jump keys included per your latest call)

**1. serf deploy_v2.yml** — word-boundary perl renames to `HST_`:
SSH_HOST, SSH_USER, USER_PASS, REVERSED_PROXY_SLOT, API_PREFIX, HOSTING_SLOT_PATH, SERVER_SSH_PRIVATE_KEY, FTP_SERVER, FTP_USERNAME, FTP_PASSWORD, **PORT** (guard read + fallback writer + nginx-ensure env read), **SSH_JUMP_HOST, JUMP_SSH_PRIVATE_KEY** (now hosting too — no PRJ_ exceptions remain).
v1 deploy.yml untouched.

**2. safe structuredController** — PORT emission `emit('PRJ_', 'PORT', …)` → `emit('HST_', 'PORT', …)` → v2 responses carry `HST_PORT`. Storage stays `projects.port` (Port field); VDS port-uniqueness guard and /safe/backends/ports unaffected; a `HST_PORT` hosting_data row can override the derived value later if needed.

**3. Verify** — both serf YAMLs parse; inventory grep: zero `PRJ_` keys remain in deploy_v2 except none (all moved), jump keys present as HST_, v1 deploy.yml clean of the new names; safe `tsc --noEmit`; scratch instance with tik flipped v2 emits `HST_PORT` (then reverted to v1).

**4. Docs** — know safe-api-v2 (rule: every deploy-placement env is hosting-side `HST_`, including PORT and the jump-relay pair; project_data `PRJ_` is purely the app's own config) + serf DECISIONS.

Your side afterwards: move/rename the rows into hosting_data with the HST_ names (strict v2 validation enforces them on the hosting tab).