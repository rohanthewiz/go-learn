# Session: Networking and K8s tracks (two commits, agent-authored)

- **Session ID**: `ffb08ea1-2b7c-48ae-beb4-badf9fa6e56c`
- **Date**: 2026-07-15
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0715-1811` (Dart/Flutter/Stylus tracks)

## What this session did

Added two full tracks, committed and pushed separately (per request:
"commit and push each track separately once verified"):

| Commit | Track | Items | Mold |
|---|---|---|---|
| `aa8d969` | **Networking: TCP/UDP & IP** (`networking`) | 16 | cka-track: protocol decision procedures as testable Go |
| `d09e058` | **Kubernetes: Beginner to Advanced** (`k8s`) | 16 | cka-track, but the MENTAL MODEL half (no CKA overlap) |

Final state: **263 items across 13 tracks** (leetcode=93, go-basics=14,
system-design=24, aws-saa=12, cka=13, typescript=6, ts-pure=17, rust=8,
dart=16, flutter=12, stylus=16, **networking=16, k8s=16**).
`node verify/verify.mjs`: ALL PASS at both commit points. Zero engine
changes; no wasm rebuild (Go side untouched).

## Workflow: parallel agent authoring (NEW — first time in this repo)

Unlike prior sessions (solo authoring), the 32 item files were authored
by **8 parallel general-purpose subagents** (4 items each), each given:
exemplar files to read (cka/scheduler-fit.js for problems,
dart/sound-null-safety.js for lessons), a conventions checklist, precise
per-item specs (algorithms, test cases, SVG marker-id prefixes), and a
mandatory self-verify loop. All 8 batches came back green.

Supporting pieces built first:
- `tracks/networking/track.js` (global `GoLearnNet`) and
  `tracks/k8s/track.js` (global `GoLearnK8s`), HARNESS_RT duplicated per
  track-independence convention.
- **scratchpad `checkone.mjs`** — a generalized verify/one.mjs that
  takes (trackfile, itemfiles...) and handles BOTH kinds (one.mjs is
  hardcoded to leetcode + problem-kind). Uses a prebuilt native runner
  via `GOLEARN_RUNNER` env var. Worth promoting into verify/ someday.
- Marker-id collision across concurrent agents happened once
  (dgArrowKLE vs leetcode's kth-largest-element) — flagged by one agent,
  fixed by the offending agent itself (dgArrowKLEax/KLElead/KLEacc).
  Site-wide `grep 'marker id=' | uniq -d` confirmed clean.

### Split-commit mechanics

index.html/README were wired for both tracks up front, then the k8s
chunks were stripped to scratchpad files (python re), networking
verified + committed + pushed, chunks re-inserted, full verify, k8s
committed + pushed. Verify reads script tags from index.html, so the
networking-only state verified cleanly with k8s files on disk but
unwired.

## Networking track (tracks/networking/)

Categories: IP (ipv4-addressing·L, cidr-subnetting, longest-prefix-match,
internet-checksum, ip-fragmentation, ttl-traceroute·L), UDP (udp-header,
port-demux — 4-tuple vs 2-tuple demux, udp-reorder), TCP (tcp-handshake·L
ladder diagram, tcp-state-machine — table-driven RFC 9293,
sliding-window, retransmission — 3-dup-ACK fast retransmit + RTO
doubling, congestion-control·H — Reno sawtooth flagship SVG,
tcp-teardown·L — TIME_WAIT lost-ACK replay), Application (dns-resolution
— iterative walk, longest-suffix referrals, CNAME restart-from-root).

## K8s track (tracks/k8s/)

Beginner→advanced arc: Pods (pod-phases·L, labels-selectors — incl.
NotIn-matches-absent-key gotcha, probes — threshold debounce machine,
init-containers·L), Config (env-config — envFrom/env precedence,
service-dns·L — search-list qualification), Controllers (reconcile-loop·L
— flagship control-loop SVG + level-triggered demo,
deployment-replicasets — rollback-creates-nothing test, owner-gc —
dual-owner survival, orphan policy), Stateful & Batch
(statefulset-ordering — OrderedReady gate, jobs — overshoot guard,
backoff off-by-one probed both sides, cronjob-schedule — 3 concurrency
policies + startingDeadline catch-up), Advanced (informers-watch·L —
stale-RV guard + RELIST, leader-election — lease CAS, deposed-leader
case, admission-webhooks — mutate-then-validate chain, failurePolicy,
crd-operator·L capstone — WebApp CR diff→actions).

## yaegi gotchas discovered (agents hit these; avoid in future items)

- `string == any` comparison panics (`reflect.Value.SetBool on interface
  Value`) — compare against local typed variables, not `r["want"]`.
- Tuple assignment `a, b = len(x), y` silently drops the second value —
  use two separate assignments when one RHS is `len()`.
- Comparing two `map[string]any` values directly also reflect-panics.
- (Known constraints: trimmed stdlib — no encoding/binary, no net, no
  slices/maps pkgs; manual byte packing; simulated integer clocks.)

## Verification & workflow notes

- Per-agent loop: read exemplars → author → `node --check` →
  checkone.mjs → iterate. All 32 items green before the final full
  verify; one agent's hand-computed IPv4 checksum constant was wrong and
  caught by the runner (0x11e6 → 0xb1e6).
- NOT done (same caveat as prior sessions): live-browser click-through —
  eyeball `go run ./serve` → track picker → the two new tracks once.

## Files

- New: `tracks/networking/track.js` + 16 problems/, `tracks/k8s/track.js`
  + 16 problems/.
- Modified: `index.html` (2 track blocks, 34 script tags), `README.md`
  (2 track bullets).
