/* redis — Redis from the wire protocol up, as runnable Go.
 *
 * No Redis server runs in the page; instead the learner IMPLEMENTS the
 * mechanisms that make Redis Redis: RESP framing, string keys with lazy
 * TTL expiry, atomic counters and rate limits, lists as queues, hashes
 * and sets, sorted-set leaderboards, maxmemory eviction (sampled LRU),
 * the RDB-vs-AOF durability trade, pub/sub fanout, and the SET NX PX
 * distributed-lock pattern with fenced release. Each item pins observable
 * Redis behavior (command semantics, reply shapes) so what passes here is
 * what redis-cli would show.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'redis',
		title: 'Redis: Structures to Server',
		runner: 'go-wasm',
		order: [
			// Protocol
			'resp-protocol',
			// Data Types
			'strings-ttl',
			'atomic-counters',
			'lists-queues',
			'hashes-objects',
			'sets-operations',
			'sorted-sets-leaderboard',
			// Server
			'lru-eviction',
			'persistence-rdb-aof',
			// Patterns
			'distributed-locks',
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
	globalThis.GoLearnRD = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('redis', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('redis', def);
		},
	};
})();
