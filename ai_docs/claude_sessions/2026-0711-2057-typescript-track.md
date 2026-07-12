# Session: TypeScript + Go Web track (element/go-styl live in the browser)

- **Session ID**: `ec1a9196-e704-4ad9-bf26-c1123575b777`
- **Date**: 2026-07-11
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0711-2004` (four-track expansion)

## What this session did

Added a sixth track, **`typescript`** ("TypeScript + Go Web") — 6 lessons
building a one-binary web app: element writes the HTML, go-styl compiles the
CSS, TypeScript 7 (`tsgo`, the Go-native compiler) emits the JS, rweb serves
it with the CSS/JS embedded. Unlike all prior tracks this one needed
**interpreter changes**: the lessons import real third-party packages, and
the element/go-styl code runs live in the page. Final state: **151 items
across 6 tracks** (leetcode=93, go-basics=3, system-design=24, aws-saa=12,
cka=13, typescript=6). `node verify/verify.mjs`: ALL PASS.

## Interpreter work (the new capability)

Two different integration strategies, chosen per package:

| Package | Strategy | Why |
|---|---|---|
| `element` + `serr` | **Source staged** into a virtual GOPATH (`wasm/runner/srcfs`, embedded via `go:embed all:srcfs`) | `element.ForEach`/`ForEach2` are generic — reflection-based extracts cannot express generics; yaegi interprets them fine. Same proven pattern as the element playground (`~/projs/go/element/playground`). |
| `go-styl` | **Extracted symbols** (compiled in, `wasm/symbols/github_com-rohanthewiz-go-styl.go`) | Generics-free exported API; a whole CSS compiler is too much code to interpret per keystroke — `styl.Compile` runs at native speed. |

Key pieces:

- `wasm/runner/runner.go` — gained `gopathFS()`/`buildGopathFS()`/
  `elementCompat()` (adapted from the element playground): stages
  `srcfs/element` + `srcfs/serr` into an `fstest.MapFS`, rewrites
  `element_debug.go` (inlines its `//go:embed` assets, replaces the `clear`
  builtin) because yaegi can't process either. Interpreter now gets
  `GoPath: "."` + `SourcecodeFilesystem`.
- `build.sh` — new `./build.sh stage` step: copies element/serr sources
  **from the module cache** (versions pinned by go.mod, reproducible in CI)
  into `wasm/runner/srcfs/`. Full build stages then compiles. Also `rm -f
  wasm_exec.js` before copy (GOROOT's read-only mode survives `cp` and
  blocks the next overwrite).
- `wasm/runner/pins.go` — build-tagged (`//go:build pins`, never set) blank
  imports of element/serr so `go mod tidy` keeps deps that no compiled code
  imports.
- `wasm/symbols/gen.sh` — added 4 stdlib extracts the staged element/serr
  *sources* need: `sync`, `runtime`, `path/filepath`, `encoding/base64`;
  plus the go-styl extract.
- `.github/workflows/pages.yml` — verify job now runs `./build.sh stage`
  first (fresh checkout has no `srcfs/`; the `go:embed` would fail to
  compile the native runner).
- `.gitignore` — `wasm/runner/srcfs/` (staged artifact, not committed).

Binary cost: **3.2 MB gz** (was ~3 MB). Lessons importing element run in
80–130 ms in the shipped wasm (measured under Node via `wasm_exec.js` +
`goRun.run`), well inside the 5 s watchdog.

## Track content (`tracks/typescript/`)

`track.js` registers id `typescript`, all `kind:'lesson'` (run file as-is,
check stdout), helper `GoLearnTS.lesson()`. Lessons, in nav order:

1. **hello-element** (One Binary) — pipeline SVG diagram (page.go/app.styl/
   app.ts → one binary → browser); element builder basics (`.R()`, `.T()`,
   attribute pairs). Task: `<title>Go × TS</title>` + h1.
2. **components-loops** (HTML in Go) — generic `ForEach`, `Component`
   interface, `RenderComponents`, `b.F()`. Task: loop 3 links + Footer
   component.
3. **styl-basics** (CSS in Go) — `styl.Compile` + `Options{Pretty}`,
   variables, `&:hover`, compile-time `lighten()`. Checks assert exact
   computed hex (`lighten(#0af, 20%)` = `#3bf`).
4. **embed-css** (CSS in Go) — compile-at-boot pattern (`//go:embed
   app.styl`), inline via `b.Style().T(css)` (no HTML-escaping inside
   `<style>` — verified); tips on `rweb/middleware/stylus` and `styl.Prune`
   critical CSS. `lighten(#0af, 25%)` = `#40bfff`, `(pad / 2)` = `8px`.
5. **typescript-7** (TypeScript) — standard TS (interface, typed DOM via
   `querySelector<T>`, strict-null guard), tsconfig, `npm i -D
   @typescript/native-preview` / `npx tsgo -p tsconfig.json` (drop-in for
   tsc, ~10× faster; stable TS 7 ships it as `tsc`). Type erasure → emitted
   JS as a Go const → `b.Script().T(appJS)` last child of body.
6. **rweb-capstone** (Ship It) — full production `main.go` in prose
   (read-along: wasm has no sockets): `//go:embed` both artifacts,
   compile-at-boot with `log.Fatal(serr.Wrap(...))`, `rweb.NewServer` +
   `RequestInfo` middleware + handler returning `serr.Wrap`. Learner
   completes pure `renderPage(css, js, features)`. Compressed CSS asserted
   exactly: `.hero{padding:48px 24px;background:#0b1020}…`.

Authoring gotcha: lesson starters must compile *and* fail the check;
`_ = sheet` / `_ = Footer{}` keep unused-variable starters compiling.

## Verification

- `node verify/verify.mjs` — ALL PASS (static checks + every
  starter/solution through the native runner).
- Shipped-artifact check: Node script instantiating `go-learn.wasm` via
  `wasm_exec.js`, running two lesson solutions through `goRun.run` and the
  real `check()` functions — both pass.
- Browser check via Chrome extension was attempted but the extension wasn't
  connected; the Node wasm run covers the same interpreter path.

## Known wrinkles / follow-ups

- `go vet ./...` now flags two **upstream** element lints (lock-by-value in
  `element_debug.go`) because staged sources sit inside the module tree.
  Harmless; CI doesn't vet. Fixing upstream element would silence it.
- README Tracks list was refreshed (was stale at "15 problems").
- Fresh clones must run `./build.sh` (or `stage`) before any native
  `go build ./wasm` / verify — documented in README.
- go.sum notes: element v0.5.6, go-styl v0.2.0, serr v1.4.0.
