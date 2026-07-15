/* k8s — Kubernetes from first principles: beginner to advanced, as runnable Go.
 *
 * The CKA track already covers the exam's decision procedures (scheduling,
 * eviction, RBAC). This track is the other half: the MENTAL MODEL — what a
 * pod actually is, how a selector matches, and above all the idea the whole
 * system is built on: controllers reconciling observed state toward desired
 * state, forever. The arc runs beginner → advanced: pod phases and probes,
 * label selection, config injection, then the ReplicaSet/Deployment control
 * loops, ownership & garbage collection, StatefulSet ordering, Jobs and
 * CronJobs, and finally the machinery operators are made of — watches and
 * informers, lease-based leader election, admission webhooks, and a CRD
 * reconciler capstone. Each item has the learner IMPLEMENT the mechanism as
 * pure Go over declared inputs (pods, events, leases): no YAML, no API
 * server — the logic is the knowledge. Zero engine changes, same
 * kind:'lesson'/'problem' machinery.
 *
 * Items live in problems/<slug>.js and register through GoLearnK8s.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'k8s',
		title: 'Kubernetes: Beginner to Advanced',
		runner: 'go-wasm',
		order: [
			// Pods: the atom
			'pod-phases', 'labels-selectors', 'probes', 'init-containers',
			// Configuration & discovery
			'env-config', 'service-dns',
			// Controllers: the big idea
			'reconcile-loop', 'deployment-replicasets', 'owner-gc',
			// Stateful & batch workloads
			'statefulset-ordering', 'jobs', 'cronjob-schedule',
			// Advanced: what operators are made of
			'informers-watch', 'leader-election', 'admission-webhooks',
			'crd-operator',
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
	globalThis.GoLearnK8s = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('k8s', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('k8s', def);
		},
	};
})();
