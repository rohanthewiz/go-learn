/* sqlite — SQLite from the file format up, as runnable Go.
 *
 * SQLite's defining property is that the database IS one file with a
 * published, stable format — so this track teaches the format itself:
 * the 100-byte header, varints, serial types, the record format, B-tree
 * page cell lookup, rowid vs WITHOUT ROWID keying — then the semantics
 * layered above it: type affinity (the exam-grade decision procedure),
 * rollback journal vs WAL, the five-state file locking protocol, and the
 * planner's index-choice heuristics. Byte layouts follow the official
 * fileformat2.html; what parses here parses in sqlite3.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'sqlite',
		title: 'SQLite: The File Format Up',
		runner: 'go-wasm',
		order: [
			// File Format
			'file-header',
			'varint-encoding',
			'serial-types',
			'record-format',
			'btree-page-lookup',
			// Semantics
			'type-affinity',
			'rowid-and-without-rowid',
			// Durability
			'journal-vs-wal',
			'locking-states',
			// Planner
			'query-planner-choices',
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

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnSQ = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('sqlite', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('sqlite', def);
		},
	};
})();
