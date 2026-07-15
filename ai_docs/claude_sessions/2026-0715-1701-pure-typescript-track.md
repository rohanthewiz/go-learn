# Session: Pure TypeScript track — real tsc in the browser

- **Session ID**: `80ad8ffa-e6f7-4571-896f-518baa345112`
- **Date**: 2026-07-15
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0711-2332` (Go track advanced)

## What this session did

Added the **Pure TypeScript** track (`ts-pure`, 17 lessons, fundamentals →
intermediate) — the first track whose *editor holds TypeScript*, not Go.
This required a second execution backend: the platform's runner seam
(`GoLearn.registerRunner`) got its first non-Go plugin, backed by the real
TypeScript compiler vendored as JS and run in a web worker. Strict-mode
type-checking gates every run — a type error means no output at all — so
the checker itself is the test harness of every exercise.

Final state: **187 items across 8 tracks** (leetcode=93, go-basics=14,
system-design=24, aws-saa=12, cka=13, typescript=6, **ts-pure=17**, rust=8).
`node verify/verify.mjs`: ALL PASS.

## The runner architecture (new files)

```
third_party/typescript/   TypeScript 6.0.3: typescript.js (8.7 MB) + the
                          45-file ES2020 lib.d.ts reference closure (424 KB)
engine/ts-run.js          UMD compile-and-run core, shared browser ⟷ CI:
                          strict check → emit → new Function(console) exec →
                          settle one macrotask (async output) → collect
engine/worker-ts.js       worker host: importScripts compiler + core, fetch
                          libs, then 'ready'; runs serialized on a promise
                          queue so results leave in request order
engine/runner-ts.js       runner id 'ts' — runner-go.js's watchdog/respawn
                          pattern, but LAZILY spawned on first run() so only
                          TS-track visitors download the ~9 MB compiler
```

Key decisions and gotchas:

- **TS 6.0.3, not 7.x**: npm `latest` is 7.0.2 = the Go-native `tsgo`
  binary — no JS API, unusable in a worker. 6.0.3 is the last JS compiler.
  `module: None` is deprecated in 6.0 → `ignoreDeprecations: '6.0'`.
- **`vendor/` broke `go build`** — the Go toolchain treats a directory
  literally named `vendor` as a module vendor tree ("inconsistent
  vendoring"). Moved to `third_party/typescript/`.
- **Ambient world = ES2020 + `console` only** (EXTRA_DTS in ts-run.js). No
  DOM, no timers: `setTimeout` is a *type error*, so every lesson program
  is deterministic and one `setTimeout(0)` settle suffices to flush all
  promise/async prints before stdout is collected.
- Lib SourceFiles are parsed once and cached across programs: first compile
  ~140 ms, warm compiles **~3–8 ms** (fine for the 300 ms debounce).
- Diagnostics → the runner error shape `{error, line, col}`: first error
  supplies the mappable position, subsequent ones carry `line N:C —`
  prefixes in the message body.
- Our own console shim formats output (JSON-ish, Map/Set/bigint aware) so
  browser and CI see byte-identical stdout.

## Engine/platform touches (generic, not track-specific)

- `highlight.js`: `goChunk` refactored to `chunk(text, st, prof)` with
  GO_PROF/TS_PROF word-class profiles (TS template literals scan exactly
  like Go raw strings); new `goHi.ts()`; `editor()` takes an optional
  per-paint `lang` getter. Text-identity invariant verified for both.
- `engine/engine.js`: prose `block()` dispatches `lang:'ts'`; editor gets a
  lang getter reading `items[cur].lang`; "open in playground" hides for
  non-Go items (the playground is Go-only).
- `verify/verify.mjs`: tracks with `runner:'ts'` execute through the same
  ts-run.js core under Node (`exec = t.runner === 'ts' ? tsRun : run`, loop
  awaits both). New lesson flag **`starterError: true`** — starter MUST
  fail to compile (the diagnostic is the lesson), solution must run clean.

## The track (tracks/ts-pure/)

Registration global `GoLearnTSP.lesson` sets `kind:'lesson', lang:'ts'`.
Categories → items:

| Category | Items |
|---|---|
| Foundations | hello-types*, functions, objects, arrays-tuples |
| Unions & Narrowing | unions-literals, narrowing*, discriminated-unions, type-predicates |
| Objects & Classes | interfaces-intersections, classes, enums-as-const |
| Generics | generics, generic-types, keyof-indexed |
| Type Transformation | utility-types, mapped-types |
| Async | promises-async |

(* = `starterError` lessons: hello-types ships a TS2322, narrowing ships
the classic TS2339 `.toUpperCase()` on `string | number`.)

Design principle: since a type error suppresses ALL output, exercises are
built so the required stdout is only reachable through the lesson's type
feature — e.g. `type-predicates` prints `f.depth` (exists only on the
narrowed type), `keyof-indexed`'s check asserts `'undefined'` is ABSENT so
the bogus `pluck(user, "nope")` call must be deleted (which only the real
`<T, K extends keyof T>` signature rejects), `utility-types` pins the
printed patch to exactly `{"email":...}` (only expressible once the param
is `Partial<User>`). Three SVG diagrams (marker ids namespaced `dgArrowTSDU`
/ `dgArrowTSST` / `dgArrowTSG`): union splitting on its tag, structural
typing, T flowing through inference.

Starters that must compile clean dodge two traps: excess-property checks on
fresh literals (interfaces-intersections passes `origin` through a
variable) and fields referenced before they exist on a type (objects lesson
orders the TODOs so the type edit comes first).

## Verification done

- `node verify/verify.mjs` → ALL PASS (8 tracks / 187 items; the two
  starterError lessons confirmed to error-then-pass).
- Worker protocol exercised end-to-end by running the actual
  `engine/worker-ts.js` under Node with importScripts/fetch/postMessage
  shims: boot → ready(6.0.3) → ordered results → error line-mapping →
  async capture.
- `node --check` on every new/modified JS; dev server (`go run ./serve`)
  confirmed serving every new path (worker fetches libs as text, MIME
  irrelevant).
- NOT done: live-browser click-through (Chrome extension not connected).
  Eyeball `http://localhost:8080` → track picker → "Pure TypeScript" once.

## Files

- New: `engine/ts-run.js`, `engine/worker-ts.js`, `engine/runner-ts.js`,
  `third_party/typescript/*` (46 files, 9.2 MB), `tracks/ts-pure/track.js`
  + 17 lesson files.
- Modified: `index.html` (runner + 18 script tags), `engine/engine.js`,
  `highlight.js`, `verify/verify.mjs`, `README.md`.
- No wasm rebuild needed — the Go side is untouched.
