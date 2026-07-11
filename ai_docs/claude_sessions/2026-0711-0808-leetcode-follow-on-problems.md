# Session: LeetCode track follow-on problems (41 → 53)

- **Session ID**: `652c2a6c-d1c5-4bec-8858-ee46c8111a15`
- **Date**: 2026-07-11
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0711-0212-leetcode-track-expansion.md` (implements its
  "natural follow-ons" list)

## What this session did

Added the **12 follow-on problems** queued in the previous session doc, growing the
LeetCode track from 41 to 53 items and adding one new category (**Greedy**). Zero
engine changes. Full `node verify/verify.mjs` gate: **ALL PASS** (62 items total:
leetcode=53, go-basics=3, system-design=6). Marker-id dedupe: clean.

### New problems by category (★ = new category)

| Category | Added |
|---|---|
| Sliding Window | min-window-substring (Hard — the track's 2nd Hard) |
| Linked List | add-two-numbers |
| Heap / Priority Queue | kth-largest-element |
| Backtracking | permutations, combination-sum |
| Intervals | insert-interval |
| Greedy ★ | jump-game |
| Dynamic Programming | longest-increasing-subsequence, unique-paths, word-break |
| Bit Manipulation | number-of-1-bits, counting-bits |

Greedy was slotted between Intervals and Dynamic Programming in the manifest order.

### Files touched

- 12 new files under `tracks/leetcode/problems/`
- `tracks/leetcode/track.js` — 12 slugs added to `order` (categories kept contiguous);
  stale "the 15 problems" header comment made count-agnostic
- `index.html` — 12 new `<script>` tags after single-number.js

## How it was built (same recipe as the 26-problem expansion)

- Reconstructed the shared brief (`BRIEF.md`) and per-agent `check-problem.mjs` in the
  session scratchpad (the previous session's scratchpad was gone). check-problem.mjs
  stubs `GoLearn`, loads `track.js` + only the agent's problem files, and replays
  verify.mjs's per-problem checks against the natively built runner
  (`go build -o <scratchpad>/runner ./wasm`).
- `track.js` + `index.html` updated **before** fan-out → no shared-file merges.
- 4 background agents, category-grouped (3 problems each). **All 12 files passed the
  checker on each agent's first run** — the brief-driven recipe is now well-tuned.
- Marker-id prefixes were **prescribed per problem in the brief's table** (dgArrowATN,
  dgArrowKLE, dgArrowII, dgArrowPRM, dgArrowCSM, dgArrowJG, dgArrowLIS, dgArrowUP,
  dgArrowWB, dgArrowNOB, dgArrowCB, dgArrowMWS; `…ok`/`…c` derivatives allowed) —
  this preempted the cross-batch collision that bit the last session. Post-fan-out
  dedupe grep confirmed zero duplicates.

## Conventions worth reusing (new this session)

- **Permutations-style normalization is asymmetric**: sort copies of the OUTER list
  only — sorting inside each permutation would collapse all n! answers into one and
  let wrong solutions pass. Combination-sum (multisets) sorts inner AND outer,
  matching subsets.js.
- **Boolean-returning problems** (jump-game, word-break): starter returns a constant
  (`false`) and the case table guarantees ≥3 cases want `true`, so the starter can
  never vacuously pass.
- **Sentinel choice must survive negative test values**: kth-largest's starter returns
  `-1 << 31` because the case table includes negative wants (`[-1,-2,-3]`), where the
  usual `-1` sentinel could be a legitimate answer and vacuously pass.
- **Heap problem #2 flips the comparator**: kth-largest ships a natural min-heap
  (`Less` uses `<`) with comments contrasting last-stone-weight's reversed max-heap —
  the pair now demonstrates both orientations of `container/heap`.
- **min-window-substring duplicates guard**: a test case where t has repeated letters
  ("acbbaca"/"aba" → "baca") catches the classic `==` vs `>=` have/need counting bug.

## Verification performed

- Per-agent: all 12 files through check-problem.mjs (starter compiles + fails ≥1 test;
  solution passes all 5 with clean stderr) — ALL PASS, first run, all four agents.
- Post-fan-out: marker-id dedupe grep → no duplicates.
- Final: `node verify/verify.mjs` → **ALL PASS** (62 items). Solutions run 0.3–0.8 ms
  natively.
- Not exercised: browser click-through (generic engine paths proven; CI re-runs the
  same gate on deploy).

## Current state / next steps

- Committed and pushed this session (12 problems + this doc); GitHub Pages workflow
  rebuilds wasm and redeploys on push, re-running verify.mjs as its gate.
- Remaining follow-on ideas (never committed anywhere): merge-k-sorted-lists (Hard,
  heap), lowest-common-ancestor-bst / kth-smallest-in-bst (trees), clone-graph /
  pacific-atlantic (graphs), gas-station (greedy #2), partition-equal-subset-sum /
  longest-common-subsequence / edit-distance (DP depth), reverse-bits (bit),
  serialize-deserialize-binary-tree (Hard, trees), median-of-two-sorted-arrays
  (Hard, binary search).
