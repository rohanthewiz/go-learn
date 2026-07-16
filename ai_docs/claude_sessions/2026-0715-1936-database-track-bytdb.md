# Session: Database track — bytdb as the live engine

- **Session ID**: `8d8cff3b-ad17-400c-aa9b-6888e268a943`
- **Date**: 2026-07-15
- **Repo**: `~/projs/go/go-learn` (branch `master`)
- **Builds on**: session `2026-0715-1849` (Networking/K8s tracks; reused its
  parallel-agent authoring workflow)

## What this session did

Added the **Databases: SQL to Storage Engine** track (`database`, 16 items)
where every query runs against **bytdb** (github.com/rohanthewiz/bytdb) — a
real relational engine over an ordered key space — compiled into the wasm
binary. This is the first track needing new ENGINE plumbing since the
TypeScript track: bytdb does real file I/O (btypedb WAL), and the browser
has no filesystem.

Final state: **279 items across 14 tracks** (database=16 new).
`node verify/verify.mjs`: ALL PASS. All 16 items additionally verified
through the actual wasm+memfs browser path (one resident instance, all
sequential — proves cross-run isolation).

## Engine plumbing (the enabling work)

- **go.mod**: pins `bytdb v0.0.0-20260712062454-861153926ff9` (pushed HEAD;
  no tags exist). Pulled in btypedb v0.5.0 + tidwall/btype (indirect).
  go directive bumped 1.26 → 1.26.1 (bytdb requires it).
- **Symbols route** (like go-styl, unlike element/serr source-staging):
  `yaegi extract` of `bytdb`, `bytdb/sql`, `bytdb/tuple` into
  `wasm/symbols/` — bytdb's exported API is generics-free so reflect
  extracts cover it, and interpreting a SQL parser/planner per run would be
  far too slow. **btypedb is NOT extracted** (generic API `Open[K,V]` —
  reflect can't express it; lessons reach it only through bytdb).
  gen.sh regenerates all three.
- **`wasm/symbols/os-partial.go`** — HAND-WRITTEN partial extract: only
  `os.Remove`/`os.RemoveAll`/`os.TempDir`. Deliberate: full os would hand
  interpreted code `os.Exit`, which terminates the resident wasm module and
  bricks subsequent runs until worker respawn.
- **`engine/memfs.js`** (new) — in-memory Node-style fs implementing the
  contract in `$GOROOT/src/syscall/fs_js.go`. Key subtleties (all bit us or
  nearly did):
  - read/write receive `position` ONLY after a Go-side Seek; otherwise
    position is null and the shim owns the per-fd cursor.
  - stat objects need every numeric field setStat reads PLUS
    `isDirectory()` as a *method* (fs_js.go's Open calls it — this was the
    one live bug found in Node testing).
  - errors must carry Node `.code` strings ("ENOENT"...) — Go maps codes.
  - `writeSync(2, ...)` must exist (runtime panic path via wasmWrite).
  - Directory opens exist solely for btypedb's SyncDir (open+fsync+close).
- **`engine/worker.js`**: `importScripts('memfs.js')` BEFORE wasm_exec.js —
  wasm_exec only installs its ENOSYS stub when `globalThis.fs` is
  undefined, so load order is the routing mechanism.
- **wasm size**: 14M → 22M (gitignored; CI rebuilds via build.sh).

### Fresh-DB-per-run convention

The browser wasm (and its memfs) is resident across runs; native verify
reuses /tmp. So track.js's `DB_RT` harness runtime provides
`openDB(slug)` → fixed path `os.TempDir()+"/golearn-db-<slug>.db"`,
`os.Remove` first, cleanup func closes+removes. Lessons do the same dance
visibly in their starter programs (that's the pedagogy).

## Track content (tracks/database/)

track.js exposes `GoLearnDB` with `HARNESS_RT` (runCase/emitResults, same
as other tracks) + `DB_RT` (openDB/mustExec/rowsStr; harnesses splicing it
must import exactly: encoding/json, fmt, os, bytdb, bytdb/sql).

Categories: SQL: Foundations (tables-and-types·L, select-where, joins,
aggregates-groupby), Integrity & Change (constraints, upsert-returning,
prepared-statements — live SQL injection, window-functions), Transactions
(transactions-atomicity·L, isolation-snapshots — two live sessions,
sequences-identity), Inside the Engine (ordered-keyspace·L — CockroachDB
layering + live EXPLAIN, tuple-encoding — cross-checked against real
bytdb/tuple, secondary-indexes — EXPLAIN-judged, wal-recovery·L — engine
really replays its WAL across Close/reopen, mvcc-snapshots — toy versioned
store + live two-session closer).

## Workflow

Same as the Networking/K8s session: 8 parallel general-purpose subagents,
2 items each, all green first pass. Inputs per agent: a shared
`BRIEF.md` (item shapes incl. the lesson-vs-problem split — lessons run
starter DIRECTLY with a JS `check(stdout, flat)`, no harness merge — the
DB_RT contract, live-probed dialect facts, yaegi gotchas, style demands,
verify loop) + per-item specs with assigned SVG marker prefixes
(dgArrowDB??  — no collisions site-wide, verified). Agents probed engine
behavior via throwaway programs piped to a prebuilt native runner, and
self-verified with a scratchpad `checkone.mjs` (generalized one-item
verifier mirroring verify.mjs rules — REBUILT this session since scratchpads
are session-scoped; still worth promoting into verify/ someday).

## bytdb dialect facts probed live (for future items)

- `= NULL` is REJECTED at parse time (`cannot compare with NULL; use IS
  [NOT] NULL`) — Postgres instead returns empty.
- Full Postgres upsert surface incl. `excluded.<col>`, conditional
  `DO UPDATE ... WHERE`. Dup PK on plain INSERT says `duplicate primary
  key`; UNIQUE columns say `unique index violation`; CHECK →
  `violates check constraint "t_qty_check"` (auto-named); NOT NULL →
  `null value in column "x" of relation "t" violates not-null constraint`.
- **Sequences/SERIAL are REFUNDED on rollback** (opposite of Postgres!) —
  counter is one more MVCC key; affordable under the single-writer lock.
  Failed autocommit inserts don't burn ids either.
- Isolation: real repeatable read inside `BEGIN [READ ONLY]` blocks; bare
  session reads take per-statement snapshots; a second concurrent plain
  BEGIN ERRORS (`would deadlock`) rather than queueing — keep learner code
  away from concurrent writable blocks.
- EXPLAIN wording: `Point Get on t` / `Seq Scan on t` / `Index Scan using
  idx on t` (+ `Limit` node); order-only index chosen ONLY when LIMIT
  bounds the scan; ASC index can serve `ORDER BY ... DESC` as
  `Index Scan Backward`; a redundant index on the PK is invisible to
  EXPLAIN (Point Get either way).
- LIMIT works (README omits it). `DATE '...'` literals and
  `sum(x)::float` casts DON'T. GROUP BY/HAVING don't see SELECT aliases;
  ORDER BY does (and positions). Aggregate in WHERE: `aggregates are not
  allowed in WHERE; use HAVING` verbatim.
- `tuple.Encode(vals ...any) ([]byte, error)`, `tuple.Compare(a, b []any)
  int`; encoding carries type tags, strings end 0x00 0x01 with 0x00→
  0x00 0xFF escape — cross-check SIGN of order, not raw bytes.
- BEGIN/COMMIT/SAVEPOINT need `db.NewSession()`; DDL refuses txn blocks;
  `database/sql` stdlib does not exist in the interpreter.

## Verification & caveats

- verify.mjs ALL PASS (14 tracks / 279 items) with the rebuilt binary; the
  263 pre-existing items were re-verified after the wasm rebuild.
- wasm+memfs pass: scratchpad `wasm-items.mjs` ran every solution through
  go-learn.wasm under Node with memfs — ALL PASS, 7–56 ms.
- NOT done: live-browser click-through (Chrome extension wasn't connected
  this session) — eyeball `go run ./serve` → Databases track once.

## Files

- New: `engine/memfs.js`, `wasm/symbols/os-partial.go`,
  `wasm/symbols/github_com-rohanthewiz-bytdb{,-sql,-tuple}.go`,
  `tracks/database/track.js` + 16 problems/.
- Modified: `engine/worker.js`, `wasm/symbols/{gen.sh,symbols.go}`,
  `go.mod`, `go.sum`, `index.html` (17 script tags), `README.md`.
