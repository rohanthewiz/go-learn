/* bytdb — the embedded relational engine, driven live from Go.
 *
 * bytdb (github.com/rohanthewiz/bytdb) is compiled into the wasm binary,
 * so unlike the concept tracks every item here runs REAL statements
 * against a real engine: opening a database and reading Result rows,
 * $1-parameters and RETURNING, ON CONFLICT upsert, jsonb documents and
 * operators, CTEs and views, joins under EXPLAIN, secondary indexes and
 * order-aware index selection, transaction blocks with savepoints,
 * sequences and column defaults, and the table layer beneath SQL. The
 * database track teaches SQL-the-language on this engine; this track is
 * the engine's own manual — its API, its planner, its features.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'bytdb',
		title: 'bytdb: Embedded SQL in Go',
		runner: 'go-wasm',
		order: [
			// Getting Started
			'open-exec-query',
			'params-and-returning',
			// SQL Surface
			'upsert-on-conflict',
			'jsonb-documents',
			'ctes-and-views',
			// Planner
			'joins-and-explain',
			'indexes-and-ordering',
			// Transactions
			'transactions-savepoints',
			'sequences-and-defaults',
			// Engine
			'table-layer-direct',
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
		'	path := os.TempDir() + "/golearn-bytdb-" + slug + ".db"',
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
	globalThis.GoLearnBY = {
		HARNESS_RT: HARNESS_RT,
		DB_RT: DB_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('bytdb', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('bytdb', def);
		},
	};
})();
