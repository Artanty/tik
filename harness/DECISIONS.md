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
