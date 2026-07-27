/* docker — containers demystified: images, runtime, and Compose as runnable Go.
 *
 * Docker is usually taught as CLI incantations to memorize; what sticks is
 * implementing the decision procedures the daemon runs. Every item here
 * takes one mechanism — image reference parsing, overlay layer resolution,
 * build-cache invalidation, the ENTRYPOINT×CMD table, the container state
 * machine, restart-policy backoff, port publishing, health probing,
 * cgroup resource translation, embedded DNS, multi-arch manifest selection —
 * and has the learner implement it against a test harness. The final arc is
 * docker-compose: variable interpolation, multi-file merging, depends_on
 * ordering, and project networking — the four mechanisms behind every
 * `docker compose up`. Each item is pure Go over declared inputs (refs,
 * layers, events, service graphs): no daemon, no socket — the runner is a
 * wasm sandbox, and the *logic* is the transferable knowledge anyway.
 * Zero engine changes, same kind:'lesson'/'problem' machinery.
 *
 * Items live in problems/<slug>.js and register through GoLearnDocker.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'docker',
		title: 'Docker & Compose',
		runner: 'go-wasm',
		order: [
			// Images & builds: what an image actually is
			'image-references', 'image-layers', 'dockerfile-eval',
			'build-cache', 'dockerignore', 'entrypoint-cmd',
			// Running containers: the daemon's decision procedures
			'container-lifecycle', 'restart-policies', 'port-publishing',
			'volumes-mounts', 'healthchecks', 'resource-limits',
			// Networking & distribution
			'bridge-networks', 'manifest-platforms',
			// Compose: many containers as one application
			'compose-interpolation', 'compose-merge',
			'compose-dependencies', 'compose-networks',
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
	globalThis.GoLearnDocker = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('docker', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('docker', def);
		},
	};
})();
