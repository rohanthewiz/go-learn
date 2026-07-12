/* PDB & Node Drain — Disruptions (Medium). The eviction API's budget
 * check plus a drain's first sweep over a node. Exact-table harness:
 * evictions happen in pod input order, so outcomes are deterministic.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="node draining: two pods evicted, one held back by a PodDisruptionBudget shield">' +
		// node box
		'<rect x="20" y="34" width="200" height="160" rx="8" fill="none" stroke="var(--fg)" stroke-width="1.8"/>' +
		'<text x="120" y="24" text-anchor="middle" class="lbl">node-1 (cordoned, draining)</text>' +
		// pods inside
		'<rect x="40" y="50" width="160" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="120" y="72" text-anchor="middle" class="lbl">log-1 · no PDB</text>' +
		'<rect x="40" y="96" width="160" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="120" y="118" text-anchor="middle" class="lbl">web-1 · budget ok</text>' +
		'<rect x="40" y="142" width="160" height="34" rx="4" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="120" y="164" text-anchor="middle" class="lbl">web-2 · eviction refused</text>' +
		// shield on the blocked pod
		'<path d="M 214 142 C 232 148 232 170 214 176" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="244" y="163" class="lbl" style="fill:var(--err-edge)">PDB minAvailable=2</text>' +
		// evicted arrows
		'<path d="M 200 67 L 300 67" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowPDB)"/>' +
		'<path d="M 200 113 L 300 113" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowPDB)"/>' +
		'<text x="310" y="71">evicted</text>' +
		'<text x="310" y="117">evicted</text>' +
		// remaining replica elsewhere
		'<rect x="380" y="142" width="160" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="460" y="164" text-anchor="middle" class="lbl">web-3 on node-2 · Ready</text>' +
		'<text x="380" y="130" class="lbl">only 2 web replicas left —</text>' +
		'<text x="380" y="115" class="lbl" style="fill:var(--dim)">evicting web-2 would leave 1 &lt; 2:</text>' +
		'<text x="380" y="196" class="lbl">drain reports: node NOT fully drained</text>' +
		'<defs><marker id="dgArrowPDB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'pdb-drain',
		title: 'PDB & Node Drain',
		nav: 'PDB & Drain',
		difficulty: 'Medium',
		category: 'Disruptions',
		task: 'Implement CanEvict and DrainNode — the disruption-budget check and a drain\'s first sweep. Make all 6 tests pass.',

		prose: [
			'<h2>PDB &amp; Node Drain</h2>' +
			'<p>Kernel patch day: you <code>kubectl drain node-1</code> and it hangs at one ' +
			'stubborn pod. That pod isn’t broken — a PodDisruptionBudget is doing its ' +
			'job. Drains evict pods through the <em>eviction API</em>, and the eviction API ' +
			'refuses any eviction that would drop an app below its budget. Implement ' +
			'both halves: the budget check, and the drain loop that calls it.</p>' +
			'<ul>' +
			'<li><code>CanEvict(pods, pdbs, victim)</code> — the victim must exist by name ' +
			'(else <code>false</code>). Find its <code>App</code>; if no PDB covers that app, eviction ' +
			'is free — <code>true</code>. Otherwise it’s allowed only if the app’s replica count ' +
			'<em>after</em> the eviction stays at or above the budget: ' +
			'<code>count − 1 &gt;= MinAvailable</code>. Replicas are counted across <em>all</em> ' +
			'nodes — availability is app-wide.</li>' +
			'<li><code>DrainNode(pods, pdbs, node)</code> — one pass over <code>pods</code> in input ' +
			'order: for each pod on the node, check <code>CanEvict</code> against the ' +
			'<em>current remaining</em> set; if allowed, remove it and record its name. ' +
			'Return <code>(evictedNames, complete)</code> where <code>complete</code> means no pods ' +
			'remain on the node. Each eviction tightens the budget for the next — order ' +
			'matters.</li>' +
			'</ul>' +
			'<p><strong>Simplifications, stated up front:</strong> evicted pods simply vanish ' +
			'here — in reality their controller reschedules replacements onto other ' +
			'nodes, and <code>kubectl drain</code> <em>retries</em> blocked evictions as those ' +
			'replacements come up, so a real drain may eventually finish where our ' +
			'single pass reports <code>complete=false</code>. This function is the drain’s ' +
			'<em>first sweep</em> — exactly the state you see when a drain appears stuck.</p>' +
			DIAGRAM +
			'<h3>Example</h3>',
			{ code: 'pods: web-1(node-1) web-2(node-1) web-3(node-2), all app=web\npdbs: {App: "web", MinAvailable: 2}\n\nDrainNode(pods, pdbs, "node-1")\n// web-1: 3 replicas − 1 = 2 >= 2 → evicted\n// web-2: 2 replicas − 1 = 1 <  2 → refused\n// → ([]string{"web-1"}, false)   the stuck-drain scenario', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// DPod is a simplified pod: which app it belongs to (its label,',
			'// in effect) and which node it runs on.',
			'type DPod struct {',
			'	Name string',
			'	App  string',
			'	Node string',
			'}',
			'',
			'// PDB is a simplified PodDisruptionBudget: the app it covers and',
			'// how many of its replicas must stay up through VOLUNTARY',
			'// disruptions (evictions).',
			'type PDB struct {',
			'	App          string',
			'	MinAvailable int',
			'}',
			'',
			'// CanEvict reports whether the eviction API would allow evicting',
			'// the named pod. Unknown victim → false. No PDB covering its app →',
			'// true. Otherwise allowed only if (replicas of that app) − 1 >=',
			'// MinAvailable, counting replicas across ALL nodes.',
			'func CanEvict(pods []DPod, pdbs []PDB, victim string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// DrainNode performs a drain\'s first sweep: walk pods in input',
			'// order; for each pod on node, if CanEvict against the CURRENT',
			'// remaining set allows it, remove it and record its name. Returns',
			'// the evicted names and whether the node ended up empty.',
			'// (Evicted pods vanish here — no rescheduling, no retry loop.)',
			'func DrainNode(pods []DPod, pdbs []PDB, node string) ([]string, bool) {',
			'	// your code here',
			'	return nil, false',
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
			'		name   string',
			'		pods   []DPod',
			'		pdbs   []PDB',
			'		op     string // "evict" (arg = victim) or "drain" (arg = node)',
			'		arg    string',
			'		wantEv []string // drain only',
			'		wantOK bool     // evict verdict, or drain completeness',
			'	}',
			'	cases := []tc{',
			'		{"no PDBs: drain evicts everything, node complete",',
			'			[]DPod{{"web-1", "web", "node-1"}, {"log-1", "log", "node-1"}, {"web-2", "web", "node-2"}},',
			'			nil, "drain", "node-1", []string{"web-1", "log-1"}, true},',
			'		{"PDB minAvailable=2, 3 replicas: first eviction ok, second refused",',
			'			[]DPod{{"web-1", "web", "node-1"}, {"web-2", "web", "node-1"}, {"web-3", "web", "node-2"}},',
			'			[]PDB{{"web", 2}}, "drain", "node-1", []string{"web-1"}, false},',
			'		{"CanEvict: app with no PDB is unprotected",',
			'			[]DPod{{"log-1", "log", "node-1"}, {"web-1", "web", "node-1"}},',
			'			[]PDB{{"web", 2}}, "evict", "log-1", nil, true},',
			'		{"mixed node: unprotected pod evicts, protected pod stays",',
			'			[]DPod{{"web-1", "web", "node-1"}, {"web-2", "web", "node-2"}, {"log-1", "log", "node-1"}},',
			'			[]PDB{{"web", 2}}, "drain", "node-1", []string{"log-1"}, false},',
			'		{"CanEvict: unknown victim is refused",',
			'			[]DPod{{"web-1", "web", "node-1"}},',
			'			nil, "evict", "ghost", nil, false},',
			'		{"CanEvict: budget satisfied when spare replicas exist",',
			'			[]DPod{{"web-1", "web", "node-1"}, {"web-2", "web", "node-2"}},',
			'			[]PDB{{"web", 1}}, "evict", "web-1", nil, true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": fmt.Sprintf("%s — %s %q", c.name, c.op, c.arg)}',
			'		if c.op == "evict" {',
			'			r["want"] = fmt.Sprintf("%v", c.wantOK)',
			'		} else {',
			'			r["want"] = fmt.Sprintf("evicted=%v complete=%v", c.wantEv, c.wantOK)',
			'		}',
			'		runCase(r, func() {',
			'			// Copy: the user\'s DrainNode may legitimately mutate its input.',
			'			podsCopy := append([]DPod(nil), c.pods...)',
			'			if c.op == "evict" {',
			'				got := CanEvict(podsCopy, c.pdbs, c.arg)',
			'				r["pass"] = got == c.wantOK',
			'				r["got"] = fmt.Sprintf("%v", got)',
			'			} else {',
			'				names, complete := DrainNode(podsCopy, c.pdbs, c.arg)',
			'				// Rendered comparison: nil and []string{} both read "[]".',
			'				r["pass"] = complete == c.wantOK && fmt.Sprintf("%v", names) == fmt.Sprintf("%v", c.wantEv)',
			'				r["got"] = fmt.Sprintf("evicted=%v complete=%v", names, complete)',
			'			}',
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
			'// DPod is a simplified pod: which app it belongs to (its label,',
			'// in effect) and which node it runs on.',
			'type DPod struct {',
			'	Name string',
			'	App  string',
			'	Node string',
			'}',
			'',
			'// PDB is a simplified PodDisruptionBudget: the app it covers and',
			'// how many of its replicas must stay up through VOLUNTARY',
			'// disruptions (evictions).',
			'type PDB struct {',
			'	App          string',
			'	MinAvailable int',
			'}',
			'',
			'// CanEvict reports whether the eviction API would allow evicting',
			'// the named pod.',
			'//',
			'// The check is app-wide on purpose: a PDB protects an application\'s',
			'// availability, not any particular pod, so replicas on OTHER nodes',
			'// count toward the budget. That is why draining one node of a',
			'// well-spread deployment usually succeeds.',
			'func CanEvict(pods []DPod, pdbs []PDB, victim string) bool {',
			'	app, found := "", false',
			'	for _, p := range pods {',
			'		if p.Name == victim {',
			'			app, found = p.App, true',
			'			break',
			'		}',
			'	}',
			'	if !found {',
			'		return false // nothing to evict; refusing is the safe answer',
			'	}',
			'	count := 0',
			'	for _, p := range pods {',
			'		if p.App == app {',
			'			count++',
			'		}',
			'	}',
			'	// Every PDB covering the app must tolerate losing one replica.',
			'	// (Typically there is at most one, but checking all is both',
			'	// simpler and matches the API: any violated budget refuses.)',
			'	for _, b := range pdbs {',
			'		if b.App == app && count-1 < b.MinAvailable {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'// DrainNode performs a drain\'s first sweep over the node.',
			'//',
			'// The loop walks the ORIGINAL input order (deterministic for the',
			'// tests) but always consults the CURRENT remaining set — each',
			'// successful eviction shrinks an app\'s replica count and can flip',
			'// the verdict for its siblings. That interaction is the whole',
			'// point: with minAvailable=2 and 3 replicas, the first eviction',
			'// spends the entire disruption budget.',
			'func DrainNode(pods []DPod, pdbs []PDB, node string) ([]string, bool) {',
			'	remaining := append([]DPod(nil), pods...)',
			'	evicted := []string{}',
			'	for _, p := range pods {',
			'		if p.Node != node {',
			'			continue',
			'		}',
			'		if !CanEvict(remaining, pdbs, p.Name) {',
			'			continue // budget says no; a real drain would retry later',
			'		}',
			'		evicted = append(evicted, p.Name)',
			'		for i := range remaining {',
			'			if remaining[i].Name == p.Name {',
			'				remaining = append(remaining[:i], remaining[i+1:]...)',
			'				break',
			'			}',
			'		}',
			'	}',
			'	complete := true',
			'	for _, p := range remaining {',
			'		if p.Node == node {',
			'			complete = false // something is still pinned here',
			'			break',
			'		}',
			'	}',
			'	return evicted, complete',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the second eviction fails</h3>' +
			'<p>The instructive case is minAvailable=2 with three replicas, two of them ' +
			'on the draining node. The first eviction passes (3−1=2) and <em>spends the ' +
			'entire budget</em>; the second is refused (2−1=1). Nothing is wrong — the ' +
			'system is holding exactly the line the PDB drew. The implementation detail ' +
			'that captures this is checking <code>CanEvict</code> against the <em>current</em> ' +
			'remaining set, not the original snapshot:</p>',
			{ code: 'if !CanEvict(remaining, pdbs, p.Name) {\n\tcontinue // 3−1=2 passed for web-1; web-2 now sees 2−1=1 < 2\n}' },
			'<p>The principle to carry out of this problem is the split between ' +
			'<strong>voluntary and involuntary disruptions</strong>. PDBs guard only the ' +
			'<em>voluntary</em> kind — evictions you ask for: drains, cluster autoscaler ' +
			'scale-downs, rollouts. A node crash or OOM kill consults no budget; PDBs ' +
			'are a brake on <em>operations</em>, not a high-availability guarantee. The same ' +
			'idea appears anywhere maintenance meets availability: rolling-restart ' +
			'batch limits in databases, connection-drain windows on load balancers.</p>' +
			'<p>Remember our two stated simplifications when mapping this back to a real ' +
			'cluster: evicted pods actually get rescheduled by their controllers, and ' +
			'<code>kubectl drain</code> retries refusals as replacements come Ready — so a ' +
			'real drain of the scenario above <em>eventually completes</em> once web-1’s ' +
			'replacement is up elsewhere. Our <code>complete=false</code> is the honest state ' +
			'of the first sweep. And if minAvailable equals the replica count, no retry ' +
			'ever helps: the drain is stuck until someone scales up or relaxes the ' +
			'PDB.</p>' +
			'<h3>On the exam</h3>' +
			'<p>Node-maintenance tasks are <code>kubectl cordon</code> (mark unschedulable, ' +
			'touch nothing) versus <code>kubectl drain --ignore-daemonsets</code> (cordon, then ' +
			'evict — the DaemonSet flag is nearly always required since DaemonSet pods ' +
			'can’t leave). When a drain hangs, read the error: an eviction refused “due ' +
			'to PodDisruptionBudget” means run <code>kubectl get pdb -A</code> and compare ' +
			'<code>ALLOWED DISRUPTIONS</code> with replica counts — a PDB with ' +
			'minAvailable == replicas allows zero disruptions, and the fix is scaling ' +
			'the app up or adjusting the budget, never force-deleting the pod.</p>',
		],
		complexity: { time: 'O(n²) worst case for a full drain (n pods)', space: 'O(n) for the remaining set' },
	});
})();
