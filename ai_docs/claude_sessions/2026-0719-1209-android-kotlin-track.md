# Session: Android with Kotlin track (18 problems, go-wasm runner)

- **Session id**: `2b0eadec-7722-409b-97a9-441d92c17ff3`
- **Date**: 2026-07-19
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: `2026-0719-0454` (music track); track model follows
  `rust` / `dart` / `flutter` (implement-the-rule-in-Go for a language
  that cannot run in the page)

## What this session did

Added a complete new track: **`android` — "Android with Kotlin"**, 18
problems on the existing `go-wasm` runner. Zero engine changes — same
`kind:'problem'` machinery and sentinel-JSON harness protocol. Premise:
Kotlin can't run here, and (as rust/dart/flutter proved) that's a feature —
Android is a pile of state machines and resolution algorithms, Kotlin a set
of compiler-enforced decision procedures; every item shows the real
Kotlin/Android code and real observed behavior (compiler error, Logcat
trace, ANR dialog), then the learner implements the rule as testable Go.

### Items (6 categories)

- **Kotlin: Types & Null Safety**: `null-safety-operators` (`?.`/`?:`/`!!`
  over Go pointers; Elvis(&zero,5)==0 zero-is-not-null trap),
  `smart-casts` (7-rule ordered decision table + PromotedType; real
  "could have been changed by this time" reason strings), `data-classes`
  (generated equals/hashCode/toString/copy/componentN; Java string
  hashCode over ASCII in int32 — verified anchors stringHash("Ada")=65662,
  HashCode(User{"Ada",36})=2035558, "polygenelubricants"→-2147483648
  wraparound canary; copy() resets body-declared props to initializers),
  `sealed-when` (exhaustiveness/MissingBranches over modeled hierarchy;
  added-subtype flips a green when to missing exactly that branch)
- **Kotlin: Functions & Delegation**: `extension-functions` (members
  dispatch on runtime chain, extensions on DECLARED chain; nullable
  receiver contrast), `delegated-properties` (lazy init-once, observable
  after-write no-dedupe, vetoable before-write true-accepts, lateinit)
- **Coroutines & the Main Thread**: `handler-looper` (virtual-time
  MessageQueue, due-order + FIFO ties, tasks occupy the thread; ANR =
  actual start STRICTLY > inputAt+5000), `suspend-state-machine` (CPS
  transform: label + when(label) + SUSPENDED sentinel; N awaits → N+1
  resumes), `structured-concurrency` (Job tree: cancel propagates down,
  failure climbs up cancelling siblings, SupervisorJob is a firewall —
  shields a parent from children, not itself), `cold-flows` (cold =
  builder per collector, lazy operators, Take via cooperative
  emit-returns-bool; StateFlow conflation/distinctUntilChanged)
- **Activities & Navigation**: `activity-lifecycle` (pinned transition
  table + Trace fold + the famous interleaving A.onPause → B.onCreate/
  onStart/onResume → A.onStop), `viewmodel-retention` (store retained on
  rotate, cleared on finish — onCleared on finish only, never process
  death; SavedStateHandle survives process death, lost on finish),
  `back-stack-launch-modes` (standard/singleTop/singleTask/CLEAR_TOP;
  [A B C]+B/singleTask → destroy:C newIntent:B; CLEAR_TOP+standard also
  destroys and recreates the target — the lost-state bug)
- **UI: Lists, Compose & Layout**: `recyclerview-diffutil` (moves =
  complement of LIS of old positions in new order; [a b c d]→[d a b c] is
  ONE move; smallest-tail LIS tie-break pinned both ways),
  `compose-recomposition` (reads subscribe, writes invalidate; stable +
  params-unchanged skips; unstable rides along transitively),
  `measure-spec` (AOSP getChildMeasureSpec 9-case table, ResolveSize,
  DpToPx int(dp*density+0.5): 48dp@2.625=126, 1dp@2.625=3)
- **Resources & Permissions**: `resource-qualifiers` (contradiction
  elimination then precedence walk locale>swdp>orientation>night>density>
  version; density best-match never eliminates; teaching case resolves to
  fr-land), `runtime-permissions` (two-strike machine, API 30 auto-deny;
  rationale-false ambiguity pinned via two-machine indistinguishability
  case)

## How it was built

Placeholder-first parallel authoring (fixes the verify.mjs
MODULE_NOT_FOUND trap from the music session): main session landed
track.js (GoLearnAndroid registrar, duplicated HARNESS_RT), 18
dynamically-VALID placeholder problems (starter fails, solution passes),
and all 19 index.html script tags — full suite green before authoring
began, so agents' scoped `node verify/verify.mjs android/<id>` runs always
worked. Then five parallel background agents (types / functions+resources
/ coroutines / lifecycle+nav / UI), all from a shared authoring brief
(scratchpad) pinning per-item semantics, API names, categories, and
conventions; gold standard `tracks/networking/problems/internet-checksum.js`.
Main session relayed a mid-flight warning between agents (see finding 1),
then ran the final full gate and hand-checked pinned facts by grep +
arithmetic.

## Findings worth remembering

1. **yaegi writes RECOVERED panics to stderr** (new; saved to memory dir
   with the older gotchas): the runner emits an interpreter trace line for
   any panic that unwinds an interpreted frame even when runCase fully
   recovers it, and verify.mjs requires empty solution stderr — so a
   harness case can NEVER exercise a solution's panicking path. Panic
   contracts (lateinit, `!!`, Resume-after-DONE, "no dialog showing")
   live in starter doc comments / solution code / prose only. Only
   same-frame recovery is silent.
2. **Placeholder-first parallel authoring works**: dynamically-valid
   placeholders + script tags landed before agents start = no mirror
   verifiers needed, scoped verify usable from minute one. Do this for
   every future multi-agent track.
3. Disclosed model simplifications (each stated in its item's prose):
   compose-recomposition prunes skipped subtrees (real Compose donut-hole
   skipping lets a direct reader inside a skipped parent fire);
   measure-spec pins UNSPECIFIED→0 (pre-M AOSP; modern passes size
   through); resource-qualifiers' version step is flat specifies-or-dies
   (real resolver prefers highest v<=device) and density prefers
   largest-at-or-below (modern runtime prefers scaling higher down);
   singleTask's separate-task/taskAffinity behavior out of scope.
4. Brief's guessed data-class hash constants were wrong; agent verified by
   running the pinned algorithm before hard-coding (the brief told it to —
   keep doing that for any pinned arithmetic).
5. Concurrent scoped verify runs can wedge on the shared Go build cache;
   kill and rerun resolves.

## Verification

- `node verify/verify.mjs` (FULL suite, all 22 tracks) → **ALL PASS**;
  android=18: every starter compiles-but-fails, every solution passes all
  186 tests with clean stderr; static checks green.
- Hand-checked in review: no page-wide SVG marker-id collisions; exact
  category strings ×6; 1 Easy / 11 Medium / 6 Hard as assigned; no named
  returns; no goroutines/time/rand; Ada hash arithmetic; diffutil
  canonical move; ANR strict boundary; A/B interleaving; singleTask and
  CLEAR_TOP sequences; dp rounding cases; supervisor firewall cases;
  smart-cast reason strings.
- NOT done: live browser eyeball of the new track (dev server).

## Files

- New: `tracks/android/track.js` (18-item manifest, GoLearnAndroid),
  `tracks/android/problems/*.js` (18 files, ~7,400 lines).
- Modified: `index.html` (19 script tags after the music block),
  `README.md` (Android bullet + previously-missing Piano & Music Theory
  bullet).
- No wasm/build.sh rebuild needed — track files are static JS.
