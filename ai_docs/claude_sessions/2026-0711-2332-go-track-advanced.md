# Session: Go track goes advanced — Concurrency & Gotchas

- **Session ID**: `8d18d818-4889-4688-9b11-4eefdcc1aaa2`
- **Date**: 2026-07-11
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0711-2205` (Rust track + element v0.6.0)

## What this session did

Took the `go-basics` track from 3 lessons into advanced territory: **11 new
items** across two new categories, **Concurrency** (6) and **Gotchas** (5).
Track retitled from "Go basics" to **"Go"** (id stays `go-basics` so solved
state survives); the original three lessons got `category: 'Basics'`.

Final state: **165 items across 7 tracks** (leetcode=93, go-basics=14,
system-design=24, aws-saa=12, cka=13, typescript=6, rust=8).
`node verify/verify.mjs`: ALL PASS (ran 3× to shake out concurrency
flakiness — none). `go build ./... && go vet ./...`: clean. Plus a new
**wasm smoke test** (see below): WASM ALL PASS.

## The items

| Item | Kind | Category | Core idea |
|---|---|---|---|
| `goroutines` | lesson | Concurrency | fork/join with WaitGroup; write-by-index into a pre-sized slice (disjoint slots, no lock) |
| `channels` | lesson | Concurrency | producer goroutine, close, range; sender-closes rule |
| `select-drain` | Easy | Concurrency | `Drain(ch)` via select+default; closed-channel test forces `v, ok` (else infinite zero-spam) |
| `fan-in` | Medium | Concurrency | `Merge(a, b <-chan int)` — WaitGroup counts forwarders, closer goroutine alone closes `out` |
| `worker-pool` | Medium | Concurrency | jobs channel as queue, W workers, feeder + closer goroutines; harness counts `fn` calls atomically (each job exactly once) |
| `safe-counter` | Medium | Concurrency | mutex-guarded map; prose admits the single-threaded sandbox cannot prove a race (`-race` tip) |
| `loop-capture` | lesson | Gotchas | closures capture variables; hoisted-var starter prints `[3 3 3]`, deterministic, no goroutines |
| `nil-zero-values` | lesson | Gotchas | nil map: reads fine, writes panic; nil slice appends fine; typed-nil prose aside |
| `range-copies` | Easy | Gotchas | starter IS the bug: `for _, p := range { p.Y += dy }` compiles, does nothing |
| `append-aliasing` | Medium | Gotchas | starter is the nested-append `Insert` one-liner: returns RIGHT values, corrupts caller's array; aliasing tests catch it |
| `defer-cleanup` | lesson | Gotchas | LIFO, function-end (not block), defer-in-loop leak; exact-stdout check proves the unwind |

Structure mirrors the other tracks: `tracks/go-basics/problems/<slug>.js`
registering via `globalThis.GoLearnGoBasics.problem/lesson`, HARNESS_RT
duplicated in track.js (house style — tracks are independent plugins).
Every item: SVG diagram (marker ids namespaced `dgArrowGB*`), prose,
hidden harness or check, commented solution, explanation. Lessons CAN carry
`explanation` — engine renders the collapsible for any item that has one.

## Probe-driven design — yaegi facts discovered (IMPORTANT for future items)

Probed the native runner (`go build -o runner ./wasm`, feed stdin) before
authoring. Findings, all load-bearing:

1. **Loop vars are per-iteration (Go 1.22 semantics)** — `for i :=` closures
   see 0,1,2. The classic gotcha must be demoed by hoisting `var i` out.
2. **Deferred call ARGUMENTS evaluate late** (compiled Go snapshots them at
   the defer line). Divergence → the arg-snapshot rule is prose-only with an
   explicit "sandbox differs, try in compiled Go" tip; defer item leans on
   LIFO + function-end + named-return mutation (all correct in yaegi).
3. **Typed-nil through an interface compares `== nil`** (wrong; and
   inconsistent — a local `any` assignment gets it right). That gotcha is a
   prose aside in nil-zero-values, not runnable.
4. **`for v := range ch` breaks when `ch` is a range-loop VALUE variable**
   (`reflect: call of reflect.Value.Len on int Value`). Indexed access
   `chs[i]` works. This is why `Merge` takes two named params, not a slice.
5. Map iteration order IS randomized per pass (real Go maps underneath).
6. Nil-map write panic is recoverable in-goroutine (runCase catches it).
7. **Deadlock = `context deadline exceeded` after 5s** (native runner ctx;
   in-browser the worker watchdog terminates). Starters must never deadlock:
   fan-in starter returns a pre-closed channel, pool starter returns nil.
8. **A panic inside a SPAWNED goroutine can kill the whole process**
   (yaegi repanic escapes the JSON envelope). Rule: no starter/solution/
   harness path may panic off the main goroutine.
9. **No timers anywhere** (time.Sleep/After): the browser's `goRun.run` is a
   synchronous FuncOf call — blocked-on-event-loop = deadlock. All items
   synchronize via WaitGroup/close only (which is the right lesson anyway).

## New: wasm smoke test

`verify.mjs` runs the NATIVE build; the browser runs single-threaded wasm —
and this is the first track executing goroutines in the page. Wrote a Node
harness that boots the real `go-learn.wasm` via `wasm_exec.js` (Node needs
only `globalThis.require` + `globalThis.fs` shims), replays every go-basics
solution through the same assemble.js merge + sentinel parse: all 14 pass in
actual wasm. Script currently lives in the session scratchpad
(`wasm-smoke.mjs`); offered to promote it into `verify/` as a CI step —
not yet done.

## Files touched

- `tracks/go-basics/track.js` — retitle, categories, order (14), registrar +
  HARNESS_RT, header comment documenting the sandbox constraints
- `tracks/go-basics/problems/*.js` (11) — new
- `index.html` — 11 script tags after go-basics/track.js
- `README.md` — Go track bullet rewritten

## Possible follow-ons

- Promote the wasm smoke test into `verify/` (run after native checks).
- More concurrency: `sync.Once`, semaphore via buffered channel, pipeline
  stages, context-shaped cancellation (a done-channel item — no timers).
- More gotchas that probe clean: shadowing via `:=` in if-blocks, map values
  not addressable, string range = runes vs bytes (byte-index surprises).
- Chrome extension was not connected this session — a real in-browser
  click-through of one concurrency item is still worth doing once.
