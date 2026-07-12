/* Goroutines & WaitGroup — Concurrency (lesson). The fork/join shape that
 * underlies every other item in this category: launch work with `go`, wait
 * for ALL of it with sync.WaitGroup, and only then read the results. The
 * write-by-index trick (each goroutine owns one slot of a pre-sized slice)
 * is taught here deliberately — it is the simplest way to collect parallel
 * results with zero locks, and it sets up the "who owns this memory?"
 * question the safe-counter item answers for the shared case.
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// Fork/join: main spawns three workers, the WaitGroup is the join bar.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="main forks three goroutines; wg.Wait() is the join bar main blocks on until every worker has called Done">' +
		'<text x="20" y="24" class="lbl">go f() forks; wg.Wait() joins — main sleeps until the count hits zero</text>' +
		'<rect x="30" y="80" width="90" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="75" y="105" text-anchor="middle">main</text>' +
		'<path d="M 120 90 L 205 56" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowGBGR)"/>' +
		'<path d="M 120 100 L 205 100" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowGBGR)"/>' +
		'<path d="M 120 110 L 205 144" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowGBGR)"/>' +
		'<rect x="210" y="36" width="150" height="32" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="285" y="57" text-anchor="middle" class="lbl">squares[0] = 4; Done()</text>' +
		'<rect x="210" y="84" width="150" height="32" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="285" y="105" text-anchor="middle" class="lbl">squares[1] = 9; Done()</text>' +
		'<rect x="210" y="132" width="150" height="32" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="285" y="153" text-anchor="middle" class="lbl">squares[2] = 25; Done()</text>' +
		'<line x1="420" y1="40" x2="420" y2="160" stroke="var(--ok)" stroke-width="3"/>' +
		'<path d="M 360 52 L 416 92" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<path d="M 360 100 L 416 100" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<path d="M 360 148 L 416 108" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="440" y="95" class="lbl">wg.Wait()</text>' +
		'<text x="440" y="112" class="lbl">then print</text>' +
		'<defs><marker id="dgArrowGBGR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.lesson({
		id: 'goroutines',
		title: 'Goroutines & WaitGroup',
		nav: 'goroutines & WaitGroup',
		category: 'Concurrency',

		prose: [
			'<h2>Goroutines &amp; WaitGroup</h2>' +
			'<p>A goroutine is a function running concurrently with the rest of the ' +
			'program — Go&rsquo;s unit of concurrency, cheap enough to launch by the ' +
			'thousand (a few KB of stack each, multiplexed onto OS threads by the ' +
			'runtime). Starting one is a single keyword:</p>',
			{ code: 'go work(i)          // returns immediately; work(i) runs concurrently\ngo func() {\n\t// closures work too — this is the common form\n}()' },
			'<p>The catch every Go programmer hits in week one: <strong>when ' +
			'<code>main</code> returns, the program exits</strong> — no one waits for ' +
			'outstanding goroutines. Print immediately after launching and the workers ' +
			'have likely not run yet. The fix is never <code>time.Sleep</code> (guessing ' +
			'how long work takes is a bug with a delay attached); it is a ' +
			'<code>sync.WaitGroup</code>, a counter you can block on:</p>',
			{ code: 'var wg sync.WaitGroup\nfor i, n := range nums {\n\twg.Add(1)              // +1 BEFORE launching, in the parent\n\tgo func() {\n\t\tdefer wg.Done()     // -1 when this goroutine exits, panic or not\n\t\tsquares[i] = n * n  // each goroutine owns exactly one slot\n\t}()\n}\nwg.Wait()                   // block until the counter reaches zero' },
			DIAGRAM +
			'<p>Two details in that snippet carry most of the safety:</p>' +
			'<p><code>wg.Add(1)</code> runs in the <em>parent</em>, before ' +
			'<code>go</code> — if the goroutine did its own <code>Add</code>, ' +
			'<code>Wait</code> could run before any goroutine had incremented the ' +
			'counter and sail straight through. And each goroutine writes only ' +
			'<code>squares[i]</code>, its own slot of a slice sized up front — disjoint ' +
			'memory, so no lock is needed. Sharing one variable (a running total, a map) ' +
			'is a different story, and a later item covers it.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program below computes nothing yet. Launch one goroutine per number ' +
			'that stores <code>n * n</code> into <code>squares[i]</code>, wait for all of ' +
			'them, then let the existing print run. You will need the ' +
			'<code>sync</code> import.</p>',
		],
		task: 'Square every number in its own goroutine and print exactly: squares: [4 9 25 64]',
		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	nums := []int{2, 3, 5, 8}',
			'	squares := make([]int, len(nums))',
			'',
			'	// launch one goroutine per number: squares[i] = n * n',
			'	// then wait for all of them before printing',
			'',
			'	fmt.Println("squares:", squares)',
			'}',
			'',
		].join('\n'),
		check: function (stdout, flat) { return flat.indexOf('squares: [4 9 25 64]') !== -1; },
		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"sync"',
			')',
			'',
			'func main() {',
			'	nums := []int{2, 3, 5, 8}',
			'	squares := make([]int, len(nums))',
			'',
			'	var wg sync.WaitGroup',
			'	for i, n := range nums {',
			'		wg.Add(1) // in the parent, before go — never inside the goroutine',
			'		go func() {',
			'			defer wg.Done()',
			'			// i and n are per-iteration variables (Go 1.22+), and this',
			'			// goroutine is the only writer of squares[i]: disjoint slots,',
			'			// so the result slice needs no lock.',
			'			squares[i] = n * n',
			'		}()',
			'	}',
			'	wg.Wait() // the join point: every Done has been called past here',
			'',
			'	fmt.Println("squares:", squares)',
			'}',
			'',
		].join('\n'),
		explanation: [
			'<h3>The fork/join skeleton</h3>' +
			'<p>Add in the parent, <code>defer Done</code> first thing in the child, ' +
			'<code>Wait</code> at the join point — that skeleton is worth memorizing, ' +
			'because almost every WaitGroup bug is a deviation from it. ' +
			'<code>Add</code> inside the goroutine races <code>Wait</code>; a ' +
			'<code>Done</code> without <code>defer</code> is skipped when the work ' +
			'panics or returns early, and <code>Wait</code> blocks forever.</p>' +
			'<h3>Why not just sleep?</h3>' +
			'<p><code>time.Sleep(100 * time.Millisecond)</code> after the loop ' +
			'&ldquo;works&rdquo; on your machine, today, under this load. It is still a ' +
			'race: the program has no idea whether the goroutines finished — it just ' +
			'waited a while. WaitGroups (and channels, next lesson) encode the actual ' +
			'condition: <em>the work is done</em>. As a bonus, they are also faster — ' +
			'<code>Wait</code> returns the instant the last <code>Done</code> lands.</p>' +
			'<h3>Before Go 1.22</h3>' +
			'<p>The closure capturing <code>i</code> and <code>n</code> directly became ' +
			'correct in Go 1.22, when loop variables became per-iteration. For a decade ' +
			'before that, every iteration shared one <code>i</code> — and goroutines, ' +
			'which usually start after the loop finishes, all saw its final value. The ' +
			'Gotchas category has a whole item on it, because the underlying rule ' +
			'(closures capture <em>variables</em>, not values) still bites in other ' +
			'shapes.</p>',
		],
	});
})();
