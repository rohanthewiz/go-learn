# Session: Pure HTML track — the validator as the harness, the browser as the counterpoint

- **Session ID**: `da4865a9-4cd4-4640-9853-30589af1414f`
- **Date**: 2026-07-17
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0716-2331` (js-pure — third runner precedent,
  parallel-agent workflow) and `2026-0715-1701` (ts-pure — the
  runner-plugin seam)

## What this session did

Added the **Pure HTML** track (`html-pure`, 20 lessons, beginner →
advanced) — the first DOCUMENT-language track, riding a new kind of
execution seam: nothing executes; "running" is parsing. Also the first
new item KIND since kinds.js shipped (`page`), proving the
register-a-kind extension path the engine header always promised.

Final state: **321 items across 16 tracks** (html-pure=20 new).
`node verify/verify.mjs`: ALL PASS. One new SVG id site-wide
(`dgHP5arrow`), collision-free. Dev server serves every new path.

Per the user's request, the **element library is mentioned "here and
there"**: 7 lessons (hello-html, lists, semantic-layout, tables,
forms-basics, inline-styles, capstone-page) carry short Go asides showing
the same markup emitted by the element builder
(`b.Ul().R(element.ForEach(...))` …) and pointing at the
"TypeScript + Go Web" track; inline-styles also bridges to the Stylus
track.

## The architecture (new files)

```
engine/html-run.js     UMD validate-and-outline core, shared browser ⟷ CI:
                       strict parser → canonical structure outline (stdout)
                       or first validation error {error, line, col}
engine/runner-html.js  runner id 'html' — NO worker (parsing only, no user
                       code executes, linear + size-capped), Promise.resolve
                       wrapper keeps the kinds' contract
engine/kind-page.js    kind 'page': sandboxed <iframe srcdoc> live preview
                       (the browser's forgiving view) ABOVE the validator's
                       outline (what checks pin). Preview updates even on
                       validation failure — by design
```

What the type checker is to ts-pure and virtual timers are to js-pure,
the **VALIDATOR** is to this track. HTML5 *specifies* error recovery, so
browsers never show a syntax error — the red pane is the only honest
teacher of well-formedness, and the split pane (browser renders it anyway,
validator says no) is the track's core teaching device.

### Validator strictness (each rule is a lesson somewhere)

- Non-void elements need explicit closes, correctly nested (mismatch names
  the still-open tag and its line); closing a void element errors;
  `<div/>` errors with "the slash is IGNORED in HTML" (the real gotcha,
  reported instead of inherited).
- Duplicate attribute on a tag; duplicate id in the DOCUMENT.
- Bare `&` / stray `<` in text or attribute values (write `&amp;`/`&lt;`);
  named entities are a CLOSED table — `&nbps;` is an "unknown entity"
  error (the browser would render the typo literally).
- Doctype only before content; `<style>/<script>` bodies raw (CSS/JS are
  different languages — `&`/`<` legal inside, closing tag required).
- Fragments welcome (lessons before document-structure don't ship a
  skeleton).

### Outline serialization (deterministic, what checks pin)

2-space indent per depth; lowercase tag + attrs in SOURCE order
(`name="decoded value"`, booleans bare); text quoted with ASCII-whitespace
collapse (**NBSP survives** — decoded to U+00A0, deliberately not in the
collapse class, so a lesson can prove it differs from a space); comments
as `# text`; `doctype html`. Caveat for check authors: `flat` is
`stdout.replace(/\s+/g,' ')` and `\s` DOES match U+00A0, so NBSP pins must
go against `stdout`.

## Engine/platform touches (generic)

- `highlight.js`: editor() now dispatches 'html' (goHi.html was
  output-pane-only before; identity holds because swatches — the one
  non-identity decoration — only appear when the swatch arg is passed).
  Verified over 21 adversarial mid-edit states.
- `index.html`: 3 engine script tags (html-run on the PAGE, not a worker),
  `.pagekind` CSS (iframe forced `background:#fff; color-scheme:light` —
  an unstyled learner page is black-on-white in every real browser, the
  preview must match regardless of site theme), 21 track script tags.
- `verify/verify.mjs`: KNOWN_KINDS += 'page' (page items verify through
  the lesson code path); `htmlRun` lazy; **scoped runs**
  (`node verify/verify.mjs html-pure` or `html-pure/links`) — last
  session's rebuild-checkone.mjs-every-time problem, promoted into
  verify/ for good; the Go binary build is now LAZY (a scoped ts/js/html
  run never invokes the Go toolchain).
- README: track bullet + architecture entries; **also repaired a defect**:
  commit 904e40c (js-pure) had accidentally deleted the
  "**Rust for Go Devs**" bullet's header line — restored from
  `git show 98acf15:README.md`.

## The track (tracks/html-pure/)

Registration global `GoLearnHTMLP.lesson` sets `kind:'page', lang:'html'`.
starterError here means the starter MUST fail VALIDATION (vs ts-pure's
compile error / js-pure's runtime error).

| Category | Items |
|---|---|
| Foundations | hello-html, document-structure, text-essentials, lists, links, images |
| Structure & Semantics | semantic-layout, tables, entities-comments*, well-formed* |
| Forms | forms-basics, form-controls, form-validation |
| Attributes & Metadata | global-attributes, head-metadata |
| Rich Content | media-embeds, details-dialog |
| Advanced | inline-styles, accessibility, capstone-page |

(* = starterError: entities-comments opens on the real `bare "&"`
diagnostic while the preview happily shows "Fish & Chips"; well-formed is
the track's thesis lesson — its three bugs (strong/em mismatch, `</br>` +
`<div/>`, duplicate id) surface one red pane at a time, probe-confirmed.)

Design standouts: checks pin structure only reachable through the
feature — nesting via stdout indentation (`'main\n  article\n    h2\n'`),
decoded entities (`"Fish & Chips"`, `© 2026 Field Notes`), attribute runs
in dictated source order (`input id="email" name="email" type="email"`),
absence pins anchored to whole outline lines (`!/(^|\n) *b\n/` so tag
letters inside text can't false-match). Comment `# ...` lines appear in
the outline, so several agents strip them before pinning / word TODOs to
avoid pin collisions. images uses a data-URI SVG so the preview shows a
real picture; details-dialog is genuinely interactive in the preview
(zero-JS disclosure widgets); inline-styles' absence pin
`!flat.includes('style=')` proves the style ATTRIBUTE is gone.

## Workflow

Same as the js-pure/Database sessions: 8 parallel general-purpose
subagents (3+3+2+2+2+2+3+3 items by theme), all green FIRST pass on
assembly. Inputs: shared scratchpad `BRIEF.md` (outline format, validator
rules incl. the closed entity table, check contract with the flat-vs-
stdout and NBSP caveats, starter-valid-but-failing rule, element-aside
guidance with API shapes, data-URI image, verify loop) + detailed
per-item specs in each prompt. Agents iterated with the NEW scoped
verify — no per-agent checkone rebuild needed, which was the point.

## Verification done

- 41-case core battery (outline shapes, entities/NBSP, raw-text
  elements, fragments, every error class with line numbers, determinism).
- Highlighter text-identity for html() over 21 mid-edit states.
- Full `node verify/verify.mjs` → ALL PASS (16 tracks / 321 items).
- **Browser-path smoke test** (new this session): drove all 20 items
  through the REAL kind-page.js mount/run with a minimal DOM stub —
  starter never pre-solves, starterError shows the red pane, preview
  updates unconditionally, solution solves + markSolved fires.
- Dev server: user's running instance on :8080 already served every new
  path 200 (index.html 301 is Go FileServer's canonical redirect).
- NOT done: live click-through (Chrome extension still not connected).
  Eyeball http://localhost:8080 → track picker → "Pure HTML" once —
  especially the preview/outline split pane, which no session has seen
  rendered.

## Files

- New: `engine/html-run.js`, `engine/runner-html.js`,
  `engine/kind-page.js`, `tracks/html-pure/track.js` + 20 lessons/.
- Modified: `index.html`, `highlight.js`, `verify/verify.mjs`, `README.md`.
- No wasm rebuild — the Go side is untouched.
