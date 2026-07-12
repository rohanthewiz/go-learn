/* Worker Pool — Concurrency (Medium). The most-deployed concurrency shape
 * in Go: a jobs channel as the queue, a fixed number of workers ranging
 * over it, results funneled back on a second channel whose close is gated
 * by a WaitGroup. Composes everything the category has built: goroutines +
 * WaitGroup (join), channel close (queue end), fan-in (the results side).
 * The harness counts fn invocations atomically to prove each job is
 * processed exactly once — sorted-value comparison alone would let a
 * "process the slice twice, dedupe" impl through.
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// Jobs queue feeding W workers, results converging, close after Wait.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="a jobs channel feeds three workers; each sends into a results channel; a closer goroutine closes results after the WaitGroup reports all workers done">' +
		'<text x="20" y="24" class="lbl">bounded concurrency: len(jobs) tasks, exactly W goroutines</text>' +
		'<rect x="24" y="90" width="92" height="40" rx="20" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="70" y="115" text-anchor="middle">jobs</text>' +
		'<path d="M 116 100 L 176 62" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowGBWP)"/>' +
		'<path d="M 116 110 L 176 110" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowGBWP)"/>' +
		'<path d="M 116 120 L 176 158" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowGBWP)"/>' +
		'<rect x="180" y="44" width="120" height="34" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="240" y="66" text-anchor="middle" class="lbl">worker 1</text>' +
		'<rect x="180" y="93" width="120" height="34" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="240" y="115" text-anchor="middle" class="lbl">worker 2</text>' +
		'<rect x="180" y="142" width="120" height="34" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="240" y="164" text-anchor="middle" class="lbl">worker 3</text>' +
		'<path d="M 300 61 L 368 96" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBWPo)"/>' +
		'<path d="M 300 110 L 368 108" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBWPo)"/>' +
		'<path d="M 300 159 L 368 120" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBWPo)"/>' +
		'<rect x="372" y="90" width="100" height="40" rx="20" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="422" y="115" text-anchor="middle">results</text>' +
		'<text x="270" y="200" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">go func() { wg.Wait(); close(results) }()</text>' +
		'<defs>' +
		'<marker id="dgArrowGBWP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowGBWPo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'worker-pool',
		title: 'Worker Pool',
		nav: 'worker pool',
		difficulty: 'Medium',
		category: 'Concurrency',
		task: 'Implement Pool — process every job through fn using exactly `workers` goroutines, returning all results. All 4 tests.',

		prose: [
			'<h2>Worker Pool</h2>' +
			'<p>&ldquo;One goroutine per task&rdquo; is fine for squaring four numbers. ' +
			'It is not fine for 2 million rows against a database that allows 10 ' +
			'connections, or an API that rate-limits you. The worker pool bounds ' +
			'concurrency: <em>N tasks, W goroutines</em>, where W is chosen by you — ' +
			'not by the size of the input.</p>' +
			'<p>The machinery is nothing new — it is a redeployment of everything this ' +
			'category has built:</p>' +
			'<ul>' +
			'<li>The <strong>jobs channel is the queue</strong>. Workers ' +
			'<code>range</code> over it; closing it is how the pool says ' +
			'&ldquo;no more work&rdquo;, and each worker&rsquo;s range loop ends.</li>' +
			'<li>Workers pulling from one shared channel is <strong>load ' +
			'balancing for free</strong> — a worker stuck on a slow job simply stops ' +
			'taking new ones; the fast workers absorb the rest.</li>' +
			'<li>The results side is the <strong>fan-in problem you just ' +
			'solved</strong>: W producers, one consumer, WaitGroup-gated close.</li>' +
			'</ul>',
			{ code: 'jobsCh := make(chan int)\nresults := make(chan int)\n\n// W workers, each draining the shared queue\nfor w := 0; w < workers; w++ {\n\twg.Add(1)\n\tgo func() {\n\t\tdefer wg.Done()\n\t\tfor j := range jobsCh {\n\t\t\tresults <- fn(j)\n\t\t}\n\t}()\n}' },
			DIAGRAM +
			'<p>One subtlety: who feeds the queue? If <code>Pool</code> pushed all jobs ' +
			'into an unbuffered <code>jobsCh</code> before collecting results, the ' +
			'workers would fill <code>results</code> and block — nobody is receiving ' +
			'yet — and then the feed loop blocks too: deadlock. Feed from a goroutine ' +
			'(or buffer the channels; the goroutine is the shape that scales).</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Pool(jobs, workers, fn)</code>: run <code>fn</code> on ' +
			'every job using <code>workers</code> goroutines sharing one jobs channel, ' +
			'and return all results (any order — the tests sort). The tests also count ' +
			'calls to <code>fn</code>: each job must be processed exactly once.</p>',
		],

		starter: [
			'package main',
			'',
			'// Pool processes every job through fn using exactly `workers`',
			'// goroutines (workers >= 1) sharing one jobs channel, and returns',
			'// the results in any order. Each job is passed to fn exactly once.',
			'func Pool(jobs []int, workers int, fn func(int) int) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"sort"',
			'	"sync/atomic"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// calls counts fn invocations. Atomic because fn runs inside the',
			'	// solution\'s worker goroutines; a correct Pool has joined them all',
			'	// before returning, so the load below is race-free.',
			'	var calls int64',
			'	square := func(n int) int { atomic.AddInt64(&calls, 1); return n * n }',
			'	double := func(n int) int { atomic.AddInt64(&calls, 1); return n * 2 }',
			'',
			'	results := make([]map[string]any, 0, 4)',
			'	add := func(name string, wantVals []int, wantCalls int64, body func() []int) {',
			'		r := map[string]any{',
			'			"input": name,',
			'			"want":  fmt.Sprintf("%v after %d fn call(s)", wantVals, wantCalls),',
			'		}',
			'		runCase(r, func() {',
			'			atomic.StoreInt64(&calls, 0)',
			'			got := body()',
			'			sort.Ints(got)',
			'			gotCalls := atomic.LoadInt64(&calls)',
			'			r["pass"] = fmt.Sprint(got) == fmt.Sprint(wantVals) && gotCalls == wantCalls',
			'			r["got"] = fmt.Sprintf("%v after %d fn call(s)", got, gotCalls)',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	add("5 jobs, 2 workers, square", []int{1, 4, 9, 16, 25}, 5, func() []int {',
			'		return Pool([]int{1, 2, 3, 4, 5}, 2, square)',
			'	})',
			'	add("1 job, 5 workers (idle workers must exit)", []int{49}, 1, func() []int {',
			'		return Pool([]int{7}, 5, square)',
			'	})',
			'	add("no jobs, 3 workers", []int{}, 0, func() []int {',
			'		return Pool([]int{}, 3, square)',
			'	})',
			'	add("duplicate jobs each processed once: [3 3 3] doubled", []int{6, 6, 6}, 3, func() []int {',
			'		return Pool([]int{3, 3, 3}, 2, double)',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import "sync"',
			'',
			'// Pool processes every job through fn using exactly `workers`',
			'// goroutines sharing one jobs channel.',
			'//',
			'// Four moving parts, each with one job:',
			'//   workers   — range the shared queue, one result per job',
			'//   feeder    — pushes jobs, then close(jobsCh) ends every range',
			'//   closer    — wg.Wait() then close(results): the fan-in rule (only',
			'//               the party that knows ALL senders stopped may close)',
			'//   main body — drains results; doubles as the join point, since',
			'//               results only closes after every worker is done',
			'// The feeder must be a goroutine: with unbuffered channels, feeding',
			'// inline would deadlock the moment workers fill results while this',
			'// function is still trying to push jobs instead of receiving.',
			'func Pool(jobs []int, workers int, fn func(int) int) []int {',
			'	jobsCh := make(chan int)',
			'	results := make(chan int)',
			'',
			'	var wg sync.WaitGroup',
			'	for w := 0; w < workers; w++ {',
			'		wg.Add(1)',
			'		go func() {',
			'			defer wg.Done()',
			'			for j := range jobsCh { // shared queue = free load balancing',
			'				results <- fn(j)',
			'			}',
			'		}()',
			'	}',
			'',
			'	go func() { // feeder',
			'		for _, j := range jobs {',
			'			jobsCh <- j',
			'		}',
			'		close(jobsCh) // "no more work" — every worker\'s range ends',
			'	}()',
			'',
			'	go func() { // closer',
			'		wg.Wait()',
			'		close(results)',
			'	}()',
			'',
			'	out := []int{}',
			'	for r := range results {',
			'		out = append(out, r)',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Reading the deadlock before it happens</h3>' +
			'<p>The habit this problem builds is static reasoning about who blocks on ' +
			'whom. Trace the inline-feed variant: main sends job 3 into ' +
			'<code>jobsCh</code>… both workers are blocked sending into ' +
			'<code>results</code>… nobody receives from <code>results</code> until the ' +
			'feed loop finishes… which it cannot. Every arrow in that cycle is visible ' +
			'in the source. Channel code rewards drawing the graph the diagram shows ' +
			'and checking it for cycles — the compiler will not do it for you.</p>' +
			'<h3>Choosing W</h3>' +
			'<p>CPU-bound work wants <code>runtime.NumCPU()</code> workers — more just ' +
			'adds scheduling overhead. I/O-bound work (the common case) wants W sized ' +
			'to the <em>external</em> constraint: the database pool, the rate limit, ' +
			'the memory each in-flight task holds. That external number is the whole ' +
			'reason pools exist; when there is no such constraint, skip the pool and ' +
			'spawn per task.</p>' +
			'<h3>The production versions</h3>' +
			'<p>Real pools add three things this exercise strips away: results carry ' +
			'<code>(value, error)</code> structs, not bare ints; a ' +
			'<code>context.Context</code> threads through so <code>select { case j := ' +
			'&lt;-jobsCh: case &lt;-ctx.Done(): }</code> can abandon the queue on ' +
			'cancellation; and if job order must be preserved, jobs carry their index ' +
			'and results land in a pre-sized slice — the goroutines lesson&rsquo;s ' +
			'write-by-index trick again. <code>golang.org/x/sync/errgroup</code> with ' +
			'<code>SetLimit</code> packages this whole pattern in six lines and is what ' +
			'most codebases should reach for first.</p>',
		],
		complexity: { time: 'O(n) fn calls across W workers', space: 'O(n) for results; O(W) goroutines' },
	});
})();
