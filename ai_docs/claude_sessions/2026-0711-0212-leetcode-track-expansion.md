# Session: LeetCode track expansion (15 → 41 problems)

- **Session ID**: `9654b684-0fa7-4207-929a-cc14253593f5`
- **Date**: 2026-07-11
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0711-0137-system-design-track.md`

## What this session did

Added **26 new problems** to the LeetCode-in-Go track (`tracks/leetcode/`), growing it
from 15 to 41 items and adding five new categories. Zero engine changes, per the
platform invariant. Full `node verify/verify.mjs` gate: **ALL PASS** (50 items total:
leetcode=41, go-basics=3, system-design=6).

### New problems by category (★ = new category)

| Category | Added |
|---|---|
| Arrays & Hashing | contains-duplicate, top-k-frequent-elements, product-of-array-except-self, longest-consecutive-sequence |
| Stack | min-stack, evaluate-reverse-polish-notation, daily-temperatures |
| Two Pointers | valid-palindrome, container-with-most-water, trapping-rain-water (the track's first **Hard**) |
| Sliding Window | longest-repeating-character-replacement |
| Binary Search | search-in-rotated-sorted-array, koko-eating-bananas |
| Linked List | remove-nth-node-from-end |
| Trees | same-tree, balanced-binary-tree, binary-tree-level-order-traversal, validate-binary-search-tree |
| Heap / Priority Queue ★ | last-stone-weight (introduces `container/heap`) |
| Backtracking ★ | subsets |
| Graphs ★ | number-of-islands, course-schedule |
| Intervals ★ | merge-intervals |
| Dynamic Programming | house-robber, coin-change |
| Bit Manipulation ★ | single-number |

Each problem file follows the two-sum template in full: prose + inline SVG intuition
diagram (theme CSS vars only), compiling-but-failing starter, sentinel-emitting harness,
senior-commented idiomatic solution, brute-force→insight explanation, complexity.

### Files touched

- 26 new files under `tracks/leetcode/problems/`
- `tracks/leetcode/track.js` — manifest order extended; categories kept contiguous
  (new categories slotted: Heap/Backtracking/Graphs/Intervals after Trees, Bit last;
  DP stays with climbing-stairs/maximum-subarray + the 2 new ones)
- `index.html` — 26 new `<script>` tags appended after maximum-subarray.js

## How it was built (process notes)

- **Parallel authoring**: 6 background agents, category-grouped (4/4/4/4/4/6 files),
  all driven by one shared brief (scratchpad `BRIEF.md`) encoding the track conventions:
  template shape, required fields, yaegi's trimmed stdlib import list, deterministic
  harness rules, unique SVG marker ids, order-normalizing comparisons.
- **Self-verification per agent**: a scratchpad `check-problem.mjs` that stubs `GoLearn`,
  loads `track.js` + the agent's problem files only, and replays verify.mjs's per-problem
  checks against the natively built runner (`go build -o <scratchpad>/runner ./wasm`).
  This let agents verify in isolation while manifest entries for sibling agents' files
  didn't exist yet. All 6 agents reported ALL PASS before the final gate.
- **Manifest/index.html updated up-front** (before agents ran) so the final full gate
  needed no shared-file merges.

## Conventions worth reusing (learned/confirmed this session)

- **Unique SVG marker ids are a cross-file concern**: all problem diagrams share one DOM.
  Agents kept ids unique within their own batch, but `dgArrowLSW` collided across batches
  (last-stone-weight vs the pre-existing longest-substring-without-repeating). Fixed by
  renaming to `dgArrowLSTW`. A post-fan-out dedupe check is now part of the recipe:
  `grep -ho 'marker id="[^"]*"' tracks/*/problems/*.js tracks/*/track.js | sort | uniq -d`
- **Order-unspecified outputs must be normalized in the harness** (sort copies of got and
  want): done for top-k-frequent-elements and subsets, stated in their prose.
- **Struct-design problems work fine** in the existing harness model: min-stack drives
  op scripts through `NewMinStack/Push/Pop/Top/GetMin` and compares the rendered output
  trace. last-stone-weight ships the `intHeap` scaffolding in the starter (precedent:
  ListNode/TreeNode are starter-declared) — the exercise is driving `heap.Init/Push/Pop`.
- **Deliberate starter returns**: search-in-rotated-sorted-array's starter returns `-2`
  (matching binary-search.js) so the `-1` miss case can't vacuously pass.
- **Allowed yaegi imports** (from `wasm/symbols`): bytes, container/heap, container/list,
  encoding/json, errors, fmt, math, math/bits, math/rand, reflect, sort, strconv,
  strings, time, unicode, unicode/utf8. No generics/goroutines in problem code.

## Verification performed

- Per-agent: every file through check-problem.mjs (starter compiles + fails ≥1 test;
  solution passes all with clean stderr) — same interpreter + merge logic as CI.
- Final: `node verify/verify.mjs` → **ALL PASS**, re-run again after the marker-id
  rename. Solutions run 0.4–0.8 ms each natively.
- Not exercised: browser UI click-through (generic engine paths already proven; CI
  re-runs the same gate on deploy).

## Current state / next steps

- Committed and pushed this session (track expansion + this doc); GitHub Pages
  workflow rebuilds wasm and redeploys on push, re-running verify.mjs as its gate.
- Natural follow-ons (not committed anywhere): add-two-numbers, kth-largest-element
  (heap #2), permutations / combination-sum (backtracking depth), jump-game (Greedy ★),
  insert-interval, longest-increasing-subsequence / unique-paths / word-break (DP),
  counting-bits / number-of-1-bits (bit), min-window-substring (Hard window).
- The nav's first problem is still two-sum; contains-duplicate was slotted second
  rather than first to keep Two Sum as the track's opener.
