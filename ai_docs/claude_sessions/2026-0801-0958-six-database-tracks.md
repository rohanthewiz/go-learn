# Session: Six Database Tracks (postgres, redis, sqlite, duckdb, bytdb, btypedb)

Session ID: `59943631-0c05-401a-856e-c282a44e5b87`

## What was done

Added six new tracks (60 items total, all `runner: 'go-wasm'`, all kind `problem`),
taking the site from 27 to 33 tracks. Full `node verify/verify.mjs` prints ALL PASS.

| Track | Title | Mode | Items |
|---|---|---|---|
| postgres | PostgreSQL: Internals & Ops | decision-procedure (aws-saa style) | 10 |
| redis | Redis: Structures to Server | implement-the-mechanism | 10 |
| sqlite | SQLite: The File Format Up | byte-format internals | 10 |
| duckdb | DuckDB: Analytical Engine | OLAP mechanics | 10 |
| bytdb | bytdb: Embedded SQL in Go | LIVE against the compiled-in engine | 10 |
| btypedb | btypedb: Durable KV Engine | implement-the-mechanism (API in prose) | 10 |

The request named "Bytdb" and "BtypeDB" — clarified with the user: these are
`github.com/rohanthewiz/bytdb` and `github.com/rohanthewiz/btypedb` (the user's
own engines), plus DuckDB.

## Process (the placeholder-first pattern, third successful use)

1. Scaffolded everything with a generator script (session scratchpad
   `gen-tracks.mjs`): six `track.js` files (namespaces `GoLearnPG/RD/SQ/DK/BY/BT`),
   60 dynamically-valid placeholders (starter fails, solution passes, sentinel
   prints), 66 script tags spliced into `index.html` after the zig block.
2. Verified placeholders green per track BEFORE authoring (verify.mjs hard-crashes
   on missing files, so placeholders must land first for parallel authoring).
3. Six parallel background agents, one per track, each with the full gotcha brief,
   gold standards (`networking/problems/internet-checksum.js`; live-DB:
   `database/problems/select-where.js` + `database/track.js` DB_RT), assigned SVG
   marker suffixes `dgArrowPG01..BT10`, and scoped-verify iteration loops.
   The duckdb agent stalled once mid-delegation; a SendMessage resume finished it.
4. Full-suite verify, memory update, this doc.

## Key design decisions

- **bytdb track runs live** — bytdb{,/sql,/tuple} are compiled into the runner
  (wasm/symbols). The track is the "engine's own manual" (API, planner, features),
  deliberately distinct from the `database` track (SQL-the-language on the same
  engine). Its `track.js` duplicates DB_RT per the tracks-are-independent-plugins
  convention, with openDB slugs `by-<item>` to avoid temp-file collisions.
- **btypedb cannot run live**: its API is generic (`Open[K,V]`) and yaegi reflect
  extracts can't express generics (documented in `wasm/symbols/gen.sh`). Track
  teaches by reimplementation — real API quoted in prose `{lang:'go'}` blocks,
  learner implements the mechanism underneath (log framing `op|klen|vlen|key|val|
  crc32`, batch replay, torn-tail recovery, COW snapshots, savepoints, comparator
  indexes, compaction) — all anchored to `~/projs/go/btypedb/README.md`.
- No wasm rebuild needed: no symbol changes.

## New gotchas learned (also saved to project memory)

- `encoding/binary` and `hash/crc32` are NOT in the yaegi symbol set — byte-format
  items hand-roll big-endian shifts and table-driven CRC-32/IEEE as part of the
  lesson.
- bytdb v0.7.0 (pinned) facts, probed empirically: `Result{Cols,Types,Rows,
  RowsAffected,Tag,Notice}`; `DEFAULT nextval(...)` rejected ("DEFAULT must be a
  constant") — use SERIAL or nextval in VALUES; order-serving Index Scans only
  under LIMIT; no `pg_views` (use `pg_class` relkind 'v'); transaction control
  statements require a `sql.Session`; engine layer (CreateTable/Insert/Get/
  ScanRange as iter.Seq2-called-with-yield-closure) drives fine under yaegi.
- Local repo READMEs can be AHEAD of the go.mod-pinned version — trust the
  wasm/symbols extracts + empirical verify runs, not the README.

## Files touched

- `index.html` — +66 script tags
- `tracks/{postgres,redis,sqlite,duckdb,bytdb,btypedb}/` — new (track.js + 10
  problem files each)
- Memory file `golearn-track-authoring-gotchas.md` updated (user-level, not in repo)

## Follow-up ideas

- The database track's DB_RT uses path `golearn-db-<slug>`; bytdb track uses
  `golearn-bytdb-by-<slug>` — no collision, but a shared convention doc could help.
- Possible future: extract btypedb symbols if it ever grows a non-generic facade.
