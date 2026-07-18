# Session: Four tracks in one pass — React, Python, Unix Shell, Odin

- **Date**: 2026-07-17
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: `2026-0717-2150` (html-pure — the outline serializer this
  session reuses for React grading, the scoped-verify workflow) and
  `2026-0716-2331` (js-pure — the worker/runner template, parallel-agent
  authoring)

## What this session did

Added FOUR tracks and THREE new execution backends in one session:

- **React** (18 lessons, kind `app` — NEW, runner `react` — NEW)
- **Python** (22 lessons, kind `lesson`, runner `py` — NEW, real CPython)
- **Unix Shell** (18 lessons, kind `lesson`, runner `sh` — NEW, a
  purpose-built deterministic shell)
- **Odin for Go Devs** (14 problems, kind `problem`, runner `go-wasm` —
  zero engine changes, the rust/dart move)

Final state: **20 tracks, 445 items** (`node verify/verify.mjs` → 394 ok
lines, ALL PASS). Browser-path smoke (stub-DOM drive of the REAL kinds)
passes for all 58 new lesson/app items. README updated (4 track bullets +
architecture entries). ~15 MB of new vendored assets, all lazy-loaded.

## The three new backends

### React — one compilation, two renders
```
third_party/react/     React 18.3.1 UMD dev builds (react, react-dom,
                       react-dom-server-legacy.browser) — dev, not prod:
                       the warnings are curriculum
engine/react-run.js    core: ts.transpileModule (JSX syntax only, the
                       deliberate opposite of ts-pure) → execute with React
                       in scope → REQUIRE a component named App →
                       renderToStaticMarkup → html-run.js OUTLINE →
                       stdout = outline + "-- console --" section
engine/worker-react.js lazy worker: importScripts typescript.js + React UMDs
engine/runner-react.js runner-ts.js clone, id 'react'
engine/kind-app.js     kind 'app': sandbox="allow-scripts" iframe mounts the
                       SAME compiled js live (result carries a `js` field);
                       outline pane = the deterministic initial frame
```
Key decisions: React dev warnings are CAPTURED (global console.error/warn
swapped during exec+render) into stdout as `warn:` lines with the
`Warning:` prefix stripped — the lists-keys lesson pins the warning's
ABSENCE. Duplicate DOM ids surface as the validator's duplicate-id error
with a friendly hint (it's a real React bug pattern). The preview iframe
gets an opaque origin (no allow-same-origin) — learner code cannot reach
the page or its solved-state storage; relative `<script src>` still loads
(srcdoc inherits the parent base URL). On a failed run the last good
preview stays up (no fresh `js`), like a hot-reload server. Hooks lessons
grade the INITIAL render + console traces; the useState lesson makes the
frozen-outline-vs-live-preview split the pedagogy itself.

### Python — real CPython, determinism pinned at boot
```
third_party/pyodide/   Pyodide 314.0.2 (CPython 3.14): pyodide.js (CJS for
                       Node/verify), pyodide.mjs (ESM for the worker),
                       pyodide.asm.{mjs,wasm}, python_stdlib.zip, lock file
                       (~13.5 MB total; 22 MB go wasm is the precedent)
engine/py-run.js       core: fresh globals dict per run (+__name__), RAW
                       byte sinks via setStdout({write}) — NOT batched mode
                       (batched buffers a print(end="") tail into the NEXT
                       run; found by the test battery) — tracebacks cleaned
                       to <exec> frames, line = deepest user frame
engine/worker-py.js    the engine's ONE MODULE worker ({type:'module'}):
                       pyodide.asm.mjs is ESM and classic workers can't
                       dynamic-import; PYTHONHASHSEED=0 passed at
                       loadPyodide (must precede interpreter start)
engine/runner-py.js    runner-ts.js clone, id 'py', module-worker spawn
```
verify.mjs's `pyRun` boots the SAME vendored files under Node (~1 s,
cached promise). Banned in lessons: input(), wall clock, unseeded random,
asyncio, raw set printing (sorted() convention; the hash seed is the
safety net, not the style).

### Shell — determinism BY CONSTRUCTION (the html-run move, but executing)
```
engine/sh-run.js       ~1000-line POSIX-subset interpreter, UMD, shared
                       browser/CI: quoting ('' "" \), expansions ($VAR,
                       ${V}, ${V:-d}, ${#V}, ${V%pat}/##, $(cmd) with
                       subshell var isolation, $((arith)), $?, ~, $1..$9/
                       $#/$@ in functions), field splitting, globs (* ? [] ,
                       sorted, unmatched stays literal), pipelines, ; && ||,
                       redirections (> >> < 2> 2>> 2>&1), heredocs
                       (<<EOF expanding / <<'EOF' literal), if/elif, for-in,
                       while, case (glob patterns, | alts), functions
                       (local/return/shift), test/[, and ~25 coreutils over
                       a SEEDED per-run memfs. No worker: a STEP BUDGET
                       (20k) + output cap replace the watchdog — while true
                       is a red pane in microseconds.
engine/runner-sh.js    main-thread runner like runner-html.js, id 'sh'
```
Seeded fs: `/home/learner` (notes.txt, fruit.txt, .profile, todo/,
projects/{alpha,beta}), `/var/log/app.log` (fixed 10-line service log:
INFO=5 WARN=2 ERROR=3; api=4 db=4 cache=2 — the text-tool lessons mine
it), `/etc/motd`. No date/$RANDOM/sleep/ls -l — absences are named as
design in prose. 76-case battery in scratchpad covers tokenizer→capstone
pipeline. Known quirks (documented, lessons authored around them): heredoc
bodies keyed by delimiter name (use distinct delimiters per script);
heredoc extraction sees `<<` in comments; case patterns don't cross `/`
(dispatch on `$(basename $f)`); no `( )` subshells, `[[ ]]`, arrays,
brace expansion, `read`, `&`; `:` absent — use `true`.

### Odin — the rust/dart move, no engine changes
`tracks/odin/` — "Odin for Go Devs", runner `go-wasm`, kind `problem`,
duplicated HARNESS_RT (tracks are independent plugins). 14 problems:
ZII zero-value machine, distinct types, enums & bit_set, tagged unions,
array programming (element-wise + swizzles), **scope-based defer** (both
schedulers implemented and diffed — the track's sharpest Go contrast),
the context system (scope-restored dynamic scoping), slices vs [dynamic]
(realloc generation invalidating views), arena allocators (align + bump +
free_all), #soa offset arithmetic, or_return/or_else (executed-count pins
the short-circuit), explicit overloading (untyped-literal preference +
ambiguity), $T monomorphization (instantiation dedup count), capstone
pipeline (ZII + union dispatch + arena exhaustion mid-batch).

**yaegi landmines found by agents** (worth remembering for go-wasm tracks):
mutually recursive struct types (A↔B) hang/zero-read the interpreter —
self-recursion via `[]Type` is safe (restructure to parallel slices);
`return someSlice, len(x)` in one statement panics ("reflect: call of
reflect.Value.SetInt on slice Value") — bind the int first.

## Platform touches (generic)
- `highlight.js`: NEW `py` scanner (# comments, triple-quote state across
  lines, string prefixes, decorators) and NEW `sh` scanner (recursing into
  $(…), $-expansions painted inside double quotes, command-position
  tracking); editor() dispatches 'py'/'sh'; both identity-verified over
  adversarial mid-edit states. React lessons use lang 'js'.
- `engine/engine.js`: prose-snippet dispatch += `py`, `sh` (presentation
  only — the registries stayed untouched, the header invariant holds).
- `verify/verify.mjs`: KNOWN_KINDS += 'app'; exec dispatch += react
  (UMDs loaded with module/exports hidden so they global-attach, exactly
  like importScripts), py (async cached-promise boot), sh.
- `index.html`: engine block += runner-react/kind-app/runner-py/
  sh-run+runner-sh (cores for react/py live in their workers, NOT page
  scripts); 4 track script blocks (72 item tags).
- Titles: repo convention is plain `&` in title:/nav: (escape() renders
  it); normalized across all four new tracks.

## Authoring workflow
Same as js-pure/html-pure but larger: stub files + index.html tags FIRST
so the scoped verify loop works for every agent from minute one (static
checks require all files present); per-track BRIEF.md in scratchpad
(runtime contract, check rules incl. literal-true, seeded-fs contents,
banned features) + runone-{react,py,sh}.mjs debug harnesses; then
**19 parallel general-purpose agents** (5 react / 5 python / 4 odin /
5 shell), each verifying with `node verify/verify.mjs <track>/<id>`.
One friction point: odin agents transiently broke each other's full-file
loads mid-write (verify requires every script tag's file to parse) — two
agents ended up polling for siblings; their own files were fine and the
final track verify passed. Lesson: BRIEFs could tell agents to iterate
with `verify/one.mjs` when sibling files are in flux.

## Verification done
- Node battery per core: react-run 12 cases, py-run 10 (caught the
  batched-stdout leak), sh-run 76 (caught only my own wc arithmetic).
- Full `node verify/verify.mjs` → ALL PASS (20 tracks / 445 items / 394
  dynamic-check lines).
- Browser-path smoke: all 58 react/python/shell items driven through the
  REAL kind-app/kinds.js mount/run with a stub DOM — starter never
  pre-solves, starterError shows the red pane, solutions solve +
  markSolved, app previews carry the React mount scaffolding.
- highlight.js identity checks for py (17 cases) and sh (12 cases).
- NOT done: live click-through (no Chrome connection this session).
  Eyeball http://localhost:8080 → "React" (the app kind's live preview —
  click a counter; no session has seen it rendered), "Python" (first run
  pays the ~13 MB Pyodide boot — watch the loading state), "Unix Shell",
  and "Odin for Go Devs". Also worth an eyeball: py/sh editor
  highlighting.

## Files
- New: `engine/{react-run,worker-react,runner-react,kind-app,py-run,
  worker-py,runner-py,sh-run,runner-sh}.js`, `third_party/react/` (4),
  `third_party/pyodide/` (7), `tracks/react/` (1+18), `tracks/python/`
  (1+22), `tracks/shell/` (1+18), `tracks/odin/` (1+14).
- Modified: `index.html`, `highlight.js`, `engine/engine.js`,
  `verify/verify.mjs`, `README.md`.
- No wasm rebuild — the Go side is untouched.
