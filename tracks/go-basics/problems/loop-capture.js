/* Loop Variable Capture — Gotchas (lesson). Closures capture VARIABLES,
 * not values — the rule behind a decade of "all my goroutines saw the last
 * element" bugs. Go 1.22 fixed the famous special case (loop variables are
 * per-iteration now, and this sandbox's interpreter implements the new
 * semantics — verified by probe), so the demo hoists the variable out of
 * the loop to recreate the shared-variable shape that is STILL a bug in
 * any Go version. Deliberately single-threaded: a slice of closures shows
 * the capture problem with none of the scheduling noise goroutines add.
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// Three closures, one shared box vs three per-iteration boxes.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="left: three closures all point at one shared variable holding 3; right: three closures each point at their own per-iteration variable holding 0, 1, 2">' +
		'<text x="20" y="24" class="lbl">capture the variable, not its value at append time</text>' +
		'<text x="128" y="52" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">var i outside the loop</text>' +
		'<rect x="30" y="66" width="60" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="60" y="86" text-anchor="middle" class="lbl">f0</text>' +
		'<rect x="98" y="66" width="60" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="128" y="86" text-anchor="middle" class="lbl">f1</text>' +
		'<rect x="166" y="66" width="60" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="196" y="86" text-anchor="middle" class="lbl">f2</text>' +
		'<path d="M 60 96 L 118 140" stroke="var(--err-edge)" stroke-width="1.6" marker-end="url(#dgArrowGBLC)"/>' +
		'<path d="M 128 96 L 128 138" stroke="var(--err-edge)" stroke-width="1.6" marker-end="url(#dgArrowGBLC)"/>' +
		'<path d="M 196 96 L 138 140" stroke="var(--err-edge)" stroke-width="1.6" marker-end="url(#dgArrowGBLC)"/>' +
		'<rect x="98" y="144" width="60" height="34" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="128" y="166" text-anchor="middle">i: 3</text>' +
		'<text x="128" y="198" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">all three see 3</text>' +
		'<text x="412" y="52" text-anchor="middle" class="lbl" style="fill:var(--ok)">i := inside the loop (1.22+)</text>' +
		'<rect x="314" y="66" width="60" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="344" y="86" text-anchor="middle" class="lbl">f0</text>' +
		'<rect x="382" y="66" width="60" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="412" y="86" text-anchor="middle" class="lbl">f1</text>' +
		'<rect x="450" y="66" width="60" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="480" y="86" text-anchor="middle" class="lbl">f2</text>' +
		'<path d="M 344 96 L 344 138" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowGBLCo)"/>' +
		'<path d="M 412 96 L 412 138" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowGBLCo)"/>' +
		'<path d="M 480 96 L 480 138" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowGBLCo)"/>' +
		'<rect x="314" y="144" width="60" height="34" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="344" y="166" text-anchor="middle">i: 0</text>' +
		'<rect x="382" y="144" width="60" height="34" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="412" y="166" text-anchor="middle">i: 1</text>' +
		'<rect x="450" y="144" width="60" height="34" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="480" y="166" text-anchor="middle">i: 2</text>' +
		'<text x="412" y="198" text-anchor="middle" class="lbl" style="fill:var(--ok)">each sees its own</text>' +
		'<defs>' +
		'<marker id="dgArrowGBLC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'<marker id="dgArrowGBLCo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'loop-capture',
		title: 'Loop Variable Capture',
		nav: 'loop variable capture',
		category: 'Gotchas',

		prose: [
			'<h2>Loop Variable Capture</h2>' +
			'<p>A closure does not copy the variables it uses — it keeps a reference ' +
			'to them. Call the closure later, after the variable has changed, and it ' +
			'sees the <em>current</em> value, not the one from when the closure was ' +
			'made:</p>',
			{ code: 'x := 1\nf := func() { fmt.Println(x) } // captures the variable x, not "1"\nx = 2\nf() // prints 2' },
			'<p>Now put that closure in a loop that reuses <strong>one</strong> ' +
			'variable, and collect closures that all run <em>after</em> the loop ' +
			'finished. Every one of them reads the same variable, which by then holds ' +
			'the final value:</p>',
			{ code: 'var i int                    // ONE variable for the whole loop\nfor i = 0; i < 3; i++ {\n\tfuncs = append(funcs, func() int { return i })\n}\n// loop over: i == 3, and all three closures read that same i\n// calls: [3 3 3]' },
			DIAGRAM +
			'<p>This exact shape — with <code>go func()</code> instead of ' +
			'<code>append</code> — was the most famous bug in Go for a decade, because ' +
			'until Go 1.22 <code>for i := 0</code> <em>also</em> created just one ' +
			'variable per loop. Goroutines usually start after the loop ends, so they ' +
			'all printed the final value. Go 1.22 changed the language: loop variables ' +
			'declared in the <code>for</code> clause are now <strong>fresh per ' +
			'iteration</strong>, and each closure captures its own.</p>' +
			'<p>The fix did not repeal the rule, though. Closures still capture ' +
			'variables — hoist the variable out of the loop (as above), or mutate any ' +
			'captured variable after capture, and you are right back in the trap, in ' +
			'any Go version.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program below prints <code>calls: [3 3 3]</code>. Make it print ' +
			'<code>calls: [0 1 2]</code> by giving each closure its own variable — ' +
			'move the declaration into the <code>for</code> clause, or shadow it ' +
			'per-iteration with <code>i := i</code> (the pre-1.22 idiom you will still ' +
			'meet in older codebases).</p>',
		],
		task: 'Give each closure its own variable and print exactly: calls: [0 1 2]',
		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	var funcs []func() int',
			'',
			'	var i int // one variable, shared by every closure below',
			'	for i = 0; i < 3; i++ {',
			'		funcs = append(funcs, func() int { return i })',
			'	}',
			'',
			'	calls := []int{}',
			'	for _, f := range funcs {',
			'		calls = append(calls, f())',
			'	}',
			'	fmt.Println("calls:", calls)',
			'}',
			'',
		].join('\n'),
		check: function (stdout, flat) { return flat.indexOf('calls: [0 1 2]') !== -1; },
		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	var funcs []func() int',
			'',
			'	// Declaring i in the for clause makes it per-iteration (Go 1.22+):',
			'	// each pass gets a fresh i, and each closure captures its own.',
			'	// The pre-1.22 spelling of the same fix was an explicit shadow',
			'	// inside the body:  i := i',
			'	for i := 0; i < 3; i++ {',
			'		funcs = append(funcs, func() int { return i })',
			'	}',
			'',
			'	calls := []int{}',
			'	for _, f := range funcs {',
			'		calls = append(calls, f())',
			'	}',
			'	fmt.Println("calls:", calls)',
			'}',
			'',
		].join('\n'),
		explanation: [
			'<h3>One rule explains every variant</h3>' +
			'<p>Ask of any closure: <em>which variables does it capture, and who ' +
			'writes to them between capture and call?</em> The hoisted loop variable, ' +
			'the goroutine version, the &ldquo;register callbacks in a loop&rdquo; ' +
			'version, the <code>defer func() { log(err) }()</code> that reports the ' +
			'wrong error because <code>err</code> was reassigned — all the same ' +
			'answer. When the gap between capture and call is deliberate (a goroutine, ' +
			'a callback), passing the value as a <em>parameter</em> instead of ' +
			'capturing it makes the snapshot explicit: ' +
			'<code>go func(i int) { … }(i)</code>.</p>' +
			'<h3>Why 1.22 could change the language</h3>' +
			'<p>Breaking semantics on purpose is rare; it happened because the old ' +
			'behavior was wrong so much more often than it was intended — years of ' +
			'production telemetry and a static analyzer (<code>loopclosure</code>) ' +
			'backed that up, and the change shipped behind the per-module ' +
			'<code>go</code> directive so old code keeps old semantics until its ' +
			'module opts in. Worth remembering when reading pre-2024 Go: every ' +
			'<code>i := i</code> you see was load-bearing, not noise.</p>',
		],
	});
})();
