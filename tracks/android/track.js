/* android — Android with Kotlin: the platform's rules as runnable Go.
 *
 * Kotlin cannot run in this page (the only code runner is Go-in-wasm), and —
 * as the Rust, Dart, and Flutter tracks already proved — that constraint is
 * a feature: what makes Android-with-Kotlin hard is not Kotlin's syntax (a
 * Go developer reads it on day one), it is the set of rules the compiler
 * and the framework enforce. Android is a pile of state machines and
 * resolution algorithms — the activity lifecycle, the task back stack,
 * resource-qualifier matching, MeasureSpec negotiation, Compose
 * recomposition — and Kotlin a set of compiler-enforced decision procedures
 * — null safety, smart casts, `when` exhaustiveness, the suspend CPS
 * transform, the Job tree. Each item shows the real Kotlin/Android code and
 * the real observed behavior (compiler error, Logcat trace, ANR dialog),
 * then has the learner IMPLEMENT the rule itself as pure Go against a test
 * harness. You understand the back stack by writing the back stack — the
 * same move the Rust track makes with the borrow checker. Zero engine
 * changes, same kind:'problem' machinery.
 *
 * Items live in problems/<slug>.js and register through GoLearnAndroid.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'android',
		title: 'Android with Kotlin',
		runner: 'go-wasm',
		order: [
			// Kotlin: Types & Null Safety
			'null-safety-operators', 'smart-casts', 'data-classes', 'sealed-when',
			// Kotlin: Functions & Delegation
			'extension-functions', 'delegated-properties',
			// Coroutines & the Main Thread
			'handler-looper', 'suspend-state-machine', 'structured-concurrency', 'cold-flows',
			// Activities & Navigation
			'activity-lifecycle', 'viewmodel-retention', 'back-stack-launch-modes',
			// UI: Lists, Compose & Layout
			'recyclerview-diffutil', 'compose-recomposition', 'measure-spec',
			// Resources & Permissions
			'resource-qualifiers', 'runtime-permissions',
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
	globalThis.GoLearnAndroid = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('android', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('android', def);
		},
	};
})();
