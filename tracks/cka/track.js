/* cka — Certified Kubernetes Administrator, as runnable Go.
 *
 * The CKA is a hands-on exam, and what it really tests is whether you can
 * predict what the control plane will do: which node the scheduler picks,
 * when the deployment controller swaps pods, who the API server lets in,
 * which pod the kubelet evicts first. Each item here takes one of those
 * decision procedures — straight from the Kubernetes documentation — and has
 * the learner implement it against a test harness, same kind:'problem'
 * machinery as the other tracks, zero engine changes.
 *
 * Everything is pure functions over declared inputs (pods, nodes, rules):
 * no YAML, no API server — the *logic* is the certifiable knowledge, and it
 * is what kubectl-on-the-day muscle memory hangs off.
 *
 * Problems live in problems/<slug>.js and register through
 * GoLearnCKA.problem(). HARNESS_RT is duplicated from the other tracks on
 * purpose: tracks are independent plugins, and sharing runtime snippets
 * across tracks would couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'cka',
		title: 'CKA: Kubernetes Admin',
		runner: 'go-wasm',
		order: [
			// Cluster Architecture
			'etcd-quorum',
			// Scheduling
			'scheduler-fit', 'taints-tolerations', 'qos-classes',
			// Workloads
			'rolling-update', 'hpa-scaling', 'crashloop-backoff',
			// Networking
			'service-endpoints', 'ingress-routing',
			// Security
			'rbac-eval',
			// Resource Management
			'resource-quota', 'eviction-order',
			// Disruptions
			'pdb-drain',
		],
	});

	// Every harness splices this in, so every harness import block includes
	// fmt and encoding/json. runCase isolates one test: a panicking user
	// implementation records a failure for that case but the harness still
	// reports every result (the sentinel must always print).
	var HARNESS_RT = [
		'// runCase executes one test body, converting a panic into a failed case.',
		'func runCase(r map[string]any, body func()) {',
		'	defer func() {',
		'		if p := recover(); p != nil {',
		'			r["pass"] = false',
		'			r["got"] = fmt.Sprintf("panic: %v", p)',
		'		}',
		'	}()',
		'	body()',
		'}',
		'',
		'// emitResults prints the sentinel-delimited JSON block the UI parses.',
		'// Printed last, so user output can never spoof it (the parser splits',
		'// on the LAST marker).',
		'func emitResults(results []map[string]any) {',
		'	buf, _ := json.Marshal(results)',
		'	fmt.Println("\\n__GOLEARN_RESULTS__")',
		'	fmt.Println(string(buf))',
		'	fmt.Println("__GOLEARN_END__")',
		'}',
	].join('\n');

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnCKA = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('cka', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('cka', def);
		},
	};
})();
