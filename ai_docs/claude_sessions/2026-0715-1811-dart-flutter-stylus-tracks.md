# Session: Dart, Flutter, and Stylus/CSS tracks (three commits)

- **Session ID**: `9564b2fd-1256-4658-a442-c08244d5eaf6`
- **Date**: 2026-07-15
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0715-1701` (Pure TypeScript track)

## What this session did

Added three full tracks, each committed and pushed separately as requested:

| Commit | Track | Items | Mold |
|---|---|---|---|
| `f0860f2` | **Dart for Go Devs** (`dart`) | 16 | rust-track: the language's rules as runnable Go |
| `222da83` | **Flutter Internals** (`flutter`) | 12 | system-design: implement the framework's algorithms |
| `ef765e1` | **CSS via Stylus** (`stylus`) | 16 | typescript-track: go-styl compiles the sheet live |

Final state: **231 items across 11 tracks** (leetcode=93, go-basics=14,
system-design=24, aws-saa=12, cka=13, typescript=6, ts-pure=17, rust=8,
**dart=16, flutter=12, stylus=16**). `node verify/verify.mjs`: ALL PASS
after each commit. **Zero engine changes** — all three ride the existing
`go-wasm` runner and lesson/problem kinds; no wasm rebuild (Go side
untouched).

## Dart track (tracks/dart/)

Global `GoLearnDart` (HARNESS_RT duplicated per track-independence
convention). 12 lessons + 4 harness problems across: Null Safety
(sound-null-safety, null-aware-ops, **type-promotion**·M, late-variables),
Values & Functions (final-vs-const canonicalization pool, named-params,
cascades), Classes & Mixins (**mixin-linearization**·M, extension-methods
static dispatch), Collections & Patterns (collection-if-spread,
records-patterns, **sealed-exhaustive**·M — tree coverage, richer than
rust's flat match-exhaustiveness), Async (async-await split-at-await,
**event-loop**·H — the two-queue microtask/event scheduler with reentrant
scheduling, streams as async* via channel + single-subscription bit),
Isolates (send copies, mutation-after-send test). 3 SVG diagrams
(marker ids dgArrowDNS / dgArrowDMX / dgArrowDEL).

Teaching moves worth reusing: replay-a-program-through-a-tracker (the
rust ownership-moves pattern) for null safety and late; the "fields
never promote" asymmetry gets its own harness tests; event-loop's
`Action{Op, Text, Body []Action}` recursive struct works fine in yaegi.

## Flutter track (tracks/flutter/)

Global `GoLearnFlutter`. 9 lessons + 3 problems: Widgets & Reconciliation
(widget-tree walk, can-update — Widget.canUpdate verbatim, **keys**·M —
positional vs identity matching, 7 tests incl. the checkbox bug),
State & Rebuilds (stateless-vs-stateful — didUpdateWidget vs re-init,
**set-state**·M — dirty propagation as one ancestorRebuilt boolean,
const-widgets — identical-instance stop condition), Layout (constraints
clamp — "constraints down, sizes up", **flex-layout**·M — two rounds,
overflow, integer dust to last flex child), Context (inherited-widget
upward walk), Interaction & Navigation (hit-testing reverse paint order,
navigator pushReplacement/popUntil), Async UI (future-builder snapshot
machine, error-before-data branch order). 3 diagrams (dgArrowFLK,
dgArrowFLC/FLCu, keys-diff picture).

## Stylus track (tracks/stylus/)

Global `GoLearnStylus` with a **`program(sheetLines)` helper** that wraps
Stylus sheet lines in the shared Go compile-and-print harness
(styl.Compile + Options{Pretty: true}), so lesson files contain
stylesheet lines, not Go plumbing. The sheet starts on the line after
the opening backtick (go-styl tolerates the leading newline — probed).

16 lessons, CSS principles as the subject, Stylus as the pen, go-styl
mentioned but not the focus (per request): Foundations (hello-css rule
anatomy + SVG, cascade-specificity — win by adding context `.nav .cta`,
inheritance — dedupe via body, count-based check), Selectors
(selectors-nesting `> li` / `&:hover`, pseudo-classes zebra+hover),
Box Model & Units (box-model — border-box reset + SVG, units — rem scale
via `base * 1.5`, colors — derived hover via darken), Layout
(display-flow inline-block/none, flexbox + axes SVG, grid fr/span 2,
positioning — relative parent catches absolute child), Responsive &
Motion (media-queries — nested & bubbled, mobile-first; transitions-
keyframes — transform/opacity principle), Abstraction (mixins truncate()
— check counts `text-overflow: ellipsis;` === 2, capstone — 4-TODO
design system).

### go-styl v0.2.0 findings (probed against the native runner first)

- Supports: vars, nesting, `&`, `> li`, mixins (args + no-arg), if/for,
  interpolation, calc passthrough, `@media` (incl. **nested → bubbled
  out**), `@keyframes` (from/to and %), lighten/darken/rgba/hsl (all
  compile to hex/rgba), unit arithmetic (`1rem * 0.875` → `0.875rem`),
  `grid-column span 2`, `translateY(-2px)`, `//` comments.
- Exact values used in checks: `lighten(#06c, 20%)` → `#0a85ff`,
  `darken(#06c, 20%)` → `#0052a3`, `darken(#06c, 12%)` → `#005ab4`,
  `hsl(200, 100%, 50%)` → `#0af`.
- Pretty output format: tab-indented, `prop: value;`, blank line between
  rules — flat (whitespace-collapsed) checks like
  `@media (min-width: 768px) { .sidebar { width: 300px; } }` work.

## Verification & workflow notes

- Per-track loop: author all files → `node --check` each → wire
  index.html script tags + README bullet → full `node verify/verify.mjs`
  (builds the native ./wasm runner once) → commit + push. All three
  tracks passed verify on the **first** run.
- `verify/one.mjs` only handles problem-kind items; mixed tracks need
  the full verify.
- Feature-probe pattern (scratchpad `probe*.go` piped into the built
  native runner) is the cheap way to pin third-party output formats
  before writing checks against them.
- Lesson-check gotchas honored: starter must compile AND fail check;
  count-based checks (`match(...).length === N`) distinguish solutions
  whose output would otherwise equal the starter's (inheritance, mixins).
- NOT done (same caveat as last session): live-browser click-through —
  eyeball `go run ./serve` → track picker → the three new tracks once.

## Files

- New: `tracks/dart/track.js` + 16 problems/, `tracks/flutter/track.js`
  + 12 problems/, `tracks/stylus/track.js` + 16 lessons/.
- Modified: `index.html` (3 track blocks, 47 script tags), `README.md`
  (3 track bullets).
