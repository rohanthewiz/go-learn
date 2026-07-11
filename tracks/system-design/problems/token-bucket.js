/* Token Bucket — Rate Limiting (Easy). The algorithm behind most API rate
 * limiters (and Go's own golang.org/x/time/rate). Deterministic harness:
 * Allow takes the clock as a parameter, so the tests ARE the timeline —
 * which is itself the design lesson (testable time = injectable time).
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 160" width="500" height="160" role="img" aria-label="token bucket: steady refill, bursty drain">' +
		// bucket
		'<path d="M 60 40 L 70 130 L 150 130 L 160 40" fill="none" stroke="var(--fg)" stroke-width="1.8"/>' +
		'<circle cx="95" cy="115" r="8" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<circle cx="120" cy="118" r="8" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<circle cx="108" cy="98" r="8" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="110" y="28" text-anchor="middle" class="lbl">capacity = max burst</text>' +
		// refill
		'<path d="M 110 40 L 110 62" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowTB)" fill="none"/>' +
		'<text x="205" y="58" class="lbl">+rate tokens/sec, clamped at capacity</text>' +
		// requests
		'<path d="M 78 145 L 40 145" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowTB)" fill="none"/>' +
		'<text x="20" y="130" class="lbl">each allowed</text>' +
		'<text x="20" y="143" class="lbl">request takes 1</text>' +
		// timeline
		'<text x="240" y="92" class="lbl">requests:</text>' +
		'<text x="310" y="92" style="fill:var(--ok)">✓ ✓ ✓</text>' +
		'<text x="352" y="92" style="fill:var(--err-fg)">✗ ✗</text>' +
		'<text x="392" y="92" class="lbl">…wait…</text>' +
		'<text x="443" y="92" style="fill:var(--ok)">✓</text>' +
		'<text x="240" y="112" class="lbl">burst drains the bucket; the refill rate is the</text>' +
		'<text x="240" y="126" class="lbl">sustained throughput ceiling</text>' +
		'<defs><marker id="dgArrowTB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'token-bucket',
		title: 'Token Bucket Rate Limiter',
		nav: 'Token Bucket',
		difficulty: 'Easy',
		category: 'Rate Limiting',
		task: 'Implement Allow: refill by elapsed time (clamped), spend 1 token per admit.',

		prose: [
			'<h2>Token Bucket Rate Limiter</h2>' +
			'<p>An API that lets one client send 10,000 requests in a second falls over ' +
			'for everyone else. Rate limiters cap each client’s throughput — and the ' +
			'<em>token bucket</em> is the standard algorithm because it allows short bursts ' +
			'while enforcing a long-run rate:</p>' +
			DIAGRAM +
			'<ul>' +
			'<li>The bucket holds up to <code>capacity</code> tokens and starts full.</li>' +
			'<li>Tokens drip in at <code>refillPerSec</code>, clamped at capacity (idle time doesn’t bank unlimited credit).</li>' +
			'<li>A request is allowed if a whole token is available, spending it; otherwise it is rejected.</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Allow(nowMs)</code>. Note the signature: the caller passes the ' +
			'clock in milliseconds instead of the limiter reading <code>time.Now()</code>. ' +
			'Injecting time is what makes a rate limiter (or any time-driven component) ' +
			'deterministic and testable — the harness replays exact timelines.</p>' +
			'<p>Refill lazily: no ticker goroutine, just “how much time passed since my ' +
			'last call?” on each request. Calls arrive in non-decreasing time order.</p>',
		],

		starter: [
			'package main',
			'',
			'// TokenBucket admits requests at a sustained refill rate while',
			'// permitting bursts up to capacity. Time is injected (nowMs) rather',
			'// than read from a clock, so behavior is fully deterministic.',
			'type TokenBucket struct {',
			'	capacity   float64 // maximum tokens (burst size)',
			'	refillRate float64 // tokens added per second',
			'	// your fields here — you\'ll need the current token count and',
			'	// the timestamp of the last refill.',
			'}',
			'',
			'func NewTokenBucket(capacity int, refillPerSec float64) *TokenBucket {',
			'	return &TokenBucket{',
			'		capacity:   float64(capacity),',
			'		refillRate: refillPerSec,',
			'		// initialize your fields — the bucket starts FULL',
			'	}',
			'}',
			'',
			'// Allow reports whether a request arriving at nowMs (milliseconds on',
			'// a monotonic clock) may proceed, consuming one token if so. Callers',
			'// guarantee nowMs is non-decreasing across calls.',
			'func (b *TokenBucket) Allow(nowMs int64) bool {',
			'	return true // your code here',
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
			'		capacity int',
			'		rate     float64',
			'		times    []int64 // ms timestamps of successive Allow calls',
			'		want     []bool',
			'	}',
			'	// Timelines avoid exact refill boundaries (e.g. probing at 1.2 or',
			'	// 1.4 tokens, never 1.0) so float rounding can\'t flip a verdict.',
			'	cases := []tc{',
			'		{"burst then deny: cap=3 rate=1/s, 4 calls at t=0", 3, 1.0,',
			'			[]int64{0, 0, 0, 0}, []bool{true, true, true, false}},',
			'		{"steady refill: cap=1 rate=2/s, calls at 0,100,600,700,1300ms", 1, 2.0,',
			'			[]int64{0, 100, 600, 700, 1300}, []bool{true, false, true, false, true}},',
			'		{"idle doesn\'t overfill: cap=2 rate=1/s, drain, wait 60s, 3 calls", 2, 1.0,',
			'			[]int64{0, 0, 60000, 60000, 60000}, []bool{true, true, true, true, false}},',
			'		{"sustained at rate: cap=5 rate=10/s, a call every 100ms", 5, 10.0,',
			'			[]int64{0, 100, 200, 300, 400, 500, 600, 700},',
			'			[]bool{true, true, true, true, true, true, true, true}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			b := NewTokenBucket(c.capacity, c.rate)',
			'			got := make([]bool, 0, len(c.times))',
			'			for _, t := range c.times {',
			'				got = append(got, b.Allow(t))',
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
			'import "math"',
			'',
			'// TokenBucket admits requests at a sustained refill rate while',
			'// permitting bursts up to capacity. Time is injected (nowMs) rather',
			'// than read from a clock, so behavior is fully deterministic.',
			'type TokenBucket struct {',
			'	capacity   float64 // maximum tokens (burst size)',
			'	refillRate float64 // tokens added per second',
			'	tokens     float64 // current balance, refilled lazily',
			'	lastMs     int64   // when tokens was last brought up to date',
			'}',
			'',
			'func NewTokenBucket(capacity int, refillPerSec float64) *TokenBucket {',
			'	return &TokenBucket{',
			'		capacity:   float64(capacity),',
			'		refillRate: refillPerSec,',
			'		tokens:     float64(capacity), // start full: allow an initial burst',
			'		// lastMs starts at 0; the first call\'s "refill" is harmless',
			'		// because the balance is already clamped at capacity.',
			'	}',
			'}',
			'',
			'// Allow reports whether a request arriving at nowMs may proceed,',
			'// consuming one token if so.',
			'//',
			'// Lazy refill: instead of a background ticker adding tokens, each',
			'// call credits the elapsed time since the previous call. Same math,',
			'// no goroutine, no locks around a timer — this is how production',
			'// limiters (e.g. golang.org/x/time/rate) do it.',
			'func (b *TokenBucket) Allow(nowMs int64) bool {',
			'	elapsed := float64(nowMs-b.lastMs) / 1000.0',
			'	b.lastMs = nowMs',
			'	// Clamp at capacity: a long idle period must not bank unbounded',
			'	// credit, or the "limiter" would wave through an unlimited burst.',
			'	b.tokens = math.Min(b.capacity, b.tokens+elapsed*b.refillRate)',
			'',
			'	if b.tokens >= 1 {',
			'		b.tokens--',
			'		return true',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Lazy refill</h3>' +
			'<p>The naive picture — a goroutine adding a token every 100ms — works but ' +
			'costs a timer per bucket, and a limiter fronting a million API keys has a ' +
			'million buckets. The standard trick is to make refill <em>lazy</em>: store ' +
			'the balance and its last-updated time, and on each request credit the gap.</p>',
			{ code: 'elapsed := float64(nowMs-b.lastMs) / 1000.0\nb.lastMs = nowMs\nb.tokens = math.Min(b.capacity, b.tokens+elapsed*b.refillRate)' },
			'<p>Two lines carry the semantics:</p>' +
			'<ul>' +
			'<li><strong>The clamp is the burst cap.</strong> Without <code>math.Min</code>, a ' +
			'client idle for an hour arrives holding 3,600 tokens and the limiter limits ' +
			'nothing. Capacity bounds how much “credit” idleness can bank.</li>' +
			'<li><strong>Injected time is testable time.</strong> Because <code>Allow</code> takes ' +
			'<code>nowMs</code>, the harness replays exact timelines with no sleeping and no ' +
			'flakes. In production you’d wrap it: <code>Allow(time.Now().UnixMilli())</code>.</li>' +
			'</ul>' +
			'<h3>Where it sits in a system</h3>' +
			'<p>Per-client buckets live in a map keyed by API key or IP (memcached/Redis ' +
			'when the fleet needs to share state — the lazy-refill state is just two ' +
			'numbers, small enough for a Redis hash per client). Compared with its cousins: ' +
			'<em>fixed window</em> counts per minute but allows 2× bursts at window edges; ' +
			'<em>sliding log</em> is exact but stores a timestamp per request; token bucket ' +
			'stores two floats and still shapes bursts — which is why it’s the default.</p>',
		],
		complexity: { time: 'O(1) per request', space: 'O(1) per client' },
	});
})();
