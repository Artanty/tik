# AGENTS.md — rules for agents working in this repo

Distilled from `../know/entries/rules.md` (the sibling-project conventions).

1. **DECISIONS.md workflow** — read `DECISIONS.md` (repo root, next to this file) first and
   keep it in mind; write the plan there **before** any code action and the result
   **after**. Record architectural decisions, gotchas, environment quirks. At ~250 lines
   rotate everything except the current thread into `DECISIONS-archive.md` (never delete
   history).

2. **Spec-first (`back/`)** — `SPEC.md` (repo root) is the contract. Implement to spec. If
   behavior changes intentionally, update SPEC in the same change and log the deviation in
   DECISIONS.md. No new `src/` files or manifests outside the spec's layout without a
   DECISIONS.md note.

3. **Git** — never commit unless explicitly asked. Plain imperative subjects. NEVER put `-d`
   anywhere in a commit message: `-d` triggers the deploy pipeline (githooklib tag → flow →
   serf → slave repo → hosting), and deploy decisions are the user's.

4. **Deploy context** — the pipeline is documented in `../know/entries/deploy-slave.md`;
   this service's target is the VDS branch (unique `PORT` in safe is mandatory). Old node
   build kept as reference at `back-node-js/` — read-only, do not "fix" it.
