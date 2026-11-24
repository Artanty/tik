Add the public `/tik` route on the VDS nginx, following totp's documented manual pattern + tik's SSE needs.

**Steps**

1. **Inspect** (SSH, read-only): read `/etc/nginx/sites-enabled/default`, find the existing `location /totp/` block — mirror its proxy headers/settings for consistency (this file is outside `/root`, doing it only because you've now directed me at this task).

2. **Edit** (one SSH session):
   - `cp` backup: `default.bak.<timestamp>` (totp's convention; there's also a `/etc/nginx/backups/` dir from totp-web — use the same style)
   - Insert idempotently (skip if a `location /tik/` already exists, `grep -qF` guard like totp-web's workflow):
     ```
     location /tik/ {
         proxy_pass http://127.0.0.1:3202;
         proxy_buffering off;          # SSE: frames must not be batched
         proxy_http_version 1.1;       # keep-alive for long-lived streams
         proxy_set_header Host $host;  # same headers as /totp/ block
         proxy_set_header X-Forwarded-Proto $scheme;
     }
     ```
     (final header set = whatever the /totp block uses, for consistency)
   - `nginx -t` → only then `systemctl reload nginx`; on test failure restore the backup.

3. **Verify publicly**: `curl http://188.225.26.46/tik/health` → tik's JSON; `curl -N .../tik/sse/<pool>` → init frame + 1s ticks arriving in real time (proves buffering is off). Port `:3202` stays firewalled — internal listener only, nothing else on the box changes.

4. **Record** in DECISIONS.md (what was added, where the backup is) — and note the known follow-up: when `collectEventsState`/finish-flow get enabled later, re-register `BASE_KEY` at key@ for the port-less origin `http://188.225.26.46` (nginx forwards `Host` without `:3202`, so the app's self-reported origin changes).

**Not in scope now** (offered as follow-ups): automating the location-ensure inside serf's VDS ssh scripts (totp-web's idempotent pattern) so future services skip the manual step; any changes to tik code or safe.