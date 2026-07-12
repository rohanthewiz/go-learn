/* rust — Rust for Go developers: the compiler's rules as runnable Go.
 *
 * Rust cannot run in this page (the only runner is Go-in-wasm), and that
 * turns out to be the right constraint: what makes Rust hard coming from Go
 * is not syntax, it is the set of rules rustc enforces at compile time —
 * moves, the borrow checker, lifetime elision, match exhaustiveness. Each
 * item here shows the real Rust code and the real compiler error, then has
 * the learner IMPLEMENT the rule itself as a pure Go function against a test
 * harness. You understand what the borrow checker rejects by writing the
 * borrow checker — the same move the CKA track makes with the scheduler and
 * the AWS track makes with IAM. Zero engine changes, same kind:'problem'
 * machinery.
 *
 * Problems live in problems/<slug>.js and register through
 * GoLearnRust.problem(). HARNESS_RT is duplicated from the other tracks on
 * purpose: tracks are independent plugins, and sharing runtime snippets
 * across tracks would couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'rust',
		title: 'Rust for Go Devs',
		runner: 'go-wasm',
		order: [
			// Ownership
			'ownership-moves', 'copy-or-move', 'drop-order',
			// Borrowing
			'borrow-checker', 'lifetime-elision',
			// Enums & Matching
			'match-exhaustiveness',
			// Error Handling
			'question-mark',
			// Strings & Slices
			'char-boundaries',
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
	globalThis.GoLearnRust = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('rust', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('rust', def);
		},
	};
})();
