/* go-basics — a deliberately tiny track.
 *
 * It exists for two reasons: a gentle on-ramp for people who landed here
 * without much Go, and — just as important — a second live consumer of the
 * engine's plugin interface, so nothing LeetCode-specific can quietly leak
 * into engine.js. Lessons use kind:'lesson' (run the file as-is, check the
 * stdout), the same semantics the element playground's tutorial proved out.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'go-basics',
		title: 'Go basics',
		runner: 'go-wasm',
		order: ['hello', 'slices-loops', 'maps'],
	});

	var item = function (def) { GoLearn.registerItem('go-basics', def); };

	item({
		id: 'hello',
		kind: 'lesson',
		title: 'Hello, Go',
		nav: 'Hello, Go',
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
