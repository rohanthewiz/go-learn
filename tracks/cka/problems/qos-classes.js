/* QoS Classes — Scheduling (Easy). The kubelet's Guaranteed / Burstable /
 * BestEffort classification, exactly as the docs define it, over post-
 * defaulting container specs. The case table includes the multi-container
 * demotion that separates "read the rule" from "understood the rule".
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	// Node pressure gauge: eviction order under memory pressure.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 180" width="520" height="180" role="img" aria-label="under node pressure the kubelet evicts BestEffort pods first, Guaranteed last">' +
		'<path d="M 30 40 L 460 40" stroke="var(--err-edge)" stroke-width="2" marker-end="url(#dgArrowQOS)"/>' +
		'<text x="30" y="26" class="lbl" style="fill:var(--err-fg)">node memory pressure → kubelet must reclaim</text>' +
		// BestEffort
		'<rect x="40" y="70" width="130" height="66" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="105" y="94" text-anchor="middle">BestEffort</text>' +
		'<text x="105" y="112" text-anchor="middle" class="lbl">no requests, no limits</text>' +
		'<text x="105" y="128" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">evicted first</text>' +
		// Burstable
		'<rect x="195" y="70" width="130" height="66" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="260" y="94" text-anchor="middle">Burstable</text>' +
		'<text x="260" y="112" text-anchor="middle" class="lbl">anything in between</text>' +
		'<text x="260" y="128" text-anchor="middle" class="lbl">evicted next</text>' +
		// Guaranteed
		'<rect x="350" y="70" width="130" height="66" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="415" y="94" text-anchor="middle">Guaranteed</text>' +
		'<text x="415" y="112" text-anchor="middle" class="lbl">requests == limits, all set</text>' +
		'<text x="415" y="128" text-anchor="middle" class="lbl" style="fill:var(--ok)">evicted last</text>' +
		'<text x="40" y="164" class="lbl">the class is computed from the pod spec at admission — not from behavior at runtime</text>' +
		'<defs><marker id="dgArrowQOS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'qos-classes',
		title: 'Pod QoS Classes',
		nav: 'QoS classes',
		difficulty: 'Easy',
		category: 'Scheduling',
		task: 'Implement QoSClass — Guaranteed / Burstable / BestEffort per the documented rules, all 6 tests.',

		prose: [
			'<h2>Pod QoS Classes</h2>' +
			'<p>A node runs out of memory and the kubelet starts killing pods — but not ' +
			'randomly. Your database survived while a batch job died, because every pod ' +
			'is assigned a <strong>Quality of Service class</strong> at admission, ' +
			'computed purely from its containers’ resource requests and limits:</p>' +
			'<ul>' +
			'<li><strong>Guaranteed</strong> — every container has CPU <em>and</em> memory ' +
			'requests and limits all set, with <code>request == limit</code> for both ' +
			'resources.</li>' +
			'<li><strong>BestEffort</strong> — no container sets any request or limit at ' +
			'all.</li>' +
			'<li><strong>Burstable</strong> — everything else (at least one thing set, but ' +
			'short of Guaranteed).</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>QoSClass(containers)</code> returning ' +
			'<code>"Guaranteed"</code>, <code>"Burstable"</code>, or ' +
			'<code>"BestEffort"</code>. A zero field means <em>unset</em>. The inputs are ' +
			'<strong>post-defaulting</strong> values, the same view the kubelet gets: the ' +
			'API server has already copied limits down to unset requests, so a container ' +
			'that wrote only <code>limits</code> in its YAML arrives here with ' +
			'<code>req == lim</code> — which is exactly why limits-only pods come out ' +
			'Guaranteed on a real cluster.</p>' +
			'<p>Watch the multi-container rule: the class belongs to the <em>pod</em>, so ' +
			'one sloppy sidecar demotes everyone.</p>',
			{ code: 'QoSClass([{req 500m/256Mi, lim 500m/256Mi}])            → "Guaranteed"\nQoSClass([{nothing set}])                               → "BestEffort"\nQoSClass([{req 250m/256Mi, lim 500m/512Mi}])            → "Burstable"  (req < lim)\nQoSClass([{guaranteed shape}, {req < lim sidecar}])     → "Burstable"  (pod-level!)', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Container carries one container\'s resource spec AFTER API-server',
			'// defaulting, in millicores and MiB. Zero means unset. Because',
			'// defaulting copies limits down to unset requests, "only limits in',
			'// the YAML" arrives here as req == lim.',
			'type Container struct {',
			'	ReqCPUm  int // CPU request, millicores (0 = unset)',
			'	LimCPUm  int // CPU limit',
			'	ReqMemMi int // memory request, MiB',
			'	LimMemMi int // memory limit',
			'}',
			'',
			'// QoSClass returns the pod\'s QoS class from its containers:',
			'//   "Guaranteed" — every container has all four fields set (non-zero)',
			'//                  with ReqCPUm == LimCPUm and ReqMemMi == LimMemMi.',
			'//   "BestEffort" — every container has all four fields zero.',
			'//   "Burstable"  — anything else.',
			'func QoSClass(containers []Container) string {',
			'	// your code here',
			'	return ""',
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
			'		name       string',
			'		containers []Container',
			'		want       string',
			'	}',
			'	cases := []tc{',
			'		{"textbook Guaranteed: req == lim on both resources",',
			'			[]Container{{ReqCPUm: 500, LimCPUm: 500, ReqMemMi: 256, LimMemMi: 256}},',
			'			"Guaranteed"},',
			'		{"BestEffort: nothing set anywhere",',
			'			[]Container{{}},',
			'			"BestEffort"},',
			'		{"Burstable: requests below limits",',
			'			[]Container{{ReqCPUm: 250, LimCPUm: 500, ReqMemMi: 256, LimMemMi: 512}},',
			'			"Burstable"},',
			'		{"Burstable: CPU pinned but memory entirely unset",',
			'			[]Container{{ReqCPUm: 500, LimCPUm: 500}},',
			'			"Burstable"},',
			'		{"multi-container: one mismatched sidecar demotes the pod",',
			'			[]Container{',
			'				{ReqCPUm: 1000, LimCPUm: 1000, ReqMemMi: 1024, LimMemMi: 1024},',
			'				{ReqCPUm: 100, LimCPUm: 200, ReqMemMi: 64, LimMemMi: 128},',
			'			},',
			'			"Burstable"},',
			'		{"requests only, no limits: Burstable, not Guaranteed",',
			'			[]Container{{ReqCPUm: 250, ReqMemMi: 128}},',
			'			"Burstable"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			got := QoSClass(append([]Container(nil), c.containers...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
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
			'// Container carries one container\'s resource spec AFTER API-server',
			'// defaulting, in millicores and MiB. Zero means unset. Because',
			'// defaulting copies limits down to unset requests, "only limits in',
			'// the YAML" arrives here as req == lim.',
			'type Container struct {',
			'	ReqCPUm  int // CPU request, millicores (0 = unset)',
			'	LimCPUm  int // CPU limit',
			'	ReqMemMi int // memory request, MiB',
			'	LimMemMi int // memory limit',
			'}',
			'',
			'// QoSClass returns the pod\'s QoS class from its containers.',
			'//',
			'// The class is a POD property computed from ALL-quantified container',
			'// predicates, so the loop tracks two flags and demotes them as soon',
			'// as any container breaks either invariant. Starting both at true',
			'// and only ever clearing them is the cleanest encoding of "every',
			'// container must...": one counterexample settles it.',
			'func QoSClass(containers []Container) string {',
			'	allGuaranteed := true // every container fully pinned (req == lim, all set)',
			'	allEmpty := true      // every container entirely unset',
			'',
			'	for _, c := range containers {',
			'		set := c.ReqCPUm != 0 && c.LimCPUm != 0 && c.ReqMemMi != 0 && c.LimMemMi != 0',
			'		if !(set && c.ReqCPUm == c.LimCPUm && c.ReqMemMi == c.LimMemMi) {',
			'			allGuaranteed = false',
			'		}',
			'		if c.ReqCPUm != 0 || c.LimCPUm != 0 || c.ReqMemMi != 0 || c.LimMemMi != 0 {',
			'			allEmpty = false',
			'		}',
			'	}',
			'',
			'	// Order matters only for the degenerate empty pod (both flags',
			'	// still true); real pods have at least one container, and the',
			'	// two flags are mutually exclusive once anything is set.',
			'	if allGuaranteed && !allEmpty {',
			'		return "Guaranteed"',
			'	}',
			'	if allEmpty {',
			'		return "BestEffort"',
			'	}',
			'	return "Burstable" // the catch-all middle tier',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the kubelet cares</h3>' +
			'<p>The key fact in bold: <strong>QoS class = eviction priority under node ' +
			'pressure</strong>. When a node runs low on memory, the kubelet reclaims from ' +
			'BestEffort pods first, then Burstable pods exceeding their requests, and ' +
			'touches Guaranteed pods only as a last resort. The class is not a scheduling ' +
			'input and not a runtime measurement — it is derived once, from the spec, by ' +
			'exactly the rule you implemented. Guaranteed buys more than survival: with ' +
			'the kubelet’s <code>static</code> CPU-manager policy, Guaranteed pods with ' +
			'integer CPU requests get <em>pinned, exclusive cores</em> — the ' +
			'latency-critical workload treatment.</p>' +
			'<h3>Two universally-quantified flags</h3>' +
			'<p>Both named classes are “every container…” statements, so the natural ' +
			'implementation starts two flags at <code>true</code> and lets any container ' +
			'falsify them — one counterexample decides, which is also why one sloppy ' +
			'sidecar demotes a whole pod:</p>',
			{ code: 'set := c.ReqCPUm != 0 && c.LimCPUm != 0 && c.ReqMemMi != 0 && c.LimMemMi != 0\nif !(set && c.ReqCPUm == c.LimCPUm && c.ReqMemMi == c.LimMemMi) {\n\tallGuaranteed = false\n}\nif c.ReqCPUm != 0 || c.LimCPUm != 0 || c.ReqMemMi != 0 || c.LimMemMi != 0 {\n\tallEmpty = false\n}' },
			'<p>Burstable needs no predicate of its own — it is the complement, the ' +
			'catch-all between the two named extremes. Defining the middle tier as ' +
			'“neither extreme” is a pattern worth stealing: it cannot drift out of sync ' +
			'with the other definitions because it has no definition to drift.</p>' +
			'<h3>On the exam</h3>' +
			'<p>Check a pod’s class with <code>kubectl describe pod &lt;name&gt; | grep -i ' +
			'qos</code> (or <code>kubectl get pod &lt;name&gt; -o ' +
			'jsonpath=\'{.status.qosClass}\'</code>) — it appears in status, computed for ' +
			'you. When a question asks how to keep a critical pod from being evicted ' +
			'under node pressure, the stability answer is “set ' +
			'<code>requests == limits</code> for CPU and memory in every container”: ' +
			'that makes the pod Guaranteed, last in the eviction order, and never a ' +
			'candidate for exceeding its own requests. And if a pod is repeatedly ' +
			'OOM-killed while the node looks fine, look at its class — BestEffort pods ' +
			'are the first casualties of someone else’s memory leak.</p>',
		],
		complexity: { time: 'O(n) — one pass over the containers', space: 'O(1)' },
	});
})();
