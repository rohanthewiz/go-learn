/* odin — Odin for Go developers: the language's rules as runnable Go.
 *
 * Odin cannot run in this page (the only native runner is Go-in-wasm), and
 * as with Rust and Dart that constraint is the curriculum: Odin reads like
 * a cousin of Go — procedures, slices, defer, value semantics — which is
 * exactly why the DIFFERENCES are what a Go developer must internalize.
 * Each item shows real Odin code and its real behavior (scope-based defer
 * ordering, a distinct type refusing to assign, a bit_set literal, the
 * implicit context flowing down calls, an arena resetting in one free_all),
 * then has the learner IMPLEMENT that rule as a pure Go function against a
 * test harness. You understand Odin's defer by writing both defer schedulers
 * and diffing them against Go's — the same move the Rust track makes with
 * the borrow checker. Zero engine changes, same kind:'problem' machinery.
 *
 * Problems live in problems/<slug>.js and register through
 * GoLearnOdin.problem(). HARNESS_RT is duplicated from the other tracks on
 * purpose: tracks are independent plugins, and sharing runtime snippets
 * across tracks would couple their load order.
 *
 * Curriculum (14 items): ZII zero-value machine → distinct types → enums &
 * bit_set → tagged unions → array programming (element-wise ops, swizzles)
 * → scope-based defer → the context system → slices vs dynamic arrays →
 * arena allocators → #soa layout → or_return / or_else → explicit proc
 * overloading → $T parametric polymorphism → a capstone pipeline.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'odin',
		title: 'Odin for Go Devs',
		runner: 'go-wasm',
		order: [
			// Values & Types
			'zii-defaults', 'distinct-types', 'enums-bit-set', 'tagged-unions', 'array-programming',
			// Scope & Context
			'defer-scope', 'context-system',
			// Memory & Data
			'slices-dynamic', 'allocators', 'soa-layout',
			// Procedures & Errors
			'or-return', 'proc-overloading', 'parametric-procs',
			// Capstone
			'capstone-pipeline',
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
	globalThis.GoLearnOdin = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('odin', def);
		},
	};
})();
