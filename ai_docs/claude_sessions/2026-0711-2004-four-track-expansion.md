# Session: Four-track expansion (SD 6→24, AWS ★, CKA ★, LeetCode 53→93)

- **Session ID**: `7eff6f70-5586-4e4b-b141-1bfc2aa4f47c`
- **Date**: 2026-07-11
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: sessions `2026-0711-0137` (SD track), `2026-0711-0212` and
  `2026-0711-0808` (LeetCode expansions)

## What this session did

Four phases, each gated by `node verify/verify.mjs` (ALL PASS) and committed/
pushed separately, per the user's request. Zero engine changes throughout.
Final state: **145 items across 5 tracks** (leetcode=93, go-basics=3,
system-design=24, aws-saa=12, cka=13).

| Phase | Commit | Contents |
|---|---|---|
| 1 | `7d4a01a` | System Design 6→24: +18 problems, +5 categories |
| 2 | `ab0ba67` | NEW track `aws-saa` (12 items, 7 categories) |
| 3 | `c49ed07` | NEW track `cka` (13 items, 7 categories) |
| 4 | (this commit) | LeetCode 53→93: +39 problems, +Pattern Playbook lesson, +Tries/Foundations categories |

### Phase 1 — System Design (18 new problems)

Caching: lfu-cache (Hard), ttl-cache · Rate Limiting: sliding-window-log,
sliding-window-counter · Partitioning: rendezvous-hashing, shard-router ·
Probabilistic: count-min-sketch, heavy-hitters (Misra–Gries) · **Unique IDs &
Encoding ★**: base62-shortener, snowflake-id · **Resilience ★**: retry-backoff,
circuit-breaker · **Replication & Consistency ★**: quorum-rw, vector-clocks,
merkle-tree · **Storage Engines ★**: write-ahead-log, lsm-memtable ·
**Messaging ★**: message-queue-visibility.

### Phase 2 — AWS Solutions Architect (`tracks/aws-saa/`, new)

Premise: SAA exam themes as the decision procedures AWS documents, computed
rather than memorized. Prices are teaching constants passed via case tables.
Every explanation ends with an `<h3>Exam takeaway</h3>` section.
Items: availability-math + rto-rpo (lessons), iam-policy-eval (explicit deny >
allow > implicit deny), security-group-eval (hand-rolled CIDR/uint32 match),
vpc-cidr-subnets, route53-weighted-routing (injected roll), autoscaling-target-
tracking (ceil-then-clamp + asymmetric cooldown), lambda-concurrency (Little's
law), s3-lifecycle, s3-storage-classes (cost = storage + access), dynamodb-
capacity (4KB/1KB unit math), reserved-vs-on-demand (breakeven month).

### Phase 3 — CKA (`tracks/cka/`, new)

Premise: predict what the control plane will do — each item implements a
documented Kubernetes decision procedure as pure Go over declared inputs.
Every explanation ends with an `<h3>On the exam</h3>` section; simplifications
of reality are stated in prose. Items: etcd-quorum (lesson), scheduler-fit
(requests-not-usage hammered), taints-tolerations, qos-classes, rolling-update
(surge/unavailable step simulation), hpa-scaling (10% deadband), crashloop-
backoff (10s→300s + 600s reset), service-endpoints, ingress-routing (exact >
longest segment-wise prefix), rbac-eval (additive-only; explicitly contrasted
with IAM's deny model), resource-quota, eviction-order (usage-above-request is
the currency; QoS falls out of the numbers), pdb-drain (single-sweep
simplification).

### Phase 4 — LeetCode 53→93 with technique emphasis

- **NEW `pattern-playbook` lesson** (Foundations ★, authored by the orchestrator,
  registered via `GoLearn.registerItem` directly since `GoLearnLeet.problem`
  stamps kind:'problem'): a 20-technique playbook (trigger → cost → sibling
  problems) plus a 10-scenario "name the tool" drill checked via stdout.
- **Every new problem's explanation ends with a mandatory "The pattern"
  section**: technique named in bold, trigger phrases, cost, and named sibling
  problems (cross-track references included, e.g. majority-element ↔ SD
  heavy-hitters, merge-k-sorted-lists ↔ LSM compaction).
- 39 new problems: valid-sudoku, encode-decode-strings, majority-element ·
  largest-rectangle-in-histogram · two-sum-ii, sort-colors ·
  permutation-in-string · search-2d-matrix, find-min-in-rotated-sorted-array,
  median-of-two-sorted-arrays (Hard) · reorder-list,
  copy-list-with-random-pointer, merge-k-sorted-lists (Hard) ·
  diameter-of-binary-tree, subtree-of-another-tree, lowest-common-ancestor-bst,
  kth-smallest-in-bst · implement-trie (**Tries ★**) · k-closest-points,
  task-scheduler · generate-parentheses, letter-combinations, word-search ·
  rotting-oranges, pacific-atlantic, redundant-connection (union-find intro) ·
  non-overlapping-intervals, meeting-rooms · gas-station, partition-labels ·
  min-cost-climbing-stairs, decode-ways, palindromic-substrings,
  longest-common-subsequence, edit-distance, partition-equal-subset-sum ·
  reverse-bits, missing-number, sum-of-two-integers.

## How it was built (same recipe, scaled)

- Shared `BRIEF.md` + `LEET-ADDENDUM.md` + `check-problem.mjs` + natively built
  runner in the session scratchpad; 21 background agents total (5 SD, 3 AWS,
  3 CKA, 10 LeetCode), each self-verifying per-problem before reporting.
- Manifests/index.html updated by the orchestrator, never by agents. For the
  LeetCode phase the agents verified against a **scratchpad copy of track.js**
  (`leet-track.js`) so phases 2–3 could commit a clean tree while LeetCode
  authoring ran concurrently; the real manifest was updated at phase-4 commit
  time. AWS/CKA `track.js` files existed on disk during earlier phases but were
  inert (no index.html script tags) — verify.mjs only loads what the page loads.
- Marker-id prefixes prescribed per problem in every assignment (the global-
  namespace collision lesson from `2026-0711-0212`); post-fan-out dedupe greps
  ran before every commit — zero duplicates all session.
- One agent died mid-flight on an API connection error (consistency batch);
  resumed via SendMessage with a disk-state summary and completed normally.

## New platform knowledge (worth keeping)

- **yaegi tuple-assignment bug**: in the trimmed wasm/yaegi runner, a
  multi-value assignment whose RHS mixes a call with non-call values silently
  drops the non-call assignments (`a, b, c = s, len(s), true` assigns only
  `b`). Workaround: split into separate assignments. (Found in cka/ingress-
  routing; isolated and confirmed.)
- **Two new-track registration helpers**: aws-saa and cka `track.js` expose
  both `.problem()` and `.lesson()` (SD/LC only have `.problem()`); lessons can
  live in `problems/*.js` files — kind is what matters, not the directory.
- **Lessons have no `explanation` field** — takeaway sections belong at the end
  of prose (worded to not leak check() answers).
- **HRW hashing balance is name-sensitive**: `fnv1a(node+"|"+key)` was lumpy
  for `node-a..e` style names (worst node 19/300); alpha/bravo/charlie names
  gave 40/300. Empirically validate any hash-derived threshold natively before
  writing the harness (the floor lives in rendezvous-hashing.js).
- **Boolean/zero-sentinel rule generalized**: when a function returns bool or
  a type whose zero value is a legit want, ensure ≥3 cases expect the opposite
  and accept that designated negative cases pass vacuously.
- **fmt.Sprintf("%v") comparison treats nil and empty slices identically** —
  used deliberately in several harnesses so learners aren't punished for
  either idiom; noted in harness comments where done.

## Verification performed

- Per-agent: every file through check-problem.mjs (starter compiles + fails ≥1
  test; solution passes all with clean stderr) — same interpreter + merge logic
  as CI. All 82 new items pass; typical solution runtime 0.4–1.6 ms native
  (property suites up to ~24 ms).
- Per-phase: marker-id dedupe grep + full `node verify/verify.mjs` before each
  commit; final gate ALL PASS at 145 items.
- Not exercised: browser click-through (generic engine paths proven; the
  GitHub Pages workflow re-runs verify.mjs on deploy).

## Current state / next steps

- Four commits pushed: `7d4a01a`, `ab0ba67`, `c49ed07`, plus the phase-4
  commit containing this doc. Pages workflow redeploys on push.
- Follow-on ideas (not committed anywhere): SD — leaky bucket, gossip rounds,
  2-phase commit, Raft vote logic; AWS — SQS/SNS fanout item, Aurora quorum,
  NAT vs IGW decision item, Kinesis shard math; CKA — NetworkPolicy evaluation,
  cert rotation windows, kubeadm upgrade order simulation; LeetCode —
  serialize/deserialize-binary-tree, word-ladder, LRU-cache (as leetcode
  cross-reference to SD), N-Queens, meeting-rooms-ii, graph-valid-tree,
  house-robber-ii, target-sum, min-path-sum, longest-palindromic-substring.
