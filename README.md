# go-learn

Interactive, in-browser programming tutorials — solve real problems in **Go**
(and now **TypeScript**), right in the page. No server, no toolchain, no
sign-up: the Go interpreter ([yaegi](https://github.com/traefik/yaegi)) runs
compiled to WebAssembly, and the real TypeScript compiler runs as vendored JS
in a web worker.

**Live: https://rohanthewiz.github.io/go-learn/**

## Tracks

- **LeetCode in Go** — 93 classic problems across the standard categories
  (arrays & hashing, stack, two pointers, sliding window, binary search,
  linked lists, trees, dynamic programming, greedy, …). Each has a statement
  with an SVG intuition diagram, a live editor run against real test cases
  as you type, and a solution with a full walkthrough and complexity notes.
- **System Design** — 24 runnable building blocks (consistent hashing, token
  bucket, bloom filter, write-ahead log, …).
- **AWS Solutions Architect** — 12 exam decision procedures as testable Go.
- **CKA: Kubernetes Admin** — 13 control-plane decision procedures
  (scheduling, eviction, RBAC, …) as testable Go.
- **TypeScript + Go Web** — 6 lessons building a one-binary web app:
  [element](https://github.com/rohanthewiz/element) writes the HTML,
  [go-styl](https://github.com/rohanthewiz/go-styl) compiles the CSS,
  TypeScript 7 (`tsgo`, the Go-native compiler) emits the JS, and
  [rweb](https://github.com/rohanthewiz/rweb) serves it all with the CSS/JS
  embedded. The element and go-styl code runs live in the page.
- **Pure TypeScript** — 17 lessons, fundamentals through intermediate, with
  *TypeScript in the editor*: the real compiler (vendored `typescript.js`)
  type-checks every keystroke in strict mode and only then runs the program —
  a type error means no output, so the checker is the gatekeeper of every
  exercise. Annotations & inference → functions → object types → arrays &
  tuples → unions & literals → narrowing → discriminated unions → type
  predicates → interfaces & intersections → classes → enums & `as const` →
  generic functions & types → `keyof`/indexed access → utility types →
  mapped types → promises & async. Some starters ship *intentionally broken*
  (`starterError`) — reading the real `TS2322` is the lesson.
- **Rust for Go Devs** — 8 items teaching Rust's compile-time rules by
  *implementing* them: each shows real Rust code and the real compiler error
  (E0382, E0502, E0106, …), then has you write the rule rustc enforces —
  moves, Copy, drop order, the borrow checker, lifetime elision, match
  exhaustiveness, the `?` operator, char boundaries — as testable Go.
- **Go** — starts as a short on-ramp (hello, slices & loops, maps), then goes
  advanced: **Concurrency** (goroutines & WaitGroup, channels, select, fan-in,
  worker pool, mutexes) and **Gotchas** (loop-variable capture, nil maps,
  range copies, append aliasing, defer semantics) — the traps every Go
  interview and code review circles back to.

Plus a free-form **Playground** tab: any Go main program → stdout.

## Architecture

The platform is a generic engine + pluggable content tracks:

```
engine/engine.js     registries + Learn view UI (knows nothing about tests)
engine/kinds.js      item kinds: 'lesson' (check stdout) and 'problem' (test table)
engine/runner-go.js  the 'go-wasm' runner plugin (watchdog + respawn)
engine/worker.js     web worker hosting the interpreter — an infinite loop in
                     user code gets its worker terminated, never the page
engine/runner-ts.js  the 'ts' runner plugin — same watchdog architecture, but
                     lazily spawned: the compiler downloads only when a
                     TypeScript track is opened
engine/worker-ts.js  web worker hosting the TypeScript compiler
engine/ts-run.js     the TS compile-and-run core (strict check → emit → exec
                     with a captured console), shared verbatim with CI
engine/assemble.js   merges user code + problem harness into one Go program;
                     parses sentinel-delimited results out of stdout
tracks/<id>/         a track = manifest + items; plain script tags, no build step
wasm/                the interpreter: yaegi + trimmed stdlib symbols, plus
                     go-styl compiled in and element/serr staged as source
                     (wasm/runner/srcfs, for the TypeScript track)
third_party/typescript/   the TypeScript compiler (typescript.js) + the ES2020
                     lib.d.ts closure it type-checks against
```

A track declares a runner (`go-wasm`, `ts`, or none) and registers items of
some kind; adding a new track — or a new *kind* of track (quizzes, system
design) — requires no engine changes. See `tracks/go-basics/track.js` for the
smallest possible example.

How a problem run works: the user edits a complete Go file (no `main`); the
track merges it with the problem's hidden test harness (imports deduped),
the wasm interpreter runs the merged program, and the harness reports
per-test results as sentinel-delimited JSON on stdout — user prints land in
a console pane, and compile-error lines map back to the editor.

## Development

```sh
./build.sh              # stage srcfs + build go-learn.wasm + copy wasm_exec.js
go run ./serve          # http://localhost:8080
node verify/verify.mjs  # check every problem/lesson against the native runner
```

On a fresh clone run `./build.sh` (or `./build.sh stage`) once before any
native `go build ./wasm` / `verify.mjs` run: it stages the element and serr
sources the interpreter embeds (`wasm/runner/srcfs`, not committed) from the
module cache at the versions go.mod pins.

`verify.mjs` enforces, for every problem: the starter compiles but fails at
least one test, and the solution passes all of them — with the exact merge
code and interpreter the browser uses. CI runs it before every deploy.

Author a new problem by copying `tracks/leetcode/problems/two-sum.js`,
adding a `<script>` tag in `index.html`, and its id to the track manifest;
check it in isolation with `node verify/one.mjs tracks/leetcode/problems/<slug>.js`.
