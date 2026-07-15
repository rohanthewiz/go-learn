/* Init Containers — Pods (lesson). Why `kubectl get pods` shows Init:1/2:
 * init containers run SEQUENTIALLY, each to completion, before any app
 * container starts — then the app containers start together. The lesson has
 * the learner replace the naive everything-starts-in-parallel model with the
 * real startup sequence.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// A startup timeline: two init containers strictly one-after-another,
	// then the app containers side by side. Marker id namespaced (dgArrowKIC)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="pod startup timeline: init containers run sequentially to completion, then app containers start in parallel">' +
		'<text x="20" y="22" class="lbl">pod startup, left to right — the STATUS column during each stretch</text>' +
		// timeline axis
		'<path d="M 20 160 L 540 160" stroke="var(--edge)" stroke-width="1.2" marker-end="url(#dgArrowKIC)"/>' +
		'<text x="530" y="178" text-anchor="end" class="lbl">time</text>' +
		// init[0]
		'<rect x="30" y="60" width="140" height="36" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="100" y="83" text-anchor="middle" class="lbl">init[0] wait-for-db</text>' +
		'<text x="100" y="120" text-anchor="middle" class="lbl">Init:0/2</text>' +
		// exit 0 handoff
		'<path d="M 175 78 L 205 78" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKICok)"/>' +
		'<text x="190" y="66" text-anchor="middle" class="lbl" style="fill:var(--ok)">exit 0</text>' +
		// init[1]
		'<rect x="210" y="60" width="150" height="36" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="285" y="83" text-anchor="middle" class="lbl">init[1] run-migrations</text>' +
		'<text x="285" y="120" text-anchor="middle" class="lbl">Init:1/2</text>' +
		'<path d="M 365 78 L 395 78" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKICok)"/>' +
		'<text x="380" y="66" text-anchor="middle" class="lbl" style="fill:var(--ok)">exit 0</text>' +
		// app containers, stacked = parallel
		'<rect x="400" y="42" width="140" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="470" y="63" text-anchor="middle" class="lbl">api</text>' +
		'<rect x="400" y="82" width="140" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="470" y="103" text-anchor="middle" class="lbl">log-sidecar</text>' +
		'<text x="470" y="134" text-anchor="middle" class="lbl">start together</text>' +
		'<text x="470" y="120" text-anchor="middle" class="lbl">Running</text>' +
		'<text x="20" y="194" class="lbl">an init container that exits nonzero is re-run (per restartPolicy) — the pod stays Init:N/M and no app starts</text>' +
		'<defs>' +
		'<marker id="dgArrowKIC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowKICok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'init-containers',
		title: 'Init Containers: Sequential by Contract',
		nav: 'Init containers',
		category: 'Pods',

		prose: [
			'<h2>Init Containers: Sequential by Contract</h2>' +
			'<p>A pod has been sitting at <code>Init:1/2</code> for ten minutes. ' +
			'Nothing is crashing — <code>kubectl get pods</code> just shows that odd ' +
			'fraction instead of <code>Running</code>. The fraction is the giveaway: ' +
			'this pod has <strong>init containers</strong>, and it is stuck on the ' +
			'second of two. Unlike app containers, which all start together, init ' +
			'containers run <em>one at a time, in spec order, each to ' +
			'completion</em>, and not a single app container starts until the last ' +
			'init container has exited 0.</p>' +
			DIAGRAM +
			'<p>The contract:</p>' +
			'<ul>' +
			'<li>Each init container must exit <code>0</code>. A nonzero exit is ' +
			're-run according to <code>restartPolicy</code> (under <code>Always</code> ' +
			'you\'ll see <code>Init:CrashLoopBackOff</code>), and the pod stays at ' +
			'<code>Init:N/M</code> — the sequence never skips ahead.</li>' +
			'<li>Only when init container <code>N</code> completes does ' +
			'<code>N+1</code> start; only after the last one do the app containers ' +
			'start — together, in parallel.</li>' +
			'</ul>' +
			'<p>That strict ordering is the feature. The classic uses are all ' +
			'"things that must be true before my app boots": block until a dependency ' +
			'answers (<code>wait-for-db</code> polling a DNS name), run the schema ' +
			'migration exactly-before the new binary, fetch a secret or template a ' +
			'config file into a shared <code>emptyDir</code> volume the app then ' +
			'reads. Each step can use a different image with different tools — your ' +
			'app image needs no <code>psql</code> just to wait for Postgres.</p>' +
			'<div class="tip">Two subtleties worth keeping: init containers do ' +
			'<strong>not</strong> re-run when a sibling app container crashes and ' +
			'restarts — they ran once at pod startup, and only a full pod restart ' +
			'repeats them. And since 1.28, an init container with ' +
			'<code>restartPolicy: Always</code> is a <em>native sidecar</em>: it ' +
			'starts in init order but then keeps running alongside the app containers ' +
			'— the long-awaited fix for "my log shipper must start before and die ' +
			'after the app".</div>' +
			'<h3>Your job</h3>' +
			'<p><code>startPod()</code> on the right currently starts everything at ' +
			'once — the naive model this lesson replaces. Make it print the real ' +
			'sequence: each init container <code>running</code> then ' +
			'<code>completed</code>, strictly in order and tagged with its index ' +
			'(<code>init[0] wait-for-db: running</code> …), then one line for the app ' +
			'containers starting together (<code>app containers api, log-sidecar: ' +
			'starting in parallel</code>), then <code>pod Ready</code>.</p>',
		],

		task: 'Rewrite startPod(): run init containers sequentially to completion, then start the app containers together.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// startPod simulates the kubelet bringing this pod\'s containers up.',
			'//',
			'// TODO: this is the naive model — every container fired off at once,',
			'// as if init containers were just more app containers. Replace it',
			'// with the real sequence:',
			'//   "init[0] wait-for-db: running"   then  "init[0] wait-for-db: completed"',
			'//   "init[1] run-migrations: running" then "init[1] run-migrations: completed"',
			'//   "app containers api, log-sidecar: starting in parallel"',
			'//   "pod Ready"',
			'func startPod(inits, apps []string) {',
			'	for _, name := range apps {',
			'		fmt.Printf("start %s\\n", name)',
			'	}',
			'	for _, name := range inits {',
			'		fmt.Printf("start %s\\n", name)',
			'	}',
			'}',
			'',
			'func main() {',
			'	// spec.initContainers — order in the spec IS the execution order.',
			'	inits := []string{"wait-for-db", "run-migrations"}',
			'	// spec.containers — these all start together, only after every',
			'	// init container has completed.',
			'	apps := []string{"api", "log-sidecar"}',
			'',
			'	startPod(inits, apps)',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var i0run = flat.indexOf('init[0] wait-for-db: running');
			var i0done = flat.indexOf('init[0] wait-for-db: completed');
			var i1run = flat.indexOf('init[1] run-migrations: running');
			var i1done = flat.indexOf('init[1] run-migrations: completed');
			var appsLine = flat.indexOf('app containers api, log-sidecar: starting in parallel');
			return i0run !== -1 && i0done !== -1 && i1run !== -1 && i1done !== -1 &&
				appsLine !== -1 &&
				i0run < i0done && i0done < i1run && i1run < i1done &&
				i1done < appsLine &&
				flat.indexOf('pod Ready') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// startPod simulates the kubelet bringing this pod\'s containers up.',
			'//',
			'// The shape of the code mirrors the shape of the guarantee: a plain',
			'// sequential loop over inits — "completed" is printed before the',
			'// next iteration begins, because init container N+1 must not exist',
			'// until N has exited 0. The apps, by contrast, get ONE line: they',
			'// have no ordering among themselves, and printing them as a single',
			'// event resists inventing an order the system never promised.',
			'func startPod(inits, apps []string) {',
			'	for i, name := range inits {',
			'		// The index is part of the observable state: kubectl\'s',
			'		// Init:N/M column is exactly "how many of these completed".',
			'		fmt.Printf("init[%d] %s: running\\n", i, name)',
			'		fmt.Printf("init[%d] %s: completed\\n", i, name)',
			'	}',
			'	fmt.Printf("app containers %s: starting in parallel\\n", strings.Join(apps, ", "))',
			'	// Ready comes after start, not with it — in the real pod the gap',
			'	// is where readiness probes run (the previous lesson).',
			'	fmt.Println("pod Ready")',
			'}',
			'',
			'func main() {',
			'	// spec.initContainers — order in the spec IS the execution order.',
			'	inits := []string{"wait-for-db", "run-migrations"}',
			'	// spec.containers — these all start together, only after every',
			'	// init container has completed.',
			'	apps := []string{"api", "log-sidecar"}',
			'',
			'	startPod(inits, apps)',
			'}',
			'',
		].join('\n'),
	});
})();
