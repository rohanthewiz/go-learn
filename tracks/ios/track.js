/* ios — iOS with Swift: the platform's rules as runnable Go.
 *
 * Swift cannot run in this page (the only code runner is Go-in-wasm), and —
 * as the Rust, Dart, Flutter, and Android tracks already proved — that
 * constraint is a feature: what makes iOS-with-Swift hard is not Swift's
 * syntax (a Go developer reads it on day one), it is the set of rules the
 * compiler and the frameworks enforce. iOS is a pile of state machines and
 * resolution algorithms — ARC and the retain-cycle graph, GCD queue
 * scheduling, the view-controller lifecycle, hit-testing, Auto Layout's
 * priority arbitration, SwiftUI's dependency graph — and Swift a set of
 * compiler-enforced decision procedures — optionals, value semantics,
 * exhaustive switch, protocol witness tables, actor isolation. Each item
 * shows the real Swift/iOS code and the real observed behavior (compiler
 * error, console trace, crash log, the once-only permission alert), then
 * has the learner IMPLEMENT the rule itself as pure Go against a test
 * harness. You understand ARC by writing the release cascade — the same
 * move the Rust track makes with the borrow checker. Zero engine changes,
 * same kind:'problem' machinery.
 *
 * Items live in problems/<slug>.js and register through GoLearnIOS.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'ios',
		title: 'iOS with Swift',
		runner: 'go-wasm',
		order: [
			// Swift: Types & Optionals
			'optionals-chaining', 'value-vs-reference', 'enums-pattern-matching', 'protocols-dispatch',
			// Swift: Memory & Closures
			'closure-captures', 'arc-retain-cycles',
			// Concurrency & the Main Thread
			'gcd-queues', 'async-await-tasks', 'actors-isolation', 'combine-publishers',
			// View Controllers & Navigation
			'viewcontroller-lifecycle', 'navigation-and-modals', 'app-lifecycle-scenes',
			// UI: SwiftUI, Lists & Layout
			'swiftui-state', 'tableview-cell-reuse', 'autolayout-engine',
			// Touches & Permissions
			'hit-testing', 'permissions-authorization',
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
	globalThis.GoLearnIOS = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('ios', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('ios', def);
		},
	};
})();
