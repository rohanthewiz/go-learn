/* Probes — Pods (Medium). Liveness says RESTART ME; readiness says STOP
 * SENDING ME TRAFFIC — and neither acts on a single result. The learner
 * implements the kubelet's per-probe counter machine: consecutive-failure and
 * consecutive-success streaks, threshold-gated transitions, and the guarantee
 * that a long bad run fires the transition exactly once.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// A probe-result timeline with failureThreshold=3: the blip resets the
	// streak, only the third CONSECUTIVE failure flips the state — once.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 190" width="540" height="190" role="img" aria-label="probe results over time with failureThreshold 3: a single failure blip resets, three consecutive failures cause one became-unhealthy transition">' +
		'<text x="20" y="24" class="lbl">probe results over time — failureThreshold: 3</text>' +
		// result dots: ok ok fail ok fail fail fail fail
		'<circle cx="60" cy="70" r="13" fill="none" stroke="var(--ok)" stroke-width="2"/><text x="60" y="75" text-anchor="middle" style="fill:var(--ok)">✓</text>' +
		'<circle cx="120" cy="70" r="13" fill="none" stroke="var(--ok)" stroke-width="2"/><text x="120" y="75" text-anchor="middle" style="fill:var(--ok)">✓</text>' +
		'<circle cx="180" cy="70" r="13" fill="none" stroke="var(--err-edge)" stroke-width="2"/><text x="180" y="75" text-anchor="middle" style="fill:var(--err-fg)">✗</text>' +
		'<circle cx="240" cy="70" r="13" fill="none" stroke="var(--ok)" stroke-width="2"/><text x="240" y="75" text-anchor="middle" style="fill:var(--ok)">✓</text>' +
		'<circle cx="300" cy="70" r="13" fill="none" stroke="var(--err-edge)" stroke-width="2"/><text x="300" y="75" text-anchor="middle" style="fill:var(--err-fg)">✗</text>' +
		'<circle cx="360" cy="70" r="13" fill="none" stroke="var(--err-edge)" stroke-width="2"/><text x="360" y="75" text-anchor="middle" style="fill:var(--err-fg)">✗</text>' +
		'<circle cx="420" cy="70" r="13" fill="none" stroke="var(--err-edge)" stroke-width="3"/><text x="420" y="75" text-anchor="middle" style="fill:var(--err-fg)">✗</text>' +
		'<circle cx="480" cy="70" r="13" fill="none" stroke="var(--err-edge)" stroke-width="2"/><text x="480" y="75" text-anchor="middle" style="fill:var(--err-fg)">✗</text>' +
		// failStreak counters under each dot
		'<text x="60" y="104" text-anchor="middle" class="lbl">0</text>' +
		'<text x="120" y="104" text-anchor="middle" class="lbl">0</text>' +
		'<text x="180" y="104" text-anchor="middle" class="lbl">1</text>' +
		'<text x="240" y="104" text-anchor="middle" class="lbl" style="fill:var(--ok)">0 ← reset</text>' +
		'<text x="300" y="104" text-anchor="middle" class="lbl">1</text>' +
		'<text x="360" y="104" text-anchor="middle" class="lbl">2</text>' +
		'<text x="420" y="104" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">3 = FT</text>' +
		'<text x="480" y="104" text-anchor="middle" class="lbl">4…</text>' +
		'<text x="20" y="104" class="lbl">failStreak</text>' +
		// the single transition
		'<path d="M 420 118 L 420 146" fill="none" stroke="var(--err-edge)" stroke-width="1.6" marker-end="url(#dgArrowKPR)"/>' +
		'<text x="420" y="164" text-anchor="middle" style="fill:var(--err-fg)">became-unhealthy — fires ONCE</text>' +
		'<text x="20" y="184" class="lbl">the blip at ✓ resets the streak: thresholds are a debounce, not a counter of total failures</text>' +
		'<defs>' +
		'<marker id="dgArrowKPR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'probes',
		title: 'Probes: The Threshold Debounce',
		nav: 'Probes',
		difficulty: 'Medium',
		category: 'Pods',
		task: 'Implement Observe — streak counting, threshold-gated transitions, fire-once semantics, all 6 tests.',

		prose: [
			'<h2>Probes: The Threshold Debounce</h2>' +
			'<p>Your service GC-pauses for four seconds under load. One liveness probe ' +
			'times out — and nothing happens. Another service is genuinely wedged, and ' +
			'after three straight timeouts the kubelet kills it: ' +
			'<code>kubectl describe pod</code> shows ' +
			'<code>Liveness probe failed</code> ×3, then ' +
			'<code>Killing container ... failed liveness probe</code>. The difference ' +
			'is the machinery you\'ll build here: probes never act on one result — ' +
			'every probe runs through a <strong>consecutive-streak debounce</strong>.</p>' +
			'<p>Two probes, two verdicts: <strong>liveness</strong> failing means ' +
			'<em>restart me</em> (the kubelet kills the container); ' +
			'<strong>readiness</strong> failing means <em>stop sending me traffic</em> ' +
			'(the pod is removed from Service endpoints — the container keeps ' +
			'running). Both use the same counter machine:</p>' +
			'<ul>' +
			'<li>A failed check resets the success streak and increments the failure ' +
			'streak; a successful check does the reverse. <strong>Only consecutive ' +
			'results count</strong> — one good result forgives everything before ' +
			'it.</li>' +
			'<li>When the failure streak reaches <code>failureThreshold</code> ' +
			'<em>and the probe currently considers the target healthy</em>, it flips to ' +
			'unhealthy and reports the transition — once. Failures past the threshold ' +
			'keep the streak growing but never re-fire.</li>' +
			'<li>Symmetrically, <code>successThreshold</code> consecutive successes ' +
			'flip an unhealthy probe back (readiness commonly uses 2–3 here; for ' +
			'liveness the API requires it to be 1).</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Observe(ok bool) string</code> on <code>*Probe</code>: ' +
			'update the streaks, and return <code>"became-unhealthy"</code> or ' +
			'<code>"became-healthy"</code> exactly when a threshold-gated transition ' +
			'happens, <code>""</code> otherwise. The constructor is given; the struct ' +
			'already carries both streaks and the current <code>healthy</code> bit.</p>' +
			'<div class="tip">Reaching a threshold while <em>already</em> on that side ' +
			'must return <code>""</code> — a readiness probe that starts unhealthy ' +
			'(<code>initiallyHealthy=false</code>) and keeps failing never transitions ' +
			'at all.</div>',
		],

		starter: [
			'package main',
			'',
			'// Probe is the kubelet\'s per-probe state: the configured thresholds',
			'// plus the running streaks. healthy is the CURRENT verdict — the',
			'// thing a transition flips. For a liveness probe "unhealthy" means',
			'// the container gets killed; for readiness it means the pod leaves',
			'// its Service\'s endpoints.',
			'type Probe struct {',
			'	FailureThreshold int // consecutive failures to flip healthy -> unhealthy',
			'	SuccessThreshold int // consecutive successes to flip back',
			'	healthy          bool',
			'	failStreak       int',
			'	okStreak         int',
			'}',
			'',
			'// NewProbe mirrors the pod spec fields of the same names. A liveness',
			'// probe starts healthy (containers get the benefit of the doubt);',
			'// a readiness probe starts unhealthy — no traffic until proven ready.',
			'func NewProbe(failureThreshold, successThreshold int, initiallyHealthy bool) *Probe {',
			'	return &Probe{',
			'		FailureThreshold: failureThreshold,',
			'		SuccessThreshold: successThreshold,',
			'		healthy:          initiallyHealthy,',
			'	}',
			'}',
			'',
			'// Observe feeds one probe result into the machine and returns',
			'// "became-unhealthy", "became-healthy", or "" (no transition).',
			'//',
			'// TODO: implement the debounce:',
			'//   - ok: reset failStreak, okStreak++;  failure: the reverse',
			'//   - failStreak reaches FailureThreshold AND healthy',
			'//       -> healthy=false, return "became-unhealthy" (once!)',
			'//   - okStreak reaches SuccessThreshold AND !healthy',
			'//       -> healthy=true, return "became-healthy"',
			'func (p *Probe) Observe(ok bool) string {',
			'	return "" // currently: no result ever changes anything',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name     string',
			'		ft, st   int',
			'		initial  bool',
			'		checks   []bool // probe results, in order',
			'		want     string // "#i transition" entries, comma-joined',
			'	}',
			'	F, O := false, true',
			'	cases := []tc{',
			'		{"debounce: FT=3, fail-fail-ok — a blip never transitions",',
			'			3, 1, true, []bool{F, F, O}, ""},',
			'		{"FT=3: the third consecutive failure fires exactly one became-unhealthy",',
			'			3, 1, true, []bool{F, F, F}, "#3 became-unhealthy"},',
			'		{"recovery: ST=1 flips back on the first success after the outage",',
			'			3, 1, true, []bool{F, F, F, O}, "#3 became-unhealthy, #4 became-healthy"},',
			'		{"readiness-style ST=2: successes must be CONSECUTIVE to flip healthy",',
			'			3, 2, false, []bool{F, O, F, O, O}, "#5 became-healthy"},',
			'		{"alternating results: neither streak ever reaches its threshold",',
			'			2, 2, true, []bool{F, O, F, O, F, O}, ""},',
			'		{"a long fail run transitions once, not on every observation",',
			'			2, 1, true, []bool{F, F, F, F, F}, "#2 became-unhealthy"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			// One fresh probe per case: the machine is stateful and a',
			'			// leftover streak would contaminate the next scenario.',
			'			p := NewProbe(c.ft, c.st, c.initial)',
			'			var events []string',
			'			for i, ok := range c.checks {',
			'				if tr := p.Observe(ok); tr != "" {',
			'					events = append(events, fmt.Sprintf("#%d %s", i+1, tr))',
			'				}',
			'			}',
			'			got := strings.Join(events, ", ")',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
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
			'// Probe is the kubelet\'s per-probe state: the configured thresholds',
			'// plus the running streaks. healthy is the CURRENT verdict — the',
			'// thing a transition flips. For a liveness probe "unhealthy" means',
			'// the container gets killed; for readiness it means the pod leaves',
			'// its Service\'s endpoints.',
			'type Probe struct {',
			'	FailureThreshold int // consecutive failures to flip healthy -> unhealthy',
			'	SuccessThreshold int // consecutive successes to flip back',
			'	healthy          bool',
			'	failStreak       int',
			'	okStreak         int',
			'}',
			'',
			'// NewProbe mirrors the pod spec fields of the same names. A liveness',
			'// probe starts healthy (containers get the benefit of the doubt);',
			'// a readiness probe starts unhealthy — no traffic until proven ready.',
			'func NewProbe(failureThreshold, successThreshold int, initiallyHealthy bool) *Probe {',
			'	return &Probe{',
			'		FailureThreshold: failureThreshold,',
			'		SuccessThreshold: successThreshold,',
			'		healthy:          initiallyHealthy,',
			'	}',
			'}',
			'',
			'// Observe feeds one probe result into the machine and returns the',
			'// transition it caused, if any.',
			'//',
			'// Two design points carry the semantics:',
			'//',
			'//  1. Resetting the OPPOSITE streak on every result is what makes',
			'//     the thresholds mean "consecutive". Without the reset they',
			'//     would count total failures ever, and any service with a 1%',
			'//     error rate would eventually be killed by pure accumulation.',
			'//',
			'//  2. Each transition is gated on the CURRENT verdict (healthy for',
			'//     the downward edge, !healthy for the upward one), so a streak',
			'//     that keeps growing past its threshold fires exactly once —',
			'//     edge-triggered, like the kubelet, which kills a container on',
			'//     the liveness transition rather than once per failed probe.',
			'func (p *Probe) Observe(ok bool) string {',
			'	if ok {',
			'		p.failStreak = 0',
			'		p.okStreak++',
			'		// >= rather than ==: harmless either way given the gate, but',
			'		// robust if a threshold is lowered while a streak is running.',
			'		if p.okStreak >= p.SuccessThreshold && !p.healthy {',
			'			p.healthy = true',
			'			return "became-healthy"',
			'		}',
			'		return ""',
			'	}',
			'	p.okStreak = 0',
			'	p.failStreak++',
			'	if p.failStreak >= p.FailureThreshold && p.healthy {',
			'		p.healthy = false',
			'		return "became-unhealthy"',
			'	}',
			'	return ""',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Three probes, three consequences</h3>' +
			'<p>The counter machine is identical for all probe kinds — what differs is ' +
			'what the transition <em>does</em>:</p>' +
			'<ul>' +
			'<li><strong>liveness</strong> → became-unhealthy: the kubelet kills the ' +
			'container and the restart policy brings it back. For a wedged process ' +
			'(deadlock, stuck event loop) this is the only cure.</li>' +
			'<li><strong>readiness</strong> → became-unhealthy: the pod is removed ' +
			'from Service endpoints; traffic stops, the process lives. ' +
			'became-healthy puts it back. This one is <em>meant</em> to flap with ' +
			'load.</li>' +
			'<li><strong>startup</strong> → gates the other two: until it succeeds ' +
			'once, liveness and readiness are suspended — how a slow-booting JVM ' +
			'survives a liveness probe tuned for steady state.</li>' +
			'</ul>' +
			'<h3>Why the debounce is load-bearing</h3>' +
			'<p>Consider an aggressive liveness probe — <code>timeoutSeconds: 1, ' +
			'failureThreshold: 1</code> — on a service under heavy load. A GC pause or ' +
			'a full accept queue makes one probe time out; the kubelet kills the ' +
			'container; the replacement starts cold (empty caches, JIT warmup, ' +
			'connection pools rebuilding) while the same load now hits fewer ' +
			'replicas... whose probes start timing out too. That feedback loop is the ' +
			'classic <strong>restart storm</strong>, and the consecutive-streak ' +
			'debounce plus a sane threshold is the circuit breaker. The reset is the ' +
			'core of it:</p>',
			{ code: 'if ok {\n\tp.failStreak = 0 // one success forgives everything —\n\tp.okStreak++     // thresholds count CONSECUTIVE results\n}\nif p.failStreak >= p.FailureThreshold && p.healthy { // edge-trigger:\n\tp.healthy = false                                // gate on current\n\treturn "became-unhealthy"                        // verdict = fire once\n}' },
			'<p>The rule of thumb that falls out: <strong>liveness should test "is ' +
			'this process wedged"</strong> (an in-process no-dependency handler), ' +
			'<strong>readiness should test "can I serve right now"</strong> — and a ' +
			'dependency you don\'t own (database, third-party API) must never appear ' +
			'in a liveness check, because restarting <em>your</em> pod cannot fix ' +
			'<em>their</em> outage; it just adds a restart storm on top, while a ' +
			'readiness failure would have correctly parked the pod until the ' +
			'dependency recovered.</p>' +
			'<h3>On the cluster / when debugging</h3>',
			{ code: "kubectl describe pod api-7d4b9   # Events: Liveness probe failed: ... xN over Ym\nkubectl get pod api-7d4b9 -o jsonpath='{.status.containerStatuses[0].restartCount}'\nkubectl get events --field-selector reason=Unhealthy   # probe failures cluster-wide\nkubectl get endpoints api        # readiness in action: not-ready pods vanish here", lang: 'txt' },
			'<p>A climbing <code>restartCount</code> with <code>Unhealthy</code> events ' +
			'right before each restart is the liveness-storm signature; pods ' +
			'<code>Running</code> but missing from the endpoints list is readiness ' +
			'doing its job. The fix is almost never "remove the probe" — it is ' +
			'raising <code>failureThreshold</code>/<code>timeoutSeconds</code>, adding ' +
			'a startup probe, or moving a dependency check from liveness to ' +
			'readiness.</p>',
		],
		complexity: { time: 'O(1) per observation', space: 'O(1) — two counters and a bit' },
	});
})();
