/* Defer & Cleanup Order — Gotchas (lesson). Defer's three rules: runs at
 * FUNCTION end (not block end), LIFO order, and pair-it-with-the-acquire
 * placement. The task converts eager teardown into deferred teardown and
 * the exact-output check proves the LIFO unwind.
 *
 * Deliberate omission, found by probing: compiled Go snapshots a deferred
 * call's ARGUMENTS at the defer statement, but this sandbox's interpreter
 * evaluates them at run time — so that rule is taught as prose with an
 * explicit "the sandbox differs here, try it in compiled Go" flag, and the
 * runnable material sticks to what the interpreter gets right (closures
 * reading current state, which is also the behavior people actually want).
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// Acquire downward, defer stack unwinding upward in reverse.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="setup runs top to bottom: open db then open cache; the defer stack unwinds bottom to top: close cache then close db">' +
		'<text x="20" y="24" class="lbl">teardown is setup, mirrored: last acquired, first released</text>' +
		'<rect x="40" y="48" width="180" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="130" y="70" text-anchor="middle" class="lbl">open db</text>' +
		'<rect x="40" y="96" width="180" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="130" y="118" text-anchor="middle" class="lbl">open cache (needs db)</text>' +
		'<rect x="40" y="144" width="180" height="34" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="130" y="166" text-anchor="middle" class="lbl">work</text>' +
		'<path d="M 130 82 L 130 94" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowGBDC)"/>' +
		'<path d="M 130 130 L 130 142" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowGBDC)"/>' +
		'<rect x="320" y="144" width="180" height="34" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="410" y="166" text-anchor="middle" class="lbl">close cache — popped first</text>' +
		'<rect x="320" y="96" width="180" height="34" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="410" y="118" text-anchor="middle" class="lbl">close db — popped last</text>' +
		'<path d="M 410 142 L 410 132" stroke="var(--err-edge)" stroke-width="1.6" marker-end="url(#dgArrowGBDCe)"/>' +
		'<text x="410" y="70" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">the defer STACK unwinds at return</text>' +
		'<path d="M 224 165 L 316 165" stroke="var(--edge)" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#dgArrowGBDCn)"/>' +
		'<text x="270" y="188" text-anchor="middle" class="lbl">return</text>' +
		'<defs>' +
		'<marker id="dgArrowGBDC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowGBDCe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'<marker id="dgArrowGBDCn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'defer-cleanup',
		title: 'Defer & Cleanup Order',
		nav: 'defer & cleanup order',
		category: 'Gotchas',

		prose: [
			'<h2>Defer &amp; Cleanup Order</h2>' +
			'<p><code>defer</code> schedules a call to run when the surrounding ' +
			'<em>function</em> returns — any exit: the happy path, an early ' +
			'<code>return</code>, even a panic. Its point is adjacency: the release ' +
			'sits on the line after the acquire, so no code path can grow between ' +
			'them that forgets to clean up.</p>',
			{ code: 'f, err := os.Open(path)\nif err != nil {\n\treturn err\n}\ndefer f.Close() // paired with the acquire, guaranteed on every exit' },
			'<p>Two rules do the heavy lifting. First, deferred calls form a ' +
			'<strong>stack</strong>: last deferred, first run. That is not stylistic — ' +
			'teardown must mirror setup, because later resources depend on earlier ' +
			'ones (flush the cache <em>before</em> closing the connection it flushes ' +
			'to).</p>' +
			DIAGRAM +
			'<p>Second — the gotcha half — <code>defer</code> is ' +
			'<strong>function</strong>-scoped, not block-scoped. A defer inside an ' +
			'<code>if</code>, a <code>{}</code> block, or a <em>loop</em> waits for ' +
			'the whole function to return:</p>',
			{ code: 'func processAll(paths []string) error {\n\tfor _, p := range paths {\n\t\tf, _ := os.Open(p)\n\t\tdefer f.Close() // runs at processAll\'s END — every file\n\t}                   // stays open until ALL are processed\n\treturn nil          // 10k paths → 10k open file handles\n}' },
			'<p>The fix is to give the body its own function — ' +
			'<code>func() { … defer f.Close() … }()</code> or a named helper — so ' +
			'each iteration&rsquo;s defer runs at each iteration&rsquo;s end.</p>' +
			'<div class="tip">One more rule to know, with an asterisk: in compiled Go ' +
			'a deferred call&rsquo;s <em>arguments</em> are evaluated immediately at ' +
			'the <code>defer</code> line — <code>defer fmt.Println(x)</code> prints ' +
			'what <code>x</code> was <em>then</em>. This sandbox&rsquo;s interpreter ' +
			'evaluates them late, so demo that one in real Go. The portable habit: ' +
			'defer a closure, <code>defer func() { fmt.Println(x) }()</code>, which ' +
			'reads current state everywhere — and is usually what you meant.</div>' +
			'<h3>Your job</h3>' +
			'<p>The program tears each system down immediately after starting it, so ' +
			'the cache never coexists with the db. Defer both disconnects so the ' +
			'output becomes: both open, work, then closes in reverse order.</p>',
		],
		task: 'Defer the disconnects so the program prints exactly: open db / open cache / work / close cache / close db',
		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func connect(name string)    { fmt.Println("open", name) }',
			'func disconnect(name string) { fmt.Println("close", name) }',
			'',
			'func main() {',
			'	connect("db")',
			'	disconnect("db") // too eager — the cache below depends on the db',
			'',
			'	connect("cache")',
			'	disconnect("cache")',
			'',
			'	fmt.Println("work")',
			'}',
			'',
		].join('\n'),
		check: function (stdout) {
			return stdout === 'open db\nopen cache\nwork\nclose cache\nclose db\n';
		},
		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func connect(name string)    { fmt.Println("open", name) }',
			'func disconnect(name string) { fmt.Println("close", name) }',
			'',
			'func main() {',
			'	// Each release is deferred on the line after its acquire — the',
			'	// pairing is visible at a glance, and the LIFO unwind guarantees',
			'	// the cache (which depends on the db) closes first.',
			'	connect("db")',
			'	defer disconnect("db")',
			'',
			'	connect("cache")',
			'	defer disconnect("cache")',
			'',
			'	fmt.Println("work") // then: close cache, close db',
			'}',
			'',
		].join('\n'),
		explanation: [
			'<h3>Why LIFO is the only correct order</h3>' +
			'<p>Dependencies point backward: each resource may rely on every resource ' +
			'acquired before it. Releasing in acquisition order would tear the ' +
			'foundation out first — closing the db while the cache still wants to ' +
			'flush through it. A stack encodes &ldquo;reverse dependency order&rdquo; ' +
			'for free, which is why constructors/destructors, lock hierarchies and ' +
			'<code>defer</code> all converge on it.</p>' +
			'<h3>Defer earns its keep on the exits you did not write</h3>' +
			'<p>The starter could be &ldquo;fixed&rdquo; by reordering the calls by ' +
			'hand — until someone adds an early <code>return</code> between them, or ' +
			'the work panics. Deferred calls run on every exit path, including ' +
			'panics, which is what makes <code>defer mu.Unlock()</code> (from the ' +
			'safe-counter item) and <code>defer wg.Done()</code> (from the goroutines ' +
			'lesson) load-bearing rather than tidy. The pattern all three share: put ' +
			'the release next to the acquire and let the runtime find the exits.</p>' +
			'<h3>Two production idioms</h3>' +
			'<p>A deferred closure can read and even <em>set</em> named return values ' +
			'— <code>defer func() { if p := recover(); p != nil { err = ' +
			'fmt.Errorf("…: %v", p) } }()</code> is how a boundary converts a panic ' +
			'into an error. And for close-with-error resources (files being written), ' +
			'<code>defer f.Close()</code> silently discards the error that matters ' +
			'most; the careful form checks it in a deferred closure and folds it into ' +
			'the function&rsquo;s return.</p>',
		],
	});
})();
