/* Auto Scaling Target Tracking — Compute & Scaling (Medium). The documented
 * target-tracking algorithm (ceil the proportional resize, clamp to bounds)
 * plus the asymmetric cooldown rule (scale out now, scale in cautiously).
 * Float inputs are chosen exact-in-binary so ceil never wobbles.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="target tracking: metric over target drives desired capacity">' +
		// metric dial
		'<circle cx="80" cy="80" r="44" fill="none" stroke="var(--edge)" stroke-width="1.8"/>' +
		'<path d="M 80 80 L 108 46" stroke="var(--err-edge)" stroke-width="2" fill="none"/>' +
		'<path d="M 80 80 L 80 36" stroke="var(--ok)" stroke-width="1.6" stroke-dasharray="4 3" fill="none"/>' +
		'<text x="80" y="148" text-anchor="middle" class="lbl">CPU metric = 65%</text>' +
		'<text x="80" y="163" text-anchor="middle" class="lbl">target = 50% (dashed)</text>' +
		// arrow to formula
		'<path d="M 136 80 L 176 80" fill="none" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowASG)"/>' +
		// formula box
		'<rect x="182" y="52" width="180" height="56" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="272" y="76" text-anchor="middle">ceil(4 × 65 ÷ 50)</text>' +
		'<text x="272" y="96" text-anchor="middle" class="lbl">= ceil(5.2) = 6</text>' +
		'<text x="272" y="126" text-anchor="middle" class="lbl">then clamp into [min, max]</text>' +
		// arrow to instances
		'<path d="M 368 80 L 402 80" fill="none" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowASG)"/>' +
		// instance squares: 4 existing + 2 new
		'<g>' +
		'<rect x="410" y="44" width="18" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="434" y="44" width="18" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="458" y="44" width="18" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="410" y="68" width="18" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="434" y="68" width="18" height="18" rx="3" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="458" y="68" width="18" height="18" rx="3" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="443" y="112" text-anchor="middle" class="lbl">4 → 6 instances</text>' +
		'</g>' +
		'<defs><marker id="dgArrowASG" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'autoscaling-target-tracking',
		title: 'Auto Scaling: Target Tracking',
		nav: 'ASG Target Tracking',
		difficulty: 'Medium',
		category: 'Compute & Scaling',
		task: 'Implement DesiredCapacity (ceil-then-clamp) and ApplyCooldown (asymmetric). Make all 6 tests pass.',

		prose: [
			'<h2>Auto Scaling: Target Tracking</h2>' +
			'<p>You are designing the compute tier for a bursty web application. The ' +
			'requirement: keep average CPU near 50% without anyone touching a console. ' +
			'That is a <em>target tracking scaling policy</em> — you name a target value ' +
			'for a metric, and the Auto Scaling group continuously resizes itself to hold ' +
			'the metric there. Under the hood the resize step is one documented formula:</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the two halves of the control loop:</p>' +
			'<ul>' +
			'<li><code>DesiredCapacity(current int, metric, target float64, minCap, maxCap int) int</code> — ' +
			'the proportional resize: <code>ceil(current × metric ÷ target)</code>, then ' +
			'clamp into <code>[minCap, maxCap]</code>. That ceil-then-clamp <em>is</em> the ' +
			'documented target-tracking algorithm: if 4 instances run at 65% against a 50% ' +
			'target, the load “wants” 5.2 instances, and AWS rounds <em>up</em> to 6 — ' +
			'always toward over-provisioning, never under.</li>' +
			'<li><code>ApplyCooldown(proposed, current int, lastScaleMs, nowMs, cooldownMs int64) int</code> — ' +
			'the flap guard, and it is deliberately asymmetric. <em>Scale-out</em> ' +
			'(<code>proposed &gt; current</code>) applies immediately — return ' +
			'<code>proposed</code>; users are waiting. <em>Scale-in</em> applies only when ' +
			'<code>nowMs − lastScaleMs &gt;= cooldownMs</code>; otherwise return ' +
			'<code>current</code> and keep the fleet — removing instances on a momentary ' +
			'dip causes flapping (remove → overload → add → dip → remove …).</li>' +
			'</ul>' +
			'<h3>Examples</h3>',
			{ code: 'DesiredCapacity(4, 65, 50, 1, 10)   →  6    // ceil(5.2), scale out\nDesiredCapacity(6, 50, 50, 1, 10)   →  6    // on target: no change\nDesiredCapacity(8, 100, 25, 2, 12)  →  12   // wants 32, clamped to max\n\nApplyCooldown(9, 6, 0, 1000, 300000)       →  9   // scale-out: immediate\nApplyCooldown(3, 6, 0, 100000, 300000)     →  6   // scale-in blocked: 100s < 300s\nApplyCooldown(3, 6, 0, 300000, 300000)     →  3   // cooldown elapsed (>=)', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// DesiredCapacity implements the target-tracking resize step:',
			'// ceil(current × metric ÷ target), clamped into [minCap, maxCap].',
			'// metric and target are in the same unit (e.g. percent CPU).',
			'func DesiredCapacity(current int, metric, target float64, minCap, maxCap int) int {',
			'	return -1 // your code here',
			'}',
			'',
			'// ApplyCooldown gates a proposed capacity change:',
			'//   - scale-OUT (proposed > current) applies immediately;',
			'//   - scale-IN applies only when nowMs-lastScaleMs >= cooldownMs,',
			'//     otherwise the current capacity is kept.',
			'func ApplyCooldown(proposed, current int, lastScaleMs, nowMs, cooldownMs int64) int {',
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
			'	// Metric/target pairs are exact in binary (65/50, 50/50, 100/25,',
			'	// 5/50 on integer-valued operands), so ceil never sits on a',
			'	// float-rounding knife edge.',
			'	cases := []tc{',
			'		{"scale out with round-up: 4 inst @65% vs target 50 → ceil(5.2)",',
			'			func() int { return DesiredCapacity(4, 65, 50, 1, 10) }, 6},',
			'		// Catches the classic bug: int(...) truncation instead of ceil',
			'		// gives 5 here. Also below: ratio exactly 1 must NOT change size',
			'		// (a careless ceil(x)+1 or floor+1 breaks this one).',
			'		{"on target: 6 inst @50% vs target 50 → no change",',
			'			func() int { return DesiredCapacity(6, 50, 50, 1, 10) }, 6},',
			'		{"clamp to max: 8 inst @100% vs target 25 wants 32, max 12",',
			'			func() int { return DesiredCapacity(8, 100, 25, 2, 12) }, 12},',
			'		{"clamp to min: 10 inst @5% vs target 50 wants 1, min 3",',
			'			func() int { return DesiredCapacity(10, 5, 50, 3, 20) }, 3},',
			'		{"cooldown suppresses scale-in: 6→3 proposed 100s after last scale (cooldown 300s)",',
			'			func() int { return ApplyCooldown(3, 6, 0, 100000, 300000) }, 6},',
			'		{"scale-out ignores cooldown: 6→9 proposed 1s after last scale",',
			'			func() int { return ApplyCooldown(9, 6, 0, 1000, 300000) }, 9},',
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
			'import "math"',
			'',
			'// DesiredCapacity implements the target-tracking resize step:',
			'// ceil(current × metric ÷ target), clamped into [minCap, maxCap].',
			'//',
			'// Why this formula works: if each of current instances carries',
			'// metric worth of load, total load is current×metric. Dividing by',
			'// target asks "how many instances would spread that same load at',
			'// exactly the target level?" — proportional control in one line.',
			'//',
			'// Why ceil and not round or floor: capacity is discrete, and the',
			'// two rounding directions are not symmetric in cost. Rounding down',
			'// leaves the fleet ABOVE target (overloaded, latency risk); rounding',
			'// up leaves it slightly below (a little idle capacity). AWS always',
			'// errs toward over-provisioning.',
			'func DesiredCapacity(current int, metric, target float64, minCap, maxCap int) int {',
			'	desired := int(math.Ceil(float64(current) * metric / target))',
			'',
			'	// Clamp AFTER the ceil: the bounds are hard operator limits',
			'	// (budget on top, quorum/baseline on the bottom) and always win',
			'	// over what the math "wants".',
			'	if desired < minCap {',
			'		desired = minCap',
			'	}',
			'	if desired > maxCap {',
			'		desired = maxCap',
			'	}',
			'	return desired',
			'}',
			'',
			'// ApplyCooldown gates a proposed capacity change with the',
			'// deliberately asymmetric rule target tracking uses:',
			'//',
			'//   scale-out: apply NOW — under-capacity is user-visible pain,',
			'//              and adding instances is safe (worst case: idle).',
			'//   scale-in:  only after cooldownMs of quiet — removing capacity',
			'//              on a momentary dip causes flapping (remove →',
			'//              overload → re-add → dip → remove …), and each flap',
			'//              churns connections on the killed instances.',
			'//',
			'// Time is injected (lastScaleMs/nowMs) rather than read from a',
			'// clock, so the decision is a pure function the harness can test',
			'// with exact timelines.',
			'func ApplyCooldown(proposed, current int, lastScaleMs, nowMs, cooldownMs int64) int {',
			'	if proposed > current {',
			'		return proposed // scale-out is never delayed',
			'	}',
			'	// Scale-in (or no-op): honor the cooldown window. >= so a check',
			'	// landing exactly at the boundary proceeds — the window is',
			'	// "wait cooldownMs", not "wait longer than cooldownMs".',
			'	if nowMs-lastScaleMs >= cooldownMs {',
			'		return proposed',
			'	}',
			'	return current // still cooling down: hold the fleet steady',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: threshold alarms</h3>' +
			'<p>The pre-target-tracking way is a pair of CloudWatch alarms: “CPU &gt; 70% ' +
			'for 5 min → add 2”, “CPU &lt; 30% → remove 1” (simple/step scaling). It works, ' +
			'but the operator is hand-tuning a controller: pick thresholds too close and it ' +
			'oscillates; too far apart and it reacts late. Target tracking replaces all of ' +
			'that with one number and one formula.</p>' +
			'<h3>The insight: proportional control</h3>' +
			'<p>The general principle is <strong>closed-loop control</strong>: measure the ' +
			'output (metric), compare to the setpoint (target), and feed the error back into ' +
			'the input (capacity). Because load spreads roughly evenly across instances, ' +
			'total load ≈ current × metric, so the capacity that would sit exactly at target ' +
			'is:</p>',
			{ code: 'desired := int(math.Ceil(float64(current) * metric / target))\n// then clamp into [minCap, maxCap] — operator limits always win' },
			'<p>Two asymmetries are the exam-worthy details:</p>' +
			'<ul>' +
			'<li><strong>ceil, not round.</strong> The two rounding errors have different ' +
			'prices: floor leaves you overloaded (users feel it), ceil leaves you slightly ' +
			'over-provisioned (the bill feels it, barely). AWS documents rounding up.</li>' +
			'<li><strong>Cooldown only brakes scale-in.</strong> Adding capacity late loses ' +
			'requests; removing capacity early causes flapping. So scale-out is immediate ' +
			'and scale-in waits out the cooldown — an asymmetric damper on the control ' +
			'loop. The same shape appears in Kubernetes’ HPA ' +
			'(<code>stabilizationWindowSeconds</code> defaults to 0 for scale-up, 300 for ' +
			'scale-down).</li>' +
			'</ul>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Match the scaling policy to the scenario: <strong>target tracking</strong> — ' +
			'“keep metric X at value Y” with no operator tuning (the default choice); ' +
			'<strong>step scaling</strong> — different-sized responses at different alarm ' +
			'breach sizes (finer manual control); <strong>simple scaling</strong> — one alarm, ' +
			'one action, waits out its cooldown before anything else (legacy); ' +
			'<strong>scheduled scaling</strong> — the load is predictable by clock or calendar ' +
			'(“every weekday at 9am”). “Maintain 50% CPU automatically” → target tracking; ' +
			'“traffic doubles every Black Friday” → scheduled, possibly alongside it.</p>',
		],
		complexity: { time: 'O(1) per evaluation', space: 'O(1)' },
	});
})();
