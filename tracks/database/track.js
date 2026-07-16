/* database — SQL to storage engine, on a real database running in the page.
 *
 * Database courses usually pick a lane: SQL tutorials that treat the engine
 * as a magic box, or internals write-ups with no way to poke the thing. This
 * track refuses the split by shipping an actual engine: every query here
 * executes against bytdb (github.com/rohanthewiz/bytdb) — a relational
 * layer over an ordered key space in the CockroachDB mold, with a WAL,
 * snapshots, secondary indexes, and a Postgres-flavored SQL frontend —
 * compiled into the wasm binary and writing through an in-memory filesystem
 * (engine/memfs.js) in the browser. SELECTs return real rows, EXPLAIN shows
 * the real planner's choice, ROLLBACK really unwinds, and the engine
 * internals the later items implement (order-preserving key encodings, WAL
 * replay, MVCC snapshots) are the same mechanisms answering the queries.
 *
 * The arc: SQL foundations (tables, predicates, joins, aggregates) →
 * integrity and change (constraints, upsert, parameters-vs-injection,
 * window functions) → transactions (atomicity, snapshot isolation,
 * sequences) → inside the engine (the ordered key space, tuple encoding,
 * secondary indexes via EXPLAIN, WAL recovery, MVCC).
 *
 * Items live in problems/<slug>.js and register through GoLearnDB.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'database',
		title: 'Databases: SQL to Storage Engine',
		runner: 'go-wasm',
		order: [
			// SQL: foundations
			'tables-and-types', 'select-where', 'joins', 'aggregates-groupby',
			// Integrity & change
			'constraints', 'upsert-returning', 'prepared-statements',
			'window-functions',
			// Transactions
			'transactions-atomicity', 'isolation-snapshots',
			'sequences-identity',
			// Inside the engine
			'ordered-keyspace', 'tuple-encoding', 'secondary-indexes',
			'wal-recovery', 'mvcc-snapshots',
		],
	});

	// Every harness splices this in, so every harness import block includes
	// fmt and encoding/json. runCase isolates one test: a panicking user
	// implementation records a failure for that case but the harness still
	// reports every result (the sentinel must always print).
	var HARNESS_RT = [
		'// runCase executes one test body, converting a panic into a failed case.',
		'func runCase(r map[string]any, body func()) {',
		'	defer func() {',
		'		if p := recover(); p != nil {',
		'			r["pass"] = false',
		'			r["got"] = fmt.Sprintf("panic: %v", p)',
		'		}',
		'	}()',
		'	body()',
		'}',
		'',
		'// emitResults prints the sentinel-delimited JSON block the UI parses.',
		'// Printed last, so user output can never spoof it (the parser splits',
		'// on the LAST marker).',
		'func emitResults(results []map[string]any) {',
		'	buf, _ := json.Marshal(results)',
		'	fmt.Println("\\n__GOLEARN_RESULTS__")',
		'	fmt.Println(string(buf))',
		'	fmt.Println("__GOLEARN_END__")',
		'}',
	].join('\n');

	// DB_RT is the live-database prelude for harnesses that run SQL: splice
	// it in AFTER HARNESS_RT and import fmt, os, encoding/json,
	// github.com/rohanthewiz/bytdb, and github.com/rohanthewiz/bytdb/sql
	// (DB_RT itself uses all five, so none of the imports can dangle).
	//
	// openDB opens a FRESH database at a fixed per-item path. Fixed + remove
	// -first matters twice over: in the browser the wasm module (and its
	// in-memory filesystem) survives across runs, and natively repeated
	// verify runs hit the same /tmp — either way, run N+1 must not see run
	// N's rows. The returned cleanup closes the engine and deletes the file,
	// keeping real /tmp clean when the runner is the native binary.
	var DB_RT = [
		'// openDB opens a fresh bytdb database for this run (removing any',
		'// previous run\'s file first) and returns it with a cleanup func.',
		'func openDB(slug string) (*sql.DB, func()) {',
		'	path := os.TempDir() + "/golearn-db-" + slug + ".db"',
		'	os.Remove(path)',
		'	eng, err := bytdb.Open(path)',
		'	if err != nil {',
		'		panic(fmt.Sprintf("bytdb.Open(%s): %v", path, err))',
		'	}',
		'	return sql.New(eng), func() {',
		'		eng.Close()',
		'		os.Remove(path)',
		'	}',
		'}',
		'',
		'// mustExec runs harness-owned SQL that is not under test; failure is',
		'// a bug in the item, not the learner\'s code, so it panics loudly.',
		'func mustExec(db *sql.DB, q string, args ...any) *sql.Result {',
		'	res, err := db.Exec(q, args...)',
		'	if err != nil {',
		'		panic(fmt.Sprintf("harness SQL %q: %v", q, err))',
		'	}',
		'	return res',
		'}',
		'',
		'// rowsStr renders a result\'s rows compactly ("[[a 1] [b 2]]") so',
		'// cases can compare row sets as single want/got strings.',
		'func rowsStr(res *sql.Result) string {',
		'	return fmt.Sprintf("%v", res.Rows)',
		'}',
	].join('\n');

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnDB = {
		HARNESS_RT: HARNESS_RT,
		DB_RT: DB_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('database', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('database', def);
		},
	};
})();
