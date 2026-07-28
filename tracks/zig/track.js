/* zig — Zig for Go developers: the language's rules as runnable Go.
 *
 * Zig cannot run in this page (the only native runner is Go-in-wasm), and
 * as with Odin, Rust, and Dart that constraint is the curriculum: Zig's
 * creed — no hidden control flow, no hidden allocations, errors and
 * optionals in the type system — is best absorbed by IMPLEMENTING each
 * rule as a pure Go function against a test harness. Each item shows real
 * Zig code and its real behavior (an error union forcing `try`, `+%`
 * wrapping where `+` would panic, errdefer firing only on the error path,
 * comptime folding a format string into code), then has the learner build
 * that semantic in Go and diff it against what Go does instead. You
 * understand `try` by writing the propagation machine — the same move the
 * Odin track makes with the context system. Zero engine changes, same
 * kind:'problem' machinery.
 *
 * Problems live in problems/<slug>.js and register through
 * GoLearnZig.problem(). HARNESS_RT is duplicated from the other tracks on
 * purpose: tracks are independent plugins, and sharing runtime snippets
 * across tracks would couple their load order.
 *
 * Curriculum (16 items): optionals & orelse → error unions & try → error
 * sets → defer & errdefer → overflow operators → explicit casts → packed
 * structs → slices & sentinels → strings as bytes → tagged unions &
 * exhaustive switch → comptime evaluation → comptime generics → arena
 * allocators → ArrayList growth → undefined & unreachable → a capstone
 * tokenizer.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'zig',
		title: 'Zig for Go Devs',
		runner: 'go-wasm',
		order: [
			// Values & Errors
			'optionals-orelse', 'error-unions-try', 'error-sets', 'defer-errdefer',
			// Numbers & Layout
			'integer-overflow-ops', 'explicit-casts', 'packed-structs',
			// Slices & Strings
			'slices-sentinels', 'strings-bytes',
			// Types & Comptime
			'tagged-unions-switch', 'comptime-eval', 'comptime-generics',
			// Memory & Runtime
			'allocators-arena', 'arraylist-growth', 'undefined-unreachable',
			// Capstone
			'capstone-tokenizer',
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
	globalThis.GoLearnZig = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('zig', def);
		},
	};
})();
