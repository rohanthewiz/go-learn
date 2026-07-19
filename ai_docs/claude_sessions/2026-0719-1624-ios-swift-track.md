# Session: iOS with Swift track (18 problems, go-wasm runner)

- **Session id**: `7d7bb8b3-b1b8-47cc-bcf3-c058e3d2707b`
- **Date**: 2026-07-19
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: `2026-0719-1209` (android track); same track model
  (implement-the-rule-in-Go for a language that cannot run in the page)
  and the same placeholder-first parallel authoring playbook.

## What this session did

Added a complete new track: **`ios` — "iOS with Swift"**, 18 problems on
the existing `go-wasm` runner, basics → advanced. Zero engine changes —
same `kind:'problem'` machinery and sentinel-JSON harness protocol.
Premise: Swift can't run here; every item shows the real Swift/iOS code
and real observed behavior (compiler diagnostic, crash log, console
trace, the once-only permission alert), then the learner implements the
rule as testable Go.

### Items (6 categories, 1 Easy / 11 Medium / 6 Hard)

- **Swift: Types & Optionals**: `optionals-chaining` (Easy; `?.`/`??`/
  `if let`/`guard let` over Go pointers; NilCoalesce(&zero,5)==0
  zero-is-not-nil trap), `value-vs-reference` (struct copy-at-assignment
  vs class share; Array CoW as buffer-id + refcount world, copy exactly
  once on shared mutation, `isKnownUniquelyReferenced`),
  `enums-pattern-matching` (MissingCases in declaration order with
  declared-list parameter so added-case flips exhaustiveness; first-match
  with `where` guards falling through), `protocols-dispatch` (requirement
  → witness table on runtime type; extension-only → static on declared
  type; the classic `let a: Flier = Bird()` demo pinned both ways;
  WitnessTable proves extension methods get no slot)
- **Swift: Memory & Closures**: `closure-captures` (shared-box capture,
  live vs `[total]` snapshot head-to-head 10-vs-0, `[weak self]` via an
  ARC-style side-table registry that nils refs on Dealloc),
  `arc-retain-cycles` (Hard; StrongCount/Release cascade with deinit
  trace/ReadWeak/Alive/Leaks; Parent↔Child and delegate-cycle graphs in
  broken + fixed form; unowned counts-like-weak)
- **Concurrency & the Main Thread**: `gcd-queues` (serial-queue
  simulator, held-queue set for deadlock; sync-joins-the-tail trace;
  self-sync freeze; two-queue deadly embrace; 0x8badf00d texture),
  `async-await-tasks` (Hard; round-robin one-step-per-tick task tree;
  cooperative cancellation — cancel-before-check still runs work;
  detached firewall inbound AND outbound; group throw cancels siblings;
  first-error-wins), `actors-isolation` (Hard; 7-row ordered isolation
  decision table with real diagnostics; reentrant mailbox with parked
  continuations — the guard/await/deduct bal=-30 trace and the
  re-check fix), `combine-publishers` (Hard; cold re-run per subscriber
  proven by side-effect counters; Prefix cancels upstream via
  emit-returns-bool; CurrentValueSubject replays with NO dedupe [0 5 5]
  — contrasted with Kotlin StateFlow; completion drops later sends)
- **View Controllers & Navigation**: `viewcontroller-lifecycle` (iOS 11+
  push interleaving B.viewDidLoad → A.viewWillDisappear →
  B.viewWillAppear → A.viewDidDisappear → B.viewDidAppear — externally
  verified, version-variability disclosed; pop deinit-last; retained
  re-push no reload; pageSheet vs fullScreen), `navigation-and-modals`
  (stack + modal chain; present forwards to topmost card; 2-deep dismiss
  chain rules; push-under-modal invisible), `app-lifecycle-scenes`
  (six-state machine; silent suspend, silent memory-pressure death — no
  applicationWillTerminate; interrupt does NOT background; warm resume
  vs cold relaunch)
- **UI: SwiftUI, Lists & Layout**: `swiftui-state` (Hard;
  reads-subscribe/writes-invalidate graph; binding writes attributed to
  owner; identity flip destroys branch-local @State transitively;
  Self._printChanges() texture), `tableview-cell-reuse` (LIFO pool
  scroll simulation; created settles at window+1=4; phantom checkmark on
  exactly row 4 via recycled cell under set-but-never-clear configure;
  round-trip case where the bug hides), `autolayout-engine` (Hard;
  one-axis solver: slack → lower hugging stretches, overflow → lower CR
  truncates, equal = ambiguous; 251/750 UILabel defaults; computed
  anchors 350/230/90)
- **Touches & Permissions**: `hit-testing` (reverse-order recursion,
  hidden/alpha<0.01/disabled pruning, child-outside-parent-bounds
  untappable, disabled-topmost falls through to sibling below),
  `permissions-authorization` (ask-once machine over camera/photos/
  notifications; alertCount ≤ 1 invariant; Settings the only exit from
  denied; provisional quiet grant then the one exception — full request
  from provisional alerts; verified against Apple docs)

## How it was built

Same playbook as android, worked cleanly again: main session landed
track.js (GoLearnIOS registrar, duplicated HARNESS_RT), 18 dynamically
valid placeholders (starter fails, solution passes), and all 19
index.html script tags — full suite green before authoring began. Then
five parallel background agents (types / memory+permissions /
concurrency / lifecycle+nav+hit-testing / UI) from a shared authoring
brief (scratchpad) pinning per-item semantics, category strings,
difficulty spread, and all known gotchas; gold standard
`tracks/networking/problems/internet-checksum.js` + per-item android
analog files. Main session relayed one mid-flight warning between agents
(finding 1), updated README while agents ran, then ran the final full
gate and hand-checks.

## Findings worth remembering

1. **Solutions must redeclare every type they use** (new; added to the
   memory gotchas file): the solution replaces the starter wholesale,
   and a solution referencing a starter-only type fails in yaegi with
   the misleading error `constant definition loop`. Hit once on
   navigation-and-modals; warning relayed mid-flight to the concurrency
   agent.
2. Placeholder-first parallel authoring worked flawlessly a second time
   — zero verify breakage during authoring across five concurrent
   agents.
3. Agents externally verified the risky pins before hard-coding: the
   UIKit push callback order (iOS-version-dependent — pre-11 was
   reversed; disclosed in-item) and the provisional-notifications
   upgrade path (Apple docs). Pinned arithmetic (layout widths, cell
   counts, scheduler traces) was computed by scratch `go run` programs,
   never guessed.
4. Disclosed model simplifications (each stated in its item's prose):
   ARC release cascade is FIFO/breadth-first (real ARC recurses
   depth-first), SwiftUI re-evaluation order pinned as preorder (real
   AttributeGraph order unspecified), GCD model is serial-only with a
   single virtual worker, Combine demand collapsed to a boolean, actors
   fold sync-vs-async-context into member kind, app/scene delegate
   callback sets blended.

## Verification

- `node verify/verify.mjs` (FULL suite, all 23 tracks) → **ALL PASS**;
  ios=18: every starter compiles-but-fails, every solution passes all
  216 tests with clean stderr; static checks green.
- Hand-checked: no page-wide SVG id collisions (349 ids across all
  tracks), exact category strings ×6 (4/2/4/3/3/2), 1 Easy / 11 Medium
  / 6 Hard as pinned, no named returns, no goroutines/time/rand,
  spot-checks of load-bearing pins (push interleaving, zero-is-not-nil,
  DEADLOCK semantics, alert cap, window+1 bound).
- NOT done: live browser eyeball of the new track (dev server).

## Files

- New: `tracks/ios/track.js` (18-item manifest, GoLearnIOS),
  `tracks/ios/problems/*.js` (18 files).
- Modified: `index.html` (19 script tags after the android block),
  `README.md` (iOS with Swift bullet).
- No wasm/build.sh rebuild needed — track files are static JS.
