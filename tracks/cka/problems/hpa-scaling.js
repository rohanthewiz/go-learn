/* HPA Scaling Decision — Workloads (Easy). The one-line formula the
 * HorizontalPodAutoscaler evaluates every sync period, plus the 10%
 * tolerance deadband that keeps it from oscillating. Test metrics are
 * chosen so every ratio and product is exact under float64 — no case
 * sits on the tolerance boundary.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 168" width="520" height="168" role="img" aria-label="HPA: proportional response with a 10% deadband around the target ratio">' +
		// ratio axis
		'<path d="M 30 64 L 486 64" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowHPA)" fill="none"/>' +
		'<text x="492" y="55" class="lbl">ratio</text>' +
		// deadband
		'<rect x="204" y="40" width="88" height="48" rx="4" fill="none" stroke="var(--dim)" stroke-dasharray="5 4"/>' +
		'<text x="248" y="30" text-anchor="middle" class="lbl">deadband: keep current</text>' +
		// ticks
		'<line x1="204" y1="58" x2="204" y2="70" stroke="var(--edge)"/>' +
		'<line x1="248" y1="58" x2="248" y2="70" stroke="var(--edge)"/>' +
		'<line x1="292" y1="58" x2="292" y2="70" stroke="var(--edge)"/>' +
		'<text x="204" y="104" text-anchor="middle" class="lbl">0.9</text>' +
		'<text x="248" y="104" text-anchor="middle" class="lbl">1.0 = at target</text>' +
		'<text x="292" y="120" text-anchor="middle" class="lbl">1.1</text>' +
		// zones
		'<text x="90" y="50" text-anchor="middle" style="fill:var(--accent)">scale down</text>' +
		'<text x="90" y="104" text-anchor="middle" class="lbl">ceil(current × ratio)</text>' +
		'<text x="400" y="50" text-anchor="middle" style="fill:var(--accent)">scale up</text>' +
		'<text x="400" y="104" text-anchor="middle" class="lbl">ceil(current × ratio)</text>' +
		// worked example
		'<text x="30" y="148" class="lbl">example: metric 200m vs target 100m → ratio 2.0 → desired = ceil(3 × 2.0) = 6 replicas</text>' +
		'<defs><marker id="dgArrowHPA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'hpa-scaling',
		title: 'HPA Scaling Decision',
		nav: 'HPA Formula',
		difficulty: 'Easy',
		category: 'Workloads',
		task: 'Implement DesiredReplicas — ratio, tolerance band, ceil, clamp. Make all 6 tests pass.',

		prose: [
			'<h2>HPA Scaling Decision</h2>' +
			'<p>You ran <code>kubectl autoscale deployment web --cpu-percent=60 --min=2 --max=10</code>. ' +
			'From then on, every sync period (15s by default) the HorizontalPodAutoscaler ' +
			'compares the observed metric against the target and resizes the Deployment. ' +
			'The entire decision is one documented formula:</p>',
			{ code: 'ratio   = currentMetric / targetMetric\ndesired = ceil(currentReplicas × ratio)     // then clamp into [min, max]', lang: 'txt' },
			'<p>…with one crucial guard: if the ratio is <em>close enough</em> to 1.0 — within the ' +
			'documented 10% tolerance, i.e. <code>0.9 ≤ ratio ≤ 1.1</code> — the HPA does ' +
			'<strong>nothing</strong> and keeps the current replica count. Without that deadband a ' +
			'workload hovering near its target would resize every 15 seconds.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>DesiredReplicas(current, currentMetric, targetMetric, minReplicas, maxReplicas)</code>:</p>' +
			'<ul>' +
			'<li>Ratio inside the tolerance band (boundary values 0.9 and 1.1 count as <em>inside</em> — ' +
			'stated for completeness; the tests deliberately never probe the exact edge, because ' +
			'exact float boundaries are where real controllers and real tests both get burned): ' +
			'return <code>current</code> unchanged, ignoring min/max.</li>' +
			'<li>Otherwise: <code>ceil(current × ratio)</code>, clamped into <code>[minReplicas, maxReplicas]</code>.</li>' +
			'</ul>' +
			'<p><strong>Simplification:</strong> the real HPA averages the metric across pods, ignores ' +
			'unready pods, and applies a scale-down stabilization window (it takes the highest ' +
			'recommendation from the last 5 minutes to avoid flapping). The formula above is the ' +
			'core computation all of that feeds into.</p>',
		],

		starter: [
			'package main',
			'',
			'// DesiredReplicas computes the HPA\'s target replica count.',
			'//',
			'// ratio = currentMetric / targetMetric. Within the 10% tolerance',
			'// band (0.9 <= ratio <= 1.1) the current count is kept unchanged;',
			'// otherwise the result is ceil(current * ratio) clamped into',
			'// [minReplicas, maxReplicas].',
			'func DesiredReplicas(current int, currentMetric, targetMetric float64, minReplicas, maxReplicas int) int {',
			'	// your code here',
			'	return -1',
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
			'		name               string',
			'		current            int',
			'		metric, target     float64',
			'		min, max           int',
			'		want               int',
			'	}',
			'	// Metric/target pairs are chosen so ratio and current*ratio are',
			'	// exact in float64 (200/100, 45/60, 105/100, ...) and no case sits',
			'	// on the 0.9/1.1 tolerance edge — boundary behavior is stated in',
			'	// prose, not tested.',
			'	cases := []tc{',
			'		{"scale up 2x: 3 pods at 200m vs 100m target", 3, 200, 100, 1, 10, 6},',
			'		{"ceil on fractional product: 5 pods at 45 vs 60 (5*0.75=3.75)", 5, 45, 60, 1, 10, 4},',
			'		{"within tolerance: 4 pods at 105m vs 100m (ratio 1.05)", 4, 105, 100, 1, 10, 4},',
			'		{"clamp to max: 4 pods at 400m vs 100m wants 16, max 10", 4, 400, 100, 1, 10, 10},',
			'		{"clamp to min: 4 pods at 10m vs 100m wants 1, min 2", 4, 10, 100, 2, 10, 2},',
			'		{"scale down: 8 pods at 50m vs 100m target", 8, 50, 100, 1, 10, 4},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("current=%d metric=%v target=%v min=%d max=%d", c.current, c.metric, c.target, c.min, c.max),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := DesiredReplicas(c.current, c.metric, c.target, c.min, c.max)',
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
			'// DesiredReplicas computes the HPA\'s target replica count.',
			'//',
			'// The order of operations mirrors the controller: tolerance check',
			'// first (a workload near target must not resize at all — not even be',
			'// nudged by the clamp), then the proportional resize, then the',
			'// min/max clamp as the final word.',
			'func DesiredReplicas(current int, currentMetric, targetMetric float64, minReplicas, maxReplicas int) int {',
			'	ratio := currentMetric / targetMetric',
			'',
			'	// Deadband: within 10% of target, do nothing. This is what keeps',
			'	// the control loop from oscillating when the metric hovers around',
			'	// the target — a resize would shift per-pod load, move the metric,',
			'	// and trigger the opposite resize next period.',
			'	if ratio >= 0.9 && ratio <= 1.1 {',
			'		return current',
			'	}',
			'',
			'	// Ceil, not round: the HPA always errs toward MORE capacity.',
			'	// Under-provisioning burns users; over-provisioning burns a little',
			'	// money until the next sync period corrects it.',
			'	desired := int(math.Ceil(float64(current) * ratio))',
			'',
			'	// Clamp last, so min/max bound whatever the formula asked for.',
			'	if desired < minReplicas {',
			'		desired = minReplicas',
			'	}',
			'	if desired > maxReplicas {',
			'		desired = maxReplicas',
			'	}',
			'	return desired',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>A control loop, not a schedule</h3>' +
			'<p>The HPA is <strong>proportional control with a deadband</strong> — the same ' +
			'closed-loop shape as AWS target-tracking autoscaling, a thermostat, or cruise ' +
			'control. The proportional part sizes the correction to the error (2× over target ' +
			'→ 2× the pods, not "+1 and check again"), so big spikes converge in one or two ' +
			'sync periods instead of creeping. The deadband is what makes it stable: without ' +
			'it, any metric hovering near the target flips the fleet size every 15 seconds, ' +
			'and each resize itself moves the per-pod metric, feeding the oscillation.</p>',
			{ code: 'ratio := currentMetric / targetMetric\nif ratio >= 0.9 && ratio <= 1.1 {\n\treturn current // deadband: near target, touch nothing\n}\ndesired := int(math.Ceil(float64(current) * ratio)) // then clamp' },
			'<p>Two asymmetries are deliberate. <code>Ceil</code> biases toward capacity — when the ' +
			'math says 3.75 pods, running 4 costs pennies while running 3 costs latency. And ' +
			'the real controller adds a scale-<em>down</em> stabilization window (scale up fast, ' +
			'scale down slowly) for the same reason: the cost of the two mistakes is not ' +
			'symmetric. That principle — respond to shortage immediately, to surplus ' +
			'cautiously — shows up in every autoscaler you will ever configure.</p>' +
			'<h3>On the exam</h3>' +
			'<p><code>kubectl autoscale deployment web --cpu-percent=60 --min=2 --max=10</code> creates ' +
			'the HPA object; <code>kubectl get hpa</code> shows TARGETS as ' +
			'<code>current%/target%</code>. Two prerequisites trip candidates: the HPA reads pod ' +
			'metrics from <strong>metrics-server</strong> (no metrics-server → TARGETS shows ' +
			'<code>&lt;unknown&gt;</code>, and <code>kubectl top pods</code> fails too — that is your ' +
			'diagnostic), and percentage targets are percentages <em>of the container\'s resource ' +
			'requests</em> — a pod with no CPU request gives the HPA nothing to divide by, and ' +
			'the autoscaler reports it cannot compute the metric. Requests are not optional ' +
			'bookkeeping; they are the denominator.</p>',
		],
		complexity: { time: 'O(1)', space: 'O(1)' },
	});
})();
