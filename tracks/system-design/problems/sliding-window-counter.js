/* Sliding Window Counter — Rate Limiting (Medium). The two-bucket
 * approximation of the sliding log (the algorithm Cloudflare runs at its
 * edge): two counters + linear interpolation instead of a timestamp per
 * request. Deterministic harness: Allow takes the clock as a parameter
 * (nowMs); test points sit at quarter/half fractions of the window so the
 * float weight is exact and rounding can never flip a verdict.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 160" width="500" height="160" role="img" aria-label="sliding window counter: previous window count weighted by its remaining overlap with the sliding window, plus the current window count">' +
		// prev window box, with the still-counted overlap shaded
		'<rect x="40" y="55" width="180" height="50" rx="4" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<rect x="85" y="55" width="135" height="50" rx="4" fill="var(--accent)" opacity="0.14" stroke="none"/>' +
		'<text x="130" y="85" text-anchor="middle">prev: 4</text>' +
		'<text x="130" y="45" text-anchor="middle" class="lbl">previous window</text>' +
		'<text x="152" y="120" text-anchor="middle" class="lbl">still overlaps 75% of the sliding window</text>' +
		// cur window box
		'<rect x="220" y="55" width="180" height="50" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<text x="310" y="85" text-anchor="middle">cur: 1</text>' +
		'<text x="310" y="45" text-anchor="middle" class="lbl">current window</text>' +
		// now marker, 25% into the current window
		'<path d="M 265 55 L 265 112" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<text x="268" y="135" class="lbl">now · 25% into cur</text>' +
		// time axis
		'<path d="M 40 145 L 470 145" stroke="var(--edge)" stroke-width="1.2" marker-end="url(#dgArrowSWC)" fill="none"/>' +
		// formula
		'<text x="40" y="24">est = 1 + 4 × 0.75 = 4  →  deny (est ≥ limit 4)</text>' +
		'<defs><marker id="dgArrowSWC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'sliding-window-counter',
		title: 'Sliding Window Counter Rate Limiter',
		nav: 'Sliding Counter',
		difficulty: 'Medium',
		category: 'Rate Limiting',
		task: 'Implement Allow with two window counters and a weighted estimate — make all 5 tests pass.',

		prose: [
			'<h2>Sliding Window Counter Rate Limiter</h2>' +
			'<p>The sliding window <em>log</em> is exact but stores a timestamp per ' +
			'admitted request — per client. At CDN scale that’s the expensive part of ' +
			'the limiter. The <em>sliding window counter</em> (the algorithm Cloudflare ' +
			'described for its edge) keeps just <strong>two integers</strong>: the ' +
			'request count of the current fixed window and of the previous one, and ' +
			'<em>estimates</em> the trailing-window rate by assuming the previous ' +
			'window’s requests were spread evenly:</p>' +
			DIAGRAM +
			'<ul>' +
			'<li>Windows are fixed slots: window index = <code>nowMs / windowMs</code> (integer division).</li>' +
			'<li>When the index advances by exactly 1, the current window becomes the previous (<code>prev = cur; cur = 0</code>); when it advances by 2 or more, a full window of silence has passed — both counters reset to 0.</li>' +
			'<li><code>est = cur + prev × (1 − elapsedFraction)</code>, where <code>elapsedFraction</code> is how far <code>nowMs</code> sits into the current window.</li>' +
			'<li>Allow iff <code>est &lt; limit</code>, then increment <code>cur</code>. Denied requests are not counted.</li>' +
			'</ul>' +
			'<h3>The idea</h3>' +
			'<p>Early in a window, the previous window overlaps most of the trailing ' +
			'span, so its count weighs heavily; as the window ages, that weight decays ' +
			'linearly to zero. The estimate is wrong exactly when traffic inside the ' +
			'previous window was lopsided — that’s the accuracy you trade for O(1) ' +
			'memory. Cloudflare measured the trade on real traffic: across 400 million ' +
			'requests, only 0.003% were misjudged. Same injected-clock convention as ' +
			'the token bucket: <code>Allow(nowMs)</code>, never wall clock.</p>',
		],

		starter: [
			'package main',
			'',
			'// Limiter approximates a sliding-window rate limit with two fixed-',
			'// window counters: the previous window\'s count is weighted by how',
			'// much of it still overlaps the trailing window. Time is injected',
			'// (nowMs) rather than read from a clock, so behavior is fully',
			'// deterministic.',
			'type Limiter struct {',
			'	limit    int',
			'	windowMs int64',
			'	// your fields here — hint: the index of the current window',
			'	// (nowMs / windowMs), plus int counts for cur and prev.',
			'}',
			'',
			'func NewLimiter(limit int, windowMs int64) *Limiter {',
			'	return &Limiter{limit: limit, windowMs: windowMs}',
			'}',
			'',
			'// Allow reports whether a request arriving at nowMs may proceed.',
			'// Roll the windows if nowMs has entered a new slot (advance by 1:',
			'// prev=cur, cur=0; advance by 2+: both reset), then admit iff',
			'// cur + prev*(1-elapsedFraction) < limit, incrementing cur on admit.',
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
			'	// Every probe sits at a quarter/half point of a 1000ms window with',
			'	// integer counts, so the weighted estimate is an exact small',
			'	// integer (quarters are exact in binary floating point) and',
			'	// rounding can never flip a verdict — same caution as the token',
			'	// bucket harness.',
			'	cases := []tc{',
			'		{"burst in one window: limit=4 window=1s, 5 calls at t=0", 4, 1000,',
			'			[]int64{0, 0, 0, 0, 0},',
			'			[]bool{true, true, true, true, false}},',
			'		// prev=4 carries into window 1 with weight 1.0 at t=1000',
			'		// (est=4, deny), 0.75 at 1250 (est=3, allow), and so on — the',
			'		// old window\'s influence decays linearly as the window ages.',
			'		{"carry-over decays: limit=4 window=1s at 0,0,0,0,1000,1250,1250,1500,1500,1750,2000", 4, 1000,',
			'			[]int64{0, 0, 0, 0, 1000, 1250, 1250, 1500, 1500, 1750, 2000},',
			'			[]bool{true, true, true, true, false, true, false, true, false, true, true}},',
			'		// Jumping from window 0 to window 3 skips ≥2 slots: BOTH',
			'		// counters must reset (prev=cur would wrongly deny at t=3000).',
			'		{"idle gap resets both: limit=2 window=1s at 0,0,0,3000,3000,3000", 2, 1000,',
			'			[]int64{0, 0, 0, 3000, 3000, 3000},',
			'			[]bool{true, true, false, true, true, false}},',
			'		// Half-window probe: prev=2 weighs 2*0.5=1 at t=1500, leaving',
			'		// room for exactly 3 more before est reaches the limit of 4.',
			'		{"partial prev at half-window: limit=4 window=1s at 100,200,1500,1500,1500,1500", 4, 1000,',
			'			[]int64{100, 200, 1500, 1500, 1500, 1500},',
			'			[]bool{true, true, true, true, true, false}},',
			'		// Steady traffic at half-window spacing settles into an',
			'		// allow/deny rhythm governed by the weighted estimate.',
			'		{"steady half-window pace: limit=2 window=1s at 0,500,1000,1500,2000", 2, 1000,',
			'			[]int64{0, 500, 1000, 1500, 2000},',
			'			[]bool{true, true, false, true, true}},',
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
			'// Limiter approximates a sliding-window rate limit with two fixed-',
			'// window counters: the previous window\'s count is weighted by how',
			'// much of it still overlaps the trailing window. Time is injected',
			'// (nowMs) rather than read from a clock, so behavior is fully',
			'// deterministic.',
			'type Limiter struct {',
			'	limit    int',
			'	windowMs int64',
			'	curIdx   int64 // index (nowMs/windowMs) of the window cur counts',
			'	cur      int   // admitted requests in the current fixed window',
			'	prev     int   // admitted requests in the immediately previous one',
			'}',
			'',
			'func NewLimiter(limit int, windowMs int64) *Limiter {',
			'	// Zero values are exactly right: curIdx=0 with cur=prev=0 means',
			'	// "window 0, nothing seen yet", and a first call in any later',
			'	// window rolls forward through the same code path as normal use.',
			'	return &Limiter{limit: limit, windowMs: windowMs}',
			'}',
			'',
			'// Allow reports whether a request arriving at nowMs may proceed.',
			'func (l *Limiter) Allow(nowMs int64) bool {',
			'	// Integer division buckets time into fixed slots. Rolling lazily',
			'	// on access (rather than on a timer) is the same trick as the',
			'	// token bucket\'s lazy refill: no background work per client.',
			'	idx := nowMs / l.windowMs',
			'	if idx != l.curIdx {',
			'		if idx == l.curIdx+1 {',
			'			// Adjacent window: the counts shift down one slot.',
			'			l.prev = l.cur',
			'		} else {',
			'			// A gap of 2+ windows means at least one FULL window of',
			'			// silence sits inside the trailing span — the old counts',
			'			// contribute nothing. Forgetting this branch (prev=cur',
			'			// unconditionally) wrongly penalizes returning clients.',
			'			l.prev = 0',
			'		}',
			'		l.cur = 0',
			'		l.curIdx = idx',
			'	}',
			'',
			'	// elapsed = how far into the current window we are, in [0,1).',
			'	// The previous window\'s requests are assumed uniform, so the',
			'	// fraction of them still inside the trailing window is (1-elapsed).',
			'	elapsed := float64(nowMs%l.windowMs) / float64(l.windowMs)',
			'	est := float64(l.cur) + float64(l.prev)*(1.0-elapsed)',
			'',
			'	if est < float64(l.limit) {',
			'		l.cur++ // only admitted requests are counted',
			'		return true',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: the log</h3>' +
			'<p>The exact answer is the previous problem — a timestamp per admitted ' +
			'request. Per client. A CDN edge tracking millions of client IPs at ' +
			'limit=1000 would spend gigabytes on limiter state alone, and sharing that ' +
			'state across nodes means shipping whole logs around. The fixed-window ' +
			'counter is the opposite extreme — one integer, but a client can burst ' +
			'2× the limit by straddling a window boundary.</p>' +
			'<h3>The insight: interpolate between two fixed windows</h3>' +
			'<p>This is the <strong>sliding window counter</strong> pattern — ' +
			'approximate a sliding aggregate by keeping <em>fixed</em>-window counters ' +
			'and linearly weighting the old one by its remaining overlap:</p>',
			{ code: 'elapsed := float64(nowMs%l.windowMs) / float64(l.windowMs)\nest := float64(l.cur) + float64(l.prev)*(1.0-elapsed)\nif est < float64(l.limit) { l.cur++; return true }' },
			'<p>The estimate assumes the previous window’s traffic was uniform. When it ' +
			'wasn’t, the verdict can be slightly wrong in either direction — but never ' +
			'by more than the previous window’s count, and Cloudflare’s production ' +
			'measurement (400M requests) put actual misjudgments at 0.003%. In exchange:</p>' +
			'<ul>' +
			'<li><strong>Memory:</strong> two ints + an index vs. up to <code>limit</code> timestamps — per client. That’s what makes per-IP limiting affordable at the edge.</li>' +
			'<li><strong>Sharing:</strong> two counters sum across nodes and fit in one Redis hash <code>INCR</code>; a log needs a sorted set with trimming.</li>' +
			'<li><strong>Boundary bursts:</strong> unlike the plain fixed window, the weighted tail keeps straddling bursts near the limit instead of 2× it.</li>' +
			'</ul>' +
			'<p>Two details carry the correctness: roll windows <em>lazily</em> on ' +
			'access (index advance by 1 shifts <code>prev=cur</code>; by 2+ resets both ' +
			'— a returning client after an idle gap starts clean), and count only ' +
			'admitted requests. The same interpolate-between-buckets move shows up ' +
			'beyond rate limiting — sliding-window metrics (p99 over the last minute ' +
			'from per-second bins) and circuit-breaker failure rates use it too. ' +
			'Choose the log when the limit is a hard contract; choose the counter when ' +
			'the limit is traffic protection and state size rules.</p>',
		],
		complexity: { time: 'O(1) per request', space: 'O(1) per client' },
	});
})();
