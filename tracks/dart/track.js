/* dart — Dart for Go developers: the language's rules as runnable Go.
 *
 * Dart cannot run in this page (the only runner is Go-in-wasm), and — as the
 * Rust track already proved — that constraint is a feature: what makes Dart
 * interesting coming from Go is not its C-family syntax (a Go developer can
 * read Dart on day one), it is the set of rules the analyzer and runtime
 * enforce — sound null safety, flow-based type promotion, mixin
 * linearization, the two-queue event loop, isolate message copying. Each
 * item shows the real Dart code and the real analyzer/runtime error, then
 * has the learner IMPLEMENT the rule itself as pure Go against a check or a
 * test harness. You understand null safety by writing the nullability
 * checker — the same move the Rust track makes with the borrow checker.
 * Zero engine changes, same kind:'lesson'/'problem' machinery.
 *
 * Items live in problems/<slug>.js and register through GoLearnDart.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'dart',
		title: 'Dart for Go Devs',
		runner: 'go-wasm',
		order: [
			// Null Safety
			'sound-null-safety', 'null-aware-ops', 'type-promotion', 'late-variables',
			// Values & Functions
			'final-vs-const', 'named-params', 'cascades',
			// Classes & Mixins
			'mixin-linearization', 'extension-methods',
			// Collections & Patterns
			'collection-if-spread', 'records-patterns', 'sealed-exhaustive',
			// Async
			'async-await', 'event-loop', 'streams',
			// Isolates
			'isolates',
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
	globalThis.GoLearnDart = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('dart', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('dart', def);
		},
	};
})();
