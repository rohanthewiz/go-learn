/* btypedb — the durable ordered KV engine, mechanism by mechanism.
 *
 * btypedb (github.com/rohanthewiz/btypedb) is a memory-resident ordered
 * KV store: a copy-on-write B-tree in RAM, durable through an append-only
 * log. Its exported API is generic (Open[K, V]) which yaegi's reflect
 * extracts cannot express — so instead of driving it live, the learner
 * IMPLEMENTS each mechanism the real engine uses, pinned to the shapes in
 * btypedb's own docs: codecs, ordered scans with pivots, TTL deadlines,
 * the framed log record (op|klen|vlen|key|val|crc32), replay with
 * all-or-nothing batches, torn-tail recovery, O(1) COW snapshots,
 * transactional staging with savepoints, comparator-defined secondary
 * indexes, and compaction. Prose shows the real API; the code you write
 * is what runs under it.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'btypedb',
		title: 'btypedb: Durable KV Engine',
		runner: 'go-wasm',
		order: [
			// API & Codecs
			'kv-codecs',
			// Ordering
			'ordered-scans',
			// API & Codecs
			'ttl-live-len',
			// Durability
			'wal-record-framing',
			'wal-replay',
			'torn-tail-recovery',
			// Transactions
			'cow-snapshots',
			'tx-batch-commit',
			// Ordering
			'secondary-index-comparators',
			// Durability
			'compaction-rewrite',
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
	globalThis.GoLearnBT = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('btypedb', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('btypedb', def);
		},
	};
})();
