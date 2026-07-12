/* ResourceQuota Admission — Resource Management (Easy). The quota
 * admission plugin's check: used + requested <= hard limit, per
 * resource, at pod-creation time. Exact-table harness.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="namespace quota as a bucket filling with pod blocks; one pod bounces off the rim">' +
		// bucket (namespace quota)
		'<path d="M 60 40 L 60 170 L 260 170 L 260 40" fill="none" stroke="var(--fg)" stroke-width="1.8"/>' +
		'<text x="160" y="28" text-anchor="middle" class="lbl">namespace quota: cpu 1000m · mem 1024Mi</text>' +
		// used blocks
		'<rect x="70" y="130" width="180" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="160" y="151" text-anchor="middle" class="lbl">pod-a · 400m / 400Mi</text>' +
		'<rect x="70" y="92" width="180" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="160" y="113" text-anchor="middle" class="lbl">pod-b · 400m / 400Mi</text>' +
		// admitted pod dropping in
		'<rect x="88" y="48" width="144" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="160" y="68" text-anchor="middle" class="lbl">new · 200m / 224Mi ✓</text>' +
		// rejected pod bouncing off the rim
		'<rect x="330" y="44" width="150" height="30" rx="4" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="405" y="64" text-anchor="middle" class="lbl">next · 300m / 100Mi ✗</text>' +
		'<path d="M 330 60 C 300 44 280 36 264 40" fill="none" stroke="var(--err-edge)" stroke-width="1.6" marker-end="url(#dgArrowRQ)"/>' +
		'<text x="290" y="90" class="lbl" style="fill:var(--err-edge)">would exceed cpu</text>' +
		'<text x="330" y="120" class="lbl">checked at CREATE time,</text>' +
		'<text x="330" y="135" class="lbl">against declared requests —</text>' +
		'<text x="330" y="150" class="lbl">not actual usage</text>' +
		'<defs><marker id="dgArrowRQ" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'resource-quota',
		title: 'ResourceQuota Admission',
		nav: 'ResourceQuota',
		difficulty: 'Easy',
		category: 'Resource Management',
		task: 'Implement Admit — used + pod <= quota for both resources, cpu reported first. Make all 6 tests pass.',

		prose: [
			'<h2>ResourceQuota Admission</h2>' +
			'<p>Namespaces share the cluster, and a ResourceQuota is what stops one team ' +
			'from requesting all of it. The enforcement point is the API server’s quota ' +
			'<em>admission plugin</em>: when a pod is created, it checks whether the ' +
			'namespace’s current usage plus this pod’s requests still fits under the ' +
			'hard limits — and rejects the create outright if not. Implement that ' +
			'check.</p>' +
			'<p><code>Admit(quotaCPUm, quotaMemMi, usedCPUm, usedMemMi, podCPUm, podMemMi)</code> ' +
			'returns <code>(true, "")</code> when <code>used + pod &lt;= quota</code> holds for ' +
			'<em>both</em> resources — landing exactly on the quota is allowed, the budget is ' +
			'inclusive. On rejection return <code>(false, "cpu")</code> or ' +
			'<code>(false, "memory")</code>, checking cpu first when both would exceed. Units ' +
			'are millicores and MiB, so everything is integer arithmetic.</p>' +
			'<p><strong>Framing that matters:</strong> the parameters are the pod’s ' +
			'<em>declared requests</em>. In a real namespace with a compute quota, a pod that ' +
			'doesn’t declare requests at all is rejected at the API level before this ' +
			'arithmetic even runs — the quota system refuses to admit what it cannot ' +
			'account for. This function models the step after that gate, so a ' +
			'<code>0m/0Mi</code> pod here means “declared zero”, which is legal and always ' +
			'fits.</p>' +
			DIAGRAM +
			'<h3>Example</h3>',
			{ code: 'Admit(1000, 1024, 800, 768, 200, 256) → (true, "")    // lands exactly on quota\nAdmit(1000, 2048, 900, 512, 200, 256) → (false, "cpu") // 1100m > 1000m', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Admit decides whether a pod fits a namespace\'s ResourceQuota.',
			'// Units: CPU in millicores (m), memory in MiB. The pod values are',
			'// its DECLARED requests (real quota\'d namespaces reject pods with',
			'// no declared requests before this check runs).',
			'//',
			'// Admit when used+pod <= quota for BOTH resources (reaching the',
			'// quota exactly is allowed). On rejection, return (false, "cpu")',
			'// or (false, "memory") — cpu is checked first when both exceed.',
			'// Success returns (true, "").',
			'func Admit(quotaCPUm, quotaMemMi, usedCPUm, usedMemMi, podCPUm, podMemMi int) (bool, string) {',
			'	// your code here',
			'	return false, "todo"',
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
			'		name                   string',
			'		quotaCPU, quotaMem     int',
			'		usedCPU, usedMem       int',
			'		podCPU, podMem         int',
			'		wantOK                 bool',
			'		wantWhy                string',
			'	}',
			'	cases := []tc{',
			'		{"fits comfortably", 2000, 4096, 500, 1024, 500, 512, true, ""},',
			'		{"landing exactly on the quota is allowed (<=, not <)", 1000, 1024, 800, 768, 200, 256, true, ""},',
			'		{"cpu would exceed", 1000, 2048, 900, 512, 200, 256, false, "cpu"},',
			'		{"memory would exceed", 2000, 1024, 500, 900, 200, 256, false, "memory"},',
			'		{"both exceed → cpu reported first", 1000, 1024, 1000, 1024, 1, 1, false, "cpu"},',
			'		{"zero-request pod fits even a full namespace", 1000, 1024, 1000, 1024, 0, 0, true, ""},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s — quota %dm/%dMi, used %dm/%dMi, pod %dm/%dMi",',
			'				c.name, c.quotaCPU, c.quotaMem, c.usedCPU, c.usedMem, c.podCPU, c.podMem),',
			'			"want": fmt.Sprintf("(%v, %q)", c.wantOK, c.wantWhy),',
			'		}',
			'		runCase(r, func() {',
			'			ok, why := Admit(c.quotaCPU, c.quotaMem, c.usedCPU, c.usedMem, c.podCPU, c.podMem)',
			'			r["pass"] = ok == c.wantOK && why == c.wantWhy',
			'			r["got"] = fmt.Sprintf("(%v, %q)", ok, why)',
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
			'// Admit decides whether a pod fits a namespace\'s ResourceQuota.',
			'// Units: CPU in millicores (m), memory in MiB. The pod values are',
			'// its DECLARED requests (real quota\'d namespaces reject pods with',
			'// no declared requests before this check runs).',
			'//',
			'// The check is pure bookkeeping: quota admission charges the pod\'s',
			'// requests against the namespace ledger at CREATE time. Nothing',
			'// here looks at actual consumption — a namespace can be "full" on',
			'// paper while its nodes idle, and that is by design: requests are',
			'// the reservation currency, usage is the kubelet\'s problem.',
			'func Admit(quotaCPUm, quotaMemMi, usedCPUm, usedMemMi, podCPUm, podMemMi int) (bool, string) {',
			'	// <= keeps the boundary inclusive: a pod may land exactly on the',
			'	// quota. Rejecting at == would strand unusable budget forever.',
			'	// CPU is checked first so the both-exceed case has one',
			'	// deterministic answer instead of depending on check order.',
			'	if usedCPUm+podCPUm > quotaCPUm {',
			'		return false, "cpu"',
			'	}',
			'	if usedMemMi+podMemMi > quotaMemMi {',
			'		return false, "memory"',
			'	}',
			'	return true, ""',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>A ledger, not a meter</h3>' +
			'<p>The implementation is two comparisons — the concept is what the exam ' +
			'(and production) tests. Quota is <strong>admission control: check-then-commit ' +
			'at write time</strong>. The quota is enforced when the pod is <em>created</em>, ' +
			'against its <em>declared requests</em>, and never again: a pod that later burns ' +
			'less (or via limits, more) than it requested doesn’t change the ledger. The ' +
			'same write-time-gate pattern shows up wherever a shared budget must stay ' +
			'consistent — database connection pools, cloud service quotas, this track’s ' +
			'scheduler-fit check (same arithmetic, node-sized bucket).</p>',
			{ code: 'if usedCPUm+podCPUm > quotaCPUm { // strict >, so == still admits\n\treturn false, "cpu"\n}' },
			'<p>Two boundary decisions carry the correctness: the comparison is strict ' +
			'<code>&gt;</code> so a pod may land exactly on the quota (an off-by-one here ' +
			'strands the last slice of budget), and cpu is checked before memory so the ' +
			'both-exceed case has a deterministic answer.</p>' +
			'<p>The gotcha the prose flagged is the operational half of the lesson: in a ' +
			'namespace with a compute ResourceQuota, a pod with <em>no</em> requests is ' +
			'rejected outright — the ledger can’t charge an undeclared amount. Which is ' +
			'why quotas ship with a companion object: a <strong>LimitRange</strong> injects ' +
			'default requests/limits into pods that omit them, keeping the namespace ' +
			'usable for teams that never heard of resource stanzas.</p>' +
			'<h3>On the exam</h3>' +
			'<p><code>kubectl describe quota -n &lt;ns&gt;</code> shows the Used vs Hard table — ' +
			'this function is exactly one row of that table plus the pod’s delta. When a ' +
			'deployment’s pods aren’t appearing and the deployment looks healthy, check ' +
			'the ReplicaSet’s events: quota rejections happen at the API server, so the ' +
			'failure lives there, not on any pod (there is no pod). And when a task says ' +
			'“pods in this namespace are rejected for missing requests”, the fix is a ' +
			'LimitRange with defaults, not editing every manifest.</p>',
		],
		complexity: { time: 'O(1)', space: 'O(1)' },
	});
})();
