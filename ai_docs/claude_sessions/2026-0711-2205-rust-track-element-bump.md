# Session: Rust for Go Devs track + element v0.6.0 bump

- **Session ID**: `ffbc71e7-dc47-47cb-9728-6d9da692b2de`
- **Date**: 2026-07-11
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0711-2057` (TypeScript track)

## What this session did

Two pieces of work:

1. Added a seventh track, **`rust`** ("Rust for Go Devs") — 8 items teaching
   Rust's compile-time rules by *implementing* them in Go.
2. Bumped **element v0.5.6 → v0.6.0** (fixes the prior `go vet`
   lock-by-value complaints), plus the knock-on interpreter fix it required
   (`sync/atomic` symbols).

Final state: **159 items across 7 tracks** (leetcode=93, go-basics=3,
system-design=24, aws-saa=12, cka=13, typescript=6, rust=8).
`node verify/verify.mjs`: ALL PASS. `go build ./... && go vet ./...`: clean.

## The Rust track concept

Rust cannot run in the page (the only runner is `go-wasm`), and that became
the design: what makes Rust hard coming from Go is not syntax but the set of
rules rustc enforces at compile time. Each item shows the real Rust code and
the real compiler error (E0382, E0502, E0106, E0004…), then has the learner
implement the rule itself as a pure Go function against a test harness — the
same move the CKA track makes with the scheduler and the AWS track makes
with IAM. Zero engine changes; standard `kind:'problem'` machinery with the
HARNESS_RT sentinel pattern duplicated per track (deliberate — tracks are
independent plugins).

## Track contents (`tracks/rust/`)

| Item | Kind | Category | The rule implemented |
|---|---|---|---|
| `ownership-moves` | lesson | Ownership | Use-after-move (E0382) as a two-map-write ownership tracker |
| `copy-or-move` | Easy | Ownership | `IsCopy` — structural recursion; `&mut` non-Copy is the key row |
| `drop-order` | Medium | Ownership | Reverse-declaration drops; moved-from bindings skip; shadowed bindings still drop (`name#k` labels) |
| `borrow-checker` | Medium | Borrowing | Shared-XOR-mutable as interval overlap over `[Start, End]` statement ranges; NLL = intervals end at last use |
| `lifetime-elision` | Easy | Borrowing | The three elision rules as a priority ladder ending in E0106 |
| `match-exhaustiveness` | Medium | Enums & Matching | Missing variants (E0004) + unreachable arms; judge-then-extend (dead arms cover nothing — the `[A, _, B]` case) |
| `question-mark` | Easy | Error Handling | `?` desugared as early-return in a chain runner; **harness counts executed steps** so a non-short-circuiting impl fails |
| `char-boundaries` | Easy | Strings & Slices | `str::is_char_boundary` / `floor_char_boundary` (`b&0xC0 != 0x80`); round-trips to Go as `utf8.RuneStart` |

Every item: SVG intuition diagram (marker ids namespaced `dgArrowRS*`),
side-by-side Rust/Go snippets (`lang: 'rust'` renders escaped-plaintext via
the `goHi.escape` fallback in `engine.js block()` — same as `ts`), hidden
harness, solution walkthrough, complexity note. Wired: script tags in
`index.html` (after the typescript block), README bullet.

Gotcha hit once: an apostrophe inside a single-quoted JS string (an SVG
`aria-label` containing "borrow's") — track content strings are
single-quoted throughout, keep prose apostrophes to HTML contexts using
`&rsquo;`/`’` or reword.

## element v0.6.0 bump (the request arrived mid-track-build)

- `go get github.com/rohanthewiz/element@v0.6.0` + `go mod tidy` — clears
  the old vet complaints in the *module*.
- But vet still failed on `wasm/runner/srcfs/element/element_debug.go` —
  that's the **staged copy** (v0.5.x bytes). Fix: `./build.sh stage`
  restages srcfs from the module cache (go.mod pins the version).
- Then `verify.mjs` failed all 5 element-importing TypeScript lessons:
  v0.6.0's `element_debug.go` newly imports **`sync/atomic`**, absent from
  the interpreter's trimmed stdlib symbol table. Fix:
  - `wasm/symbols/gen.sh` — added `sync/atomic` to the package list (with a
    comment noting it arrived with element v0.6.0's debug concerns).
  - Ran `go run github.com/traefik/yaegi/cmd/yaegi extract sync/atomic` in
    `wasm/symbols/` → new `sync-atomic.go`.
  - `./build.sh` full rebuild → ALL PASS.

**Pattern to remember**: an element/serr version bump is a three-step dance —
(1) `go get` the module, (2) `./build.sh stage` to refresh srcfs, (3) check
whether the new sources import stdlib packages the symbol table lacks; if
so, extend `wasm/symbols/gen.sh` + extract + rebuild the wasm.

## Files touched

- `tracks/rust/track.js` + `tracks/rust/problems/*.js` (8) — new
- `index.html` — 9 script tags after the typescript block
- `README.md` — Rust track bullet in the Tracks list
- `go.mod` / `go.sum` — element v0.6.0
- `wasm/symbols/gen.sh` — `sync/atomic` in the extract list
- `wasm/symbols/sync-atomic.go` — generated extract (committed; srcfs and
  `go-learn.wasm` are gitignored build artifacts, CI regenerates them)

## Verification

- `node verify/verify.mjs` → `ALL PASS` — per problem: starter compiles and
  fails ≥1 test, solution passes all with clean stderr; per lesson: starter
  runs but doesn't pre-pass `check()`, solution passes.
- `go build ./... && go vet ./...` → clean (the point of the bump).

## Possible follow-ons

- More Rust items the model supports well: two-phase borrows, `Rc`/`RefCell`
  (interior mutability as a runtime borrow counter — very implementable),
  trait-object vs generic dispatch, `Send`/`Sync` auto-trait propagation
  (same structural recursion shape as `IsCopy`).
- The `?` operator item's `Errf` name avoids colliding with a user-defined
  `Err`; if a future item models `Option`, mirror the naming (`Somef`?
  or switch to methods).
