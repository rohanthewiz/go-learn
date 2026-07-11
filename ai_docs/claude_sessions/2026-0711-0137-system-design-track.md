# Session: System Design track

- **Session ID**: `a247731d-a984-4e2b-92b0-826421e40c58`
- **Date**: 2026-07-11
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Commit produced**: `1dc5349` — *Add System Design track: infrastructure primitives as runnable Go*

## What this session did

Added a third pluggable track, **System Design in Go** (`tracks/system-design/`), to the
go-learn tutorial platform — with **zero engine changes**, which is the platform's core
invariant (see the header comment in `engine/engine.js`).

### Files created

| File | Purpose |
|---|---|
| `tracks/system-design/track.js` | Manifest (6 items), shared `HARNESS_RT` sentinel runtime, hand-rolled FNV hash helpers, `GoLearnSD.problem()` registration helper, and the back-of-envelope lesson |
| `tracks/system-design/problems/lru-cache.js` | LRU Cache — Caching (Medium), exact tests, `container/list` solution |
| `tracks/system-design/problems/token-bucket.js` | Token Bucket — Rate Limiting (Easy), exact tests, injected-clock design |
| `tracks/system-design/problems/consistent-hashing.js` | Consistent Hashing — Partitioning (Hard), property tests |
| `tracks/system-design/problems/bloom-filter.js` | Bloom Filter — Probabilistic Structures (Medium), property tests |
| `tracks/system-design/problems/smooth-wrr.js` | Smooth Weighted Round-Robin — Load Balancing (Medium), exact tests |

Plus 6 `<script>` tags appended in `index.html` (after go-basics).

## Track content

1. **back-of-envelope** (lesson, Foundations) — compute avg/peak QPS from DAU constants;
   check expects `avg qps: 5787` and `peak qps: 11574`.
2. **lru-cache** — map + `container/list` recency order; 4 op-script test cases
   (classic evict, cap=1, update-refreshes, get-refreshes).
3. **token-bucket** — `Allow(nowMs int64)` takes the clock as a parameter (testable time =
   injectable time, itself the lesson). Lazy refill clamped at capacity. Timelines avoid
   exact refill boundaries so float rounding can't flip a verdict.
4. **consistent-hashing** — ring with 50 vnodes/node, `fnv1a(node + "#" + i)` placement,
   `sort.Search` lookup with wraparound. Property harness: valid owner, determinism,
   balance ≥10% of 300 keys, remove-moves-only-its-keys, add-only-steals.
5. **bloom-filter** — `[]uint64` bits, Kirsch–Mitzenmacher double hashing
   `(fnv1a + i*(fnv1|1)) % m`. Properties: no false negatives, FP ≤5% of 400 probes
   (m=4096, k=5, n=200), empty-filter-rejects-all, filter independence.
6. **smooth-wrr** — nginx smooth WRR (`current += weight`, pick max, `-= total`).
   Exact sequences: `5,1,1 → a a b a c a a`; equal weights → plain RR; `3,1 → a a b a`.

## Key architecture facts (learned this session)

- **Plugin model**: tracks self-register via `GoLearn.registerTrack/registerItem` from plain
  script tags; kinds (`lesson`, `problem`) own output rendering (`engine/kinds.js`).
  New tracks must never touch `engine/engine.js`.
- **Program assembly**: `engine/assemble.js#mergeProgram` merges user file + harness file;
  user imports are parsed and deduped with harness imports, so solutions may freely
  `import "container/list"`, `"sort"`, etc. Results travel via `__GOLEARN_RESULTS__` /
  `__GOLEARN_END__` sentinel JSON; parser splits on the LAST marker (spoof-proof).
- **Interpreter**: yaegi in a web-worker wasm (`wasm/runner/runner.go`). Trimmed stdlib
  symbols only: fmt, encoding/json, sort, strings, strconv, math, math/bits, math/rand,
  time, bytes, errors, reflect, unicode, unicode/utf8, container/heap, container/list.
  **No `hash/fnv`** — hence hand-rolled FNV-1a / FNV-1 helpers spliced into starters
  (`GoLearnSD.FNV_HELPERS`, `FNV1_HELPER`).
- **Verification**: `node verify/verify.mjs` (CI gate) loads track files via index.html's
  script-tag list, requires per problem: harness/solution/explanation/difficulty/category/
  complexity present, starter compiles-but-fails, solution passes with clean stderr.
  Lessons: starter must not pre-pass `check()`; solution must pass.
- **Harness runtime duplication is intentional**: `HARNESS_RT` is copied per track
  (leetcode ↔ system-design) so tracks stay independently loadable.

## Verification performed

- Property-test thresholds validated empirically with native Go before authoring
  (scratchpad program): worst ring-balance node = 76/300 keys (25%; floor set at 10%),
  0 improper key moves on node removal, bloom 0/400 false positives (ceiling 5%),
  WRR sequences match reference traces exactly.
- `node verify/verify.mjs` → **ALL PASS** (24 items: leetcode=15, go-basics=3,
  system-design=6).
- Served locally (`go run ./serve -addr :8123`); all 6 new files return HTTP 200 and the
  page references `system-design` 6 times. Browser click-through not done (Chrome
  extension unavailable) — Node harness covers the same interpreter + merge paths.

### Live-site verification (post-deploy)

Pushed to `origin/master`; the `site` workflow (`.github/workflows/pages.yml`, run
`29143149529`) re-ran verify.mjs and deployed to GitHub Pages at
<https://rohanthewiz.github.io/go-learn/>. Then verified the **deployed artifacts**
directly: downloaded the live `go-learn.wasm`, `engine/assemble.js`, and all six
system-design track files from Pages and drove them from Node (the deployed wasm sets a
generic `goRun.run(src)` on `globalThis`, so `wasm_exec.js` works under Node — same
binary and merge code the browser runs, minus the DOM).

- Deployed wasm reports **build `3b84e28`** — built from the pushed commit.
- All 12 checks pass on the live artifacts: lesson starter doesn't pre-pass / solution
  passes; every problem's starter fails ≥1 test and solution passes all
  (4–5 tests each; 5 ms WRR up to 233 ms for the consistent-hashing property suite,
  well inside the 5 s wasm run timeout).
- Not exercised: the browser UI itself (track dropdown, nav, editor) — generic engine
  code already proven by the other two tracks. Test harness kept at
  `<scratchpad>/live-test/main.cjs` (session-scoped; recreate by downloading the live
  files and replaying the verify.mjs flow against `goRun.run`).

## Current state / possible next steps

- Pushed through `3b84e28` and **deployed to GitHub Pages** (workflow green, live wasm
  reports the same build); no local wasm rebuild was needed (no Go changes — CI builds
  wasm on deploy).
- Ideas discussed or natural follow-ons (not committed anywhere): more items
  (write-ahead log, sharded counter, LSM memtable, leaky bucket comparison), a `quiz`
  kind as a new plugin kind, weighted vnodes exercise extension.
- Threshold note: if the ring balance test ever flakes for a learner's alternative
  correct implementation, the floor lives in `consistent-hashing.js` harness
  (`counts[n] < 30`).
