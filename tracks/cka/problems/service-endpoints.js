/* Service Endpoints — Networking (Easy). The endpoints controller's
 * selection logic: label matching plus the readiness gate. Exact-table
 * harness; endpoint order is the pod input order, so results are
 * fully deterministic.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="Service selecting two ready pods; a not-ready pod is grayed out and excluded from the endpoints">' +
		// service box
		'<rect x="20" y="78" width="132" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="86" y="97" text-anchor="middle">Service</text>' +
		'<text x="86" y="115" text-anchor="middle" class="lbl">selector app=web</text>' +
		// pods
		'<rect x="250" y="16" width="140" height="42" rx="6" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="320" y="34" text-anchor="middle">web-1 · Ready</text>' +
		'<text x="320" y="50" text-anchor="middle" class="lbl">10.0.0.1</text>' +
		'<rect x="250" y="80" width="140" height="42" rx="6" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="320" y="98" text-anchor="middle">web-2 · Ready</text>' +
		'<text x="320" y="114" text-anchor="middle" class="lbl">10.0.0.2</text>' +
		'<rect x="250" y="144" width="140" height="42" rx="6" fill="none" stroke="var(--dim)" stroke-dasharray="4 3"/>' +
		'<text x="320" y="162" text-anchor="middle" style="fill:var(--dim)">web-3 · NotReady</text>' +
		'<text x="320" y="178" text-anchor="middle" class="lbl">selected, but no traffic</text>' +
		// arrows service → pods
		'<path d="M 152 90 C 200 70 210 52 246 40" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowSVE)"/>' +
		'<path d="M 152 101 L 246 101" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowSVE)"/>' +
		'<path d="M 152 112 C 200 132 210 152 246 163" fill="none" stroke="var(--dim)" stroke-width="1.2" stroke-dasharray="4 3"/>' +
		'<text x="196" y="150" class="lbl" style="fill:var(--dim)">✗ readiness gate</text>' +
		// endpoints list
		'<text x="430" y="60" class="lbl">Endpoints</text>' +
		'<rect x="430" y="70" width="88" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="442" y="88">10.0.0.1</text>' +
		'<rect x="430" y="102" width="88" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="442" y="120">10.0.0.2</text>' +
		'<defs><marker id="dgArrowSVE" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'service-endpoints',
		title: 'Service Endpoints',
		nav: 'Service Endpoints',
		difficulty: 'Easy',
		category: 'Networking',
		task: 'Implement Endpoints — label selection plus the readiness gate. Make all 6 tests pass.',

		prose: [
			'<h2>Service Endpoints</h2>' +
			'<p>You created a Service, but requests to it hang. Before touching the ' +
			'network stack, an admin asks a simpler question: <em>who is behind this ' +
			'Service right now?</em> The endpoints controller answers it continuously — ' +
			'it watches pods and rebuilds the Service’s endpoint list every time a pod ' +
			'appears, dies, is relabeled, or changes readiness. Your job is that ' +
			'controller’s selection logic.</p>' +
			'<p>Implement <code>Endpoints(selector, pods)</code>, returning the IPs (in ' +
			'input order) of the pods the Service routes to:</p>' +
			'<ul>' +
			'<li><strong>Selection</strong> — the pod’s labels must contain <em>every</em> ' +
			'selector <code>key=value</code> pair. Extra labels on the pod are fine: selection is a ' +
			'subset test, not equality.</li>' +
			'<li><strong>Readiness</strong> — only <code>Ready</code> pods become endpoints. A pod ' +
			'that matches the selector but fails its readiness probe is selected yet ' +
			'receives no traffic.</li>' +
			'<li><strong>Empty selector</strong> — returns <em>no</em> endpoints. A Service ' +
			'defined without a selector never gets automatic endpoints; that mode exists ' +
			'so admins can attach manually-managed Endpoints objects pointing at ' +
			'external systems (a database outside the cluster, say).</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Example</h3>',
			{ code: 'Endpoints(map[string]string{"app": "web"}, pods)\n// pods: web-1 (app=web, Ready), web-2 (app=web, NotReady), db-1 (app=db, Ready)\n// → []string{"10.0.0.1"}   only the ready, matching pod', lang: 'txt' },
			'<p>This is a simplification of the real controller — we skip named ports, ' +
			'EndpointSlices, and terminating-pod handling — but the two gates ' +
			'(selection, then readiness) are exactly the documented behavior.</p>',
		],

		starter: [
			'package main',
			'',
			'// SPod is a simplified pod: its labels, readiness, and assigned IP.',
			'type SPod struct {',
			'	Name   string',
			'	Labels map[string]string',
			'	Ready  bool',
			'	IP     string',
			'}',
			'',
			'// Endpoints returns the IPs (in input order) of the pods a Service',
			'// with the given selector routes to: every selector key=value must',
			'// be present in the pod\'s labels, AND the pod must be Ready.',
			'//',
			'// An empty selector returns no endpoints — a Service without a',
			'// selector gets no automatic endpoints (that mode is for manually',
			'// managed / external endpoints).',
			'func Endpoints(selector map[string]string, pods []SPod) []string {',
			'	// your code here',
			'	return nil',
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
			'		sel  map[string]string',
			'		pods []SPod',
			'		want []string',
			'	}',
			'	cases := []tc{',
			'		{"selector app=web picks both ready web pods",',
			'			map[string]string{"app": "web"},',
			'			[]SPod{',
			'				{"web-1", map[string]string{"app": "web"}, true, "10.0.0.1"},',
			'				{"web-2", map[string]string{"app": "web"}, true, "10.0.0.2"},',
			'				{"db-1", map[string]string{"app": "db"}, true, "10.0.0.9"},',
			'			},',
			'			[]string{"10.0.0.1", "10.0.0.2"}},',
			'		{"NotReady pod is selected but excluded from endpoints",',
			'			map[string]string{"app": "web"},',
			'			[]SPod{',
			'				{"web-1", map[string]string{"app": "web"}, true, "10.0.0.1"},',
			'				{"web-2", map[string]string{"app": "web"}, false, "10.0.0.2"},',
			'			},',
			'			[]string{"10.0.0.1"}},',
			'		{"extra labels on the pod do not disqualify it",',
			'			map[string]string{"app": "web"},',
			'			[]SPod{',
			'				{"web-1", map[string]string{"app": "web", "tier": "frontend", "version": "v2"}, true, "10.0.1.5"},',
			'			},',
			'			[]string{"10.0.1.5"}},',
			'		{"multi-key selector is an AND over every pair",',
			'			map[string]string{"app": "web", "tier": "frontend"},',
			'			[]SPod{',
			'				{"fe-1", map[string]string{"app": "web", "tier": "frontend"}, true, "10.0.2.1"},',
			'				{"web-only", map[string]string{"app": "web"}, true, "10.0.2.2"},',
			'				{"be-1", map[string]string{"app": "web", "tier": "backend"}, true, "10.0.2.3"},',
			'			},',
			'			[]string{"10.0.2.1"}},',
			'		{"empty selector selects nothing (manual-endpoints mode)",',
			'			map[string]string{},',
			'			[]SPod{',
			'				{"web-1", map[string]string{"app": "web"}, true, "10.0.0.1"},',
			'			},',
			'			[]string{}},',
			'		{"label value must match exactly (web ≠ webapp)",',
			'			map[string]string{"app": "web"},',
			'			[]SPod{',
			'				{"api-1", map[string]string{"app": "webapp"}, true, "10.0.3.1"},',
			'				{"web-1", map[string]string{"app": "web"}, true, "10.0.3.2"},',
			'			},',
			'			[]string{"10.0.3.2"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := Endpoints(c.sel, append([]SPod(nil), c.pods...))',
			'			// Compare rendered forms so nil and an empty slice both',
			'			// read as "[]" — the distinction carries no meaning here.',
			'			r["pass"] = fmt.Sprintf("%v", got) == fmt.Sprintf("%v", c.want)',
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
			'// SPod is a simplified pod: its labels, readiness, and assigned IP.',
			'type SPod struct {',
			'	Name   string',
			'	Labels map[string]string',
			'	Ready  bool',
			'	IP     string',
			'}',
			'',
			'// Endpoints returns the IPs (in input order) of the pods a Service',
			'// with the given selector routes to.',
			'//',
			'// Two gates, in the order the endpoints controller applies them:',
			'//  1. Selection — the pod must carry EVERY selector key with the',
			'//     exact value. A subset test, so extra pod labels are harmless;',
			'//     that is what lets one pod be selected by many Services.',
			'//  2. Readiness — only Ready pods receive traffic. Readiness is the',
			'//     pod\'s own signal ("probe passing"), and gating here is what',
			'//     makes rolling updates hitless: a new pod joins the endpoint',
			'//     list only once it can actually serve.',
			'//',
			'// The empty selector short-circuits to none: a selector-less Service',
			'// is the manual/external-endpoints mode, so automatic selection must',
			'// stay out of the way rather than match every pod in the namespace.',
			'func Endpoints(selector map[string]string, pods []SPod) []string {',
			'	if len(selector) == 0 {',
			'		return nil',
			'	}',
			'	ips := []string{}',
			'	for _, p := range pods {',
			'		if !p.Ready {',
			'			continue // selected or not, an unready pod never serves',
			'		}',
			'		matched := true',
			'		for k, v := range selector {',
			'			// Map iteration order is random, but AND-ing every pair is',
			'			// order-independent, so determinism is preserved.',
			'			if p.Labels[k] != v {',
			'				matched = false',
			'				break',
			'			}',
			'		}',
			'		if matched {',
			'			ips = append(ips, p.IP)',
			'		}',
			'	}',
			'	return ips',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Two independent gates</h3>' +
			'<p>The whole function is a filter with two conditions that fail for ' +
			'different reasons, and debugging a Service means figuring out <em>which one</em> ' +
			'is failing:</p>',
			{ code: 'if !p.Ready {\n\tcontinue // gate 2: probe failing → no traffic\n}\nfor k, v := range selector {\n\tif p.Labels[k] != v { // gate 1: label mismatch → not selected\n\t\tmatched = false\n\t\tbreak\n\t}\n}' },
			'<p>The principle underneath is that <strong>label selection is Kubernetes’ ' +
			'join</strong>: Services find their pods by labels, Deployments claim their ' +
			'ReplicaSets and pods by labels, PodDisruptionBudgets pick what they protect ' +
			'by labels — never by name. Objects stay decoupled, and one typo in a label ' +
			'(<code>web</code> vs <code>webapp</code>) silently joins to nothing, which is why the ' +
			'empty-endpoints symptom is so common.</p>' +
			'<p>The readiness gate is the second lesson: selection says <em>who belongs to ' +
			'the set</em>, readiness says <em>who may serve right now</em>. Keeping them ' +
			'separate is what makes rolling updates and failing probes drain traffic ' +
			'gracefully without editing any Service.</p>' +
			'<h3>On the exam</h3>' +
			'<p>“Service not responding” tasks start with <code>kubectl get endpoints ' +
			'&lt;svc&gt;</code> (or <code>kubectl describe svc</code>). An <em>empty</em> endpoint list ' +
			'means exactly one of the two gates: the selector doesn’t match the pod ' +
			'labels (compare <code>kubectl get pods --show-labels</code> against the Service ' +
			'spec) or the pods are failing readiness probes (<code>kubectl describe pod</code>, ' +
			'look at conditions and probe events). Fix the join or fix the probe — the ' +
			'network is almost never the culprit.</p>',
		],
		complexity: { time: 'O(p·s) — pods × selector keys', space: 'O(1) beyond the output' },
	});
})();
