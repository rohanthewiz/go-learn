# Session: Statistics + Zig tracks (20 + 16 problems, go-wasm runner)

- **Session id**: `18f3c87b-b763-486e-8a6e-d8e5007d6b9c`
- **Date**: 2026-07-28 (started 2026-07-26)
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: `2026-0726-2023` (docker track); same placeholder-first
  parallel authoring playbook, but with 4 items per agent (9 agents for
  36 items) instead of one agent per item.

## What this session did

Added TWO tracks in one pass, both on the existing `go-wasm` runner with
zero engine changes:

1. **`stats` — "Statistics"**, 20 problems, beginner → advanced. Premise:
   statistics is usually taught as formulas to memorize; here the learner
   IMPLEMENTS each one (Bessel's correction, the t-statistic, the
   chi-square fold, the bootstrap loop) and the harness pins the numbers
   a textbook or R would give.
2. **`zig` — "Zig for Go Devs"**, 16 problems, modeled directly on the
   `odin` track: real Zig code + its real behavior shown in the prose,
   then the learner implements that rule as pure Go. Zig cannot run in
   the page — that constraint IS the curriculum.

### stats items (5 categories, 5 Easy / 9 Medium / 6 Hard)

- **Describing Data**: `mean-median-mode`, `variance-spread` (VarP vs
  VarS, why n−1), `quartiles-outliers` (R-7 percentiles, 1.5·IQR
  fences), `zscores-empirical-rule` (68/95/99.7), `covariance-correlation`
  (Pearson r, parabola r=0 trap)
- **Probability**: `probability-rules` (inclusion–exclusion, conditional,
  independence), `bayes-theorem` (base-rate fallacy 1%/99%/95% → 0.1667,
  sequential updates), `binomial-poisson` (multiplicative C(n,k), iterative
  Poisson terms — no factorials), `normal-distribution` (erf-based CDF,
  quantile via ±10σ bisection)
- **Sampling & Estimation**: `sampling-clt` (seeded LCG
  `seed*1664525+1013904223`, sample means, σ/√n), `confidence-intervals`
  (z vs t width, NeededN ceil boundary)
- **Hypothesis Testing**: `hypothesis-ttest` (embedded t-crit table,
  same t rejects at df=29 not df=4), `two-sample-welch`
  (Welch–Satterthwaite fractional df), `chi-square-independence`
  (expected-from-margins), `power-effect-size` (Cohen's d,
  Φ(d√(n/2)−zα), NeededN per group)
- **Modeling & Advanced**: `linear-regression-inference` (OLS, r²,
  slope t), `anova-oneway` (F = t² at k=2 pinned), `mann-whitney`
  (midranks, Ux+Uy=nx·ny invariant), `bootstrap-resampling` (same LCG,
  percentile CI of the median), `bayesian-beta-binomial` (conjugate
  update by addition, grid-approximation credible interval)

### zig items (6 categories, 2 Easy / 9 Medium / 5 Hard)

- **Values & Errors**: `optionals-orelse` (`Opt{Valid,V}` model),
  `error-unions-try` (Try/Catch/first-error propagation machine),
  `error-sets` (sorted-set algebra, subset-coerces-up), `defer-errdefer`
  (two-stack scope machine; inner-block defer fires BEFORE later body ops
  — the scope rule Go lacks; errdefer skipped-in-place on success)
- **Numbers & Layout**: `integer-overflow-ops` (checked/`+%`/`+|` trios
  for u8 and i8; Go truncated-`%` correction for signed wrap),
  `explicit-casts` (`@intCast` checked, `@truncate` low-bits, CanCoerce
  truth table), `packed-structs` (first-field-lowest-bits Pack/Unpack,
  RGB565 `25/52/23 → 0xbe99`)
- **Slices & Strings**: `slices-sentinels` (SpanLen/ToSentinel/CStrEqual,
  "the type's promise" of a NUL), `strings-bytes` (hand-rolled Eql/
  IndexOf/CodepointCount — framing-only UTF-8 decoder)
- **Types & Comptime**: `tagged-unions-switch` (exhaustiveness as the
  headline; unhandled-variant error contract), `comptime-eval` (format-
  string checker — comptime as partial evaluation, vs Go's bolted-on
  vet), `comptime-generics` (monomorphizer bookkeeping: first-use-order
  dedup of stamped `Generic(TypeArg)` symbols)
- **Memory & Runtime**: `allocators-arena` (bump allocator with alignment
  padding; OOM leaves Off unmoved; FreeAll as the point), 
  `arraylist-growth` (`cap = cap + cap/2 + 8` staircase, GrowthTrace,
  ToOwnedSlice reset), `undefined-unreachable` (Debug/ReleaseSafe/
  ReleaseFast 2×3 grid, 0xAA debug fill)
- **Capstone**: `capstone-tokenizer` (sentinel scan + error-union
  propagation + tagged tokens; `constant`-is-an-ident prefix trap,
  `1__0`/`1_` malformed numbers)

## Verification

`node verify/verify.mjs stats` and `... zig` both print **ALL PASS** —
36/36 items, 313 test cases total, zero regressions across the other 25
tracks (static checks now read `stats=20 zig=16`, 27 tracks). SVG marker
ids checked collision-free page-wide (suffix scheme `ST??` / `ZG??`,
assigned per item in the agent prompts).

## Playbook notes (what worked / what's new)

- Same placeholder-first flow as android/aiml/docker: track.js + 36
  dynamically-VALID placeholders (starter fails, solution passes a
  1-case harness) + all index.html script tags landed before any agent
  spawned — verify stayed green for the whole session.
- 9 agents × 4 items each (vs 1 agent per item previously) worked
  cleanly; every agent reported first-pass ALL PASS. The shared brief
  (`/tmp/golearn-brief.md`) carried the full gotcha list from MEMORY.md;
  per-item specs in the prompts pinned exact formulas, method variants
  (R-7 percentiles, Welch df), error strings, and the LCG verbatim.
- Agents were told to GENERATE expected values by executing the
  algorithm in throwaway scripts, never to guess — several credited this
  as the reason for first-pass success.
- **New gotcha recorded in MEMORY.md**: the verify child occasionally
  deadlocks at 0% CPU even with the sandbox disabled. Remedy: kill only
  the specific stuck runner PIDs and re-invoke verify one item per Bash
  call. Never kill broadly.
- Both LCG problems (`sampling-clt`, `bootstrap-resampling`) redeclare
  the generator verbatim in starter AND solution (solutions replace the
  starter wholesale — the `constant definition loop` trap).

## State at session end

- Committed: `tracks/stats/`, `tracks/zig/`, `index.html` script tags,
  this session doc. `.cats-todo/` left untracked (local tool state,
  predates the session).
- Follow-up ideas (not started): a `zig` build-mode lesson using
  `starterError: true`; multiple-regression or time-series items if the
  stats track grows; README track table may want the two new rows.
