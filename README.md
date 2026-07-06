# go-learn

Interactive, in-browser programming tutorials — solve real problems in **Go**,
right in the page. No server, no toolchain, no sign-up: the Go interpreter
([yaegi](https://github.com/traefik/yaegi)) runs compiled to WebAssembly.

**Live: https://rohanthewiz.github.io/go-learn/**

## Tracks

- **LeetCode in Go** — 15 classic problems across 8 categories (arrays &
  hashing, stack, two pointers, sliding window, binary search, linked lists,
  trees, dynamic programming). Each has a statement with an SVG intuition
  diagram, a live editor run against real test cases as you type, and a
  solution with a full walkthrough and complexity notes.
- **Go basics** — a short on-ramp (hello, slices & loops, maps) for readers
  new to Go.

Plus a free-form **Playground** tab: any Go main program → stdout.

## Architecture

The platform is a generic engine + pluggable content tracks:

```
engine/engine.js     registries + Learn view UI (knows nothing about tests)
engine/kinds.js      item kinds: 'lesson' (check stdout) and 'problem' (test table)
engine/runner-go.js  the 'go-wasm' runner plugin (watchdog + respawn)
engine/worker.js     web worker hosting the interpreter — an infinite loop in
                     user code gets its worker terminated, never the page
engine/assemble.js   merges user code + problem harness into one Go program;
                     parses sentinel-delimited results out of stdout
tracks/<id>/         a track = manifest + items; plain script tags, no build step
wasm/                the interpreter: yaegi + trimmed stdlib symbols (~3 MB gz)
```

A track declares a runner (`go-wasm`, or none) and registers items of some
kind; adding a new track — or a new *kind* of track (quizzes, system design)
— requires no engine changes. See `tracks/go-basics/track.js` for the
smallest possible example.

How a problem run works: the user edits a complete Go file (no `main`); the
track merges it with the problem's hidden test harness (imports deduped),
the wasm interpreter runs the merged program, and the harness reports
per-test results as sentinel-delimited JSON on stdout — user prints land in
a console pane, and compile-error lines map back to the editor.

## Development

```sh
./build.sh              # build go-learn.wasm + copy wasm_exec.js
go run ./serve          # http://localhost:8080
node verify/verify.mjs  # check every problem/lesson against the native runner
```

`verify.mjs` enforces, for every problem: the starter compiles but fails at
least one test, and the solution passes all of them — with the exact merge
code and interpreter the browser uses. CI runs it before every deploy.

Author a new problem by copying `tracks/leetcode/problems/two-sum.js`,
adding a `<script>` tag in `index.html`, and its id to the track manifest;
check it in isolation with `node verify/one.mjs tracks/leetcode/problems/<slug>.js`.
