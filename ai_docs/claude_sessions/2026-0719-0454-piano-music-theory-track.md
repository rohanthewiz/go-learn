# Session: Piano & Music Theory track (18 problems, go-wasm runner)

- **Session id**: `db1abc28-8996-4751-be8d-4348b2004ef8`
- **Date**: 2026-07-19
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: `2026-0717-2326` (preview dim/toggle); track model follows
  `networking` / `aws-saa` / `system-design`

## What this session did

Added a complete new track: **`music` — "Piano & Music Theory"**, 18
problems, on the existing `go-wasm` runner. Zero engine changes — same
`kind:'problem'` machinery and sentinel-JSON harness protocol as the other
Go tracks. Premise mirrors networking/aws-saa: theory sticks when you
*compute* it — every item is a decision procedure a pianist actually runs
(which key is that note, what accidentals does Ab major carry, what chord
is this hand, which finger takes the F#).

The track's framing device (stated in track.js and used by every problem):
two number lines — the SEMITONE line (MIDI, piano keys, frequencies) and
the LETTER line (spelling, staff notation, key signatures). Classic theory
confusions (C# vs Db) are collisions of the two, and the problems compute
both explicitly.

### Items (6 categories)

- **Pitch & the Keyboard**: `note-names` (name↔MIDI, C4=60, octave flips
  at C), `keyboard-geometry` (black-key clusters {1,3,6,8,10}, 88-key
  numbering, white-key counting), `pitch-frequency` (440·2^((m−69)/12),
  cents, NearestMIDI)
- **Intervals**: `intervals` (semitone distances, names P1..P8,
  inversion = complement-to-octave `names[12-s]`), `interval-quality`
  (quality from SPELLED pairs: letter steps → number, semitones vs
  major/perfect baseline; C→E = M3 but C→Fb = d4)
- **Scales & Keys**: `major-scale`, `minor-scales` (nat/harm/mel;
  Eb harmonic's Cb→D aug-2nd pinned), `key-signatures` (signed count +
  ordered list, F C G D A E B / B E A D G C F), `circle-of-fifths`
  (relative pairs, signed FifthsDistance on the LINE of fifths — Gb=−6
  vs F#=+6, deliberately not mod-12)
- **Chords**: `triads`, `seventh-chords` (maj7/7/m7/m7b5/dim7),
  `chord-identification` (root+quality+inversion from spelled notes;
  dim7/aug rotation symmetry resolved by lowest-note-is-root convention)
- **Harmony**: `diatonic-chords` (qualities DERIVED from scale spans, not
  hardcoded — that's the lesson), `cadences` (authentic/plagal/half/
  deceptive over Roman-numeral pairs), `voice-leading` (BestVoicing:
  minimal total motion over inversion candidates, tie-break top-note then
  lower bass; C→F lands on second-inversion F because C stays)
- **At the Piano**: `scale-fingering` (RH fingering as the thumb-never-
  on-black rule: C/G/D/A/E → 12312345, F → 12341234), `transposition`
  (letters-first algorithm, preserves interval spelling not just
  semitones), `rhythm-durations` (Beats in n/d meter, FillsMeasure with
  exact 64ths arithmetic)

## How it was built

Six parallel background agents, one per category, all working from a
shared authoring brief (scratchpad) that pinned the track conventions:
pitch classes, sharp/flat orders, interval/chord semitone tables, scale
patterns, gold-standard file = `tracks/networking/problems/`
`internet-checksum.js`. Each agent iterated against the scoped verifier
until green; main session ran the final full gate and hand-checked the
pinned musical facts across all 18 harnesses.

## Findings worth remembering

1. **yaegi bug (workaround in `transposition.js`)**: named return values
   leak across calls when `return` sits inside a `switch` — a previous
   call's named-return value bleeds into the next call. Plain locals +
   unnamed returns behave. Any future track solution using named returns
   with switch-embedded returns should be audited.
2. **verify.mjs is hostile to parallel authoring**: it `require`s every
   `tracks/...` script tag from index.html at module-load; ANY missing
   file → hard MODULE_NOT_FOUND crash before a single check runs. The
   agents converged on scratchpad mirror-verifiers (same assemble.js +
   native runner) until the last sibling landed. A graceful-skip (missing
   file → static FAIL, keep going) would fix this; not done this session.
3. Harness float comparisons: always `fmt.Sprintf("%.2f")` strings, never
   raw floats — followed from the brief, no flakes.
4. SVG `<marker>` ids share the page namespace — music track uses
   `dgArrowMus??` per-file suffixes (established convention held).

## Verification

- `node verify/verify.mjs` (FULL suite, all 21 tracks) → **ALL PASS**;
  music=18: every starter compiles-but-fails, every solution passes all
  tests with clean stderr; static checks (manifest order, script tags,
  sentinels) green.
- Musical facts hand-verified in review: F# major's E#, Eb harmonic
  minor spelling, B dim = B D F, Bm7b5 vs Bdim7, voice-leading minima
  (machine-checked against the stated candidate rule by the harmony
  agent), 442 Hz = +7.85 cents, A415→G#4, fingering tables.
- NOT done: live browser eyeball of the new track (dev server :8080).

## Files

- New: `tracks/music/track.js` (manifest: 18-item order, GoLearnMusic
  registrar, duplicated HARNESS_RT per track-independence convention),
  `tracks/music/problems/*.js` (18 files, ~5,600 lines).
- Modified: `index.html` (19 script tags after the database block).
- No wasm/build.sh rebuild needed — track files are static JS; the Go
  interpreter binary is unchanged.
