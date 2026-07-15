/* Pod Phases — Pods (lesson). The single most-read column in Kubernetes —
 * `kubectl get pods` STATUS — demystified. A pod does not "have" a status;
 * every container has a state (Waiting, Running, Terminated+exitCode) and
 * the kubelet DERIVES the pod phase from those. The lesson has the learner
 * implement that derivation over four archetypal pods: a healthy web pod, a
 * pod stuck on an image pull, a finished migration, and a crashed batch job.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// Flagship diagram: the container-state boxes on the left FEED the phase
	// flow on the right — phase is computed, never set. Marker ids namespaced
	// (dgArrowKPH*) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 250" width="560" height="250" role="img" aria-label="container states (Waiting, Running, Terminated) feed the derived pod phase flow Pending to Running to Succeeded or Failed">' +
		'<text x="20" y="22" class="lbl">each CONTAINER has a state…</text>' +
		// container-state boxes (the inputs)
		'<rect x="20" y="36" width="150" height="44" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="95" y="55" text-anchor="middle">Waiting</text>' +
		'<text x="95" y="72" text-anchor="middle" class="lbl">reason: ImagePullBackOff…</text>' +
		'<rect x="20" y="96" width="150" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="115" text-anchor="middle">Running</text>' +
		'<text x="95" y="132" text-anchor="middle" class="lbl">process is alive</text>' +
		'<rect x="20" y="156" width="150" height="44" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="95" y="175" text-anchor="middle">Terminated</text>' +
		'<text x="95" y="192" text-anchor="middle" class="lbl">exitCode: 0 / 1 / 137…</text>' +
		// derived phase flow (the output)
		'<text x="300" y="22" class="lbl">…and the pod PHASE is derived from all of them</text>' +
		'<rect x="250" y="86" width="100" height="40" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="300" y="111" text-anchor="middle">Pending</text>' +
		'<rect x="400" y="86" width="100" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="450" y="111" text-anchor="middle">Running</text>' +
		'<rect x="440" y="156" width="110" height="36" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="495" y="179" text-anchor="middle" style="fill:var(--ok)">Succeeded</text>' +
		'<rect x="310" y="156" width="100" height="36" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="360" y="179" text-anchor="middle" style="fill:var(--err-fg)">Failed</text>' +
		// phase transitions
		'<path d="M 355 106 L 394 106" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKPH)"/>' +
		'<path d="M 470 130 L 490 150" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKPHok)"/>' +
		'<text x="510" y="144" class="lbl" style="fill:var(--ok)">all exit 0</text>' +
		'<path d="M 420 130 L 385 150" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKPHerr)"/>' +
		'<text x="316" y="144" class="lbl" style="fill:var(--err-fg)">any exit ≠ 0</text>' +
		// input edges: container states → phases
		'<path d="M 175 58 C 215 60 225 90 244 100" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKPHw)"/>' +
		'<text x="180" y="88" class="lbl">any Waiting</text>' +
		'<path d="M 175 118 C 260 130 330 112 394 108" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowKPHacc)"/>' +
		'<text x="230" y="134" class="lbl">≥1 Running, none Waiting</text>' +
		'<path d="M 175 182 C 230 186 260 176 304 172" fill="none" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKPH)"/>' +
		'<text x="200" y="210" class="lbl">all Terminated</text>' +
		'<text x="20" y="240" class="lbl">CrashLoopBackOff, ImagePullBackOff… are container REASONS — phase has only these four values (+Unknown)</text>' +
		'<defs>' +
		'<marker id="dgArrowKPH" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowKPHok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowKPHerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'<marker id="dgArrowKPHw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowKPHacc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'pod-phases',
		title: 'Pod Phases: What STATUS Really Summarizes',
		nav: 'Pod phases',
		category: 'Pods',

		prose: [
			'<h2>Pod Phases: What STATUS Really Summarizes</h2>' +
			'<p>You deploy a service and run <code>kubectl get pods</code>. One pod says ' +
			'<code>Running</code>, one says <code>ImagePullBackOff</code>, one says ' +
			'<code>Completed</code>, one says <code>CrashLoopBackOff</code>. It looks like ' +
			'a pod has a single status field with dozens of possible values. It does not. ' +
			'That column is a <em>summary</em> the CLI computes, and underneath it there ' +
			'are exactly two layers:</p>' +
			'<ul>' +
			'<li><strong>Container state.</strong> Every container in the pod is in one of ' +
			'three states: <code>Waiting</code> (not started — with a <em>reason</em> like ' +
			'<code>ImagePullBackOff</code> or <code>CrashLoopBackOff</code>), ' +
			'<code>Running</code>, or <code>Terminated</code> (with an ' +
			'<code>exitCode</code>).</li>' +
			'<li><strong>Pod phase.</strong> One of five coarse values — ' +
			'<code>Pending</code>, <code>Running</code>, <code>Succeeded</code>, ' +
			'<code>Failed</code>, <code>Unknown</code> — <em>derived</em> from the ' +
			'container states. Nothing ever sets the phase directly.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>So <code>CrashLoopBackOff</code> is not a phase — it is the ' +
			'<em>waiting reason</em> of one container, and the pod\'s phase during a ' +
			'crash loop actually oscillates between <code>Running</code> and ' +
			'<code>Pending</code>-like waiting. The STATUS column simply surfaces the ' +
			'most interesting container reason when there is one, and the phase when ' +
			'there is not. Once you know that, ' +
			'<code>kubectl get pod &lt;name&gt; -o jsonpath=\'{.status.phase}\'</code> vs ' +
			'<code>{.status.containerStatuses[*].state}</code> stops being mysterious: ' +
			'they are the two layers.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program on the right holds four pods as lists of container states. ' +
			'<code>phase()</code> currently claims everything is <code>Running</code> — ' +
			'implement the real derivation (simplified from the kubelet):</p>' +
			'<ul>' +
			'<li>all containers <code>Terminated</code> and every exit code 0 → ' +
			'<code>Succeeded</code></li>' +
			'<li>all containers <code>Terminated</code> and any exit code ≠ 0 → ' +
			'<code>Failed</code></li>' +
			'<li>any container <code>Waiting</code> → <code>Pending</code></li>' +
			'<li>otherwise (at least one <code>Running</code>, the rest Running or ' +
			'Terminated) → <code>Running</code></li>' +
			'</ul>' +
			'<div class="tip"><code>restartPolicy</code> decides whether Terminated is ' +
			'the end of the story: under <code>Always</code> (the Deployment default) a ' +
			'dead container is restarted, so a pod can only reach ' +
			'<code>Succeeded</code>/<code>Failed</code> under <code>OnFailure</code> or ' +
			'<code>Never</code> — which is why those phases belong to Jobs, not ' +
			'services.</div>',
		],

		task: 'Implement phase(): derive Succeeded/Failed/Pending/Running from the container states so all four pods report correctly.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// Container is the kubelet\'s view of one container in a pod:',
			'// State is "Waiting", "Running", or "Terminated"; ExitCode is only',
			'// meaningful when State == "Terminated".',
			'type Container struct {',
			'	Name     string',
			'	State    string',
			'	ExitCode int',
			'}',
			'',
			'// Pod is just a name plus its containers\' states — which is all the',
			'// phase derivation ever looks at.',
			'type Pod struct {',
			'	Name       string',
			'	Containers []Container',
			'}',
			'',
			'// phase derives the pod phase from the container states.',
			'//',
			'// TODO: implement the real rules (simplified kubelet):',
			'//   - all Terminated, every exit code 0            -> "Succeeded"',
			'//   - all Terminated, any exit code != 0           -> "Failed"',
			'//   - any Waiting                                  -> "Pending"',
			'//   - otherwise (>=1 Running, rest Run/Terminated) -> "Running"',
			'func phase(containers []Container) string {',
			'	return "Running" // the naive answer: every pod looks fine',
			'}',
			'',
			'func main() {',
			'	pods := []Pod{',
			'		// A healthy web pod: app + sidecar, both alive.',
			'		{"web", []Container{',
			'			{"nginx", "Running", 0},',
			'			{"metrics-sidecar", "Running", 0},',
			'		}},',
			'		// One container never started: the registry tag is wrong, the',
			'		// kubelet is backing off between pull attempts.',
			'		{"pull-broken", []Container{',
			'			{"app", "Running", 0},',
			'			{"badimage", "Waiting", 0}, // reason: ImagePullBackOff',
			'		}},',
			'		// A finished DB migration (restartPolicy: Never).',
			'		{"migrate", []Container{',
			'			{"schema-migrate", "Terminated", 0},',
			'		}},',
			'		// A batch pod where one step blew up.',
			'		{"crashed", []Container{',
			'			{"extract", "Terminated", 0},',
			'			{"transform", "Terminated", 1},',
			'		}},',
			'	}',
			'',
			'	for _, p := range pods {',
			'		fmt.Printf("pod %s: %s\\n", p.Name, phase(p.Containers))',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('pod web: Running') !== -1 &&
				flat.indexOf('pod pull-broken: Pending') !== -1 &&
				flat.indexOf('pod migrate: Succeeded') !== -1 &&
				flat.indexOf('pod crashed: Failed') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// Container is the kubelet\'s view of one container in a pod:',
			'// State is "Waiting", "Running", or "Terminated"; ExitCode is only',
			'// meaningful when State == "Terminated".',
			'type Container struct {',
			'	Name     string',
			'	State    string',
			'	ExitCode int',
			'}',
			'',
			'// Pod is just a name plus its containers\' states — which is all the',
			'// phase derivation ever looks at.',
			'type Pod struct {',
			'	Name       string',
			'	Containers []Container',
			'}',
			'',
			'// phase derives the pod phase from the container states.',
			'//',
			'// One pass collects three aggregate facts, then the rules fire in',
			'// priority order. The order is the point: "all Terminated" must be',
			'// judged before "any Waiting" is even considered (a fully-finished',
			'// pod is done regardless of anything else), and Waiting must beat',
			'// Running — one container that can\'t start makes the POD not fully',
			'// up, no matter how healthy its siblings are. That priority is why',
			'// pull-broken reports Pending even with a Running app container.',
			'func phase(containers []Container) string {',
			'	allTerminated := true',
			'	anyWaiting := false',
			'	anyFailedExit := false',
			'	for _, c := range containers {',
			'		if c.State != "Terminated" {',
			'			allTerminated = false',
			'		} else if c.ExitCode != 0 {',
			'			anyFailedExit = true',
			'		}',
			'		if c.State == "Waiting" {',
			'			anyWaiting = true',
			'		}',
			'	}',
			'',
			'	// Terminal phases first: once every container has exited, the',
			'	// verdict is a pure function of the exit codes — Unix semantics,',
			'	// lifted to the pod: one nonzero exit fails the whole pod.',
			'	if allTerminated {',
			'		if anyFailedExit {',
			'			return "Failed"',
			'		}',
			'		return "Succeeded"',
			'	}',
			'	if anyWaiting {',
			'		return "Pending"',
			'	}',
			'	// What remains: at least one Running container, the rest Running',
			'	// or Terminated. A dead sidecar next to a live app is still a',
			'	// Running pod — phase is coarse on purpose; readiness (a later',
			'	// lesson) is the fine-grained signal.',
			'	return "Running"',
			'}',
			'',
			'func main() {',
			'	pods := []Pod{',
			'		// A healthy web pod: app + sidecar, both alive.',
			'		{"web", []Container{',
			'			{"nginx", "Running", 0},',
			'			{"metrics-sidecar", "Running", 0},',
			'		}},',
			'		// One container never started: the registry tag is wrong, the',
			'		// kubelet is backing off between pull attempts.',
			'		{"pull-broken", []Container{',
			'			{"app", "Running", 0},',
			'			{"badimage", "Waiting", 0}, // reason: ImagePullBackOff',
			'		}},',
			'		// A finished DB migration (restartPolicy: Never).',
			'		{"migrate", []Container{',
			'			{"schema-migrate", "Terminated", 0},',
			'		}},',
			'		// A batch pod where one step blew up.',
			'		{"crashed", []Container{',
			'			{"extract", "Terminated", 0},',
			'			{"transform", "Terminated", 1},',
			'		}},',
			'	}',
			'',
			'	for _, p := range pods {',
			'		fmt.Printf("pod %s: %s\\n", p.Name, phase(p.Containers))',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
