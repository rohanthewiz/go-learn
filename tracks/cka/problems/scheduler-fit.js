/* Scheduler Fit — Scheduling (Medium). The kube-scheduler's filtering phase
 * as a pure function: resource-request fit + nodeSelector match, in node
 * order. The harness is a table of pods vs. small node fleets, including the
 * exact-fit boundary and the classic "node has free RAM but the pod is still
 * Pending" case that trips people who confuse requests with live usage.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	// Two node "bins" with request blocks stacked inside; a pending pod fits
	// the first bin's remaining space but not the second's.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="scheduler filtering: pod requests must fit into unreserved node capacity">' +
		// pending pod
		'<rect x="20" y="80" width="120" height="46" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="80" y="99" text-anchor="middle">pod (Pending)</text>' +
		'<text x="80" y="117" text-anchor="middle" class="lbl">requests 500m / 1Gi</text>' +
		// node-a: room left
		'<rect x="210" y="30" width="120" height="150" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<rect x="210" y="110" width="120" height="70" rx="5" fill="var(--edge)" fill-opacity="0.35" stroke="none"/>' +
		'<text x="270" y="150" text-anchor="middle" class="lbl">Σ scheduled pods’</text>' +
		'<text x="270" y="164" text-anchor="middle" class="lbl">requests</text>' +
		'<text x="270" y="80" text-anchor="middle" class="lbl" style="fill:var(--ok)">free = alloc − used</text>' +
		'<text x="270" y="22" text-anchor="middle" class="lbl">node-a ✓ fits</text>' +
		// node-b: nearly full of requests
		'<rect x="370" y="30" width="120" height="150" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<rect x="370" y="55" width="120" height="125" rx="5" fill="var(--edge)" fill-opacity="0.35" stroke="none"/>' +
		'<text x="430" y="125" text-anchor="middle" class="lbl">requests already</text>' +
		'<text x="430" y="139" text-anchor="middle" class="lbl">reserved — even if</text>' +
		'<text x="430" y="153" text-anchor="middle" class="lbl">live CPU is idle</text>' +
		'<text x="430" y="22" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">node-b ✗ Insufficient cpu</text>' +
		// arrows
		'<path d="M 145 92 C 175 80 185 68 205 60" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowSFT)"/>' +
		'<path d="M 145 112 C 230 140 300 60 364 44" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowSFTerr)"/>' +
		'<text x="20" y="200" class="lbl">the scheduler stacks REQUESTS into capacity — it never looks at live usage</text>' +
		'<defs>' +
		'<marker id="dgArrowSFT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowSFTerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'scheduler-fit',
		title: 'Scheduler Filtering: Feasible Nodes',
		nav: 'Scheduler fit',
		difficulty: 'Medium',
		category: 'Scheduling',
		task: 'Implement FeasibleNodes — resource-request fit plus nodeSelector match, all 6 tests.',

		prose: [
			'<h2>Scheduler Filtering: Feasible Nodes</h2>' +
			'<p>A pod is stuck <code>Pending</code>. <code>kubectl describe pod</code> says ' +
			'<code>0/3 nodes are available: 3 Insufficient cpu</code> — yet ' +
			'<code>kubectl top nodes</code> shows every node nearly idle. Nothing is ' +
			'broken: the scheduler does not schedule against <em>live usage</em>.</p>' +
			'<p>When a pod needs a home, kube-scheduler runs a <strong>filtering</strong> ' +
			'phase (historically “predicates”): every node is tested against the pod’s ' +
			'requirements, and only the survivors move on to scoring. You’ll implement ' +
			'the two filters that dominate real clusters:</p>' +
			'<ul>' +
			'<li><strong>Resource fit.</strong> A node fits iff its <em>unreserved</em> ' +
			'capacity covers the pod’s <em>requests</em>: ' +
			'<code>AllocCPUm − UsedCPUm ≥ pod.CPUm</code> and likewise for memory. ' +
			'Crucially, <code>UsedCPUm</code>/<code>UsedMemMi</code> are the ' +
			'<strong>sum of the requests of pods already scheduled there</strong> — ' +
			'a bookkeeping number, not a metric. A node whose pods requested everything ' +
			'but are using 2% CPU is still full in the scheduler’s eyes.</li>' +
			'<li><strong>nodeSelector.</strong> Every <code>key=value</code> pair in the ' +
			'pod’s selector must be present in the node’s labels (the node may have ' +
			'extra labels). An empty or nil selector matches every node.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>FeasibleNodes(pod, nodes)</code>: return the names of the ' +
			'nodes that pass <em>both</em> filters, preserving the input order. Exact fit ' +
			'counts as a fit (<code>free == request</code> passes). If nothing fits, ' +
			'return an empty (or nil) slice — that pod stays Pending.</p>',
			{ code: 'pod: CPUm=500 MemMi=1024, selector {disk: ssd}\nnode-a: free 800m/2048Mi, labels {disk: ssd}   → feasible\nnode-b: free 200m/4096Mi, labels {disk: ssd}   → Insufficient cpu\nnode-c: free 900m/3000Mi, labels {disk: hdd}   → selector mismatch\nFeasibleNodes(pod, nodes) → ["node-a"]', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Pod is the scheduler\'s view of the pod being placed: the sum of its',
			'// containers\' resource REQUESTS, plus an optional nodeSelector.',
			'type Pod struct {',
			'	CPUm         int               // requested CPU, millicores (1000m = 1 core)',
			'	MemMi        int               // requested memory, MiB',
			'	NodeSelector map[string]string // nil or empty = no constraint',
			'}',
			'',
			'// Node is the scheduler\'s view of a node. UsedCPUm/UsedMemMi are the',
			'// SUM OF REQUESTS of pods already scheduled here — bookkeeping, not a',
			'// live-usage metric. The scheduler never reads metrics.',
			'type Node struct {',
			'	Name       string',
			'	AllocCPUm  int // allocatable CPU, millicores',
			'	AllocMemMi int // allocatable memory, MiB',
			'	UsedCPUm   int // millicores already reserved by scheduled pods',
			'	UsedMemMi  int // MiB already reserved by scheduled pods',
			'	Labels     map[string]string',
			'}',
			'',
			'// FeasibleNodes returns the names of the nodes the pod can be scheduled',
			'// onto, preserving the input order. A node is feasible iff:',
			'//   - AllocCPUm  - UsedCPUm  >= pod.CPUm   (exact fit passes)',
			'//   - AllocMemMi - UsedMemMi >= pod.MemMi',
			'//   - every key=value in pod.NodeSelector appears in node.Labels',
			'func FeasibleNodes(pod Pod, nodes []Node) []string {',
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
			'		name  string',
			'		pod   Pod',
			'		nodes []Node',
			'		want  []string',
			'	}',
			'	ssd := map[string]string{"disk": "ssd"}',
			'	hdd := map[string]string{"disk": "hdd"}',
			'	ssdEast := map[string]string{"disk": "ssd", "zone": "us-east-1a"}',
			'	cases := []tc{',
			'		{"resource filter: node-b out of cpu (requests, not usage)",',
			'			Pod{CPUm: 500, MemMi: 1024, NodeSelector: nil},',
			'			[]Node{',
			'				{Name: "node-a", AllocCPUm: 2000, AllocMemMi: 4096, UsedCPUm: 1200, UsedMemMi: 2048, Labels: ssd},',
			'				{Name: "node-b", AllocCPUm: 2000, AllocMemMi: 4096, UsedCPUm: 1800, UsedMemMi: 512, Labels: ssd},',
			'			},',
			'			[]string{"node-a"}},',
			'		{"exact fit: free == request passes",',
			'			Pod{CPUm: 500, MemMi: 1000},',
			'			[]Node{{Name: "node-x", AllocCPUm: 1000, AllocMemMi: 2000, UsedCPUm: 500, UsedMemMi: 1000}},',
			'			[]string{"node-x"}},',
			'		{"selector mismatch excludes a node that fits on resources",',
			'			Pod{CPUm: 100, MemMi: 128, NodeSelector: map[string]string{"disk": "ssd"}},',
			'			[]Node{',
			'				{Name: "node-hdd", AllocCPUm: 4000, AllocMemMi: 8192, Labels: hdd},',
			'				{Name: "node-ssd", AllocCPUm: 4000, AllocMemMi: 8192, Labels: ssd},',
			'			},',
			'			[]string{"node-ssd"}},',
			'		{"empty selector matches every fitting node, input order kept",',
			'			Pod{CPUm: 250, MemMi: 256, NodeSelector: map[string]string{}},',
			'			[]Node{',
			'				{Name: "node-1", AllocCPUm: 1000, AllocMemMi: 1024, Labels: hdd},',
			'				{Name: "node-2", AllocCPUm: 1000, AllocMemMi: 1024, Labels: ssd},',
			'			},',
			'			[]string{"node-1", "node-2"}},',
			'		{"no feasible nodes: the pod stays Pending",',
			'			Pod{CPUm: 4000, MemMi: 1024},',
			'			[]Node{',
			'				{Name: "node-a", AllocCPUm: 2000, AllocMemMi: 4096},',
			'				{Name: "node-b", AllocCPUm: 2000, AllocMemMi: 4096, UsedCPUm: 100},',
			'			},',
			'			[]string{}},',
			'		{"multi-label selector: every pair must be present",',
			'			Pod{CPUm: 100, MemMi: 128, NodeSelector: map[string]string{"disk": "ssd", "zone": "us-east-1a"}},',
			'			[]Node{',
			'				{Name: "node-ssd-only", AllocCPUm: 2000, AllocMemMi: 4096, Labels: ssd},',
			'				{Name: "node-ssd-east", AllocCPUm: 2000, AllocMemMi: 4096, Labels: ssdEast},',
			'			},',
			'			[]string{"node-ssd-east"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Copy the node slice: a user implementation must not be',
			'			// able to corrupt the case table for later comparisons.',
			'			got := FeasibleNodes(c.pod, append([]Node(nil), c.nodes...))',
			'			// %v comparison deliberately treats nil and []string{} the',
			'			// same — "no feasible nodes" may be either.',
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
			'// Pod is the scheduler\'s view of the pod being placed: the sum of its',
			'// containers\' resource REQUESTS, plus an optional nodeSelector.',
			'type Pod struct {',
			'	CPUm         int               // requested CPU, millicores (1000m = 1 core)',
			'	MemMi        int               // requested memory, MiB',
			'	NodeSelector map[string]string // nil or empty = no constraint',
			'}',
			'',
			'// Node is the scheduler\'s view of a node. UsedCPUm/UsedMemMi are the',
			'// SUM OF REQUESTS of pods already scheduled here — bookkeeping, not a',
			'// live-usage metric. The scheduler never reads metrics.',
			'type Node struct {',
			'	Name       string',
			'	AllocCPUm  int // allocatable CPU, millicores',
			'	AllocMemMi int // allocatable memory, MiB',
			'	UsedCPUm   int // millicores already reserved by scheduled pods',
			'	UsedMemMi  int // MiB already reserved by scheduled pods',
			'	Labels     map[string]string',
			'}',
			'',
			'// FeasibleNodes returns the names of the nodes the pod can be scheduled',
			'// onto, preserving the input order.',
			'//',
			'// Each filter is written as an independent predicate over ONE node,',
			'// mirroring how the real scheduler framework composes filter plugins',
			'// (NodeResourcesFit, NodeAffinity, ...): a node survives only if every',
			'// plugin says yes, and plugins never look at other nodes.',
			'func FeasibleNodes(pod Pod, nodes []Node) []string {',
			'	feasible := []string{}',
			'	for _, node := range nodes {',
			'		if fitsResources(pod, node) && matchesSelector(pod, node) {',
			'			feasible = append(feasible, node.Name)',
			'		}',
			'	}',
			'	return feasible',
			'}',
			'',
			'// fitsResources checks unreserved capacity against the pod\'s requests.',
			'// >= (not >) on both axes: a pod that exactly consumes the remaining',
			'// capacity is a legal, even desirable, bin-packing outcome.',
			'func fitsResources(pod Pod, node Node) bool {',
			'	freeCPU := node.AllocCPUm - node.UsedCPUm',
			'	freeMem := node.AllocMemMi - node.UsedMemMi',
			'	return freeCPU >= pod.CPUm && freeMem >= pod.MemMi',
			'}',
			'',
			'// matchesSelector requires every selector pair to be present in the',
			'// node\'s labels. Ranging over the SELECTOR (not the labels) makes the',
			'// empty/nil case fall out naturally: zero constraints, zero checks,',
			'// every node matches. Extra node labels are irrelevant by design.',
			'func matchesSelector(pod Pod, node Node) bool {',
			'	for key, want := range pod.NodeSelector {',
			'		if node.Labels[key] != want {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Filter, then score</h3>' +
			'<p>kube-scheduler places one pod at a time in two phases: ' +
			'<strong>filter, then score (predicates → priorities)</strong>. Filtering is ' +
			'a hard yes/no per node — what you built here; scoring then ranks the ' +
			'survivors (spread across zones, prefer less-loaded nodes) and the winner is ' +
			'bound. If filtering returns an empty set, there is nothing to score: the ' +
			'pod goes <code>Pending</code> and an event explains which filter rejected ' +
			'each node. This two-phase shape — cheap hard constraints first, expensive ' +
			'preference ranking on the survivors — is the same pattern behind database ' +
			'query planners and load-balancer backend selection.</p>' +
			'<h3>Requests, not usage</h3>' +
			'<p>The classic misunderstanding: “the node has plenty of free CPU, why is my ' +
			'pod Pending?” The scheduler reasons about <em>requests</em> — promises, not ' +
			'measurements. <code>Used</code> is the sum of what scheduled pods ' +
			'<em>asked for</em>; live usage never enters the algorithm. That is why ' +
			'over-requesting starves a cluster that is actually idle, and why pods with ' +
			'<em>no</em> requests can pile onto one node until it collapses: they ' +
			'reserve nothing, so every node always “fits”.</p>' +
			'<p>The whole implementation is per-node predicates ANDed together:</p>',
			{ code: 'freeCPU := node.AllocCPUm - node.UsedCPUm // unreserved, NOT unused\nfits := freeCPU >= pod.CPUm && freeMem >= pod.MemMi\nfor key, want := range pod.NodeSelector { // range the constraint,\n\tif node.Labels[key] != want {          // so empty selector = no-op\n\t\treturn false\n\t}\n}' },
			'<p>Ranging over the selector instead of the labels is the load-bearing ' +
			'choice: the empty-selector-matches-all rule costs zero extra code, and node ' +
			'labels the pod never mentioned are ignored automatically.</p>' +
			'<h3>On the exam</h3>' +
			'<p>Pending-pod triage starts with <code>kubectl describe pod &lt;name&gt;</code> ' +
			'and reading the <code>Events:</code> block — the scheduler tells you exactly ' +
			'which filter failed: <code>0/3 nodes are available: 3 Insufficient cpu</code> ' +
			'(shrink the requests, or free capacity) or ' +
			'<code>node(s) didn\'t match Pod\'s node affinity/selector</code> (fix the ' +
			'selector with <code>kubectl get nodes --show-labels</code> and ' +
			'<code>kubectl label node ...</code>). Check requests against ' +
			'<code>kubectl describe node</code>’s <code>Allocatable</code> and ' +
			'<code>Allocated resources</code> sections — those two numbers are exactly ' +
			'<code>Alloc</code> and <code>Used</code> from this exercise.</p>',
		],
		complexity: { time: 'O(n·s) — n nodes × s selector entries', space: 'O(n)' },
	});
})();
