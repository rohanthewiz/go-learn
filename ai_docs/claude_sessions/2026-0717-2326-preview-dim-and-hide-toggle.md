# Session: Dim the white preview pane + hide/show toggle

- **Session id**: `4dd3f2f0-2d6c-4c73-90f6-85b422ecce8a`
- **Date**: 2026-07-17
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: `2026-0717-2307` (react/python/shell/odin tracks — the
  `app` kind whose preview pane this session tunes)

## What this session did

UX fix from a screenshot report: the live-preview iframe (React `app`
kind and Pure-HTML `page` kind) is intentionally forced white — an
unstyled page/app is white in any real browser — but at rest under the
dark site theme it was a glare panel. Two changes, both small:

1. **Dark-theme dimming** (`index.html` CSS only)
   - `#tresults .pagekind iframe.pv { filter: brightness(.72) }` with a
     `.18s` transition; `:hover` lifts the filter so true colors show
     exactly when the learner is looking at / interacting with the app.
   - The filter is a compositor effect on OUR side of the sandbox — the
     learner's document is untouched, so the "truthful white preview"
     pedagogy holds.
   - `@media (prefers-color-scheme: light)` sets `filter: none` — in
     light theme a white pane matches the chrome, and dimming would read
     as a disabled pane.

2. **Hide/show toggle** (`engine/kind-app.js`, `engine/kind-page.js`,
   plus CSS in `index.html`)
   - A small `hide`/`show` button at the right end of the "preview — …"
     label row (`.pane-lbl` became a flex row; button pinned with
     `margin-left: auto`).
   - Collapsing toggles class `pv-off` on `.pagekind`: the preview
     section shrinks to its label row (which stays as the reopen
     affordance) and `.ol-sec` (structure/console) absorbs the height.
   - The iframe is `display:none`d, NOT removed — `srcdoc` keeps
     rendering while hidden, so reopening shows the current app
     instantly and kind-app's "last good preview survives a broken run"
     guarantee holds across a toggle.
   - Persistence: localStorage key `golearn:pv-hidden` ('1'/'0'), read
     at skeleton build. It is a USER preference, not per-item state —
     one key shared by both kinds, so the choice survives lesson
     switches, track switches, and reloads. Reads/writes wrapped in
     try/catch like engine.js's `store` (private to engine.js, hence the
     tiny duplicated helper in each kind — matches the two kinds'
     existing deliberate skeleton duplication).

## Design decisions worth remembering

- Dim with `filter` on the iframe element, not by restyling the iframe
  document: keeps the preview honest and needs zero cooperation from
  learner markup.
- Hover-to-undim beats a brightness slider or theme-matching preview:
  zero UI, and the pane is at full fidelity precisely when attention is
  on it.
- Toggle wiring lives in each kind's `skeleton()` (rebuilt per item
  open; `run()` re-wires via the existing `if (!iframe)` rebuild path),
  so no engine.js API surface was added.

## Verification

- `node verify/verify.mjs` → ALL PASS (all tracks/items; harness has no
  dependency on the pagekind DOM — grepped first).
- `node --check` on both edited kind files.
- NOT done: live browser eyeball (Chrome extension not connected this
  session). Worth checking at http://localhost:8080 → React track:
  resting dim vs hover, the hide/show button, persistence across
  lesson/track switch, and the html-pure track's page kind.

## Files

- Modified: `index.html` (pagekind CSS: dim rules, `.pv-toggle`,
  `.pv-off` collapsed state), `engine/kind-app.js`,
  `engine/kind-page.js` (pvKey/pvHidden/wirePvToggle + button markup in
  skeleton).
- No wasm/build.sh rebuild needed — static files, dev server on :8080
  serves the repo dir directly.
