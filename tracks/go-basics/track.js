/* go-basics — the Go track: a gentle on-ramp that now continues into
 * advanced territory.
 *
 * It began as a deliberately tiny three-lesson track (and a second live
 * consumer of the engine's plugin interface, so nothing LeetCode-specific
 * could quietly leak into engine.js). It has since graduated: the Basics
 * lessons remain the on-ramp, and two advanced categories follow —
 * Concurrency (goroutines, channels, select, the fan-in and worker-pool
 * patterns, mutexes) and Gotchas (the classic traps: loop-variable capture,
 * nil maps, range copies, append aliasing, defer semantics). Advanced items
 * live in problems/<slug>.js and register through GoLearnGoBasics below;
 * the original lessons stay inline here.
 *
 * A constraint that shaped the concurrency items: the page's runner is a
 * synchronous interpreter call, so nothing may block on the event loop —
 * no time.Sleep, no timers, ever. That is no loss: every item synchronizes
 * with WaitGroups and channel close, which is what production code should
 * be doing anyway (sleeping until a goroutine is "probably done" is one of
 * the gotchas). Two interpreter divergences found by probing, which the
 * content routes around: deferred call ARGUMENTS are evaluated late (so the
 * defer lesson teaches closures, not arg snapshots), and a typed-nil
 * pointer returned through an interface compares == nil (so that gotcha is
 * prose-only, flagged as "try in compiled Go").
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'go-basics',
		title: 'Go',
		runner: 'go-wasm',
		order: [
			// Basics — the original on-ramp
			'hello', 'slices-loops', 'maps',
			// Concurrency
			'goroutines', 'channels', 'select-drain', 'fan-in',
			'worker-pool', 'safe-counter',
			// Gotchas
			'loop-capture', 'nil-zero-values', 'range-copies',
			'append-aliasing', 'defer-cleanup',
		],
	});

	// Every problem harness splices this in, so every harness import block
	// includes fmt and encoding/json. runCase isolates one test: a panicking
	// user implementation records a failure for that case but the harness
	// still reports every result (the sentinel must always print). Duplicated
	// from the other tracks on purpose: tracks are independent plugins, and
	// sharing runtime snippets across tracks would couple their load order.
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
	globalThis.GoLearnGoBasics = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('go-basics', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('go-basics', def);
		},
	};

	var item = function (def) { GoLearn.registerItem('go-basics', def); };

	item({
		id: 'hello',
		kind: 'lesson',
		title: 'Hello, Go',
		nav: 'Hello, Go',
		category: 'Basics',
		prose: [
			'<h2>Hello, Go</h2>' +
			'<p>Every Go program is a set of <em>packages</em>; execution starts in ' +
			'<code>package main</code>, in its <code>func main()</code>. The editor on the ' +
			'right holds a complete program — it reruns automatically as you type ' +
			'(<kbd>Cmd/Ctrl+Enter</kbd> forces a run).</p>',
			{ code: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hi")\n}' },
			'<p><code>fmt.Println</code> writes a line to standard output — everything this ' +
			'program prints appears in the output pane below the editor.</p>' +
			'<div class="tip">Go is picky on purpose: unused imports and unused variables are ' +
			'compile errors, and the formatter (gofmt) settles all style arguments with tabs.</div>',
		],
		task: 'Make the program print exactly: Hello, go-learn!',
		starter: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello")\n}\n',
		check: function (stdout) { return stdout === 'Hello, go-learn!\n'; },
		solution: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, go-learn!")\n}\n',
	});

	item({
		id: 'slices-loops',
		kind: 'lesson',
		title: 'Slices and loops',
		nav: 'Slices & loops',
		category: 'Basics',
		prose: [
			'<h2>Slices and loops</h2>' +
			'<p>A <em>slice</em> is Go’s growable list. <code>for … range</code> walks it, ' +
			'yielding the index and the element; Go’s only loop keyword is <code>for</code>.</p>',
			{ code: 'nums := []int{3, 1, 4}\nfor i, n := range nums {\n\tfmt.Println(i, n)\n}\nnums = append(nums, 1)  // grow' },
			'<p>Drop a value you don’t need with <code>_</code>: ' +
			'<code>for _, n := range nums</code>. Slices index from 0 and ' +
			'<code>len(nums)</code> gives the length.</p>',
		],
		task: 'Sum the slice and print exactly: sum: 55',
		starter: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tnums := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}\n\n\ttotal := 0\n\t// add each number in nums to total\n\n\tfmt.Println("sum:", total)\n}\n',
		check: function (stdout, flat) { return flat.indexOf('sum: 55') !== -1; },
		solution: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tnums := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}\n\n\ttotal := 0\n\tfor _, n := range nums {\n\t\ttotal += n\n\t}\n\n\tfmt.Println("sum:", total)\n}\n',
	});

	item({
		id: 'maps',
		kind: 'lesson',
		title: 'Maps',
		nav: 'Maps',
		category: 'Basics',
		prose: [
			'<h2>Maps</h2>' +
			'<p>A <code>map[K]V</code> is Go’s hash table — the workhorse behind many of the ' +
			'LeetCode solutions in the other track. Reading a missing key yields the zero ' +
			'value (0 for ints), which makes counting delightfully short:</p>',
			{ code: 'counts := map[string]int{}\nfor _, w := range words {\n\tcounts[w]++ // missing key reads as 0\n}' },
			'<p>The two-value read <code>v, ok := m[k]</code> tells you whether the key exists. ' +
			'That idiom — <em>have I seen this before?</em> — is exactly how Two Sum gets solved ' +
			'in one pass.</p>',
		],
		task: 'Count the words and print exactly: go=3 fun=2',
		starter: 'package main\n\nimport "fmt"\n\nfunc main() {\n\twords := []string{"go", "fun", "go", "fun", "go"}\n\n\tcounts := map[string]int{}\n\t// count each word into counts\n\n\tfmt.Printf("go=%d fun=%d\\n", counts["go"], counts["fun"])\n}\n',
		check: function (stdout, flat) { return flat.indexOf('go=3 fun=2') !== -1; },
		solution: 'package main\n\nimport "fmt"\n\nfunc main() {\n\twords := []string{"go", "fun", "go", "fun", "go"}\n\n\tcounts := map[string]int{}\n\tfor _, w := range words {\n\t\tcounts[w]++\n\t}\n\n\tfmt.Printf("go=%d fun=%d\\n", counts["go"], counts["fun"])\n}\n',
	});
})();
