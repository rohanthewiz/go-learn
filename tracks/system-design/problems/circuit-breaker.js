/* Circuit Breaker — Resilience (Medium). The three-state failure guard from
 * Hystrix/Envoy, with an injected clock. Op-script harness (like lru-cache):
 * each case drives a sequence of Allow/Record/State calls and compares the
 * rendered trace — state transitions are fully deterministic.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="circuit breaker state machine: closed to open on consecutive failures, open to half-open after cooldown, half-open back to closed on probe success or to open on probe failure">' +
		// closed
		'<rect x="30" y="40" width="110" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="85" y="65" text-anchor="middle">closed</text>' +
		'<text x="85" y="98" text-anchor="middle" class="lbl">requests flow;</text>' +
		'<text x="85" y="111" text-anchor="middle" class="lbl">success resets the streak</text>' +
		// open
		'<rect x="380" y="40" width="110" height="40" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="435" y="65" text-anchor="middle">open</text>' +
		'<text x="435" y="98" text-anchor="middle" class="lbl">Allow=false — fail fast</text>' +
		// half-open
		'<rect x="205" y="150" width="120" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="265" y="175" text-anchor="middle">half-open</text>' +
		// closed -> open
		'<path d="M 140 55 L 376 55" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowCBK)" fill="none"/>' +
		'<text x="258" y="46" text-anchor="middle" class="lbl">failThreshold consecutive failures</text>' +
		// open -> half-open
		'<path d="M 445 84 C 445 135 390 168 329 170" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowCBK)" fill="none"/>' +
		'<text x="415" y="140" class="lbl">cooldown elapsed:</text>' +
		'<text x="415" y="153" class="lbl">next Allow =</text>' +
		'<text x="415" y="166" class="lbl">the one probe</text>' +
		// half-open -> closed
		'<path d="M 205 170 C 130 168 75 135 75 84" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowCBK)" fill="none"/>' +
		'<text x="30" y="140" class="lbl">probe succeeds:</text>' +
		'<text x="30" y="153" class="lbl">full reset</text>' +
		// half-open -> open
		'<path d="M 325 155 C 365 138 400 115 425 86" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#dgArrowCBK)" fill="none"/>' +
		'<text x="298" y="125" class="lbl">probe fails: re-open,</text>' +
		'<text x="298" y="138" class="lbl">fresh cooldown</text>' +
		'<defs><marker id="dgArrowCBK" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'circuit-breaker',
		title: 'Circuit Breaker',
		nav: 'Circuit Breaker',
		difficulty: 'Medium',
		category: 'Resilience',
		task: 'Implement Allow, Record, and State for the closed/open/half-open machine.',

		prose: [
			'<h2>Circuit Breaker</h2>' +
			'<p>Backoff spaces retries out; a circuit breaker stops sending them at all. ' +
			'When a dependency is down, every call still burns a timeout’s worth of ' +
			'threads and sockets — and keeps pounding the thing that is trying to recover. ' +
			'A breaker watches outcomes and, after enough consecutive failures, ' +
			'<em>trips</em>: further calls are rejected instantly (fail fast) until a ' +
			'cooldown passes and a single probe tests whether the dependency healed.</p>' +
			DIAGRAM +
			'<p>Implement the three methods on <code>Breaker</code> ' +
			'(states are the strings <code>"closed"</code>, <code>"open"</code>, ' +
			'<code>"half-open"</code>; time is injected as <code>nowMs</code>, non-decreasing):</p>' +
			'<ul>' +
			'<li><code>Allow(nowMs) bool</code> — may a request proceed? <em>closed</em>: always. ' +
			'<em>open</em>: no — unless <code>cooldownMs</code> has elapsed since the breaker ' +
			'opened, in which case this call moves to <em>half-open</em> and is granted as ' +
			'the probe. While half-open, exactly ONE probe is outstanding, so further ' +
			'<code>Allow</code> calls return false until its outcome is recorded.</li>' +
			'<li><code>Record(nowMs, ok)</code> — report the outcome of an allowed request. ' +
			'<em>closed</em>: a failure bumps a consecutive-failure counter — hitting ' +
			'<code>failThreshold</code> trips to open and stamps <code>openedAt = nowMs</code>; a ' +
			'success resets the counter to 0. <em>half-open</em>: success → closed (full ' +
			'reset); failure → open with a fresh cooldown (<code>openedAt = nowMs</code>).</li>' +
			'<li><code>State(nowMs) string</code> — the <em>effective</em> state, for dashboards: ' +
			'report <code>"half-open"</code> when open with the cooldown elapsed (the next ' +
			'<code>Allow</code> will be the probe), without mutating anything.</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			'// Breaker is a three-state circuit breaker ("closed", "open",',
			'// "half-open"). It observes outcomes via Record and gates requests',
			'// via Allow; time arrives as a parameter, never from a clock.',
			'type Breaker struct {',
			'	failThreshold int    // consecutive failures that trip closed → open',
			'	cooldownMs    int64  // how long open lasts before a probe is allowed',
			'	state         string // "closed", "open", or "half-open"',
			'	consecFails   int    // failure streak while closed',
			'	openedAt      int64  // when the breaker last tripped to open',
			'}',
			'',
			'func NewBreaker(failThreshold int, cooldownMs int64) *Breaker {',
			'	return &Breaker{',
			'		failThreshold: failThreshold,',
			'		cooldownMs:    cooldownMs,',
			'		state:         "closed",',
			'	}',
			'}',
			'',
			'// Allow reports whether a request arriving at nowMs may proceed.',
			'// Open + cooldown elapsed → move to half-open and grant this call as',
			'// the single probe; while half-open, no further call is granted.',
			'func (b *Breaker) Allow(nowMs int64) bool {',
			'	return false // your code here',
			'}',
			'',
			'// Record reports the outcome (ok) of a previously allowed request.',
			'// Closed: failures build a streak, success resets it, streak ==',
			'// failThreshold trips to open. Half-open: probe ok → closed (full',
			'// reset); probe failure → open with a fresh cooldown.',
			'func (b *Breaker) Record(nowMs int64, ok bool) {',
			'	// your code here',
			'}',
			'',
			'// State returns the effective state at nowMs for observability:',
			'// "open" with the cooldown elapsed reads as "half-open". Read-only.',
			'func (b *Breaker) State(nowMs int64) string {',
			'	return "" // your code here',
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
			'	// Op script per case, lru-cache style: "allow" and "state" produce',
			'	// trace lines, "record" only mutates. The rendered trace is the',
			'	// expected value — transitions are deterministic under injected time.',
			'	type op struct {',
			'		kind string // "allow" | "record" | "state"',
			'		t    int64',
			'		ok   bool // outcome, for "record" only',
			'	}',
			'	type tc struct {',
			'		name      string',
			'		threshold int',
			'		cooldown  int64',
			'		ops       []op',
			'		want      []string',
			'	}',
			'	cases := []tc{',
			'		{"trip after 3 consecutive failures; a success resets the streak (cooldown=1000)", 3, 1000,',
			'			[]op{{"allow", 0, false}, {"record", 0, false}, {"allow", 1, false}, {"record", 1, false},',
			'				{"allow", 2, false}, {"record", 2, true}, {"state", 2, false},',
			'				{"allow", 3, false}, {"record", 3, false}, {"allow", 4, false}, {"record", 4, false}, {"state", 4, false},',
			'				{"allow", 5, false}, {"record", 5, false}, {"state", 5, false}, {"allow", 6, false}},',
			'			[]string{"allow@0=true", "allow@1=true", "allow@2=true", "state@2=closed",',
			'				"allow@3=true", "allow@4=true", "state@4=closed",',
			'				"allow@5=true", "state@5=open", "allow@6=false"}},',
			'		{"open rejects until cooldown, then exactly one probe (threshold=1, cooldown=100)", 1, 100,',
			'			[]op{{"allow", 0, false}, {"record", 0, false}, {"allow", 10, false}, {"allow", 99, false},',
			'				{"state", 99, false}, {"state", 100, false}, {"allow", 100, false}, {"allow", 100, false}, {"state", 100, false}},',
			'			[]string{"allow@0=true", "allow@10=false", "allow@99=false",',
			'				"state@99=open", "state@100=half-open", "allow@100=true", "allow@100=false", "state@100=half-open"}},',
			'		{"probe success closes the breaker — full reset (threshold=1, cooldown=100)", 1, 100,',
			'			[]op{{"allow", 0, false}, {"record", 0, false}, {"allow", 100, false}, {"record", 120, true},',
			'				{"state", 120, false}, {"allow", 121, false}, {"record", 121, true}, {"allow", 122, false}},',
			'			[]string{"allow@0=true", "allow@100=true", "state@120=closed", "allow@121=true", "allow@122=true"}},',
			'		{"probe failure re-opens with a FRESH cooldown (threshold=1, cooldown=100)", 1, 100,',
			'			[]op{{"allow", 0, false}, {"record", 0, false}, {"allow", 100, false}, {"record", 105, false},',
			'				{"allow", 150, false}, {"allow", 204, false}, {"state", 204, false},',
			'				{"allow", 205, false}, {"record", 210, true}, {"state", 210, false}},',
			'			[]string{"allow@0=true", "allow@100=true", "allow@150=false", "allow@204=false",',
			'				"state@204=open", "allow@205=true", "state@210=closed"}},',
			'		{"alternating fail/success never trips at threshold=2 (cooldown=1000)", 2, 1000,',
			'			[]op{{"allow", 0, false}, {"record", 0, false}, {"allow", 1, false}, {"record", 1, true},',
			'				{"allow", 2, false}, {"record", 2, false}, {"allow", 3, false}, {"record", 3, true}, {"state", 3, false},',
			'				{"allow", 4, false}, {"record", 4, false}, {"allow", 5, false}, {"record", 5, false}, {"state", 5, false}, {"allow", 6, false}},',
			'			[]string{"allow@0=true", "allow@1=true", "allow@2=true", "allow@3=true", "state@3=closed",',
			'				"allow@4=true", "allow@5=true", "state@5=open", "allow@6=false"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			b := NewBreaker(c.threshold, c.cooldown)',
			'			got := []string{}',
			'			for _, o := range c.ops {',
			'				switch o.kind {',
			'				case "allow":',
			'					got = append(got, fmt.Sprintf("allow@%d=%v", o.t, b.Allow(o.t)))',
			'				case "record":',
			'					b.Record(o.t, o.ok)',
			'				case "state":',
			'					got = append(got, fmt.Sprintf("state@%d=%s", o.t, b.State(o.t)))',
			'				}',
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
			'// Breaker is a three-state circuit breaker ("closed", "open",',
			'// "half-open"). It observes outcomes via Record and gates requests',
			'// via Allow; time arrives as a parameter, never from a clock.',
			'//',
			'// Half-open needs no extra "probe outstanding" flag: the ONLY way in',
			'// is Allow granting the probe, and the only ways out are Record on',
			'// that probe — so being half-open IS the probe being in flight.',
			'type Breaker struct {',
			'	failThreshold int    // consecutive failures that trip closed → open',
			'	cooldownMs    int64  // how long open lasts before a probe is allowed',
			'	state         string // "closed", "open", or "half-open"',
			'	consecFails   int    // failure streak while closed',
			'	openedAt      int64  // when the breaker last tripped to open',
			'}',
			'',
			'func NewBreaker(failThreshold int, cooldownMs int64) *Breaker {',
			'	return &Breaker{',
			'		failThreshold: failThreshold,',
			'		cooldownMs:    cooldownMs,',
			'		state:         "closed",',
			'	}',
			'}',
			'',
			'// Allow reports whether a request arriving at nowMs may proceed.',
			'// Open + cooldown elapsed → move to half-open and grant this call as',
			'// the single probe; while half-open, no further call is granted.',
			'func (b *Breaker) Allow(nowMs int64) bool {',
			'	switch b.state {',
			'	case "closed":',
			'		return true',
			'	case "open":',
			'		if nowMs-b.openedAt >= b.cooldownMs {',
			'			// Cooldown over: THIS caller becomes the probe. The',
			'			// transition happens here (not in State) because granting',
			'			// the probe slot is what must be exactly-once.',
			'			b.state = "half-open"',
			'			return true',
			'		}',
			'		return false // fail fast: no timeout burned, no load added',
			'	default: // "half-open"',
			'		// The single probe slot is taken until its Record arrives.',
			'		// Letting more traffic through would defeat the point: if the',
			'		// dependency is still down, we just re-created the stampede.',
			'		return false',
			'	}',
			'}',
			'',
			'// Record reports the outcome (ok) of a previously allowed request.',
			'// Closed: failures build a streak, success resets it, streak ==',
			'// failThreshold trips to open. Half-open: probe ok → closed (full',
			'// reset); probe failure → open with a fresh cooldown.',
			'func (b *Breaker) Record(nowMs int64, ok bool) {',
			'	switch b.state {',
			'	case "closed":',
			'		if ok {',
			'			// CONSECUTIVE is the operative word: one success proves',
			'			// the dependency is alive, so the streak restarts.',
			'			b.consecFails = 0',
			'			return',
			'		}',
			'		b.consecFails++',
			'		if b.consecFails >= b.failThreshold {',
			'			b.state = "open"',
			'			b.openedAt = nowMs',
			'			b.consecFails = 0 // fresh streak whenever we re-close later',
			'		}',
			'	case "half-open":',
			'		if ok {',
			'			b.state = "closed" // recovery confirmed: full reset',
			'			b.consecFails = 0',
			'		} else {',
			'			// Probe failed — the dependency is still sick. Restart the',
			'			// cooldown from NOW, not from the original trip, or a',
			'			// long-dead dependency would get probed in a tight loop.',
			'			b.state = "open"',
			'			b.openedAt = nowMs',
			'		}',
			'	}',
			'	// "open": unreachable for well-behaved callers (nothing was',
			'	// allowed), so a stray Record is deliberately a no-op.',
			'}',
			'',
			'// State returns the effective state at nowMs for observability:',
			'// "open" with the cooldown elapsed reads as "half-open". Read-only.',
			'func (b *Breaker) State(nowMs int64) string {',
			'	if b.state == "open" && nowMs-b.openedAt >= b.cooldownMs {',
			'		// Effective, not stored, state: the next Allow WILL be granted',
			'		// as the probe, and a dashboard should say so. Mutating here',
			'		// would hand out probe slots from a read path — never do that.',
			'		return "half-open"',
			'	}',
			'	return b.state',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why breakers exist</h3>' +
			'<p>When a dependency dies, the naive caller discovers it one timeout at a ' +
			'time — every request holds a thread, a socket, and an upstream slot for the ' +
			'full timeout before failing. Under load that <em>propagates</em> the outage: ' +
			'your service exhausts its own pools waiting on a corpse, and callers of ' +
			'<em>yours</em> start timing out too. The <strong>circuit breaker pattern</strong> ' +
			'converts slow failures into instant ones (fail fast) and sheds load off the ' +
			'dying dependency so it can actually recover — the same reason electrical ' +
			'breakers trip instead of letting wires melt.</p>' +
			'<h3>Half-open is a hypothesis test</h3>' +
			'<p>The subtle state is half-open. “Cooldown elapsed” is not evidence of ' +
			'recovery — it is permission to <em>test</em> the hypothesis, at a sample size ' +
			'of one. That is why exactly one probe goes through: if the dependency is ' +
			'still down, the system paid one failed request instead of re-creating the ' +
			'stampede; if it succeeds, the breaker closes and normal traffic resumes. Two ' +
			'details carry most of the correctness:</p>',
			{ code: '// probe failure: cooldown restarts from NOW —\n// otherwise a dead dependency gets probed in a tight loop\nb.state = "open"\nb.openedAt = nowMs' },
			'<ul>' +
			'<li><strong>Consecutive, not cumulative</strong> failures trip the breaker: one ' +
			'success resets the streak, so a 1% background error rate never opens it.</li>' +
			'<li><strong>Transitions live in Allow/Record, never in State.</strong> The probe ' +
			'slot must be granted exactly once, so the read-only observability path cannot ' +
			'be the thing that hands it out.</li>' +
			'</ul>' +
			'<h3>Where the pattern lives</h3>' +
			'<p>Netflix’s Hystrix popularized it (tripping on error <em>rate</em> over a ' +
			'rolling window rather than a streak); Envoy and Istio do it at the mesh layer ' +
			'as outlier detection — ejecting bad hosts from the load-balancing pool, which ' +
			'is a per-host breaker; gRPC and resilience libraries (resilience4j, Polly) ' +
			'ship it as middleware. It composes with the previous problem: backoff paces ' +
			'the retries a breaker still allows, and the breaker caps the damage when ' +
			'backoff alone is not enough.</p>',
		],
		complexity: { time: 'O(1) per call', space: 'O(1) per protected dependency' },
	});
})();
