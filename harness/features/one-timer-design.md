# Feature: one-timer design (the global tick)

From the current DECISIONS.md [2026-11-19] — the project's core knowhow, per the owner.

**One global timer drives everything** — not a timer per connection, not a timer per pool.
`setInterval(1s)` exists while ≥1 pool exists; each tick advances `globalTimerValue` once,
then every pool advances on that shared clock (`poolTime = (gt + pool.offset) % 3600`).

Why load-bearing (1:1 in `back/src/pool-manager.ts` `startGlobalTimerIfNeeded`):

1. **O(1) timer cost** — one wakeup/sec for the whole process regardless of pool/connection
   count; per-connection timers make timer churn proportional to connects/disconnects.
2. **Pools can never drift apart** — `pool.offset` anchors each pool into the global
   timeline; a per-pool timer would accumulate independent jitter, so "tick N" comparisons
   across pools (or reconnects) are meaningless.
3. **Serialize once, write many** — the single tick pass builds each pool's frame string
   once and writes the identical string to every client.
4. **Consistent snapshots** — each tick is one synchronous pass over pools/configs; no
   mid-tick interleaving.

Trade-off accepted: one global cadence (1s); clients wanting different granularity diff
hashes client-side (see README), not via server timers.

Related: `harness/core/architecture.md`.
