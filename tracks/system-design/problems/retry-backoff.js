/* Retry Backoff — Resilience (Easy). Exponential backoff with a cap: the
 * delay schedule behind every serious retry loop (AWS SDKs, gRPC, Kubernetes).
 * Exact-table harness — the schedule is pure arithmetic. Jitter, which real
 * systems add, is discussed in the explanation (the track forbids randomness).
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 170" width="520" height="170" role="img" aria-label="exponential backoff: delays double per attempt until clamped at the cap">' +
		'<text x="14" y="18" class="lbl">delay = min(capMs, baseMs · 2^attempt)</text>' +
		// cap line
		'<path d="M 24 44 L 470 44" stroke="var(--err-edge)" stroke-width="1.4" stroke-dasharray="5 4" fill="none"/>' +
		'<text x="476" y="48" class="lbl">capMs</text>' +
		// bars: 100,200,400,800,1600,1600,1600 scaled to 90px at cap
		'<rect x="30" y="128" width="30" height="6" fill="var(--accent)"/>' +
		'<rect x="95" y="123" width="30" height="11" fill="var(--accent)"/>' +
		'<rect x="160" y="112" width="30" height="22" fill="var(--accent)"/>' +
		'<rect x="225" y="89" width="30" height="45" fill="var(--accent)"/>' +
		'<rect x="290" y="44" width="30" height="90" fill="var(--accent)"/>' +
		'<rect x="355" y="44" width="30" height="90" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<rect x="420" y="44" width="30" height="90" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="370" y="38" text-anchor="middle" class="lbl">clamped</text>' +
		// axis
		'<path d="M 24 134 L 480 134" stroke="var(--dim)" stroke-width="1.2" marker-end="url(#dgArrowRBO)" fill="none"/>' +
		'<text x="45" y="152" text-anchor="middle" class="lbl">0</text>' +
		'<text x="110" y="152" text-anchor="middle" class="lbl">1</text>' +
		'<text x="175" y="152" text-anchor="middle" class="lbl">2</text>' +
		'<text x="240" y="152" text-anchor="middle" class="lbl">3</text>' +
		'<text x="305" y="152" text-anchor="middle" class="lbl">4</text>' +
		'<text x="370" y="152" text-anchor="middle" class="lbl">5</text>' +
		'<text x="435" y="152" text-anchor="middle" class="lbl">6</text>' +
		'<text x="250" y="167" text-anchor="middle" class="lbl">attempt</text>' +
		'<defs><marker id="dgArrowRBO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'retry-backoff',
		title: 'Exponential Backoff with Cap',
		nav: 'Retry Backoff',
		difficulty: 'Easy',
		category: 'Resilience',
		task: 'Implement Delay (capped doubling with an overflow guard) and DelaysUntilBudget.',

		prose: [
			'<h2>Exponential Backoff with Cap</h2>' +
			'<p>A dependency times out. Retrying immediately is how outages get worse: ' +
			'every client hammering a struggling service keeps it struggling. The fix is ' +
			'to <em>back off</em> — wait longer after each failure — so load on the ' +
			'dependency falls off exponentially while it recovers:</p>' +
			DIAGRAM +
			'<p>Implement two pure functions (all values are milliseconds; ' +
			'<code>baseMs ≥ 1</code>, <code>capMs ≥ baseMs</code>):</p>' +
			'<ul>' +
			'<li><code>Delay(attempt, baseMs, capMs int) int</code> — ' +
			'<code>min(capMs, baseMs·2^attempt)</code> for <code>attempt ≥ 0</code>. ' +
			'<strong>Overflow guard</strong>: if <code>attempt ≥ 62</code>, or the doubling would ' +
			'exceed <code>capMs</code> (or overflow) at any point, return <code>capMs</code> — ' +
			'the cap is where every schedule ends up anyway.</li>' +
			'<li><code>DelaysUntilBudget(baseMs, capMs, budgetMs int) []int</code> — the successive ' +
			'delays a client actually sleeps (attempt 0, 1, 2, …) until the <em>cumulative</em> ' +
			'sum would exceed <code>budgetMs</code>. Do <strong>not</strong> include the delay that ' +
			'crosses the budget. This answers the capacity-planning question “how many ' +
			'retries fit in my request deadline?”</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			'// Delay returns the backoff before retry number `attempt` (0-based):',
			'// min(capMs, baseMs·2^attempt). Guard against overflow: for',
			'// attempt >= 62, or whenever the doubling would exceed capMs or',
			'// overflow, return capMs.',
			'func Delay(attempt, baseMs, capMs int) int {',
			'	return 0 // your code here',
			'}',
			'',
			'// DelaysUntilBudget lists the successive delays (attempt 0, 1, 2, …)',
			'// a client sleeps until the cumulative sum would exceed budgetMs.',
			'// The delay that crosses the budget is NOT included.',
			'func DelaysUntilBudget(baseMs, capMs, budgetMs int) []int {',
			'	return nil // your code here — build with Delay()',
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
			'	// Two tables: point checks on Delay, then whole schedules from',
			'	// DelaysUntilBudget.',
			'	type dtc struct {',
			'		name           string',
			'		baseMs, capMs  int',
			'		attempts, want []int',
			'	}',
			'	delayCases := []dtc{',
			'		{"Delay base=100 cap=10000, attempts 0,1,3,7,8", 100, 10000,',
			'			[]int{0, 1, 3, 7, 8}, []int{100, 200, 800, 10000, 10000}},',
			'		{"Delay below the cap: base=50 cap=100000, attempts 0..5", 50, 100000,',
			'			[]int{0, 1, 2, 3, 4, 5}, []int{50, 100, 200, 400, 800, 1600}},',
			'		{"Delay overflow guard: base=100 cap=3600000, attempts 40,62,63,100", 100, 3600000,',
			'			[]int{40, 62, 63, 100}, []int{3600000, 3600000, 3600000, 3600000}},',
			'	}',
			'	type btc struct {',
			'		name                    string',
			'		baseMs, capMs, budgetMs int',
			'		want                    []int',
			'	}',
			'	budgetCases := []btc{',
			'		{"Budget base=100 cap=10000 budget=60000", 100, 10000, 60000,',
			'			[]int{100, 200, 400, 800, 1600, 3200, 6400, 10000, 10000, 10000, 10000}},',
			'		{"Budget excludes the crossing delay: base=100 cap=10000 budget=1000", 100, 10000, 1000,',
			'			[]int{100, 200, 400}}, // next is 800: 700+800 > 1000, so stop at 3 delays',
			'		{"Budget rides the cap: base=500 cap=4000 budget=20000", 500, 4000, 20000,',
			'			[]int{500, 1000, 2000, 4000, 4000, 4000, 4000}},',
			'	}',
			'	results := make([]map[string]any, 0, len(delayCases)+len(budgetCases))',
			'	for _, c := range delayCases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := make([]int, 0, len(c.attempts))',
			'			for _, a := range c.attempts {',
			'				got = append(got, Delay(a, c.baseMs, c.capMs))',
			'			}',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
			'			r["got"] = fmt.Sprintf("%v", got)',
			'		})',
			'		results = append(results, r)',
			'	}',
			'	for _, c := range budgetCases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := DelaysUntilBudget(c.baseMs, c.capMs, c.budgetMs)',
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
			'// Delay returns the backoff before retry number `attempt` (0-based):',
			'// min(capMs, baseMs·2^attempt). Guard against overflow: for',
			'// attempt >= 62, or whenever the doubling would exceed capMs or',
			'// overflow, return capMs.',
			'func Delay(attempt, baseMs, capMs int) int {',
			'	// 2^62 already dwarfs any millisecond cap a real system uses, and',
			'	// 1<<63 flips the sign bit — bail out before shifting that far.',
			'	if attempt >= 62 {',
			'		return capMs',
			'	}',
			'	d := baseMs',
			'	for i := 0; i < attempt; i++ {',
			'		d <<= 1',
			'		// Two exits share one check: once d reaches the cap, further',
			'		// doubling can only stay clamped; and if the shift overflowed,',
			'		// d went negative — either way the answer is capMs. Checking',
			'		// INSIDE the loop means d never doubles more than once past',
			'		// the cap, so intermediate values stay far from overflow too.',
			'		if d >= capMs || d < 0 {',
			'			return capMs',
			'		}',
			'	}',
			'	return d // still under the cap after all doublings',
			'}',
			'',
			'// DelaysUntilBudget lists the successive delays (attempt 0, 1, 2, …)',
			'// a client sleeps until the cumulative sum would exceed budgetMs.',
			'// The delay that crosses the budget is NOT included.',
			'func DelaysUntilBudget(baseMs, capMs, budgetMs int) []int {',
			'	delays := []int{}',
			'	total := 0',
			'	for attempt := 0; ; attempt++ {',
			'		d := Delay(attempt, baseMs, capMs)',
			'		// Check before appending: a schedule must fit WITHIN the',
			'		// budget, so the delay that would cross it is dropped. The',
			'		// loop always terminates — d is at least baseMs (>= 1), so',
			'		// total strictly grows toward the budget.',
			'		if total+d > budgetMs {',
			'			return delays',
			'		}',
			'		delays = append(delays, d)',
			'		total += d',
			'	}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why exponential, and why a cap</h3>' +
			'<p>Retrying on a fixed short interval multiplies load exactly when the ' +
			'dependency can least afford it — each wave of failures schedules an equal ' +
			'wave of retries, and the service never gets headroom to recover. That ' +
			'feedback loop is <em>congestive collapse</em>. <strong>Exponential backoff</strong> ' +
			'breaks it: doubling the delay halves the retry pressure per failure round, so ' +
			'aggregate load decays geometrically while the outage persists. The cap exists ' +
			'because the exponent quickly stops being useful — attempt 20 of a 100ms base ' +
			'is a 29-hour wait. Clamping at, say, 30s keeps retries live without letting ' +
			'the schedule (or the arithmetic — hence the overflow guard) run away.</p>' +
			'<h3>The part everyone forgets: jitter</h3>' +
			'<p>Pure exponential backoff has a synchronization bug. When a service blips, ' +
			'<em>thousands</em> of clients fail at the same instant — and deterministic ' +
			'schedules mean they all come back at the same instant, again and again: a ' +
			'<strong>thundering herd</strong> in perfectly timed waves. Production systems ' +
			'randomize. AWS’s analysis landed on <em>full jitter</em> as the sweet spot:</p>',
			{ code: '// AWS full jitter (illustrative — this track\'s tests are\n// deterministic, so randomness stays OUT of the graded code):\nsleep = rand.Int63n(int64(Delay(attempt, baseMs, capMs)) + 1)' },
			'<p>Spreading each wait uniformly over <code>[0, delay]</code> smears the herd ' +
			'across time; AWS measured it giving both fewer total calls and faster ' +
			'completion than un-jittered backoff. The deterministic schedule you built is ' +
			'the <em>envelope</em>; jitter samples inside it.</p>' +
			'<h3>Where it lives</h3>' +
			'<p>This exact schedule (with jitter) ships in the AWS SDKs, gRPC’s retry and ' +
			'reconnection policy, Kubernetes controller requeues, and Cassandra drivers. ' +
			'<code>DelaysUntilBudget</code> is the planning half: with base 100ms and cap 10s, ' +
			'eleven retries fit in a 60s deadline — after that a client should stop ' +
			'retrying and fail fast, which is precisely the job of the next problem, the ' +
			'circuit breaker. Backoff and breakers are complementary: backoff spaces out ' +
			'retries; a breaker stops sending them at all.</p>',
		],
		complexity: { time: 'O(attempt) per Delay, O(k) for a k-delay schedule', space: 'O(k) for the schedule' },
	});
})();
