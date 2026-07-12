/* aws-saa — AWS Solutions Architect Associate, as runnable Go.
 *
 * The premise mirrors the system-design track: certification prep sticks when
 * you *compute* the thing instead of memorizing the bullet point. Every item
 * here takes one SAA exam theme (IAM evaluation logic, VPC subnetting, S3
 * lifecycle economics, DynamoDB capacity math, autoscaling arithmetic,
 * availability targets) and has the learner implement the actual decision
 * procedure AWS documents — same kind:'problem' machinery the other tracks
 * use, so the engine needs no changes.
 *
 * Numbers that look like prices are teaching constants passed in by the
 * harness, not live AWS pricing — the *procedure* (which class wins, when a
 * reservation breaks even) is the exam skill, and it is invariant under
 * price drift.
 *
 * Problems live in problems/<slug>.js and register through
 * GoLearnAWS.problem(). HARNESS_RT is duplicated from the other tracks on
 * purpose: tracks are independent plugins, and sharing runtime snippets
 * across tracks would couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'aws-saa',
		title: 'AWS Solutions Architect',
		runner: 'go-wasm',
		order: [
			// Resilient Architectures
			'availability-math', 'rto-rpo',
			// Security & IAM
			'iam-policy-eval', 'security-group-eval',
			// Networking
			'vpc-cidr-subnets', 'route53-weighted-routing',
			// Compute & Scaling
			'autoscaling-target-tracking', 'lambda-concurrency',
			// Storage
			's3-lifecycle', 's3-storage-classes',
			// Databases
			'dynamodb-capacity',
			// Cost Optimization
			'reserved-vs-on-demand',
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
	globalThis.GoLearnAWS = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('aws-saa', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('aws-saa', def);
		},
	};
})();
