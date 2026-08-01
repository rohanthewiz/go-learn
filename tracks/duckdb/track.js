/* duckdb — the analytical (OLAP) engine, as runnable Go.
 *
 * DuckDB is the SQLite of analytics: in-process, but columnar and
 * vectorized where SQLite is row-at-a-time. This track has the learner
 * implement the ideas that produce its speed: columnar layout, 2048-value
 * vectors, dictionary and RLE/bit-packing compression, zone-map (min/max)
 * pruning, filter pushdown, hash aggregation, build/probe hash joins,
 * Parquet-style row groups, and out-of-core spilling. Numbers (vector
 * width, row-group size) are teaching constants passed by the harness;
 * the *mechanism* is the lesson.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'duckdb',
		title: 'DuckDB: Analytical Engine',
		runner: 'go-wasm',
		order: [
			// Storage
			'columnar-vs-row',
			// Execution
			'vectorized-execution',
			// Compression
			'dictionary-encoding',
			'rle-bitpacking',
			// Pruning
			'zone-map-pruning',
			'filter-pushdown',
			// Execution
			'hash-aggregation',
			'hash-join-build-probe',
			// Storage
			'parquet-row-groups',
			// Execution
			'out-of-core-spill',
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
	globalThis.GoLearnDK = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('duckdb', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('duckdb', def);
		},
	};
})();
