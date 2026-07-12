/* Sliding Window Log — Rate Limiting (Medium). The EXACT rate limiter:
 * remember every accepted timestamp, count the ones still inside the
 * window. Deterministic harness: Allow takes the clock as a parameter
 * (nowMs), so the tests replay exact timelines — same convention as the
 * token bucket.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 150" width="500" height="150" role="img" aria-label="sliding window log: accepted timestamps on a time axis; only those inside the trailing window count toward the limit">' +
		// axis
		'<path d="M 20 105 L 480 105" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowSWL)" fill="none"/>' +
		// window bracket (now-W, now]
		'<rect x="240" y="60" width="210" height="60" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="6 4"/>' +
		'<text x="345" y="50" text-anchor="middle" class="lbl" style="fill:var(--accent)">window (now−W, now]</text>' +
		'<path d="M 440 97 L 440 113" stroke="var(--fg)" stroke-width="1.6"/>' +
		'<text x="440" y="130" text-anchor="middle" class="lbl">now</text>' +
		'<text x="240" y="130" text-anchor="middle" class="lbl">now−W</text>' +
		// evicted timestamps (outside window)
		'<circle cx="70" cy="90" r="6" fill="none" stroke="var(--dim)" stroke-width="1.6"/>' +
		'<circle cx="130" cy="90" r="6" fill="none" stroke="var(--dim)" stroke-width="1.6"/>' +
		'<circle cx="200" cy="90" r="6" fill="none" stroke="var(--dim)" stroke-width="1.6"/>' +
		'<text x="130" y="70" text-anchor="middle" class="lbl">t ≤ now−W → evicted</text>' +
		// in-window timestamps
		'<circle cx="280" cy="90" r="6" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<circle cx="340" cy="90" r="6" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<circle cx="400" cy="90" r="6" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="345" y="80" text-anchor="middle" class="lbl">3 in log</text>' +
		// verdict
		'<text x="20" y="24" class="lbl">limit = 3 → this request is denied — and a denial is NOT recorded</text>' +
		'<text x="465" y="90" style="fill:var(--err-fg)">✗</text>' +
		'<defs><marker id="dgArrowSWL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'sliding-window-log',
		title: 'Sliding Window Log Rate Limiter',
		nav: 'Sliding Log',
		difficulty: 'Medium',
		category: 'Rate Limiting',
		task: 'Implement Allow: evict timestamps older than the window, admit while the log is under the limit — make all 5 tests pass.',

		prose: [
			'<h2>Sliding Window Log Rate Limiter</h2>' +
			'<p>The token bucket <em>shapes</em> traffic, but it can’t promise ' +
			'“never more than N requests in any W-millisecond span” — refill credit ' +
			'trickles in continuously. When the rule is a hard contract (per-user ' +
			'login attempts, a paid API quota), the exact algorithm is the ' +
			'<em>sliding window log</em>: remember the timestamp of every accepted ' +
			'request and count the ones still inside the trailing window.</p>' +
			'<p>Implement <code>Allow(nowMs)</code> for a limiter built with ' +
			'<code>NewLimiter(limit, windowMs)</code>. On each call, in this order:</p>' +
			'<ul>' +
			'<li><strong>Evict:</strong> drop every logged timestamp <code>t</code> with <code>t ≤ nowMs − windowMs</code> — a request stops counting once the window has fully passed it.</li>' +
			'<li><strong>Decide:</strong> allow iff the log now holds fewer than <code>limit</code> entries; on allow, record <code>nowMs</code> in the log.</li>' +
			'<li><strong>Denied requests are NOT recorded.</strong> Only admitted traffic occupies the window — a client hammering a full limiter doesn’t push its own recovery further away. (Some variants log denials to punish retry storms; this one doesn’t, and the tests check that.)</li>' +
			'</ul>' +
			'<h3>The idea</h3>' +
			DIAGRAM +
			'<p>Because <code>nowMs</code> is non-decreasing across calls, the log stays ' +
			'sorted for free — eviction is just trimming a prefix. And since an allow ' +
			'only happens when the log is under <code>limit</code>, the log can never ' +
			'hold more than <code>limit</code> timestamps: the memory cost is bounded ' +
			'per client, which is the number to remember when comparing this to the ' +
			'counter-based approximation in the next problem.</p>',
		],

		starter: [
			'package main',
			'',
			'// Limiter is an exact sliding-window rate limiter: at most `limit`',
			'// requests are admitted in any trailing windowMs span. It keeps a log',
			'// of ACCEPTED timestamps only. Time is injected (nowMs) rather than',
			'// read from a clock, so behavior is fully deterministic.',
			'type Limiter struct {',
			'	limit    int',
			'	windowMs int64',
			'	// your fields here — hint: a []int64 of accepted timestamps.',
			'	// Callers guarantee nowMs is non-decreasing, so the slice stays',
			'	// sorted and eviction is a prefix trim.',
			'}',
			'',
			'func NewLimiter(limit int, windowMs int64) *Limiter {',
			'	return &Limiter{limit: limit, windowMs: windowMs}',
			'}',
			'',
			'// Allow reports whether a request arriving at nowMs may proceed.',
			'// First evict every logged t with t <= nowMs-windowMs, then admit',
			'// iff the log holds fewer than limit entries, recording nowMs on',
			'// admit. Denied requests are not recorded.',
			'func (l *Limiter) Allow(nowMs int64) bool {',
			'	return false // your code here',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"reflect"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name     string',
			'		limit    int',
			'		windowMs int64',
			'		times    []int64 // ms timestamps of successive Allow calls',
			'		want     []bool',
			'	}',
			'	cases := []tc{',
			'		{"burst then deny: limit=3 window=1s, 4 calls at t=0", 3, 1000,',
			'			[]int64{0, 0, 0, 0},',
			'			[]bool{true, true, true, false}},',
			'		// Capacity frees one slot at a time, exactly one window after',
			'		// each accepted request — contrast the token bucket, whose',
			'		// refill trickles in continuously.',
			'		{"burst then slide: limit=3 window=1s at 0,100,200,300,999,1000,1050,1100,1200", 3, 1000,',
			'			[]int64{0, 100, 200, 300, 999, 1000, 1050, 1100, 1200},',
			'			[]bool{true, true, true, false, false, true, false, true, true}},',
			'		// If denials were logged, the retries at 100/200 would occupy',
			'		// the window and the call at t=1000 would be denied.',
			'		{"denials are not recorded: limit=1 window=1s at 0,100,200,1000,1500,2000", 1, 1000,',
			'			[]int64{0, 100, 200, 1000, 1500, 2000},',
			'			[]bool{true, false, false, true, false, true}},',
			'		// A fixed-window counter resets at t=1000 and would allow the',
			'		// call at 1050; the sliding log still sees 950 in its window.',
			'		{"no boundary burst: limit=2 window=1s at 900,950,1050,1900,1949,1950", 2, 1000,',
			'			[]int64{900, 950, 1050, 1900, 1949, 1950},',
			'			[]bool{true, true, false, true, false, true}},',
			'		// t=1000 is exactly window past t=0: 0 <= 1000-1000 evicts it,',
			'		// so calls spaced exactly one window apart all pass.',
			'		{"exact window spacing: limit=1 window=1s at 0,1000,2000,2999", 1, 1000,',
			'			[]int64{0, 1000, 2000, 2999},',
			'			[]bool{true, true, true, false}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			l := NewLimiter(c.limit, c.windowMs)',
			'			got := make([]bool, 0, len(c.times))',
			'			for _, t := range c.times {',
			'				got = append(got, l.Allow(t))',
			'			}',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
			'			r["got"] = fmt.Sprintf("%v", got)',
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
			'// Limiter is an exact sliding-window rate limiter: at most `limit`',
			'// requests are admitted in any trailing windowMs span. It keeps a log',
			'// of ACCEPTED timestamps only. Time is injected (nowMs) rather than',
			'// read from a clock, so behavior is fully deterministic.',
			'type Limiter struct {',
			'	limit    int',
			'	windowMs int64',
			'	// log holds accepted timestamps, oldest first. Two invariants',
			'	// keep it cheap: nowMs is non-decreasing (so the slice is always',
			'	// sorted — eviction is a prefix trim, no search), and an entry is',
			'	// only added when len < limit (so the log never exceeds limit).',
			'	log []int64',
			'}',
			'',
			'func NewLimiter(limit int, windowMs int64) *Limiter {',
			'	return &Limiter{limit: limit, windowMs: windowMs}',
			'}',
			'',
			'// Allow reports whether a request arriving at nowMs may proceed.',
			'func (l *Limiter) Allow(nowMs int64) bool {',
			'	// Evict first: a request at time t stops counting once the window',
			'	// has fully passed it (t <= nowMs-windowMs). Doing this before the',
			'	// decision is what makes freed capacity visible to THIS call —',
			'	// evict-after would deny a request that is actually within quota.',
			'	cutoff := nowMs - l.windowMs',
			'	i := 0',
			'	for i < len(l.log) && l.log[i] <= cutoff {',
			'		i++',
			'	}',
			'	if i > 0 {',
			'		// Compact in place rather than re-slicing forward: l.log[i:]',
			'		// would keep the evicted prefix alive in the backing array.',
			'		// copy handles the overlap safely, and since the log is at',
			'		// most `limit` long the move is O(limit), i.e. O(1) per call',
			'		// for a fixed configuration.',
			'		l.log = append(l.log[:0], l.log[i:]...)',
			'	}',
			'',
			'	if len(l.log) >= l.limit {',
			'		// Denied requests are NOT recorded: only admitted traffic',
			'		// occupies the window, so a client\'s failed retries never',
			'		// push its own recovery further into the future.',
			'		return false',
			'	}',
			'	l.log = append(l.log, nowMs)',
			'	return true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force is already the algorithm</h3>' +
			'<p>“Count the accepted requests in the last W ms” barely needs an insight — ' +
			'keep the timestamps, filter, count. The engineering content is in the ' +
			'<em>invariants</em> that make the naive idea O(1):</p>' +
			'<ul>' +
			'<li><strong>Monotonic time keeps the log sorted.</strong> New entries only ' +
			'append at the end, expiry only trims the front — the log is a queue, and a ' +
			'production version uses a ring buffer for exactly that reason.</li>' +
			'<li><strong>The limit bounds the log.</strong> An entry is only recorded when ' +
			'<code>len &lt; limit</code>, so memory is O(limit) per client — not ' +
			'O(traffic). That single check is the difference between a limiter and a ' +
			'memory leak fed by the very flood it’s supposed to stop.</li>' +
			'<li><strong>Evict, then decide, then record.</strong> Ordering is the whole ' +
			'method:</li>' +
			'</ul>',
			{ code: 'cutoff := nowMs - l.windowMs\nfor i < len(l.log) && l.log[i] <= cutoff { i++ } // 1. evict the past\nif len(l.log) >= l.limit { return false }        // 2. denials not recorded\nl.log = append(l.log, nowMs)                      // 3. admit + record' },
			'<h3>What exactness buys — and costs</h3>' +
			'<p>This is the <strong>sliding window log</strong> pattern: keep an event ' +
			'log and evict by a time horizon. It is <em>exact</em> — never more than ' +
			'<code>limit</code> in any trailing window, no fixed-window boundary bursts ' +
			'(the harness’s <code>900,950,1050</code> case is precisely the burst a ' +
			'fixed counter would wave through). The cost is a timestamp per admitted ' +
			'request per client: at limit=1000 across a million API keys that’s ' +
			'gigabytes, where a token bucket stores two floats. That trade — ' +
			'<em>exactness vs. per-client state</em> — is why the next problem ' +
			'approximates this log with two counters, and why real deployments (Redis ' +
			'sorted-set limiters, fraud/abuse velocity checks, dedup windows) pick per ' +
			'use case. Note the contrast in <em>recovery shape</em> too: the log frees ' +
			'capacity one slot at a time, exactly one window after each accepted ' +
			'request, while the token bucket’s refill trickles continuously.</p>',
		],
		complexity: { time: 'O(1) amortized per request (log ≤ limit)', space: 'O(limit) per client' },
	});
})();
