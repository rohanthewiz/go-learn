/* Eviction Order — Resource Management (Medium). The kubelet's
 * node-pressure eviction ranking: usage-above-requests decides who goes
 * first, and the QoS classes fall out of the arithmetic. Exact-table
 * harness — the comparator (with a name tiebreak) is a total order, so
 * the ranking is fully deterministic.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="pods ranked for eviction: usage above the request waterline is evicted first, largest excess leading">' +
		// eviction order arrow
		'<path d="M 40 24 L 500 24" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowEVO)" fill="none"/>' +
		'<text x="40" y="14" class="lbl">evicted first</text>' +
		'<text x="500" y="14" text-anchor="end" class="lbl">evicted last</text>' +
		// bar 1: besteffort — req 0, usage 200: ALL excess
		'<rect x="40" y="90" width="60" height="60" rx="3" fill="none" stroke="var(--err-edge)" stroke-width="1.8"/>' +
		'<line x1="34" y1="150" x2="106" y2="150" stroke="var(--ok)" stroke-dasharray="5 3"/>' +
		'<text x="70" y="166" text-anchor="middle" class="lbl">besteffort</text>' +
		'<text x="70" y="180" text-anchor="middle" class="lbl">use 200 / req 0</text>' +
		// bar 2: burstable exceeding — req 100, usage 250
		'<rect x="170" y="120" width="60" height="30" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="170" y="75" width="60" height="45" rx="3" fill="none" stroke="var(--err-edge)" stroke-width="1.8"/>' +
		'<line x1="164" y1="120" x2="236" y2="120" stroke="var(--ok)" stroke-dasharray="5 3"/>' +
		'<text x="200" y="166" text-anchor="middle" class="lbl">burst-exceed</text>' +
		'<text x="200" y="180" text-anchor="middle" class="lbl">use 250 / req 100</text>' +
		// bar 3: burstable within requests — req 300, usage 200
		'<rect x="300" y="90" width="60" height="60" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<line x1="294" y1="60" x2="366" y2="60" stroke="var(--ok)" stroke-dasharray="5 3"/>' +
		'<text x="330" y="166" text-anchor="middle" class="lbl">burst-within</text>' +
		'<text x="330" y="180" text-anchor="middle" class="lbl">use 200 / req 300</text>' +
		// bar 4: guaranteed — req 200, usage 180
		'<rect x="430" y="96" width="60" height="54" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<line x1="424" y1="90" x2="496" y2="90" stroke="var(--ok)" stroke-dasharray="5 3"/>' +
		'<text x="460" y="166" text-anchor="middle" class="lbl">guaranteed</text>' +
		'<text x="460" y="180" text-anchor="middle" class="lbl">use 180 / req 200</text>' +
		// waterline legend
		'<text x="40" y="196" class="lbl">dashed line = memory request (the waterline); red outline = usage above it</text>' +
		'<defs><marker id="dgArrowEVO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'eviction-order',
		title: 'Node-Pressure Eviction Order',
		nav: 'Eviction Order',
		difficulty: 'Medium',
		category: 'Resource Management',
		task: 'Implement EvictionOrder — rank pods by usage above requests. Make all 6 tests pass.',

		prose: [
			'<h2>Node-Pressure Eviction Order</h2>' +
			'<p>A node runs low on memory. Before the kernel starts OOM-killing processes at ' +
			'random, the kubelet steps in and <em>evicts</em> pods — deliberately, in a documented ' +
			'order. That order is the whole game: it decides whether pressure takes out a ' +
			'batch job or your database.</p>' +
			'<h3>The ranking</h3>' +
			'<p>Implement <code>EvictionOrder(pods)</code>, returning <strong>every</strong> pod name in the ' +
			'order the kubelet would evict them under memory pressure:</p>' +
			'<ol>' +
			'<li>Pods whose usage <strong>exceeds</strong> their memory request come before pods within ' +
			'their request.</li>' +
			'<li>Among the exceeders: larger excess (<code>Usage − Req</code>) first.</li>' +
			'<li>Among pods within their request: larger usage first — they are safe from ' +
			'round one, but if reclaiming from the exceeders isn\'t enough, they go too, ' +
			'biggest consumers first.</li>' +
			'<li>All ties broken by <code>Name</code> ascending, so the ranking is deterministic.</li>' +
			'</ol>' +
			DIAGRAM +
			'<p>Notice what is <em>missing</em>: there is no "QoS class" rule. BestEffort pods declare ' +
			'no requests, so <code>Req = 0</code> and <em>any</em> usage is excess — they rank first by ' +
			'arithmetic alone. Guaranteed pods have requests equal to limits, and the kernel ' +
			'caps their usage at the limit, so they can never exceed — they rank last. That is ' +
			'the actual kubelet design: QoS falls out of the numbers rather than being a ' +
			'separate rule.</p>' +
			'<p><strong>Simplification:</strong> the real kubelet inserts pod <em>Priority</em> between ' +
			'rule 1 and rule 2, and it stops evicting as soon as pressure clears rather than ' +
			'ranking the whole node. We drop priority and rank everyone — the ordering logic ' +
			'is otherwise the documented one.</p>' +
			'<h3>Example</h3>',
			{ code: 'EvictionOrder([]EPod{\n\t{"guar", 180, 200}, {"besteffort", 200, 0},\n\t{"burst-exceed", 250, 100}, {"burst-within", 200, 300},\n})\n→ ["besteffort", "burst-exceed", "burst-within", "guar"]\n//  excess 200    excess 150     usage 200      usage 180', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// EPod is a pod as the eviction ranker sees it: a name, its current',
			'// memory usage, and its declared memory request (0 for BestEffort',
			'// pods, which declare no requests).',
			'type EPod struct {',
			'	Name       string',
			'	UsageMemMi int // current working-set memory, Mi',
			'	ReqMemMi   int // declared memory request, Mi (0 = none)',
			'}',
			'',
			'// EvictionOrder returns every pod name, ranked in the order the',
			'// kubelet evicts under memory pressure:',
			'//   1. usage > request before usage <= request',
			'//   2. exceeders: larger Usage-Req first',
			'//   3. non-exceeders: larger Usage first',
			'//   4. ties: Name ascending',
			'func EvictionOrder(pods []EPod) []string {',
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
			'	"reflect"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		pods []EPod',
			'		want []string',
			'	}',
			'	cases := []tc{',
			'		{"QoS mix: besteffort and an exceeder lead; within-request by usage",',
			'			[]EPod{{"guar", 180, 200}, {"besteffort", 200, 0}, {"burst-exceed", 250, 100}, {"burst-within", 200, 300}},',
			'			[]string{"besteffort", "burst-exceed", "burst-within", "guar"}},',
			'		{"excess beats raw usage: 300/50 (excess 250) before 600/400 (excess 200)",',
			'			[]EPod{{"big-usage", 600, 400}, {"big-excess", 300, 50}},',
			'			[]string{"big-excess", "big-usage"}},',
			'		{"all within requests: ranked by usage, largest first",',
			'			[]EPod{{"api", 120, 200}, {"cache", 380, 400}, {"web", 250, 300}},',
			'			[]string{"cache", "web", "api"}},',
			'		{"equal excess: tie broken by name ascending",',
			'			[]EPod{{"beta", 150, 50}, {"alpha", 150, 50}},',
			'			[]string{"alpha", "beta"}},',
			'		{"single pod",',
			'			[]EPod{{"solo", 64, 128}},',
			'			[]string{"solo"}},',
			'		{"all guaranteed (usage = request): none exceed, ranked by usage",',
			'			[]EPod{{"db", 512, 512}, {"logger", 128, 128}, {"web", 256, 256}},',
			'			[]string{"db", "web", "logger"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		parts := make([]string, 0, len(c.pods))',
			'		for _, p := range c.pods {',
			'			parts = append(parts, fmt.Sprintf("%s use=%d req=%d", p.Name, p.UsageMemMi, p.ReqMemMi))',
			'		}',
			'		r := map[string]any{',
			'			"input": strings.Join(parts, "; "),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Pass a copy: a solution is free to sort in place.',
			'			got := EvictionOrder(append([]EPod(nil), c.pods...))',
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
			'import "sort"',
			'',
			'// EPod is a pod as the eviction ranker sees it: a name, its current',
			'// memory usage, and its declared memory request (0 for BestEffort',
			'// pods, which declare no requests).',
			'type EPod struct {',
			'	Name       string',
			'	UsageMemMi int // current working-set memory, Mi',
			'	ReqMemMi   int // declared memory request, Mi (0 = none)',
			'}',
			'',
			'// EvictionOrder returns every pod name, ranked in the order the',
			'// kubelet evicts under memory pressure.',
			'//',
			'// One explicit comparator, not bucket-then-merge: keeping all four',
			'// rules in a single less() makes the total order auditable at a',
			'// glance, and the final name tiebreak makes it deterministic even',
			'// though the inputs arrive in arbitrary order. No map is involved',
			'// anywhere, so map iteration order can never leak into the result.',
			'func EvictionOrder(pods []EPod) []string {',
			'	// Sort a copy: ranking is a read-only question about the node,',
			'	// and callers should not observe their slice reshuffled.',
			'	ps := append([]EPod(nil), pods...)',
			'',
			'	sort.SliceStable(ps, func(i, j int) bool {',
			'		exceedsI := ps[i].UsageMemMi > ps[i].ReqMemMi',
			'		exceedsJ := ps[j].UsageMemMi > ps[j].ReqMemMi',
			'',
			'		// Rule 1: living above your request puts you in the front',
			'		// group, full stop. BestEffort pods (req 0) land here for',
			'		// any nonzero usage — no special QoS branch needed.',
			'		if exceedsI != exceedsJ {',
			'			return exceedsI',
			'		}',
			'',
			'		if exceedsI {',
			'			// Rule 2: among exceeders, the biggest overdraft goes',
			'			// first — evicting it reclaims the most stolen buffer.',
			'			excessI := ps[i].UsageMemMi - ps[i].ReqMemMi',
			'			excessJ := ps[j].UsageMemMi - ps[j].ReqMemMi',
			'			if excessI != excessJ {',
			'				return excessI > excessJ',
			'			}',
			'		} else {',
			'			// Rule 3: among pods within their promise, largest total',
			'			// usage first — the last-resort round frees the most per',
			'			// eviction.',
			'			if ps[i].UsageMemMi != ps[j].UsageMemMi {',
			'				return ps[i].UsageMemMi > ps[j].UsageMemMi',
			'			}',
			'		}',
			'',
			'		// Rule 4: total order — equal pods rank by name so the same',
			'		// node state always yields the same eviction list.',
			'		return ps[i].Name < ps[j].Name',
			'	})',
			'',
			'	names := make([]string, len(ps))',
			'	for i, p := range ps {',
			'		names[i] = p.Name',
			'	}',
			'	return names',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Requests are a promise; the excess is borrowed</h3>' +
			'<p>The ranking encodes one idea: <strong>usage above request is the eviction ' +
			'currency</strong>. A memory request is the scheduler\'s promise — the node was chosen ' +
			'because it could reserve that much for you. A pod living within its request has ' +
			'consumed only what was set aside; a pod above it is spending the node\'s shared ' +
			'buffer, and when that buffer runs out, the biggest borrowers are reclaimed ' +
			'first.</p>',
			{ code: 'if exceedsI != exceedsJ { return exceedsI } // above-request group first\nif exceedsI { return excessI > excessJ }    // biggest overdraft first\nreturn usageI > usageJ                       // last resort: biggest user first' },
			'<p>The QoS classes the docs talk about are this arithmetic wearing labels. ' +
			'BestEffort promised nothing (<code>Req = 0</code>), so every byte is overdraft — first ' +
			'out. Guaranteed capped itself at <code>limits = requests</code>, so it <em>cannot</em> ' +
			'exceed — last out. Burstable lives in between, and its fate depends on how ' +
			'honestly its request was sized. That is why accurate requests are an ' +
			'operational concern, not YAML hygiene: request too little and your pod is a ' +
			'standing eviction target; request too much and the scheduler bin-packs the ' +
			'cluster half-empty. The same reclaim-from-the-over-consumers-first pattern ' +
			'shows up in CPU shares, database connection governors, and cloud burstable ' +
			'instance types (spend your credits, get throttled first).</p>' +
			'<h3>On the exam</h3>' +
			'<p><code>kubectl describe node</code> is where pressure shows: <code>Conditions</code> lists ' +
			'<code>MemoryPressure True</code>, the node gains the ' +
			'<code>node.kubernetes.io/memory-pressure:NoSchedule</code> taint (so new pods stop ' +
			'landing), and evicted pods linger as <code>Status: Failed / Reason: Evicted</code> in ' +
			'<code>kubectl get pods</code> — with the reason spelled out in ' +
			'<code>kubectl describe pod</code>. Expect a question shaped like "which pod is evicted ' +
			'first?": compute usage minus request, don\'t reach for the QoS label. And know ' +
			'the difference between kubelet eviction (node-level pressure, ranked as here) ' +
			'and the kernel OOM-kill (per-container, when a container blows through its own ' +
			'memory <em>limit</em> — <code>OOMKilled</code>, exit code 137, restart in place rather than ' +
			'eviction).</p>',
		],
		complexity: { time: 'O(n log n)', space: 'O(n)' },
	});
})();
