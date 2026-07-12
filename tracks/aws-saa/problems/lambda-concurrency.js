/* Lambda Concurrency — Compute & Scaling (Easy). Little's law (L = λW)
 * applied to Lambda: concurrent executions = request rate × duration, and
 * the sustainable rate under a concurrency cap. Integer math only, with the
 * floor/ceil directions spelled out (they encode who pays for rounding).
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="concurrency as an area: request rate times duration">' +
		// axes
		'<path d="M 60 150 L 60 30" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowLMB)" fill="none"/>' +
		'<path d="M 60 150 L 440 150" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowLMB)" fill="none"/>' +
		'<text x="24" y="40" class="lbl">rate λ</text>' +
		'<text x="24" y="54" class="lbl">(req/s)</text>' +
		'<text x="392" y="172" class="lbl">duration W (s)</text>' +
		// area rectangle: rate 100 × duration 0.2s
		'<rect x="60" y="70" width="180" height="80" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="150" y="105" text-anchor="middle">L = λ × W</text>' +
		'<text x="150" y="125" text-anchor="middle" class="lbl">100 req/s × 0.2 s = 20 in flight</text>' +
		'<text x="46" y="74" text-anchor="end" class="lbl">100</text>' +
		'<text x="240" y="166" text-anchor="middle" class="lbl">0.2</text>' +
		// slow-function rectangle: same area idea, longer W
		'<rect x="60" y="134" width="380" height="16" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 3"/>' +
		'<text x="250" y="146" text-anchor="middle" class="lbl">5 req/s × 30 s = 150 in flight — slow functions eat concurrency</text>' +
		'<text x="46" y="146" text-anchor="end" class="lbl">5</text>' +
		'<defs><marker id="dgArrowLMB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'lambda-concurrency',
		title: 'Lambda Concurrency Math',
		nav: 'Lambda Concurrency',
		difficulty: 'Easy',
		category: 'Compute & Scaling',
		task: 'Implement RequiredConcurrency and ThrottledRPS with integer math. Make all 6 tests pass.',

		prose: [
			'<h2>Lambda Concurrency Math</h2>' +
			'<p>You are designing a serverless API and the ops review asks two questions: ' +
			'“how many concurrent Lambda executions will this traffic need?” and “what ' +
			'happens when we hit our concurrency limit?” Lambda bills and throttles by ' +
			'<em>concurrent executions</em> — the number of invocations in flight at once — ' +
			'and the account default limit is 1,000 across all functions in a region.</p>' +
			'<p>The tool for both questions is one line of queueing theory, ' +
			'<strong>Little’s law</strong>: items in the system = arrival rate × time each ' +
			'item spends inside (<em>L = λW</em>). For Lambda: concurrency = requests/sec × ' +
			'average duration in seconds.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Two functions, integer math only — and the rounding directions are part of ' +
			'the spec:</p>' +
			'<ul>' +
			'<li><code>RequiredConcurrency(rps int, avgDurationMs int) int</code> = ' +
			'<code>ceil(rps × avgDurationMs ÷ 1000)</code>. Round <em>up</em>: a workload ' +
			'that needs 0.05 executions on average still holds 1 whole execution while it ' +
			'runs, and capacity planning must cover the need, not approximate it.</li>' +
			'<li><code>ThrottledRPS(rps int, avgDurationMs int, concurrencyLimit int) int</code> = ' +
			'<code>max(0, rps − floor(concurrencyLimit × 1000 ÷ avgDurationMs))</code>. ' +
			'Inverting Little’s law gives the sustainable rate λ = L ÷ W; round that ' +
			'<em>down</em> (a fractional request per second cannot be admitted — ' +
			'pessimistic, like the reservation itself), and everything above it throttles. ' +
			'Never return a negative number: headroom is simply “0 throttled”.</li>' +
			'</ul>' +
			'<h3>Examples</h3>',
			{ code: 'RequiredConcurrency(100, 200)    →  20    // 100 req/s × 0.2 s\nRequiredConcurrency(5, 30000)    →  150   // 5 req/s × 30 s — slow eats capacity\nRequiredConcurrency(1, 50)       →  1     // 0.05 rounds UP: can\'t run half an execution\n\nThrottledRPS(1000, 1000, 800)    →  200   // limit sustains 800 req/s; 200 throttle\nThrottledRPS(100, 200, 100)      →  0     // limit sustains 500 req/s; headroom', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// RequiredConcurrency returns the concurrent executions a steady',
			'// workload needs: ceil(rps × avgDurationMs / 1000). This is',
			'// Little\'s law (L = λW) with the duration converted from ms.',
			'// Integer math only — no floats needed.',
			'func RequiredConcurrency(rps int, avgDurationMs int) int {',
			'	return -1 // your code here',
			'}',
			'',
			'// ThrottledRPS returns how many requests per second get throttled',
			'// under a concurrency cap:',
			'//   max(0, rps − floor(concurrencyLimit × 1000 / avgDurationMs))',
			'// The floor term is the sustainable rate the limit supports.',
			'func ThrottledRPS(rps int, avgDurationMs int, concurrencyLimit int) int {',
			'	return -1 // your code here',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		call func() int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{"100 req/s × 200ms", func() int { return RequiredConcurrency(100, 200) }, 20},',
			'		{"10 req/s × 3s", func() int { return RequiredConcurrency(10, 3000) }, 30},',
			'		// Catches truncating division: 1×50/1000 = 0.05 must round UP to 1.',
			'		{"sub-1 rounds up: 1 req/s × 50ms", func() int { return RequiredConcurrency(1, 50) }, 1},',
			'		// The exam-favorite trap: modest rps, long duration, huge concurrency.',
			'		{"long duration trap: 5 req/s × 30s", func() int { return RequiredConcurrency(5, 30000) }, 150},',
			'		// Catches a missing max(0, ...): sustainable 500 req/s > offered 100.',
			'		{"under the limit: 100 req/s × 200ms, limit 100", func() int { return ThrottledRPS(100, 200, 100) }, 0},',
			'		{"over the limit: 1000 req/s × 1s, limit 800", func() int { return ThrottledRPS(1000, 1000, 800) }, 200},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := c.call()',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%d", got)',
			'		})',
			'		results = append(results, r)',
			'	}',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// RequiredConcurrency returns the concurrent executions a steady',
			'// workload needs: ceil(rps × avgDurationMs / 1000).',
			'//',
			'// Little\'s law: executions in flight = arrival rate × residence',
			'// time. The units do the conversion — rps × ms gives "request-',
			'// milliseconds per second", and dividing by 1000 ms/s leaves a',
			'// dimensionless count of in-flight executions.',
			'//',
			'// Ceiling in pure integer math: (a + b − 1) / b. Rounding up is',
			'// deliberate — an average demand of 0.05 executions still occupies',
			'// one whole execution slot whenever a request is running, and a',
			'// capacity plan that rounds need DOWN under-provisions by design.',
			'func RequiredConcurrency(rps int, avgDurationMs int) int {',
			'	return (rps*avgDurationMs + 999) / 1000',
			'}',
			'',
			'// ThrottledRPS returns how many requests per second get throttled',
			'// under a concurrency cap.',
			'//',
			'// Inverting Little\'s law: with L slots and W seconds per request,',
			'// the sustainable arrival rate is λ = L/W = limit × 1000 /',
			'// avgDurationMs. Go\'s integer division IS the floor here (all',
			'// operands are non-negative), and floor is the honest direction:',
			'// a fractional request per second cannot be admitted, so the',
			'// sustainable rate is rounded against the caller — the mirror',
			'// image of RequiredConcurrency rounding the requirement up.',
			'func ThrottledRPS(rps int, avgDurationMs int, concurrencyLimit int) int {',
			'	sustainable := concurrencyLimit * 1000 / avgDurationMs',
			'	if rps <= sustainable {',
			'		return 0 // headroom: nothing throttles',
			'	}',
			'	return rps - sustainable',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: simulate it</h3>' +
			'<p>You could discrete-event-simulate a day of traffic and count peak in-flight ' +
			'invocations. For a <em>steady</em> workload the simulation always converges to ' +
			'the same number, because a one-line theorem already knows the answer.</p>' +
			'<h3>The insight</h3>' +
			'<p>The general principle is <strong>Little’s law (L = λW)</strong> — items in a ' +
			'system = arrival rate × time each item spends inside. It is the single most ' +
			'reusable capacity-planning formula in systems work: it needs no assumptions ' +
			'about arrival distribution, and it sizes anything that holds work in flight — ' +
			'Lambda concurrency, goroutine pools, database connection pools ' +
			'(<code>SetMaxOpenConns</code> ≈ qps × query time), thread-per-request servers, ' +
			'even queue depth in the message-queue problems on the system-design track.</p>',
			{ code: '// need: round UP — demand of 0.05 still occupies a whole slot\nneed := (rps*avgDurationMs + 999) / 1000\n\n// capacity: round DOWN — a fractional req/s cannot be admitted\nsustainable := concurrencyLimit * 1000 / avgDurationMs' },
			'<p>Note the deliberate asymmetry: the <em>requirement</em> rounds up and the ' +
			'<em>capacity</em> rounds down. Both errors land on the safe side — you never ' +
			'plan for less than you need, and you never promise more than the limit ' +
			'sustains. Choosing rounding directions by <em>who pays for the error</em> is ' +
			'the same move as ceil in target-tracking autoscaling.</p>' +
			'<p>The duration term is the trap the diagram shows: 5 req/s <em>sounds</em> ' +
			'negligible, but at 30 s per invocation it holds 150 concurrent executions — ' +
			'15% of a default account limit consumed by a “quiet” function. Concurrency is ' +
			'an <em>area</em> (rate × duration), and long duration inflates it just as ' +
			'effectively as high rate.</p>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Concurrent executions = rps × duration(s), against a <strong>default ' +
			'account-level limit of 1,000</strong> shared by every function in the region ' +
			'(raisable by support ticket); excess invocations throttle with 429s. ' +
			'<strong>Reserved concurrency</strong> carves a function a guaranteed slice ' +
			'(and caps it there — also the trick to cap a runaway function); ' +
			'<strong>provisioned concurrency</strong> keeps instances pre-warmed to kill ' +
			'cold starts — a latency feature, not a capacity one. And when a scenario ' +
			'pairs a long-running invocation with modest traffic, do the multiplication: ' +
			'long duration starves the shared pool long before the rps looks scary.</p>',
		],
		complexity: { time: 'O(1)', space: 'O(1)' },
	});
})();
