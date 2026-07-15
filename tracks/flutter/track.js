/* flutter — Flutter's core machinery as runnable Go.
 *
 * Flutter can't run in this page, and it doesn't need to: what separates
 * people who fight the framework from people who wield it is a handful of
 * algorithms — how setState propagates, how the element tree decides
 * update-vs-replace (and what keys change about it), how constraints flow
 * down and sizes flow up, how Row divides space, how Theme.of finds its
 * value. Each item here states the rule with real Dart/Flutter code, then
 * has the learner IMPLEMENT it as pure Go against a check or a test
 * harness — the same move the system-design track makes with caches and
 * the Rust track makes with the borrow checker. Zero engine changes.
 *
 * Items live in problems/<slug>.js and register through GoLearnFlutter.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'flutter',
		title: 'Flutter Internals',
		runner: 'go-wasm',
		order: [
			// Widgets & Reconciliation
			'widget-tree', 'can-update', 'keys',
			// State & Rebuilds
			'stateless-vs-stateful', 'set-state', 'const-widgets',
			// Layout
			'constraints', 'flex-layout',
			// Context & Theming
			'inherited-widget',
			// Interaction & Navigation
			'hit-testing', 'navigator',
			// Async UI
			'future-builder',
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
	globalThis.GoLearnFlutter = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('flutter', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('flutter', def);
		},
	};
})();
