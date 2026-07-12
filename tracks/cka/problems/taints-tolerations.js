/* Taints & Tolerations — Scheduling (Medium). The documented toleration-
 * matching rules (Equal vs Exists, empty key, empty effect) plus the node-
 * level rule that EVERY taint must be tolerated. Table-driven harness where
 * each case isolates one matching rule, ending with the one-of-two-taints
 * trap.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	// A tainted node with a "shield": one pod bounces off, one with a
	// matching toleration passes through.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="a taint repels a plain pod; a pod with a matching toleration passes">' +
		// node + shield
		'<rect x="360" y="40" width="140" height="120" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="430" y="68" text-anchor="middle">node</text>' +
		'<text x="430" y="88" text-anchor="middle" class="lbl">taint:</text>' +
		'<text x="430" y="102" text-anchor="middle" class="lbl">dedicated=gpu:NoSchedule</text>' +
		'<path d="M 340 30 C 320 70 320 130 340 170" fill="none" stroke="var(--err-edge)" stroke-width="2" stroke-dasharray="6 4"/>' +
		'<text x="330" y="20" text-anchor="end" class="lbl" style="fill:var(--err-fg)">taint shield</text>' +
		// repelled pod
		'<rect x="20" y="45" width="130" height="34" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="85" y="67" text-anchor="middle" class="lbl">pod (no toleration)</text>' +
		'<path d="M 155 62 C 240 62 290 66 322 74" fill="none" stroke="var(--err-edge)" stroke-width="1.6" marker-end="url(#dgArrowTNTerr)"/>' +
		'<path d="M 322 84 C 300 96 280 104 258 108" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#dgArrowTNTerr)"/>' +
		'<text x="240" y="126" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">repelled</text>' +
		// tolerating pod
		'<rect x="20" y="140" width="130" height="46" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="85" y="159" text-anchor="middle" class="lbl">pod + toleration</text>' +
		'<text x="85" y="176" text-anchor="middle" class="lbl">dedicated=gpu</text>' +
		'<path d="M 155 160 C 260 160 330 150 400 140" fill="none" stroke="var(--ok)" stroke-width="1.8" marker-end="url(#dgArrowTNT)"/>' +
		'<text x="255" y="150" text-anchor="middle" class="lbl" style="fill:var(--ok)">tolerated → may schedule</text>' +
		'<defs>' +
		'<marker id="dgArrowTNT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowTNTerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'taints-tolerations',
		title: 'Taints & Tolerations',
		nav: 'Taints & tolerations',
		difficulty: 'Medium',
		category: 'Scheduling',
		task: 'Implement Tolerates and SchedulableNodes per the documented matching rules — all 6 tests.',

		prose: [
			'<h2>Taints &amp; Tolerations</h2>' +
			'<p>You deploy to a fresh kubeadm cluster and every pod sits ' +
			'<code>Pending</code>: <code>1 node(s) had untolerated taint ' +
			'{node-role.kubernetes.io/control-plane: }</code>. The node is healthy and ' +
			'has room — it is <em>repelling</em> your pod on purpose. Taints are how a ' +
			'node says “keep ordinary workloads off me”; tolerations are how a pod says ' +
			'“that particular repellent doesn’t apply to me”.</p>' +
			DIAGRAM +
			'<p>This exercise uses effect <code>NoSchedule</code> only (the matching ' +
			'rules are identical for <code>NoExecute</code> and ' +
			'<code>PreferNoSchedule</code>). A toleration matches a taint per the ' +
			'documented rules:</p>' +
			'<ul>' +
			'<li><strong>Key:</strong> the keys must be equal — <em>except</em> an empty ' +
			'<code>Key</code> with <code>Operator: Exists</code> tolerates every taint ' +
			'(the universal toleration DaemonSets like node exporters use).</li>' +
			'<li><strong>Operator:</strong> <code>Exists</code> ignores <code>Value</code> ' +
			'entirely; <code>Equal</code> also requires <code>Value</code> equality.</li>' +
			'<li><strong>Effect:</strong> an empty toleration <code>Effect</code> matches ' +
			'any effect; otherwise it must equal the taint’s effect.</li>' +
			'</ul>' +
			'<p>And the node-level rule that catches everyone: a pod may schedule onto a ' +
			'node only if <strong>every taint on that node</strong> is matched by at ' +
			'least one toleration. Tolerating one taint of two changes nothing — the ' +
			'untolerated one still repels.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Tolerates(toleration, taint)</code> and ' +
			'<code>SchedulableNodes(tols, nodes)</code> (names in input order; an ' +
			'untainted node is always schedulable; empty/nil result when nothing ' +
			'admits the pod).</p>',
			{ code: 'taint:      dedicated=gpu:NoSchedule\ntolerations:\n  {Key: dedicated, Operator: Equal, Value: gpu, Effect: NoSchedule} → tolerates\n  {Key: dedicated, Operator: Exists, Effect: NoSchedule}           → tolerates (value ignored)\n  {Operator: Exists}                                               → tolerates anything', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Taint marks a node as repelling pods that do not tolerate it. This',
			'// exercise uses Effect "NoSchedule" only; the matching rules are the',
			'// same for the other effects.',
			'type Taint struct {',
			'	Key, Value, Effect string',
			'}',
			'',
			'// Toleration lets a pod ignore a matching taint. Operator is "Equal"',
			'// (key and value must match) or "Exists" (key must match, value is',
			'// ignored). An empty Key with Operator "Exists" tolerates every taint;',
			'// an empty Effect matches any effect.',
			'type Toleration struct {',
			'	Key, Value, Operator, Effect string',
			'}',
			'',
			'// TaintedNode is a node plus its taints (possibly none).',
			'type TaintedNode struct {',
			'	Name   string',
			'	Taints []Taint',
			'}',
			'',
			'// Tolerates reports whether toleration t matches the given taint,',
			'// following the documented rules above.',
			'func Tolerates(t Toleration, taint Taint) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// SchedulableNodes returns the names of the nodes this pod (carrying',
			'// tolerations tols) may schedule onto, preserving input order. A node',
			'// qualifies iff EVERY one of its taints is tolerated by at least one',
			'// toleration; an untainted node always qualifies.',
			'func SchedulableNodes(tols []Toleration, nodes []TaintedNode) []string {',
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
			'		tols  []Toleration',
			'		nodes []TaintedNode',
			'		want  []string',
			'	}',
			'	// The kubeadm control-plane taint: value is empty by convention.',
			'	cpTaint := Taint{Key: "node-role.kubernetes.io/control-plane", Effect: "NoSchedule"}',
			'	gpuTaint := Taint{Key: "dedicated", Value: "gpu", Effect: "NoSchedule"}',
			'	infraTaint := Taint{Key: "dedicated", Value: "infra", Effect: "NoSchedule"}',
			'	maintTaint := Taint{Key: "maintenance", Value: "true", Effect: "NoSchedule"}',
			'	cases := []tc{',
			'		{"untainted node is always schedulable",',
			'			nil,',
			'			[]TaintedNode{{Name: "worker-1"}},',
			'			[]string{"worker-1"}},',
			'		{"control-plane taint blocks a pod with no tolerations",',
			'			nil,',
			'			[]TaintedNode{',
			'				{Name: "cp-1", Taints: []Taint{cpTaint}},',
			'				{Name: "worker-1"},',
			'			},',
			'			[]string{"worker-1"}},',
			'		{"Equal toleration: value must match exactly",',
			'			[]Toleration{{Key: "dedicated", Value: "gpu", Operator: "Equal", Effect: "NoSchedule"}},',
			'			[]TaintedNode{',
			'				{Name: "gpu-1", Taints: []Taint{gpuTaint}},',
			'				{Name: "infra-1", Taints: []Taint{infraTaint}},',
			'			},',
			'			[]string{"gpu-1"}},',
			'		{"Exists toleration ignores the taint value",',
			'			[]Toleration{{Key: "dedicated", Operator: "Exists", Effect: "NoSchedule"}},',
			'			[]TaintedNode{',
			'				{Name: "gpu-1", Taints: []Taint{gpuTaint}},',
			'				{Name: "infra-1", Taints: []Taint{infraTaint}},',
			'			},',
			'			[]string{"gpu-1", "infra-1"}},',
			'		{"empty key + Exists (and empty effect) tolerates everything",',
			'			[]Toleration{{Operator: "Exists"}},',
			'			[]TaintedNode{',
			'				{Name: "cp-1", Taints: []Taint{cpTaint}},',
			'				{Name: "gpu-1", Taints: []Taint{gpuTaint, maintTaint}},',
			'			},',
			'			[]string{"cp-1", "gpu-1"}},',
			'		{"one of two taints tolerated → still blocked",',
			'			[]Toleration{{Key: "dedicated", Value: "gpu", Operator: "Equal", Effect: "NoSchedule"}},',
			'			[]TaintedNode{{Name: "gpu-1", Taints: []Taint{gpuTaint, maintTaint}}},',
			'			[]string{}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Copies keep a mutating implementation from corrupting',
			'			// the shared case fixtures.',
			'			got := SchedulableNodes(append([]Toleration(nil), c.tols...), append([]TaintedNode(nil), c.nodes...))',
			'			// %v comparison treats nil and []string{} the same — a',
			'			// fully repelled pod may report either.',
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
			'// Taint marks a node as repelling pods that do not tolerate it. This',
			'// exercise uses Effect "NoSchedule" only; the matching rules are the',
			'// same for the other effects.',
			'type Taint struct {',
			'	Key, Value, Effect string',
			'}',
			'',
			'// Toleration lets a pod ignore a matching taint. Operator is "Equal"',
			'// (key and value must match) or "Exists" (key must match, value is',
			'// ignored). An empty Key with Operator "Exists" tolerates every taint;',
			'// an empty Effect matches any effect.',
			'type Toleration struct {',
			'	Key, Value, Operator, Effect string',
			'}',
			'',
			'// TaintedNode is a node plus its taints (possibly none).',
			'type TaintedNode struct {',
			'	Name   string',
			'	Taints []Taint',
			'}',
			'',
			'// Tolerates reports whether toleration t matches the given taint.',
			'// The rules are checked as a sequence of early-out guards, in the same',
			'// order the docs state them — each guard eliminates one way to NOT',
			'// match, and whatever survives matches.',
			'func Tolerates(t Toleration, taint Taint) bool {',
			'	// Universal toleration: empty key + Exists matches every taint',
			'	// (key, value, and effect). Checked first because it bypasses',
			'	// the key comparison below.',
			'	if t.Key == "" && t.Operator == "Exists" {',
			'		return true',
			'	}',
			'	if t.Key != taint.Key {',
			'		return false',
			'	}',
			'	// Equal is the default semantics: value must match. Exists',
			'	// deliberately skips this — it asks "is the key present?", which',
			'	// the guard above already established.',
			'	if t.Operator == "Equal" && t.Value != taint.Value {',
			'		return false',
			'	}',
			'	// Empty toleration effect is a wildcard over effects; otherwise',
			'	// a NoSchedule toleration does not cover a NoExecute taint.',
			'	return t.Effect == "" || t.Effect == taint.Effect',
			'}',
			'',
			'// SchedulableNodes returns the names of the nodes this pod may',
			'// schedule onto, preserving input order.',
			'//',
			'// The quantifiers are the whole trick: EVERY taint needs SOME',
			'// toleration (∀ taint ∃ toleration). One untolerated taint vetoes the',
			'// node, which is why "I tolerated one of the two taints" still leaves',
			'// a pod Pending.',
			'func SchedulableNodes(tols []Toleration, nodes []TaintedNode) []string {',
			'	names := []string{}',
			'	for _, node := range nodes {',
			'		blocked := false',
			'		for _, taint := range node.Taints {',
			'			tolerated := false',
			'			for _, t := range tols {',
			'				if Tolerates(t, taint) {',
			'					tolerated = true',
			'					break',
			'				}',
			'			}',
			'			if !tolerated {',
			'				blocked = true // one uncovered taint is enough to repel',
			'				break',
			'			}',
			'		}',
			'		// A node with no taints never sets blocked — untainted nodes',
			'		// accept anything, no toleration required.',
			'		if !blocked {',
			'			names = append(names, node.Name)',
			'		}',
			'	}',
			'	return names',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Repel, don’t attract</h3>' +
			'<p>The mental model worth keeping: <strong>taints repel; tolerations permit ' +
			'but never attract</strong>. A toleration only removes a barrier — it does ' +
			'not pull the pod toward the tainted node. To <em>dedicate</em> nodes to a ' +
			'workload you need both halves: a taint to keep everyone else off, plus a ' +
			'nodeSelector or node affinity to steer the workload on (attraction is the ' +
			'previous problem’s machinery). Forgetting the second half is why “my GPU ' +
			'pods tolerate the GPU taint but still land on regular workers” is such a ' +
			'common surprise.</p>' +
			'<h3>The matching rules are guards, not a matrix</h3>' +
			'<p>Written as early-out guards, the documented rules stay readable — and the ' +
			'order matters, because the universal toleration bypasses the key check:</p>',
			{ code: 'if t.Key == "" && t.Operator == "Exists" {\n\treturn true // universal: matches every key, value, and effect\n}\nif t.Key != taint.Key {\n\treturn false\n}\nif t.Operator == "Equal" && t.Value != taint.Value {\n\treturn false // Exists skips this: value is irrelevant\n}\nreturn t.Effect == "" || t.Effect == taint.Effect' },
			'<p>Node admission is then a pair of quantifiers: <em>every</em> taint must ' +
			'find <em>some</em> toleration. The last test case is the trap the real ' +
			'scheduler springs constantly — tolerating one of a node’s two taints ' +
			'achieves nothing, because the untolerated one still vetoes. The same ' +
			'∀/∃ shape shows up in RBAC (any one rule may allow) versus admission ' +
			'control (every webhook must allow).</p>' +
			'<h3>On the exam</h3>' +
			'<p>Taints are managed with <code>kubectl taint nodes node1 ' +
			'dedicated=gpu:NoSchedule</code> and removed with the trailing-dash form ' +
			'<code>kubectl taint nodes node1 dedicated=gpu:NoSchedule-</code>; inspect ' +
			'them via <code>kubectl describe node | grep -i taint</code>. Control-plane ' +
			'nodes reject workloads because kubeadm taints them with ' +
			'<code>node-role.kubernetes.io/control-plane:NoSchedule</code> — that is ' +
			'the deliberate wall keeping app pods away from etcd and the API server. ' +
			'On a single-node lab cluster nothing can schedule until you remove it ' +
			'(<code>kubectl taint nodes --all ' +
			'node-role.kubernetes.io/control-plane-</code>), and a Pending pod whose ' +
			'events say <code>untolerated taint</code> is diagnosed exactly by the ' +
			'function you just wrote.</p>',
		],
		complexity: { time: 'O(n·t·k) — nodes × taints × tolerations', space: 'O(n)' },
	});
})();
