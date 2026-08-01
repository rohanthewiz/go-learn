# Session: verify.mjs spawn-race hardening (timeout + one retry)

- **Session ID:** `8439cf9a-addb-4091-8bae-93a00d35a00d`
- **Date:** 2026-07-31, 23:58
- **Deliverable:** master `712ec9e` — `verify/verify.mjs` `run()`
  hardened against the execFileSync spawn race diagnosed in the
  2026-07-31 bytdb-bump session (bytdb repo doc
  `2026-0731-1418-golearn-v070-bump-yaegi-extract.md`).

## The race (recap)

~1-in-500 `execFileSync` spawns on macOS hand the child a stdin pipe
it never reads from: node blocks waiting for child exit, the child
parks in `read()` with 0.00s CPU, and a full verify run hangs forever.
Bit mostly on fast tracks (~1ms/item spawn cadence); the `database`
track always passed. Pre-existing, unrelated to any pin bump.

## The fix (`run()` only — the other runners don't spawn)

- `SPAWN_TIMEOUT_MS = 30_000` passed to `execFileSync`. Items finish
  in ~10–25ms, so a timeout IS the race, never a slow program.
- One retry loop: first timeout → respawn; second consecutive timeout
  → throw "runner timed out twice — not the spawn race, investigate".
- Ordering matters: the timeout check precedes the pre-existing
  exit-2 `e.stdout` parse, because a SIGTERM'd child can leave
  partial stdout that would otherwise be misread as an interpreter
  error result.
- Timeout detection covers both node shapes: `e.signal === 'SIGTERM'`
  (kill signal on the error) and `e.code === 'ETIMEDOUT'`.

## Verification

`node verify/verify.mjs database` — static checks across all 27
tracks + all 16 database items ALL PASS (10–25ms each). Full-run
reliability is the point of the fix; next full `node verify/verify.mjs`
should no longer need manual retries past hangs.
