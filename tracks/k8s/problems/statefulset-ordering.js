/* StatefulSet Ordering — Stateful & Batch (Medium). The OrderedReady state
 * machine as one function: given the desired replica count and the pods that
 * exist, pick the ONE action the controller takes this pass — create the
 * lowest missing ordinal (gated on everything below it being Ready), delete
 * the highest excess ordinal, wait, or declare convergence. The harness
 * includes the on-call classic: one unready pod freezing the whole rollout.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// The ladder: web-0 Ready, web-1 running but unready, web-2 not created.
	// The gate arrow is the whole feature. Marker ids namespaced dgArrowKSO
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 148" width="520" height="148" role="img" aria-label="OrderedReady: web-2 is not created until web-1 is Ready">' +
		'<text x="20" y="20" class="lbl">OrderedReady creation: one rung at a time, gated on readiness</text>' +
		'<rect x="30" y="42" width="130" height="52" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="95" y="64" text-anchor="middle">web-0</text>' +
		'<text x="95" y="84" text-anchor="middle" class="lbl" style="fill:var(--ok)">Ready ✓</text>' +
		'<rect x="195" y="42" width="130" height="52" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="260" y="64" text-anchor="middle">web-1</text>' +
		'<text x="260" y="84" text-anchor="middle" class="lbl" style="fill:var(--warn)">Running, not Ready</text>' +
		'<rect x="360" y="42" width="130" height="52" rx="6" fill="none" stroke="var(--edge)" stroke-dasharray="5 4"/>' +
		'<text x="425" y="64" text-anchor="middle">web-2</text>' +
		'<text x="425" y="84" text-anchor="middle" class="lbl">does not exist yet</text>' +
		'<path d="M 160 68 L 191 68" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKSO)"/>' +
		'<text x="176" y="36" text-anchor="middle" class="lbl" style="fill:var(--ok)">0 Ready → 1</text>' +
		'<path d="M 325 68 L 356 68" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKSOerr)"/>' +
		'<text x="341" y="36" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">gate: blocked</text>' +
		'<text x="20" y="136" class="lbl">one wedged pod halts the whole rollout — by design</text>' +
		'<defs>' +
		'<marker id="dgArrowKSO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowKSOerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'statefulset-ordering',
		title: 'StatefulSet: Ordered by Design',
		nav: 'StatefulSet ordering',
		difficulty: 'Medium',
		category: 'Stateful & Batch',
		task: 'Implement NextAction — OrderedReady single-stepping: gated creates, reverse-order deletes; all 7 tests.',

		prose: [
			'<h2>StatefulSet: Ordered by Design</h2>' +
			'<p>Watch a database come up with <code>kubectl get pods -w</code>: ' +
			'<code>web-0</code> appears, runs, turns Ready — and only <em>then</em> does ' +
			'<code>web-1</code> exist at all. Scale down from 3 to 1 and the pods leave ' +
			'in reverse: <code>web-2</code> first, then <code>web-1</code>. A Deployment ' +
			'would have blasted out three pods with random-hash names all at once. The ' +
			'StatefulSet controller is doing something different on purpose: each pod ' +
			'has a stable <strong>ordinal</strong> baked into its name, and under the ' +
			'default <code>podManagementPolicy: OrderedReady</code> the controller ' +
			'<em>single-steps</em> — one action per reconcile pass:</p>' +
			'<ul>' +
			'<li><strong>Create upward, gated.</strong> The lowest missing ordinal in ' +
			'<code>[0, desired)</code> is created next — but only after every existing ' +
			'pod below it is Ready. If a lower pod is unready, the controller waits for ' +
			'it. Full stop.</li>' +
			'<li><strong>Delete downward.</strong> Any pod with an ordinal at or above ' +
			'<code>desired</code> is excess; the highest goes first, one at a time.</li>' +
			'<li><strong>Otherwise:</strong> all ordinals present — wait for the lowest ' +
			'unready pod, or declare convergence.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>NextAction(name, desired, pods)</code>: return the one ' +
			'action for this pass as a string — ' +
			'<code>"create &lt;name&gt;-&lt;ordinal&gt;"</code>, ' +
			'<code>"delete &lt;name&gt;-&lt;ordinal&gt;"</code>, ' +
			'<code>"wait for &lt;name&gt;-&lt;ordinal&gt; ready"</code>, or ' +
			'<code>"converged"</code>, applying the rules in the priority order above. ' +
			'The pod slice arrives in no particular order — index by ordinal, not by ' +
			'position.</p>',
			{ code: 'desired 3, pods {}                    → "create web-0"\ndesired 3, pods {0:Ready}             → "create web-1"\ndesired 3, pods {0:NOT ready}         → "wait for web-0 ready"\ndesired 1, pods {0,1,2 Ready}         → "delete web-2"', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Pod is the controller\'s view of one StatefulSet pod. Ordinal is the',
			'// number baked into the name (web-0, web-1, ...); Ready is the readiness',
			'// probe verdict — the gate the whole ordering hangs on.',
			'type Pod struct {',
			'	Ordinal int',
			'	Ready   bool',
			'}',
			'',
			'// NextAction returns the ONE action an OrderedReady StatefulSet',
			'// controller takes this reconcile pass (it single-steps: never two',
			'// creates at once). Rules, in priority order:',
			'//',
			'//  1. An ordinal in [0, desired) is missing: create the LOWEST missing',
			'//     one — but only after every existing lower ordinal is Ready.',
			'//     Lower pod unready → "wait for <name>-<ordinal> ready" (lowest',
			'//     unready); otherwise → "create <name>-<ordinal>".',
			'//  2. Scale down: any pod with Ordinal >= desired → delete the HIGHEST:',
			'//     "delete <name>-<ordinal>" (one at a time, readiness irrelevant).',
			'//  3. All ordinals present: some pod unready →',
			'//     "wait for <name>-<ordinal> ready" (lowest unready);',
			'//     else → "converged".',
			'//',
			'// pods arrives in arbitrary order — index by Ordinal, not position.',
			'func NextAction(name string, desired int, pods []Pod) string {',
			'	// TODO: implement the OrderedReady state machine',
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
			'		name    string',
			'		desired int',
			'		pods    []Pod',
			'		want    string',
			'	}',
			'	cases := []tc{',
			'		{"cold start: nothing exists yet — the ladder begins at 0",',
			'			3, []Pod{}, "create web-0"},',
			'		{"web-0 is Ready: climb to the next rung",',
			'			3, []Pod{{Ordinal: 0, Ready: true}}, "create web-1"},',
			'		{"the gate: web-0 unready blocks ALL further creation",',
			'			3, []Pod{{Ordinal: 0, Ready: false}}, "wait for web-0 ready"},',
			'		{"scale down 3 -> 1: highest ordinal leaves first (pods listed shuffled)",',
			'			1, []Pod{{Ordinal: 2, Ready: true}, {Ordinal: 0, Ready: true}, {Ordinal: 1, Ready: true}},',
			'			"delete web-2"},',
			'		{"hole in the middle: web-1 died — recreate it; web-2 above does not gate",',
			'			3, []Pod{{Ordinal: 0, Ready: true}, {Ordinal: 2, Ready: false}},',
			'			"create web-1"},',
			'		{"all present, web-1 unready: nothing to do but wait",',
			'			3, []Pod{{Ordinal: 0, Ready: true}, {Ordinal: 1, Ready: false}, {Ordinal: 2, Ready: true}},',
			'			"wait for web-1 ready"},',
			'		{"converged: every ordinal present and Ready",',
			'			3, []Pod{{Ordinal: 0, Ready: true}, {Ordinal: 1, Ready: true}, {Ordinal: 2, Ready: true}},',
			'			"converged"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		want := c.want',
			'		desired, pods := c.desired, c.pods',
			'		runCase(r, func() {',
			'			// Copy the pod slice: user code must not be able to',
			'			// reorder or edit the fixture for later comparisons.',
			'			got := NextAction("web", desired, append([]Pod(nil), pods...))',
			'			r["pass"] = got == want',
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
			'import "fmt"',
			'',
			'// Pod is the controller\'s view of one StatefulSet pod. Ordinal is the',
			'// number baked into the name (web-0, web-1, ...); Ready is the readiness',
			'// probe verdict — the gate the whole ordering hangs on.',
			'type Pod struct {',
			'	Ordinal int',
			'	Ready   bool',
			'}',
			'',
			'// NextAction returns the ONE action an OrderedReady StatefulSet',
			'// controller takes this reconcile pass. Single-stepping is the design:',
			'// each pass makes at most one change, then the next pass re-observes.',
			'// The ordering guarantee costs nothing extra — it falls out of always',
			'// re-deriving "the next rung" from scratch instead of remembering a plan.',
			'func NextAction(name string, desired int, pods []Pod) string {',
			'	// Index by ordinal: the controller thinks in ordinals, never in',
			'	// list positions — the pod list comes from a cache in arbitrary order.',
			'	byOrd := map[int]Pod{}',
			'	for _, p := range pods {',
			'		byOrd[p.Ordinal] = p',
			'	}',
			'',
			'	// Rule 1: fill the lowest hole, gated on everything BELOW it.',
			'	for ord := 0; ord < desired; ord++ {',
			'		if _, ok := byOrd[ord]; ok {',
			'			continue',
			'		}',
			'		// The gate is the whole point of OrderedReady: pod N is not',
			'		// created until 0..N-1 all pass readiness. A replica must not',
			'		// join before the members it will bootstrap from are serving —',
			'		// so one wedged pod freezes the rollout, deliberately. Note',
			'		// the gate only looks BELOW the hole: a surviving higher pod',
			'		// (we are re-filling a death, not scaling up) never blocks it.',
			'		for lower := 0; lower < ord; lower++ {',
			'			if p, ok := byOrd[lower]; ok && !p.Ready {',
			'				return fmt.Sprintf("wait for %s-%d ready", name, lower)',
			'			}',
			'		}',
			'		return fmt.Sprintf("create %s-%d", name, ord)',
			'	}',
			'',
			'	// Rule 2: scale down from the top, one ordinal at a time. Highest-',
			'	// first keeps the survivors a contiguous prefix [0, n) at every',
			'	// instant — the invariant that makes "web-0 is the primary" a safe',
			'	// convention for the application to rely on.',
			'	highest := -1',
			'	for _, p := range pods {',
			'		if p.Ordinal >= desired && p.Ordinal > highest {',
			'			highest = p.Ordinal',
			'		}',
			'	}',
			'	if highest >= 0 {',
			'		return fmt.Sprintf("delete %s-%d", name, highest)',
			'	}',
			'',
			'	// Rule 3: the right pods exist; readiness is all that remains.',
			'	for ord := 0; ord < desired; ord++ {',
			'		if !byOrd[ord].Ready {',
			'			return fmt.Sprintf("wait for %s-%d ready", name, ord)',
			'		}',
			'	}',
			'	return "converged"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Identity is the feature; ordering is its bodyguard</h3>' +
			'<p>What a StatefulSet actually sells is <strong>stable identity</strong>: ' +
			'<code>web-1</code> is always named <code>web-1</code>, resolves at ' +
			'<code>web-1.web.default.svc</code>, and mounts the PVC ' +
			'<code>data-web-1</code>. When web-1 dies, its replacement is web-1 ' +
			'<em>again</em> — same name, same DNS, same disk. The volume outlives the ' +
			'pod; that is the entire trick that lets a database run on an orchestrator ' +
			'that treats pods as disposable. Deployments give you cattle; StatefulSets ' +
			'give you named pets, each with its own luggage.</p>' +
			'<p>Ordering exists to protect that identity during bootstrap: web-0 ' +
			'initializes the database, web-1 clones from web-0, web-2 from either. If ' +
			'they started in parallel, every replica would race to find a primary that ' +
			'does not exist yet. Hence the gate in rule 1 — and why it only checks ' +
			'ordinals <em>below</em> the hole:</p>',
			{ code: 'for lower := 0; lower < ord; lower++ { // only BELOW the hole\n\tif p, ok := byOrd[lower]; ok && !p.Ready {\n\t\treturn fmt.Sprintf("wait for %s-%d ready", name, lower)\n\t}\n}' },
			'<p>Scale-down runs highest-first so the survivors are always the prefix ' +
			'<code>[0, n)</code> — the application can safely hardcode "ordinal 0 is ' +
			'the primary" because no scaling event ever removes a low ordinal while a ' +
			'higher one lives.</p>' +
			'<div class="tip"><code>podManagementPolicy: Parallel</code> opts out of ' +
			'the ordering (all pods launch and terminate at once) while keeping the ' +
			'identity — names, DNS, and per-ordinal PVCs are untouched. Use it for ' +
			'stores like Cassandra that handle their own membership and just want the ' +
			'stable disks.</div>' +
			'<h3>On the cluster / when debugging</h3>' +
			'<p>The on-call classic: a StatefulSet stuck at <code>0/3</code> for an ' +
			'hour. <code>kubectl get pods -l app=web</code> shows <code>web-0</code> ' +
			'Pending — and <em>nothing else exists</em>, because the gate will not ' +
			'create web-1 until web-0 is Ready. ' +
			'<code>kubectl describe pod web-0</code> usually ends the mystery: a ' +
			'<code>volume node affinity conflict</code> — web-0\'s PVC is bound to a ' +
			'zone with no schedulable capacity, and since the PVC is web-0\'s identity, ' +
			'the pod cannot simply land elsewhere. Check ' +
			'<code>kubectl get pvc -l app=web</code> and the PV\'s zone label, then ' +
			'free capacity in that zone. Meanwhile ' +
			'<code>kubectl rollout status statefulset/web</code> reports which ordinal ' +
			'the rollout is waiting on — it is always the lowest unready one, exactly ' +
			'what your rule 3 returns.</p>',
		],
		complexity: { time: 'O(n + desired)', space: 'O(n) — the ordinal index' },
	});
})();
