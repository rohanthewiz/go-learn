# go-learn

Interactive, in-browser programming tutorials — solve real problems in **Go**
(and now **TypeScript** and **JavaScript**), right in the page. No server, no
toolchain, no sign-up: the Go interpreter
([yaegi](https://github.com/traefik/yaegi)) runs compiled to WebAssembly, the
real TypeScript compiler runs as vendored JS in a web worker, and JavaScript
runs on the browser's own engine — deterministically, thanks to virtual
timers.

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
- **Pure JavaScript** — 22 lessons, beginner through advanced, with *plain
  modern JavaScript in the editor*, executed by the browser's own engine in
  a web worker — no compiler, no transform. Timers are *virtualized*
  (callbacks fire in due-time order with microtasks drained between fires),
  so async lessons run instantly and deterministically — including a real
  event-loop lesson the TypeScript track could never host. Values & bindings
  → types & coercion → control flow → functions → array methods → strings &
  regex → objects (`?.`/`??`) → destructuring & spread → maps & sets →
  closures → higher-order functions → `this` & binding → prototypes →
  classes (`#private`) → inheritance → iterators → generators → promises →
  async/await → the event loop → error handling (`cause`) → Proxy & Reflect.
- **Pure HTML** — 20 lessons, beginner through advanced, with *plain HTML in
  the editor* and a split output pane: a sandboxed iframe shows what the
  browser renders while a strict validator (`engine/html-run.js`) shows the
  document tree it parsed — or refuses in red what the browser would have
  silently repaired (mismatched tags, `<div/>`, bare `&`, duplicate ids).
  Checks pin the canonical structure outline. First elements → document
  skeleton → text → lists → links → images → semantic layout → tables →
  entities & comments → well-formedness → forms (basics, controls,
  validation) → global attributes → head metadata → media & embeds →
  details/dialog → styling hooks → accessibility → a capstone page. Several
  lessons show the same markup generated from Go by
  [element](https://github.com/rohanthewiz/element), bridging to the
  TypeScript + Go Web track.
- **Rust for Go Devs** — 8 items teaching Rust's compile-time rules by
  *implementing* them: each shows real Rust code and the real compiler error
  (E0382, E0502, E0106, …), then has you write the rule rustc enforces —
  moves, Copy, drop order, the borrow checker, lifetime elision, match
  exhaustiveness, the `?` operator, char boundaries — as testable Go.
- **Dart for Go Devs** — 16 items teaching the rules that make Dart Dart by
  *implementing* them as testable Go: sound null safety, `?.`/`??`/`??=`,
  flow-based type promotion (and why fields don't promote), `late`,
  `final` vs `const` canonicalization, named/`required` parameters,
  cascades, mixin linearization, extension methods' static dispatch,
  collection `if`/spread, records, sealed-class exhaustiveness, the
  sync-until-first-`await` rule, the two-queue event loop, streams, and
  isolate message copying.
- **Flutter Internals** — 12 items implementing the framework's core
  machinery in Go: the widget tree walk, `canUpdate`, keyed list
  reconciliation (the checkbox bug), the State lifecycle, setState dirty
  propagation, `const` rebuild pruning, constraints-down/sizes-up, the
  Row/Column flex algorithm (overflow stripes included), `Theme.of`'s
  upward walk, reverse-paint-order hit testing, the Navigator stack, and
  the FutureBuilder snapshot machine.
- **CSS via Stylus** — 16 lessons on the principles of CSS — the cascade
  & specificity, inheritance, selectors & combinators, pseudo-classes,
  the box model, units, color, normal flow, flexbox, grid, positioning,
  mobile-first media queries, motion, mixins, and a design-system
  capstone — written in Stylus (indentation, variables, nesting,
  compile-time color math) and compiled live in the page by
  [go-styl](https://github.com/rohanthewiz/go-styl). Checks assert on
  the emitted CSS, so any correct styling passes.
- **Networking: TCP/UDP & IP** — 16 items implementing the protocols'
  decision procedures as testable Go, weighted toward the three every
  backend engineer ends up debugging: IPv4 addressing & CIDR, longest-prefix
  routing, the RFC 1071 Internet checksum, fragmentation offsets, TTL &
  traceroute, the 8-byte UDP header, socket demultiplexing, a reorder
  buffer, then TCP end to end — the three-way handshake, the RFC 9293 state
  machine, sliding-window flow control, fast retransmit, Reno congestion
  control (the sawtooth), teardown & TIME_WAIT — and iterative DNS
  resolution as the capstone.
- **Kubernetes: Beginner to Advanced** — 16 items on the mental model the
  CKA track's exam procedures hang off: pod phases, label selectors,
  probe debouncing, init containers, env/ConfigMap precedence, cluster
  DNS search paths, then the big idea — reconcile loops, Deployment →
  ReplicaSet revisions, ownership & garbage collection — through
  StatefulSet ordering, Jobs, CronJob policies, and the machinery
  operators are made of: informers & watches, lease-based leader
  election, admission webhooks, and a CRD reconciler capstone.
- **Databases: SQL to Storage Engine** — 16 items where every query runs
  against a real embedded engine,
  [bytdb](https://github.com/rohanthewiz/bytdb), compiled into the wasm and
  writing through an in-memory filesystem: SQL foundations (tables & types,
  predicates, joins, aggregates), integrity & change (constraints, upsert +
  RETURNING, parameters vs SQL injection — live, window functions),
  transactions (atomicity, snapshot isolation observed across two sessions,
  sequence gaps), then inside the engine — the ordered key space,
  order-preserving tuple encoding, secondary indexes judged by the real
  planner's EXPLAIN, WAL recovery (the engine really replays its log), and
  MVCC snapshots.
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
engine/runner-js.js  the 'js' runner plugin — pure JavaScript run by the
                     worker's own engine; same watchdog architecture
engine/worker-js.js  web worker hosting plain JS execution
engine/js-run.js     the JS execute core (strict, captured console, VIRTUAL
                     deterministic timers), shared verbatim with CI
engine/runner-html.js  the 'html' runner plugin — no worker: it only parses,
                     no user code executes
engine/html-run.js   the strict HTML validate-and-outline core (well-formedness
                     errors + canonical structure outline), shared verbatim
                     with CI
engine/kind-page.js  the 'page' item kind: sandboxed iframe preview (the
                     browser's forgiving view) above the validator's outline
engine/assemble.js   merges user code + problem harness into one Go program;
                     parses sentinel-delimited results out of stdout
tracks/<id>/         a track = manifest + items; plain script tags, no build step
wasm/                the interpreter: yaegi + trimmed stdlib symbols, plus
                     go-styl compiled in and element/serr staged as source
                     (wasm/runner/srcfs, for the TypeScript track)
third_party/typescript/   the TypeScript compiler (typescript.js) + the ES2020
                     lib.d.ts closure it type-checks against
```

A track declares a runner (`go-wasm`, `ts`, `js`, `html`, or none) and registers items of
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
An argument scopes the dynamic checks while authoring — `node
verify/verify.mjs html-pure` (one track) or `node verify/verify.mjs
html-pure/links` (one item); the Go toolchain is only invoked if the scope
actually needs the native runner.

Author a new problem by copying `tracks/leetcode/problems/two-sum.js`,
adding a `<script>` tag in `index.html`, and its id to the track manifest;
check it in isolation with `node verify/one.mjs tracks/leetcode/problems/<slug>.js`.
