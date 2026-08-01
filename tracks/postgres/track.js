/* postgres — PostgreSQL internals and operations, as runnable Go.
 *
 * The premise mirrors the aws-saa track: Postgres know-how sticks when you
 * *compute* the thing instead of memorizing the doc bullet. Every item takes
 * one mechanism the server actually runs — heap page layout, MVCC tuple
 * visibility, HOT chains, autovacuum triggers, xid wraparound, WAL LSN
 * arithmetic, the planner cost model, index-type selection, the lock
 * conflict matrix, isolation-level anomalies — and has the learner
 * implement the decision procedure PostgreSQL documents. Constants that
 * look like GUCs are teaching defaults passed in by the harness; the
 * *procedure* is the skill and is invariant under tuning drift.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'postgres',
		title: 'PostgreSQL: Internals & Ops',
		runner: 'go-wasm',
		order: [
			// Storage
			'heap-page-layout',
			// MVCC
			'tuple-visibility',
			'hot-updates',
			// Maintenance
			'vacuum-autovacuum',
			'freeze-wraparound',
			// WAL & Recovery
			'wal-lsn-math',
			// Planner
			'explain-cost-model',
			'index-selection',
			// Concurrency
			'lock-conflict-matrix',
			'isolation-levels',
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
	globalThis.GoLearnPG = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('postgres', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('postgres', def);
		},
	};
})();
